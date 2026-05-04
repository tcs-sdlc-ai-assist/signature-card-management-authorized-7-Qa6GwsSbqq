import { useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * Selectors for focusable elements within the modal.
 * @type {string}
 */
const FOCUSABLE_SELECTORS = [
  'a[href]:not([disabled]):not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(', ');

/**
 * Reusable accessible modal component using HB CSS framework classes.
 * Implements focus trapping, Escape key close, ARIA attributes,
 * and prevents background scroll when open.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is currently visible.
 * @param {Function} props.onClose - Callback invoked when the modal should close.
 * @param {string} props.title - The title displayed in the modal header.
 * @param {React.ReactNode} props.children - The content rendered inside the modal body.
 * @param {boolean} [props.showCloseButton=true] - Whether to show the close button in the header.
 * @param {string} [props.className] - Additional CSS class names to apply to the modal content.
 * @returns {React.ReactElement|null} The rendered modal component, or null if not open.
 */
function Modal({ isOpen, onClose, title, children, showCloseButton = true, className = '' }) {
  const modalRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).substring(2, 9)}`);

  /**
   * Returns all focusable elements within the modal.
   * @returns {Array<HTMLElement>} An array of focusable elements.
   */
  const getFocusableElements = useCallback(() => {
    if (!modalRef.current) {
      return [];
    }

    const elements = modalRef.current.querySelectorAll(FOCUSABLE_SELECTORS);
    return Array.from(elements);
  }, []);

  /**
   * Handles keyboard events for focus trapping and Escape key close.
   * @param {KeyboardEvent} event - The keyboard event.
   */
  const handleKeyDown = useCallback(
    (event) => {
      if (!isOpen) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();

        if (typeof onClose === 'function') {
          onClose();
        }

        return;
      }

      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements();

        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [isOpen, onClose, getFocusableElements],
  );

  /**
   * Handles clicks on the modal backdrop to close the modal.
   * @param {React.MouseEvent} event - The click event.
   */
  const handleBackdropClick = useCallback(
    (event) => {
      if (event.target === modalRef.current && typeof onClose === 'function') {
        onClose();
      }
    },
    [onClose],
  );

  /**
   * Handles the close button click.
   */
  const handleCloseClick = useCallback(() => {
    if (typeof onClose === 'function') {
      onClose();
    }
  }, [onClose]);

  /**
   * Manages focus trapping, background scroll prevention, and cleanup.
   */
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement;

      document.body.style.overflow = 'hidden';

      document.addEventListener('keydown', handleKeyDown);

      const frameId = requestAnimationFrame(() => {
        const focusableElements = getFocusableElements();

        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else if (modalRef.current) {
          modalRef.current.focus();
        }
      });

      return () => {
        cancelAnimationFrame(frameId);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';

        if (
          previousActiveElementRef.current &&
          typeof previousActiveElementRef.current.focus === 'function'
        ) {
          previousActiveElementRef.current.focus();
        }
      };
    }

    return undefined;
  }, [isOpen, handleKeyDown, getFocusableElements]);

  if (!isOpen) {
    return null;
  }

  const contentClassName = `hb-modal-content${className ? ` ${className}` : ''}`;

  return (
    <div
      className="hb-modal show"
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId.current}
      onClick={handleBackdropClick}
      tabIndex={-1}
    >
      <div className="hb-modal-dialog-centered">
        <div className={contentClassName}>
          <div className="hb-modal-header">
            <h2 id={titleId.current}>{title}</h2>
            {showCloseButton && (
              <button
                type="button"
                className="hb-modal-close"
                onClick={handleCloseClick}
                aria-label="Close modal"
              >
                &times;
              </button>
            )}
          </div>
          <div className="hb-modal-body">{children}</div>
        </div>
      </div>
    </div>
  );
}

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
  showCloseButton: PropTypes.bool,
  className: PropTypes.string,
};

export default Modal;