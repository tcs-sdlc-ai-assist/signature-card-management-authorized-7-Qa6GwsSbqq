import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import AuthService from '../services/AuthService.js';
import VerificationService from '../services/VerificationService.js';
import TokenService from '../services/TokenService.js';
import SessionManager from '../services/SessionManager.js';
import AuditLogger from '../services/AuditLogger.js';

/**
 * @typedef {Object} AuthContextValue
 * @property {Object|null} currentUser - The currently authenticated user object (without passwordHash).
 * @property {boolean} isAuthenticated - Whether the user has a valid session.
 * @property {boolean} isVerified - Whether the user's identity has been verified (KBA/OTP).
 * @property {boolean} isTokenValidated - Whether the user's eSign token has been validated.
 * @property {boolean} isLoading - Whether an auth operation is in progress.
 * @property {string|null} error - The most recent error message, or null.
 * @property {Function} login - Authenticates a user with username and password.
 * @property {Function} signup - Registers a new user.
 * @property {Function} logout - Ends the current session.
 * @property {Function} verifyIdentity - Verifies identity via KBA or OTP.
 * @property {Function} validateToken - Validates an eSign token.
 * @property {Function} clearError - Clears the current error message.
 * @property {Function} refreshSession - Refreshes the session activity timer.
 * @property {number} sessionTimeRemaining - Milliseconds remaining until session timeout.
 */

const AuthContext = createContext(null);

/**
 * Authentication context provider component.
 * Wraps AuthService, VerificationService, TokenService, and SessionManager
 * to provide authentication state and actions to all child components.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to wrap.
 * @returns {React.ReactElement} The provider component.
 */
