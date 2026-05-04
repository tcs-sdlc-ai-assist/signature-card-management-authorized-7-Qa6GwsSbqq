import { useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable floating label input component following HB CSS framework patterns.
 * Implements floating label animation, validation error display with .invaliderr class,
 * and full ARIA accessibility attributes.
 *
 * @param {Object} props
 * @param {string} props.id - The unique ID for the input element.
 * @param {string} props.label - The label text displayed as a floating label.
 * @param {string} [props.type='text'] - The HTML input type attribute.
 * @param {string} [props.value=''] - The current value of the input.
 * @param {Function} props.onChange - Callback invoked when the input value changes.
 * @param {string} [props.error=''] - Validation error message to display below the input.
 * @param {boolean} [props.required=false] - Whether the input is required.
 * @param {boolean} [props.disabled=false] - Whether the input is disabled.
 * @param {string} [props.ariaDescribedBy] - Additional aria-describedby ID(s) for accessibility.
 * @param {string} [props.name] - The name attribute for the input element.
 * @param {string} [props.autoComplete] - The autocomplete attribute for the input element.
 * @param {string} [props.className] - Additional CSS class names to apply to the wrapper.
 * @param {string} [props.placeholder] - Placeholder text (defaults to a single space for floating label behavior).
 * @returns {React.ReactElement} The rendered floating label input component.
 */
function FloatingLabelInput({
  id,
  label,
  type = 'text',
  value = '',
  onChange,
  error = '',
  required = false,
  disabled = false,
  ariaDescribedBy,
  name,
  autoComplete,
  className = '',
  placeholder = ' ',
}) {
  const handleChange = useCallback(
    (event) => {
      if (typeof onChange === 'function') {
        onChange(event);
      }
    },
    [onChange],
  );

  const hasError = typeof error === 'string' && error.trim().length > 0;
  const errorId = hasError ? `${id}-error` : undefined;

  const describedByParts = [];
  if (errorId) {
    describedByParts.push(errorId);
  }
  if (ariaDescribedBy) {
    describedByParts.push(ariaDescribedBy);
  }
  const describedBy = describedByParts.length > 0 ? describedByParts.join(' ') : undefined;

  const inputClassName = `hb-form-control${hasError ? ' invaliderr' : ''}${value ? ' has-value' : ''}`;
  const wrapperClassName = `hb-floating-label hb-form-group${className ? ` ${className}` : ''}`;

  return (
    <div className={wrapperClassName}>
      <input
        id={id}
        name={name || id}
        type={type}
        className={inputClassName}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        autoComplete={autoComplete || undefined}
      />
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {hasError && (
        <span id={errorId} className="invaliderr" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

FloatingLabelInput.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  type: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  ariaDescribedBy: PropTypes.string,
  name: PropTypes.string,
  autoComplete: PropTypes.string,
  className: PropTypes.string,
  placeholder: PropTypes.string,
};

export default FloatingLabelInput;