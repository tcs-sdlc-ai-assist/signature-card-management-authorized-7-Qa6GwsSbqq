import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import FloatingLabelInput from '../components/common/FloatingLabelInput.jsx';
import Button from '../components/common/Button.jsx';
import Alert from '../components/common/Alert.jsx';
import VerificationService from '../services/VerificationService.js';
import AuditLogger from '../services/AuditLogger.js';

/**
 * Verification method tabs.
 * @readonly
 * @enum {string}
 */
const VERIFICATION_METHODS = {
  KBA: 'kba',
  OTP: 'otp',
};

/**
 * Post-login identity verification page.
 * Presents 'Verify Your Identity' heading with KBA questions and OTP input.
 * Validates answers via AuthContext.verifyIdentity(). Shows attempt count
 * and locks out after threshold. Logs all attempts. Supports future MFA
 * extensibility. HB CSS form styling.
 *
 * @returns {React.ReactElement} The rendered verification screen component.
 */
function VerificationScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentUser,
    isAuthenticated,
    isVerified,
    verifyIdentity,
    isLoading: authLoading,
    error: authError,
    clearError,
  } = useAuth();

  const [activeMethod, setActiveMethod] = useState(VERIFICATION_METHODS.KBA);
  const [kbaQuestions, setKbaQuestions] = useState([]);
  const [kbaAnswers, setKbaAnswers] = useState({});
  const [kbaErrors, setKbaErrors] = useState({});
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [submitError, setSubmitError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [resendMessage, setResendMessage] = useState(null);

  /**
   * Redirect if not authenticated.
   */
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  /**
   * Redirect if already verified.
   */
  useEffect(() => {
    if (isVerified) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isVerified, navigate, location.state]);

  /**
   * Load KBA questions on mount when user is available.
   */
  useEffect(() => {
    if (currentUser && currentUser.id) {
      try {
        const questions = VerificationService.getKBAQuestions(currentUser.id);

        if (Array.isArray(questions) && questions.length > 0) {
          setKbaQuestions(questions);

          const initialAnswers = {};
          questions.forEach((q) => {
            initialAnswers[q.id] = '';
          });
          setKbaAnswers(initialAnswers);
        }

        // Check if already locked
        const locked = VerificationService.isLocked(currentUser.id);
        if (locked) {
          setIsLockedOut(true);
        }
      } catch (_error) {
        // Silently handle errors loading questions
      }
    }
  }, [currentUser]);

  /**
   * Handles switching between verification methods.
   * @param {string} method - The verification method to switch to.
   */
  const handleMethodChange = useCallback(
    (method) => {
      if (isLockedOut || isSubmitting) {
        return;
      }

      setActiveMethod(method);
      setSubmitError(null);
      setSuccessMessage(null);
      setResendMessage(null);

      if (authError) {
        clearError();
      }
    },
    [isLockedOut, isSubmitting, authError, clearError],
  );

  /**
   * Handles KBA answer changes.
   * @param {string} questionId - The question ID.
   * @param {string} value - The selected answer value.
   */
  const handleKbaAnswerChange = useCallback(
    (questionId, value) => {
      setKbaAnswers((prev) => ({
        ...prev,
        [questionId]: value,
      }));

      setKbaErrors((prev) => ({
        ...prev,
        [questionId]: '',
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
   * Handles OTP code input change.
   * @param {React.ChangeEvent<HTMLInputElement>} event - The change event.
   */
  const handleOtpChange = useCallback(
    (event) => {
      const { value } = event.target;

      // Only allow digits, max 6 characters
      const sanitized = value.replace(/\D/g, '').slice(0, 6);
      setOtpCode(sanitized);
      setOtpError('');

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
   * Validates KBA answers before submission.
   * @returns {boolean} True if all answers are provided.
   */
  const validateKbaAnswers = useCallback(() => {
    const errors = {};
    let hasError = false;

    kbaQuestions.forEach((question) => {
      if (!kbaAnswers[question.id] || kbaAnswers[question.id].trim().length === 0) {
        errors[question.id] = 'Please select an answer for this question.';
        hasError = true;
      } else {
        errors[question.id] = '';
      }
    });

    setKbaErrors(errors);
    return !hasError;
  }, [kbaQuestions, kbaAnswers]);

  /**
   * Validates OTP code before submission.
   * @returns {boolean} True if the OTP code is valid.
   */
  const validateOtpCode = useCallback(() => {
    if (!otpCode || otpCode.trim().length === 0) {
      setOtpError('Verification code is required.');
      return false;
    }

    if (otpCode.trim().length < 6) {
      setOtpError('Verification code must be 6 digits.');
      return false;
    }

    setOtpError('');
    return true;
  }, [otpCode]);

  /**
   * Handles KBA form submission.
   * @param {React.FormEvent} event - The form submit event.
   */
  const handleKbaSubmit = useCallback(
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

      const isValid = validateKbaAnswers();

      if (!isValid) {
        return;
      }

      setIsSubmitting(true);

      try {
        const answers = kbaQuestions.map((question) => ({
          questionId: question.id,
          answer: kbaAnswers[question.id],
        }));

        const signerId = currentUser ? currentUser.id : null;

        const result = await verifyIdentity({
          method: 'kba',
          signerId,
          answers,
        });

        if (result && result.status === 'success' && result.verificationStatus === 'verified') {
          setSuccessMessage('Identity verified successfully. Redirecting...');

          AuditLogger.logEvent('VERIFICATION_KBA_SUCCESS', {
            userId: currentUser ? currentUser.id : 'unknown',
          });

          setTimeout(() => {
            const from = location.state?.from?.pathname || '/dashboard';
            navigate(from, { replace: true });
          }, 1500);
        } else {
          if (result && result.verificationStatus === 'locked') {
            setIsLockedOut(true);
            setAttemptsLeft(0);
          } else if (result && typeof result.attemptsLeft === 'number') {
            setAttemptsLeft(result.attemptsLeft);
          }

          const errorMessage =
            result && result.message
              ? result.message
              : 'Verification failed. Please try again.';
          setSubmitError(errorMessage);

          AuditLogger.logEvent('VERIFICATION_KBA_FAILED', {
            userId: currentUser ? currentUser.id : 'unknown',
            attemptsLeft: result ? result.attemptsLeft : null,
          });
        }
      } catch (_error) {
        setSubmitError('An unexpected error occurred. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      kbaQuestions,
      kbaAnswers,
      validateKbaAnswers,
      verifyIdentity,
      currentUser,
      navigate,
      location.state,
      authError,
      clearError,
      isLockedOut,
    ],
  );

  /**
   * Handles OTP form submission.
   * @param {React.FormEvent} event - The form submit event.
   */
  const handleOtpSubmit = useCallback(
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

      const isValid = validateOtpCode();

      if (!isValid) {
        return;
      }

      setIsSubmitting(true);

      try {
        const entityId = currentUser ? currentUser.id : null;

        const result = await verifyIdentity({
          method: 'otp',
          entityId,
          code: otpCode.trim(),
        });

        if (result && result.status === 'success' && result.verificationStatus === 'verified') {
          setSuccessMessage('Identity verified successfully. Redirecting...');

          AuditLogger.logEvent('VERIFICATION_OTP_SUCCESS', {
            userId: currentUser ? currentUser.id : 'unknown',
          });

          setTimeout(() => {
            const from = location.state?.from?.pathname || '/dashboard';
            navigate(from, { replace: true });
          }, 1500);
        } else {
          if (result && result.verificationStatus === 'locked') {
            setIsLockedOut(true);
            setAttemptsLeft(0);
          } else if (result && typeof result.attemptsLeft === 'number') {
            setAttemptsLeft(result.attemptsLeft);
          }

          const errorMessage =
            result && result.message
              ? result.message
              : 'Incorrect verification code. Please try again.';
          setSubmitError(errorMessage);

          AuditLogger.logEvent('VERIFICATION_OTP_FAILED', {
            userId: currentUser ? currentUser.id : 'unknown',
            attemptsLeft: result ? result.attemptsLeft : null,
          });
        }
      } catch (_error) {
        setSubmitError('An unexpected error occurred. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      otpCode,
      validateOtpCode,
      verifyIdentity,
      currentUser,
      navigate,
      location.state,
      authError,
      clearError,
      isLockedOut,
    ],
  );

  /**
   * Handles requesting a new OTP code.
   */
  const handleResendOtp = useCallback(() => {
    if (!currentUser || !currentUser.id) {
      return;
    }

    setResendMessage(null);

    try {
      const result = VerificationService.requestNewOTP(currentUser.id);

      if (result && result.status === 'success') {
        setResendMessage(result.message || 'A new verification code has been sent.');

        AuditLogger.logEvent('OTP_RESEND_REQUESTED', {
          userId: currentUser.id,
        });
      } else {
        setResendMessage(
          result && result.message
            ? result.message
            : 'Unable to resend code. Please try again.',
        );
      }
    } catch (_error) {
      setResendMessage('An unexpected error occurred. Please try again.');
    }
  }, [currentUser]);

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

  /**
   * Dismisses the resend message alert.
   */
  const handleDismissResend = useCallback(() => {
    setResendMessage(null);
  }, []);

  const displayError = submitError || authError || null;
  const formDisabled = isSubmitting || authLoading || isLockedOut;

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="fluid-wrapper" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div className="hb-row hb-justify-content-center">
        <div className="hb-col-12 hb-col-sm-10 hb-col-md-8 hb-col-lg-6">
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
                Verify Your Identity
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

              {isLockedOut && (
                <Alert
                  type="error"
                  message="Verification is locked due to too many failed attempts. Please contact support."
                />
              )}

              {attemptsLeft !== null && attemptsLeft > 0 && !isLockedOut && (
                <Alert
                  type="warning"
                  message={`You have ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`}
                />
              )}

              <p
                className="hb-text-muted hb-text-sm"
                style={{
                  marginBottom: '1.25rem',
                  fontFamily: 'var(--hb-font-family, inherit)',
                }}
              >
                Please verify your identity to continue. Choose a verification method below.
              </p>

              {/* Verification Method Tabs */}
              <div
                className="hb-d-flex hb-gap-2 hb-mb-4"
                role="tablist"
                aria-label="Verification method"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMethod === VERIFICATION_METHODS.KBA}
                  aria-controls="kba-panel"
                  id="kba-tab"
                  className={
                    activeMethod === VERIFICATION_METHODS.KBA
                      ? 'button-primary'
                      : 'button-secondary-2'
                  }
                  onClick={() => handleMethodChange(VERIFICATION_METHODS.KBA)}
                  disabled={formDisabled}
                  style={{ flex: 1 }}
                >
                  Security Questions
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMethod === VERIFICATION_METHODS.OTP}
                  aria-controls="otp-panel"
                  id="otp-tab"
                  className={
                    activeMethod === VERIFICATION_METHODS.OTP
                      ? 'button-primary'
                      : 'button-secondary-2'
                  }
                  onClick={() => handleMethodChange(VERIFICATION_METHODS.OTP)}
                  disabled={formDisabled}
                  style={{ flex: 1 }}
                >
                  Verification Code
                </button>
              </div>

              {/* KBA Panel */}
              {activeMethod === VERIFICATION_METHODS.KBA && (
                <div
                  id="kba-panel"
                  role="tabpanel"
                  aria-labelledby="kba-tab"
                >
                  <form onSubmit={handleKbaSubmit} noValidate>
                    {kbaQuestions.length > 0 ? (
                      kbaQuestions.map((question, index) => {
                        const questionError = kbaErrors[question.id] || '';
                        const errorId = questionError ? `kba-${question.id}-error` : undefined;

                        return (
                          <div
                            key={question.id}
                            className="hb-form-group"
                            style={{ marginBottom: '1.25rem' }}
                          >
                            <label
                              htmlFor={`kba-${question.id}`}
                              style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                fontWeight: 500,
                                fontSize: '0.9375rem',
                                color: 'var(--hb-black, #292929)',
                                fontFamily: 'var(--hb-font-family, inherit)',
                              }}
                            >
                              {index + 1}. {question.question}
                              <span aria-hidden="true"> *</span>
                            </label>
                            {Array.isArray(question.options) && question.options.length > 0 ? (
                              <select
                                id={`kba-${question.id}`}
                                name={`kba-${question.id}`}
                                className={`hb-form-control${questionError ? ' invaliderr' : ''}`}
                                value={kbaAnswers[question.id] || ''}
                                onChange={(e) =>
                                  handleKbaAnswerChange(question.id, e.target.value)
                                }
                                disabled={formDisabled}
                                required
                                aria-invalid={questionError ? true : undefined}
                                aria-describedby={errorId}
                                aria-required="true"
                                style={{ height: '3.25rem' }}
                              >
                                <option value="">Select an answer</option>
                                {question.options.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                id={`kba-${question.id}`}
                                name={`kba-${question.id}`}
                                type="text"
                                className={`hb-form-control${questionError ? ' invaliderr' : ''}`}
                                value={kbaAnswers[question.id] || ''}
                                onChange={(e) =>
                                  handleKbaAnswerChange(question.id, e.target.value)
                                }
                                disabled={formDisabled}
                                required
                                aria-invalid={questionError ? true : undefined}
                                aria-describedby={errorId}
                                aria-required="true"
                                placeholder="Enter your answer"
                              />
                            )}
                            {questionError && (
                              <span id={errorId} className="invaliderr" role="alert">
                                {questionError}
                              </span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p
                        className="hb-text-muted"
                        style={{
                          textAlign: 'center',
                          padding: '1rem 0',
                          fontFamily: 'var(--hb-font-family, inherit)',
                        }}
                      >
                        No security questions available. Please try the verification code method.
                      </p>
                    )}

                    {kbaQuestions.length > 0 && (
                      <Button
                        variant="primary"
                        label="Verify Identity"
                        type="submit"
                        loading={isSubmitting || authLoading}
                        disabled={formDisabled}
                        ariaLabel="Submit security question answers"
                        className="hb-w-100"
                      />
                    )}
                  </form>
                </div>
              )}

              {/* OTP Panel */}
              {activeMethod === VERIFICATION_METHODS.OTP && (
                <div
                  id="otp-panel"
                  role="tabpanel"
                  aria-labelledby="otp-tab"
                >
                  {resendMessage && (
                    <Alert
                      type="info"
                      message={resendMessage}
                      dismissible={true}
                      onDismiss={handleDismissResend}
                    />
                  )}

                  <p
                    className="hb-text-muted hb-text-sm"
                    style={{
                      marginBottom: '1rem',
                      fontFamily: 'var(--hb-font-family, inherit)',
                    }}
                  >
                    Enter the 6-digit verification code sent to your registered email or phone.
                  </p>

                  <form onSubmit={handleOtpSubmit} noValidate>
                    <FloatingLabelInput
                      id="otp-code"
                      name="otp-code"
                      label="Verification Code"
                      type="text"
                      value={otpCode}
                      onChange={handleOtpChange}
                      error={otpError}
                      required={true}
                      disabled={formDisabled}
                      autoComplete="one-time-code"
                      ariaDescribedBy="otp-hint"
                      placeholder=" "
                    />

                    <div
                      id="otp-hint"
                      className="hb-text-muted hb-text-sm"
                      style={{
                        marginBottom: '1.25rem',
                        fontFamily: 'var(--hb-font-family, inherit)',
                      }}
                    >
                      The code is 6 digits long.
                    </div>

                    <Button
                      variant="primary"
                      label="Verify Code"
                      type="submit"
                      loading={isSubmitting || authLoading}
                      disabled={formDisabled}
                      ariaLabel="Submit verification code"
                      className="hb-w-100"
                    />
                  </form>

                  <div
                    className="hb-text-center hb-mt-4"
                    style={{ fontFamily: 'var(--hb-font-family, inherit)' }}
                  >
                    <p className="hb-text-sm" style={{ margin: 0 }}>
                      Didn&apos;t receive a code?{' '}
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={formDisabled}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--hb-primary, #00468b)',
                          fontWeight: 500,
                          cursor: formDisabled ? 'not-allowed' : 'pointer',
                          textDecoration: 'none',
                          padding: 0,
                          fontSize: 'inherit',
                          fontFamily: 'inherit',
                          opacity: formDisabled ? 0.6 : 1,
                        }}
                        aria-label="Resend verification code"
                      >
                        Resend Code
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default VerificationScreen;