import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSigners } from '../context/SignerContext.jsx';
import Alert from '../components/common/Alert.jsx';
import Button from '../components/common/Button.jsx';
import ConfirmationModal from '../components/common/ConfirmationModal.jsx';
import AuditLogger from '../services/AuditLogger.js';

/**
 * Visual indicator types for signers in the review list.
 * @readonly
 * @enum {string}
 */
const SIGNER_CHANGE_TYPE = {
  UNCHANGED: 'unchanged',
  ADDED: 'added',
  EDITED: 'edited',
  REMOVED: 'removed',
};

/**
 * Returns the border-left color for a signer change type.
 * @param {string} changeType - The change type.
 * @returns {string} The CSS border-left color value.
 */
const getChangeBorderColor = (changeType) => {
  switch (changeType) {
    case SIGNER_CHANGE_TYPE.ADDED:
      return 'var(--hb-success, #388e3c)';
    case SIGNER_CHANGE_TYPE.EDITED:
      return 'var(--hb-warning, #f57c00)';
    case SIGNER_CHANGE_TYPE.REMOVED:
      return 'var(--hb-danger, #d32f2f)';
    case SIGNER_CHANGE_TYPE.UNCHANGED:
    default:
      return 'var(--hb-gray-300, #dee2e6)';
  }
};

/**
 * Returns the HB CSS badge class for a signer change type.
 * @param {string} changeType - The change type.
 * @returns {string} The badge class string.
 */
const getChangeBadgeClass = (changeType) => {
  switch (changeType) {
    case SIGNER_CHANGE_TYPE.ADDED:
      return 'hb-badge hb-badge-success';
    case SIGNER_CHANGE_TYPE.EDITED:
      return 'hb-badge hb-badge-warning';
    case SIGNER_CHANGE_TYPE.REMOVED:
      return 'hb-badge hb-badge-danger';
    case SIGNER_CHANGE_TYPE.UNCHANGED:
    default:
      return 'hb-badge hb-badge-primary';
  }
};

/**
 * Returns a human-readable label for a signer change type.
 * @param {string} changeType - The change type.
 * @returns {string} The display label.
 */
const getChangeLabel = (changeType) => {
  switch (changeType) {
    case SIGNER_CHANGE_TYPE.ADDED:
      return 'New';
    case SIGNER_CHANGE_TYPE.EDITED:
      return 'Modified';
    case SIGNER_CHANGE_TYPE.REMOVED:
      return 'Removed';
    case SIGNER_CHANGE_TYPE.UNCHANGED:
    default:
      return 'Unchanged';
  }
};

/**
 * Returns the full name string for a signer object.
 * @param {Object} signer - The signer object.
 * @returns {string} The full name.
 */
