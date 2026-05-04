import { useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * Maps alert type props to HB CSS framework class names.
 * @type {Object<string, string>}
 */
const ALERT_CLASS_MAP = {
  error: 'hb-alert-critical',
  warning: 'hb-alert-warning',
  success: 'hb-alert-success',
  info: 'hb-alert-warning',
};

/**
 * Maps alert type props to accessible label prefixes.
 * @type {Object<string, string>}
 */
const ALERT_LABEL_MAP = {
  error: 'Error',
  warning: 'Warning',
  success: 'Success',
  info: 'Information',
};

/**
 * Reusable alert/notification component using HB CSS framework classes.
 * Supports error, warning, success, and info alert types with optional
 * dismiss functionality and ARIA accessibility attributes.
 *
 * @param {Object} props
 * @param {'error'|'warning'|'success'|'info'} [props.type='error'] - The alert type determining styling.
 * @param {string} props.message - The alert message to display.
 * @param {Function} [props.onDismiss] - Callback invoked when the dismiss button is clicked.
 * @param {boolean} [props.dismissible=false] - Whether the alert can be dismissed.
 * @param {string} [props.className] - Additional CSS class names to apply.
 * @returns {React.ReactElement|null} The rendered alert component, or null if no message.
 */
function Alert({ type = 'error', message, onDismiss, dismissible = false, className = '' }) {
  const handleDismiss = useCallback(() => {
    if (typeof onDismiss === 'function') {
      onDismiss();
    }
  }, [onDismiss]);

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return null;
  }

  const alertClass = ALERT_CLASS_MAP[type] || ALERT_CLASS_MAP.error;
  const alertLabel = ALERT_LABEL_MAP[type] || ALERT_LABEL_MAP.error;
  const combinedClassName = `${alertClass}${className ? ` ${className}` : ''}`;

  return (
    <div
      className={combinedClassName}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={dismissible ? { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } : undefined}
    >
      <span>
        <span className="hb-sr-only">{alertLabel}: </span>
        {message}
      </span>
      {dismissible && typeof onDismiss === 'function' && (
        <button
          type="button"
          className="hb-modal-close"
          onClick={handleDismiss}
          aria-label={`Dismiss ${alertLabel.toLowerCase()} alert`}
          style={{ marginLeft: '0.75rem', flexShrink: 0 }}
        >
          &times;
        </button>
      )}
    </div>
  );
}

Alert.propTypes = {
  type: PropTypes.oneOf(['error', 'warning', 'success', 'info']),
  message: PropTypes.string,
  onDismiss: PropTypes.func,
  dismissible: PropTypes.bool,
  className: PropTypes.string,
};

export default Alert;