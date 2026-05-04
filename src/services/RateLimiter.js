import { STORAGE_KEYS, RATE_LIMIT_MAX } from '../constants/constants.js';
import { getItem, setItem } from '../utils/storage.js';
import { getToday, sanitizeInput } from '../utils/helpers.js';
import AuditLogger from './AuditLogger.js';
import {
  UNLOCK_ATTEMPT_MESSAGES,
  UNLOCK_LIMIT_REACHED_MESSAGE,
  RESEND_ATTEMPT_MESSAGES,
  RESEND_LIMIT_REACHED_MESSAGE,
} from '../constants/messages.js';

/**
 * Default daily limit for rate-limited actions.
 * @type {number}
 */
const DEFAULT_DAILY_LIMIT = RATE_LIMIT_MAX || 3;

/**
 * Supported rate-limited action types.
 * @readonly
 * @enum {string}
 */
const RATE_LIMITED_ACTIONS = {
  UNLOCK: 'unlock',
  RESEND: 'resend',
};

/**
 * Builds a composite key for a given action and signer/entity ID.
 * @param {string} action - The action type.
 * @param {string} signerId - The signer or entity ID.
 * @returns {string} A composite key string.
 */
const buildKey = (action, signerId) => {
  if (!action || !signerId) {
    return '';
  }

  return `${action.trim().toLowerCase()}:${signerId.trim()}`;
};

/**
 * Retrieves the full rate limit store from localStorage.
 * @returns {Object} The rate limit store object.
 */
const getRateLimitStore = () => {
  try {
    const store = getItem(STORAGE_KEYS.RATE_LIMITS, null);

    if (store && typeof store === 'object' && !Array.isArray(store)) {
      return store;
    }

    return {};
  } catch (_error) {
    return {};
  }
};

/**
 * Persists the rate limit store to localStorage.
 * @param {Object} store - The rate limit store object.
 * @returns {boolean} True if saved successfully.
 */
const saveRateLimitStore = (store) => {
  try {
    return setItem(STORAGE_KEYS.RATE_LIMITS, store);
  } catch (_error) {
    return false;
  }
};

/**
 * Retrieves the rate limit record for a given composite key.
 * @param {string} key - The composite key (action:signerId).
 * @returns {Object} The rate limit record for the key.
 */
const getRateLimitRecord = (key) => {
  if (!key || typeof key !== 'string') {
    return createDefaultRecord();
  }

  try {
    const store = getRateLimitStore();
    const record = store[key];

    if (record && typeof record === 'object') {
      return record;
    }

    return createDefaultRecord();
  } catch (_error) {
    return createDefaultRecord();
  }
};

/**
 * Creates a default rate limit record.
 * @returns {Object} A fresh rate limit record.
 */
const createDefaultRecord = () => {
  return {
    count: 0,
    lastAttempt: null,
    resetDate: getToday().toISOString(),
  };
};

/**
 * Saves a rate limit record for a given composite key.
 * @param {string} key - The composite key (action:signerId).
 * @param {Object} record - The rate limit record to save.
 * @returns {boolean} True if saved successfully.
 */
const saveRateLimitRecord = (key, record) => {
  if (!key || typeof key !== 'string') {
    return false;
  }

  try {
    const store = getRateLimitStore();
    store[key] = record;
    return saveRateLimitStore(store);
  } catch (_error) {
    return false;
  }
};

/**
 * Checks if the record's reset date is before today and needs resetting.
 * @param {Object} record - The rate limit record to check.
 * @returns {boolean} True if the record should be reset for a new day.
 */
const isNewDay = (record) => {
  if (!record || !record.resetDate) {
    return true;
  }

  try {
    const recordDate = new Date(record.resetDate).getTime();
    const todayDate = getToday().getTime();

    if (isNaN(recordDate)) {
      return true;
    }

    return todayDate > recordDate;
  } catch (_error) {
    return true;
  }
};

/**
 * Ensures a record is reset if a new day has started.
 * @param {Object} record - The rate limit record.
 * @returns {Object} The record, reset if necessary.
 */
const ensureCurrentDay = (record) => {
  if (isNewDay(record)) {
    return createDefaultRecord();
  }

  return record;
};

