import { STORAGE_KEYS } from '../constants/constants.js';
import { getItem, setItem } from '../utils/storage.js';
import { deepClone, maskAccountNumber } from '../utils/helpers.js';
import AuditLogger from './AuditLogger.js';
import { MOCK_ACCOUNTS, MOCK_SIGNERS } from '../constants/mockData.js';

/**
 * Initializes the accounts store in localStorage with mock data if not already present.
 * @returns {Array<Object>} The current accounts array from localStorage.
 */
const initializeAccounts = () => {
  try {
    const storageKey = 'sig_accounts';
    const existingAccounts = getItem(storageKey, null);

    if (Array.isArray(existingAccounts) && existingAccounts.length > 0) {
      return existingAccounts;
    }

    const accounts = MOCK_ACCOUNTS.map((account) => ({ ...account }));
    setItem(storageKey, accounts);
    return accounts;
  } catch (_error) {
    return [];
  }
};

/**
 * Retrieves all accounts from localStorage, initializing if necessary.
 * @returns {Array<Object>} The array of account objects.
 */
const getAccountsFromStore = () => {
  try {
    const storageKey = 'sig_accounts';
    const accounts = getItem(storageKey, null);

    if (Array.isArray(accounts) && accounts.length > 0) {
      return accounts;
    }

    return initializeAccounts();
  } catch (_error) {
    return initializeAccounts();
  }
};

/**
 * Ensures account numbers are masked in the returned account object.
 * @param {Object} account - The account object to sanitize.
 * @returns {Object} A copy of the account with masked account number.
 */
const sanitizeAccount = (account) => {
  if (!account || typeof account !== 'object') {
    return account;
  }

  const cloned = deepClone(account);

  if (cloned.accountNumber) {
    cloned.accountNumberMasked = maskAccountNumber(cloned.accountNumber);
  }

  return cloned;
};

/**
 * Retrieves the current user ID from the active session in localStorage.
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
 * Account data access service for the SIG Card Management application.
 * Provides methods to retrieve account data from the mock data store,
 * with masked account numbers for security. Supports listing, detail
 * retrieval, signer counts, and pagination.
 *
 * @namespace AccountService
 */
