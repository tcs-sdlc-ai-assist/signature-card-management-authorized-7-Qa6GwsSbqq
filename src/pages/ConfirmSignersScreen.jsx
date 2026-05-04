import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSigners } from '../context/SignerContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import Alert from '../components/common/Alert.jsx';
import Button from '../components/common/Button.jsx';
import AuditLogger from '../services/AuditLogger.js';

/**
 * Returns a human-readable label for a staged change type.
 * @param {string} type - The change type ('add', 'edit', 'remove').
 * @returns {string} The display label.
 */
const getChangeTypeLabel = (type) => {
  switch (type) {
    case 'add':
      return 'Added';
    case 'edit':
      return 'Edited';
    case 'remove':
      return 'Removed';
    default:
      return 'Changed';
  }
};

/**
 * Returns the HB CSS badge class for a staged change type.
 * @param {string} type - The change type ('add', 'edit', 'remove').
 * @returns {string} The badge class string.
 */
const getChangeBadgeClass = (type) => {
  switch (type) {
    case 'add':
      return 'hb-badge hb-badge-success';
    case 'edit':
      return 'hb-badge hb-badge-warning';
    case 'remove':
      return 'hb-badge hb-badge-danger';
    default:
      return 'hb-badge hb-badge-primary';
  }
};

/**
 * Returns the border color for a staged change row.
 * @param {string} type - The change type ('add', 'edit', 'remove').
 * @returns {string} The CSS border-left color value.
 */
const getChangeBorderColor = (type) => {
  switch (type) {
    case 'add':
      return 'var(--hb-success, #388e3c)';
    case 'edit':
      return 'var(--hb-warning, #f57c00)';
    case 'remove':
      return 'var(--hb-danger, #d32f2f)';
    default:
      return 'var(--hb-primary, #00468b)';
  }
};

/**
 * Extracts the signer display name from a staged change object.
 * @param {Object} change - The staged change object.
 * @param {Array<Object>} signers - The current signers list from context.
 * @returns {string} The signer's full name.
 */
const getSignerName = (change, signers) => {
  if (!change) {
    return 'Unknown Signer';
  }

  // For additions, the signer data is in change.signerData
  if (change.type === 'add' && change.signerData) {
    const parts = [];
    if (change.signerData.firstName) {
      parts.push(change.signerData.firstName);
    }
    if (change.signerData.middleName) {
      parts.push(change.signerData.middleName);
    }
    if (change.signerData.lastName) {
      parts.push(change.signerData.lastName);
    }
    return parts.length > 0 ? parts.join(' ') : 'Unknown Signer';
  }

  // For edits and removals, look up the signer by ID from the before state or signers list
  if (change.before) {
    const parts = [];
    if (change.before.firstName) {
      parts.push(change.before.firstName);
    }
    if (change.before.middleName) {
      parts.push(change.before.middleName);
    }
    if (change.before.lastName) {
      parts.push(change.before.lastName);
    }
    if (parts.length > 0) {
      return parts.join(' ');
    }
  }

  // Fall back to looking up in the signers array
  if (change.signerId && Array.isArray(signers)) {
    const signer = signers.find((s) => s.id === change.signerId);
    if (signer) {
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
      if (parts.length > 0) {
        return parts.join(' ');
      }
    }
  }

  return 'Unknown Signer';
};

/**
 * Extracts the signer title/role from a staged change object.
 * @param {Object} change - The staged change object.
 * @param {Array<Object>} signers - The current signers list from context.
 * @returns {string} The signer's title or role.
 */
const getSignerTitle = (change, signers) => {
  if (!change) {
    return '';
  }

  if (change.type === 'add' && change.signerData) {
    return change.signerData.title || change.signerData.role || '';
  }

  if (change.type === 'edit' && change.updates && change.updates.title) {
    return change.updates.title;
  }

  if (change.before) {
    return change.before.title || change.before.role || '';
  }

  if (change.signerId && Array.isArray(signers)) {
    const signer = signers.find((s) => s.id === change.signerId);
    if (signer) {
      return signer.title || signer.role || '';
    }
  }

  return '';
};

