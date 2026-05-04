import { useCallback } from 'react';
import PropTypes from 'prop-types';
import Button from '../common/Button.jsx';
import { SIGNER_STATUSES } from '../../constants/constants.js';

/**
 * Returns the HB CSS badge class for a given signer status.
 * @param {string} status - The signer status.
 * @returns {string} The badge class string.
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
 * Returns the border-left color for a given signer status.
 * @param {string} status - The signer status.
 * @returns {string} The CSS border-left color value.
 */
const getStatusBorderColor = (status) => {
  switch (status) {
    case SIGNER_STATUSES.ACTIVE:
      return 'var(--hb-success, #388e3c)';
    case SIGNER_STATUSES.PENDING:
      return 'var(--hb-warning, #f57c00)';
    case SIGNER_STATUSES.REVOKED:
      return 'var(--hb-danger, #d32f2f)';
    case SIGNER_STATUSES.INACTIVE:
      return 'var(--hb-gray-500, #adb5bd)';
    default:
      return 'var(--hb-gray-300, #dee2e6)';
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
 * Individual signer display card component used in signer list.
 * Shows signer name, role/title, status badge, contact info (email, phone).
 * Renders action buttons based on signer status: Edit/Remove for active,
 * Unlock for locked, Resend for pending. HB CSS card styling with status indicators.
 *
 * @param {Object} props
 * @param {Object} props.signer - The signer object to display.
 * @param {string} props.signer.id - The signer ID.
 * @param {string} [props.signer.firstName] - The signer's first name.
 * @param {string} [props.signer.middleName] - The signer's middle name.
 * @param {string} [props.signer.lastName] - The signer's last name.
 * @param {string} [props.signer.title] - The signer's title.
 * @param {string} [props.signer.role] - The signer's role.
 * @param {string} [props.signer.status] - The signer's current status.
 * @param {string} [props.signer.email] - The signer's email address.
 * @param {string} [props.signer.phone] - The signer's phone number.
 * @param {boolean} [props.signer.isLocked] - Whether the signer is currently locked.
 * @param {Function} [props.onEdit] - Callback invoked when the Edit button is clicked. Receives the signer ID.
 * @param {Function} [props.onRemove] - Callback invoked when the Remove button is clicked. Receives the signer object.
 * @param {Function} [props.onUnlock] - Callback invoked when the Unlock button is clicked. Receives the signer object.
 * @param {Function} [props.onResend] - Callback invoked when the Resend button is clicked. Receives the signer object.
 * @param {boolean} [props.disabled=false] - Whether action buttons should be disabled.
 * @param {string} [props.className] - Additional CSS class names to apply to the card wrapper.
 * @returns {React.ReactElement|null} The rendered signer card component, or null if no signer is provided.
 */
function SignerCard({ signer, onEdit, onRemove, onUnlock, onResend, disabled = false, className = '' }) {
  const handleEdit = useCallback(() => {
    if (typeof onEdit === 'function' && signer && signer.id) {
      onEdit(signer.id);
    }
  }, [onEdit, signer]);

  const handleRemove = useCallback(() => {
    if (typeof onRemove === 'function' && signer) {
      onRemove(signer);
    }
  }, [onRemove, signer]);

  const handleUnlock = useCallback(() => {
    if (typeof onUnlock === 'function' && signer) {
      onUnlock(signer);
    }
  }, [onUnlock, signer]);

  const handleResend = useCallback(() => {
    if (typeof onResend === 'function' && signer) {
      onResend(signer);
    }
  }, [onResend, signer]);

  if (!signer) {
    return null;
  }

  const fullName = getSignerFullName(signer);
  const isLocked = signer.isLocked === true;
  const isPending = signer.status === SIGNER_STATUSES.PENDING;
  const isRevoked = signer.status === SIGNER_STATUSES.REVOKED;
  const statusBorderColor = getStatusBorderColor(signer.status);
  const statusBadgeClass = getStatusBadgeClass(signer.status);

  const wrapperClassName = `hb-card${className ? ` ${className}` : ''}`;

  return (
    <div
      className={wrapperClassName}
      style={{
        borderLeft: `4px solid ${statusBorderColor}`,
        height: '100%',
      }}
      role="article"
      aria-label={`Signer card for ${fullName}`}
    >
      <div className="hb-card-body">
        {/* Header: Name + Status */}
        <div
          className="hb-d-flex hb-justify-content-between hb-align-items-start hb-flex-wrap hb-gap-2"
          style={{ marginBottom: '0.75rem' }}
        >
          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
            <h3
              style={{
                fontSize: '1.0625rem',
                fontWeight: 600,
                color: 'var(--hb-primary, #00468b)',
                margin: 0,
                fontFamily: 'var(--hb-font-family, inherit)',
                wordBreak: 'break-word',
              }}
            >
              {fullName}
            </h3>
            {(signer.title || signer.role) && (
              <p
                style={{
                  fontSize: '0.9375rem',
                  color: 'var(--hb-gray-700, #495057)',
                  margin: '0.125rem 0 0 0',
                  fontFamily: 'var(--hb-font-family, inherit)',
                }}
              >
                {signer.title || ''}
                {signer.role && signer.role !== signer.title && (
                  <span
                    className="hb-text-muted"
                    style={{ marginLeft: signer.title ? '0.5rem' : 0, fontSize: '0.875rem' }}
                  >
                    {signer.title ? `(${signer.role})` : signer.role}
                  </span>
                )}
              </p>
            )}
          </div>
          <div
            className="hb-d-flex hb-align-items-center hb-gap-2"
            style={{ flexShrink: 0 }}
          >
            {isLocked && (
              <span
                className="hb-badge hb-badge-danger"
                style={{ fontSize: '0.6875rem' }}
              >
                Locked
              </span>
            )}
            <span className={statusBadgeClass}>
              {signer.status || 'Unknown'}
            </span>
          </div>
        </div>

        {/* Contact Info */}
        <div
          style={{
            fontSize: '0.875rem',
            color: 'var(--hb-gray-700, #495057)',
            fontFamily: 'var(--hb-font-family, inherit)',
            marginBottom: '0.75rem',
          }}
        >
          {signer.email && (
            <div
              className="hb-d-flex hb-align-items-center hb-gap-2"
              style={{ marginBottom: '0.25rem' }}
            >
              <span className="hb-text-muted" style={{ minWidth: '3rem' }}>Email:</span>
              <span style={{ wordBreak: 'break-all' }}>{signer.email}</span>
            </div>
          )}
          {signer.phone && (
            <div className="hb-d-flex hb-align-items-center hb-gap-2">
              <span className="hb-text-muted" style={{ minWidth: '3rem' }}>Phone:</span>
              <span>{signer.phone}</span>
            </div>
          )}
          {!signer.email && !signer.phone && (
            <span className="hb-text-muted">No contact information available.</span>
          )}
        </div>

        {/* Action Buttons */}
        <div
          className="hb-d-flex hb-justify-content-end hb-gap-1 hb-flex-wrap"
          style={{
            borderTop: '1px solid var(--hb-gray-200, #e9ecef)',
            paddingTop: '0.75rem',
          }}
        >
          {typeof onEdit === 'function' && (
            <Button
              variant="secondary"
              label="Edit"
              onClick={handleEdit}
              ariaLabel={`Edit ${fullName}`}
              disabled={disabled || isRevoked}
              className="hb-text-sm"
            />
          )}
          {typeof onRemove === 'function' && (
            <Button
              variant="secondary"
              label="Remove"
              onClick={handleRemove}
              ariaLabel={`Remove ${fullName}`}
              disabled={disabled}
              className="hb-text-sm"
            />
          )}
          {isLocked && typeof onUnlock === 'function' && (
            <Button
              variant="primary"
              label="Unlock"
              onClick={handleUnlock}
              ariaLabel={`Unlock ${fullName}`}
              disabled={disabled}
              className="hb-text-sm"
            />
          )}
          {isPending && typeof onResend === 'function' && (
            <Button
              variant="primary"
              label="Resend"
              onClick={handleResend}
              ariaLabel={`Resend invitation to ${fullName}`}
              disabled={disabled}
              className="hb-text-sm"
            />
          )}
        </div>
      </div>

      {/* Screen reader summary */}
      <div className="hb-sr-only" aria-live="polite" aria-atomic="true">
        {`${fullName}, ${signer.title || signer.role || 'No title'}, Status: ${signer.status || 'Unknown'}${isLocked ? ', Account locked' : ''}`}
      </div>
    </div>
  );
}

SignerCard.propTypes = {
  signer: PropTypes.shape({
    id: PropTypes.string.isRequired,
    firstName: PropTypes.string,
    middleName: PropTypes.string,
    lastName: PropTypes.string,
    title: PropTypes.string,
    role: PropTypes.string,
    status: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
    isLocked: PropTypes.bool,
  }),
  onEdit: PropTypes.func,
  onRemove: PropTypes.func,
  onUnlock: PropTypes.func,
  onResend: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default SignerCard;