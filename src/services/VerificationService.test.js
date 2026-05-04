import { describe, it, expect, beforeEach } from 'vitest';
import VerificationService from './VerificationService.js';

describe('VerificationService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('verifyKBA', () => {
    it('returns success with correct answers for a known signer', () => {
      const signerId = 'sgn-2005';

      const questions = VerificationService.getKBAQuestions(signerId);
      expect(questions.length).toBeGreaterThan(0);

      // Build correct answers using the mock data answers
      // The mock KBA questions for sgn-2005 have known answers:
      // q001: 'Maple Street', q002: 'Honda', q003: 'Chicago'
      const answers = [
        { questionId: 'kba-q001', answer: 'Maple Street' },
        { questionId: 'kba-q002', answer: 'Honda' },
        { questionId: 'kba-q003', answer: 'Chicago' },
      ];

      const result = VerificationService.verifyKBA({ signerId, answers });

      expect(result.status).toBe('success');
      expect(result.verificationStatus).toBe('verified');
      expect(result.message).toContain('verified');
    });

    it('returns failure with incorrect answers', () => {
      const signerId = 'sgn-2005';

      const answers = [
        { questionId: 'kba-q001', answer: 'Wrong Street' },
        { questionId: 'kba-q002', answer: 'Wrong Car' },
        { questionId: 'kba-q003', answer: 'Wrong City' },
      ];

      const result = VerificationService.verifyKBA({ signerId, answers });

      expect(result.status).toBe('error');
      expect(result.verificationStatus).toBe('failed');
      expect(result.attemptsLeft).toBeDefined();
      expect(typeof result.attemptsLeft).toBe('number');
    });

    it('returns failure when some answers are missing', () => {
      const signerId = 'sgn-2005';

      const answers = [
        { questionId: 'kba-q001', answer: 'Maple Street' },
        // Missing q002 and q003
      ];

      const result = VerificationService.verifyKBA({ signerId, answers });

      expect(result.status).toBe('error');
      expect(result.verificationStatus).toBe('failed');
    });

    it('returns error when signerId is empty', () => {
      const result = VerificationService.verifyKBA({ signerId: '', answers: [] });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Signer ID is required.');
      expect(result.verificationStatus).toBe('failed');
    });

    it('returns error when signerId is null', () => {
      const result = VerificationService.verifyKBA({ signerId: null, answers: [] });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Signer ID is required.');
    });

    it('returns error when answers array is empty', () => {
      const result = VerificationService.verifyKBA({ signerId: 'sgn-2005', answers: [] });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Answers are required.');
      expect(result.verificationStatus).toBe('failed');
    });

    it('returns error when answers is not provided', () => {
      const result = VerificationService.verifyKBA({ signerId: 'sgn-2005', answers: null });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Answers are required.');
    });

    it('is case-insensitive when comparing answers', () => {
      const signerId = 'sgn-2005';

      const answers = [
        { questionId: 'kba-q001', answer: 'maple street' },
        { questionId: 'kba-q002', answer: 'honda' },
        { questionId: 'kba-q003', answer: 'chicago' },
      ];

      const result = VerificationService.verifyKBA({ signerId, answers });

      expect(result.status).toBe('success');
      expect(result.verificationStatus).toBe('verified');
    });

    it('returns already verified when signer was previously verified', () => {
      const signerId = 'sgn-2005';

      const correctAnswers = [
        { questionId: 'kba-q001', answer: 'Maple Street' },
        { questionId: 'kba-q002', answer: 'Honda' },
        { questionId: 'kba-q003', answer: 'Chicago' },
      ];

      // First verification
      const firstResult = VerificationService.verifyKBA({ signerId, answers: correctAnswers });
      expect(firstResult.status).toBe('success');

      // Second verification attempt
      const secondResult = VerificationService.verifyKBA({ signerId, answers: correctAnswers });
      expect(secondResult.status).toBe('success');
      expect(secondResult.verificationStatus).toBe('verified');
      expect(secondResult.message).toContain('already been verified');
    });

    it('locks out after maximum failed KBA attempts', () => {
      const signerId = 'sgn-2005';
      const maxAttempts = VerificationService.getMaxAttempts();

      const wrongAnswers = [
        { questionId: 'kba-q001', answer: 'Wrong' },
        { questionId: 'kba-q002', answer: 'Wrong' },
        { questionId: 'kba-q003', answer: 'Wrong' },
      ];

      // Exhaust all attempts
      for (let i = 0; i < maxAttempts - 1; i++) {
        const result = VerificationService.verifyKBA({ signerId, answers: wrongAnswers });
        expect(result.status).toBe('error');
        expect(result.verificationStatus).toBe('failed');
        expect(result.attemptsLeft).toBe(maxAttempts - (i + 1));
      }

      // Final attempt that triggers lockout
      const lockoutResult = VerificationService.verifyKBA({ signerId, answers: wrongAnswers });
      expect(lockoutResult.status).toBe('error');
      expect(lockoutResult.verificationStatus).toBe('locked');
      expect(lockoutResult.attemptsLeft).toBe(0);
      expect(lockoutResult.message).toContain('locked');
    });

    it('prevents verification after lockout even with correct answers', () => {
      const signerId = 'sgn-2005';
      const maxAttempts = VerificationService.getMaxAttempts();

      const wrongAnswers = [
        { questionId: 'kba-q001', answer: 'Wrong' },
        { questionId: 'kba-q002', answer: 'Wrong' },
        { questionId: 'kba-q003', answer: 'Wrong' },
      ];

      // Exhaust all attempts to trigger lockout
      for (let i = 0; i < maxAttempts; i++) {
        VerificationService.verifyKBA({ signerId, answers: wrongAnswers });
      }

      // Try with correct answers after lockout
      const correctAnswers = [
        { questionId: 'kba-q001', answer: 'Maple Street' },
        { questionId: 'kba-q002', answer: 'Honda' },
        { questionId: 'kba-q003', answer: 'Chicago' },
      ];

      const result = VerificationService.verifyKBA({ signerId, answers: correctAnswers });
      expect(result.status).toBe('error');
      expect(result.verificationStatus).toBe('locked');
      expect(result.attemptsLeft).toBe(0);
    });

    it('uses default questions for unknown signer IDs', () => {
      const signerId = 'unknown-signer-id';

      const questions = VerificationService.getKBAQuestions(signerId);
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);
    });
  });

  describe('verifyOTP', () => {
    it('returns success with correct OTP code for a known user', () => {
      const entityId = 'usr-001-admin';

      // Mock OTP code for usr-001-admin is '123456'
      const result = VerificationService.verifyOTP({ entityId, code: '123456' });

      expect(result.status).toBe('success');
      expect(result.verificationStatus).toBe('verified');
      expect(result.message).toContain('verified');
    });

    it('returns failure with incorrect OTP code', () => {
      const entityId = 'usr-001-admin';

      const result = VerificationService.verifyOTP({ entityId, code: '000000' });

      expect(result.status).toBe('error');
      expect(result.verificationStatus).toBe('failed');
      expect(result.attemptsLeft).toBeDefined();
      expect(typeof result.attemptsLeft).toBe('number');
    });

    it('returns error when entityId is empty', () => {
      const result = VerificationService.verifyOTP({ entityId: '', code: '123456' });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Entity ID is required.');
      expect(result.verificationStatus).toBe('failed');
    });

    it('returns error when entityId is null', () => {
      const result = VerificationService.verifyOTP({ entityId: null, code: '123456' });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Entity ID is required.');
    });

    it('returns error when code is empty', () => {
      const result = VerificationService.verifyOTP({ entityId: 'usr-001-admin', code: '' });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Verification code is required.');
      expect(result.verificationStatus).toBe('failed');
    });

    it('returns error when code is null', () => {
      const result = VerificationService.verifyOTP({ entityId: 'usr-001-admin', code: null });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Verification code is required.');
    });

    it('returns error when no OTP record exists for the entity', () => {
      const result = VerificationService.verifyOTP({ entityId: 'nonexistent-entity', code: '123456' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('No verification code found');
      expect(result.verificationStatus).toBe('failed');
    });

    it('returns already verified when entity was previously verified via OTP', () => {
      const entityId = 'usr-001-admin';

      // First verification
      const firstResult = VerificationService.verifyOTP({ entityId, code: '123456' });
      expect(firstResult.status).toBe('success');

      // Second verification attempt
      const secondResult = VerificationService.verifyOTP({ entityId, code: '123456' });
      expect(secondResult.status).toBe('success');
      expect(secondResult.verificationStatus).toBe('verified');
      expect(secondResult.message).toContain('already been verified');
    });

    it('locks out after maximum failed OTP attempts', () => {
      const entityId = 'usr-002-manager';
      const maxAttempts = VerificationService.getMaxAttempts();

      // Exhaust all attempts with wrong code
      for (let i = 0; i < maxAttempts - 1; i++) {
        const result = VerificationService.verifyOTP({ entityId, code: '000000' });
        expect(result.status).toBe('error');
        expect(result.verificationStatus).toBe('failed');
        expect(result.attemptsLeft).toBe(maxAttempts - (i + 1));
      }

      // Final attempt that triggers lockout
      const lockoutResult = VerificationService.verifyOTP({ entityId, code: '000000' });
      expect(lockoutResult.status).toBe('error');
      expect(lockoutResult.verificationStatus).toBe('locked');
      expect(lockoutResult.attemptsLeft).toBe(0);
      expect(lockoutResult.message).toContain('locked');
    });

    it('prevents verification after lockout even with correct code', () => {
      const entityId = 'usr-002-manager';
      const maxAttempts = VerificationService.getMaxAttempts();

      // Exhaust all attempts to trigger lockout
      for (let i = 0; i < maxAttempts; i++) {
        VerificationService.verifyOTP({ entityId, code: '000000' });
      }

      // Try with correct code after lockout (mock code for usr-002-manager is '234567')
      const result = VerificationService.verifyOTP({ entityId, code: '234567' });
      expect(result.status).toBe('error');
      expect(result.verificationStatus).toBe('locked');
      expect(result.attemptsLeft).toBe(0);
    });

    it('returns expired status for expired OTP codes', () => {
      // usr-005-locked has an expired OTP in mock data
      const entityId = 'usr-005-locked';

      const result = VerificationService.verifyOTP({ entityId, code: '567890' });

      expect(result.status).toBe('error');
      expect(result.verificationStatus).toBe('expired');
      expect(result.message).toContain('expired');
    });

    it('verifies OTP for signer entities', () => {
      const entityId = 'sgn-2005';

      // Mock OTP code for sgn-2005 is '654321'
      const result = VerificationService.verifyOTP({ entityId, code: '654321' });

      expect(result.status).toBe('success');
      expect(result.verificationStatus).toBe('verified');
    });
  });

  describe('attempt tracking', () => {
    it('tracks failed KBA attempts correctly', () => {
      const signerId = 'sgn-2008';

      const wrongAnswers = [
        { questionId: 'kba-q004', answer: 'Wrong' },
        { questionId: 'kba-q005', answer: 'Wrong' },
        { questionId: 'kba-q006', answer: 'Wrong' },
      ];

      expect(VerificationService.getAttemptCount(signerId)).toBe(0);

      VerificationService.verifyKBA({ signerId, answers: wrongAnswers });
      expect(VerificationService.getAttemptCount(signerId)).toBe(1);

      VerificationService.verifyKBA({ signerId, answers: wrongAnswers });
      expect(VerificationService.getAttemptCount(signerId)).toBe(2);
    });

    it('tracks failed OTP attempts correctly', () => {
      const entityId = 'usr-001-admin';

      expect(VerificationService.getAttemptCount(entityId)).toBe(0);

      VerificationService.verifyOTP({ entityId, code: '000000' });
      expect(VerificationService.getAttemptCount(entityId)).toBe(1);

      VerificationService.verifyOTP({ entityId, code: '111111' });
      expect(VerificationService.getAttemptCount(entityId)).toBe(2);
    });

    it('does not increment attempt count on successful verification', () => {
      const entityId = 'usr-001-admin';

      expect(VerificationService.getAttemptCount(entityId)).toBe(0);

      VerificationService.verifyOTP({ entityId, code: '123456' });

      // Successful verification should not increment totalFailedAttempts
      expect(VerificationService.getAttemptCount(entityId)).toBe(0);
    });

    it('trackAttempt records a manual attempt entry', () => {
      const entityId = 'test-entity-001';

      const attempt = VerificationService.trackAttempt(entityId, 'KBA', 'failure');

      expect(attempt).not.toBeNull();
      expect(attempt.method).toBe('KBA');
      expect(attempt.outcome).toBe('failure');
      expect(attempt.timestamp).toBeDefined();
      expect(attempt.id).toBeDefined();
    });

    it('trackAttempt returns null for invalid entityId', () => {
      const result = VerificationService.trackAttempt('', 'KBA', 'failure');
      expect(result).toBeNull();
    });

    it('trackAttempt returns null for invalid method', () => {
      const result = VerificationService.trackAttempt('test-entity', '', 'failure');
      expect(result).toBeNull();
    });

    it('trackAttempt returns null for invalid outcome', () => {
      const result = VerificationService.trackAttempt('test-entity', 'KBA', '');
      expect(result).toBeNull();
    });

    it('getAttempts returns all attempts for an entity', () => {
      const entityId = 'test-entity-002';

      VerificationService.trackAttempt(entityId, 'KBA', 'failure');
      VerificationService.trackAttempt(entityId, 'OTP', 'failure');
      VerificationService.trackAttempt(entityId, 'KBA', 'success');

      const attempts = VerificationService.getAttempts(entityId);

      expect(Array.isArray(attempts)).toBe(true);
      expect(attempts.length).toBe(3);
      expect(attempts[0].method).toBe('KBA');
      expect(attempts[0].outcome).toBe('failure');
      expect(attempts[1].method).toBe('OTP');
      expect(attempts[2].outcome).toBe('success');
    });

    it('getAttempts returns empty array for unknown entity', () => {
      const attempts = VerificationService.getAttempts('nonexistent-entity');
      expect(Array.isArray(attempts)).toBe(true);
      expect(attempts.length).toBe(0);
    });

    it('getAttempts returns empty array for empty entityId', () => {
      const attempts = VerificationService.getAttempts('');
      expect(Array.isArray(attempts)).toBe(true);
      expect(attempts.length).toBe(0);
    });

    it('getAttempts returns empty array for null entityId', () => {
      const attempts = VerificationService.getAttempts(null);
      expect(Array.isArray(attempts)).toBe(true);
      expect(attempts.length).toBe(0);
    });
  });

  describe('lockout', () => {
    it('isLocked returns false for entity with no attempts', () => {
      expect(VerificationService.isLocked('fresh-entity')).toBe(false);
    });

    it('isLocked returns true after maximum failed attempts via KBA', () => {
      const signerId = 'sgn-2008';
      const maxAttempts = VerificationService.getMaxAttempts();

      const wrongAnswers = [
        { questionId: 'kba-q004', answer: 'Wrong' },
        { questionId: 'kba-q005', answer: 'Wrong' },
        { questionId: 'kba-q006', answer: 'Wrong' },
      ];

      for (let i = 0; i < maxAttempts; i++) {
        VerificationService.verifyKBA({ signerId, answers: wrongAnswers });
      }

      expect(VerificationService.isLocked(signerId)).toBe(true);
    });

    it('isLocked returns true after maximum failed attempts via OTP', () => {
      const entityId = 'usr-002-manager';
      const maxAttempts = VerificationService.getMaxAttempts();

      for (let i = 0; i < maxAttempts; i++) {
        VerificationService.verifyOTP({ entityId, code: '000000' });
      }

      expect(VerificationService.isLocked(entityId)).toBe(true);
    });

    it('isLocked returns false for empty entityId', () => {
      expect(VerificationService.isLocked('')).toBe(false);
    });

    it('isLocked returns false for null entityId', () => {
      expect(VerificationService.isLocked(null)).toBe(false);
    });

    it('trackAttempt triggers lockout after max failures', () => {
      const entityId = 'track-lockout-entity';
      const maxAttempts = VerificationService.getMaxAttempts();

      for (let i = 0; i < maxAttempts; i++) {
        VerificationService.trackAttempt(entityId, 'KBA', 'failure');
      }

      expect(VerificationService.isLocked(entityId)).toBe(true);
    });
  });

  describe('getVerificationStatus', () => {
    it('returns pending for entity with no verification record', () => {
      const status = VerificationService.getVerificationStatus('new-entity');
      expect(status).toBe('pending');
    });

    it('returns verified after successful KBA verification', () => {
      const signerId = 'sgn-2005';

      const correctAnswers = [
        { questionId: 'kba-q001', answer: 'Maple Street' },
        { questionId: 'kba-q002', answer: 'Honda' },
        { questionId: 'kba-q003', answer: 'Chicago' },
      ];

      VerificationService.verifyKBA({ signerId, answers: correctAnswers });

      const status = VerificationService.getVerificationStatus(signerId);
      expect(status).toBe('verified');
    });

    it('returns verified after successful OTP verification', () => {
      const entityId = 'usr-001-admin';

      VerificationService.verifyOTP({ entityId, code: '123456' });

      const status = VerificationService.getVerificationStatus(entityId);
      expect(status).toBe('verified');
    });

    it('returns locked after too many failed attempts', () => {
      const entityId = 'usr-002-manager';
      const maxAttempts = VerificationService.getMaxAttempts();

      for (let i = 0; i < maxAttempts; i++) {
        VerificationService.verifyOTP({ entityId, code: '000000' });
      }

      const status = VerificationService.getVerificationStatus(entityId);
      expect(status).toBe('locked');
    });

    it('returns pending for empty entityId', () => {
      const status = VerificationService.getVerificationStatus('');
      expect(status).toBe('pending');
    });

    it('returns pending for null entityId', () => {
      const status = VerificationService.getVerificationStatus(null);
      expect(status).toBe('pending');
    });
  });

  describe('getKBAQuestions', () => {
    it('returns questions without answers for a known signer', () => {
      const questions = VerificationService.getKBAQuestions('sgn-2005');

      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);

      questions.forEach((q) => {
        expect(q.id).toBeDefined();
        expect(q.question).toBeDefined();
        expect(typeof q.question).toBe('string');
        expect(q.options).toBeDefined();
        expect(Array.isArray(q.options)).toBe(true);
        // Should NOT include the answer
        expect(q.answer).toBeUndefined();
      });
    });

    it('returns default questions for unknown signer', () => {
      const questions = VerificationService.getKBAQuestions('unknown-signer');

      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);
    });

    it('returns empty array for empty signerId', () => {
      const questions = VerificationService.getKBAQuestions('');
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBe(0);
    });

    it('returns empty array for null signerId', () => {
      const questions = VerificationService.getKBAQuestions(null);
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBe(0);
    });
  });

  describe('requestNewOTP', () => {
    it('returns success when requesting a new OTP', () => {
      const entityId = 'usr-001-admin';

      const result = VerificationService.requestNewOTP(entityId);

      expect(result.status).toBe('success');
      expect(result.message).toContain('new verification code');
      expect(typeof result.resendAttemptsRemaining).toBe('number');
    });

    it('returns error when entityId is empty', () => {
      const result = VerificationService.requestNewOTP('');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Entity ID is required.');
    });

    it('returns error when entityId is null', () => {
      const result = VerificationService.requestNewOTP(null);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Entity ID is required.');
    });

    it('returns error when entity is locked', () => {
      const entityId = 'usr-002-manager';
      const maxAttempts = VerificationService.getMaxAttempts();

      // Lock the entity
      for (let i = 0; i < maxAttempts; i++) {
        VerificationService.verifyOTP({ entityId, code: '000000' });
      }

      const result = VerificationService.requestNewOTP(entityId);

      expect(result.status).toBe('error');
      expect(result.message).toContain('locked');
    });

    it('returns error when entity is already verified', () => {
      const entityId = 'usr-001-admin';

      // Verify first
      VerificationService.verifyOTP({ entityId, code: '123456' });

      const result = VerificationService.requestNewOTP(entityId);

      expect(result.status).toBe('error');
      expect(result.message).toContain('already been verified');
    });

    it('enforces maximum resend attempts', () => {
      const entityId = 'resend-test-entity';
      const maxResend = VerificationService.getMaxResendAttempts();

      for (let i = 0; i < maxResend; i++) {
        const result = VerificationService.requestNewOTP(entityId);
        expect(result.status).toBe('success');
      }

      // Exceeding the limit
      const result = VerificationService.requestNewOTP(entityId);
      expect(result.status).toBe('error');
      expect(result.message).toContain('maximum number of resend attempts');
    });

    it('decrements remaining resend attempts', () => {
      const entityId = 'resend-decrement-entity';
      const maxResend = VerificationService.getMaxResendAttempts();

      const firstResult = VerificationService.requestNewOTP(entityId);
      expect(firstResult.resendAttemptsRemaining).toBe(maxResend - 1);

      const secondResult = VerificationService.requestNewOTP(entityId);
      expect(secondResult.resendAttemptsRemaining).toBe(maxResend - 2);
    });
  });

  describe('resetVerification', () => {
    it('resets verification record for an entity', () => {
      const entityId = 'usr-001-admin';

      // Verify first
      VerificationService.verifyOTP({ entityId, code: '123456' });
      expect(VerificationService.getVerificationStatus(entityId)).toBe('verified');

      // Reset
      const result = VerificationService.resetVerification(entityId);
      expect(result).toBe(true);

      expect(VerificationService.getVerificationStatus(entityId)).toBe('pending');
      expect(VerificationService.getAttemptCount(entityId)).toBe(0);
      expect(VerificationService.isLocked(entityId)).toBe(false);
    });

    it('returns false for empty entityId', () => {
      const result = VerificationService.resetVerification('');
      expect(result).toBe(false);
    });

    it('returns false for null entityId', () => {
      const result = VerificationService.resetVerification(null);
      expect(result).toBe(false);
    });
  });

  describe('getVerificationRecord', () => {
    it('returns a default record for unknown entity', () => {
      const record = VerificationService.getVerificationRecord('unknown-entity');

      expect(record).toBeDefined();
      expect(record.status).toBe('pending');
      expect(record.kbaAttempts).toBe(0);
      expect(record.otpAttempts).toBe(0);
      expect(record.isLocked).toBe(false);
      expect(Array.isArray(record.attempts)).toBe(true);
      expect(record.attempts.length).toBe(0);
    });

    it('returns a default record for empty entityId', () => {
      const record = VerificationService.getVerificationRecord('');

      expect(record).toBeDefined();
      expect(record.status).toBe('pending');
    });

    it('returns updated record after verification attempts', () => {
      const entityId = 'usr-001-admin';

      VerificationService.verifyOTP({ entityId, code: '000000' });

      const record = VerificationService.getVerificationRecord(entityId);

      expect(record.otpAttempts).toBe(1);
      expect(record.totalFailedAttempts).toBe(1);
      expect(record.attempts.length).toBe(1);
      expect(record.attempts[0].method).toBe('OTP');
      expect(record.attempts[0].outcome).toBe('failure');
    });
  });

  describe('clearAllVerificationRecords', () => {
    it('clears all verification records', () => {
      const entityId1 = 'usr-001-admin';
      const entityId2 = 'sgn-2005';

      // Create some records
      VerificationService.verifyOTP({ entityId: entityId1, code: '000000' });
      VerificationService.verifyKBA({
        signerId: entityId2,
        answers: [{ questionId: 'kba-q001', answer: 'Wrong' }],
      });

      expect(VerificationService.getAttemptCount(entityId1)).toBeGreaterThan(0);

      const result = VerificationService.clearAllVerificationRecords();
      expect(result).toBe(true);

      expect(VerificationService.getAttemptCount(entityId1)).toBe(0);
      expect(VerificationService.getVerificationStatus(entityId1)).toBe('pending');
      expect(VerificationService.getVerificationStatus(entityId2)).toBe('pending');
    });
  });

  describe('getMaxAttempts', () => {
    it('returns a positive number', () => {
      const max = VerificationService.getMaxAttempts();
      expect(typeof max).toBe('number');
      expect(max).toBeGreaterThan(0);
    });
  });

  describe('getMaxResendAttempts', () => {
    it('returns a positive number', () => {
      const max = VerificationService.getMaxResendAttempts();
      expect(typeof max).toBe('number');
      expect(max).toBeGreaterThan(0);
    });
  });

  describe('audit logging integration', () => {
    it('logs verification success events', () => {
      const signerId = 'sgn-2005';

      const correctAnswers = [
        { questionId: 'kba-q001', answer: 'Maple Street' },
        { questionId: 'kba-q002', answer: 'Honda' },
        { questionId: 'kba-q003', answer: 'Chicago' },
      ];

      VerificationService.verifyKBA({ signerId, answers: correctAnswers });

      // Check that audit log has entries
      const auditLogs = JSON.parse(localStorage.getItem('sig_audit_log') || '[]');
      const verificationLogs = auditLogs.filter(
        (log) => log.action === 'VERIFICATION_SUCCESS',
      );

      expect(verificationLogs.length).toBeGreaterThan(0);
    });

    it('logs verification failure events', () => {
      const signerId = 'sgn-2005';

      const wrongAnswers = [
        { questionId: 'kba-q001', answer: 'Wrong' },
        { questionId: 'kba-q002', answer: 'Wrong' },
        { questionId: 'kba-q003', answer: 'Wrong' },
      ];

      VerificationService.verifyKBA({ signerId, answers: wrongAnswers });

      const auditLogs = JSON.parse(localStorage.getItem('sig_audit_log') || '[]');
      const failureLogs = auditLogs.filter(
        (log) => log.action === 'VERIFICATION_FAILED',
      );

      expect(failureLogs.length).toBeGreaterThan(0);
    });

    it('logs lockout events', () => {
      const entityId = 'usr-002-manager';
      const maxAttempts = VerificationService.getMaxAttempts();

      for (let i = 0; i < maxAttempts; i++) {
        VerificationService.verifyOTP({ entityId, code: '000000' });
      }

      const auditLogs = JSON.parse(localStorage.getItem('sig_audit_log') || '[]');
      const lockoutLogs = auditLogs.filter(
        (log) => log.action === 'VERIFICATION_LOCKED',
      );

      expect(lockoutLogs.length).toBeGreaterThan(0);
    });

    it('logs OTP resend events', () => {
      const entityId = 'otp-resend-audit-entity';

      VerificationService.requestNewOTP(entityId);

      const auditLogs = JSON.parse(localStorage.getItem('sig_audit_log') || '[]');
      const resendLogs = auditLogs.filter(
        (log) => log.action === 'OTP_RESEND',
      );

      expect(resendLogs.length).toBeGreaterThan(0);
    });
  });
});