/**
 * Returns a description of what changed for an edit-type change.
 * @param {Object} change - The staged change object.
 * @returns {string} A comma-separated list of changed field names.
 */
const getEditDescription = (change) => {
  if (!change || change.type !== 'edit' || !change.updates) {
    return '';
  }

  const fields = Object.keys(change.updates).filter(
    (key) => key !== 'updatedAt' && key !== 'status',
  );

  if (fields.length === 0) {
    return 'Status updated';
  }

  return `Changed: ${fields.join(', ')}`;
};

/**
 * Confirm Signers page displaying summary of all staged changes:
 * added signers (green), edited signers (yellow), removed signers (red).
 * Each change shows signer name and change type. Provides 'Go Back' button
 * to return to signer management and 'Continue to Review' button to proceed.
 * HB CSS styling with change indicators.
 *
 * @returns {React.ReactElement} The rendered confirm signers screen component.
 */
function ConfirmSignersScreen() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, currentUser } = useAuth();
  const {
    selectedAccount,
    signers,
    stagedChanges,
    isLoading: signerLoading,
    error: signerError,
    clearError,
  } = useSigners();

  const [error, setError] = useState(null);

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
   * Categorized staged changes.
   */
  const categorizedChanges = useMemo(() => {
    if (!Array.isArray(stagedChanges) || stagedChanges.length === 0) {
      return { additions: [], edits: [], removals: [], total: 0 };
    }

    const accountId = selectedAccount ? selectedAccount.id : null;

    const relevantChanges = accountId
      ? stagedChanges.filter((c) => c.accountId === accountId)
      : stagedChanges;

    const additions = relevantChanges.filter((c) => c.type === 'add');
    const edits = relevantChanges.filter((c) => c.type === 'edit');
    const removals = relevantChanges.filter((c) => c.type === 'remove');

    return {
      additions,
      edits,
      removals,
      total: relevantChanges.length,
    };
  }, [stagedChanges, selectedAccount]);

  /**
   * Handles navigating back to the signer list.
   */
  const handleGoBack = useCallback(() => {
    navigate('/signers', { replace: true });
  }, [navigate]);

  /**
   * Handles continuing to the review step.
   */
  const handleContinueToReview = useCallback(() => {
    if (categorizedChanges.total === 0) {
      setError('No staged changes to review. Please add, edit, or remove signers first.');
      return;
    }

    AuditLogger.logEvent('CONFIRM_SIGNERS_PROCEED', {
      accountId: selectedAccount ? selectedAccount.id : 'unknown',
      userId: currentUser ? currentUser.id : 'unknown',
      additionsCount: categorizedChanges.additions.length,
      editsCount: categorizedChanges.edits.length,
      removalsCount: categorizedChanges.removals.length,
    });

    navigate('/review', { replace: true });
  }, [categorizedChanges, selectedAccount, currentUser, navigate]);

  /**
   * Dismisses the error alert.
   */
  const handleDismissError = useCallback(() => {
    setError(null);

    if (signerError) {
      clearError();
    }
  }, [signerError, clearError]);

  const displayError = error || signerError || null;

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
          aria-label="Loading"
        >
          <span className="hb-spinner hb-spinner-lg" aria-hidden="true" />
          <span className="hb-sr-only">Loading, please wait.</span>
        </div>
      </main>
    );
  }

  return (
    <main className="fluid-wrapper" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div className="hb-row hb-justify-content-center">
        <div className="hb-col-12 hb-col-md-10 hb-col-lg-8">
          {/* Header */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--hb-primary, #00468b)',
                margin: 0,
                fontFamily: 'var(--hb-font-family, inherit)',
              }}
            >
              Confirm Signer Changes
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

          {/* Alerts */}
          {displayError && (
            <Alert
              type="error"
              message={displayError}
              dismissible={true}
              onDismiss={handleDismissError}
            />
          )}

          {/* Summary Badges */}
          <div
            className="hb-d-flex hb-align-items-center hb-gap-3 hb-flex-wrap hb-mb-4"
          >
            <span
              className="hb-badge hb-badge-primary"
              style={{ fontSize: '0.875rem', padding: '0.35em 0.75em' }}
            >
              {categorizedChanges.total} Total Change{categorizedChanges.total !== 1 ? 's' : ''}
            </span>
            {categorizedChanges.additions.length > 0 && (
              <span
                className="hb-badge hb-badge-success"
                style={{ fontSize: '0.875rem', padding: '0.35em 0.75em' }}
              >
                {categorizedChanges.additions.length} Added
              </span>
            )}
            {categorizedChanges.edits.length > 0 && (
              <span
                className="hb-badge hb-badge-warning"
                style={{ fontSize: '0.875rem', padding: '0.35em 0.75em' }}
              >
                {categorizedChanges.edits.length} Edited
              </span>
            )}
            {categorizedChanges.removals.length > 0 && (
              <span
                className="hb-badge hb-badge-danger"
                style={{ fontSize: '0.875rem', padding: '0.35em 0.75em' }}
              >
                {categorizedChanges.removals.length} Removed
              </span>
            )}
          </div>

          {/* No Changes State */}
          {categorizedChanges.total === 0 && (
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
                  No staged changes found. Please go back and add, edit, or remove signers before
                  continuing.
                </p>
              </div>
            </div>
          )}

          {/* Added Signers Section */}
          {categorizedChanges.additions.length > 0 && (
            <div className="hb-card hb-mb-4">
              <div
                className="hb-card-header"
                style={{
                  borderLeft: `4px solid var(--hb-success, #388e3c)`,
                }}
              >
                <h2
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'var(--hb-success, #388e3c)',
                    margin: 0,
                    fontFamily: 'var(--hb-font-family, inherit)',
                  }}
                >
                  Signers to Add ({categorizedChanges.additions.length})
                </h2>
              </div>
              <div className="hb-card-body" style={{ padding: 0 }}>
                {categorizedChanges.additions.map((change) => {
                  const signerName = getSignerName(change, signers);
                  const signerTitle = getSignerTitle(change, signers);

                  return (
                    <div
                      key={change.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1.25rem',
                        borderBottom: '1px solid var(--hb-gray-200, #e9ecef)',
                        borderLeft: `4px solid ${getChangeBorderColor('add')}`,
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontWeight: 500,
                            color: 'var(--hb-black, #292929)',
                            fontFamily: 'var(--hb-font-family, inherit)',
                          }}
                        >
                          {signerName}
                        </span>
                        {signerTitle && (
                          <span
                            className="hb-text-muted"
                            style={{
                              marginLeft: '0.5rem',
                              fontSize: '0.875rem',
                              fontFamily: 'var(--hb-font-family, inherit)',
                            }}
                          >
                            &mdash; {signerTitle}
                          </span>
                        )}
                      </div>
                      <span className={getChangeBadgeClass('add')}>
                        {getChangeTypeLabel('add')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Edited Signers Section */}
          {categorizedChanges.edits.length > 0 && (
            <div className="hb-card hb-mb-4">
              <div
                className="hb-card-header"
                style={{
                  borderLeft: `4px solid var(--hb-warning, #f57c00)`,
                }}
              >
                <h2
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'var(--hb-warning, #f57c00)',
                    margin: 0,
                    fontFamily: 'var(--hb-font-family, inherit)',
                  }}
                >
                  Signers to Edit ({categorizedChanges.edits.length})
                </h2>
              </div>
              <div className="hb-card-body" style={{ padding: 0 }}>
                {categorizedChanges.edits.map((change) => {
                  const signerName = getSignerName(change, signers);
                  const signerTitle = getSignerTitle(change, signers);
                  const editDescription = getEditDescription(change);

                  return (
                    <div
                      key={change.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1.25rem',
                        borderBottom: '1px solid var(--hb-gray-200, #e9ecef)',
                        borderLeft: `4px solid ${getChangeBorderColor('edit')}`,
                        flexWrap: 'wrap',
                        gap: '0.25rem',
                      }}
                    >
                      <div style={{ flex: '1 1 auto' }}>
                        <span
                          style={{
                            fontWeight: 500,
                            color: 'var(--hb-black, #292929)',
                            fontFamily: 'var(--hb-font-family, inherit)',
                          }}
                        >
                          {signerName}
                        </span>
                        {signerTitle && (
                          <span
                            className="hb-text-muted"
                            style={{
                              marginLeft: '0.5rem',
                              fontSize: '0.875rem',
                              fontFamily: 'var(--hb-font-family, inherit)',
                            }}
                          >
                            &mdash; {signerTitle}
                          </span>
                        )}
                        {editDescription && (
                          <div
                            className="hb-text-muted hb-text-sm"
                            style={{
                              marginTop: '0.125rem',
                              fontFamily: 'var(--hb-font-family, inherit)',
                            }}
                          >
                            {editDescription}
                          </div>
                        )}
                      </div>
                      <span className={getChangeBadgeClass('edit')}>
                        {getChangeTypeLabel('edit')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Removed Signers Section */}
          {categorizedChanges.removals.length > 0 && (
            <div className="hb-card hb-mb-4">
              <div
                className="hb-card-header"
                style={{
                  borderLeft: `4px solid var(--hb-danger, #d32f2f)`,
                }}
              >
                <h2
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'var(--hb-danger, #d32f2f)',
                    margin: 0,
                    fontFamily: 'var(--hb-font-family, inherit)',
                  }}
                >
                  Signers to Remove ({categorizedChanges.removals.length})
                </h2>
              </div>
              <div className="hb-card-body" style={{ padding: 0 }}>
                {categorizedChanges.removals.map((change) => {
                  const signerName = getSignerName(change, signers);
                  const signerTitle = getSignerTitle(change, signers);

                  return (
                    <div
                      key={change.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1.25rem',
                        borderBottom: '1px solid var(--hb-gray-200, #e9ecef)',
                        borderLeft: `4px solid ${getChangeBorderColor('remove')}`,
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontWeight: 500,
                            color: 'var(--hb-black, #292929)',
                            fontFamily: 'var(--hb-font-family, inherit)',
                            textDecoration: 'line-through',
                            opacity: 0.7,
                          }}
                        >
                          {signerName}
                        </span>
                        {signerTitle && (
                          <span
                            className="hb-text-muted"
                            style={{
                              marginLeft: '0.5rem',
                              fontSize: '0.875rem',
                              fontFamily: 'var(--hb-font-family, inherit)',
                              textDecoration: 'line-through',
                              opacity: 0.7,
                            }}
                          >
                            &mdash; {signerTitle}
                          </span>
                        )}
                      </div>
                      <span className={getChangeBadgeClass('remove')}>
                        {getChangeTypeLabel('remove')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div
            className="hb-d-flex hb-justify-content-between hb-align-items-center hb-flex-wrap hb-gap-2"
            style={{ marginTop: '1.5rem' }}
          >
            <Button
              variant="secondary"
              label={'\u00AB Go Back'}
              onClick={handleGoBack}
              ariaLabel="Go back to signer management"
            />
            <Button
              variant="primary"
              label="Continue to Review \u00BB"
              onClick={handleContinueToReview}
              disabled={categorizedChanges.total === 0}
              ariaLabel="Continue to review and submit changes"
            />
          </div>

          {/* Screen reader live region */}
          <div className="hb-sr-only" aria-live="polite" aria-atomic="true">
            {categorizedChanges.total > 0
              ? `${categorizedChanges.total} staged change${categorizedChanges.total !== 1 ? 's' : ''}: ${categorizedChanges.additions.length} added, ${categorizedChanges.edits.length} edited, ${categorizedChanges.removals.length} removed.`
              : 'No staged changes to confirm.'}
          </div>
        </div>
      </div>
    </main>
  );
}

export default ConfirmSignersScreen;