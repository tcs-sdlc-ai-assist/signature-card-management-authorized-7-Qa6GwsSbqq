import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSigners } from '../context/SignerContext.jsx';
import Alert from '../components/common/Alert.jsx';
import Button from '../components/common/Button.jsx';
import AuditLogger from '../services/AuditLogger.js';
import { generateUUID, formatTimestamp } from '../utils/helpers.js';

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
 * Returns a human-readable label for a staged change type.
 * @param {string} type - The change type ('add', 'edit', 'remove').
 * @returns {string} The display label.
 */
const getChangeTypeLabel = (type) => {
  switch (type) {
    case 'add':
      return 'Added';
    case 'edit':
      return 'Modified';
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
 * Submission confirmation and receipt page displayed after successful submission.
 * Shows reference ID (generated UUID), summary of all changes, submission timestamp,
 * and next steps. Sends mock confirmation notification. Provides 'Done' button to
 * return to welcome or account selection. Prevents duplicate submissions (submit
 * button disabled after first click). HB CSS success styling.
 *
 * @returns {React.ReactElement} The rendered submission screen component.
 */
function SubmissionScreen() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, currentUser } = useAuth();
  const {
    selectedAccount,
    signers,
    stagedChanges,
    submitChanges,
    clearChanges,
    isLoading: signerLoading,
    error: signerError,
    clearError,
  } = useSigners();

  const [referenceId, setReferenceId] = useState(null);
  const [submissionTimestamp, setSubmissionTimestamp] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [notificationSent, setNotificationSent] = useState(false);
  const submittedRef = useRef(false);

  /**
   * Snapshot of staged changes at mount time for display after submission clears them.
   */
  const [changeSnapshot, setChangeSnapshot] = useState(null);

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
   * Capture a snapshot of staged changes on mount for display purposes.
   */
  useEffect(() => {
    if (Array.isArray(stagedChanges) && stagedChanges.length > 0 && !changeSnapshot) {
      const accountId = selectedAccount ? selectedAccount.id : null;
      const relevantChanges = accountId
        ? stagedChanges.filter((c) => c.accountId === accountId)
        : stagedChanges;

      if (relevantChanges.length > 0) {
        setChangeSnapshot([...relevantChanges]);
      }
    }
  }, [stagedChanges, selectedAccount, changeSnapshot]);

  /**
   * Auto-submit on mount if there are staged changes and we haven't submitted yet.
   */
  useEffect(() => {
    if (
      !authLoading &&
      !signerLoading &&
      isAuthenticated &&
      selectedAccount &&
      !hasSubmitted &&
      !submittedRef.current &&
      !isSubmitting
    ) {
      const accountId = selectedAccount.id;
      const relevantChanges = Array.isArray(stagedChanges)
        ? stagedChanges.filter((c) => c.accountId === accountId)
        : [];

      if (relevantChanges.length > 0) {
        handleSubmit();
      } else if (changeSnapshot && changeSnapshot.length > 0) {
        // Changes were already submitted (e.g., from ReviewSignersScreen)
        // Generate a reference ID for display
        if (!referenceId) {
          const refId = `REF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          setReferenceId(refId);
          setSubmissionTimestamp(new Date().toISOString());
          setHasSubmitted(true);
          submittedRef.current = true;
          sendMockNotification(refId);
        }
      } else if (!changeSnapshot) {
        // No changes at all — redirect back
        navigate('/accounts', { replace: true });
      }
    }
  }, [authLoading, signerLoading, isAuthenticated, selectedAccount, hasSubmitted, isSubmitting, stagedChanges, changeSnapshot, referenceId]);

  /**
   * Sends a mock confirmation notification and logs the event.
   * @param {string} refId - The reference ID for the submission.
   */
  const sendMockNotification = useCallback(
    (refId) => {
      if (notificationSent) {
        return;
      }

      try {
        AuditLogger.logEvent('CONFIRMATION_NOTIFICATION_SENT', {
          referenceId: refId,
          accountId: selectedAccount ? selectedAccount.id : 'unknown',
          userId: currentUser ? currentUser.id : 'unknown',
          recipientEmail: currentUser ? currentUser.email : 'unknown',
          notificationType: 'mock_email',
          timestamp: new Date().toISOString(),
        });

        setNotificationSent(true);
      } catch (_error) {
        // Silently handle notification errors
      }
    },
    [notificationSent, selectedAccount, currentUser],
  );

  /**
   * Handles the submission of staged changes.
   * Prevents duplicate submissions via ref guard.
   */
  const handleSubmit = useCallback(() => {
    if (submittedRef.current || isSubmitting || hasSubmitted) {
      return;
    }

    submittedRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    if (signerError) {
      clearError();
    }

    try {
      const result = submitChanges();

      if (result && result.status === 'success') {
        const refId = result.referenceId || generateUUID();
        const timestamp = new Date().toISOString();

        setReferenceId(refId);
        setSubmissionTimestamp(timestamp);
        setHasSubmitted(true);

        AuditLogger.logEvent('SUBMISSION_CONFIRMED', {
          referenceId: refId,
          accountId: selectedAccount ? selectedAccount.id : 'unknown',
          userId: currentUser ? currentUser.id : 'unknown',
          timestamp,
        });

        sendMockNotification(refId);
      } else {
        const errorMessage =
          result && result.message
            ? result.message
            : 'Failed to submit changes. Please try again.';
        setSubmitError(errorMessage);
        submittedRef.current = false;
      }
    } catch (_error) {
      setSubmitError('An unexpected error occurred. Please try again.');
      submittedRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, hasSubmitted, submitChanges, selectedAccount, currentUser, signerError, clearError, sendMockNotification]);

  /**
   * Categorized changes from the snapshot for display.
   */
  const categorizedChanges = useMemo(() => {
    const changes = changeSnapshot || [];

    if (changes.length === 0) {
      return { additions: [], edits: [], removals: [], total: 0 };
    }

    const additions = changes.filter((c) => c.type === 'add');
    const edits = changes.filter((c) => c.type === 'edit');
    const removals = changes.filter((c) => c.type === 'remove');

    return {
      additions,
      edits,
      removals,
      total: changes.length,
    };
  }, [changeSnapshot]);

  /**
   * Handles navigating back to account selection.
   */
  const handleDone = useCallback(() => {
    navigate('/accounts', { replace: true });
  }, [navigate]);

  /**
   * Handles navigating to the welcome screen.
   */
  const handleReturnToWelcome = useCallback(() => {
    navigate('/', { replace: true });
  }, [navigate]);

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
   * Handles retry submission after an error.
   */
  const handleRetry = useCallback(() => {
    submittedRef.current = false;
    setHasSubmitted(false);
    setSubmitError(null);
    handleSubmit();
  }, [handleSubmit]);

  const displayError = submitError || signerError || null;

  if (!isAuthenticated && !authLoading) {
    return null;
  }

  if (!selectedAccount && !authLoading) {
    return null;
  }

  if (authLoading || signerLoading || isSubmitting) {
    return (
      <main className="fluid-wrapper" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div
          className="hb-d-flex hb-justify-content-center hb-align-items-center hb-flex-column"
          style={{ minHeight: '50vh' }}
          role="status"
          aria-live="polite"
          aria-label="Processing submission"
        >
          <span className="hb-spinner hb-spinner-lg" aria-hidden="true" />
          <p
            className="hb-text-muted hb-mt-3"
            style={{
              fontFamily: 'var(--hb-font-family, inherit)',
              margin: '1rem 0 0 0',
            }}
          >
            {isSubmitting ? 'Submitting your changes, please wait...' : 'Loading, please wait...'}
          </p>
          <span className="hb-sr-only">
            {isSubmitting ? 'Submitting changes, please wait.' : 'Loading, please wait.'}
          </span>
        </div>
      </main>
    );
  }

  // Error state — submission failed
  if (displayError && !hasSubmitted) {
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
                    color: 'var(--hb-danger, #d32f2f)',
                    margin: 0,
                    fontFamily: 'var(--hb-font-family, inherit)',
                  }}
                >
                  Submission Failed
                </h1>
              </div>
              <div className="hb-card-body">
                <Alert
                  type="error"
                  message={displayError}
                  dismissible={true}
                  onDismiss={handleDismissError}
                />

                <p
                  style={{
                    fontSize: '1rem',
                    lineHeight: 1.6,
                    color: 'var(--hb-black, #292929)',
                    fontFamily: 'var(--hb-font-family, inherit)',
                    margin: '1rem 0',
                    textAlign: 'center',
                  }}
                >
                  Your submission could not be processed. Please try again or go back to review your changes.
                </p>

                <div
                  className="hb-d-flex hb-justify-content-center hb-gap-3 hb-flex-wrap"
                  style={{ marginTop: '1.5rem' }}
                >
                  <Button
                    variant="secondary"
                    label={'\u00AB Back to Review'}
                    onClick={() => navigate('/review', { replace: true })}
                    ariaLabel="Go back to review changes"
                  />
                  <Button
                    variant="primary"
                    label="Retry Submission"
                    onClick={handleRetry}
                    ariaLabel="Retry submitting changes"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Success state — submission confirmed
  return (
    <main className="fluid-wrapper" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div className="hb-row hb-justify-content-center">
        <div className="hb-col-12 hb-col-md-10 hb-col-lg-8">
          {/* Success Header Card */}
          <div className="hb-card hb-mb-4">
            <div
              className="hb-card-header"
              style={{
                textAlign: 'center',
                borderBottom: '3px solid var(--hb-success, #388e3c)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '50%',
                    backgroundColor: 'var(--hb-success, #388e3c)',
                    color: 'var(--hb-white, #ffffff)',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                  }}
                  aria-hidden="true"
                >
                  &#10003;
                </span>
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
            </div>
            <div className="hb-card-body" style={{ textAlign: 'center' }}>
              <Alert
                type="success"
                message="Your signature card changes have been submitted successfully and are being processed."
              />

              {/* Reference ID */}
              {referenceId && (
                <div
                  style={{
                    margin: '1.5rem 0',
                    padding: '1.25rem',
                    backgroundColor: 'var(--hb-gray-100, #f8f9fa)',
                    borderRadius: '8px',
                    border: '1px solid var(--hb-gray-300, #dee2e6)',
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
                    Reference ID
                  </span>
                  <span
                    style={{
                      fontSize: '1.375rem',
                      fontWeight: 700,
                      color: 'var(--hb-primary, #00468b)',
                      fontFamily: 'var(--hb-font-family, inherit)',
                      letterSpacing: '0.025em',
                      wordBreak: 'break-all',
                    }}
                  >
                    {referenceId}
                  </span>
                  <p
                    className="hb-text-muted hb-text-sm"
                    style={{
                      margin: '0.5rem 0 0 0',
                      fontFamily: 'var(--hb-font-family, inherit)',
                    }}
                  >
                    Please save this reference ID for your records.
                  </p>
                </div>
              )}

              {/* Submission Timestamp */}
              {submissionTimestamp && (
                <div style={{ marginBottom: '1rem' }}>
                  <span
                    className="hb-text-muted hb-text-sm"
                    style={{
                      display: 'block',
                      marginBottom: '0.125rem',
                      fontFamily: 'var(--hb-font-family, inherit)',
                    }}
                  >
                    Submitted On
                  </span>
                  <span
                    style={{
                      fontSize: '1rem',
                      fontWeight: 500,
                      color: 'var(--hb-black, #292929)',
                      fontFamily: 'var(--hb-font-family, inherit)',
                    }}
                  >
                    {formatTimestamp(submissionTimestamp)}
                  </span>
                </div>
              )}

              {/* Submitted By */}
              {currentUser && (
                <div style={{ marginBottom: '1rem' }}>
                  <span
                    className="hb-text-muted hb-text-sm"
                    style={{
                      display: 'block',
                      marginBottom: '0.125rem',
                      fontFamily: 'var(--hb-font-family, inherit)',
                    }}
                  >
                    Submitted By
                  </span>
                  <span
                    style={{
                      fontSize: '1rem',
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

              {/* Notification Status */}
              {notificationSent && (
                <div
                  className="hb-alert-success"
                  style={{
                    marginTop: '1rem',
                    fontSize: '0.9375rem',
                  }}
                >
                  <span className="hb-sr-only">Information: </span>
                  A confirmation notification has been sent to your registered email address.
                </div>
              )}
            </div>
          </div>

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
                  <div className="hb-col-12 hb-col-md-4">
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
                  <div className="hb-col-12 hb-col-md-4">
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
                  <div className="hb-col-12 hb-col-md-4">
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
                </div>
              </div>
            </div>
          )}

          {/* Changes Summary Card */}
          {categorizedChanges.total > 0 && (
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
                  Changes Summary
                </h2>
              </div>
              <div className="hb-card-body">
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
                      {categorizedChanges.edits.length} Modified
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

                {/* Change Details List */}
                <div style={{ borderTop: '1px solid var(--hb-gray-300, #dee2e6)' }}>
                  {categorizedChanges.additions.map((change) => {
                    const signerName = getSignerNameFromChange(change, signers);

                    return (
                      <div
                        key={change.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.625rem 0.75rem',
                          borderBottom: '1px solid var(--hb-gray-200, #e9ecef)',
                          borderLeft: `4px solid ${getChangeBorderColor('add')}`,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 500,
                            color: 'var(--hb-black, #292929)',
                            fontFamily: 'var(--hb-font-family, inherit)',
                          }}
                        >
                          {signerName}
                        </span>
                        <span className={getChangeBadgeClass('add')}>
                          {getChangeTypeLabel('add')}
                        </span>
                      </div>
                    );
                  })}

                  {categorizedChanges.edits.map((change) => {
                    const signerName = getSignerNameFromChange(change, signers);

                    return (
                      <div
                        key={change.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.625rem 0.75rem',
                          borderBottom: '1px solid var(--hb-gray-200, #e9ecef)',
                          borderLeft: `4px solid ${getChangeBorderColor('edit')}`,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 500,
                            color: 'var(--hb-black, #292929)',
                            fontFamily: 'var(--hb-font-family, inherit)',
                          }}
                        >
                          {signerName}
                        </span>
                        <span className={getChangeBadgeClass('edit')}>
                          {getChangeTypeLabel('edit')}
                        </span>
                      </div>
                    );
                  })}

                  {categorizedChanges.removals.map((change) => {
                    const signerName = getSignerNameFromChange(change, signers);

                    return (
                      <div
                        key={change.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.625rem 0.75rem',
                          borderBottom: '1px solid var(--hb-gray-200, #e9ecef)',
                          borderLeft: `4px solid ${getChangeBorderColor('remove')}`,
                        }}
                      >
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
                        <span className={getChangeBadgeClass('remove')}>
                          {getChangeTypeLabel('remove')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Next Steps Card */}
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
                Next Steps
              </h2>
            </div>
            <div className="hb-card-body">
              <ol
                style={{
                  margin: 0,
                  paddingLeft: '1.5rem',
                  lineHeight: 1.8,
                  color: 'var(--hb-black, #292929)',
                  fontFamily: 'var(--hb-font-family, inherit)',
                  fontSize: '0.9375rem',
                }}
              >
                <li>
                  Your submission is now being reviewed by the account management team.
                </li>
                <li>
                  A confirmation email has been sent to your registered email address with the reference ID.
                </li>
                <li>
                  New signers will receive invitation emails to complete their identity verification.
                </li>
                <li>
                  You can track the status of your submission using the reference ID:{' '}
                  <strong style={{ color: 'var(--hb-primary, #00468b)' }}>
                    {referenceId || 'N/A'}
                  </strong>
                </li>
                <li>
                  If you need to make additional changes, please start a new submission from the account selection page.
                </li>
              </ol>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            className="hb-d-flex hb-justify-content-center hb-gap-3 hb-flex-wrap"
            style={{ marginTop: '1.5rem' }}
          >
            <Button
              variant="secondary"
              label="Return to Welcome"
              onClick={handleReturnToWelcome}
              ariaLabel="Return to the welcome page"
            />
            <Button
              variant="primary"
              label="Done"
              onClick={handleDone}
              ariaLabel="Return to account selection"
            />
          </div>

          {/* Screen reader live region */}
          <div className="hb-sr-only" aria-live="polite" aria-atomic="true">
            {hasSubmitted
              ? `Submission successful. Reference ID: ${referenceId || 'N/A'}. ${categorizedChanges.total} change${categorizedChanges.total !== 1 ? 's' : ''} submitted.`
              : 'Processing submission.'}
          </div>
        </div>
      </div>
    </main>
  );
}

export default SubmissionScreen;