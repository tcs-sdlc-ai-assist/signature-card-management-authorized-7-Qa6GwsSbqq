import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import FloatingLabelInput from '../components/common/FloatingLabelInput.jsx';
import Button from '../components/common/Button.jsx';
import Alert from '../components/common/Alert.jsx';
import {
  validateRequired,
  validateMinLength,
  validateForm,
  hasErrors,
} from '../utils/validators.js';

/**
 * Field validation configuration for the sign-up form.
 * Each field has an array of validator functions that run in order.
 * @type {Object}
 */
const FIELD_CONFIG = {
  username: {
    validators: [
      (v) => validateRequired(v, 'Username'),
      (v) => validateMinLength(v, 3, 'Username'),
    ],
  },
  password: {
    validators: [
      (v) => validateRequired(v, 'Password'),
      (v) => validateMinLength(v, 8, 'Password'),
    ],
  },
  confirmPassword: {
    validators: [
      (v) => validateRequired(v, 'Confirm Password'),
    ],
  },
};

/**
 * Validates that the password and confirm password fields match.
 * @param {string} password - The password value.
 * @param {string} confirmPassword - The confirm password value.
 * @returns {string} An error message if they don't match, or an empty string if they do.
 */
const validatePasswordMatch = (password, confirmPassword) => {
  if (
    confirmPassword &&
    confirmPassword.trim().length > 0 &&
    password !== confirmPassword
  ) {
    return 'Passwords do not match.';
  }
  return '';
};

/**
 * Sign up page with floating label form fields for username, password,
 * and confirm password. Validates all fields inline using validators.js.
 * On successful signup, redirects to login. Displays generic error messages
 * that don't reveal which field is incorrect. Uses AuthContext.signup().
 * HB CSS form styling.
 *
 * @returns {React.ReactElement} The rendered sign-up screen component.
 */