/**
 * Rate-limiting service for self-service actions in the SIG Card Management application.
 * Tracks and enforces daily limits on actions such as unlock attempts and OTP resend
 * requests. Counters are persisted in localStorage and reset at midnight boundaries.
 * Provides contextual messaging based on attempt number using the messaging matrix.
 *
 * @namespace RateLimiter
 */
const RateLimiter = {
  /**
   * Checks if the given action for the given signer/entity is within the daily limit.
   * Automatically resets counters if a new day has started.
   *
   * @param {string} action - The action type (e.g., 'unlock', 'resend').
   * @param {string} signerId - The signer or entity ID.
   * @returns {boolean} True if the action is within the daily limit and allowed.
   */
  checkLimit(action, signerId) {
    if (!action || typeof action !== 'string') {
      return false;
    }

    if (!signerId || typeof signerId !== 'string') {
      return false;
    }

    try {
      const key = buildKey(action, signerId);

      if (!key) {
        return false;
      }

      let record = getRateLimitRecord(key);
      record = ensureCurrentDay(record);

      // Save the potentially reset record
      saveRateLimitRecord(key, record);

      return record.count < DEFAULT_DAILY_LIMIT;
    } catch (_error) {
      return false;
    }
  },

  /**
   * Records an attempt for the given action and signer/entity.
   * Increments the counter and updates the last attempt timestamp.
   * Automatically resets counters if a new day has started before recording.
   *
   * @param {string} action - The action type (e.g., 'unlock', 'resend').
   * @param {string} signerId - The signer or entity ID.
   * @returns {Object} Result object with status, message, and current count.
   */
  recordAttempt(action, signerId) {
    if (!action || typeof action !== 'string') {
      return {
        status: 'error',
        message: 'Action is required.',
        count: 0,
      };
    }

    if (!signerId || typeof signerId !== 'string') {
      return {
        status: 'error',
        message: 'Signer ID is required.',
        count: 0,
      };
    }

    try {
      const key = buildKey(action, signerId);

      if (!key) {
        return {
          status: 'error',
          message: 'Invalid action or signer ID.',
          count: 0,
        };
      }

      let record = getRateLimitRecord(key);
      record = ensureCurrentDay(record);

      if (record.count >= DEFAULT_DAILY_LIMIT) {
        AuditLogger.logEvent('RATE_LIMIT_EXCEEDED', {
          action: sanitizeInput(action),
          signerId: sanitizeInput(signerId),
          count: record.count,
          limit: DEFAULT_DAILY_LIMIT,
        });

        return {
          status: 'error',
          message: this.getMessage(action, record.count + 1),
          count: record.count,
        };
      }

      record.count += 1;
      record.lastAttempt = new Date().toISOString();

      const saved = saveRateLimitRecord(key, record);

      if (!saved) {
        return {
          status: 'error',
          message: 'Failed to record attempt. Please try again.',
          count: record.count,
        };
      }

      AuditLogger.logEvent('RATE_LIMIT_ATTEMPT', {
        action: sanitizeInput(action),
        signerId: sanitizeInput(signerId),
        count: record.count,
        limit: DEFAULT_DAILY_LIMIT,
      });

      return {
        status: 'success',
        message: this.getMessage(action, record.count),
        count: record.count,
      };
    } catch (_error) {
      return {
        status: 'error',
        message: 'An unexpected error occurred. Please try again.',
        count: 0,
      };
    }
  },

  /**
   * Returns the current attempt count for the given action and signer/entity.
   * Automatically resets counters if a new day has started.
   *
   * @param {string} action - The action type (e.g., 'unlock', 'resend').
   * @param {string} signerId - The signer or entity ID.
   * @returns {number} The current attempt count for today.
   */
  getAttemptCount(action, signerId) {
    if (!action || typeof action !== 'string') {
      return 0;
    }

    if (!signerId || typeof signerId !== 'string') {
      return 0;
    }

    try {
      const key = buildKey(action, signerId);

      if (!key) {
        return 0;
      }

      let record = getRateLimitRecord(key);
      record = ensureCurrentDay(record);

      // Save the potentially reset record
      saveRateLimitRecord(key, record);

      return record.count || 0;
    } catch (_error) {
      return 0;
    }
  },

  /**
   * Returns the number of remaining attempts for the given action and signer/entity.
   * Automatically resets counters if a new day has started.
   *
   * @param {string} action - The action type (e.g., 'unlock', 'resend').
   * @param {string} signerId - The signer or entity ID.
   * @returns {number} The number of remaining attempts for today.
   */
  getRemainingAttempts(action, signerId) {
    if (!action || typeof action !== 'string') {
      return 0;
    }

    if (!signerId || typeof signerId !== 'string') {
      return 0;
    }

    try {
      const currentCount = this.getAttemptCount(action, signerId);
      const remaining = DEFAULT_DAILY_LIMIT - currentCount;

      return remaining > 0 ? remaining : 0;
    } catch (_error) {
      return 0;
    }
  },

  /**
   * Checks the midnight boundary and resets all counters if a new day has started.
   * Iterates through all stored rate limit records and resets any that are stale.
   *
   * @returns {boolean} True if any counters were reset, false otherwise.
   */
  resetIfNewDay() {
    try {
      const store = getRateLimitStore();

      if (!store || typeof store !== 'object') {
        return false;
      }

      let anyReset = false;
      const keys = Object.keys(store);

      for (const key of keys) {
        const record = store[key];

        if (record && typeof record === 'object' && isNewDay(record)) {
          store[key] = createDefaultRecord();
          anyReset = true;
        }
      }

      if (anyReset) {
        saveRateLimitStore(store);

        AuditLogger.logEvent('RATE_LIMITS_RESET', {
          reason: 'New day boundary',
          keysReset: keys.length,
        });
      }

      return anyReset;
    } catch (_error) {
      return false;
    }
  },

  /**
   * Returns a contextual message from the messaging matrix based on the action
   * type and the attempt number.
   *
   * For 'unlock' actions, uses UNLOCK_ATTEMPT_MESSAGES and UNLOCK_LIMIT_REACHED_MESSAGE.
   * For 'resend' actions, uses RESEND_ATTEMPT_MESSAGES and RESEND_LIMIT_REACHED_MESSAGE.
   *
   * @param {string} action - The action type (e.g., 'unlock', 'resend').
   * @param {number} attemptNumber - The current attempt number (1-based).
   * @returns {string} A contextual message for the given attempt, or a generic limit message.
   */
  getMessage(action, attemptNumber) {
    if (!action || typeof action !== 'string') {
      return '';
    }

    const normalizedAction = action.trim().toLowerCase();
    const attempt = typeof attemptNumber === 'number' ? attemptNumber : 0;

    if (normalizedAction === RATE_LIMITED_ACTIONS.UNLOCK) {
      if (attempt > DEFAULT_DAILY_LIMIT) {
        return UNLOCK_LIMIT_REACHED_MESSAGE;
      }

      if (attempt >= 1 && attempt <= DEFAULT_DAILY_LIMIT) {
        return UNLOCK_ATTEMPT_MESSAGES[attempt] || UNLOCK_LIMIT_REACHED_MESSAGE;
      }

      return '';
    }

    if (normalizedAction === RATE_LIMITED_ACTIONS.RESEND) {
      if (attempt > DEFAULT_DAILY_LIMIT) {
        return RESEND_LIMIT_REACHED_MESSAGE;
      }

      if (attempt >= 1 && attempt <= DEFAULT_DAILY_LIMIT) {
        return RESEND_ATTEMPT_MESSAGES[attempt] || RESEND_LIMIT_REACHED_MESSAGE;
      }

      return '';
    }

    // For unknown actions, return a generic message
    if (attempt > DEFAULT_DAILY_LIMIT) {
      return 'Too many requests. Please wait a moment and try again.';
    }

    return '';
  },

  /**
   * Returns the configured daily limit for rate-limited actions.
   *
   * @returns {number} The daily limit.
   */
  getDailyLimit() {
    return DEFAULT_DAILY_LIMIT;
  },

  /**
   * Clears all rate limit records from localStorage.
   * Intended for session cleanup or administrative purposes.
   *
   * @returns {boolean} True if the records were cleared successfully.
   */
  clearAllLimits() {
    try {
      const success = saveRateLimitStore({});

      if (success) {
        AuditLogger.logEvent('RATE_LIMITS_CLEARED', {});
      }

      return success;
    } catch (_error) {
      return false;
    }
  },
};

export default RateLimiter;