import { STORAGE_KEYS } from '../constants/constants.js';
import { getItem, setItem } from '../utils/storage.js';
import { generateUUID, deepClone, sanitizeInput } from '../utils/helpers.js';
import AuditLogger from './AuditLogger.js';
import { MOCK_SIGNERS } from '../constants/mockData.js';

/**
 * localStorage key for persisted signer data.
 * @type {string}
 */
const SIGNER_STORE_KEY = 'sig_signers';

/**
 * localStorage key for staged changes.
 * @type {string}
 */
const STAGED_CHANGES_KEY = 'sig_staged_changes';

/**
 * Initializes the signers store in localStorage with mock data if not already present.
 * @returns {Array<Object>} The current signers array from localStorage.
 */
const initializeSigners = () => {
  try {
    const existingSigners = getItem(SIGNER_STORE_KEY, null);

    if (Array.isArray(existingSigners) && existingSigners.length > 0) {
      return existingSigners;
    }

    const signers = MOCK_SIGNERS.map((signer) => ({ ...signer }));
    setItem(SIGNER_STORE_KEY, signers);
    return signers;
  } catch (_error) {
    return [];
  }
};

/**
 * Retrieves all signers from localStorage, initializing if necessary.
 * @returns {Array<Object>} The array of signer objects.
 */
const getSignersFromStore = () => {
  try {
    const signers = getItem(SIGNER_STORE_KEY, null);

    if (Array.isArray(signers) && signers.length > 0) {
      return signers;
    }

    return initializeSigners();
  } catch (_error) {
    return initializeSigners();
  }
};

/**
 * Persists the signers array to localStorage.
 * @param {Array<Object>} signers - The updated signers array.
 * @returns {boolean} True if saved successfully.
 */
const saveSigners = (signers) => {
  try {
    return setItem(SIGNER_STORE_KEY, signers);
  } catch (_error) {
    return false;
  }
};

/**
 * Retrieves all staged changes from localStorage.
 * @returns {Array<Object>} The array of staged change objects.
 */
const getStagedChangesFromStore = () => {
  try {
    const changes = getItem(STAGED_CHANGES_KEY, []);

    if (Array.isArray(changes)) {
      return changes;
    }

    return [];
  } catch (_error) {
    return [];
  }
};

/**
 * Persists the staged changes array to localStorage.
 * @param {Array<Object>} changes - The updated staged changes array.
 * @returns {boolean} True if saved successfully.
 */
const saveStagedChanges = (changes) => {
  try {
    return setItem(STAGED_CHANGES_KEY, changes);
  } catch (_error) {
    return false;
  }
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
 * Generates a reference ID for submitted changes.
 * @returns {string} A reference ID string.
 */
const generateReferenceId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `REF-${timestamp}-${random}`;
};

/**
 * Signer CRUD and staged change management service for the SIG Card Management application.
 * Provides methods to retrieve, add, edit, and remove signers on accounts.
 * Changes are staged before being finalized via submitChanges. All actions
 * are logged via AuditLogger.
 *
 * @namespace SignerService
 */
