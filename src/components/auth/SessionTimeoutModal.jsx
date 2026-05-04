import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import SessionManager from '../../services/SessionManager.js';
import AuditLogger from '../../services/AuditLogger.js';

/**
 * Threshold in milliseconds before session expiry at which the warning modal appears.
 * Default: 2 minutes (120000 ms).
 * @type {number}
 */
const WARNING_THRESHOLD_MS = 120000;

/**
 * Interval in milliseconds for updating the countdown display.
 * @type {number}
 */
const COUNTDOWN_INTERVAL_MS = 1000;

/**
 * Formats milliseconds into a human-readable MM:SS string.
 * @param {number} ms - The time remaining in milliseconds.
 * @returns {string} A formatted string like "2:05" or "0:30".
 */
const formatTimeRemaining = (ms) => {
  if (!ms || ms <= 0) {
    return '0:00';
  }

  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Session timeout warning modal that appears before session expiration.
 * Shows a countdown timer with remaining time. Provides a 'Continue Session'
 * button to reset the activity timer and a 'Log Out' button. Uses
 * SessionManager.getTimeRemaining() for the countdown. Auto-logs out
 * when the timer reaches zero.
 *
 * @param {Object} props
 * @param {number} [props.warningThreshold=120000] - Milliseconds before expiry to show the warning.
 * @param {string} [props.className] - Additional CSS class names to apply to the modal content.
 * @returns {React.ReactElement|null} The rendered session timeout modal, or null if not shown.
 */
function SessionTimeoutModal({ warningThreshold = WARNING_THRESHOLD_MS, className = '' }) {
  const { isAuthenticated, logout, refreshSession } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const countdownRef = useRef(null);
  const hasAutoLoggedOutRef = useRef(false);

  /**
   * Starts the countdown interval that checks remaining session time
   * and determines whether to show or hide the modal.
   */
  const startCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    countdownRef.current = setInterval(() => {
      if (!SessionManager.isSessionActive()) {
        setIsVisible(false);
        setTimeRemaining(0);

        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }

        if (!hasAutoLoggedOutRef.current) {
          hasAutoLoggedOutRef.current = true;

          AuditLogger.logEvent('SESSION_TIMEOUT_AUTO_LOGOUT', {
            reason: 'Session expired during timeout warning',
          });

          logout();
        }

        return;
      }

      const remaining = SessionManager.getTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        setIsVisible(false);

        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }

        if (!hasAutoLoggedOutRef.current) {
          hasAutoLoggedOutRef.current = true;

          AuditLogger.logEvent('SESSION_TIMEOUT_AUTO_LOGOUT', {
            reason: 'Timer reached zero',
          });

          logout();
        }

        return;
      }

      if (remaining <= warningThreshold && remaining > 0) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    }, COUNTDOWN_INTERVAL_MS);
  }, [warningThreshold, logout]);

  /**
   * Stops the countdown interval.
   */
  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  /**
   * Manages the countdown lifecycle based on authentication state.
   */
  useEffect(() => {
    if (isAuthenticated) {
      hasAutoLoggedOutRef.current = false;
      startCountdown();
    } else {
      stopCountdown();
      setIsVisible(false);
      setTimeRemaining(0);
    }

    return () => {
      stopCountdown();
    };
  }, [isAuthenticated, startCountdown, stopCountdown]);

  /**
   * Handles the 'Continue Session' button click.
   * Resets the session activity timer and hides the modal.
   */
  const handleContinueSession = useCallback(() => {
    try {
      const refreshed = refreshSession();

      if (refreshed) {
        SessionManager.resetActivityTimer();

        AuditLogger.logEvent('SESSION_EXTENDED', {
          reason: 'User clicked Continue Session',
        });
      }

      setIsVisible(false);
    } catch (_error) {
      // Silently handle errors during session refresh
      setIsVisible(false);
    }
  }, [refreshSession]);

  /**
   * Handles the 'Log Out' button click.
   * Ends the session and logs the user out.
   */
  const handleLogout = useCallback(() => {
    stopCountdown();
    setIsVisible(false);

    AuditLogger.logEvent('SESSION_TIMEOUT_MANUAL_LOGOUT', {
      reason: 'User clicked Log Out from timeout warning',
    });

    logout();
  }, [logout, stopCountdown]);

  if (!isAuthenticated || !isVisible) {
    return null;
  }

  const formattedTime = formatTimeRemaining(timeRemaining);

  return (
    <Modal
      isOpen={isVisible}
      onClose={handleContinueSession}
      title="Session Timeout Warning"
      showCloseButton={false}
      className={className}
    >
      <div className="hb-mb-4" role="status" aria-live="assertive" aria-atomic="true">
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          Your session is about to expire due to inactivity. Would you like to continue?
        </p>
        <p
          style={{
            margin: '1rem 0 0 0',
            fontSize: '1.5rem',
            fontWeight: 700,
            textAlign: 'center',
            color: 'var(--hb-danger, #d32f2f)',
            fontFamily: 'var(--hb-font-family, inherit)',
          }}
          aria-label={`Time remaining: ${formattedTime}`}
        >
          {formattedTime}
        </p>
        <p
          className="hb-text-muted hb-text-center"
          style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}
        >
          Time remaining before automatic logout
        </p>
      </div>
      <div
        className="hb-d-flex hb-justify-content-end hb-gap-2"
        style={{ borderTop: '1px solid var(--hb-gray-300, #dee2e6)', paddingTop: '0.75rem' }}
      >
        <Button
          variant="secondary"
          label="Log Out"
          onClick={handleLogout}
          ariaLabel="Log out now"
        />
        <Button
          variant="primary"
          label="Continue Session"
          onClick={handleContinueSession}
          ariaLabel="Continue your session"
        />
      </div>
    </Modal>
  );
}

SessionTimeoutModal.propTypes = {
  warningThreshold: PropTypes.number,
  className: PropTypes.string,
};

export default SessionTimeoutModal;