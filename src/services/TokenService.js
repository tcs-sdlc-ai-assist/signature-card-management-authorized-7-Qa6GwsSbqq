import { STORAGE_KEYS, TOKEN_EXPIRY_HOURS } from '../constants/constants.js';
import { getItem, setItem } from '../utils/storage.js';
import { sanitizeInput, isExpired } from '../utils/helpers.js';
import AuditLogger from './AuditLogger.js';
import { MOCK_ESIGN_TOKENS } from '../constants/mockData.js';

/**
 * localStorage key for persisted token data.
 * @type {string}
 */
const TOKEN_STORE_KEY = STORAGE_KEYS.TOKENS;

/**
 * Default token expiry duration in milliseconds.
 * @type {number}
 */
const TOKEN_EXPIRY_MS = TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;

/**
 * Valid token statuses.
 * @readonly
 * @enum {string}
 */
const TOKEN_STATUSES = {
  VALID: 'valid',
  USED: 'used',
  EXPIRED: 'expired',
  INVALID: 'invalid',
  CONFIRMED: 'confirmed',
};

/**
 * Initializes the token store in localStorage with mock data if not already present.
 * @returns {Array<Object>} The current tokens array from localStorage.
 */
const initializeTokens = () => {
  try {
    const existingTokens = getItem(TOKEN_STORE_KEY, null);

    if (Array.isArray(existingTokens) && existingTokens.length > 0) {
      return existingTokens;
    }

    const tokens = MOCK_ESIGN_TOKENS.map((token) => ({ ...token }));
    setItem(TOKEN_STORE_KEY, tokens);
    return tokens;
  } catch (_error) {
    return [];
  }
};

/**
 * Retrieves all tokens from localStorage, initializing if necessary.
 * @returns {Array<Object>} The array of token objects.
 */
const getTokens = () => {
  try {
    const tokens = getItem(TOKEN_STORE_KEY, null);

    if (Array.isArray(tokens) && tokens.length > 0) {
      return tokens;
    }

    return initializeTokens();
  } catch (_error) {
    return initializeTokens();
  }
};

/**
 * Persists the tokens array to localStorage.
 * @param {Array<Object>} tokens - The updated tokens array.
 * @returns {boolean} True if saved successfully.
 */
const saveTokens = (tokens) => {
  try {
    return setItem(TOKEN_STORE_KEY, tokens);
  } catch (_error) {
    return false;
  }
};

/**
 * Finds a token record by its token string.
 * @param {string} token - The token string to search for.
 * @returns {Object|undefined} The matching token object or undefined.
 */
const findTokenByString = (token) => {
  if (!token || typeof token !== 'string') {
    return undefined;
  }

  const tokens = getTokens();
  return tokens.find((t) => t.token === token.trim());
};

/**
 * Finds a token record by its ID.
 * @param {string} tokenId - The token ID to search for.
 * @returns {Object|undefined} The matching token object or undefined.
 */
const findTokenById = (tokenId) => {
  if (!tokenId || typeof tokenId !== 'string') {
    return undefined;
  }

  const tokens = getTokens();
  return tokens.find((t) => t.id === tokenId);
};

/**
 * Retrieves the current session from localStorage to get the authenticated user ID.
 * @returns {string|null} The current user ID, or null if no session exists.
 */
const getCurrentUserId = () => {
  try {
    const session = getItem(STORAGE_KEYS.SESSIONS, null);

    if (session && typeof session === 'object' && session.userId) {
      return session.userId;
    }

    return null;
  } catch (_error) {
    return null;
  }
};

/**
 * Checks whether a token has expired based on its expiresAt field
 * or the default expiry duration from issuedAt.
 * @param {Object} tokenRecord - The token record to check.
 * @returns {boolean} True if the token has expired.
 */
const isTokenExpired = (tokenRecord) => {
  if (!tokenRecord) {
    return true;
  }

  // Check explicit expiresAt
  if (tokenRecord.expiresAt) {
    return isExpired(tokenRecord.expiresAt);
  }

  // Fall back to issuedAt + default expiry
  if (tokenRecord.issuedAt) {
    const issuedAt = new Date(tokenRecord.issuedAt).getTime();

    if (isNaN(issuedAt)) {
      return true;
    }

    const expiryTime = issuedAt + TOKEN_EXPIRY_MS;
    return Date.now() >= expiryTime;
  }

  return true;
};

