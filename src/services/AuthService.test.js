import { describe, it, expect, beforeEach } from 'vitest';
import AuthService from './AuthService.js';

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('initialize', () => {
    it('initializes successfully and returns true', () => {
      const result = AuthService.initialize();
      expect(result).toBe(true);
    });

    it('loads mock users into localStorage on initialization', () => {
      AuthService.initialize();
      const users = JSON.parse(localStorage.getItem('sig_users'));
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
    });
  });

  describe('signUp', () => {
    it('creates a new user with valid credentials', () => {
      AuthService.initialize();

      const result = AuthService.signUp({
        username: 'newuser',
        password: 'NewUser@1234',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        role: 'teller',
      });

      expect(result.status).toBe('success');
      expect(result.message).toBe('Account created successfully.');
      expect(result.userId).toBeDefined();
      expect(typeof result.userId).toBe('string');
      expect(result.userId.length).toBeGreaterThan(0);
      expect(result.sessionToken).toBeDefined();
      expect(typeof result.sessionToken).toBe('string');
    });

    it('returns error when username is empty', () => {
      AuthService.initialize();

      const result = AuthService.signUp({
        username: '',
        password: 'SomePass@1234',
      });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Username is required.');
    });

    it('returns error when password is empty', () => {
      AuthService.initialize();

      const result = AuthService.signUp({
        username: 'validuser',
        password: '',
      });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Password is required.');
    });

    it('returns error when password is too short', () => {
      AuthService.initialize();

      const result = AuthService.signUp({
        username: 'validuser',
        password: 'short',
      });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Password must be at least 8 characters long.');
    });

    it('returns error when username already exists', () => {
      AuthService.initialize();

      const result = AuthService.signUp({
        username: 'admin',
        password: 'SomePass@1234',
      });

      expect(result.status).toBe('error');
      expect(result.message).toBe('An account with this username already exists.');
    });

    it('creates a session after successful sign up', () => {
      AuthService.initialize();

      const result = AuthService.signUp({
        username: 'sessionuser',
        password: 'Session@1234',
      });

      expect(result.status).toBe('success');
      expect(result.sessionToken).toBeDefined();

      const isAuth = AuthService.isAuthenticated();
      expect(isAuth).toBe(true);
    });

    it('persists the new user to localStorage', () => {
      AuthService.initialize();

      AuthService.signUp({
        username: 'persisteduser',
        password: 'Persisted@1234',
        firstName: 'Persisted',
        lastName: 'User',
      });

      const users = JSON.parse(localStorage.getItem('sig_users'));
      const found = users.find((u) => u.username === 'persisteduser');
      expect(found).toBeDefined();
      expect(found.firstName).toBe('Persisted');
      expect(found.lastName).toBe('User');
      expect(found.isLocked).toBe(false);
      expect(found.failedLoginAttempts).toBe(0);
    });
  });

  describe('login', () => {
    it('returns success with valid credentials', () => {
      AuthService.initialize();

      const result = AuthService.login({
        username: 'admin',
        password: 'Admin@1234',
      });

      expect(result.status).toBe('success');
      expect(result.message).toBe('You have successfully logged in.');
      expect(result.userId).toBeDefined();
      expect(result.sessionToken).toBeDefined();
      expect(result.lockout).toBeUndefined();
    });

    it('creates a valid session after successful login', () => {
      AuthService.initialize();

      AuthService.login({
        username: 'admin',
        password: 'Admin@1234',
      });

      const isAuth = AuthService.isAuthenticated();
      expect(isAuth).toBe(true);

      const currentUser = AuthService.getCurrentUser();
      expect(currentUser).not.toBeNull();
      expect(currentUser.username).toBe('admin');
    });

    it('returns generic error with invalid password without revealing which field is wrong', () => {
      AuthService.initialize();

      const result = AuthService.login({
        username: 'admin',
        password: 'WrongPassword123',
      });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Invalid username or password. Please try again.');
      expect(result.lockout).toBe(false);
      // Ensure the message does not hint at which field is incorrect
      expect(result.message).not.toContain('username');
      expect(result.message).not.toContain('password');
      expect(result.message.toLowerCase()).not.toContain('not found');
    });

    it('returns generic error with non-existent username without revealing which field is wrong', () => {
      AuthService.initialize();

      const result = AuthService.login({
        username: 'nonexistentuser',
        password: 'SomePassword@123',
      });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Invalid username or password. Please try again.');
      expect(result.lockout).toBe(false);
      expect(result.message).not.toContain('username');
      expect(result.message.toLowerCase()).not.toContain('not found');
    });

    it('returns error when username is empty', () => {
      AuthService.initialize();

      const result = AuthService.login({
        username: '',
        password: 'SomePassword@123',
      });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Invalid username or password. Please try again.');
    });

    it('returns error when password is empty', () => {
      AuthService.initialize();

      const result = AuthService.login({
        username: 'admin',
        password: '',
      });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Invalid username or password. Please try again.');
    });

    it('returns lockout error for already locked account', () => {
      AuthService.initialize();

      const result = AuthService.login({
        username: 'locked_user',
        password: 'Locked@1234',
      });

      expect(result.status).toBe('error');
      expect(result.lockout).toBe(true);
      expect(result.message).toContain('locked');
    });

    it('resets failed attempts on successful login', () => {
      AuthService.initialize();

      // Fail once
      AuthService.login({
        username: 'teller',
        password: 'WrongPassword',
      });

      const failedBefore = AuthService.getFailedAttempts('teller');
      expect(failedBefore).toBeGreaterThan(0);

      // Succeed
      AuthService.login({
        username: 'teller',
        password: 'Teller@1234',
      });

      const failedAfter = AuthService.getFailedAttempts('teller');
      expect(failedAfter).toBe(0);
    });
  });

  describe('failed attempt tracking', () => {
    it('increments failed login counter on each failed attempt', () => {
      AuthService.initialize();

      const initialCount = AuthService.getFailedAttempts('manager');
      expect(initialCount).toBe(0);

      AuthService.login({
        username: 'manager',
        password: 'WrongPassword1',
      });

      const afterFirst = AuthService.getFailedAttempts('manager');
      expect(afterFirst).toBe(1);

      AuthService.login({
        username: 'manager',
        password: 'WrongPassword2',
      });

      const afterSecond = AuthService.getFailedAttempts('manager');
      expect(afterSecond).toBe(2);

      AuthService.login({
        username: 'manager',
        password: 'WrongPassword3',
      });

      const afterThird = AuthService.getFailedAttempts('manager');
      expect(afterThird).toBe(3);
    });

    it('returns 0 for non-existent username', () => {
      AuthService.initialize();

      const count = AuthService.getFailedAttempts('doesnotexist');
      expect(count).toBe(0);
    });

    it('returns 0 for empty or null username', () => {
      expect(AuthService.getFailedAttempts('')).toBe(0);
      expect(AuthService.getFailedAttempts(null)).toBe(0);
      expect(AuthService.getFailedAttempts(undefined)).toBe(0);
    });
  });

  describe('lockout after threshold', () => {
    it('locks account after reaching maximum failed login attempts', () => {
      AuthService.initialize();

      // Use readonly user which starts with 0 failed attempts
      const username = 'readonly';
      const maxAttempts = 5; // MAX_FAILED_LOGINS default

      for (let i = 0; i < maxAttempts - 1; i++) {
        const result = AuthService.login({
          username,
          password: 'WrongPassword',
        });

        expect(result.status).toBe('error');
        expect(result.lockout).toBe(false);
      }

      // The final attempt that triggers lockout
      const lockoutResult = AuthService.login({
        username,
        password: 'WrongPassword',
      });

      expect(lockoutResult.status).toBe('error');
      expect(lockoutResult.lockout).toBe(true);
      expect(lockoutResult.message).toContain('locked');
    });

    it('prevents login even with correct password after lockout', () => {
      AuthService.initialize();

      const username = 'readonly';
      const maxAttempts = 5;

      // Exhaust all attempts
      for (let i = 0; i < maxAttempts; i++) {
        AuthService.login({
          username,
          password: 'WrongPassword',
        });
      }

      // Try with correct password
      const result = AuthService.login({
        username,
        password: 'ReadOnly@1234',
      });

      expect(result.status).toBe('error');
      expect(result.lockout).toBe(true);
      expect(result.message).toContain('locked');
    });

    it('isAccountLocked returns true for locked account', () => {
      AuthService.initialize();

      expect(AuthService.isAccountLocked('locked_user')).toBe(true);
    });

    it('isAccountLocked returns false for unlocked account', () => {
      AuthService.initialize();

      expect(AuthService.isAccountLocked('admin')).toBe(false);
    });

    it('isAccountLocked returns false for non-existent username', () => {
      AuthService.initialize();

      expect(AuthService.isAccountLocked('nonexistent')).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears session on logout', () => {
      AuthService.initialize();

      AuthService.login({
        username: 'admin',
        password: 'Admin@1234',
      });

      expect(AuthService.isAuthenticated()).toBe(true);

      const result = AuthService.logout();

      expect(result.status).toBe('success');
      expect(result.message).toBe('You have been successfully logged out.');
      expect(AuthService.isAuthenticated()).toBe(false);
    });

    it('returns success even when no session exists', () => {
      AuthService.initialize();

      const result = AuthService.logout();

      expect(result.status).toBe('success');
      expect(result.message).toBe('You have been successfully logged out.');
    });

    it('getCurrentUser returns null after logout', () => {
      AuthService.initialize();

      AuthService.login({
        username: 'admin',
        password: 'Admin@1234',
      });

      expect(AuthService.getCurrentUser()).not.toBeNull();

      AuthService.logout();

      expect(AuthService.getCurrentUser()).toBeNull();
    });

    it('getSession returns null after logout', () => {
      AuthService.initialize();

      AuthService.login({
        username: 'admin',
        password: 'Admin@1234',
      });

      expect(AuthService.getSession()).not.toBeNull();

      AuthService.logout();

      expect(AuthService.getSession()).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('returns false when no session exists', () => {
      AuthService.initialize();

      expect(AuthService.isAuthenticated()).toBe(false);
    });

    it('returns true after successful login', () => {
      AuthService.initialize();

      AuthService.login({
        username: 'admin',
        password: 'Admin@1234',
      });

      expect(AuthService.isAuthenticated()).toBe(true);
    });

    it('returns false after logout', () => {
      AuthService.initialize();

      AuthService.login({
        username: 'admin',
        password: 'Admin@1234',
      });

      AuthService.logout();

      expect(AuthService.isAuthenticated()).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('returns null when not authenticated', () => {
      AuthService.initialize();

      expect(AuthService.getCurrentUser()).toBeNull();
    });

    it('returns user object without passwordHash after login', () => {
      AuthService.initialize();

      AuthService.login({
        username: 'admin',
        password: 'Admin@1234',
      });

      const user = AuthService.getCurrentUser();

      expect(user).not.toBeNull();
      expect(user.username).toBe('admin');
      expect(user.firstName).toBe('Alice');
      expect(user.lastName).toBe('Anderson');
      expect(user.role).toBe('admin');
      expect(user.passwordHash).toBeUndefined();
    });
  });

  describe('refreshSession', () => {
    it('returns true when session exists and is refreshed', () => {
      AuthService.initialize();

      AuthService.login({
        username: 'admin',
        password: 'Admin@1234',
      });

      const result = AuthService.refreshSession();
      expect(result).toBe(true);
    });

    it('returns false when no session exists', () => {
      AuthService.initialize();

      const result = AuthService.refreshSession();
      expect(result).toBe(false);
    });
  });

  describe('resetFailedAttempts', () => {
    it('resets failed attempts and unlocks the account', () => {
      AuthService.initialize();

      // Lock the readonly account
      for (let i = 0; i < 5; i++) {
        AuthService.login({
          username: 'readonly',
          password: 'WrongPassword',
        });
      }

      expect(AuthService.isAccountLocked('readonly')).toBe(true);
      expect(AuthService.getFailedAttempts('readonly')).toBe(5);

      const result = AuthService.resetFailedAttempts('readonly');
      expect(result).toBe(true);

      expect(AuthService.isAccountLocked('readonly')).toBe(false);
      expect(AuthService.getFailedAttempts('readonly')).toBe(0);
    });

    it('returns false for non-existent username', () => {
      AuthService.initialize();

      const result = AuthService.resetFailedAttempts('nonexistent');
      expect(result).toBe(false);
    });

    it('returns false for empty or null username', () => {
      expect(AuthService.resetFailedAttempts('')).toBe(false);
      expect(AuthService.resetFailedAttempts(null)).toBe(false);
    });

    it('allows login after resetting failed attempts on a locked account', () => {
      AuthService.initialize();

      // Lock the readonly account
      for (let i = 0; i < 5; i++) {
        AuthService.login({
          username: 'readonly',
          password: 'WrongPassword',
        });
      }

      expect(AuthService.isAccountLocked('readonly')).toBe(true);

      AuthService.resetFailedAttempts('readonly');

      const result = AuthService.login({
        username: 'readonly',
        password: 'ReadOnly@1234',
      });

      expect(result.status).toBe('success');
      expect(result.lockout).toBeUndefined();
    });
  });
});