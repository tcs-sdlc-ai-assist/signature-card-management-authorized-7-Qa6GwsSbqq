import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import AccountService from '../services/AccountService.js';
import SignerService from '../services/SignerService.js';
import AuditLogger from '../services/AuditLogger.js';

/**
 * @typedef {Object} SignerContextValue
 * @property {Object|null} selectedAccount - The currently selected account object.
 * @property {Array<Object>} signers - The signers for the selected account.
 * @property {Array<Object>} stagedChanges - The pending staged changes for the selected account.
 * @property {boolean} isLoading - Whether a signer operation is in progress.
 * @property {string|null} error - The most recent error message, or null.
 * @property {Function} selectAccount - Selects an account by ID and loads its signers.
 * @property {Function} addSigner - Stages a new signer addition for the selected account.
 * @property {Function} editSigner - Stages an edit for an existing signer.
 * @property {Function} removeSigner - Stages a removal for an existing signer.
 * @property {Function} submitChanges - Finalizes all staged changes for the selected account.
 * @property {Function} clearChanges - Discards all staged changes for the selected account.
 * @property {Function} clearError - Clears the current error message.
 * @property {Function} refreshSigners - Reloads signers for the selected account.
 */

const SignerContext = createContext(null);

/**
 * Signer management context provider component.
 * Wraps AccountService and SignerService to provide signer state and
 * actions to all child components.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to wrap.
 * @returns {React.ReactElement} The provider component.
 */
