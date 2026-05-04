import { STORAGE_KEYS } from '../constants/constants.js';
import { getItem, setItem } from '../utils/storage.js';
import { generateUUID } from '../utils/helpers.js';
import { sanitizeInput } from '../utils/helpers.js';
import AuditLogger from './AuditLogger.js';
import {
  getMockKBAQuestions,
  getMockOTPCode,
  MOCK_KBA_DEFAULT_QUESTIONS,
} from '../constants/mockData.js';

/**
 * Maximum number of failed verification attempts before lockout.
 * @type {number}
 */
const MAX_VERIFICATION_ATTEMPTS = 3;

/**
 * Maximum number of OTP resend requests allowed per entity.
 * @type {number}
 */
const MAX_RESEND_ATTEMPTS = 3;

/**
 * Verification storage key used within the VERIFICATION localStorage entry.
 * @type {string}
 */
const VERIFICATION_STORE_KEY = STORAGE_KEYS.VERIFICATION;

/**
 * Retrieves the full verification store from localStorage.
 * @returns {Object} The verification store object keyed by entity ID.
 */
const getVerificationStore = () => {
  try {
    const store = getItem(VERIFICATION_STORE_KEY, {});

    if (store && typeof store === 'object' && !Array.isArray(store)) {
      return store;
    }

    return {};
  } catch (_error) {
    return {};
  }
};

/**
 * Persists the verification store to localStorage.
 * @param {Object} store - The verification store object.
 * @returns {boolean} True if saved successfully.
 */
const saveVerificationStore = (store) => {
  try {
    return setItem(VERIFICATION_STORE_KEY, store);
  } catch (_error) {
    return false;
  }
};

/**
 * Retrieves the verification record for a given entity ID.
 * @param {string} entityId - The user ID or signer ID.
 * @returns {Object} The verification record for the entity.
 */
const getVerificationRecord = (entityId) => {
  if (!entityId || typeof entityId !== 'string') {
    return createDefaultRecord();
  }

  try {
    const store = getVerificationStore();
    const record = store[entityId];

    if (record && typeof record === 'object') {
      return record;
    }

    return createDefaultRecord();
  } catch (_error) {
    return createDefaultRecord();
  }
};

/**
 * Creates a default verification record.
 * @returns {Object} A fresh verification record.
 */
const createDefaultRecord = () => {
  return {
    status: 'pending',
    kbaAttempts: 0,
    otpAttempts: 0,
    resendAttempts: 0,
    totalFailedAttempts: 0,
    isLocked: false,
    lockedAt: null,
    lastAttempt: null,
    verifiedAt: null,
    verificationMethod: null,
    attempts: [],
  };
};

/**
 * Saves a verification record for a given entity ID.
 * @param {string} entityId - The user ID or signer ID.
 * @param {Object} record - The verification record to save.
 * @returns {boolean} True if saved successfully.
 */
const saveVerificationRecord = (entityId, record) => {
  if (!entityId || typeof entityId !== 'string') {
    return false;
  }

  try {
    const store = getVerificationStore();
    store[entityId] = record;
    return saveVerificationStore(store);
  } catch (_error) {
    return false;
  }
};

/**
 * Identity verification service for the SIG Card Management application.
 * Supports KBA (Knowledge-Based Authentication) and OTP (One-Time Password)
 * verification methods. Tracks verification attempts, enforces lockout after
 * too many failures, and logs all verification events via AuditLogger.
 *
 * All data is persisted in localStorage. Designed for future MFA extensibility.
 *
 * @namespace VerificationService
 */