function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isTokenValidated, setIsTokenValidated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(0);

  const sessionTimerRef = useRef(null);
  const activityListenersAttached = useRef(false);

  /**
   * Initializes services and hydrates auth state from localStorage on mount.
   */
  useEffect(() => {
    try {
      AuthService.initialize();
      TokenService.initialize();

      if (AuthService.isAuthenticated()) {
        const user = AuthService.getCurrentUser();

        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);

          const verificationStatus = VerificationService.getVerificationStatus(user.id);
          setIsVerified(verificationStatus === 'verified');
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } catch (_error) {
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Starts the session monitoring interval to track time remaining
   * and auto-logout on session expiry.
   */
  const startSessionMonitor = useCallback(() => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
    }

    sessionTimerRef.current = setInterval(() => {
      if (!SessionManager.isSessionActive()) {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setIsVerified(false);
        setIsTokenValidated(false);
        setSessionTimeRemaining(0);

        if (sessionTimerRef.current) {
          clearInterval(sessionTimerRef.current);
          sessionTimerRef.current = null;
        }

        AuditLogger.logEvent('SESSION_TIMEOUT_AUTO_LOGOUT', {});
        return;
      }

      const remaining = SessionManager.getTimeRemaining();
      setSessionTimeRemaining(remaining);
    }, 1000);
  }, []);

  /**
   * Stops the session monitoring interval.
   */
  const stopSessionMonitor = useCallback(() => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  /**
   * Handles user activity events to reset the session timer.
   */
  const handleUserActivity = useCallback(() => {
    if (isAuthenticated) {
      SessionManager.resetActivityTimer();
    }
  }, [isAuthenticated]);

  /**
   * Attaches activity listeners for session timeout tracking.
   */
  useEffect(() => {
    if (isAuthenticated && !activityListenersAttached.current) {
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

      events.forEach((event) => {
        window.addEventListener(event, handleUserActivity, { passive: true });
      });

      activityListenersAttached.current = true;
      startSessionMonitor();

      return () => {
        events.forEach((event) => {
          window.removeEventListener(event, handleUserActivity);
        });
        activityListenersAttached.current = false;
        stopSessionMonitor();
      };
    }

    if (!isAuthenticated && activityListenersAttached.current) {
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });

      activityListenersAttached.current = false;
      stopSessionMonitor();
    }

    return undefined;
  }, [isAuthenticated, handleUserActivity, startSessionMonitor, stopSessionMonitor]);

  /**
   * Cleanup on unmount.
   */
  useEffect(() => {
    return () => {
      stopSessionMonitor();
    };
  }, [stopSessionMonitor]);

  /**
   * Authenticates a user with username and password.
   *
   * @param {string} username - The username.
   * @param {string} password - The password.
   * @returns {Object} Result object with status, message, and optionally userId.
   */
  const login = useCallback(async (username, password) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = AuthService.login({ username, password });

      if (result.status === 'success') {
        const user = AuthService.getCurrentUser();

        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
          setIsVerified(false);
          setIsTokenValidated(false);

          const verificationStatus = VerificationService.getVerificationStatus(user.id);
          setIsVerified(verificationStatus === 'verified');
        }

        setIsLoading(false);
        return result;
      }

      setError(result.message);
      setIsLoading(false);
      return result;
    } catch (_error) {
      const errorMessage = 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      setIsLoading(false);
      return {
        status: 'error',
        message: errorMessage,
        lockout: false,
      };
    }
  }, []);

  /**
   * Registers a new user.
   *
   * @param {Object} params - The sign-up parameters.
   * @param {string} params.username - The desired username.
   * @param {string} params.password - The desired password.
   * @param {string} [params.firstName] - The user's first name.
   * @param {string} [params.lastName] - The user's last name.
   * @param {string} [params.email] - The user's email address.
   * @param {string} [params.role] - The user's role.
   * @returns {Object} Result object with status and message.
   */
  const signup = useCallback(async ({ username, password, firstName, lastName, email, role }) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = AuthService.signUp({
        username,
        password,
        firstName: firstName || '',
        lastName: lastName || '',
        email: email || '',
        role: role || 'teller',
      });

      if (result.status === 'success') {
        const user = AuthService.getCurrentUser();

        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
          setIsVerified(false);
          setIsTokenValidated(false);
        }

        setIsLoading(false);
        return result;
      }

      setError(result.message);
      setIsLoading(false);
      return result;
    } catch (_error) {
      const errorMessage = 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      setIsLoading(false);
      return {
        status: 'error',
        message: errorMessage,
      };
    }
  }, []);

  /**
   * Ends the current session and clears all auth state.
   *
   * @returns {Object} Result object with status and message.
   */
  const logout = useCallback(() => {
    try {
      const result = AuthService.logout();

      SessionManager.endSession();

      setCurrentUser(null);
      setIsAuthenticated(false);
      setIsVerified(false);
      setIsTokenValidated(false);
      setError(null);
      setSessionTimeRemaining(0);

      stopSessionMonitor();

      return result;
    } catch (_error) {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setIsVerified(false);
      setIsTokenValidated(false);
      setError(null);
      setSessionTimeRemaining(0);

      stopSessionMonitor();

      return {
        status: 'success',
        message: 'You have been successfully logged out.',
      };
    }
  }, [stopSessionMonitor]);

  /**
   * Verifies the user's identity via KBA or OTP.
   *
   * @param {Object} params - The verification parameters.
   * @param {string} params.method - The verification method ('kba' or 'otp').
   * @param {string} [params.signerId] - The signer ID (required for KBA).
   * @param {string} [params.entityId] - The entity ID (required for OTP).
   * @param {Array<Object>} [params.answers] - KBA answers array with { questionId, answer }.
   * @param {string} [params.code] - OTP code.
   * @returns {Object} Result object with status, message, and verificationStatus.
   */
  const verifyIdentity = useCallback(async (params) => {
    setIsLoading(true);
    setError(null);

    try {
      const { method, signerId, entityId, answers, code } = params || {};

      let result;

      if (method === 'kba') {
        if (!signerId) {
          setIsLoading(false);
          const errorResult = {
            status: 'error',
            message: 'Signer ID is required for KBA verification.',
            verificationStatus: 'failed',
          };
          setError(errorResult.message);
          return errorResult;
        }

        result = VerificationService.verifyKBA({
          signerId,
          answers: answers || [],
        });
      } else if (method === 'otp') {
        const resolvedEntityId = entityId || (currentUser ? currentUser.id : null);

        if (!resolvedEntityId) {
          setIsLoading(false);
          const errorResult = {
            status: 'error',
            message: 'Entity ID is required for OTP verification.',
            verificationStatus: 'failed',
          };
          setError(errorResult.message);
          return errorResult;
        }

        result = VerificationService.verifyOTP({
          entityId: resolvedEntityId,
          code: code || '',
        });
      } else {
        setIsLoading(false);
        const errorResult = {
          status: 'error',
          message: 'Invalid verification method. Use "kba" or "otp".',
          verificationStatus: 'failed',
        };
        setError(errorResult.message);
        return errorResult;
      }

      if (result.status === 'success' && result.verificationStatus === 'verified') {
        setIsVerified(true);
      } else if (result.status === 'error') {
        setError(result.message);
      }

      setIsLoading(false);
      return result;
    } catch (_error) {
      const errorMessage = 'An unexpected error occurred during verification. Please try again.';
      setError(errorMessage);
      setIsLoading(false);
      return {
        status: 'error',
        message: errorMessage,
        verificationStatus: 'failed',
      };
    }
  }, [currentUser]);

  /**
   * Validates an eSign token.
   *
   * @param {string} token - The eSign token string to validate.
   * @returns {Object} Result object with status, valid, message, and optionally tokenDetails.
   */
  const validateToken = useCallback(async (token) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = TokenService.validateToken(token);

      if (result.status === 'success' && result.valid) {
        setIsTokenValidated(true);

        TokenService.updateTokenStatus(token, 'confirmed');

        AuditLogger.logEvent('TOKEN_CONFIRMED', {
          userId: currentUser ? currentUser.id : 'anonymous',
          tokenId: result.tokenDetails ? result.tokenDetails.id : 'unknown',
        });
      } else if (result.status === 'error') {
        setError(result.message);
      }

      setIsLoading(false);
      return result;
    } catch (_error) {
      const errorMessage = 'An unexpected error occurred during token validation. Please try again.';
      setError(errorMessage);
      setIsLoading(false);
      return {
        status: 'error',
        valid: false,
        message: errorMessage,
      };
    }
  }, [currentUser]);

  /**
   * Clears the current error message.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Refreshes the session activity timer.
   *
   * @returns {boolean} True if the session was refreshed successfully.
   */
  const refreshSession = useCallback(() => {
    try {
      const refreshed = AuthService.refreshSession();

      if (refreshed) {
        SessionManager.resetActivityTimer();
      }

      return refreshed;
    } catch (_error) {
      return false;
    }
  }, []);

  const value = {
    currentUser,
    isAuthenticated,
    isVerified,
    isTokenValidated,
    isLoading,
    error,
    login,
    signup,
    logout,
    verifyIdentity,
    validateToken,
    clearError,
    refreshSession,
    sessionTimeRemaining,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Custom hook to access the authentication context.
 * Must be used within an AuthProvider.
 *
 * @returns {AuthContextValue} The authentication context value.
 * @throws {Error} If used outside of an AuthProvider.
 */
function useAuth() {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}

export { AuthProvider, useAuth };
export default AuthContext;