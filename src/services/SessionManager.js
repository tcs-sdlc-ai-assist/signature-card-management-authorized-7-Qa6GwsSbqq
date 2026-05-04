import { STORAGE_KEYS, SESSION_TIMEOUT_MS } from '../constants/constants.js';
import { getItem, setItem } from '../utils/storage.js';
import { generateUUID, isExpired } from '../utils/helpers.js';
import AuditLogger from './AuditLogger.js';

/**
 * Retrieves the current session object from localStorage.
 * @returns {Object|null} The session object or null if no session exists.
 */
const getSessionFromStorage = () => {
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
 * Persists a session object to localStorage.
 * @param {Object|null} session - The session object to persist, or null to clear.
 * @returns {boolean} True if saved successfully.
 */
const saveSession = (session) => {
  try {
    return setItem(STORAGE_KEYS.SESSIONS, session);
  } catch (_error) {
    return false;
  }
};

/**
 * Session management service for the SIG Card Management application.
 * Handles session lifecycle including creation, validation, activity tracking,
 * inactivity timeout, and session termination. All session data is persisted
 * in localStorage.
 *
 * @namespace SessionManager
 */
const SessionManager = {
  /**
   * Starts a new session for the given user ID.
   * Creates a session object with a unique token, timestamps, and expiry,
   * then persists it to localStorage.
   *
   * @param {string} userId - The user ID to create a session for.
   * @returns {Object|null} The created session object, or null on failure.
   */
  startSession(userId) {
    if (!userId || typeof userId !== 'string') {
      return null;
    }

    try {
      const now = new Date();
      const session = {
        userId,
        token: generateUUID(),
        createdAt: now.toISOString(),
        lastActivity: now.toISOString(),
        expiresAt: new Date(now.getTime() + SESSION_TIMEOUT_MS).toISOString(),
      };

      const success = saveSession(session);

      if (!success) {
        return null;
      }

      AuditLogger.logEvent('SESSION_STARTED', {
        userId,
      });

      return session;
    } catch (_error) {
      return null;
    }
  },

  /**
   * Ends the current session by clearing session data from localStorage.
   * Logs the session end event before clearing.
   *
   * @returns {boolean} True if the session was ended successfully.
   */
  endSession() {
    try {
      const session = getSessionFromStorage();

      if (session) {
        AuditLogger.logEvent('SESSION_ENDED', {
          userId: session.userId,
        });
      }

      return saveSession(null);
    } catch (_error) {
      saveSession(null);
      return false;
    }
  },

  /**
   * Checks whether the current session is active and within the timeout window.
   * A session is considered active if:
   * - A session object exists in localStorage with a valid userId and token
   * - The session has not expired based on the expiresAt timestamp
   * - The time since last activity has not exceeded SESSION_TIMEOUT_MS
   *
   * @returns {boolean} True if the session is active and valid.
   */
  isSessionActive() {
    try {
      const session = getSessionFromStorage();

      if (!session) {
        return false;
      }

      if (!session.token || !session.userId) {
        return false;
      }

      // Check if session has expired based on expiresAt
      if (session.expiresAt && isExpired(session.expiresAt)) {
        AuditLogger.logEvent('SESSION_EXPIRED', {
          userId: session.userId,
          reason: 'Session expiry time reached',
        });
        this.endSession();
        return false;
      }

      // Check if session has expired based on last activity + timeout
      if (session.lastActivity) {
        const lastActivity = new Date(session.lastActivity).getTime();
        const now = Date.now();

        if (isNaN(lastActivity)) {
          this.endSession();
          return false;
        }

        if (now - lastActivity > SESSION_TIMEOUT_MS) {
          AuditLogger.logEvent('SESSION_EXPIRED', {
            userId: session.userId,
            reason: 'Inactivity timeout',
          });
          this.endSession();
          return false;
        }
      }

      return true;
    } catch (_error) {
      return false;
    }
  },

  /**
   * Resets the activity timer by updating the lastActivity timestamp
   * and extending the expiresAt time on the current session.
   * Should be called on user interaction to prevent inactivity timeout.
   *
   * @returns {boolean} True if the activity timer was reset successfully.
   */
  resetActivityTimer() {
    try {
      const session = getSessionFromStorage();

      if (!session) {
        return false;
      }

      const now = new Date();
      const updatedSession = {
        ...session,
        lastActivity: now.toISOString(),
        expiresAt: new Date(now.getTime() + SESSION_TIMEOUT_MS).toISOString(),
      };

      return saveSession(updatedSession);
    } catch (_error) {
      return false;
    }
  },

  /**
   * Returns the number of milliseconds remaining until the session times out
   * due to inactivity. Returns 0 if no active session exists or the session
   * has already expired.
   *
   * @returns {number} Milliseconds remaining until timeout, or 0 if expired/no session.
   */
  getTimeRemaining() {
    try {
      const session = getSessionFromStorage();

      if (!session) {
        return 0;
      }

      if (!session.lastActivity) {
        return 0;
      }

      const lastActivity = new Date(session.lastActivity).getTime();

      if (isNaN(lastActivity)) {
        return 0;
      }

      const now = Date.now();
      const elapsed = now - lastActivity;
      const remaining = SESSION_TIMEOUT_MS - elapsed;

      if (remaining <= 0) {
        return 0;
      }

      return remaining;
    } catch (_error) {
      return 0;
    }
  },

  /**
   * Retrieves the current session object if one exists.
   *
   * @returns {Object|null} The current session object, or null if no session exists.
   */
  getSession() {
    try {
      return getSessionFromStorage();
    } catch (_error) {
      return null;
    }
  },

  /**
   * Retrieves the user ID from the current session.
   *
   * @returns {string|null} The current user ID, or null if no session exists.
   */
  getCurrentUserId() {
    try {
      const session = getSessionFromStorage();

      if (session && session.userId) {
        return session.userId;
      }

      return null;
    } catch (_error) {
      return null;
    }
  },

  /**
   * Retrieves the session token from the current session.
   *
   * @returns {string|null} The current session token, or null if no session exists.
   */
  getSessionToken() {
    try {
      const session = getSessionFromStorage();

      if (session && session.token) {
        return session.token;
      }

      return null;
    } catch (_error) {
      return null;
    }
  },

  /**
   * Returns the configured session timeout duration in milliseconds.
   *
   * @returns {number} The session timeout in milliseconds.
   */
  getTimeoutDuration() {
    return SESSION_TIMEOUT_MS;
  },
};

export default SessionManager;