/**
 * eSign token validation service for the SIG Card Management application.
 * Validates tokens against mock data for validity, expiration, and association
 * with the authenticated user. Supports updating token status and retrieving
 * token metadata. All validation attempts are logged via AuditLogger.
 *
 * @namespace TokenService
 */
const TokenService = {
  /**
   * Validates an eSign token against mock data.
   * Checks that the token exists, has not been used, is not expired,
   * and is associated with the currently authenticated user.
   *
   * @param {string} token - The eSign token string to validate.
   * @returns {Object} Result object with status, valid, message, and optionally tokenDetails.
   */
  validateToken(token) {
    try {
      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        AuditLogger.logEvent('TOKEN_VALIDATION_FAILED', {
          reason: 'Token is required',
        });

        return {
          status: 'error',
          valid: false,
          message: 'Token is required.',
        };
      }

      const sanitizedToken = token.trim();

      // Initialize tokens if needed
      initializeTokens();

      const tokenRecord = findTokenByString(sanitizedToken);

      if (!tokenRecord) {
        AuditLogger.logEvent('TOKEN_VALIDATION_FAILED', {
          reason: 'Token not found',
        });

        return {
          status: 'error',
          valid: false,
          message: 'Invalid token. Please check your token and try again.',
        };
      }

      // Check if token status is already invalid
      if (tokenRecord.status === TOKEN_STATUSES.INVALID) {
        AuditLogger.logEvent('TOKEN_VALIDATION_FAILED', {
          tokenId: tokenRecord.id,
          reason: 'Token is invalid',
        });

        return {
          status: 'error',
          valid: false,
          message: 'This token is invalid. Please request a new token.',
        };
      }

      // Check if token has already been used
      if (tokenRecord.status === TOKEN_STATUSES.USED || tokenRecord.usedAt) {
        AuditLogger.logEvent('TOKEN_VALIDATION_FAILED', {
          tokenId: tokenRecord.id,
          reason: 'Token already used',
        });

        return {
          status: 'error',
          valid: false,
          message: 'This token has already been used.',
        };
      }

      // Check if token has already been confirmed
      if (tokenRecord.status === TOKEN_STATUSES.CONFIRMED) {
        AuditLogger.logEvent('TOKEN_VALIDATION_FAILED', {
          tokenId: tokenRecord.id,
          reason: 'Token already confirmed',
        });

        return {
          status: 'error',
          valid: false,
          message: 'This token has already been confirmed.',
        };
      }

      // Check if token has expired
      if (tokenRecord.status === TOKEN_STATUSES.EXPIRED || isTokenExpired(tokenRecord)) {
        // Update status to expired if not already
        if (tokenRecord.status !== TOKEN_STATUSES.EXPIRED) {
          this.updateTokenStatus(sanitizedToken, TOKEN_STATUSES.EXPIRED);
        }

        AuditLogger.logEvent('TOKEN_VALIDATION_FAILED', {
          tokenId: tokenRecord.id,
          reason: 'Token expired',
        });

        return {
          status: 'error',
          valid: false,
          message: 'This token has expired. Please request a new token.',
        };
      }

      // Check association with authenticated user
      const currentUserId = getCurrentUserId();

      if (currentUserId && tokenRecord.userId && tokenRecord.userId !== currentUserId) {
        AuditLogger.logEvent('TOKEN_VALIDATION_FAILED', {
          tokenId: tokenRecord.id,
          reason: 'Token not associated with current user',
        });

        return {
          status: 'error',
          valid: false,
          message: 'This token is not associated with your account.',
        };
      }

      // Token is valid
      AuditLogger.logEvent('TOKEN_VALIDATION_SUCCESS', {
        tokenId: tokenRecord.id,
        signerId: tokenRecord.signerId,
        accountId: tokenRecord.accountId,
      });

      return {
        status: 'success',
        valid: true,
        message: 'Token is valid.',
        tokenDetails: {
          id: tokenRecord.id,
          signerId: tokenRecord.signerId,
          accountId: tokenRecord.accountId,
          status: tokenRecord.status,
          issuedAt: tokenRecord.issuedAt,
          expiresAt: tokenRecord.expiresAt,
        },
      };
    } catch (_error) {
      return {
        status: 'error',
        valid: false,
        message: 'An unexpected error occurred during token validation. Please try again.',
      };
    }
  },

  /**
   * Updates the status of an eSign token.
   * Marks the token as confirmed, used, expired, or invalid.
   *
   * @param {string} token - The eSign token string to update.
   * @param {string} newStatus - The new status to set (e.g., 'confirmed', 'used', 'expired', 'invalid').
   * @returns {Object} Result object with status and message.
   */
  updateTokenStatus(token, newStatus) {
    try {
      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        return {
          status: 'error',
          message: 'Token is required.',
        };
      }

      if (!newStatus || typeof newStatus !== 'string') {
        return {
          status: 'error',
          message: 'New status is required.',
        };
      }

      const validStatuses = Object.values(TOKEN_STATUSES);
      const sanitizedStatus = newStatus.trim().toLowerCase();

      if (!validStatuses.includes(sanitizedStatus)) {
        return {
          status: 'error',
          message: 'Invalid token status.',
        };
      }

      const sanitizedToken = token.trim();
      const tokens = getTokens();
      const index = tokens.findIndex((t) => t.token === sanitizedToken);

      if (index === -1) {
        AuditLogger.logEvent('TOKEN_UPDATE_FAILED', {
          reason: 'Token not found',
        });

        return {
          status: 'error',
          message: 'Token not found.',
        };
      }

      const previousStatus = tokens[index].status;
      const now = new Date().toISOString();

      tokens[index] = {
        ...tokens[index],
        status: sanitizedStatus,
      };

      // Set usedAt timestamp when marking as used or confirmed
      if (
        (sanitizedStatus === TOKEN_STATUSES.USED || sanitizedStatus === TOKEN_STATUSES.CONFIRMED) &&
        !tokens[index].usedAt
      ) {
        tokens[index].usedAt = now;
      }

      const saved = saveTokens(tokens);

      if (!saved) {
        return {
          status: 'error',
          message: 'Failed to update token status. Please try again.',
        };
      }

      AuditLogger.logEvent('TOKEN_STATUS_UPDATED', {
        tokenId: tokens[index].id,
        previousStatus,
        newStatus: sanitizedStatus,
      });

      return {
        status: 'success',
        message: 'Token status updated successfully.',
      };
    } catch (_error) {
      return {
        status: 'error',
        message: 'An unexpected error occurred. Please try again.',
      };
    }
  },

  /**
   * Retrieves metadata for an eSign token.
   * Returns token details without exposing the full token string.
   *
   * @param {string} token - The eSign token string to look up.
   * @returns {Object} Result object with status, message, and optionally tokenDetails.
   */
  getTokenDetails(token) {
    try {
      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        return {
          status: 'error',
          message: 'Token is required.',
          tokenDetails: null,
        };
      }

      const sanitizedToken = token.trim();

      // Initialize tokens if needed
      initializeTokens();

      const tokenRecord = findTokenByString(sanitizedToken);

      if (!tokenRecord) {
        return {
          status: 'error',
          message: 'Token not found.',
          tokenDetails: null,
        };
      }

      // Check and update expired status if needed
      if (
        tokenRecord.status === TOKEN_STATUSES.VALID &&
        isTokenExpired(tokenRecord)
      ) {
        this.updateTokenStatus(sanitizedToken, TOKEN_STATUSES.EXPIRED);
        tokenRecord.status = TOKEN_STATUSES.EXPIRED;
      }

      AuditLogger.logEvent('TOKEN_DETAILS_ACCESSED', {
        tokenId: tokenRecord.id,
      });

      return {
        status: 'success',
        message: 'Token details retrieved successfully.',
        tokenDetails: {
          id: tokenRecord.id,
          userId: tokenRecord.userId,
          signerId: tokenRecord.signerId,
          accountId: tokenRecord.accountId,
          status: tokenRecord.status,
          issuedAt: tokenRecord.issuedAt,
          expiresAt: tokenRecord.expiresAt,
          usedAt: tokenRecord.usedAt || null,
          createdAt: tokenRecord.createdAt,
        },
      };
    } catch (_error) {
      return {
        status: 'error',
        message: 'An unexpected error occurred. Please try again.',
        tokenDetails: null,
      };
    }
  },

  /**
   * Retrieves a token record by its ID.
   *
   * @param {string} tokenId - The token ID to look up.
   * @returns {Object} Result object with status, message, and optionally tokenDetails.
   */
  getTokenById(tokenId) {
    try {
      if (!tokenId || typeof tokenId !== 'string' || tokenId.trim().length === 0) {
        return {
          status: 'error',
          message: 'Token ID is required.',
          tokenDetails: null,
        };
      }

      // Initialize tokens if needed
      initializeTokens();

      const tokenRecord = findTokenById(tokenId.trim());

      if (!tokenRecord) {
        return {
          status: 'error',
          message: 'Token not found.',
          tokenDetails: null,
        };
      }

      // Check and update expired status if needed
      if (
        tokenRecord.status === TOKEN_STATUSES.VALID &&
        isTokenExpired(tokenRecord)
      ) {
        this.updateTokenStatus(tokenRecord.token, TOKEN_STATUSES.EXPIRED);
        tokenRecord.status = TOKEN_STATUSES.EXPIRED;
      }

      return {
        status: 'success',
        message: 'Token details retrieved successfully.',
        tokenDetails: {
          id: tokenRecord.id,
          userId: tokenRecord.userId,
          signerId: tokenRecord.signerId,
          accountId: tokenRecord.accountId,
          status: tokenRecord.status,
          issuedAt: tokenRecord.issuedAt,
          expiresAt: tokenRecord.expiresAt,
          usedAt: tokenRecord.usedAt || null,
          createdAt: tokenRecord.createdAt,
        },
      };
    } catch (_error) {
      return {
        status: 'error',
        message: 'An unexpected error occurred. Please try again.',
        tokenDetails: null,
      };
    }
  },

  /**
   * Retrieves all tokens associated with a given user ID.
   *
   * @param {string} userId - The user ID to look up tokens for.
   * @returns {Array<Object>} An array of token detail objects for the user.
   */
  getTokensByUserId(userId) {
    if (!userId || typeof userId !== 'string') {
      return [];
    }

    try {
      // Initialize tokens if needed
      initializeTokens();

      const tokens = getTokens();
      const userTokens = tokens.filter((t) => t.userId === userId);

      return userTokens.map((t) => ({
        id: t.id,
        signerId: t.signerId,
        accountId: t.accountId,
        status: t.status,
        issuedAt: t.issuedAt,
        expiresAt: t.expiresAt,
        usedAt: t.usedAt || null,
        createdAt: t.createdAt,
      }));
    } catch (_error) {
      return [];
    }
  },

  /**
   * Retrieves all tokens associated with a given signer ID.
   *
   * @param {string} signerId - The signer ID to look up tokens for.
   * @returns {Array<Object>} An array of token detail objects for the signer.
   */
  getTokensBySignerId(signerId) {
    if (!signerId || typeof signerId !== 'string') {
      return [];
    }

    try {
      // Initialize tokens if needed
      initializeTokens();

      const tokens = getTokens();
      const signerTokens = tokens.filter((t) => t.signerId === signerId);

      return signerTokens.map((t) => ({
        id: t.id,
        userId: t.userId,
        accountId: t.accountId,
        status: t.status,
        issuedAt: t.issuedAt,
        expiresAt: t.expiresAt,
        usedAt: t.usedAt || null,
        createdAt: t.createdAt,
      }));
    } catch (_error) {
      return [];
    }
  },

  /**
   * Returns the configured token expiry duration in hours.
   *
   * @returns {number} The token expiry duration in hours.
   */
  getTokenExpiryHours() {
    return TOKEN_EXPIRY_HOURS;
  },

  /**
   * Initializes the token service by ensuring mock tokens
   * are loaded into localStorage.
   *
   * @returns {boolean} True if initialization was successful.
   */
  initialize() {
    try {
      initializeTokens();
      return true;
    } catch (_error) {
      return false;
    }
  },
};

export default TokenService;