const getSignerFullName = (signer) => {
  if (!signer) {
    return 'Unknown Signer';
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

  return parts.length > 0 ? parts.join(' ') : 'Unknown Signer';
};

/**
 * Extracts the signer display name from a staged change object.
 * @param {Object} change - The staged change object.
 * @param {Array<Object>} signers - The current signers list from context.
 * @returns {string} The signer's full name.
 */
const getSignerNameFromChange = (change, signers) => {
  if (!change) {
    return 'Unknown Signer';
  }

  if (change.type === 'add' && change.signerData) {
    return getSignerFullName(change.signerData);
  }

  if (change.before) {
    return getSignerFullName(change.before);
  }

  if (change.signerId && Array.isArray(signers)) {
    const signer = signers.find((s) => s.id === change.signerId);
    if (signer) {
      return getSignerFullName(signer);
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
const getSignerTitleFromChange = (change, signers) => {
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
 * Extracts the signer email from a staged change object.
 * @param {Object} change - The staged change object.
 * @param {Array<Object>} signers - The current signers list from context.
 * @returns {string} The signer's email.
 */
const getSignerEmailFromChange = (change, signers) => {
  if (!change) {
    return '';
  }

  if (change.type === 'add' && change.signerData) {
    return change.signerData.email || '';
  }

  if (change.type === 'edit' && change.updates && change.updates.email) {
    return change.updates.email;
  }

  if (change.before) {
    return change.before.email || '';
  }

  if (change.signerId && Array.isArray(signers)) {
    const signer = signers.find((s) => s.id === change.signerId);
    if (signer) {
      return signer.email || '';
    }
  }

  return '';
};

/**
 * Extracts the signer phone from a staged change object.
 * @param {Object} change - The staged change object.
 * @param {Array<Object>} signers - The current signers list from context.
 * @returns {string} The signer's phone.
 */
const getSignerPhoneFromChange = (change, signers) => {
  if (!change) {
    return '';
  }

  if (change.type === 'add' && change.signerData) {
    return change.signerData.phone || '';
  }

  if (change.type === 'edit' && change.updates && change.updates.phone) {
    return change.updates.phone;
  }

  if (change.before) {
    return change.before.phone || '';
  }

  if (change.signerId && Array.isArray(signers)) {
    const signer = signers.find((s) => s.id === change.signerId);
    if (signer) {
      return signer.phone || '';
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
 * Final review and legal consent page showing read-only complete authorized
 * signer list after all changes applied. Distinguishes unchanged, modified,
 * new, and removed signers with visual indicators. Displays account details
 * and controlling party info. Legal consent checkbox required before submission.
 * 'Submit' button (disabled until consent) and 'Edit' button to go back.
 * HB CSS styling.
 *
 * @returns {React.ReactElement} The rendered review signers screen component.
 */
function ReviewSignersScreen() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, currentUser } = useAuth();
  const {
    selectedAccount,
    signers,
    stagedChanges,
    submitChanges,
    isLoading: signerLoading,
    error: signerError,
    clearError,
  } = useSigners();

  const [consentChecked, setConsentChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [referenceId, setReferenceId] = useState(null);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

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
   * Builds the complete review list combining unchanged signers and staged changes.
   */
  const reviewList = useMemo(() => {
    const accountId = selectedAccount ? selectedAccount.id : null;
    const items = [];

    const relevantChanges = Array.isArray(stagedChanges)
      ? accountId
        ? stagedChanges.filter((c) => c.accountId === accountId)
        : stagedChanges
      : [];

    const addedSignerIds = new Set();
    const editedSignerIds = new Set();
    const removedSignerIds = new Set();

    relevantChanges.forEach((change) => {
      if (change.type === 'add') {
        addedSignerIds.add(change.signerId);
      } else if (change.type === 'edit') {
        editedSignerIds.add(change.signerId);
      } else if (change.type === 'remove') {
        removedSignerIds.add(change.signerId);
      }
    });

    // Add unchanged signers (existing signers not in any staged change)
    if (Array.isArray(signers)) {
      signers.forEach((signer) => {
        if (
          !editedSignerIds.has(signer.id) &&
          !removedSignerIds.has(signer.id) &&
          !addedSignerIds.has(signer.id)
        ) {
          items.push({
            id: signer.id,
            changeType: SIGNER_CHANGE_TYPE.UNCHANGED,
            name: getSignerFullName(signer),
            title: signer.title || signer.role || '',
            email: signer.email || '',
            phone: signer.phone || '',
            status: signer.status || '',
            change: null,
            signer,
          });
        }
      });
    }

    // Add edited signers
    relevantChanges
      .filter((c) => c.type === 'edit')
      .forEach((change) => {
        items.push({
          id: change.signerId,
          changeType: SIGNER_CHANGE_TYPE.EDITED,
          name: getSignerNameFromChange(change, signers),
          title: getSignerTitleFromChange(change, signers),
          email: getSignerEmailFromChange(change, signers),
          phone: getSignerPhoneFromChange(change, signers),
          status: 'Pending',
          change,
          signer: Array.isArray(signers) ? signers.find((s) => s.id === change.signerId) : null,
        });
      });

    // Add new signers
    relevantChanges
      .filter((c) => c.type === 'add')
      .forEach((change) => {
        items.push({
          id: change.signerId,
          changeType: SIGNER_CHANGE_TYPE.ADDED,
          name: getSignerNameFromChange(change, signers),
          title: getSignerTitleFromChange(change, signers),
          email: getSignerEmailFromChange(change, signers),
          phone: getSignerPhoneFromChange(change, signers),
          status: 'Pending',
          change,
          signer: null,
        });
      });

    // Add removed signers
    relevantChanges
      .filter((c) => c.type === 'remove')
      .forEach((change) => {
        items.push({
          id: change.signerId,
          changeType: SIGNER_CHANGE_TYPE.REMOVED,
          name: getSignerNameFromChange(change, signers),
          title: getSignerTitleFromChange(change, signers),
          email: getSignerEmailFromChange(change, signers),
          phone: getSignerPhoneFromChange(change, signers),
          status: 'Removed',
          change,
          signer: Array.isArray(signers) ? signers.find((s) => s.id === change.signerId) : null,
        });
      });

    return items;
  }, [signers, stagedChanges, selectedAccount]);

  /**
   * Counts of each change type for the summary.
   */
  const changeSummary = useMemo(() => {
    const summary = {
      unchanged: 0,
      added: 0,
      edited: 0,
      removed: 0,
      total: reviewList.length,
    };

    reviewList.forEach((item) => {
      switch (item.changeType) {
        case SIGNER_CHANGE_TYPE.UNCHANGED:
          summary.unchanged += 1;
          break;
        case SIGNER_CHANGE_TYPE.ADDED:
          summary.added += 1;
          break;
        case SIGNER_CHANGE_TYPE.EDITED:
          summary.edited += 1;
          break;
        case SIGNER_CHANGE_TYPE.REMOVED:
          summary.removed += 1;
          break;
        default:
          break;
      }
    });

    return summary;
  }, [reviewList]);

  /**
   * Whether there are any staged changes to submit.
   */
  const hasChanges = useMemo(() => {
    return changeSummary.added > 0 || changeSummary.edited > 0 || changeSummary.removed > 0;
  }, [changeSummary]);

  /**
   * Handles the consent checkbox toggle.
   */
  const handleConsentChange = useCallback(() => {
    setConsentChecked((prev) => !prev);

    if (submitError) {
      setSubmitError(null);
    }
  }, [submitError]);

  /**
   * Handles navigating back to the confirm signers page for editing.
   */
  const handleGoBack = useCallback(() => {
    navigate('/confirm', { replace: true });
  }, [navigate]);

  /**
   * Opens the submit confirmation modal.
   */
  const handleSubmitClick = useCallback(() => {
    if (!consentChecked) {
      setSubmitError('You must agree to the legal consent before submitting.');
      return;
    }

    if (!hasChanges) {
      setSubmitError('No changes to submit. Please go back and make changes first.');
      return;
    }

    setSubmitModalOpen(true);
  }, [consentChecked, hasChanges]);

  /**
   * Performs the actual submission after confirmation.
   */
  const handleConfirmSubmit = useCallback(() => {
    setSubmitModalOpen(false);
    setIsSubmitting(true);
    setSubmitError(null);
    setSuccessMessage(null);

    if (signerError) {
      clearError();
    }

    try {
      const result = submitChanges();

      if (result && result.status === 'success') {
        const refId = result.referenceId || 'N/A';
        setReferenceId(refId);
        setSuccessMessage(
          `Signature card changes have been submitted successfully. Reference ID: ${refId}`,
        );

        AuditLogger.logEvent('REVIEW_SUBMIT_SUCCESS', {
          accountId: selectedAccount ? selectedAccount.id : 'unknown',
          userId: currentUser ? currentUser.id : 'unknown',
          referenceId: refId,
          addedCount: changeSummary.added,
          editedCount: changeSummary.edited,
          removedCount: changeSummary.removed,
        });
      } else {
        const errorMessage =
          result && result.message
            ? result.message
            : 'Failed to submit changes. Please try again.';
        setSubmitError(errorMessage);
      }
    } catch (_error) {
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [submitChanges, selectedAccount, currentUser, changeSummary, signerError, clearError]);

  /**
   * Cancels the submit confirmation modal.
   */
  const handleCancelSubmit = useCallback(() => {
    setSubmitModalOpen(false);
  }, []);

  /**
   * Dismisses the error alert.
   */
  const handleDismissError = useCallback(() => {
    setSubmitError(null);

    if (signerError) {
      clearError();
    }
  }, [signerError, clearError]);

  /**
   * Dismisses the success message alert.
   */
  const handleDismissSuccess = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  /**
   * Navigates to the dashboard after successful submission.
   */
  const handleReturnToDashboard = useCallback(() => {
    navigate('/accounts', { replace: true });
  }, [navigate]);

  const displayError = submitError || signerError || null;

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

  // Post-submission success view
  if (successMessage && referenceId) {
    return (
      <main className="fluid-wrapper" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div className="hb-row hb-justify-content-center">
          <div className="hb-col-12 hb-col-md-10 hb-col-lg-8">
            <div className="hb-card">
              <div className="hb-card-header" style={{ textAlign: 'center' }}>
                <h1
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: 'var(--hb-success, #388e3c)',
                    margin: 0,
                    fontFamily: 'var(--hb-font-family, inherit)',
                  }}
                >
                  Submission Successful
                </h1>
              </div>
              <div className="hb-card-body" style={{ textAlign: 'center' }}>
                <Alert
                  type="success"
                  message={successMessage}
                  dismissible={true}
                  onDismiss={handleDismissSuccess}
                />

                <div style={{ margin: '1.5rem 0' }}>
                  <p
                    style={{
                      fontSize: '1rem',
                      lineHeight: 1.6,
                      color: 'var(--hb-black, #292929)',
                      fontFamily: 'var(--hb-font-family, inherit)',
                      margin: '0 0 0.5rem 0',
                    }}
                  >
                    Your signature card changes have been submitted for processing.
                  </p>
                  <p
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      color: 'var(--hb-primary, #00468b)',
                      fontFamily: 'var(--hb-font-family, inherit)',
                      margin: '0.5rem 0',
                    }}
                  >
                    Reference ID: {referenceId}
                  </p>
                  <p
                    className="hb-text-muted hb-text-sm"
                    style={{
                      fontFamily: 'var(--hb-font-family, inherit)',
                      margin: '0.5rem 0 0 0',
                    }}
                  >
                    Please save this reference ID for your records.
                  </p>
                </div>

                <Button
                  variant="primary"
                  label="Return to Accounts"
                  onClick={handleReturnToDashboard}
                  ariaLabel="Return to account selection"
                />
              </div>
            </div>
          </div>
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
              Review &amp; Submit
            </h1>
            <p
              className="hb-text-muted"
              style={{
                margin: '0.25rem 0 0 0',
                fontSize: '0.9375rem',
                fontFamily: 'var(--hb-font-family, inherit)',
              }}
            >
              Please review all signer information below before submitting.
            </p>
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

          {/* Account Details Card */}
          {selectedAccount && (
            <div className="hb-card hb-mb-4">
              <div className="hb-card-header">
                <h2
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'var(--hb-primary, #00468b)',
                    margin: 0,
                    fontFamily: 'var(--hb-font-family, inherit)',
                  }}
                >
                  Account Details
                </h2>
              </div>
              <div className="hb-card-body">
                <div className="hb-row">
                  <div className="hb-col-12 hb-col-md-6">
                    <div style={{ marginBottom: '0.75rem' }}>
                      <span
                        className="hb-text-muted hb-text-sm"
                        style={{
                          display: 'block',
                          fontFamily: 'var(--hb-font-family, inherit)',
                        }}
                      >
                        Account Name
                      </span>
                      <span
                        style={{
                          fontWeight: 500,
                          color: 'var(--hb-black, #292929)',
                          fontFamily: 'var(--hb-font-family, inherit)',
                        }}
                      >
                        {selectedAccount.accountName || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="hb-col-12 hb-col-md-6">
                    <div style={{ marginBottom: '0.75rem' }}>
                      <span
                        className="hb-text-muted hb-text-sm"
                        style={{
                          display: 'block',
                          fontFamily: 'var(--hb-font-family, inherit)',
                        }}
                      >
                        Account Number
                      </span>
                      <span
                        style={{
                          fontWeight: 500,
                          color: 'var(--hb-black, #292929)',
                          fontFamily: 'var(--hb-font-family, inherit)',
                        }}
                      >
                        {selectedAccount.accountNumberMasked || '****'}
                      </span>
                    </div>
                  </div>
                  <div className="hb-col-12 hb-col-md-6">
                    <div style={{ marginBottom: '0.75rem' }}>
                      <span
                        className="hb-text-muted hb-text-sm"
                        style={{
                          display: 'block',
                          fontFamily: 'var(--hb-font-family, inherit)',
                        }}
                      >
                        Account Type
                      </span>
                      <span
                        style={{
                          fontWeight: 500,
                          color: 'var(--hb-black, #292929)',
                          fontFamily: 'var(--hb-font-family, inherit)',
                        }}
                      >
                        {selectedAccount.accountType || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="hb-col-12 hb-col-md-6">
                    <div style={{ marginBottom: '0.75rem' }}>
                      <span
                        className="hb-text-muted hb-text-sm"
                        style={{
                          display: 'block',
                          fontFamily: 'var(--hb-font-family, inherit)',
                        }}
                      >
                        Status
                      </span>
                      <span
                        className={
                          selectedAccount.status === 'Active'
                            ? 'hb-badge hb-badge-success'
                            : selectedAccount.status === 'Pending'
                              ? 'hb-badge hb-badge-warning'
                              : 'hb-badge hb-badge-primary'
                        }
                      >
                        {selectedAccount.status || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Controlling Party Info */}
                {currentUser && (
                  <div
                    style={{
                      borderTop: '1px solid var(--hb-gray-300, #dee2e6)',
                      paddingTop: '0.75rem',
                      marginTop: '0.25rem',
                    }}
                  >
                    <span
                      className="hb-text-muted hb-text-sm"
                      style={{
                        display: 'block',
                        marginBottom: '0.25rem',
                        fontFamily: 'var(--hb-font-family, inherit)',
                      }}
                    >
                      Submitted By
                    </span>
                    <span
                      style={{
                        fontWeight: 500,
                        color: 'var(--hb-black, #292929)',
                        fontFamily: 'var(--hb-font-family, inherit)',
                      }}
                    >
                      {currentUser.firstName && currentUser.lastName
                        ? `${currentUser.firstName} ${currentUser.lastName}`
                        : currentUser.username || 'Current User'}
                      {currentUser.role && (
                        <span
                          className="hb-text-muted"
                          style={{ marginLeft: '0.5rem', fontSize: '0.875rem' }}
                        >
                          ({currentUser.role})
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Change Summary Badges */}
          <div
            className="hb-d-flex hb-align-items-center hb-gap-3 hb-flex-wrap hb-mb-4"
          >
            <span
              className="hb-badge hb-badge-primary"
              style={{ fontSize: '0.875rem', padding: '0.35em 0.75em' }}
            >
              {changeSummary.total} Total Signer{changeSummary.total !== 1 ? 's' : ''}
            </span>
            {changeSummary.unchanged > 0 && (
              <span
                className="hb-badge hb-badge-primary"
                style={{ fontSize: '0.875rem', padding: '0.35em 0.75em' }}
              >
                {changeSummary.unchanged} Unchanged
              </span>
            )}
            {changeSummary.added > 0 && (
              <span
                className="hb-badge hb-badge-success"
                style={{ fontSize: '0.875rem', padding: '0.35em 0.75em' }}
              >
                {changeSummary.added} New
              </span>
            )}
            {changeSummary.edited > 0 && (
              <span
                className="hb-badge hb-badge-warning"
                style={{ fontSize: '0.875rem', padding: '0.35em 0.75em' }}
              >
                {changeSummary.edited} Modified
              </span>
            )}
            {changeSummary.removed > 0 && (
              <span
                className="hb-badge hb-badge-danger"
                style={{ fontSize: '0.875rem', padding: '0.35em 0.75em' }}
              >
                {changeSummary.removed} Removed
              </span>
            )}
          </div>

          {/* Signer Review List */}
          {reviewList.length === 0 ? (
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
                  No signers found for this account. Please go back and add signers.
                </p>
              </div>
            </div>
          ) : (
            <div className="hb-card hb-mb-4">
              <div className="hb-card-header">
                <h2
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'var(--hb-primary, #00468b)',
                    margin: 0,
                    fontFamily: 'var(--hb-font-family, inherit)',
                  }}
                >
                  Authorized Signers
                </h2>
              </div>
              <div className="hb-card-body" style={{ padding: 0 }}>
                {reviewList.map((item) => {
                  const isRemoved = item.changeType === SIGNER_CHANGE_TYPE.REMOVED;
                  const editDesc =
                    item.changeType === SIGNER_CHANGE_TYPE.EDITED && item.change
                      ? getEditDescription(item.change)
                      : '';

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        padding: '1rem 1.25rem',
                        borderBottom: '1px solid var(--hb-gray-200, #e9ecef)',
                        borderLeft: `4px solid ${getChangeBorderColor(item.changeType)}`,
                        opacity: isRemoved ? 0.6 : 1,
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                        <div
                          className="hb-d-flex hb-align-items-center hb-gap-2 hb-flex-wrap"
                          style={{ marginBottom: '0.25rem' }}
                        >
                          <span
                            style={{
                              fontWeight: 600,
                              color: 'var(--hb-black, #292929)',
                              fontFamily: 'var(--hb-font-family, inherit)',
                              textDecoration: isRemoved ? 'line-through' : 'none',
                            }}
                          >
                            {item.name}
                          </span>
                          <span className={getChangeBadgeClass(item.changeType)}>
                            {getChangeLabel(item.changeType)}
                          </span>
                        </div>

                        {item.title && (
                          <div
                            style={{
                              fontSize: '0.9375rem',
                              color: 'var(--hb-gray-700, #495057)',
                              fontFamily: 'var(--hb-font-family, inherit)',
                              textDecoration: isRemoved ? 'line-through' : 'none',
                              marginBottom: '0.125rem',
                            }}
                          >
                            {item.title}
                          </div>
                        )}

                        <div
                          className="hb-d-flex hb-gap-3 hb-flex-wrap"
                          style={{ marginTop: '0.25rem' }}
                        >
                          {item.email && (
                            <span
                              className="hb-text-muted hb-text-sm"
                              style={{
                                fontFamily: 'var(--hb-font-family, inherit)',
                                textDecoration: isRemoved ? 'line-through' : 'none',
                              }}
                            >
                              {item.email}
                            </span>
                          )}
                          {item.phone && (
                            <span
                              className="hb-text-muted hb-text-sm"
                              style={{
                                fontFamily: 'var(--hb-font-family, inherit)',
                                textDecoration: isRemoved ? 'line-through' : 'none',
                              }}
                            >
                              {item.phone}
                            </span>
                          )}
                        </div>

                        {editDesc && (
                          <div
                            className="hb-text-muted hb-text-sm"
                            style={{
                              marginTop: '0.25rem',
                              fontStyle: 'italic',
                              fontFamily: 'var(--hb-font-family, inherit)',
                            }}
                          >
                            {editDesc}
                          </div>
                        )}
                      </div>

                      {item.status && (
                        <div style={{ flexShrink: 0 }}>
                          <span
                            className={
                              item.status === 'Active'
                                ? 'hb-badge hb-badge-success'
                                : item.status === 'Pending'
                                  ? 'hb-badge hb-badge-warning'
                                  : item.status === 'Removed'
                                    ? 'hb-badge hb-badge-danger'
                                    : 'hb-badge hb-badge-primary'
                            }
                          >
                            {item.status}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legal Consent Section */}
          <div className="hb-card hb-mb-4">
            <div className="hb-card-header">
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--hb-primary, #00468b)',
                  margin: 0,
                  fontFamily: 'var(--hb-font-family, inherit)',
                }}
              >
                Legal Consent
              </h2>
            </div>
            <div className="hb-card-body">
              <p
                style={{
                  fontSize: '0.9375rem',
                  lineHeight: 1.6,
                  color: 'var(--hb-black, #292929)',
                  fontFamily: 'var(--hb-font-family, inherit)',
                  margin: '0 0 1rem 0',
                }}
              >
                By checking the box below and submitting, I certify that the information provided
                is accurate and complete to the best of my knowledge. I authorize the changes to
                the authorized signers on this account as listed above. I understand that this
                submission will be processed and may be subject to further verification. Any
                fraudulent or misleading information may result in account restrictions or legal
                action.
              </p>

              <div
                className="hb-d-flex hb-align-items-start hb-gap-2"
                style={{ marginBottom: '0.5rem' }}
              >
                <input
                  type="checkbox"
                  id="legal-consent"
                  checked={consentChecked}
                  onChange={handleConsentChange}
                  disabled={isSubmitting || !!referenceId}
                  aria-required="true"
                  aria-describedby="consent-description"
                  style={{
                    marginTop: '0.25rem',
                    width: '1.125rem',
                    height: '1.125rem',
                    flexShrink: 0,
                    cursor: isSubmitting || referenceId ? 'not-allowed' : 'pointer',
                    accentColor: 'var(--hb-primary, #00468b)',
                  }}
                />
                <label
                  htmlFor="legal-consent"
                  id="consent-description"
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: 500,
                    color: 'var(--hb-black, #292929)',
                    fontFamily: 'var(--hb-font-family, inherit)',
                    cursor: isSubmitting || referenceId ? 'not-allowed' : 'pointer',
                    lineHeight: 1.5,
                  }}
                >
                  I have reviewed the signer information above and agree to the terms and
                  conditions. I authorize the submission of these changes to the signature card.
                  <span aria-hidden="true" style={{ color: 'var(--hb-danger, #d32f2f)' }}>
                    {' '}
                    *
                  </span>
                </label>
              </div>

              {!consentChecked && !isSubmitting && !referenceId && (
                <p
                  className="hb-text-muted hb-text-sm"
                  style={{
                    margin: '0.25rem 0 0 1.625rem',
                    fontFamily: 'var(--hb-font-family, inherit)',
                  }}
                >
                  You must agree to the legal consent before submitting.
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div
            className="hb-d-flex hb-justify-content-between hb-align-items-center hb-flex-wrap hb-gap-2"
            style={{ marginTop: '1.5rem' }}
          >
            <Button
              variant="secondary"
              label={'\u00AB Edit Changes'}
              onClick={handleGoBack}
              disabled={isSubmitting}
              ariaLabel="Go back to edit signer changes"
            />
            <Button
              variant="primary"
              label="Submit Signature Card"
              onClick={handleSubmitClick}
              loading={isSubmitting}
              disabled={!consentChecked || isSubmitting || !hasChanges}
              ariaLabel="Submit signature card changes"
            />
          </div>

          {/* Screen reader live region */}
          <div className="hb-sr-only" aria-live="polite" aria-atomic="true">
            {consentChecked
              ? 'Legal consent accepted. You may now submit.'
              : 'Legal consent is required before submitting.'}
            {` Reviewing ${changeSummary.total} signer${changeSummary.total !== 1 ? 's' : ''}: ${changeSummary.unchanged} unchanged, ${changeSummary.added} new, ${changeSummary.edited} modified, ${changeSummary.removed} removed.`}
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      <ConfirmationModal
        isOpen={submitModalOpen}
        onConfirm={handleConfirmSubmit}
        onCancel={handleCancelSubmit}
        title="Confirm Submission"
        message="Are you sure you want to submit this signature card for processing? This action will finalize all staged changes. Please ensure all information is accurate before proceeding."
        confirmLabel="Submit"
        cancelLabel="Cancel"
        loading={isSubmitting}
      />
    </main>
  );
}

export default ReviewSignersScreen;