function SignerProvider({ children }) {
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [signers, setSigners] = useState([]);
  const [stagedChanges, setStagedChanges] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Initializes services on mount.
   */
  useEffect(() => {
    try {
      AccountService.initialize();
      SignerService.initialize();
    } catch (_error) {
      // Services may already be initialized
    }
  }, []);

  /**
   * Loads signers and staged changes for the currently selected account.
   */
  const loadSignersForAccount = useCallback((accountId) => {
    if (!accountId || typeof accountId !== 'string') {
      setSigners([]);
      setStagedChanges([]);
      return;
    }

    try {
      const accountSigners = SignerService.getSigners(accountId);
      setSigners(Array.isArray(accountSigners) ? accountSigners : []);

      const changes = SignerService.getStagedChanges(accountId);
      setStagedChanges(Array.isArray(changes) ? changes : []);
    } catch (_error) {
      setSigners([]);
      setStagedChanges([]);
    }
  }, []);

  /**
   * Selects an account by ID and loads its signers.
   *
   * @param {string} accountId - The account ID to select.
   * @returns {Object} Result object with status and message.
   */
  const selectAccount = useCallback((accountId) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!accountId || typeof accountId !== 'string') {
        setSelectedAccount(null);
        setSigners([]);
        setStagedChanges([]);
        setIsLoading(false);
        return {
          status: 'error',
          message: 'Account ID is required.',
        };
      }

      const account = AccountService.getAccountById(accountId);

      if (!account) {
        setSelectedAccount(null);
        setSigners([]);
        setStagedChanges([]);
        setIsLoading(false);
        return {
          status: 'error',
          message: 'Account not found.',
        };
      }

      setSelectedAccount(account);
      loadSignersForAccount(accountId);

      AuditLogger.logEvent('ACCOUNT_SELECTED', {
        accountId,
      });

      setIsLoading(false);
      return {
        status: 'success',
        message: 'Account selected successfully.',
      };
    } catch (_error) {
      setSelectedAccount(null);
      setSigners([]);
      setStagedChanges([]);
      setIsLoading(false);
      return {
        status: 'error',
        message: 'An unexpected error occurred. Please try again.',
      };
    }
  }, [loadSignersForAccount]);

  /**
   * Stages a new signer addition for the selected account.
   *
   * @param {Object} signerData - The signer data object.
   * @returns {Object} Result object with status, message, and optionally signerId.
   */
  const addSigner = useCallback((signerData) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!selectedAccount) {
        const errorMessage = 'No account selected. Please select an account first.';
        setError(errorMessage);
        setIsLoading(false);
        return {
          status: 'error',
          message: errorMessage,
        };
      }

      const result = SignerService.addSigner(selectedAccount.id, signerData);

      if (result.status === 'success') {
        loadSignersForAccount(selectedAccount.id);
      } else {
        setError(result.message);
      }

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
  }, [selectedAccount, loadSignersForAccount]);

  /**
   * Stages an edit for an existing signer.
   *
   * @param {string} signerId - The signer ID to edit.
   * @param {Object} updates - The fields to update on the signer.
   * @returns {Object} Result object with status and message.
   */
  const editSigner = useCallback((signerId, updates) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!signerId || typeof signerId !== 'string') {
        const errorMessage = 'Signer ID is required.';
        setError(errorMessage);
        setIsLoading(false);
        return {
          status: 'error',
          message: errorMessage,
        };
      }

      const result = SignerService.editSigner(signerId, updates);

      if (result.status === 'success') {
        if (selectedAccount) {
          loadSignersForAccount(selectedAccount.id);
        }
      } else {
        setError(result.message);
      }

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
  }, [selectedAccount, loadSignersForAccount]);

  /**
   * Stages a removal for an existing signer.
   *
   * @param {string} signerId - The signer ID to remove.
   * @returns {Object} Result object with status and message.
   */
  const removeSigner = useCallback((signerId) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!signerId || typeof signerId !== 'string') {
        const errorMessage = 'Signer ID is required.';
        setError(errorMessage);
        setIsLoading(false);
        return {
          status: 'error',
          message: errorMessage,
        };
      }

      const result = SignerService.removeSigner(signerId);

      if (result.status === 'success') {
        if (selectedAccount) {
          loadSignersForAccount(selectedAccount.id);
        }
      } else {
        setError(result.message);
      }

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
  }, [selectedAccount, loadSignersForAccount]);

  /**
   * Finalizes all staged changes for the selected account.
   *
   * @returns {Object} Result object with status, message, and optionally referenceId.
   */
  const submitChanges = useCallback(() => {
    setIsLoading(true);
    setError(null);

    try {
      if (!selectedAccount) {
        const errorMessage = 'No account selected. Please select an account first.';
        setError(errorMessage);
        setIsLoading(false);
        return {
          status: 'error',
          message: errorMessage,
        };
      }

      const result = SignerService.submitChanges(selectedAccount.id);

      if (result.status === 'success') {
        loadSignersForAccount(selectedAccount.id);
      } else {
        setError(result.message);
      }

      setIsLoading(false);
      return result;
    } catch (_error) {
      const errorMessage = 'An unexpected error occurred while submitting changes. Please try again.';
      setError(errorMessage);
      setIsLoading(false);
      return {
        status: 'error',
        message: errorMessage,
      };
    }
  }, [selectedAccount, loadSignersForAccount]);

  /**
   * Discards all staged changes for the selected account.
   *
   * @returns {Object} Result object with status and message.
   */
  const clearChanges = useCallback(() => {
    setError(null);

    try {
      if (!selectedAccount) {
        return {
          status: 'error',
          message: 'No account selected. Please select an account first.',
        };
      }

      const result = SignerService.discardChanges(selectedAccount.id);

      if (result.status === 'success') {
        loadSignersForAccount(selectedAccount.id);
      } else {
        setError(result.message);
      }

      return result;
    } catch (_error) {
      const errorMessage = 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      return {
        status: 'error',
        message: errorMessage,
      };
    }
  }, [selectedAccount, loadSignersForAccount]);

  /**
   * Clears the current error message.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reloads signers for the currently selected account.
   */
  const refreshSigners = useCallback(() => {
    if (selectedAccount) {
      loadSignersForAccount(selectedAccount.id);
    }
  }, [selectedAccount, loadSignersForAccount]);

  const value = {
    selectedAccount,
    signers,
    stagedChanges,
    isLoading,
    error,
    selectAccount,
    addSigner,
    editSigner,
    removeSigner,
    submitChanges,
    clearChanges,
    clearError,
    refreshSigners,
  };

  return (
    <SignerContext.Provider value={value}>
      {children}
    </SignerContext.Provider>
  );
}

SignerProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Custom hook to access the signer management context.
 * Must be used within a SignerProvider.
 *
 * @returns {SignerContextValue} The signer context value.
 * @throws {Error} If used outside of a SignerProvider.
 */
function useSigners() {
  const context = useContext(SignerContext);

  if (context === null) {
    throw new Error('useSigners must be used within a SignerProvider.');
  }

  return context;
}

export { SignerProvider, useSigners };
export default SignerContext;