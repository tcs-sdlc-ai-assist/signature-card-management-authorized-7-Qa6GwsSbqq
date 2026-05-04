import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSigners } from '../context/SignerContext.jsx';
import Alert from '../components/common/Alert.jsx';
import Button from '../components/common/Button.jsx';
import ConfirmationModal from '../components/common/ConfirmationModal.jsx';
import UnlockService from '../services/UnlockService.js';
import ResendService from '../services/ResendService.js';
import AuditLogger from '../services/AuditLogger.js';
import { SIGNER_STATUSES } from '../constants/constants.js';

/**
 * Sort direction constants.
 * @readonly
 * @enum {string}
 */
const SORT_DIRECTIONS = {
  ASC: 'asc',
  DESC: 'desc',
};

/**
 * Sortable column keys.
 * @readonly
 * @enum {string}
 */
const SORT_COLUMNS = {
  NAME: 'name',
  ROLE: 'role',
  STATUS: 'status',
};

/**
 * Filter options for signer status.
 * @type {Array<{ value: string, label: string }>}
 */
const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: SIGNER_STATUSES.ACTIVE, label: SIGNER_STATUSES.ACTIVE },
  { value: SIGNER_STATUSES.PENDING, label: SIGNER_STATUSES.PENDING },
  { value: SIGNER_STATUSES.INACTIVE, label: SIGNER_STATUSES.INACTIVE },
  { value: SIGNER_STATUSES.REVOKED, label: SIGNER_STATUSES.REVOKED },
];

/**
 * Returns the full name string for a signer.
 * @param {Object} signer - The signer object.
 * @returns {string} The full name.
 */
const getSignerFullName = (signer) => {
  if (!signer) {
    return '';
  }

  const parts = [];
  if (signer.firstName) {
    parts.push(signer.firstName);
  }
  if (signer.middleName) {
    parts.push(signer.middleName);
  }
  if (signer.lastName) {
    parts.push(signer.lastName);
  }

  return parts.join(' ');
};

/**
 * Returns the badge class for a given signer status.
 * @param {string} status - The signer status.
 * @returns {string} The HB CSS badge class.
 */
const getStatusBadgeClass = (status) => {
  switch (status) {
    case SIGNER_STATUSES.ACTIVE:
      return 'hb-badge hb-badge-success';
    case SIGNER_STATUSES.PENDING:
      return 'hb-badge hb-badge-warning';
    case SIGNER_STATUSES.REVOKED:
      return 'hb-badge hb-badge-danger';
    case SIGNER_STATUSES.INACTIVE:
      return 'hb-badge hb-badge-primary';
    default:
      return 'hb-badge hb-badge-primary';
  }
};

/**
 * Comparator function for sorting signers.
 * @param {Object} a - First signer.
 * @param {Object} b - Second signer.
 * @param {string} column - The column to sort by.
 * @param {string} direction - The sort direction.
 * @returns {number} Comparison result.
 */
const compareSigner = (a, b, column, direction) => {
  let valA = '';
  let valB = '';

  switch (column) {
    case SORT_COLUMNS.NAME:
      valA = getSignerFullName(a).toLowerCase();
      valB = getSignerFullName(b).toLowerCase();
      break;
    case SORT_COLUMNS.ROLE:
      valA = (a.title || a.role || '').toLowerCase();
      valB = (b.title || b.role || '').toLowerCase();
      break;
    case SORT_COLUMNS.STATUS:
      valA = (a.status || '').toLowerCase();
      valB = (b.status || '').toLowerCase();
      break;
    default:
      valA = getSignerFullName(a).toLowerCase();
      valB = getSignerFullName(b).toLowerCase();
  }

  let result = 0;
  if (valA < valB) {
    result = -1;
  } else if (valA > valB) {
    result = 1;
  }

  return direction === SORT_DIRECTIONS.DESC ? -result : result;
};

/**
 * Consolidated signer management page for the selected account.
 * Displays all authorized signers in a sortable/filterable table with columns:
 * name, role/title, status, contact info. Action buttons per signer: Edit,
 * Remove, Unlock (for locked), Resend (for pending). Add Signer button at top.
 * Shows total signer count. Sorting by name/status/role. Filtering by status.
 * HB CSS table and grid styling.
 *
 * @returns {React.ReactElement} The rendered signer list screen component.
 */
