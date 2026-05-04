import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import FloatingLabelInput from '../components/common/FloatingLabelInput.jsx';
import Button from '../components/common/Button.jsx';
import Alert from '../components/common/Alert.jsx';
import AuditLogger from '../services/AuditLogger.js';

/**
 * eSign token validation page.
 * Accepts token from URL query parameter (?token=...) or manual input.
 * Validates token via AuthContext.validateToken() checking validity,
 * expiration, and user association. Shows error for invalid/expired tokens.
 * On success, navigates to account selection / dashboard.
 * Logs all validation attempts. HB CSS styling.
 *
 * @returns {React.ReactElement} The rendered token validation screen component.
 */
function TokenValidationScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const {
    currentUser,
    isAuthenticated,
    isTokenValidated,
    validateToken,
    isLoading: authLoading,
    error: authError,
    clearError,
  } = useAuth();

  const [tokenValue, setTokenValue] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [submitError, setSubmitError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoValidating, setAutoValidating] = useState(false);

  /**
   * Redirect if not authenticated.
   */
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  /**
   * Redirect if already token-validated.
   */
  useEffect(() => {
    if (isTokenValidated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isTokenValidated, navigate, location.state]);

  /**
   * Check for token in URL query parameters on mount and auto-validate.
   */
  useEffect(() => {
    const urlToken = searchParams.get('token');

    if (urlToken && urlToken.trim().length > 0 && !isTokenValidated && !autoValidating) {
      setTokenValue(urlToken.trim());
      setAutoValidating(true);
    }
  }, [searchParams, isTokenValidated, autoValidating]);

  /**
   * Auto-validate when token is set from URL parameter.
   */
  useEffect(() => {
    if (autoValidating && tokenValue.trim().length > 0 && !isSubmitting) {
      const performAutoValidation = async () => {
        setIsSubmitting(true);
        setSubmitError(null);
        setSuccessMessage(null);

        try {
          AuditLogger.logEvent('TOKEN_VALIDATION_ATTEMPT', {
            userId: currentUser ? currentUser.id : 'unknown',
            source: 'url_parameter',
          });

          const result = await validateToken(tokenValue.trim());

          if (result && result.status === 'success' && result.valid) {
            setSuccessMessage('Token validated successfully. Redirecting...');

            AuditLogger.logEvent('TOKEN_VALIDATION_SUCCESS', {
              userId: currentUser ? currentUser.id : 'unknown',
              source: 'url_parameter',
            });

            setTimeout(() => {
              const from = location.state?.from?.pathname || '/dashboard';
              navigate(from, { replace: true });
            }, 1500);
          } else {
            const errorMessage =
              result && result.message
                ? result.message
                : 'Invalid or expired token. Please try again.';
            setSubmitError(errorMessage);

            AuditLogger.logEvent('TOKEN_VALIDATION_FAILED', {
              userId: currentUser ? currentUser.id : 'unknown',
              source: 'url_parameter',
              reason: errorMessage,
            });
          }
        } catch (_error) {
          setSubmitError('An unexpected error occurred. Please try again.');
        } finally {
          setIsSubmitting(false);
          setAutoValidating(false);
        }
      };

      performAutoValidation();
    }
  }, [autoValidating, tokenValue, isSubmitting, validateToken, currentUser, navigate, location.state]);

  /**
   * Handles token input change.
   * @param {React.ChangeEvent<HTMLInputElement>} event - The change event.
   */
  const handleTokenChange = useCallback(
    (event) => {
      const { value } = event.target;
      setTokenValue(value);
      setTokenError('');

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
   * Validates the token input before submission.
   * @returns {boolean} True if the token input is valid.
   */
  const validateTokenInput = useCallback(() => {
    if (!tokenValue || tokenValue.trim().length === 0) {
      setTokenError('Token is required.');
      return false;
    }

    setTokenError('');
    return true;
  }, [tokenValue]);

  /**
   * Handles form submission for manual token validation.
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

      const isValid = validateTokenInput();

      if (!isValid) {
        return;
      }

      setIsSubmitting(true);

      try {
        AuditLogger.logEvent('TOKEN_VALIDATION_ATTEMPT', {
          userId: currentUser ? currentUser.id : 'unknown',
          source: 'manual_input',
        });

        const result = await validateToken(tokenValue.trim());

        if (result && result.status === 'success' && result.valid) {
          setSuccessMessage('Token validated successfully. Redirecting...');

          AuditLogger.logEvent('TOKEN_VALIDATION_SUCCESS', {
            userId: currentUser ? currentUser.id : 'unknown',
            source: 'manual_input',
          });

          setTimeout(() => {
            const from = location.state?.from?.pathname || '/dashboard';
            navigate(from, { replace: true });
          }, 1500);
        } else {
          const errorMessage =
            result && result.message
              ? result.message
              : 'Invalid or expired token. Please try again.';
          setSubmitError(errorMessage);

          AuditLogger.logEvent('TOKEN_VALIDATION_FAILED', {
            userId: currentUser ? currentUser.id : 'unknown',
            source: 'manual_input',
            reason: errorMessage,
          });
        }
      } catch (_error) {
        setSubmitError('An unexpected error occurred. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      tokenValue,
      validateTokenInput,
      validateToken,
      currentUser,
      navigate,
      location.state,
      authError,
      clearError,
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
  const formDisabled = isSubmitting || authLoading || autoValidating;

  if (!isAuthenticated) {
    return null;
  }

  if (autoValidating || (isSubmitting && !tokenError && !displayError)) {
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
                  Validating Token
                </h1>
              </div>
              <div className="hb-card-body">
                <div
                  className="hb-d-flex hb-justify-content-center hb-align-items-center hb-flex-column"
                  style={{ minHeight: '10rem' }}
                  role="status"
                  aria-live="polite"
                  aria-label="Validating token"
                >
                  <span className="hb-spinner hb-spinner-lg" aria-hidden="true" />
                  <p
                    className="hb-text-muted hb-mt-3"
                    style={{
                      fontFamily: 'var(--hb-font-family, inherit)',
                      margin: '1rem 0 0 0',
                    }}
                  >
                    Validating your token, please wait...
                  </p>
                  <span className="hb-sr-only">Validating token, please wait.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

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
                eSign Token Validation
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
                Enter your eSign confirmation token below to continue. The token was provided in
                your invitation email.
              </p>

              <form onSubmit={handleSubmit} noValidate>
                <FloatingLabelInput
                  id="esign-token"
                  name="esign-token"
                  label="eSign Token"
                  type="text"
                  value={tokenValue}
                  onChange={handleTokenChange}
                  error={tokenError}
                  required={true}
                  disabled={formDisabled}
                  autoComplete="off"
                  ariaDescribedBy="token-hint"
                  placeholder=" "
                />

                <div
                  id="token-hint"
                  className="hb-text-muted hb-text-sm"
                  style={{
                    marginBottom: '1.25rem',
                    fontFamily: 'var(--hb-font-family, inherit)',
                  }}
                >
                  Paste the full token string from your invitation email.
                </div>

                <Button
                  variant="primary"
                  label="Validate Token"
                  type="submit"
                  loading={isSubmitting || authLoading}
                  disabled={formDisabled}
                  ariaLabel="Validate eSign token"
                  className="hb-w-100"
                />
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default TokenValidationScreen;