import { sanitizeInput } from '../utils/helpers.js';
import AuditLogger from './AuditLogger.js';
import RateLimiter from './RateLimiter.js';
import SignerService from './SignerService.js';

/**
 * Rate-limited action type for unlock attempts.
 * @type {string}
 */
const UNLOCK_ACTION = 'unlock';

/**
 * Self-service signer unlock service for the SIG Card Management application.
 * Allows locked signers to be unlocked while enforcing daily rate limits
 * (3 attempts per day) via RateLimiter. Returns contextual messages based
 * on the attempt number. After the daily limit is reached, directs the user
 * to contact support. All attempts are logged via AuditLogger.
 *
 * @namespace UnlockService
 */
const UnlockService = {
  /**
   * Attempts to unlock a locked signer, enforcing rate-limiting (3/day).
   * Returns an attempt-based contextual message from the messaging matrix.
   * After the daily limit is reached, directs the user to contact support.
   *
   * @param {string} signerId - The signer ID to unlock.
   * @returns {Object} Result object with status, message, and optionally attemptsRemaining.
   */
  unlockSigner(signerId) {
    if (!signerId || typeof signerId !== 'string' || signerId.trim().length === 0) {
      return {
        status: 'error',
        message: 'Signer ID is required.',
        attemptsRemaining: 0,
      };
    }

    const trimmedSignerId = signerId.trim();

    try {
      // Check if the rate limit has already been exceeded
      const withinLimit = RateLimiter.checkLimit(UNLOCK_ACTION, trimmedSignerId);

      if (!withinLimit) {
        const limitMessage = RateLimiter.getMessage(
          UNLOCK_ACTION,
          RateLimiter.getDailyLimit() + 1,
        );

        AuditLogger.logEvent('UNLOCK_RATE_LIMIT_EXCEEDED', {
          signerId: sanitizeInput(trimmedSignerId),
          action: UNLOCK_ACTION,
        });

        return {
          status: 'error',
          message: limitMessage,
          attemptsRemaining: 0,
        };
      }

      // Look up the signer
      const signer = SignerService.getSignerById(trimmedSignerId);

      if (!signer) {
        AuditLogger.logEvent('UNLOCK_FAILED', {
          signerId: sanitizeInput(trimmedSignerId),
          reason: 'Signer not found',
        });

        return {
          status: 'error',
          message: 'Signer not found.',
          attemptsRemaining: RateLimiter.getRemainingAttempts(UNLOCK_ACTION, trimmedSignerId),
        };
      }

      // Check if the signer is actually locked
      if (!signer.isLocked) {
        AuditLogger.logEvent('UNLOCK_SKIPPED', {
          signerId: sanitizeInput(trimmedSignerId),
          reason: 'Signer is not locked',
        });

        return {
          status: 'success',
          message: 'Signer is not currently locked.',
          attemptsRemaining: RateLimiter.getRemainingAttempts(UNLOCK_ACTION, trimmedSignerId),
        };
      }

      // Record the unlock attempt via RateLimiter
      const attemptResult = RateLimiter.recordAttempt(UNLOCK_ACTION, trimmedSignerId);

      if (attemptResult.status === 'error') {
        AuditLogger.logEvent('UNLOCK_RATE_LIMIT_EXCEEDED', {
          signerId: sanitizeInput(trimmedSignerId),
          action: UNLOCK_ACTION,
          count: attemptResult.count,
        });

        return {
          status: 'error',
          message: attemptResult.message,
          attemptsRemaining: 0,
        };
      }

      // Attempt to unlock the signer by staging an edit
      const editResult = SignerService.editSigner(trimmedSignerId, {
        isLocked: false,
        status: 'Active',
      });

      if (editResult.status !== 'success') {
        AuditLogger.logEvent('UNLOCK_FAILED', {
          signerId: sanitizeInput(trimmedSignerId),
          reason: 'Failed to stage unlock edit',
          attemptCount: attemptResult.count,
        });

        return {
          status: 'error',
          message: attemptResult.message || 'Failed to unlock signer. Please try again.',
          attemptsRemaining: RateLimiter.getRemainingAttempts(UNLOCK_ACTION, trimmedSignerId),
        };
      }

      AuditLogger.logEvent('UNLOCK_ATTEMPT', {
        signerId: sanitizeInput(trimmedSignerId),
        attemptCount: attemptResult.count,
        result: 'staged',
      });

      const remaining = RateLimiter.getRemainingAttempts(UNLOCK_ACTION, trimmedSignerId);

      return {
        status: 'success',
        message: attemptResult.message,
        attemptsRemaining: remaining,
      };
    } catch (_error) {
      return {
        status: 'error',
        message: 'An unexpected error occurred. Please try again.',
        attemptsRemaining: 0,
      };
    }
  },

  /**
   * Returns the number of remaining unlock attempts for a given signer today.
   *
   * @param {string} signerId - The signer ID to check.
   * @returns {number} The number of remaining unlock attempts for today.
   */
  getRemainingAttempts(signerId) {
    if (!signerId || typeof signerId !== 'string') {
      return 0;
    }

    try {
      return RateLimiter.getRemainingAttempts(UNLOCK_ACTION, signerId.trim());
    } catch (_error) {
      return 0;
    }
  },

  /**
   * Returns the current unlock attempt count for a given signer today.
   *
   * @param {string} signerId - The signer ID to check.
   * @returns {number} The current attempt count for today.
   */
  getAttemptCount(signerId) {
    if (!signerId || typeof signerId !== 'string') {
      return 0;
    }

    try {
      return RateLimiter.getAttemptCount(UNLOCK_ACTION, signerId.trim());
    } catch (_error) {
      return 0;
    }
  },

  /**
   * Checks whether the daily unlock limit has been reached for a given signer.
   *
   * @param {string} signerId - The signer ID to check.
   * @returns {boolean} True if the daily limit has been reached.
   */
  isLimitReached(signerId) {
    if (!signerId || typeof signerId !== 'string') {
      return true;
    }

    try {
      return !RateLimiter.checkLimit(UNLOCK_ACTION, signerId.trim());
    } catch (_error) {
      return true;
    }
  },

  /**
   * Returns the configured daily unlock attempt limit.
   *
   * @returns {number} The daily limit for unlock attempts.
   */
  getDailyLimit() {
    return RateLimiter.getDailyLimit();
  },
};

export default UnlockService;