function SignUpScreen() {
  const navigate = useNavigate();
  const { signup, isLoading, error: authError, clearError } = useAuth();

  const [formValues, setFormValues] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handles input change events. Updates form values and clears
   * the field-level error for the changed field.
   * @param {React.ChangeEvent<HTMLInputElement>} event - The change event.
   */
  const handleChange = useCallback(
    (event) => {
      const { name, value } = event.target;

      setFormValues((prev) => ({
        ...prev,
        [name]: value,
      }));

      setFieldErrors((prev) => ({
        ...prev,
        [name]: '',
      }));

      if (submitError) {
        setSubmitError(null);
      }

      if (authError) {
        clearError();
      }
    },
    [submitError, authError, clearError],
  );

  /**
   * Handles input blur events. Validates the blurred field inline.
   * @param {React.FocusEvent<HTMLInputElement>} event - The blur event.
   */
  const handleBlur = useCallback(
    (event) => {
      const { name, value } = event.target;

      if (FIELD_CONFIG[name]) {
        const errors = validateForm(
          { [name]: value },
          { [name]: FIELD_CONFIG[name] },
        );

        let fieldError = errors[name] || '';

        // Additional check for confirmPassword match on blur
        if (name === 'confirmPassword' && !fieldError) {
          fieldError = validatePasswordMatch(formValues.password, value);
        }

        // Additional check for password field — also revalidate confirmPassword if it has a value
        if (name === 'password' && formValues.confirmPassword.trim().length > 0) {
          const confirmError = validatePasswordMatch(value, formValues.confirmPassword);
          setFieldErrors((prev) => ({
            ...prev,
            [name]: fieldError,
            confirmPassword: confirmError,
          }));
          return;
        }

        setFieldErrors((prev) => ({
          ...prev,
          [name]: fieldError,
        }));
      }
    },
    [formValues.password, formValues.confirmPassword],
  );

  /**
   * Validates the entire form and returns whether it is valid.
   * @returns {boolean} True if the form is valid, false otherwise.
   */
  const validateAllFields = useCallback(() => {
    const errors = validateForm(formValues, FIELD_CONFIG);

    // Check password match
    const matchError = validatePasswordMatch(
      formValues.password,
      formValues.confirmPassword,
    );

    if (matchError) {
      errors.confirmPassword = matchError;
    }

    setFieldErrors(errors);

    return !hasErrors(errors);
  }, [formValues]);

  /**
   * Handles form submission. Validates all fields, calls signup via AuthContext,
   * and redirects to login on success.
   * @param {React.FormEvent} event - The form submit event.
   */
  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      setSubmitError(null);

      if (authError) {
        clearError();
      }

      const isValid = validateAllFields();

      if (!isValid) {
        return;
      }

      setIsSubmitting(true);

      try {
        const result = await signup({
          username: formValues.username.trim(),
          password: formValues.password,
        });

        if (result && result.status === 'success') {
          navigate('/login', {
            state: { message: 'Account created successfully. Please log in.' },
            replace: true,
          });
        } else {
          const errorMessage =
            result && result.message
              ? result.message
              : 'An unexpected error occurred. Please try again.';
          setSubmitError(errorMessage);
        }
      } catch (_error) {
        setSubmitError('An unexpected error occurred. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [formValues, validateAllFields, signup, navigate, authError, clearError],
  );

  /**
   * Dismisses the submit error alert.
   */
  const handleDismissError = useCallback(() => {
    setSubmitError(null);

    if (authError) {
      clearError();
    }
  }, [authError, clearError]);

  const displayError = submitError || authError || null;
  const formDisabled = isSubmitting || isLoading;

  return (
    <main className="fluid-wrapper" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div className="hb-row hb-justify-content-center">
        <div className="hb-col-12 hb-col-sm-8 hb-col-md-6 hb-col-lg-4">
          <div className="hb-card">
            <div className="hb-card-header">
              <h1
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  color: 'var(--hb-primary, #00468b)',
                  margin: 0,
                  textAlign: 'center',
                  fontFamily: 'var(--hb-font-family, inherit)',
                }}
              >
                Create Account
              </h1>
            </div>
            <div className="hb-card-body">
              {displayError && (
                <Alert
                  type="error"
                  message={displayError}
                  dismissible={true}
                  onDismiss={handleDismissError}
                />
              )}

              <p
                className="hb-text-muted hb-text-sm"
                style={{
                  marginBottom: '1.25rem',
                  fontFamily: 'var(--hb-font-family, inherit)',
                }}
              >
                Fields marked with * are required.
              </p>

              <form onSubmit={handleSubmit} noValidate>
                <FloatingLabelInput
                  id="username"
                  name="username"
                  label="Username"
                  type="text"
                  value={formValues.username}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={fieldErrors.username}
                  required={true}
                  disabled={formDisabled}
                  autoComplete="username"
                  ariaDescribedBy="signup-username-hint"
                />

                <FloatingLabelInput
                  id="password"
                  name="password"
                  label="Password"
                  type="password"
                  value={formValues.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={fieldErrors.password}
                  required={true}
                  disabled={formDisabled}
                  autoComplete="new-password"
                  ariaDescribedBy="signup-password-hint"
                />

                <FloatingLabelInput
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  value={formValues.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={fieldErrors.confirmPassword}
                  required={true}
                  disabled={formDisabled}
                  autoComplete="new-password"
                  ariaDescribedBy="signup-confirm-hint"
                />

                <div
                  id="signup-password-hint"
                  className="hb-text-muted hb-text-sm"
                  style={{
                    marginBottom: '1.25rem',
                    fontFamily: 'var(--hb-font-family, inherit)',
                  }}
                >
                  Password must be at least 8 characters long.
                </div>

                <Button
                  variant="primary"
                  label="Sign Up"
                  type="submit"
                  loading={formDisabled}
                  disabled={formDisabled}
                  ariaLabel="Create your account"
                  className="hb-w-100"
                />
              </form>

              <div
                className="hb-text-center hb-mt-4"
                style={{ fontFamily: 'var(--hb-font-family, inherit)' }}
              >
                <p className="hb-text-sm" style={{ margin: 0 }}>
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    style={{
                      color: 'var(--hb-primary, #00468b)',
                      fontWeight: 500,
                      textDecoration: 'none',
                    }}
                  >
                    Log In
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default SignUpScreen;