function SignerListScreen() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, currentUser } = useAuth();
  const {
    selectedAccount,
    signers,
    isLoading: signerLoading,
    error: signerError,
    removeSigner,
    refreshSigners,
    clearError,
  } = useSigners();

  const [sortColumn, setSortColumn] = useState(SORT_COLUMNS.NAME);
  const [sortDirection, setSortDirection] = useState(SORT_DIRECTIONS.ASC);
  const [statusFilter, setStatusFilter] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Confirmation modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalAction, setConfirmModalAction] = useState(null);
  const [confirmModalLoading, setConfirmModalLoading] = useState(false);

  /**
   * Redirect if not authenticated.
   */
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  /**
   * Redirect if no account is selected.
   */
  useEffect(() => {
    if (!authLoading && isAuthenticated && !selectedAccount) {
      navigate('/accounts', { replace: true });
    }
  }, [isAuthenticated, authLoading, selectedAccount, navigate]);

  /**
   * Filtered and sorted signers list.
   */
  const filteredAndSortedSigners = useMemo(() => {
    let result = Array.isArray(signers) ? [...signers] : [];

    // Apply status filter
    if (statusFilter) {
      result = result.filter((signer) => signer.status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => compareSigner(a, b, sortColumn, sortDirection));

    return result;
  }, [signers, statusFilter, sortColumn, sortDirection]);

  /**
   * Handles column header click for sorting.
   * @param {string} column - The column key to sort by.
   */
  const handleSort = useCallback(
    (column) => {
      if (sortColumn === column) {
        setSortDirection((prev) =>
          prev === SORT_DIRECTIONS.ASC ? SORT_DIRECTIONS.DESC : SORT_DIRECTIONS.ASC,
        );
      } else {
        setSortColumn(column);
        setSortDirection(SORT_DIRECTIONS.ASC);
      }
    },
    [sortColumn],
  );

  /**
   * Handles status filter change.
   * @param {React.ChangeEvent<HTMLSelectElement>} event - The change event.
   */
  const handleStatusFilterChange = useCallback((event) => {
    setStatusFilter(event.target.value);
  }, []);

  /**
   * Returns the sort indicator character for a column header.
   * @param {string} column - The column key.
   * @returns {string} The sort indicator.
   */
  const getSortIndicator = useCallback(
    (column) => {
      if (sortColumn !== column) {
        return ' \u2195';
      }
      return sortDirection === SORT_DIRECTIONS.ASC ? ' \u2191' : ' \u2193';
    },
    [sortColumn, sortDirection],
  );

  /**
   * Navigates to the add signer flow.
   */
  const handleAddSigner = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  /**
   * Handles editing a signer.
   * @param {string} signerId - The signer ID to edit.
   */
  const handleEditSigner = useCallback(
    (signerId) => {
      if (!signerId) {
        return;
      }

      AuditLogger.logEvent('SIGNER_EDIT_INITIATED', {
        signerId,
        accountId: selectedAccount ? selectedAccount.id : 'unknown',
        userId: currentUser ? currentUser.id : 'unknown',
      });

      navigate(`/dashboard?edit=${signerId}`);
    },
    [navigate, selectedAccount, currentUser],
  );

  /**
   * Opens the remove signer confirmation modal.
   * @param {Object} signer - The signer object to remove.
   */
  const handleRemoveSignerClick = useCallback(
    (signer) => {
      if (!signer || !signer.id) {
        return;
      }

      const signerName = getSignerFullName(signer);

      setConfirmModalTitle('Remove Signer');
      setConfirmModalMessage(
        `Are you sure you want to remove ${signerName} from this account? This action will be staged for review.`,
      );
      setConfirmModalAction(() => () => {
        performRemoveSigner(signer.id, signerName);
      });
      setConfirmModalOpen(true);
    },
    [],
  );

  /**
   * Performs the signer removal after confirmation.
   * @param {string} signerId - The signer ID to remove.
   * @param {string} signerName - The signer name for messaging.
   */
  const performRemoveSigner = useCallback(
    (signerId, signerName) => {
      setConfirmModalLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const result = removeSigner(signerId);

        if (result && result.status === 'success') {
          setSuccessMessage(
            `${signerName} has been staged for removal.`,
          );

          AuditLogger.logEvent('SIGNER_REMOVE_INITIATED', {
            signerId,
            accountId: selectedAccount ? selectedAccount.id : 'unknown',
            userId: currentUser ? currentUser.id : 'unknown',
          });
        } else {
          const msg =
            result && result.message
              ? result.message
              : 'Failed to remove signer. Please try again.';
          setErrorMessage(msg);
        }
      } catch (_error) {
        setErrorMessage('An unexpected error occurred. Please try again.');
      } finally {
        setConfirmModalLoading(false);
        setConfirmModalOpen(false);
        setConfirmModalAction(null);
      }
    },
    [removeSigner, selectedAccount, currentUser],
  );

  /**
   * Handles unlocking a locked signer.
   * @param {Object} signer - The signer object to unlock.
   */
  const handleUnlockSigner = useCallback(
    (signer) => {
      if (!signer || !signer.id) {
        return;
      }

      setActionLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const result = UnlockService.unlockSigner(signer.id);

        if (result && result.status === 'success') {
          setSuccessMessage(result.message || `${getSignerFullName(signer)} unlock has been staged.`);
          refreshSigners();

          AuditLogger.logEvent('SIGNER_UNLOCK_INITIATED', {
            signerId: signer.id,
            accountId: selectedAccount ? selectedAccount.id : 'unknown',
            userId: currentUser ? currentUser.id : 'unknown',
            attemptsRemaining: result.attemptsRemaining,
          });
        } else {
          const msg =
            result && result.message
              ? result.message
              : 'Failed to unlock signer. Please try again.';
          setErrorMessage(msg);
        }
      } catch (_error) {
        setErrorMessage('An unexpected error occurred. Please try again.');
      } finally {
        setActionLoading(false);
      }
    },
    [refreshSigners, selectedAccount, currentUser],
  );

  /**
   * Handles resending an invitation for a pending signer.
   * @param {Object} signer - The signer object to resend invitation for.
   */
  const handleResendInvitation = useCallback(
    (signer) => {
      if (!signer || !signer.id) {
        return;
      }

      setActionLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const result = ResendService.resendInvitation(signer.id);

        if (result && result.status === 'success') {
          setSuccessMessage(
            result.message || `Invitation resent to ${getSignerFullName(signer)}.`,
          );

          AuditLogger.logEvent('SIGNER_RESEND_INITIATED', {
            signerId: signer.id,
            accountId: selectedAccount ? selectedAccount.id : 'unknown',
            userId: currentUser ? currentUser.id : 'unknown',
            attemptsRemaining: result.attemptsRemaining,
          });
        } else {
          const msg =
            result && result.message
              ? result.message
              : 'Failed to resend invitation. Please try again.';
          setErrorMessage(msg);
        }
      } catch (_error) {
        setErrorMessage('An unexpected error occurred. Please try again.');
      } finally {
        setActionLoading(false);
      }
    },
    [selectedAccount, currentUser],
  );

  /**
   * Handles confirmation modal confirm action.
   */
  const handleConfirmModalConfirm = useCallback(() => {
    if (typeof confirmModalAction === 'function') {
      confirmModalAction();
    }
  }, [confirmModalAction]);

  /**
   * Handles confirmation modal cancel action.
   */
  const handleConfirmModalCancel = useCallback(() => {
    setConfirmModalOpen(false);
    setConfirmModalAction(null);
    setConfirmModalLoading(false);
  }, []);

  /**
   * Dismisses the success message alert.
   */
  const handleDismissSuccess = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  /**
   * Dismisses the error message alert.
   */
  const handleDismissError = useCallback(() => {
    setErrorMessage(null);

    if (signerError) {
      clearError();
    }
  }, [signerError, clearError]);

  /**
   * Handles keyboard interaction on sortable column headers.
   * @param {React.KeyboardEvent} event - The keyboard event.
   * @param {string} column - The column key.
   */
  const handleSortKeyDown = useCallback(
    (event, column) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSort(column);
      }
    },
    [handleSort],
  );

  const displayError = errorMessage || signerError || null;

  if (!isAuthenticated && !authLoading) {
    return null;
  }

  if (!selectedAccount && !authLoading) {
    return null;
  }

  if (authLoading || signerLoading) {
    return (
      <main className="fluid-wrapper" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div
          className="hb-d-flex hb-justify-content-center hb-align-items-center"
          style={{ minHeight: '50vh' }}
          role="status"
          aria-live="polite"
          aria-label="Loading signers"
        >
          <span className="hb-spinner hb-spinner-lg" aria-hidden="true" />
          <span className="hb-sr-only">Loading signers, please wait.</span>
        </div>
      </main>
    );
  }

  const totalSignerCount = Array.isArray(signers) ? signers.length : 0;

  return (
    <main className="fluid-wrapper" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div className="hb-row hb-justify-content-center">
        <div className="hb-col-12 hb-col-lg-10">
          {/* Header */}
          <div
            className="hb-d-flex hb-justify-content-between hb-align-items-center hb-flex-wrap hb-gap-3"
            style={{ marginBottom: '1.5rem' }}
          >
            <div>
              <h1
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: 'var(--hb-primary, #00468b)',
                  margin: 0,
                  fontFamily: 'var(--hb-font-family, inherit)',
                }}
              >
                Authorized Signers
              </h1>
              {selectedAccount && (
                <p
                  className="hb-text-muted"
                  style={{
                    margin: '0.25rem 0 0 0',
                    fontSize: '0.9375rem',
                    fontFamily: 'var(--hb-font-family, inherit)',
                  }}
                >
                  {selectedAccount.accountName || 'Selected Account'} &mdash;{' '}
                  {selectedAccount.accountNumberMasked || '****'} &mdash;{' '}
                  {selectedAccount.accountType || 'N/A'}
                </p>
              )}
            </div>
            <div className="hb-d-flex hb-align-items-center hb-gap-2">
              <span
                className="hb-badge hb-badge-primary"
                style={{ fontSize: '0.875rem', padding: '0.35em 0.75em' }}
              >
                {totalSignerCount} Signer{totalSignerCount !== 1 ? 's' : ''}
              </span>
              <Button
                variant="primary"
                label="Add Signer"
                onClick={handleAddSigner}
                ariaLabel="Add a new signer to this account"
                disabled={actionLoading}
              />
            </div>
          </div>

          {/* Alerts */}
          {successMessage && (
            <Alert
              type="success"
              message={successMessage}
              dismissible={true}
              onDismiss={handleDismissSuccess}
            />
          )}

          {displayError && (
            <Alert
              type="error"
              message={displayError}
              dismissible={true}
              onDismiss={handleDismissError}
            />
          )}

          {/* Filter Controls */}
          <div
            className="hb-d-flex hb-align-items-center hb-gap-3 hb-flex-wrap"
            style={{ marginBottom: '1rem' }}
          >
            <div className="hb-d-flex hb-align-items-center hb-gap-2">
              <label
                htmlFor="status-filter"
                style={{
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  color: 'var(--hb-gray-700, #495057)',
                  fontFamily: 'var(--hb-font-family, inherit)',
                  whiteSpace: 'nowrap',
                }}
              >
                Filter by Status:
              </label>
              <select
                id="status-filter"
                className="hb-form-control"
                value={statusFilter}
                onChange={handleStatusFilterChange}
                aria-label="Filter signers by status"
                style={{
                  width: 'auto',
                  minWidth: '10rem',
                  height: '2.5rem',
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.9375rem',
                }}
              >
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="hb-text-muted hb-text-sm" style={{ fontFamily: 'var(--hb-font-family, inherit)' }}>
              Showing {filteredAndSortedSigners.length} of {totalSignerCount} signer
              {totalSignerCount !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Signer Table */}
          {filteredAndSortedSigners.length === 0 ? (
            <div
              className="hb-card"
              style={{ textAlign: 'center', padding: '2rem' }}
            >
              <div className="hb-card-body">
                <p
                  className="hb-text-muted"
                  style={{
                    fontSize: '1rem',
                    margin: 0,
                    fontFamily: 'var(--hb-font-family, inherit)',
                  }}
                >
                  {statusFilter
                    ? `No signers found with status "${statusFilter}".`
                    : 'No signers found for this account.'}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="hb-table hb-table-striped" aria-label="Authorized signers list">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      role="columnheader"
                      tabIndex={0}
                      onClick={() => handleSort(SORT_COLUMNS.NAME)}
                      onKeyDown={(e) => handleSortKeyDown(e, SORT_COLUMNS.NAME)}
                      aria-sort={
                        sortColumn === SORT_COLUMNS.NAME
                          ? sortDirection === SORT_DIRECTIONS.ASC
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                      style={{
                        cursor: 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Name{getSortIndicator(SORT_COLUMNS.NAME)}
                    </th>
                    <th
                      scope="col"
                      role="columnheader"
                      tabIndex={0}
                      onClick={() => handleSort(SORT_COLUMNS.ROLE)}
                      onKeyDown={(e) => handleSortKeyDown(e, SORT_COLUMNS.ROLE)}
                      aria-sort={
                        sortColumn === SORT_COLUMNS.ROLE
                          ? sortDirection === SORT_DIRECTIONS.ASC
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                      style={{
                        cursor: 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Role / Title{getSortIndicator(SORT_COLUMNS.ROLE)}
                    </th>
                    <th
                      scope="col"
                      role="columnheader"
                      tabIndex={0}
                      onClick={() => handleSort(SORT_COLUMNS.STATUS)}
                      onKeyDown={(e) => handleSortKeyDown(e, SORT_COLUMNS.STATUS)}
                      aria-sort={
                        sortColumn === SORT_COLUMNS.STATUS
                          ? sortDirection === SORT_DIRECTIONS.ASC
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                      style={{
                        cursor: 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Status{getSortIndicator(SORT_COLUMNS.STATUS)}
                    </th>
                    <th scope="col" style={{ whiteSpace: 'nowrap' }}>
                      Contact
                    </th>
                    <th scope="col" style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedSigners.map((signer) => {
                    const fullName = getSignerFullName(signer);
                    const isLocked = signer.isLocked === true;
                    const isPending = signer.status === SIGNER_STATUSES.PENDING;
                    const isRevoked = signer.status === SIGNER_STATUSES.REVOKED;

                    return (
                      <tr key={signer.id}>
                        <td
                          style={{
                            fontWeight: 500,
                            color: 'var(--hb-black, #292929)',
                            fontFamily: 'var(--hb-font-family, inherit)',
                          }}
                        >
                          {fullName || 'N/A'}
                          {isLocked && (
                            <span
                              className="hb-badge hb-badge-danger"
                              style={{ marginLeft: '0.5rem', fontSize: '0.6875rem' }}
                            >
                              Locked
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            color: 'var(--hb-gray-700, #495057)',
                            fontFamily: 'var(--hb-font-family, inherit)',
                          }}
                        >
                          <div>{signer.title || 'N/A'}</div>
                          {signer.role && signer.role !== signer.title && (
                            <div
                              className="hb-text-muted hb-text-sm"
                              style={{ marginTop: '0.125rem' }}
                            >
                              {signer.role}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={getStatusBadgeClass(signer.status)}>
                            {signer.status || 'Unknown'}
                          </span>
                        </td>
                        <td
                          style={{
                            fontSize: '0.875rem',
                            color: 'var(--hb-gray-700, #495057)',
                            fontFamily: 'var(--hb-font-family, inherit)',
                          }}
                        >
                          {signer.email && (
                            <div style={{ marginBottom: '0.125rem' }}>{signer.email}</div>
                          )}
                          {signer.phone && <div>{signer.phone}</div>}
                          {!signer.email && !signer.phone && (
                            <span className="hb-text-muted">N/A</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div
                            className="hb-d-inline-flex hb-gap-1 hb-flex-wrap"
                            style={{ justifyContent: 'flex-end' }}
                          >
                            <Button
                              variant="secondary"
                              label="Edit"
                              onClick={() => handleEditSigner(signer.id)}
                              ariaLabel={`Edit ${fullName}`}
                              disabled={actionLoading || isRevoked}
                              className="hb-text-sm"
                            />
                            <Button
                              variant="secondary"
                              label="Remove"
                              onClick={() => handleRemoveSignerClick(signer)}
                              ariaLabel={`Remove ${fullName}`}
                              disabled={actionLoading}
                              className="hb-text-sm"
                            />
                            {isLocked && (
                              <Button
                                variant="primary"
                                label="Unlock"
                                onClick={() => handleUnlockSigner(signer)}
                                ariaLabel={`Unlock ${fullName}`}
                                disabled={actionLoading}
                                className="hb-text-sm"
                              />
                            )}
                            {isPending && (
                              <Button
                                variant="primary"
                                label="Resend"
                                onClick={() => handleResendInvitation(signer)}
                                ariaLabel={`Resend invitation to ${fullName}`}
                                disabled={actionLoading}
                                className="hb-text-sm"
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Screen reader live region for sort/filter changes */}
          <div className="hb-sr-only" aria-live="polite" aria-atomic="true">
            {`Showing ${filteredAndSortedSigners.length} of ${totalSignerCount} signers. Sorted by ${sortColumn} ${sortDirection === SORT_DIRECTIONS.ASC ? 'ascending' : 'descending'}.${statusFilter ? ` Filtered by status: ${statusFilter}.` : ''}`}
          </div>

          {/* Back to accounts link */}
          <div style={{ marginTop: '1.5rem' }}>
            <Button
              variant="secondary"
              label="\u00AB Back to Accounts"
              onClick={() => navigate('/accounts')}
              ariaLabel="Go back to account selection"
            />
          </div>
        </div>
      </div>

      {/* Remove Signer Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModalOpen}
        onConfirm={handleConfirmModalConfirm}
        onCancel={handleConfirmModalCancel}
        title={confirmModalTitle}
        message={confirmModalMessage}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        loading={confirmModalLoading}
      />
    </main>
  );
}

export default SignerListScreen;