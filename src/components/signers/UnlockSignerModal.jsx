import { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import Alert from '../common/Alert.jsx';
import UnlockService from '../../services/UnlockService.js';
import AuditLogger from '../../services/AuditLogger.js';

/**
 * Self-service unlock signer modal with rate-limiting.
 * Shows signer name and unlock action. Calls UnlockService.unlockSigner()
 * with rate-limiting (3/day). Displays attempt-based contextual messaging
 * from the messaging matrix. After the daily limit is reached, shows a
 * 'Contact Support' message. Logs all attempts via AuditLogger.
 * Uses Modal and Button components.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is currently visible.
 * @param {Function} props.onClose - Callback invoked when the modal should close.
 * @param {Object} props.signer - The signer object to unlock.
 * @param {string} props.signer.id - The signer ID.
 * @param {string} [props.signer.firstName] - The signer's first name.
 * @param {string} [props.signer.middleName] - The signer's middle name.
 * @param {string} [props.signer.lastName] - The signer's last name.
 * @param {boolean} [props.signer.isLocked] - Whether the signer is currently locked.
 * @param {Function} [props.onUnlockSuccess] - Callback invoked after a successful unlock attempt.
 * @param {string} [props.className] - Additional CSS class names to apply to the modal content.
 * @returns {React.ReactElement|null} The rendered unlock signer modal, or null if not open.
 */
function UnlockSignerModal({ isOpen, onClose, signer, onUnlockSuccess, className = '' }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [isLimitReached, setIsLimitReached] = useState(false);

  /**
   * Returns the full name string for the signer.
   * @returns {string} The signer's full name.
   */
  const getSignerFullName = useCallback(() => {
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
  }, [signer]);

  /**
   * Checks the current rate limit status when the modal opens.
   */
  useEffect(() => {
    if (isOpen && signer && signer.id) {
      try {
        const limitReached = UnlockService.isLimitReached(signer.id);
        setIsLimitReached(limitReached);

        const remaining = UnlockService.getRemainingAttempts(signer.id);
        setAttemptsRemaining(remaining);
      } catch (_error) {
        // Silently handle errors checking rate limit
      }
    }
  }, [isOpen, signer]);

  /**
   * Resets modal state when it opens or closes.
   */
  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  /**
   * Handles the unlock action. Calls UnlockService.unlockSigner()
   * and displays the contextual message from the messaging matrix.
   */
  const handleUnlock = useCallback(() => {
    if (!signer || !signer.id || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      AuditLogger.logEvent('UNLOCK_MODAL_ATTEMPT', {
        signerId: signer.id,
        signerName: getSignerFullName(),
      });

      const result = UnlockService.unlockSigner(signer.id);

      if (result && result.status === 'success') {
        setSuccessMessage(result.message || 'Unlock request has been staged successfully.');

        if (typeof result.attemptsRemaining === 'number') {
          setAttemptsRemaining(result.attemptsRemaining);
        }

        // Check if limit is now reached after this attempt
        const limitReached = UnlockService.isLimitReached(signer.id);
        setIsLimitReached(limitReached);

        AuditLogger.logEvent('UNLOCK_MODAL_SUCCESS', {
          signerId: signer.id,
          signerName: getSignerFullName(),
          attemptsRemaining: result.attemptsRemaining,
        });

        if (typeof onUnlockSuccess === 'function') {
          onUnlockSuccess(signer.id);
        }
      } else {
        const msg =
          result && result.message
            ? result.message
            : 'Failed to unlock signer. Please try again.';
        setErrorMessage(msg);

        if (typeof result.attemptsRemaining === 'number') {
          setAttemptsRemaining(result.attemptsRemaining);
        }

        // Check if limit is now reached
        const limitReached = UnlockService.isLimitReached(signer.id);
        setIsLimitReached(limitReached);

        AuditLogger.logEvent('UNLOCK_MODAL_FAILED', {
          signerId: signer.id,
          signerName: getSignerFullName(),
          reason: msg,
          attemptsRemaining: result ? result.attemptsRemaining : 0,
        });
      }
    } catch (_error) {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [signer, isSubmitting, getSignerFullName, onUnlockSuccess]);

  /**
   * Handles closing the modal.
   */
  const handleClose = useCallback(() => {
    if (typeof onClose === 'function') {
      onClose();
    }
  }, [onClose]);

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
  }, []);

  if (!isOpen) {
    return null;
  }

  const signerName = getSignerFullName();
  const dailyLimit = UnlockService.getDailyLimit();
  const isSignerLocked = signer && signer.isLocked === true;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Unlock Signer"
      showCloseButton={true}
      className={className}
    >
      <div className="hb-mb-4">
        {/* Success Alert */}
        {successMessage && (
          <Alert
            type="success"
            message={successMessage}
            dismissible={true}
            onDismiss={handleDismissSuccess}
          />
        )}

        {/* Error Alert */}
        {errorMessage && (
          <Alert
            type="error"
            message={errorMessage}
            dismissible={!isLimitReached}
            onDismiss={isLimitReached ? undefined : handleDismissError}
          />
        )}

        {/* Rate Limit Reached Alert */}
        {isLimitReached && !errorMessage && (
          <Alert
            type="error"
            message="You have exceeded the maximum number of unlock attempts. Your account has been locked. Please contact support for assistance."
          />
        )}

        {/* Signer Info */}
        <div style={{ marginBottom: '1rem' }}>
          <p
            style={{
              margin: 0,
              lineHeight: 1.6,
              color: 'var(--hb-black, #292929)',
              fontFamily: 'var(--hb-font-family, inherit)',
            }}
          >
            {isSignerLocked ? (
              <>
                Are you sure you want to unlock{' '}
                <strong style={{ color: 'var(--hb-primary, #00468b)' }}>{signerName}</strong>?
                This will stage an unlock request for review.
              </>
            ) : (
              <>
                <strong style={{ color: 'var(--hb-primary, #00468b)' }}>{signerName}</strong>{' '}
                is not currently locked.
              </>
            )}
          </p>
        </div>

        {/* Attempts Remaining Info */}
        {attemptsRemaining !== null && !isLimitReached && (
          <div
            className="hb-text-muted hb-text-sm"
            style={{
              marginBottom: '0.75rem',
              fontFamily: 'var(--hb-font-family, inherit)',
            }}
          >
            {attemptsRemaining > 0 ? (
              <span>
                You have{' '}
                <strong>
                  {attemptsRemaining} of {dailyLimit}
                </strong>{' '}
                unlock attempt{attemptsRemaining !== 1 ? 's' : ''} remaining today.
              </span>
            ) : (
              <span>No unlock attempts remaining today.</span>
            )}
          </div>
        )}

        {/* Contact Support Message */}
        {isLimitReached && (
          <div
            className="hb-alert-warning"
            style={{ marginTop: '0.75rem' }}
          >
            <p
              style={{
                margin: 0,
                lineHeight: 1.6,
                fontFamily: 'var(--hb-font-family, inherit)',
              }}
            >
              You have reached the daily unlock attempt limit. Please contact your system
              administrator or support team for further assistance.
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div
        className="hb-d-flex hb-justify-content-end hb-gap-2"
        style={{
          borderTop: '1px solid var(--hb-gray-300, #dee2e6)',
          paddingTop: '0.75rem',
        }}
      >
        <Button
          variant="secondary"
          label={successMessage ? 'Close' : 'Cancel'}
          onClick={handleClose}
          disabled={isSubmitting}
          ariaLabel={successMessage ? 'Close modal' : 'Cancel unlock action'}
        />
        {!successMessage && (
          <Button
            variant="primary"
            label="Unlock Signer"
            onClick={handleUnlock}
            loading={isSubmitting}
            disabled={isSubmitting || isLimitReached || !isSignerLocked}
            ariaLabel={`Unlock ${signerName}`}
          />
        )}
      </div>

      {/* Screen reader live region */}
      <div className="hb-sr-only" aria-live="polite" aria-atomic="true">
        {successMessage
          ? `Success: ${successMessage}`
          : errorMessage
            ? `Error: ${errorMessage}`
            : isLimitReached
              ? 'Daily unlock limit reached. Please contact support.'
              : `Unlock signer ${signerName}. ${attemptsRemaining !== null ? `${attemptsRemaining} attempts remaining.` : ''}`}
      </div>
    </Modal>
  );
}

UnlockSignerModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  signer: PropTypes.shape({
    id: PropTypes.string.isRequired,
    firstName: PropTypes.string,
    middleName: PropTypes.string,
    lastName: PropTypes.string,
    isLocked: PropTypes.bool,
  }),
  onUnlockSuccess: PropTypes.func,
  className: PropTypes.string,
};

export default UnlockSignerModal;