import { STORAGE_KEYS, MAX_FAILED_LOGINS, SESSION_TIMEOUT_MS } from '../constants/constants.js';
import { getItem, setItem } from '../utils/storage.js';
import { generateUUID, isExpired } from '../utils/helpers.js';
import { sanitizeInput } from '../utils/helpers.js';
import AuditLogger from './AuditLogger.js';
import {
  MOCK_USERS,
  validateMockPassword,
  getMockUserByUsername,
} from '../constants/mockData.js';

/**
 * Simple hash function for passwords.
 * NOT cryptographically secure — for demo/development only.
 * Must match the hash function used in mockData.js.
 * @param {string} password - The plain text password to hash.
 * @returns {string} A base64-encoded hash of the password.
 */
const hashPassword = (password) => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return btoa(String(hash));
};

/**
 * Initializes the users store in localStorage with mock data if not already present.
 * @returns {Array<Object>} The current users array from localStorage.
 */
const initializeUsers = () => {
  try {
    const existingUsers = getItem(STORAGE_KEYS.USERS, null);

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return existingUsers;
    }

    const users = MOCK_USERS.map((user) => ({ ...user }));
    setItem(STORAGE_KEYS.USERS, users);
    return users;
  } catch (_error) {
    return [];
  }
};

/**
 * Retrieves all users from localStorage, initializing if necessary.
 * @returns {Array<Object>} The array of user objects.
 */
const getUsers = () => {
  try {
    const users = getItem(STORAGE_KEYS.USERS, null);

    if (Array.isArray(users) && users.length > 0) {
      return users;
    }

    return initializeUsers();
  } catch (_error) {
    return initializeUsers();
  }
};

/**
 * Persists the users array to localStorage.
 * @param {Array<Object>} users - The updated users array.
 * @returns {boolean} True if saved successfully.
 */
const saveUsers = (users) => {
  try {
    return setItem(STORAGE_KEYS.USERS, users);
  } catch (_error) {
    return false;
  }
};

/**
 * Finds a user by username from the users store.
 * @param {string} username - The username to search for.
 * @returns {Object|undefined} The matching user object or undefined.
 */
const findUserByUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return undefined;
  }

  const users = getUsers();
  const sanitized = username.trim().toLowerCase();
  return users.find((user) => user.username.toLowerCase() === sanitized);
};

/**
 * Finds a user by ID from the users store.
 * @param {string} userId - The user ID to search for.
 * @returns {Object|undefined} The matching user object or undefined.
 */
const findUserById = (userId) => {
  if (!userId || typeof userId !== 'string') {
    return undefined;
  }

  const users = getUsers();
  return users.find((user) => user.id === userId);
};

/**
 * Updates a user in the users store by ID.
 * @param {string} userId - The user ID to update.
 * @param {Object} updates - The fields to update on the user object.
 * @returns {boolean} True if the user was found and updated.
 */
