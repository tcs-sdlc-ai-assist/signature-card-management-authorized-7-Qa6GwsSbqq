import { describe, it, expect, beforeEach } from 'vitest';
import TokenService from './TokenService.js';

describe('TokenService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('initialize', () => {
    it('initializes successfully and returns true', () => {
      const result = TokenService.initialize();
      expect(result).toBe(true);
    });

    it('loads mock tokens into localStorage on initialization', () => {
      TokenService.initialize();
      const tokens = JSON.parse(localStorage.getItem('sig_tokens'));
      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('does not overwrite existing tokens on re-initialization', () => {
      TokenService.initialize();
      const firstLoad = JSON.parse(localStorage.getItem('sig_tokens'));
      const originalLength = firstLoad.length;

      TokenService.initialize();
      const secondLoad = JSON.parse(localStorage.getItem('sig_tokens'));
      expect(secondLoad.length).toBe(originalLength);
    });
  });

  describe('validateToken', () => {
    it('returns success for a valid token', () => {
      TokenService.initialize();

      const result = TokenService.validateToken('esign-valid-token-abc123');

      expect(result.status).toBe('success');
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Token is valid.');
      expect(result.tokenDetails).toBeDefined();
      expect(result.tokenDetails.id).toBe('tkn-3001');
      expect(result.tokenDetails.signerId).toBeDefined();
      expect(result.tokenDetails.accountId).toBeDefined();
    });

    it('returns success for another valid token', () => {
      TokenService.initialize();

      const result = TokenService.validateToken('esign-valid-token-def456');

      expect(result.status).toBe('success');
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Token is valid.');
      expect(result.tokenDetails).toBeDefined();
      expect(result.tokenDetails.id).toBe('tkn-3002');
    });

    it('returns error for an expired token', () => {
      TokenService.initialize();

      const result = TokenService.validateToken('esign-expired-token-ghi789');

      expect(result.status).toBe('error');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('expired');
    });

    it('returns error for a used token', () => {
      TokenService.initialize();

      const result = TokenService.validateToken('esign-used-token-jkl012');

      expect(result.status).toBe('error');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('already been used');
    });

    it('returns error for an invalid token', () => {
      TokenService.initialize();

      const result = TokenService.validateToken('esign-invalid-token-mno345');

      expect(result.status).toBe('error');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('invalid');
    });

    it('returns error for a non-existent token', () => {
      TokenService.initialize();

      const result = TokenService.validateToken('non-existent-token-xyz');

      expect(result.status).toBe('error');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid token');
    });

    it('returns error when token is empty string', () => {
      TokenService.initialize();

      const result = TokenService.validateToken('');

      expect(result.status).toBe('error');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Token is required.');
    });

    it('returns error when token is null', () => {
      TokenService.initialize();

      const result = TokenService.validateToken(null);

      expect(result.status).toBe('error');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Token is required.');
    });

    it('returns error when token is undefined', () => {
      TokenService.initialize();

      const result = TokenService.validateToken(undefined);

      expect(result.status).toBe('error');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Token is required.');
    });

    it('returns tokenDetails with correct structure for valid token', () => {
      TokenService.initialize();

      const result = TokenService.validateToken('esign-valid-token-abc123');

      expect(result.status).toBe('success');
      expect(result.tokenDetails).toBeDefined();
      expect(result.tokenDetails).toHaveProperty('id');
      expect(result.tokenDetails).toHaveProperty('signerId');
      expect(result.tokenDetails).toHaveProperty('accountId');
      expect(result.tokenDetails).toHaveProperty('status');
      expect(result.tokenDetails).toHaveProperty('issuedAt');
      expect(result.tokenDetails).toHaveProperty('expiresAt');
    });

    it('does not return tokenDetails for invalid token', () => {
      TokenService.initialize();

      const result = TokenService.validateToken('non-existent-token');

      expect(result.status).toBe('error');
      expect(result.tokenDetails).toBeUndefined();
    });

    it('trims whitespace from token before validation', () => {
      TokenService.initialize();

      const result = TokenService.validateToken('  esign-valid-token-abc123  ');

      expect(result.status).toBe('success');
      expect(result.valid).toBe(true);
    });
  });

  describe('token-user association', () => {
    it('rejects token not associated with current user when session exists', () => {
      TokenService.initialize();

      // Create a session for a different user than the token's userId
      const session = {
        userId: 'usr-999-different',
        token: 'session-token-123',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      };
      localStorage.setItem('sig_sessions', JSON.stringify(session));

      // esign-valid-token-abc123 is associated with usr-001-admin
      const result = TokenService.validateToken('esign-valid-token-abc123');

      expect(result.status).toBe('error');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('not associated with your account');
    });

    it('accepts token associated with current user when session exists', () => {
      TokenService.initialize();

      // Create a session for the same user as the token's userId
      const session = {
        userId: 'usr-001-admin',
        token: 'session-token-123',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      };
      localStorage.setItem('sig_sessions', JSON.stringify(session));

      // esign-valid-token-abc123 is associated with usr-001-admin
      const result = TokenService.validateToken('esign-valid-token-abc123');

      expect(result.status).toBe('success');
      expect(result.valid).toBe(true);
    });

    it('accepts valid token when no session exists (anonymous validation)', () => {
      TokenService.initialize();

      // No session set — getCurrentUserId returns null
      const result = TokenService.validateToken('esign-valid-token-abc123');

      expect(result.status).toBe('success');
      expect(result.valid).toBe(true);
    });
  });

  describe('updateTokenStatus', () => {
    it('updates token status to confirmed', () => {
      TokenService.initialize();

      const result = TokenService.updateTokenStatus('esign-valid-token-abc123', 'confirmed');

      expect(result.status).toBe('success');
      expect(result.message).toBe('Token status updated successfully.');

      // Verify the token is now confirmed
      const details = TokenService.getTokenDetails('esign-valid-token-abc123');
      expect(details.tokenDetails.status).toBe('confirmed');
    });

    it('updates token status to used', () => {
      TokenService.initialize();

      const result = TokenService.updateTokenStatus('esign-valid-token-abc123', 'used');

      expect(result.status).toBe('success');

      const details = TokenService.getTokenDetails('esign-valid-token-abc123');
      expect(details.tokenDetails.status).toBe('used');
      expect(details.tokenDetails.usedAt).not.toBeNull();
    });

    it('updates token status to expired', () => {
      TokenService.initialize();

      const result = TokenService.updateTokenStatus('esign-valid-token-abc123', 'expired');

      expect(result.status).toBe('success');

      const details = TokenService.getTokenDetails('esign-valid-token-abc123');
      expect(details.tokenDetails.status).toBe('expired');
    });

    it('updates token status to invalid', () => {
      TokenService.initialize();

      const result = TokenService.updateTokenStatus('esign-valid-token-abc123', 'invalid');

      expect(result.status).toBe('success');

      const details = TokenService.getTokenDetails('esign-valid-token-abc123');
      expect(details.tokenDetails.status).toBe('invalid');
    });

    it('returns error for non-existent token', () => {
      TokenService.initialize();

      const result = TokenService.updateTokenStatus('non-existent-token', 'confirmed');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Token not found.');
    });

    it('returns error when token is empty', () => {
      TokenService.initialize();

      const result = TokenService.updateTokenStatus('', 'confirmed');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Token is required.');
    });

    it('returns error when token is null', () => {
      TokenService.initialize();

      const result = TokenService.updateTokenStatus(null, 'confirmed');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Token is required.');
    });

    it('returns error when new status is empty', () => {
      TokenService.initialize();

      const result = TokenService.updateTokenStatus('esign-valid-token-abc123', '');

      expect(result.status).toBe('error');
      expect(result.message).toBe('New status is required.');
    });

    it('returns error when new status is null', () => {
      TokenService.initialize();

      const result = TokenService.updateTokenStatus('esign-valid-token-abc123', null);

      expect(result.status).toBe('error');
      expect(result.message).toBe('New status is required.');
    });

    it('returns error for invalid status value', () => {
      TokenService.initialize();

      const result = TokenService.updateTokenStatus('esign-valid-token-abc123', 'bogus_status');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Invalid token status.');
    });

    it('sets usedAt timestamp when marking as confirmed', () => {
      TokenService.initialize();

      TokenService.updateTokenStatus('esign-valid-token-abc123', 'confirmed');

      const details = TokenService.getTokenDetails('esign-valid-token-abc123');
      expect(details.tokenDetails.usedAt).not.toBeNull();
      expect(typeof details.tokenDetails.usedAt).toBe('string');
    });

    it('sets usedAt timestamp when marking as used', () => {
      TokenService.initialize();

      TokenService.updateTokenStatus('esign-valid-token-def456', 'used');

      const details = TokenService.getTokenDetails('esign-valid-token-def456');
      expect(details.tokenDetails.usedAt).not.toBeNull();
    });

    it('does not set usedAt when marking as expired', () => {
      TokenService.initialize();

      TokenService.updateTokenStatus('esign-valid-token-abc123', 'expired');

      const details = TokenService.getTokenDetails('esign-valid-token-abc123');
      // usedAt should remain null since it was not used or confirmed
      expect(details.tokenDetails.usedAt).toBeNull();
    });
  });

  describe('token status after validation', () => {
    it('validated token can be confirmed after successful validation', () => {
      TokenService.initialize();

      const validationResult = TokenService.validateToken('esign-valid-token-abc123');
      expect(validationResult.status).toBe('success');
      expect(validationResult.valid).toBe(true);

      const updateResult = TokenService.updateTokenStatus('esign-valid-token-abc123', 'confirmed');
      expect(updateResult.status).toBe('success');

      // Token should now be confirmed and reject re-validation
      const revalidateResult = TokenService.validateToken('esign-valid-token-abc123');
      expect(revalidateResult.status).toBe('error');
      expect(revalidateResult.valid).toBe(false);
      expect(revalidateResult.message).toContain('already been confirmed');
    });

    it('confirmed token cannot be validated again', () => {
      TokenService.initialize();

      TokenService.updateTokenStatus('esign-valid-token-abc123', 'confirmed');

      const result = TokenService.validateToken('esign-valid-token-abc123');

      expect(result.status).toBe('error');
      expect(result.valid).toBe(false);
    });

    it('used token cannot be validated again', () => {
      TokenService.initialize();

      TokenService.updateTokenStatus('esign-valid-token-abc123', 'used');

      const result = TokenService.validateToken('esign-valid-token-abc123');

      expect(result.status).toBe('error');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('already been used');
    });

    it('invalidated token cannot be validated', () => {
      TokenService.initialize();

      TokenService.updateTokenStatus('esign-valid-token-abc123', 'invalid');

      const result = TokenService.validateToken('esign-valid-token-abc123');

      expect(result.status).toBe('error');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('invalid');
    });
  });

  describe('getTokenDetails', () => {
    it('returns token details for a valid token string', () => {
      TokenService.initialize();

      const result = TokenService.getTokenDetails('esign-valid-token-abc123');

      expect(result.status).toBe('success');
      expect(result.tokenDetails).toBeDefined();
      expect(result.tokenDetails.id).toBe('tkn-3001');
      expect(result.tokenDetails.userId).toBeDefined();
      expect(result.tokenDetails.signerId).toBeDefined();
      expect(result.tokenDetails.accountId).toBeDefined();
      expect(result.tokenDetails.status).toBeDefined();
      expect(result.tokenDetails.issuedAt).toBeDefined();
      expect(result.tokenDetails.expiresAt).toBeDefined();
      expect(result.tokenDetails).toHaveProperty('usedAt');
      expect(result.tokenDetails).toHaveProperty('createdAt');
    });

    it('returns error for non-existent token', () => {
      TokenService.initialize();

      const result = TokenService.getTokenDetails('non-existent-token');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Token not found.');
      expect(result.tokenDetails).toBeNull();
    });

    it('returns error when token is empty', () => {
      TokenService.initialize();

      const result = TokenService.getTokenDetails('');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Token is required.');
      expect(result.tokenDetails).toBeNull();
    });

    it('returns error when token is null', () => {
      TokenService.initialize();

      const result = TokenService.getTokenDetails(null);

      expect(result.status).toBe('error');
      expect(result.tokenDetails).toBeNull();
    });

    it('auto-updates expired status for tokens that have passed their expiresAt', () => {
      TokenService.initialize();

      // Manually set a token's expiresAt to the past while keeping status as valid
      const tokens = JSON.parse(localStorage.getItem('sig_tokens'));
      const tokenIndex = tokens.findIndex((t) => t.token === 'esign-valid-token-abc123');
      if (tokenIndex !== -1) {
        tokens[tokenIndex].expiresAt = new Date(Date.now() - 1000 * 60 * 60).toISOString();
        tokens[tokenIndex].status = 'valid';
        localStorage.setItem('sig_tokens', JSON.stringify(tokens));
      }

      const result = TokenService.getTokenDetails('esign-valid-token-abc123');

      expect(result.status).toBe('success');
      expect(result.tokenDetails.status).toBe('expired');
    });
  });

  describe('getTokenById', () => {
    it('returns token details by token ID', () => {
      TokenService.initialize();

      const result = TokenService.getTokenById('tkn-3001');

      expect(result.status).toBe('success');
      expect(result.tokenDetails).toBeDefined();
      expect(result.tokenDetails.id).toBe('tkn-3001');
      expect(result.tokenDetails.signerId).toBeDefined();
      expect(result.tokenDetails.accountId).toBeDefined();
    });

    it('returns error for non-existent token ID', () => {
      TokenService.initialize();

      const result = TokenService.getTokenById('tkn-nonexistent');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Token not found.');
      expect(result.tokenDetails).toBeNull();
    });

    it('returns error when token ID is empty', () => {
      TokenService.initialize();

      const result = TokenService.getTokenById('');

      expect(result.status).toBe('error');
      expect(result.message).toBe('Token ID is required.');
      expect(result.tokenDetails).toBeNull();
    });

    it('returns error when token ID is null', () => {
      TokenService.initialize();

      const result = TokenService.getTokenById(null);

      expect(result.status).toBe('error');
      expect(result.tokenDetails).toBeNull();
    });

    it('auto-updates expired status for tokens that have passed their expiresAt', () => {
      TokenService.initialize();

      // The expired token tkn-3003 should already have expired status
      const result = TokenService.getTokenById('tkn-3003');

      expect(result.status).toBe('success');
      expect(result.tokenDetails.status).toBe('expired');
    });
  });

  describe('getTokensByUserId', () => {
    it('returns tokens for a known user ID', () => {
      TokenService.initialize();

      const tokens = TokenService.getTokensByUserId('usr-001-admin');

      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBeGreaterThan(0);

      tokens.forEach((token) => {
        expect(token).toHaveProperty('id');
        expect(token).toHaveProperty('signerId');
        expect(token).toHaveProperty('accountId');
        expect(token).toHaveProperty('status');
        expect(token).toHaveProperty('issuedAt');
        expect(token).toHaveProperty('expiresAt');
      });
    });

    it('returns empty array for user with no tokens', () => {
      TokenService.initialize();

      const tokens = TokenService.getTokensByUserId('usr-004-readonly');

      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBe(0);
    });

    it('returns empty array for empty userId', () => {
      TokenService.initialize();

      const tokens = TokenService.getTokensByUserId('');

      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBe(0);
    });

    it('returns empty array for null userId', () => {
      const tokens = TokenService.getTokensByUserId(null);

      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBe(0);
    });

    it('returns multiple tokens for user with multiple tokens', () => {
      TokenService.initialize();

      // usr-001-admin has tokens tkn-3001 and tkn-3004
      const tokens = TokenService.getTokensByUserId('usr-001-admin');

      expect(tokens.length).toBe(2);
    });
  });

  describe('getTokensBySignerId', () => {
    it('returns tokens for a known signer ID', () => {
      TokenService.initialize();

      const tokens = TokenService.getTokensBySignerId('sgn-2001');

      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBeGreaterThan(0);

      tokens.forEach((token) => {
        expect(token).toHaveProperty('id');
        expect(token).toHaveProperty('userId');
        expect(token).toHaveProperty('accountId');
        expect(token).toHaveProperty('status');
      });
    });

    it('returns empty array for signer with no tokens', () => {
      TokenService.initialize();

      const tokens = TokenService.getTokensBySignerId('sgn-9999');

      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBe(0);
    });

    it('returns empty array for empty signerId', () => {
      const tokens = TokenService.getTokensBySignerId('');

      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBe(0);
    });

    it('returns empty array for null signerId', () => {
      const tokens = TokenService.getTokensBySignerId(null);

      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBe(0);
    });
  });

  describe('getTokenExpiryHours', () => {
    it('returns a positive number', () => {
      const hours = TokenService.getTokenExpiryHours();

      expect(typeof hours).toBe('number');
      expect(hours).toBeGreaterThan(0);
    });
  });

  describe('expiration calculation', () => {
    it('detects token as expired when expiresAt is in the past', () => {
      TokenService.initialize();

      // Modify a valid token to have an expiresAt in the past
      const tokens = JSON.parse(localStorage.getItem('sig_tokens'));
      const tokenIndex = tokens.findIndex((t) => t.token === 'esign-valid-token-abc123');
      if (tokenIndex !== -1) {
        tokens[tokenIndex].expiresAt = new Date(Date.now() - 1000).toISOString();
        tokens[tokenIndex].status = 'valid';
        localStorage.setItem('sig_tokens', JSON.stringify(tokens));
      }

      const result = TokenService.validateToken('esign-valid-token-abc123');

      expect(result.status).toBe('error');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('expired');
    });

    it('accepts token when expiresAt is in the future', () => {
      TokenService.initialize();

      // Ensure the valid token has a future expiresAt (it should by default from mock data)
      const result = TokenService.validateToken('esign-valid-token-abc123');

      expect(result.status).toBe('success');
      expect(result.valid).toBe(true);
    });

    it('detects token as expired based on issuedAt when expiresAt is missing', () => {
      TokenService.initialize();

      // Modify a token to remove expiresAt and set issuedAt far in the past
      const tokens = JSON.parse(localStorage.getItem('sig_tokens'));
      const tokenIndex = tokens.findIndex((t) => t.token === 'esign-valid-token-abc123');
      if (tokenIndex !== -1) {
        delete tokens[tokenIndex].expiresAt;
        // Set issuedAt to well beyond the TOKEN_EXPIRY_HOURS ago
        tokens[tokenIndex].issuedAt = new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 365,
        ).toISOString();
        tokens[tokenIndex].status = 'valid';
        localStorage.setItem('sig_tokens', JSON.stringify(tokens));
      }

      const result = TokenService.validateToken('esign-valid-token-abc123');

      expect(result.status).toBe('error');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('expired');
    });

    it('updates status to expired when validating an expired-by-time token', () => {
      TokenService.initialize();

      // Set token expiresAt to the past
      const tokens = JSON.parse(localStorage.getItem('sig_tokens'));
      const tokenIndex = tokens.findIndex((t) => t.token === 'esign-valid-token-abc123');
      if (tokenIndex !== -1) {
        tokens[tokenIndex].expiresAt = new Date(Date.now() - 1000 * 60).toISOString();
        tokens[tokenIndex].status = 'valid';
        localStorage.setItem('sig_tokens', JSON.stringify(tokens));
      }

      TokenService.validateToken('esign-valid-token-abc123');

      // Check that the status was updated in storage
      const updatedTokens = JSON.parse(localStorage.getItem('sig_tokens'));
      const updatedToken = updatedTokens.find((t) => t.token === 'esign-valid-token-abc123');
      expect(updatedToken.status).toBe('expired');
    });
  });

  describe('audit logging integration', () => {
    it('logs successful token validation events', () => {
      TokenService.initialize();

      TokenService.validateToken('esign-valid-token-abc123');

      const auditLogs = JSON.parse(localStorage.getItem('sig_audit_log') || '[]');
      const validationLogs = auditLogs.filter(
        (log) => log.action === 'TOKEN_VALIDATION_SUCCESS',
      );

      expect(validationLogs.length).toBeGreaterThan(0);
    });

    it('logs failed token validation events', () => {
      TokenService.initialize();

      TokenService.validateToken('non-existent-token');

      const auditLogs = JSON.parse(localStorage.getItem('sig_audit_log') || '[]');
      const failureLogs = auditLogs.filter(
        (log) => log.action === 'TOKEN_VALIDATION_FAILED',
      );

      expect(failureLogs.length).toBeGreaterThan(0);
    });

    it('logs token status update events', () => {
      TokenService.initialize();

      TokenService.updateTokenStatus('esign-valid-token-abc123', 'confirmed');

      const auditLogs = JSON.parse(localStorage.getItem('sig_audit_log') || '[]');
      const updateLogs = auditLogs.filter(
        (log) => log.action === 'TOKEN_STATUS_UPDATED',
      );

      expect(updateLogs.length).toBeGreaterThan(0);
    });

    it('logs token details access events', () => {
      TokenService.initialize();

      TokenService.getTokenDetails('esign-valid-token-abc123');

      const auditLogs = JSON.parse(localStorage.getItem('sig_audit_log') || '[]');
      const accessLogs = auditLogs.filter(
        (log) => log.action === 'TOKEN_DETAILS_ACCESSED',
      );

      expect(accessLogs.length).toBeGreaterThan(0);
    });
  });
});