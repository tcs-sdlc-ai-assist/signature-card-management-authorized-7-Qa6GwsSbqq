import { describe, it, expect, beforeEach } from 'vitest';
import AuditLogger from './AuditLogger.js';

describe('AuditLogger', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('logEvent', () => {
    it('creates an entry with correct structure', () => {
      const entry = AuditLogger.logEvent('LOGIN', { userId: 'usr-001' });

      expect(entry).not.toBeNull();
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('userId');
      expect(entry).toHaveProperty('action', 'LOGIN');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('details');
      expect(typeof entry.id).toBe('string');
      expect(entry.id.length).toBeGreaterThan(0);
    });

    it('includes the correct action in the entry', () => {
      const entry = AuditLogger.logEvent('CARD_CREATED', { cardId: 'card-001' });

      expect(entry).not.toBeNull();
      expect(entry.action).toBe('CARD_CREATED');
    });

    it('includes a valid ISO timestamp in the entry', () => {
      const before = new Date().toISOString();
      const entry = AuditLogger.logEvent('LOGOUT', {});
      const after = new Date().toISOString();

      expect(entry).not.toBeNull();
      expect(typeof entry.timestamp).toBe('string');

      const entryTime = new Date(entry.timestamp).getTime();
      expect(entryTime).toBeGreaterThanOrEqual(new Date(before).getTime());
      expect(entryTime).toBeLessThanOrEqual(new Date(after).getTime());
    });

    it('stores sanitized details in the entry', () => {
      const entry = AuditLogger.logEvent('ACCOUNT_SELECTED', {
        accountId: 'acct-1001',
        reason: 'User selected account',
      });

      expect(entry).not.toBeNull();
      expect(entry.details).toBeDefined();
      expect(entry.details.accountId).toBeDefined();
      expect(entry.details.reason).toBeDefined();
    });

    it('includes before and after states when provided', () => {
      const beforeState = { status: 'Active' };
      const afterState = { status: 'Pending' };

      const entry = AuditLogger.logEvent(
        'SIGNER_EDITED',
        { signerId: 'sgn-001' },
        beforeState,
        afterState,
      );

      expect(entry).not.toBeNull();
      expect(entry.before).toBeDefined();
      expect(entry.before.status).toBe('Active');
      expect(entry.after).toBeDefined();
      expect(entry.after.status).toBe('Pending');
    });

    it('sets userId to anonymous when no session exists', () => {
      const entry = AuditLogger.logEvent('TEST_ACTION', {});

      expect(entry).not.toBeNull();
      expect(entry.userId).toBe('anonymous');
    });

    it('returns null when action is empty or not a string', () => {
      const result1 = AuditLogger.logEvent('', {});
      const result2 = AuditLogger.logEvent(null, {});
      const result3 = AuditLogger.logEvent(undefined, {});

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
    });

    it('generates unique IDs for each entry', () => {
      const entry1 = AuditLogger.logEvent('ACTION_ONE', {});
      const entry2 = AuditLogger.logEvent('ACTION_TWO', {});

      expect(entry1).not.toBeNull();
      expect(entry2).not.toBeNull();
      expect(entry1.id).not.toBe(entry2.id);
    });
  });

  describe('getLogs', () => {
    it('retrieves all logged entries', () => {
      AuditLogger.logEvent('ACTION_A', { info: 'first' });
      AuditLogger.logEvent('ACTION_B', { info: 'second' });
      AuditLogger.logEvent('ACTION_C', { info: 'third' });

      const logs = AuditLogger.getLogs();

      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBe(3);
      expect(logs[0].action).toBe('ACTION_A');
      expect(logs[1].action).toBe('ACTION_B');
      expect(logs[2].action).toBe('ACTION_C');
    });

    it('returns an empty array when no entries exist', () => {
      const logs = AuditLogger.getLogs();

      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBe(0);
    });

    it('returns entries in chronological order', () => {
      AuditLogger.logEvent('FIRST', {});
      AuditLogger.logEvent('SECOND', {});

      const logs = AuditLogger.getLogs();

      expect(logs.length).toBe(2);
      const time1 = new Date(logs[0].timestamp).getTime();
      const time2 = new Date(logs[1].timestamp).getTime();
      expect(time1).toBeLessThanOrEqual(time2);
    });
  });

  describe('PII masking', () => {
    it('masks password fields in log details', () => {
      const entry = AuditLogger.logEvent('LOGIN_ATTEMPT', {
        username: 'testuser',
        password: 'SuperSecret123!',
      });

      expect(entry).not.toBeNull();
      expect(entry.details.password).not.toBe('SuperSecret123!');
      expect(entry.details.password).toContain('*');
    });

    it('masks email fields in log details', () => {
      const entry = AuditLogger.logEvent('USER_UPDATE', {
        userId: 'usr-001',
        email: 'alice@example.com',
      });

      expect(entry).not.toBeNull();
      expect(entry.details.email).not.toBe('alice@example.com');
      expect(entry.details.email).toContain('*');
    });

    it('masks SSN fields in log details', () => {
      const entry = AuditLogger.logEvent('SIGNER_ADDED', {
        signerId: 'sgn-001',
        ssn: '123-45-6789',
      });

      expect(entry).not.toBeNull();
      expect(entry.details.ssn).not.toBe('123-45-6789');
      expect(entry.details.ssn).toContain('*');
    });

    it('masks phone fields in log details', () => {
      const entry = AuditLogger.logEvent('CONTACT_UPDATE', {
        phone: '(555) 123-4567',
      });

      expect(entry).not.toBeNull();
      expect(entry.details.phone).not.toBe('(555) 123-4567');
      expect(entry.details.phone).toContain('*');
    });

    it('masks token fields in log details', () => {
      const entry = AuditLogger.logEvent('TOKEN_VALIDATED', {
        token: 'esign-valid-token-abc123',
      });

      expect(entry).not.toBeNull();
      expect(entry.details.token).not.toBe('esign-valid-token-abc123');
      expect(entry.details.token).toContain('*');
    });

    it('masks accountNumber fields in log details', () => {
      const entry = AuditLogger.logEvent('ACCOUNT_ACCESSED', {
        accountNumber: '1234567890',
      });

      expect(entry).not.toBeNull();
      expect(entry.details.accountNumber).not.toBe('1234567890');
      expect(entry.details.accountNumber).toContain('*');
    });

    it('masks address objects in log details', () => {
      const entry = AuditLogger.logEvent('SIGNER_ADDED', {
        address: {
          street: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zip: '62701',
        },
      });

      expect(entry).not.toBeNull();
      expect(entry.details.address).toBe('[REDACTED]');
    });

    it('masks PII in before/after states', () => {
      const beforeState = { email: 'old@example.com', phone: '555-111-2222' };
      const afterState = { email: 'new@example.com', phone: '555-333-4444' };

      const entry = AuditLogger.logEvent(
        'SIGNER_EDITED',
        { signerId: 'sgn-001' },
        beforeState,
        afterState,
      );

      expect(entry).not.toBeNull();
      expect(entry.before.email).not.toBe('old@example.com');
      expect(entry.before.email).toContain('*');
      expect(entry.after.email).not.toBe('new@example.com');
      expect(entry.after.email).toContain('*');
      expect(entry.before.phone).not.toBe('555-111-2222');
      expect(entry.after.phone).not.toBe('555-333-4444');
    });

    it('does not mask non-PII fields', () => {
      const entry = AuditLogger.logEvent('ACCOUNT_SELECTED', {
        accountId: 'acct-1001',
        action: 'select',
      });

      expect(entry).not.toBeNull();
      expect(entry.details.accountId).toBe('acct-1001');
      expect(entry.details.action).toBe('select');
    });
  });

  describe('clearLogs', () => {
    it('removes all entries from the audit log', () => {
      AuditLogger.logEvent('ACTION_1', {});
      AuditLogger.logEvent('ACTION_2', {});
      AuditLogger.logEvent('ACTION_3', {});

      let logs = AuditLogger.getLogs();
      expect(logs.length).toBe(3);

      const result = AuditLogger.clearLogs();
      expect(result).toBe(true);

      logs = AuditLogger.getLogs();
      expect(logs.length).toBe(0);
    });

    it('returns true even when no entries exist', () => {
      const result = AuditLogger.clearLogs();
      expect(result).toBe(true);

      const logs = AuditLogger.getLogs();
      expect(logs.length).toBe(0);
    });
  });

  describe('getLogsByAction', () => {
    it('filters entries by action type', () => {
      AuditLogger.logEvent('LOGIN', { userId: 'usr-001' });
      AuditLogger.logEvent('LOGOUT', { userId: 'usr-001' });
      AuditLogger.logEvent('LOGIN', { userId: 'usr-002' });
      AuditLogger.logEvent('CARD_CREATED', { cardId: 'card-001' });

      const loginLogs = AuditLogger.getLogsByAction('LOGIN');

      expect(Array.isArray(loginLogs)).toBe(true);
      expect(loginLogs.length).toBe(2);
      expect(loginLogs.every((log) => log.action === 'LOGIN')).toBe(true);
    });

    it('returns an empty array for non-existent action type', () => {
      AuditLogger.logEvent('LOGIN', {});

      const logs = AuditLogger.getLogsByAction('NON_EXISTENT_ACTION');

      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBe(0);
    });

    it('returns an empty array when action is empty or invalid', () => {
      const result1 = AuditLogger.getLogsByAction('');
      const result2 = AuditLogger.getLogsByAction(null);

      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });
  });

  describe('getLogsByUserId', () => {
    it('returns an empty array when userId is empty or invalid', () => {
      const result1 = AuditLogger.getLogsByUserId('');
      const result2 = AuditLogger.getLogsByUserId(null);

      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });

    it('filters entries by anonymous userId when no session exists', () => {
      AuditLogger.logEvent('ACTION_A', {});
      AuditLogger.logEvent('ACTION_B', {});

      const logs = AuditLogger.getLogsByUserId('anonymous');

      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBe(2);
      expect(logs.every((log) => log.userId === 'anonymous')).toBe(true);
    });
  });
});