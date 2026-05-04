import { useCallback } from 'react';
import PropTypes from 'prop-types';
import Modal from './Modal.jsx';
import Button from './Button.jsx';

/**
 * Confirmation modal for destructive actions such as removing a signer,
 * canceling a flow, or discarding unsaved changes. Extends the Modal
 * component with confirm/cancel buttons in the footer area.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is currently visible.
 * @param {Function} props.onConfirm - Callback invoked when the confirm button is clicked.
 * @param {Function} props.onCancel - Callback invoked when the cancel button is clicked or the modal is dismissed.
 * @param {string} props.title - The title displayed in the modal header.
 * @param {string} props.message - The confirmation message displayed in the modal body.
 * @param {string} [props.confirmLabel='Confirm'] - The label for the confirm button.
 * @param {string} [props.cancelLabel='Cancel'] - The label for the cancel button.
 * @param {boolean} [props.loading=false] - Whether the confirm action is in progress.
 * @param {string} [props.className] - Additional CSS class names to apply to the modal content.
 * @returns {React.ReactElement|null} The rendered confirmation modal, or null if not open.
 */
function ConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  className = '',
}) {
  const handleConfirm = useCallback(() => {
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    if (typeof onCancel === 'function') {
      onCancel();
    }
  }, [onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={title}
      showCloseButton={true}
      className={className}
    >
      <div className="hb-mb-4">
        <p style={{ margin: 0, lineHeight: 1.6 }}>{message}</p>
      </div>
      <div className="hb-modal-footer" style={{ padding: 0, borderTop: 'none' }}>
        <Button
          variant="secondary"
          label={cancelLabel}
          onClick={handleCancel}
          disabled={loading}
          ariaLabel={cancelLabel}
        />
        <Button
          variant="primary"
          label={confirmLabel}
          onClick={handleConfirm}
          loading={loading}
          ariaLabel={confirmLabel}
        />
      </div>
    </Modal>
  );
}

ConfirmationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  loading: PropTypes.bool,
  className: PropTypes.string,
};

export default ConfirmationModal;