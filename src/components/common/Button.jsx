import { useCallback, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * Maps variant props to HB CSS framework button class names.
 * @type {Object<string, string>}
 */
const VARIANT_CLASS_MAP = {
  primary: 'button-primary',
  secondary: 'button-secondary-2',
};

/**
 * Reusable styled button component using HB CSS framework classes.
 * Supports primary and secondary variants, loading state with spinner,
 * and double-click prevention when disabled or loading.
 *
 * @param {Object} props
 * @param {'primary'|'secondary'} [props.variant='primary'] - The button variant determining styling.
 * @param {string} props.label - The button label text.
 * @param {Function} [props.onClick] - Callback invoked when the button is clicked.
 * @param {boolean} [props.disabled=false] - Whether the button is disabled.
 * @param {'button'|'submit'|'reset'} [props.type='button'] - The HTML button type attribute.
 * @param {string} [props.ariaLabel] - Accessible label for the button.
 * @param {boolean} [props.loading=false] - Whether the button is in a loading state.
 * @param {string} [props.className] - Additional CSS class names to apply.
 * @returns {React.ReactElement} The rendered button component.
 */
function Button({
  variant = 'primary',
  label,
  onClick,
  disabled = false,
  type = 'button',
  ariaLabel,
  loading = false,
  className = '',
}) {
  const clickInProgressRef = useRef(false);

  const isDisabled = disabled || loading;

  const handleClick = useCallback(
    (event) => {
      if (isDisabled || clickInProgressRef.current) {
        event.preventDefault();
        return;
      }

      if (typeof onClick === 'function') {
        clickInProgressRef.current = true;

        try {
          onClick(event);
        } finally {
          requestAnimationFrame(() => {
            clickInProgressRef.current = false;
          });
        }
      }
    },
    [onClick, isDisabled],
  );

  const buttonClass = VARIANT_CLASS_MAP[variant] || VARIANT_CLASS_MAP.primary;
  const combinedClassName = `${buttonClass}${className ? ` ${className}` : ''}`;

  return (
    <button
      type={type}
      className={combinedClassName}
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={ariaLabel || undefined}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
    >
      {loading && (
        <span
          className="hb-spinner hb-spinner-sm"
          role="status"
          aria-hidden="true"
          style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}
        />
      )}
      {loading && <span className="hb-sr-only">Loading, please wait.</span>}
      <span style={{ verticalAlign: 'middle' }}>{label}</span>
    </button>
  );
}

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary']),
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  ariaLabel: PropTypes.string,
  loading: PropTypes.bool,
  className: PropTypes.string,
};

export default Button;