const VerificationService = {
  /**
   * Verifies KBA answers for a given signer.
   * Compares provided answers against the hardcoded KBA questions/answers
   * from mock data. Tracks attempts and enforces lockout after the
   * configured maximum number of failed attempts.
   *
   * @param {Object} params - The KBA verification parameters.
   * @param {string} params.signerId - The signer ID to verify.
   * @param {Array<Object>} params.answers - Array of answer objects with { questionId, answer }.
   * @returns {Object} Result object with status, message, verificationStatus, and optionally attemptsLeft.
   */
  verifyKBA({ signerId, answers }) {
    try {
      if (!signerId || typeof signerId !== 'string') {
        return {
          status: 'error',
          message: 'Signer ID is required.',
          verificationStatus: 'failed',
        };
      }

      if (!answers || !Array.isArray(answers) || answers.length === 0) {
        return {
          status: 'error',
          message: 'Answers are required.',
          verificationStatus: 'failed',
        };
      }

      const record = getVerificationRecord(signerId);

      // Check if already locked
      if (record.isLocked) {
        return {
          status: 'error',
          message: 'Verification is locked due to too many failed attempts. Please contact support.',
          verificationStatus: 'locked',
          attemptsLeft: 0,
        };
      }

      // Check if already verified
      if (record.status === 'verified') {
        return {
          status: 'success',
          message: 'Identity has already been verified.',
          verificationStatus: 'verified',
        };
      }

      // Get the KBA questions for this signer
      const questions = getMockKBAQuestions(signerId);

      if (!questions || questions.length === 0) {
        return {
          status: 'error',
          message: 'No verification questions available. Please contact support.',
          verificationStatus: 'failed',
        };
      }

      // Validate answers against questions
      let allCorrect = true;

      for (const question of questions) {
        const providedAnswer = answers.find(
          (a) => a.questionId === question.id,
        );

        if (!providedAnswer) {
          allCorrect = false;
          break;
        }

        const expected = question.answer.trim().toLowerCase();
        const actual = (providedAnswer.answer || '').trim().toLowerCase();

        if (expected !== actual) {
          allCorrect = false;
          break;
        }
      }

      const now = new Date().toISOString();

      if (allCorrect) {
        // Successful verification
        record.status = 'verified';
        record.verifiedAt = now;
        record.lastAttempt = now;
        record.verificationMethod = 'KBA';

        record.attempts.push({
          id: generateUUID(),
          method: 'KBA',
          outcome: 'success',
          timestamp: now,
        });

        saveVerificationRecord(signerId, record);

        AuditLogger.logEvent('VERIFICATION_SUCCESS', {
          signerId: sanitizeInput(signerId),
          method: 'KBA',
        });

        return {
          status: 'success',
          message: 'Identity verified successfully.',
          verificationStatus: 'verified',
        };
      }

      // Failed verification
      record.kbaAttempts = (record.kbaAttempts || 0) + 1;
      record.totalFailedAttempts = (record.totalFailedAttempts || 0) + 1;
      record.lastAttempt = now;

      record.attempts.push({
        id: generateUUID(),
        method: 'KBA',
        outcome: 'failure',
        timestamp: now,
      });

      const attemptsLeft = MAX_VERIFICATION_ATTEMPTS - record.kbaAttempts;

      if (record.kbaAttempts >= MAX_VERIFICATION_ATTEMPTS) {
        record.isLocked = true;
        record.lockedAt = now;
        record.status = 'locked';

        saveVerificationRecord(signerId, record);

        AuditLogger.logEvent('VERIFICATION_LOCKED', {
          signerId: sanitizeInput(signerId),
          method: 'KBA',
          failedAttempts: record.kbaAttempts,
        });

        return {
          status: 'error',
          message: 'Verification is locked due to too many failed attempts. Please contact support.',
          verificationStatus: 'locked',
          attemptsLeft: 0,
        };
      }

      saveVerificationRecord(signerId, record);

      AuditLogger.logEvent('VERIFICATION_FAILED', {
        signerId: sanitizeInput(signerId),
        method: 'KBA',
        failedAttempts: record.kbaAttempts,
        attemptsLeft,
      });

      return {
        status: 'error',
        message: 'Verification failed. Please try again.',
        verificationStatus: 'failed',
        attemptsLeft,
      };
    } catch (_error) {
      return {
        status: 'error',
        message: 'An unexpected error occurred during verification. Please try again.',
        verificationStatus: 'failed',
      };
    }
  },

  /**
   * Verifies an OTP code for a given entity (user or signer).
   * Compares the provided code against the hardcoded OTP from mock data.
   * Tracks attempts and enforces lockout after the configured maximum
   * number of failed attempts.
   *
   * @param {Object} params - The OTP verification parameters.
   * @param {string} params.entityId - The user ID or signer ID to verify.
   * @param {string} params.code - The OTP code to verify.
   * @returns {Object} Result object with status, message, verificationStatus, and optionally attemptsLeft.
   */
  verifyOTP({ entityId, code }) {
    try {
      if (!entityId || typeof entityId !== 'string') {
        return {
          status: 'error',
          message: 'Entity ID is required.',
          verificationStatus: 'failed',
        };
      }

      if (!code || typeof code !== 'string' || code.trim().length === 0) {
        return {
          status: 'error',
          message: 'Verification code is required.',
          verificationStatus: 'failed',
        };
      }

      const record = getVerificationRecord(entityId);

      // Check if already locked
      if (record.isLocked) {
        return {
          status: 'error',
          message: 'Verification is locked due to too many failed attempts. Please contact support.',
          verificationStatus: 'locked',
          attemptsLeft: 0,
        };
      }

      // Check if already verified
      if (record.status === 'verified') {
        return {
          status: 'success',
          message: 'Identity has already been verified.',
          verificationStatus: 'verified',
        };
      }

      // Get the OTP code for this entity
      const otpRecord = getMockOTPCode(entityId);

      if (!otpRecord) {
        return {
          status: 'error',
          message: 'No verification code found. Please request a new code.',
          verificationStatus: 'failed',
        };
      }

      // Check if OTP has been used
      if (otpRecord.isUsed) {
        return {
          status: 'error',
          message: 'This verification code has already been used. Please request a new code.',
          verificationStatus: 'failed',
        };
      }

      // Check if OTP has expired
      if (otpRecord.expiresAt) {
        const expiresAt = new Date(otpRecord.expiresAt).getTime();
        const now = Date.now();

        if (now >= expiresAt) {
          return {
            status: 'error',
            message: 'This verification code has expired. Please request a new code.',
            verificationStatus: 'expired',
          };
        }
      }

      const sanitizedCode = code.trim();
      const now = new Date().toISOString();

      if (sanitizedCode === otpRecord.code) {
        // Successful verification
        record.status = 'verified';
        record.verifiedAt = now;
        record.lastAttempt = now;
        record.verificationMethod = 'OTP';

        record.attempts.push({
          id: generateUUID(),
          method: 'OTP',
          outcome: 'success',
          timestamp: now,
        });

        saveVerificationRecord(entityId, record);

        AuditLogger.logEvent('VERIFICATION_SUCCESS', {
          entityId: sanitizeInput(entityId),
          method: 'OTP',
        });

        return {
          status: 'success',
          message: 'Verification code accepted. Identity verified successfully.',
          verificationStatus: 'verified',
        };
      }

      // Failed verification
      record.otpAttempts = (record.otpAttempts || 0) + 1;
      record.totalFailedAttempts = (record.totalFailedAttempts || 0) + 1;
      record.lastAttempt = now;

      record.attempts.push({
        id: generateUUID(),
        method: 'OTP',
        outcome: 'failure',
        timestamp: now,
      });

      const attemptsLeft = MAX_VERIFICATION_ATTEMPTS - record.otpAttempts;

      if (record.otpAttempts >= MAX_VERIFICATION_ATTEMPTS) {
        record.isLocked = true;
        record.lockedAt = now;
        record.status = 'locked';

        saveVerificationRecord(entityId, record);

        AuditLogger.logEvent('VERIFICATION_LOCKED', {
          entityId: sanitizeInput(entityId),
          method: 'OTP',
          failedAttempts: record.otpAttempts,
        });

        return {
          status: 'error',
          message: 'Verification is locked due to too many failed attempts. Please contact support.',
          verificationStatus: 'locked',
          attemptsLeft: 0,
        };
      }

      saveVerificationRecord(entityId, record);

      AuditLogger.logEvent('VERIFICATION_FAILED', {
        entityId: sanitizeInput(entityId),
        method: 'OTP',
        failedAttempts: record.otpAttempts,
        attemptsLeft,
      });

      return {
        status: 'error',
        message: 'Incorrect verification code. Please try again.',
        verificationStatus: 'failed',
        attemptsLeft,
      };
    } catch (_error) {
      return {
        status: 'error',
        message: 'An unexpected error occurred during verification. Please try again.',
        verificationStatus: 'failed',
      };
    }
  },

  /**
   * Tracks a verification attempt for a given entity.
   * Logs the attempt with method, outcome, and timestamp.
   *
   * @param {string} entityId - The user ID or signer ID.
   * @param {string} method - The verification method used (e.g., 'KBA', 'OTP', 'ID_VERIFICATION').
   * @param {string} outcome - The outcome of the attempt ('success' or 'failure').
   * @returns {Object|null} The created attempt record, or null on failure.
   */
  trackAttempt(entityId, method, outcome) {
    if (!entityId || typeof entityId !== 'string') {
      return null;
    }

    if (!method || typeof method !== 'string') {
      return null;
    }

    if (!outcome || typeof outcome !== 'string') {
      return null;
    }

    try {
      const record = getVerificationRecord(entityId);
      const now = new Date().toISOString();

      const attempt = {
        id: generateUUID(),
        method: sanitizeInput(method),
        outcome: sanitizeInput(outcome),
        timestamp: now,
      };

      record.attempts.push(attempt);
      record.lastAttempt = now;

      if (outcome === 'failure') {
        record.totalFailedAttempts = (record.totalFailedAttempts || 0) + 1;

        if (method === 'KBA') {
          record.kbaAttempts = (record.kbaAttempts || 0) + 1;
        } else if (method === 'OTP') {
          record.otpAttempts = (record.otpAttempts || 0) + 1;
        }

        // Check if should lock
        const methodAttempts = method === 'KBA' ? record.kbaAttempts : record.otpAttempts;

        if (methodAttempts >= MAX_VERIFICATION_ATTEMPTS) {
          record.isLocked = true;
          record.lockedAt = now;
          record.status = 'locked';
        }
      } else if (outcome === 'success') {
        record.status = 'verified';
        record.verifiedAt = now;
        record.verificationMethod = method;
      }

      saveVerificationRecord(entityId, record);

      AuditLogger.logEvent('VERIFICATION_ATTEMPT', {
        entityId: sanitizeInput(entityId),
        method: sanitizeInput(method),
        outcome: sanitizeInput(outcome),
      });

      return attempt;
    } catch (_error) {
      return null;
    }
  },

  /**
   * Returns the number of failed verification attempts for a given entity.
   *
   * @param {string} entityId - The user ID or signer ID.
   * @returns {number} The total number of failed verification attempts.
   */
  getAttemptCount(entityId) {
    if (!entityId || typeof entityId !== 'string') {
      return 0;
    }

    try {
      const record = getVerificationRecord(entityId);
      return record.totalFailedAttempts || 0;
    } catch (_error) {
      return 0;
    }
  },

  /**
   * Checks if verification is locked for a given entity due to too many failures.
   *
   * @param {string} entityId - The user ID or signer ID.
   * @returns {boolean} True if verification is locked.
   */
  isLocked(entityId) {
    if (!entityId || typeof entityId !== 'string') {
      return false;
    }

    try {
      const record = getVerificationRecord(entityId);
      return record.isLocked === true;
    } catch (_error) {
      return false;
    }
  },

  /**
   * Retrieves the verification status for a given entity.
   *
   * @param {string} entityId - The user ID or signer ID.
   * @returns {string} The verification status ('pending', 'verified', 'failed', 'locked').
   */
  getVerificationStatus(entityId) {
    if (!entityId || typeof entityId !== 'string') {
      return 'pending';
    }

    try {
      const record = getVerificationRecord(entityId);
      return record.status || 'pending';
    } catch (_error) {
      return 'pending';
    }
  },

  /**
   * Retrieves the full verification record for a given entity.
   *
   * @param {string} entityId - The user ID or signer ID.
   * @returns {Object} The verification record.
   */
  getVerificationRecord(entityId) {
    if (!entityId || typeof entityId !== 'string') {
      return createDefaultRecord();
    }

    try {
      return getVerificationRecord(entityId);
    } catch (_error) {
      return createDefaultRecord();
    }
  },

  /**
   * Retrieves all verification attempts for a given entity.
   *
   * @param {string} entityId - The user ID or signer ID.
   * @returns {Array<Object>} An array of attempt records.
   */
  getAttempts(entityId) {
    if (!entityId || typeof entityId !== 'string') {
      return [];
    }

    try {
      const record = getVerificationRecord(entityId);
      return Array.isArray(record.attempts) ? record.attempts : [];
    } catch (_error) {
      return [];
    }
  },

  /**
   * Retrieves the KBA questions for a given signer.
   * Returns questions without the correct answers for use in the UI.
   *
   * @param {string} signerId - The signer ID to get questions for.
   * @returns {Array<Object>} An array of question objects with id, question, and options (no answers).
   */
  getKBAQuestions(signerId) {
    if (!signerId || typeof signerId !== 'string') {
      return [];
    }

    try {
      const questions = getMockKBAQuestions(signerId);

      if (!questions || !Array.isArray(questions)) {
        return [];
      }

      // Return questions without the correct answer
      return questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: Array.isArray(q.options) ? [...q.options] : [],
      }));
    } catch (_error) {
      return [];
    }
  },

  /**
   * Simulates requesting a new OTP code for a given entity.
   * Tracks resend attempts and enforces a maximum resend limit.
   *
   * @param {string} entityId - The user ID or signer ID.
   * @returns {Object} Result object with status and message.
   */
  requestNewOTP(entityId) {
    if (!entityId || typeof entityId !== 'string') {
      return {
        status: 'error',
        message: 'Entity ID is required.',
      };
    }

    try {
      const record = getVerificationRecord(entityId);

      if (record.isLocked) {
        return {
          status: 'error',
          message: 'Verification is locked due to too many failed attempts. Please contact support.',
        };
      }

      if (record.status === 'verified') {
        return {
          status: 'error',
          message: 'Identity has already been verified.',
        };
      }

      const resendAttempts = (record.resendAttempts || 0) + 1;

      if (resendAttempts > MAX_RESEND_ATTEMPTS) {
        return {
          status: 'error',
          message: 'You have reached the maximum number of resend attempts. Please contact support if you need further assistance.',
        };
      }

      record.resendAttempts = resendAttempts;
      record.lastAttempt = new Date().toISOString();

      // Reset OTP attempts on resend to allow fresh attempts with new code
      record.otpAttempts = 0;

      saveVerificationRecord(entityId, record);

      AuditLogger.logEvent('OTP_RESEND', {
        entityId: sanitizeInput(entityId),
        resendAttempts,
      });

      return {
        status: 'success',
        message: 'A new verification code has been sent.',
        resendAttemptsRemaining: MAX_RESEND_ATTEMPTS - resendAttempts,
      };
    } catch (_error) {
      return {
        status: 'error',
        message: 'An unexpected error occurred. Please try again.',
      };
    }
  },

  /**
   * Resets the verification record for a given entity.
   * Intended for administrative use or testing.
   *
   * @param {string} entityId - The user ID or signer ID.
   * @returns {boolean} True if the record was reset successfully.
   */
  resetVerification(entityId) {
    if (!entityId || typeof entityId !== 'string') {
      return false;
    }

    try {
      const defaultRecord = createDefaultRecord();
      const success = saveVerificationRecord(entityId, defaultRecord);

      if (success) {
        AuditLogger.logEvent('VERIFICATION_RESET', {
          entityId: sanitizeInput(entityId),
        });
      }

      return success;
    } catch (_error) {
      return false;
    }
  },

  /**
   * Clears all verification records from localStorage.
   * Intended for session cleanup or administrative purposes.
   *
   * @returns {boolean} True if the records were cleared successfully.
   */
  clearAllVerificationRecords() {
    try {
      const success = saveVerificationStore({});

      if (success) {
        AuditLogger.logEvent('VERIFICATION_RECORDS_CLEARED', {});
      }

      return success;
    } catch (_error) {
      return false;
    }
  },

  /**
   * Returns the maximum number of verification attempts allowed.
   *
   * @returns {number} The maximum number of verification attempts.
   */
  getMaxAttempts() {
    return MAX_VERIFICATION_ATTEMPTS;
  },

  /**
   * Returns the maximum number of OTP resend attempts allowed.
   *
   * @returns {number} The maximum number of resend attempts.
   */
  getMaxResendAttempts() {
    return MAX_RESEND_ATTEMPTS;
  },
};

export default VerificationService;