const updateUser = (userId, updates) => {
  if (!userId || !updates || typeof updates !== 'object') {
    return false;
  }

  try {
    const users = getUsers();
    const index = users.findIndex((user) => user.id === userId);

    if (index === -1) {
      return false;
    }

    users[index] = {
      ...users[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return saveUsers(users);
  } catch (_error) {
    return false;
  }
};

/**
 * Retrieves the current session from localStorage.
 * @returns {Object|null} The session object or null if no session exists.
 */
const getSession = () => {
  try {
    const session = getItem(STORAGE_KEYS.SESSIONS, null);

    if (session && typeof session === 'object' && session.userId && session.token) {
      return session;
    }

    return null;
  } catch (_error) {
    return null;
  }
};

/**
 * Creates and persists a new session for the given user ID.
 * @param {string} userId - The user ID to create a session for.
 * @returns {Object|null} The created session object, or null on failure.
 */
const createSession = (userId) => {
  if (!userId || typeof userId !== 'string') {
    return null;
  }

  try {
    const session = {
      userId,
      token: generateUUID(),
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      expiresAt: new Date(Date.now() + SESSION_TIMEOUT_MS).toISOString(),
    };

    const success = setItem(STORAGE_KEYS.SESSIONS, session);

    if (success) {
      return session;
    }

    return null;
  } catch (_error) {
    return null;
  }
};

/**
 * Clears the current session from localStorage.
 * @returns {boolean} True if the session was cleared successfully.
 */
const clearSession = () => {
  try {
    return setItem(STORAGE_KEYS.SESSIONS, null);
  } catch (_error) {
    return false;
  }
};

/**
 * Retrieves failed login attempts for a given username from localStorage.
 * @param {string} username - The username to check.
 * @returns {Object} The failed login record with count and timestamps.
 */
const getFailedLoginRecord = (username) => {
  if (!username || typeof username !== 'string') {
    return { count: 0, lastAttempt: null, lockedAt: null };
  }

  try {
    const failedLogins = getItem(STORAGE_KEYS.FAILED_LOGINS, {});

    if (failedLogins && typeof failedLogins === 'object') {
      const key = username.trim().toLowerCase();
      return failedLogins[key] || { count: 0, lastAttempt: null, lockedAt: null };
    }

    return { count: 0, lastAttempt: null, lockedAt: null };
  } catch (_error) {
    return { count: 0, lastAttempt: null, lockedAt: null };
  }
};

/**
 * Updates the failed login record for a given username.
 * @param {string} username - The username to update.
 * @param {Object} record - The updated failed login record.
 * @returns {boolean} True if saved successfully.
 */
const setFailedLoginRecord = (username, record) => {
  if (!username || typeof username !== 'string') {
    return false;
  }

  try {
    const failedLogins = getItem(STORAGE_KEYS.FAILED_LOGINS, {}) || {};
    const key = username.trim().toLowerCase();
    failedLogins[key] = record;
    return setItem(STORAGE_KEYS.FAILED_LOGINS, failedLogins);
  } catch (_error) {
    return false;
  }
};

/**
 * Frontend-only authentication service for the SIG Card Management application.
 * Manages user sign-up, login with lockout enforcement, logout, and session validation.
 * All data is persisted in localStorage. Error messages are masked to avoid
 * revealing which field (username or password) is incorrect.
 *
 * @namespace AuthService
 */
const AuthService = {
  /**
   * Registers a new user in localStorage with a hashed password.
   *
   * @param {Object} params - The sign-up parameters.
   * @param {string} params.username - The desired username.
   * @param {string} params.password - The desired password.
   * @param {string} [params.firstName=''] - The user's first name.
   * @param {string} [params.lastName=''] - The user's last name.
   * @param {string} [params.email=''] - The user's email address.
   * @param {string} [params.role='teller'] - The user's role.
   * @returns {Object} Result object with status, message, and optionally userId and sessionToken.
   */
  signUp({ username, password, firstName = '', lastName = '', email = '', role = 'teller' }) {
    try {
      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        return {
          status: 'error',
          message: 'Username is required.',
        };
      }

      if (!password || typeof password !== 'string' || password.trim().length === 0) {
        return {
          status: 'error',
          message: 'Password is required.',
        };
      }

      if (password.length < 8) {
        return {
          status: 'error',
          message: 'Password must be at least 8 characters long.',
        };
      }

      const sanitizedUsername = sanitizeInput(username.trim());
      const existingUser = findUserByUsername(sanitizedUsername);

      if (existingUser) {
        return {
          status: 'error',
          message: 'An account with this username already exists.',
        };
      }

      const now = new Date().toISOString();
      const newUser = {
        id: generateUUID(),
        username: sanitizedUsername,
        passwordHash: hashPassword(password),
        firstName: sanitizeInput(firstName.trim()),
        lastName: sanitizeInput(lastName.trim()),
        email: sanitizeInput(email.trim()),
        role: role || 'teller',
        isLocked: false,
        failedLoginAttempts: 0,
        lastLogin: null,
        createdAt: now,
        updatedAt: now,
      };

      const users = getUsers();
      users.push(newUser);
      const saved = saveUsers(users);

      if (!saved) {
        return {
          status: 'error',
          message: 'Failed to create account. Please try again.',
        };
      }

      const session = createSession(newUser.id);

      if (!session) {
        return {
          status: 'error',
          message: 'Account created but failed to start session. Please log in.',
        };
      }

      AuditLogger.logEvent('SIGN_UP', {
        userId: newUser.id,
        username: sanitizedUsername,
      });

      AuditLogger.logEvent('LOGIN', {
        userId: newUser.id,
        username: sanitizedUsername,
      });

      return {
        status: 'success',
        message: 'Account created successfully.',
        userId: newUser.id,
        sessionToken: session.token,
      };
    } catch (_error) {
      return {
        status: 'error',
        message: 'An unexpected error occurred. Please try again.',
      };
    }
  },

  /**
   * Authenticates a user with username and password.
   * Tracks failed attempts and enforces account lockout after the configured threshold.
   * Error messages do not reveal which field (username or password) is incorrect.
   *
   * @param {Object} params - The login parameters.
   * @param {string} params.username - The username.
   * @param {string} params.password - The password.
   * @returns {Object} Result object with status, message, and optionally userId, sessionToken, lockout.
   */
  login({ username, password }) {
    try {
      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        return {
          status: 'error',
          message: 'Invalid username or password. Please try again.',
          lockout: false,
        };
      }

      if (!password || typeof password !== 'string' || password.trim().length === 0) {
        return {
          status: 'error',
          message: 'Invalid username or password. Please try again.',
          lockout: false,
        };
      }

      const sanitizedUsername = username.trim();

      // Initialize users if needed
      initializeUsers();

      const user = findUserByUsername(sanitizedUsername);

      if (!user) {
        AuditLogger.logEvent('LOGIN_FAILED', {
          username: sanitizeInput(sanitizedUsername),
          reason: 'User not found',
        });

        return {
          status: 'error',
          message: 'Invalid username or password. Please try again.',
          lockout: false,
        };
      }

      // Check if account is locked
      if (user.isLocked) {
        AuditLogger.logEvent('LOGIN_FAILED', {
          userId: user.id,
          username: sanitizeInput(sanitizedUsername),
          reason: 'Account locked',
        });

        return {
          status: 'error',
          message: 'Your account has been locked due to too many failed attempts. Please contact support.',
          lockout: true,
        };
      }

      // Validate password
      const passwordValid = hashPassword(password) === user.passwordHash;

      if (!passwordValid) {
        const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
        const shouldLock = newFailedAttempts >= MAX_FAILED_LOGINS;

        updateUser(user.id, {
          failedLoginAttempts: newFailedAttempts,
          isLocked: shouldLock,
        });

        // Also update the failed login record in separate storage
        const failedRecord = getFailedLoginRecord(sanitizedUsername);
        setFailedLoginRecord(sanitizedUsername, {
          count: newFailedAttempts,
          lastAttempt: new Date().toISOString(),
          lockedAt: shouldLock ? new Date().toISOString() : failedRecord.lockedAt,
        });

        if (shouldLock) {
          AuditLogger.logEvent('ACCOUNT_LOCKED', {
            userId: user.id,
            username: sanitizeInput(sanitizedUsername),
            failedAttempts: newFailedAttempts,
          });

          return {
            status: 'error',
            message: 'Your account has been locked due to too many failed attempts. Please contact support.',
            lockout: true,
          };
        }

        AuditLogger.logEvent('LOGIN_FAILED', {
          userId: user.id,
          username: sanitizeInput(sanitizedUsername),
          failedAttempts: newFailedAttempts,
        });

        return {
          status: 'error',
          message: 'Invalid username or password. Please try again.',
          lockout: false,
        };
      }

      // Successful login — reset failed attempts and create session
      updateUser(user.id, {
        failedLoginAttempts: 0,
        lastLogin: new Date().toISOString(),
      });

      // Reset failed login record
      setFailedLoginRecord(sanitizedUsername, {
        count: 0,
        lastAttempt: null,
        lockedAt: null,
      });

      const session = createSession(user.id);

      if (!session) {
        return {
          status: 'error',
          message: 'An unexpected error occurred. Please try again.',
          lockout: false,
        };
      }

      AuditLogger.logEvent('LOGIN', {
        userId: user.id,
        username: sanitizeInput(sanitizedUsername),
      });

      return {
        status: 'success',
        message: 'You have successfully logged in.',
        userId: user.id,
        sessionToken: session.token,
        expiresIn: SESSION_TIMEOUT_MS,
      };
    } catch (_error) {
      return {
        status: 'error',
        message: 'An unexpected error occurred. Please try again.',
        lockout: false,
      };
    }
  },

  /**
   * Logs out the current user by clearing the session.
   *
   * @returns {Object} Result object with status and message.
   */
  logout() {
    try {
      const session = getSession();

      if (session) {
        AuditLogger.logEvent('LOGOUT', {
          userId: session.userId,
        });
      }

      clearSession();

      return {
        status: 'success',
        message: 'You have been successfully logged out.',
      };
    } catch (_error) {
      clearSession();

      return {
        status: 'success',
        message: 'You have been successfully logged out.',
      };
    }
  },

  /**
   * Checks whether the current session is valid and not expired.
   *
   * @returns {boolean} True if the user has a valid, non-expired session.
   */
  isAuthenticated() {
    try {
      const session = getSession();

      if (!session) {
        return false;
      }

      if (!session.token || !session.userId) {
        return false;
      }

      // Check if session has expired based on last activity
      if (session.expiresAt && isExpired(session.expiresAt)) {
        this.logout();
        return false;
      }

      // Check if session has expired based on last activity + timeout
      if (session.lastActivity) {
        const lastActivity = new Date(session.lastActivity).getTime();
        const now = Date.now();

        if (now - lastActivity > SESSION_TIMEOUT_MS) {
          this.logout();
          return false;
        }
      }

      // Verify the user still exists
      const user = findUserById(session.userId);

      if (!user) {
        this.logout();
        return false;
      }

      return true;
    } catch (_error) {
      return false;
    }
  },

  /**
   * Retrieves the current session object if valid.
   *
   * @returns {Object|null} The current session object, or null if not authenticated.
   */
  getSession() {
    try {
      if (!this.isAuthenticated()) {
        return null;
      }

      return getSession();
    } catch (_error) {
      return null;
    }
  },

  /**
   * Retrieves the current authenticated user object.
   *
   * @returns {Object|null} The current user object (without passwordHash), or null.
   */
  getCurrentUser() {
    try {
      const session = this.getSession();

      if (!session) {
        return null;
      }

      const user = findUserById(session.userId);

      if (!user) {
        return null;
      }

      // Return user without sensitive fields
      const { passwordHash, ...safeUser } = user;
      return safeUser;
    } catch (_error) {
      return null;
    }
  },

  /**
   * Refreshes the current session's activity timestamp and expiry.
   *
   * @returns {boolean} True if the session was refreshed successfully.
   */
  refreshSession() {
    try {
      const session = getSession();

      if (!session) {
        return false;
      }

      const updatedSession = {
        ...session,
        lastActivity: new Date().toISOString(),
        expiresAt: new Date(Date.now() + SESSION_TIMEOUT_MS).toISOString(),
      };

      return setItem(STORAGE_KEYS.SESSIONS, updatedSession);
    } catch (_error) {
      return false;
    }
  },

  /**
   * Retrieves the number of failed login attempts for a given username.
   *
   * @param {string} username - The username to check.
   * @returns {number} The number of failed login attempts.
   */
  getFailedAttempts(username) {
    if (!username || typeof username !== 'string') {
      return 0;
    }

    try {
      const user = findUserByUsername(username.trim());

      if (user) {
        return user.failedLoginAttempts || 0;
      }

      const record = getFailedLoginRecord(username.trim());
      return record.count || 0;
    } catch (_error) {
      return 0;
    }
  },

  /**
   * Resets the failed login attempts for a given username and unlocks the account.
   *
   * @param {string} username - The username to reset.
   * @returns {boolean} True if the reset was successful.
   */
  resetFailedAttempts(username) {
    if (!username || typeof username !== 'string') {
      return false;
    }

    try {
      const user = findUserByUsername(username.trim());

      if (!user) {
        return false;
      }

      const updated = updateUser(user.id, {
        failedLoginAttempts: 0,
        isLocked: false,
      });

      setFailedLoginRecord(username.trim(), {
        count: 0,
        lastAttempt: null,
        lockedAt: null,
      });

      if (updated) {
        AuditLogger.logEvent('ACCOUNT_UNLOCKED', {
          userId: user.id,
          username: sanitizeInput(username.trim()),
        });
      }

      return updated;
    } catch (_error) {
      return false;
    }
  },

  /**
   * Checks whether a given username's account is locked.
   *
   * @param {string} username - The username to check.
   * @returns {boolean} True if the account is locked.
   */
  isAccountLocked(username) {
    if (!username || typeof username !== 'string') {
      return false;
    }

    try {
      const user = findUserByUsername(username.trim());

      if (!user) {
        return false;
      }

      return user.isLocked === true;
    } catch (_error) {
      return false;
    }
  },

  /**
   * Initializes the authentication service by ensuring mock users
   * are loaded into localStorage.
   *
   * @returns {boolean} True if initialization was successful.
   */
  initialize() {
    try {
      initializeUsers();
      return true;
    } catch (_error) {
      return false;
    }
  },
};

export default AuthService;