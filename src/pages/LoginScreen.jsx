import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
 * Field validation configuration for the login form.
 * Each field has an array of validator functions that run in order.
 * @type {Object}
 */
const FIELD_CONFIG = {
  username: {
    validators: [(v) => validateRequired(v, 'Username')],
  },
  password: {
    validators: [(v) => validateRequired(v, 'Password')],
  },
};

/**
 * Login page with floating label form fields for username and password.
 * Validates credentials via AuthContext.login(). Tracks failed attempts
 * and displays lockout message after threshold. Shows generic error messages
 * that don't reveal which field is incorrect. Link to sign up page.
 * HB CSS form styling with .invaliderr for errors.
 *
 * @returns {React.ReactElement} The rendered login screen component.
 */
function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error: authError, clearError, isAuthenticated } = useAuth();

  const [formValues, setFormValues] = useState({
    username: '',
    password: '',
  });

  const [fieldErrors, setFieldErrors] = useState({
    username: '',
    password: '',
  });

  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  /**
   * Check for success message from navigation state (e.g., after sign up).
   */
  useEffect(() => {
    if (location.state && location.state.message) {
      setSuccessMessage(location.state.message);
      // Clear the state so the message doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  /**
   * Redirect if already authenticated.
   */
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

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

      if (successMessage) {
        setSuccessMessage(null);
      }

      if (authError) {
        clearError();
      }
    },
    [submitError, successMessage, authError, clearError],
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

        setFieldErrors((prev) => ({
          ...prev,
          [name]: errors[name] || '',
        }));
      }
    },
    [],
  );

  /**
   * Validates the entire form and returns whether it is valid.
   * @returns {boolean} True if the form is valid, false otherwise.
   */
  const validateAllFields = useCallback(() => {
    const errors = validateForm(formValues, FIELD_CONFIG);
    setFieldErrors(errors);
    return !hasErrors(errors);
  }, [formValues]);

  /**
   * Handles form submission. Validates all fields, calls login via AuthContext,
   * and redirects to the appropriate page on success.
   * @param {React.FormEvent} event - The form submit event.
   */
  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      setSubmitError(null);
      setSuccessMessage(null);

      if (authError) {
        clearError();
      }

      if (isLockedOut) {
        return;
      }

      const isValid = validateAllFields();

      if (!isValid) {
        return;
      }

      setIsSubmitting(true);

      try {
        const result = await login(
          formValues.username.trim(),
          formValues.password,
        );

        if (result && result.status === 'success') {
          const from = location.state?.from?.pathname || '/dashboard';
          navigate(from, { replace: true });
        } else {
          if (result && result.lockout) {
            setIsLockedOut(true);
          }

          const errorMessage =
            result && result.message
              ? result.message
              : 'Invalid username or password. Please try again.';
          setSubmitError(errorMessage);
        }
      } catch (_error) {
        setSubmitError('An unexpected error occurred. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      formValues,
      validateAllFields,
      login,
      navigate,
      location.state,
      authError,
      clearError,
      isLockedOut,
    ],
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

  /**
   * Dismisses the success message alert.
   */
  const handleDismissSuccess = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  const displayError = submitError || authError || null;
  const formDisabled = isSubmitting || isLoading || isLockedOut;

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
                Log In
              </h1>
            </div>
            <div className="hb-card-body">
              {successMessage && (
                <Alert
                  type="success"
                  message={successMessage}
                  dismissible={true}
                  onDismiss={handleDismissSuccess}
                />
              )}

              {displayError && (
                <Alert
                  type="error"
                  message={displayError}
                  dismissible={!isLockedOut}
                  onDismiss={isLockedOut ? undefined : handleDismissError}
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
                  ariaDescribedBy="login-username-hint"
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
                  autoComplete="current-password"
                  ariaDescribedBy="login-password-hint"
                />

                <Button
                  variant="primary"
                  label="Log In"
                  type="submit"
                  loading={isSubmitting || isLoading}
                  disabled={formDisabled}
                  ariaLabel="Log in to your account"
                  className="hb-w-100"
                />
              </form>

              <div
                className="hb-text-center hb-mt-4"
                style={{ fontFamily: 'var(--hb-font-family, inherit)' }}
              >
                <p className="hb-text-sm" style={{ margin: 0 }}>
                  Don&apos;t have an account?{' '}
                  <Link
                    to="/signup"
                    style={{
                      color: 'var(--hb-primary, #00468b)',
                      fontWeight: 500,
                      textDecoration: 'none',
                    }}
                  >
                    Sign Up
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

export default LoginScreen;