import { useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * Step-based progress indicator component showing the user's position in a multi-step flow.
 * Renders a horizontal step bar with completed, active, and disabled states.
 * Allows backward navigation to completed steps and disables forward navigation
 * to unreached steps. Uses ARIA attributes for accessibility.
 *
 * @param {Object} props
 * @param {Array<{ step: number, label: string, description: string }>} props.steps - Array of step definitions.
 * @param {number} props.currentStep - The current active step number (1-based).
 * @param {Function} [props.onStepClick] - Callback invoked when a completed step is clicked. Receives the step number.
 * @param {string} [props.className] - Additional CSS class names to apply to the wrapper.
 * @returns {React.ReactElement} The rendered progress indicator component.
 */
function ProgressIndicator({ steps, currentStep, onStepClick, className = '' }) {
  const handleStepClick = useCallback(
    (stepNumber) => {
      if (typeof onStepClick === 'function' && stepNumber < currentStep) {
        onStepClick(stepNumber);
      }
    },
    [onStepClick, currentStep],
  );

  const handleKeyDown = useCallback(
    (event, stepNumber) => {
      if (
        (event.key === 'Enter' || event.key === ' ') &&
        stepNumber < currentStep
      ) {
        event.preventDefault();
        if (typeof onStepClick === 'function') {
          onStepClick(stepNumber);
        }
      }
    },
    [onStepClick, currentStep],
  );

  if (!Array.isArray(steps) || steps.length === 0) {
    return null;
  }

  const wrapperClassName = `progress-indicator${className ? ` ${className}` : ''}`;

  return (
    <nav aria-label="Progress" className={wrapperClassName}>
      <ol
        className="hb-d-flex hb-align-items-center hb-justify-content-between hb-w-100"
        role="list"
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          width: '100%',
        }}
      >
        {steps.map((stepDef, index) => {
          const stepNumber = stepDef.step || index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          const isDisabled = stepNumber > currentStep;
          const isClickable = isCompleted && typeof onStepClick === 'function';

          let stepStatus = 'disabled';
          if (isCompleted) {
            stepStatus = 'completed';
          } else if (isActive) {
            stepStatus = 'active';
          }

          const ariaLabel = isCompleted
            ? `Step ${stepNumber}: ${stepDef.label} - Completed. Click to go back.`
            : isActive
              ? `Step ${stepNumber}: ${stepDef.label} - Current step`
              : `Step ${stepNumber}: ${stepDef.label} - Not yet reached`;

          return (
            <li
              key={stepNumber}
              className="progress-indicator__step"
              style={{
                display: 'flex',
                alignItems: 'center',
                flex: index < steps.length - 1 ? '1 1 0%' : '0 0 auto',
              }}
            >
              <div
                className="progress-indicator__step-content"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  minWidth: '2.5rem',
                }}
              >
                <div
                  role={isClickable ? 'button' : undefined}
                  tabIndex={isClickable ? 0 : -1}
                  onClick={isClickable ? () => handleStepClick(stepNumber) : undefined}
                  onKeyDown={isClickable ? (e) => handleKeyDown(e, stepNumber) : undefined}
                  aria-label={ariaLabel}
                  aria-current={isActive ? 'step' : undefined}
                  aria-disabled={isDisabled || undefined}
                  style={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    fontFamily: 'var(--hb-font-family, inherit)',
                    transition: 'background-color 0.2s ease-in-out, border-color 0.2s ease-in-out, color 0.2s ease-in-out',
                    cursor: isClickable ? 'pointer' : 'default',
                    backgroundColor: isCompleted
                      ? 'var(--hb-primary, #00468b)'
                      : isActive
                        ? 'var(--hb-white, #ffffff)'
                        : 'var(--hb-gray-200, #e9ecef)',
                    color: isCompleted
                      ? 'var(--hb-white, #ffffff)'
                      : isActive
                        ? 'var(--hb-primary, #00468b)'
                        : 'var(--hb-gray-500, #adb5bd)',
                    border: isActive
                      ? '2px solid var(--hb-primary, #00468b)'
                      : isCompleted
                        ? '2px solid var(--hb-primary, #00468b)'
                        : '2px solid var(--hb-gray-400, #ced4da)',
                    outline: 'none',
                  }}
                >
                  {isCompleted ? (
                    <span aria-hidden="true">&#10003;</span>
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </div>
                <span
                  style={{
                    marginTop: '0.375rem',
                    fontSize: '0.75rem',
                    fontWeight: isActive ? 600 : 400,
                    color: isCompleted
                      ? 'var(--hb-primary, #00468b)'
                      : isActive
                        ? 'var(--hb-primary, #00468b)'
                        : 'var(--hb-gray-600, #6c757d)',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--hb-font-family, inherit)',
                  }}
                >
                  {stepDef.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  aria-hidden="true"
                  style={{
                    flex: '1 1 0%',
                    height: '2px',
                    marginLeft: '0.5rem',
                    marginRight: '0.5rem',
                    marginBottom: '1.25rem',
                    backgroundColor: stepNumber < currentStep
                      ? 'var(--hb-primary, #00468b)'
                      : 'var(--hb-gray-300, #dee2e6)',
                    transition: 'background-color 0.2s ease-in-out',
                  }}
                />
              )}
            </li>
          );
        })}
      </ol>
      <div className="hb-sr-only" aria-live="polite" aria-atomic="true">
        {`Step ${currentStep} of ${steps.length}: ${
          steps.find((s) => (s.step || 0) === currentStep)?.label || ''
        }`}
      </div>
    </nav>
  );
}

ProgressIndicator.propTypes = {
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      step: PropTypes.number.isRequired,
      label: PropTypes.string.isRequired,
      description: PropTypes.string,
    }),
  ).isRequired,
  currentStep: PropTypes.number.isRequired,
  onStepClick: PropTypes.func,
  className: PropTypes.string,
};

export default ProgressIndicator;