const AccountService = {
  /**
   * Retrieves all accounts accessible by the given user ID.
   * In the current mock implementation, all accounts are returned
   * regardless of user ID. Account numbers are masked in the response.
   *
   * @param {string} [userId] - The user ID to retrieve accounts for.
   *   If not provided, the current session user ID is used.
   * @returns {Array<Object>} An array of account objects with masked account numbers.
   */
  getAccounts(userId) {
    try {
      const resolvedUserId = userId || getCurrentUserId();

      // Initialize accounts if needed
      initializeAccounts();

      const accounts = getAccountsFromStore();

      if (!Array.isArray(accounts)) {
        return [];
      }

      const sanitizedAccounts = accounts.map((account) => sanitizeAccount(account));

      AuditLogger.logEvent('ACCOUNTS_ACCESSED', {
        userId: resolvedUserId || 'anonymous',
        accountCount: sanitizedAccounts.length,
      });

      return sanitizedAccounts;
    } catch (_error) {
      return [];
    }
  },

  /**
   * Retrieves a single account by its account ID.
   * The account number is masked in the response.
   *
   * @param {string} accountId - The account ID to look up.
   * @returns {Object|null} The account object with masked account number, or null if not found.
   */
  getAccountById(accountId) {
    if (!accountId || typeof accountId !== 'string') {
      return null;
    }

    try {
      // Initialize accounts if needed
      initializeAccounts();

      const accounts = getAccountsFromStore();

      if (!Array.isArray(accounts)) {
        return null;
      }

      const account = accounts.find((a) => a.id === accountId.trim());

      if (!account) {
        AuditLogger.logEvent('ACCOUNT_ACCESS_FAILED', {
          accountId,
          reason: 'Account not found',
        });

        return null;
      }

      const sanitized = sanitizeAccount(account);

      AuditLogger.logEvent('ACCOUNT_ACCESSED', {
        accountId: account.id,
      });

      return sanitized;
    } catch (_error) {
      return null;
    }
  },

  /**
   * Returns the current signer count for a given account ID.
   * Counts signers from the mock signers data associated with the account.
   *
   * @param {string} accountId - The account ID to get the signer count for.
   * @returns {number} The number of signers on the account, or 0 if not found.
   */
  getSignerCount(accountId) {
    if (!accountId || typeof accountId !== 'string') {
      return 0;
    }

    try {
      // Initialize accounts if needed
      initializeAccounts();

      const accounts = getAccountsFromStore();

      if (!Array.isArray(accounts)) {
        return 0;
      }

      const account = accounts.find((a) => a.id === accountId.trim());

      if (!account) {
        return 0;
      }

      // Check signerIds array on the account
      if (Array.isArray(account.signerIds)) {
        return account.signerIds.length;
      }

      // Fall back to signerCount property
      if (typeof account.signerCount === 'number') {
        return account.signerCount;
      }

      return 0;
    } catch (_error) {
      return 0;
    }
  },

  /**
   * Retrieves a paginated list of accounts accessible by the given user ID.
   * Returns a page of accounts along with pagination metadata.
   *
   * @param {string} [userId] - The user ID to retrieve accounts for.
   *   If not provided, the current session user ID is used.
   * @param {number} [page=1] - The page number (1-based).
   * @param {number} [pageSize=10] - The number of accounts per page.
   * @returns {Object} A pagination result object with:
   *   - {Array<Object>} data - The accounts for the requested page.
   *   - {number} page - The current page number.
   *   - {number} pageSize - The number of items per page.
   *   - {number} totalItems - The total number of accounts.
   *   - {number} totalPages - The total number of pages.
   *   - {boolean} hasNextPage - Whether there is a next page.
   *   - {boolean} hasPreviousPage - Whether there is a previous page.
   */
  getAccountsPage(userId, page = 1, pageSize = 10) {
    try {
      const allAccounts = this.getAccounts(userId);

      // Normalize page and pageSize
      const normalizedPageSize = Math.max(1, Math.floor(Number(pageSize) || 10));
      const totalItems = allAccounts.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / normalizedPageSize));
      const normalizedPage = Math.max(1, Math.min(Math.floor(Number(page) || 1), totalPages));

      const startIndex = (normalizedPage - 1) * normalizedPageSize;
      const endIndex = Math.min(startIndex + normalizedPageSize, totalItems);
      const data = allAccounts.slice(startIndex, endIndex);

      return {
        data,
        page: normalizedPage,
        pageSize: normalizedPageSize,
        totalItems,
        totalPages,
        hasNextPage: normalizedPage < totalPages,
        hasPreviousPage: normalizedPage > 1,
      };
    } catch (_error) {
      return {
        data: [],
        page: 1,
        pageSize: Math.max(1, Math.floor(Number(pageSize) || 10)),
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      };
    }
  },

  /**
   * Retrieves an account by its account number.
   * The account number is masked in the response.
   *
   * @param {string} accountNumber - The full account number to look up.
   * @returns {Object|null} The account object with masked account number, or null if not found.
   */
  getAccountByNumber(accountNumber) {
    if (!accountNumber || typeof accountNumber !== 'string') {
      return null;
    }

    try {
      // Initialize accounts if needed
      initializeAccounts();

      const accounts = getAccountsFromStore();

      if (!Array.isArray(accounts)) {
        return null;
      }

      const account = accounts.find((a) => a.accountNumber === accountNumber.trim());

      if (!account) {
        return null;
      }

      return sanitizeAccount(account);
    } catch (_error) {
      return null;
    }
  },

  /**
   * Initializes the account service by ensuring mock accounts
   * are loaded into localStorage.
   *
   * @returns {boolean} True if initialization was successful.
   */
  initialize() {
    try {
      initializeAccounts();
      return true;
    } catch (_error) {
      return false;
    }
  },
};

export default AccountService;