const SignerService = {
  /**
   * Retrieves all signers for a given account ID.
   *
   * @param {string} accountId - The account ID to retrieve signers for.
   * @returns {Array<Object>} An array of signer objects for the account.
   */
  getSigners(accountId) {
    if (!accountId || typeof accountId !== 'string') {
      return [];
    }

    try {
      initializeSigners();

      const signers = getSignersFromStore();

      if (!Array.isArray(signers)) {
        return [];
      }

      const accountSigners = signers.filter(
        (signer) => signer.accountId === accountId.trim(),
      );

      const cloned = accountSigners.map((signer) => deepClone(signer));

      AuditLogger.logEvent('SIGNERS_ACCESSED', {
        accountId: sanitizeInput(accountId),
        signerCount: cloned.length,
      });

      return cloned;
    } catch (_error) {
      return [];
    }
  },

  /**
   * Retrieves a single signer by their signer ID.
   *
   * @param {string} signerId - The signer ID to look up.
   * @returns {Object|null} The signer object, or null if not found.
   */
  getSignerById(signerId) {
    if (!signerId || typeof signerId !== 'string') {
      return null;
    }

    try {
      initializeSigners();

      const signers = getSignersFromStore();

      if (!Array.isArray(signers)) {
        return null;
      }

      const signer = signers.find((s) => s.id === signerId.trim());

      if (!signer) {
        return null;
      }

      return deepClone(signer);
    } catch (_error) {
      return null;
    }
  },

  /**
   * Adds a new signer to the pending staged changes for an account.
   * The signer is not persisted to the main store until submitChanges is called.
   *
   * @param {string} accountId - The account ID to add the signer to.
   * @param {Object} signerData - The signer data object.
   * @returns {Object} Result object with status, message, and optionally signerId.
   */
  addSigner(accountId, signerData) {
    if (!accountId || typeof accountId !== 'string') {
      return {
        status: 'error',
        message: 'Account ID is required.',
      };
    }

    if (!signerData || typeof signerData !== 'object') {
      return {
        status: 'error',
        message: 'Signer data is required.',
      };
    }

    if (
      !signerData.firstName ||
      typeof signerData.firstName !== 'string' ||
      signerData.firstName.trim().length === 0
    ) {
      return {
        status: 'error',
        message: 'Signer first name is required.',
      };
    }

    if (
      !signerData.lastName ||
      typeof signerData.lastName !== 'string' ||
      signerData.lastName.trim().length === 0
    ) {
      return {
        status: 'error',
        message: 'Signer last name is required.',
      };
    }

    try {
      const signerId = generateUUID();
      const now = new Date().toISOString();

      const newSigner = {
        id: signerId,
        accountId: accountId.trim(),
        firstName: sanitizeInput(signerData.firstName.trim()),
        lastName: sanitizeInput(signerData.lastName.trim()),
        middleName: signerData.middleName
          ? sanitizeInput(signerData.middleName.trim())
          : '',
        title: signerData.title ? sanitizeInput(signerData.title.trim()) : '',
        role: signerData.role ? sanitizeInput(signerData.role.trim()) : '',
        status: signerData.status || 'Pending',
        email: signerData.email ? sanitizeInput(signerData.email.trim()) : '',
        phone: signerData.phone ? sanitizeInput(signerData.phone.trim()) : '',
        ssn: signerData.ssn || '',
        dateOfBirth: signerData.dateOfBirth || '',
        address: signerData.address
          ? deepClone(signerData.address)
          : { street: '', city: '', state: '', zip: '' },
        verificationMethod: signerData.verificationMethod || '',
        verificationStatus: 'Pending',
        isLocked: false,
        signatureOnFile: false,
        addedDate: now,
        createdAt: now,
        updatedAt: now,
      };

      const stagedChange = {
        id: generateUUID(),
        type: 'add',
        accountId: accountId.trim(),
        signerId,
        signerData: deepClone(newSigner),
        createdAt: now,
        createdBy: getCurrentUserId() || 'anonymous',
      };

      const changes = getStagedChangesFromStore();
      changes.push(stagedChange);
      const saved = saveStagedChanges(changes);

      if (!saved) {
        return {
          status: 'error',
          message: 'Failed to stage signer addition. Please try again.',
        };
      }

      AuditLogger.logEvent('SIGNER_ADD_STAGED', {
        accountId: sanitizeInput(accountId),
        signerId,
        signerName: `${newSigner.firstName} ${newSigner.lastName}`,
      });

      return {
        status: 'success',
        message: 'Signer has been added to pending changes.',
        signerId,
      };
    } catch (_error) {
      return {
        status: 'error',
        message: 'An unexpected error occurred. Please try again.',
      };
    }
  },

  /**
   * Stages an edit for an existing signer. The edit is not applied to the
   * main store until submitChanges is called.
   *
   * @param {string} signerId - The signer ID to edit.
   * @param {Object} updates - The fields to update on the signer.
   * @returns {Object} Result object with status and message.
   */
  editSigner(signerId, updates) {
    if (!signerId || typeof signerId !== 'string') {
      return {
        status: 'error',
        message: 'Signer ID is required.',
      };
    }

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return {
        status: 'error',
        message: 'Update data is required.',
      };
    }

    try {
      initializeSigners();

      const signers = getSignersFromStore();
      const existingSigner = signers.find((s) => s.id === signerId.trim());

      // Also check staged additions
      const stagedChanges = getStagedChangesFromStore();
      const stagedAdd = stagedChanges.find(
        (c) => c.type === 'add' && c.signerId === signerId.trim(),
      );

      if (!existingSigner && !stagedAdd) {
        return {
          status: 'error',
          message: 'Signer not found.',
        };
      }

      const now = new Date().toISOString();
      const accountId = existingSigner
        ? existingSigner.accountId
        : stagedAdd.accountId;

      // Sanitize string fields in updates
      const sanitizedUpdates = {};
      for (const key of Object.keys(updates)) {
        if (key === 'id' || key === 'accountId' || key === 'createdAt') {
          continue;
        }

        if (typeof updates[key] === 'string') {
          sanitizedUpdates[key] = sanitizeInput(updates[key].trim());
        } else if (typeof updates[key] === 'object' && updates[key] !== null) {
          sanitizedUpdates[key] = deepClone(updates[key]);
        } else {
          sanitizedUpdates[key] = updates[key];
        }
      }

      sanitizedUpdates.updatedAt = now;

      const stagedChange = {
        id: generateUUID(),
        type: 'edit',
        accountId,
        signerId: signerId.trim(),
        updates: sanitizedUpdates,
        before: existingSigner ? deepClone(existingSigner) : null,
        createdAt: now,
        createdBy: getCurrentUserId() || 'anonymous',
      };

      const changes = getStagedChangesFromStore();
      changes.push(stagedChange);
      const saved = saveStagedChanges(changes);

      if (!saved) {
        return {
          status: 'error',
          message: 'Failed to stage signer edit. Please try again.',
        };
      }

      AuditLogger.logEvent('SIGNER_EDIT_STAGED', {
        signerId: sanitizeInput(signerId),
        accountId: sanitizeInput(accountId),
        updatedFields: Object.keys(sanitizedUpdates),
      });

      return {
        status: 'success',
        message: 'Signer edit has been staged.',
      };
    } catch (_error) {
      return {
        status: 'error',
        message: 'An unexpected error occurred. Please try again.',
      };
    }
  },

  /**
   * Stages a removal for an existing signer. Prevents removal if the signer
   * is the last signer on the account.
   *
   * @param {string} signerId - The signer ID to remove.
   * @returns {Object} Result object with status and message.
   */
  removeSigner(signerId) {
    if (!signerId || typeof signerId !== 'string') {
      return {
        status: 'error',
        message: 'Signer ID is required.',
      };
    }

    try {
      initializeSigners();

      const signers = getSignersFromStore();
      const existingSigner = signers.find((s) => s.id === signerId.trim());

      // Also check staged additions
      const stagedChanges = getStagedChangesFromStore();
      const stagedAdd = stagedChanges.find(
        (c) => c.type === 'add' && c.signerId === signerId.trim(),
      );

      if (!existingSigner && !stagedAdd) {
        return {
          status: 'error',
          message: 'Signer not found.',
        };
      }

      const accountId = existingSigner
        ? existingSigner.accountId
        : stagedAdd.accountId;

      // Count current signers on the account (persisted + staged adds - staged removals)
      const persistedSigners = signers.filter((s) => s.accountId === accountId);
      const stagedAdds = stagedChanges.filter(
        (c) => c.type === 'add' && c.accountId === accountId,
      );
      const stagedRemovals = stagedChanges.filter(
        (c) => c.type === 'remove' && c.accountId === accountId,
      );

      const effectiveCount =
        persistedSigners.length + stagedAdds.length - stagedRemovals.length;

      if (effectiveCount <= 1) {
        return {
          status: 'error',
          message: 'Cannot remove the last signer on an account. At least one signer is required.',
        };
      }

      // Check if already staged for removal
      const alreadyStaged = stagedChanges.find(
        (c) => c.type === 'remove' && c.signerId === signerId.trim(),
      );

      if (alreadyStaged) {
        return {
          status: 'error',
          message: 'This signer is already staged for removal.',
        };
      }

      const now = new Date().toISOString();

      const stagedChange = {
        id: generateUUID(),
        type: 'remove',
        accountId,
        signerId: signerId.trim(),
        before: existingSigner ? deepClone(existingSigner) : null,
        createdAt: now,
        createdBy: getCurrentUserId() || 'anonymous',
      };

      const changes = getStagedChangesFromStore();
      changes.push(stagedChange);
      const saved = saveStagedChanges(changes);

      if (!saved) {
        return {
          status: 'error',
          message: 'Failed to stage signer removal. Please try again.',
        };
      }

      AuditLogger.logEvent('SIGNER_REMOVE_STAGED', {
        signerId: sanitizeInput(signerId),
        accountId: sanitizeInput(accountId),
      });

      return {
        status: 'success',
        message: 'Signer removal has been staged.',
      };
    } catch (_error) {
      return {
        status: 'error',
        message: 'An unexpected error occurred. Please try again.',
      };
    }
  },

  /**
   * Returns all pending staged changes.
   * Optionally filtered by account ID.
   *
   * @param {string} [accountId] - Optional account ID to filter staged changes.
   * @returns {Array<Object>} An array of staged change objects.
   */
  getStagedChanges(accountId) {
    try {
      const changes = getStagedChangesFromStore();

      if (!Array.isArray(changes)) {
        return [];
      }

      if (accountId && typeof accountId === 'string') {
        return changes
          .filter((c) => c.accountId === accountId.trim())
          .map((c) => deepClone(c));
      }

      return changes.map((c) => deepClone(c));
    } catch (_error) {
      return [];
    }
  },

  /**
   * Finalizes all staged changes for a given account ID.
   * Applies additions, edits, and removals to the main signer store,
   * generates a reference ID, and clears the staged changes for the account.
   *
   * @param {string} accountId - The account ID to submit changes for.
   * @returns {Object} Result object with status, message, and optionally referenceId.
   */
  submitChanges(accountId) {
    if (!accountId || typeof accountId !== 'string') {
      return {
        status: 'error',
        message: 'Account ID is required.',
      };
    }

    try {
      initializeSigners();

      const allChanges = getStagedChangesFromStore();
      const accountChanges = allChanges.filter(
        (c) => c.accountId === accountId.trim(),
      );

      if (accountChanges.length === 0) {
        return {
          status: 'error',
          message: 'No staged changes found for this account.',
        };
      }

      const signers = getSignersFromStore();
      const now = new Date().toISOString();
      const referenceId = generateReferenceId();

      // Process additions
      const additions = accountChanges.filter((c) => c.type === 'add');
      for (const addition of additions) {
        if (addition.signerData) {
          const newSigner = {
            ...deepClone(addition.signerData),
            updatedAt: now,
          };
          signers.push(newSigner);
        }
      }

      // Process edits
      const edits = accountChanges.filter((c) => c.type === 'edit');
      for (const edit of edits) {
        const index = signers.findIndex((s) => s.id === edit.signerId);

        if (index !== -1 && edit.updates) {
          signers[index] = {
            ...signers[index],
            ...edit.updates,
            updatedAt: now,
          };
        }
      }

      // Process removals
      const removals = accountChanges.filter((c) => c.type === 'remove');
      const removalIds = removals.map((r) => r.signerId);

      // Verify we won't remove all signers
      const remainingSigners = signers.filter(
        (s) => s.accountId === accountId.trim() && !removalIds.includes(s.id),
      );

      if (remainingSigners.length === 0 && removals.length > 0) {
        return {
          status: 'error',
          message: 'Cannot remove all signers from an account. At least one signer is required.',
        };
      }

      // Apply removals
      const updatedSigners = signers.filter(
        (s) => !(s.accountId === accountId.trim() && removalIds.includes(s.id)),
      );

      // Also remove signers from other accounts that are not affected
      const otherSigners = signers.filter((s) => s.accountId !== accountId.trim());
      const accountSignersAfter = updatedSigners.filter(
        (s) => s.accountId === accountId.trim(),
      );
      const finalSigners = [...otherSigners, ...accountSignersAfter];

      const signersSaved = saveSigners(finalSigners);

      if (!signersSaved) {
        return {
          status: 'error',
          message: 'Failed to save signer changes. Please try again.',
        };
      }

      // Clear staged changes for this account, keep others
      const remainingChanges = allChanges.filter(
        (c) => c.accountId !== accountId.trim(),
      );
      saveStagedChanges(remainingChanges);

      AuditLogger.logEvent(
        'SIGNER_CHANGES_SUBMITTED',
        {
          accountId: sanitizeInput(accountId),
          referenceId,
          additionsCount: additions.length,
          editsCount: edits.length,
          removalsCount: removals.length,
          totalChanges: accountChanges.length,
          submittedBy: getCurrentUserId() || 'anonymous',
        },
      );

      return {
        status: 'success',
        message: 'All changes have been submitted successfully.',
        referenceId,
      };
    } catch (_error) {
      return {
        status: 'error',
        message: 'An unexpected error occurred while submitting changes. Please try again.',
      };
    }
  },

  /**
   * Clears all staged changes for a given account ID without applying them.
   *
   * @param {string} accountId - The account ID to discard changes for.
   * @returns {Object} Result object with status and message.
   */
  discardChanges(accountId) {
    if (!accountId || typeof accountId !== 'string') {
      return {
        status: 'error',
        message: 'Account ID is required.',
      };
    }

    try {
      const allChanges = getStagedChangesFromStore();
      const remainingChanges = allChanges.filter(
        (c) => c.accountId !== accountId.trim(),
      );

      const saved = saveStagedChanges(remainingChanges);

      if (!saved) {
        return {
          status: 'error',
          message: 'Failed to discard changes. Please try again.',
        };
      }

      AuditLogger.logEvent('SIGNER_CHANGES_DISCARDED', {
        accountId: sanitizeInput(accountId),
        discardedCount: allChanges.length - remainingChanges.length,
      });

      return {
        status: 'success',
        message: 'Staged changes have been discarded.',
      };
    } catch (_error) {
      return {
        status: 'error',
        message: 'An unexpected error occurred. Please try again.',
      };
    }
  },

  /**
   * Clears all staged changes across all accounts.
   *
   * @returns {boolean} True if all staged changes were cleared successfully.
   */
  clearAllStagedChanges() {
    try {
      const success = saveStagedChanges([]);

      if (success) {
        AuditLogger.logEvent('ALL_STAGED_CHANGES_CLEARED', {});
      }

      return success;
    } catch (_error) {
      return false;
    }
  },

  /**
   * Initializes the signer service by ensuring mock signers
   * are loaded into localStorage.
   *
   * @returns {boolean} True if initialization was successful.
   */
  initialize() {
    try {
      initializeSigners();
      return true;
    } catch (_error) {
      return false;
    }
  },
};

export default SignerService;