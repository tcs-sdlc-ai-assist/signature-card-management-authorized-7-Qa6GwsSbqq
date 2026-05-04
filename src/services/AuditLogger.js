import { STORAGE_KEYS } from '../constants/constants.js';
import { getItem, setItem } from '../utils/storage.js';
import { generateUUID } from '../utils/helpers.js';
import { sanitizeInput } from '../utils/helpers.js';

/**
 * Maximum number of audit log entries to retain in localStorage.
 * Oldest entries are purged when this limit is exceeded.
 * @type {number}
 */
const MAX_LOG_ENTRIES = 1000;

/**
 * Fields considered PII that should be masked or removed from log details.
 * @type {Array<string>}
 */
const PII_FIELDS = [
  'password',
  'passwordHash',
  'ssn',
  'socialSecurityNumber',
  'dateOfBirth',
  'dob',
  'email',
  'phone',
  'phoneNumber',
  'address',
  'street',
  'zip',
  'zipCode',
  'otp',
  'code',
  'token',
  'sessionToken',
  'creditCard',
  'cardNumber',
  'accountNumber',
  'routingNumber',
];

/**
 * Masks a string value, showing only the last 4 characters if long enough.
 * @param {string} value - The value to mask.
 * @returns {string} The masked value.
 */
const maskValue = (value) => {
  if (value === null || value === undefined) {
    return '[REDACTED]';
  }

  const str = String(value);

  if (str.length <= 4) {
    return '****';
  }

  const lastFour = str.slice(-4);
  return `${'*'.repeat(str.length - 4)}${lastFour}`;
};

/**
 * Recursively sanitizes an object by masking PII fields and sanitizing string values.
 * @param {*} data - The data to sanitize.
 * @param {number} [depth=0] - Current recursion depth to prevent infinite loops.
 * @returns {*} The sanitized data.
 */
const sanitizeDetails = (data, depth = 0) => {
  if (depth > 10) {
    return '[MAX_DEPTH]';
  }

  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeInput(data);
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeDetails(item, depth + 1));
  }

  if (typeof data === 'object') {
    const sanitized = {};

    for (const key of Object.keys(data)) {
      const lowerKey = key.toLowerCase();
      const isPII = PII_FIELDS.some(
        (field) => lowerKey === field.toLowerCase() || lowerKey.includes(field.toLowerCase()),
      );

      if (isPII) {
        if (typeof data[key] === 'string') {
          sanitized[key] = maskValue(data[key]);
        } else if (typeof data[key] === 'object' && data[key] !== null) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = '[REDACTED]';
        }
      } else {
        sanitized[key] = sanitizeDetails(data[key], depth + 1);
      }
    }

    return sanitized;
  }

  return String(data);
};

/**
 * Retrieves the current user ID from the active session in localStorage.
 * @returns {string|null} The current user ID, or null if no session exists.
 */
const getCurrentUserId = () => {
  try {
    const session = getItem(STORAGE_KEYS.SESSIONS, null);

    if (session && typeof session === 'object' && session.userId) {
      return session.userId;
    }

    return null;
  } catch (_error) {
    return null;
  }
};

/**
 * Centralized audit logging service for compliance and tracking.
 * Writes immutable log entries to localStorage with timestamps,
 * user IDs, action types, and sanitized details (no PII).
 *
 * @namespace AuditLogger
 */
const AuditLogger = {
  /**
   * Logs an audit event to localStorage.
   *
   * @param {string} action - The action type (e.g., 'LOGIN', 'LOGOUT', 'CARD_CREATED').
   * @param {Object} [details={}] - Additional details about the event (PII will be masked).
   * @param {Object|null} [before=null] - The state before the action (for change tracking).
   * @param {Object|null} [after=null] - The state after the action (for change tracking).
   * @returns {Object|null} The created log entry, or null if logging failed.
   */
  logEvent(action, details = {}, before = null, after = null) {
    try {
      if (!action || typeof action !== 'string') {
        return null;
      }

      const userId = getCurrentUserId();
      const timestamp = new Date().toISOString();
      const eventId = generateUUID();

      const entry = {
        id: eventId,
        userId: userId || 'anonymous',
        action: sanitizeInput(action),
        timestamp,
        details: sanitizeDetails(details),
      };

      if (before !== null) {
        entry.before = sanitizeDetails(before);
      }

      if (after !== null) {
        entry.after = sanitizeDetails(after);
      }

      const logs = getItem(STORAGE_KEYS.AUDIT_LOG, []);

      if (!Array.isArray(logs)) {
        setItem(STORAGE_KEYS.AUDIT_LOG, [entry]);
        return entry;
      }

      logs.push(entry);

      if (logs.length > MAX_LOG_ENTRIES) {
        const excess = logs.length - MAX_LOG_ENTRIES;
        logs.splice(0, excess);
      }

      setItem(STORAGE_KEYS.AUDIT_LOG, logs);

      return entry;
    } catch (_error) {
      return null;
    }
  },

  /**
   * Retrieves all audit log entries from localStorage.
   *
   * @returns {Array<Object>} An array of audit log entries, newest last.
   */
  getLogs() {
    try {
      const logs = getItem(STORAGE_KEYS.AUDIT_LOG, []);

      if (!Array.isArray(logs)) {
        return [];
      }

      return logs;
    } catch (_error) {
      return [];
    }
  },

  /**
   * Clears all audit log entries from localStorage.
   * Intended for session cleanup or administrative purposes.
   *
   * @returns {boolean} True if the logs were cleared successfully, false otherwise.
   */
  clearLogs() {
    try {
      return setItem(STORAGE_KEYS.AUDIT_LOG, []);
    } catch (_error) {
      return false;
    }
  },

  /**
   * Retrieves audit log entries filtered by action type.
   *
   * @param {string} action - The action type to filter by.
   * @returns {Array<Object>} An array of matching audit log entries.
   */
  getLogsByAction(action) {
    if (!action || typeof action !== 'string') {
      return [];
    }

    try {
      const logs = this.getLogs();
      return logs.filter((entry) => entry.action === action);
    } catch (_error) {
      return [];
    }
  },

  /**
   * Retrieves audit log entries filtered by user ID.
   *
   * @param {string} userId - The user ID to filter by.
   * @returns {Array<Object>} An array of matching audit log entries.
   */
  getLogsByUserId(userId) {
    if (!userId || typeof userId !== 'string') {
      return [];
    }

    try {
      const logs = this.getLogs();
      return logs.filter((entry) => entry.userId === userId);
    } catch (_error) {
      return [];
    }
  },
};

export default AuditLogger;