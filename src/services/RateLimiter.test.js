import { describe, it, expect, beforeEach, vi } from 'vitest';
import RateLimiter from './RateLimiter.js';
import {
  UNLOCK_ATTEMPT_MESSAGES,
  UNLOCK_LIMIT_REACHED_MESSAGE,
  RESEND_ATTEMPT_MESSAGES,
  RESEND_LIMIT_REACHED_MESSAGE,
} from '../constants/messages.js';

describe('RateLimiter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('checkLimit', () => {
    it('returns true when no attempts have been made', () => {
      const result = RateLimiter.checkLimit('unlock', 'sgn-001');
      expect(result).toBe(true);
    });

    it('returns true when attempts are within the daily limit', () => {
      RateLimiter.recordAttempt('unlock', 'sgn-001');
      RateLimiter.recordAttempt('unlock', 'sgn-001');

      const result = RateLimiter.checkLimit('unlock', 'sgn-001');
      expect(result).toBe(true);
    });

    it('returns false after reaching the daily limit of 3 attempts', () => {
      const dailyLimit = RateLimiter.getDailyLimit();

      for (let i = 0; i < dailyLimit; i++) {
        RateLimiter.recordAttempt('unlock', 'sgn-001');
      }

      const result = RateLimiter.checkLimit('unlock', 'sgn-001');
      expect(result).toBe(false);
    });

    it('returns false when action is empty', () => {
      const result = RateLimiter.checkLimit('', 'sgn-001');
      expect(result).toBe(false);
    });

    it('returns false when action is null', () => {
      const result = RateLimiter.checkLimit(null, 'sgn-001');
      expect(result).toBe(false);
    });

    it('returns false when signerId is empty', () => {
      const result = RateLimiter.checkLimit('unlock', '');
      expect(result).toBe(false);
    });

    it('returns false when signerId is null', () => {
      const result = RateLimiter.checkLimit('unlock', null);
      expect(result).toBe(false);
    });

    it('tracks limits independently per signer', () => {
      const dailyLimit = RateLimiter.getDailyLimit();

      for (let i = 0; i < dailyLimit; i++) {
        RateLimiter.recordAttempt('unlock', 'sgn-001');
      }

      expect(RateLimiter.checkLimit('unlock', 'sgn-001')).toBe(false);
      expect(RateLimiter.checkLimit('unlock', 'sgn-002')).toBe(true);
    });

    it('tracks limits independently per action type', () => {
      const dailyLimit = RateLimiter.getDailyLimit();

      for (let i = 0; i < dailyLimit; i++) {
        RateLimiter.recordAttempt('unlock', 'sgn-001');
      }

      expect(RateLimiter.checkLimit('unlock', 'sgn-001')).toBe(false);
      expect(RateLimiter.checkLimit('resend', 'sgn-001')).toBe(true);
    });
  });

  describe('recordAttempt', () => {
    it('increments the counter on each attempt', () => {
      expect(RateLimiter.getAttemptCount('unlock', 'sgn-001')).toBe(0);

      RateLimiter.recordAttempt('unlock', 'sgn-001');
      expect(RateLimiter.getAttemptCount('unlock', 'sgn-001')).toBe(1);

      RateLimiter.recordAttempt('unlock', 'sgn-001');
      expect(RateLimiter.getAttemptCount('unlock', 'sgn-001')).toBe(2);

      RateLimiter.recordAttempt('unlock', 'sgn-001');
      expect(RateLimiter.getAttemptCount('unlock', 'sgn-001')).toBe(3);
    });

    it('returns success status when within limit', () => {
      const result = RateLimiter.recordAttempt('unlock', 'sgn-001');

      expect(result.status).toBe('success');
      expect(result.count).toBe(1);
      expect(typeof result.message).toBe('string');
    });

    it('returns error status when limit is exceeded', () => {
      const dailyLimit = RateLimiter.getDailyLimit();

      for (let i = 0; i < dailyLimit; i++) {
        RateLimiter.recordAttempt('unlock', 'sgn-001');
      }

      const result = RateLimiter.recordAttempt('unlock', 'sgn-001');

      expect(result.status).toBe('error');
      expect(result.count).toBe(dailyLimit);
    });

    it('returns error when action is empty', () => {
      const result = RateLimiter.recordAttempt('', 'sgn-001');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Action is required.');
      expect(result.count).toBe(0);
    });

    it('returns error when action is null', () => {
      const result = RateLimiter.recordAttempt(null, 'sgn-001');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Action is required.');
    });

    it('returns error when signerId is empty', () => {
      const result = RateLimiter.recordAttempt('unlock', '');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Signer ID is required.');
      expect(result.count).toBe(0);
    });

    it('returns error when signerId is null', () => {
      const result = RateLimiter.recordAttempt('unlock', null);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Signer ID is required.');
    });

    it('returns a contextual message with each attempt', () => {
      const result1 = RateLimiter.recordAttempt('unlock', 'sgn-001');
      expect(result1.status).toBe('success');
      expect(result1.message.length).toBeGreaterThan(0);

      const result2 = RateLimiter.recordAttempt('unlock', 'sgn-001');
      expect(result2.status).toBe('success');
      expect(result2.message.length).toBeGreaterThan(0);

      const result3 = RateLimiter.recordAttempt('unlock', 'sgn-001');
      expect(result3.status).toBe('success');
      expect(result3.message.length).toBeGreaterThan(0);
    });
  });

  describe('getAttemptCount', () => {
    it('returns 0 when no attempts have been made', () => {
      const count = RateLimiter.getAttemptCount('unlock', 'sgn-001');
      expect(count).toBe(0);
    });

    it('returns the correct count after multiple attempts', () => {
      RateLimiter.recordAttempt('resend', 'sgn-002');
      RateLimiter.recordAttempt('resend', 'sgn-002');

      const count = RateLimiter.getAttemptCount('resend', 'sgn-002');
      expect(count).toBe(2);
    });

    it('returns 0 for empty action', () => {
      const count = RateLimiter.getAttemptCount('', 'sgn-001');
      expect(count).toBe(0);
    });

    it('returns 0 for null action', () => {
      const count = RateLimiter.getAttemptCount(null, 'sgn-001');
      expect(count).toBe(0);
    });

    it('returns 0 for empty signerId', () => {
      const count = RateLimiter.getAttemptCount('unlock', '');
      expect(count).toBe(0);
    });

    it('returns 0 for null signerId', () => {
      const count = RateLimiter.getAttemptCount('unlock', null);
      expect(count).toBe(0);
    });
  });

  describe('getRemainingAttempts', () => {
    it('returns the full daily limit when no attempts have been made', () => {
      const remaining = RateLimiter.getRemainingAttempts('unlock', 'sgn-001');
      expect(remaining).toBe(RateLimiter.getDailyLimit());
    });

    it('decrements remaining attempts after each recorded attempt', () => {
      const dailyLimit = RateLimiter.getDailyLimit();

      RateLimiter.recordAttempt('unlock', 'sgn-001');
      expect(RateLimiter.getRemainingAttempts('unlock', 'sgn-001')).toBe(dailyLimit - 1);

      RateLimiter.recordAttempt('unlock', 'sgn-001');
      expect(RateLimiter.getRemainingAttempts('unlock', 'sgn-001')).toBe(dailyLimit - 2);
    });

    it('returns 0 when all attempts are exhausted', () => {
      const dailyLimit = RateLimiter.getDailyLimit();

      for (let i = 0; i < dailyLimit; i++) {
        RateLimiter.recordAttempt('unlock', 'sgn-001');
      }

      expect(RateLimiter.getRemainingAttempts('unlock', 'sgn-001')).toBe(0);
    });

    it('returns 0 for empty action', () => {
      const remaining = RateLimiter.getRemainingAttempts('', 'sgn-001');
      expect(remaining).toBe(0);
    });

    it('returns 0 for null action', () => {
      const remaining = RateLimiter.getRemainingAttempts(null, 'sgn-001');
      expect(remaining).toBe(0);
    });

    it('returns 0 for empty signerId', () => {
      const remaining = RateLimiter.getRemainingAttempts('unlock', '');
      expect(remaining).toBe(0);
    });

    it('returns 0 for null signerId', () => {
      const remaining = RateLimiter.getRemainingAttempts('unlock', null);
      expect(remaining).toBe(0);
    });
  });

  describe('resetIfNewDay', () => {
    it('resets counters when the stored date is in the past', () => {
      // Record some attempts
      RateLimiter.recordAttempt('unlock', 'sgn-001');
      RateLimiter.recordAttempt('unlock', 'sgn-001');
      expect(RateLimiter.getAttemptCount('unlock', 'sgn-001')).toBe(2);

      // Manually set the resetDate to yesterday in localStorage
      const store = JSON.parse(localStorage.getItem('sig_rate_limits') || '{}');
      const key = 'unlock:sgn-001';

      if (store[key]) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        store[key].resetDate = yesterday.toISOString();
        localStorage.setItem('sig_rate_limits', JSON.stringify(store));
      }

      const result = RateLimiter.resetIfNewDay();
      expect(result).toBe(true);

      // After reset, the count should be 0
      expect(RateLimiter.getAttemptCount('unlock', 'sgn-001')).toBe(0);
    });

    it('does not reset counters when the stored date is today', () => {
      RateLimiter.recordAttempt('unlock', 'sgn-001');
      RateLimiter.recordAttempt('unlock', 'sgn-001');
      expect(RateLimiter.getAttemptCount('unlock', 'sgn-001')).toBe(2);

      const result = RateLimiter.resetIfNewDay();
      // Should not reset since the date is today
      expect(result).toBe(false);

      expect(RateLimiter.getAttemptCount('unlock', 'sgn-001')).toBe(2);
    });

    it('returns false when no rate limit records exist', () => {
      const result = RateLimiter.resetIfNewDay();
      expect(result).toBe(false);
    });

    it('resets multiple keys when a new day has started', () => {
      RateLimiter.recordAttempt('unlock', 'sgn-001');
      RateLimiter.recordAttempt('resend', 'sgn-002');

      // Set both records to yesterday
      const store = JSON.parse(localStorage.getItem('sig_rate_limits') || '{}');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      for (const key of Object.keys(store)) {
        if (store[key] && typeof store[key] === 'object') {
          store[key].resetDate = yesterday.toISOString();
        }
      }
      localStorage.setItem('sig_rate_limits', JSON.stringify(store));

      const result = RateLimiter.resetIfNewDay();
      expect(result).toBe(true);

      expect(RateLimiter.getAttemptCount('unlock', 'sgn-001')).toBe(0);
      expect(RateLimiter.getAttemptCount('resend', 'sgn-002')).toBe(0);
    });

    it('checkLimit auto-resets counter when a new day has started', () => {
      const dailyLimit = RateLimiter.getDailyLimit();

      // Exhaust all attempts
      for (let i = 0; i < dailyLimit; i++) {
        RateLimiter.recordAttempt('unlock', 'sgn-001');
      }

      expect(RateLimiter.checkLimit('unlock', 'sgn-001')).toBe(false);

      // Manually set the resetDate to yesterday
      const store = JSON.parse(localStorage.getItem('sig_rate_limits') || '{}');
      const key = 'unlock:sgn-001';

      if (store[key]) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        store[key].resetDate = yesterday.toISOString();
        localStorage.setItem('sig_rate_limits', JSON.stringify(store));
      }

      // checkLimit should auto-reset and allow again
      expect(RateLimiter.checkLimit('unlock', 'sgn-001')).toBe(true);
    });

    it('recordAttempt auto-resets counter when a new day has started', () => {
      const dailyLimit = RateLimiter.getDailyLimit();

      // Exhaust all attempts
      for (let i = 0; i < dailyLimit; i++) {
        RateLimiter.recordAttempt('resend', 'sgn-001');
      }

      expect(RateLimiter.getAttemptCount('resend', 'sgn-001')).toBe(dailyLimit);

      // Manually set the resetDate to yesterday
      const store = JSON.parse(localStorage.getItem('sig_rate_limits') || '{}');
      const key = 'resend:sgn-001';

      if (store[key]) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        store[key].resetDate = yesterday.toISOString();
        localStorage.setItem('sig_rate_limits', JSON.stringify(store));
      }

      // recordAttempt should auto-reset and start fresh
      const result = RateLimiter.recordAttempt('resend', 'sgn-001');
      expect(result.status).toBe('success');
      expect(result.count).toBe(1);
    });
  });

  describe('getMessage', () => {
    it('returns correct unlock attempt message for attempt 1', () => {
      const message = RateLimiter.getMessage('unlock', 1);
      expect(message).toBe(UNLOCK_ATTEMPT_MESSAGES[1]);
    });

    it('returns correct unlock attempt message for attempt 2', () => {
      const message = RateLimiter.getMessage('unlock', 2);
      expect(message).toBe(UNLOCK_ATTEMPT_MESSAGES[2]);
    });

    it('returns correct unlock attempt message for attempt 3', () => {
      const message = RateLimiter.getMessage('unlock', 3);
      expect(message).toBe(UNLOCK_ATTEMPT_MESSAGES[3]);
    });

    it('returns unlock limit reached message when exceeding daily limit', () => {
      const dailyLimit = RateLimiter.getDailyLimit();
      const message = RateLimiter.getMessage('unlock', dailyLimit + 1);
      expect(message).toBe(UNLOCK_LIMIT_REACHED_MESSAGE);
    });

    it('returns correct resend attempt message for attempt 1', () => {
      const message = RateLimiter.getMessage('resend', 1);
      expect(message).toBe(RESEND_ATTEMPT_MESSAGES[1]);
    });

    it('returns correct resend attempt message for attempt 2', () => {
      const message = RateLimiter.getMessage('resend', 2);
      expect(message).toBe(RESEND_ATTEMPT_MESSAGES[2]);
    });

    it('returns correct resend attempt message for attempt 3', () => {
      const message = RateLimiter.getMessage('resend', 3);
      expect(message).toBe(RESEND_ATTEMPT_MESSAGES[3]);
    });

    it('returns resend limit reached message when exceeding daily limit', () => {
      const dailyLimit = RateLimiter.getDailyLimit();
      const message = RateLimiter.getMessage('resend', dailyLimit + 1);
      expect(message).toBe(RESEND_LIMIT_REACHED_MESSAGE);
    });

    it('returns empty string for empty action', () => {
      const message = RateLimiter.getMessage('', 1);
      expect(message).toBe('');
    });

    it('returns empty string for null action', () => {
      const message = RateLimiter.getMessage(null, 1);
      expect(message).toBe('');
    });

    it('returns empty string for unknown action with attempt within limit', () => {
      const message = RateLimiter.getMessage('unknown_action', 1);
      expect(message).toBe('');
    });

    it('returns generic limit message for unknown action exceeding limit', () => {
      const dailyLimit = RateLimiter.getDailyLimit();
      const message = RateLimiter.getMessage('unknown_action', dailyLimit + 1);
      expect(message).toContain('Too many requests');
    });

    it('returns empty string for attempt number 0', () => {
      const message = RateLimiter.getMessage('unlock', 0);
      expect(message).toBe('');
    });

    it('returns correct message when attempt number is not a number', () => {
      const message = RateLimiter.getMessage('unlock', undefined);
      expect(message).toBe('');
    });
  });

  describe('getDailyLimit', () => {
    it('returns a positive number', () => {
      const limit = RateLimiter.getDailyLimit();
      expect(typeof limit).toBe('number');
      expect(limit).toBeGreaterThan(0);
    });

    it('returns 3 as the default daily limit', () => {
      const limit = RateLimiter.getDailyLimit();
      expect(limit).toBe(3);
    });
  });

  describe('clearAllLimits', () => {
    it('clears all rate limit records', () => {
      RateLimiter.recordAttempt('unlock', 'sgn-001');
      RateLimiter.recordAttempt('resend', 'sgn-002');
      RateLimiter.recordAttempt('unlock', 'sgn-003');

      expect(RateLimiter.getAttemptCount('unlock', 'sgn-001')).toBe(1);
      expect(RateLimiter.getAttemptCount('resend', 'sgn-002')).toBe(1);
      expect(RateLimiter.getAttemptCount('unlock', 'sgn-003')).toBe(1);

      const result = RateLimiter.clearAllLimits();
      expect(result).toBe(true);

      expect(RateLimiter.getAttemptCount('unlock', 'sgn-001')).toBe(0);
      expect(RateLimiter.getAttemptCount('resend', 'sgn-002')).toBe(0);
      expect(RateLimiter.getAttemptCount('unlock', 'sgn-003')).toBe(0);
    });

    it('returns true even when no records exist', () => {
      const result = RateLimiter.clearAllLimits();
      expect(result).toBe(true);
    });

    it('allows new attempts after clearing', () => {
      const dailyLimit = RateLimiter.getDailyLimit();

      // Exhaust all attempts
      for (let i = 0; i < dailyLimit; i++) {
        RateLimiter.recordAttempt('unlock', 'sgn-001');
      }

      expect(RateLimiter.checkLimit('unlock', 'sgn-001')).toBe(false);

      RateLimiter.clearAllLimits();

      expect(RateLimiter.checkLimit('unlock', 'sgn-001')).toBe(true);
      expect(RateLimiter.getRemainingAttempts('unlock', 'sgn-001')).toBe(dailyLimit);
    });
  });

  describe('integration: recordAttempt returns correct messages in sequence', () => {
    it('returns escalating unlock messages for sequential attempts', () => {
      const result1 = RateLimiter.recordAttempt('unlock', 'sgn-msg-001');
      expect(result1.status).toBe('success');
      expect(result1.message).toBe(UNLOCK_ATTEMPT_MESSAGES[1]);
      expect(result1.count).toBe(1);

      const result2 = RateLimiter.recordAttempt('unlock', 'sgn-msg-001');
      expect(result2.status).toBe('success');
      expect(result2.message).toBe(UNLOCK_ATTEMPT_MESSAGES[2]);
      expect(result2.count).toBe(2);

      const result3 = RateLimiter.recordAttempt('unlock', 'sgn-msg-001');
      expect(result3.status).toBe('success');
      expect(result3.message).toBe(UNLOCK_ATTEMPT_MESSAGES[3]);
      expect(result3.count).toBe(3);

      // Fourth attempt should be blocked
      const result4 = RateLimiter.recordAttempt('unlock', 'sgn-msg-001');
      expect(result4.status).toBe('error');
      expect(result4.message).toBe(UNLOCK_LIMIT_REACHED_MESSAGE);
    });

    it('returns escalating resend messages for sequential attempts', () => {
      const result1 = RateLimiter.recordAttempt('resend', 'sgn-msg-002');
      expect(result1.status).toBe('success');
      expect(result1.message).toBe(RESEND_ATTEMPT_MESSAGES[1]);
      expect(result1.count).toBe(1);

      const result2 = RateLimiter.recordAttempt('resend', 'sgn-msg-002');
      expect(result2.status).toBe('success');
      expect(result2.message).toBe(RESEND_ATTEMPT_MESSAGES[2]);
      expect(result2.count).toBe(2);

      const result3 = RateLimiter.recordAttempt('resend', 'sgn-msg-002');
      expect(result3.status).toBe('success');
      expect(result3.message).toBe(RESEND_ATTEMPT_MESSAGES[3]);
      expect(result3.count).toBe(3);

      // Fourth attempt should be blocked
      const result4 = RateLimiter.recordAttempt('resend', 'sgn-msg-002');
      expect(result4.status).toBe('error');
      expect(result4.message).toBe(RESEND_LIMIT_REACHED_MESSAGE);
    });
  });

  describe('audit logging integration', () => {
    it('logs rate limit exceeded events', () => {
      const dailyLimit = RateLimiter.getDailyLimit();

      for (let i = 0; i < dailyLimit; i++) {
        RateLimiter.recordAttempt('unlock', 'sgn-audit-001');
      }

      // This attempt should trigger the rate limit exceeded log
      RateLimiter.recordAttempt('unlock', 'sgn-audit-001');

      const auditLogs = JSON.parse(localStorage.getItem('sig_audit_log') || '[]');
      const rateLimitLogs = auditLogs.filter(
        (log) => log.action === 'RATE_LIMIT_EXCEEDED',
      );

      expect(rateLimitLogs.length).toBeGreaterThan(0);
    });

    it('logs rate limit attempt events', () => {
      RateLimiter.recordAttempt('unlock', 'sgn-audit-002');

      const auditLogs = JSON.parse(localStorage.getItem('sig_audit_log') || '[]');
      const attemptLogs = auditLogs.filter(
        (log) => log.action === 'RATE_LIMIT_ATTEMPT',
      );

      expect(attemptLogs.length).toBeGreaterThan(0);
    });

    it('logs rate limits cleared events', () => {
      RateLimiter.recordAttempt('unlock', 'sgn-audit-003');
      RateLimiter.clearAllLimits();

      const auditLogs = JSON.parse(localStorage.getItem('sig_audit_log') || '[]');
      const clearedLogs = auditLogs.filter(
        (log) => log.action === 'RATE_LIMITS_CLEARED',
      );

      expect(clearedLogs.length).toBeGreaterThan(0);
    });
  });
});