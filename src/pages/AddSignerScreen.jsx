import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSigners } from '../context/SignerContext.jsx';
import FloatingLabelInput from '../components/common/FloatingLabelInput.jsx';
import Button from '../components/common/Button.jsx';
import Alert from '../components/common/Alert.jsx';
import ConfirmationModal from '../components/common/ConfirmationModal.jsx';
import AuditLogger from '../services/AuditLogger.js';
import {
  validateRequired,
  validateEmail,
  validatePhone,
  validateName,
  validateMinLength,
  validateMaxLength,
  validateForm,
  hasErrors,
} from '../utils/validators.js';

/**
 * Field validation configuration for the add signer form.
 * Each field has an array of validator functions that run in order.
 * @type {Object}
 */
const FIELD_CONFIG = {
  firstName: {
    validators: [
      (v) => validateRequired(v, 'First Name'),
      (v) => validateName(v, 'First Name'),
      (v) => validateMinLength(v, 2, 'First Name'),
      (v) => validateMaxLength(v, 50, 'First Name'),
    ],
  },
  lastName: {
    validators: [
      (v) => validateRequired(v, 'Last Name'),
      (v) => validateName(v, 'Last Name'),
      (v) => validateMinLength(v, 2, 'Last Name'),
      (v) => validateMaxLength(v, 50, 'Last Name'),
    ],
  },
  title: {
    validators: [
      (v) => validateRequired(v, 'Title/Role'),
      (v) => validateMinLength(v, 2, 'Title/Role'),
      (v) => validateMaxLength(v, 100, 'Title/Role'),
    ],
  },
  email: {
    validators: [
      (v) => validateRequired(v, 'Email'),
      validateEmail,
    ],
  },
  phone: {
    validators: [
      (v) => validateRequired(v, 'Phone'),
      validatePhone,
    ],
  },
  middleName: {
    validators: [
      (v) => validateName(v, 'Middle Name'),
      (v) => validateMaxLength(v, 50, 'Middle Name'),
    ],
  },
  suffix: {
    validators: [
      (v) => validateMaxLength(v, 20, 'Suffix'),
    ],
  },
  additionalContact: {
    validators: [
      (v) => validateMaxLength(v, 200, 'Additional Contact'),
    ],
  },
};

/**
 * Creates a fresh empty form values object.
 * @returns {Object} Empty form values.
 */
const createEmptyFormValues = () => ({
  firstName: '',
  lastName: '',
  middleName: '',
  title: '',
  email: '',
  phone: '',
  suffix: '',
  additionalContact: '',
});

/**
 * Creates a fresh empty field errors object.
 * @returns {Object} Empty field errors.
 */
const createEmptyFieldErrors = () => ({
  firstName: '',
  lastName: '',
  middleName: '',
  title: '',
  email: '',
  phone: '',
  suffix: '',
  additionalContact: '',
});

/**
 * Add authorized signer form page. Required fields: First Name, Last Name,
 * Title/Role, Email, Phone. Optional fields: Middle Name, Suffix, Additional Contact.
 * All fields use FloatingLabelInput with inline real-time validation.
 * On completion, adds signer to pending confirmation list via SignerContext.
 * Supports adding multiple signers before submission. HB CSS form layout.
 *
 * @returns {React.ReactElement} The rendered add signer screen component.
 */
function AddSignerScreen() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, currentUser } = useAuth();
  const {
    selectedAccount,
    addSigner,
    signers,
    stagedChanges,
    isLoading: signerLoading,
    error: signerError,
    clearError,
  } = useSigners();

  const [formValues, setFormValues] = useState(createEmptyFormValues);
  const [fieldErrors, setFieldErrors] = useState(createEmptyFieldErrors);
  const [submitError, setSubmitError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addedSigners, setAddedSigners] = useState([]);
  const [discardModalOpen, setDiscardModalOpen] = useState(false);

  /**
   * Redirect if not authenticated.
   */
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  /**
   * Redirect if no account is selected.
   */
  useEffect(() => {
    if (!authLoading && isAuthenticated && !selectedAccount) {
      navigate('/accounts', { replace: true });
    }
  }, [isAuthenticated, authLoading, selectedAccount, navigate]);

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

      if (signerError) {
        clearError();
      }
    },
    [submitError, signerError, clearError],
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
   * Handles form submission. Validates all fields, calls addSigner via SignerContext,
   * and resets the form for adding another signer on success.
   * @param {React.FormEvent} event - The form submit event.
   */
  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();

      setSubmitError(null);
      setSuccessMessage(null);

      if (signerError) {
        clearError();
      }

      const isValid = validateAllFields();

      if (!isValid) {
        return;
      }

      setIsSubmitting(true);

      try {
        const signerData = {
          firstName: formValues.firstName.trim(),
          lastName: formValues.lastName.trim(),
          middleName: formValues.middleName.trim(),
          title: formValues.title.trim(),
          role: formValues.title.trim(),
          email: formValues.email.trim(),
          phone: formValues.phone.trim(),
          status: 'Pending',
        };

        const result = addSigner(signerData);

        if (result && result.status === 'success') {
          const signerName = `${signerData.firstName} ${signerData.lastName}`;

          setAddedSigners((prev) => [
            ...prev,
            {
              id: result.signerId || Date.now().toString(),
              firstName: signerData.firstName,
              lastName: signerData.lastName,
              middleName: signerData.middleName,
              title: signerData.title,
              email: signerData.email,
              phone: signerData.phone,
              suffix: formValues.suffix.trim(),
              additionalContact: formValues.additionalContact.trim(),
            },
          ]);

          setSuccessMessage(`${signerName} has been added to the pending list.`);

          AuditLogger.logEvent('SIGNER_ADDED_VIA_FORM', {
            accountId: selectedAccount ? selectedAccount.id : 'unknown',
            userId: currentUser ? currentUser.id : 'unknown',
            signerName,
          });

          // Reset form for next signer
          setFormValues(createEmptyFormValues());
          setFieldErrors(createEmptyFieldErrors());
        } else {
          const errorMessage =
            result && result.message
              ? result.message
              : 'Failed to add signer. Please try again.';
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
      addSigner,
      selectedAccount,
      currentUser,
      signerError,
      clearError,
    ],
  );

  /**
   * Handles navigating back to the signer list.
   */
  const handleDone = useCallback(() => {
    navigate('/signers', { replace: true });
  }, [navigate]);

  /**
   * Handles the cancel/discard action. If signers have been added,
   * shows a confirmation modal. Otherwise, navigates back.
   */
  const handleCancel = useCallback(() => {
    const hasUnsavedFormData =
      formValues.firstName.trim().length > 0 ||
      formValues.lastName.trim().length > 0 ||
      formValues.email.trim().length > 0;

    if (addedSigners.length > 0 || hasUnsavedFormData) {
      setDiscardModalOpen(true);
    } else {
      navigate('/signers', { replace: true });
    }
  }, [formValues, addedSigners, navigate]);

  /**
   * Confirms the discard action and navigates back.
   */
  const handleConfirmDiscard = useCallback(() => {
    setDiscardModalOpen(false);
    navigate('/signers', { replace: true });
  }, [navigate]);

  /**
   * Cancels the discard action.
   */
  const handleCancelDiscard = useCallback(() => {
    setDiscardModalOpen(false);
  }, []);

  /**
   * Dismisses the submit error alert.
   */
  const handleDismissError = useCallback(() => {
    setSubmitError(null);

    if (signerError) {
      clearError();
    }
  }, [signerError, clearError]);

  /**
   * Dismisses the success message alert.
   */
  const handleDismissSuccess = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  const displayError = submitError || signerError || null;
  const formDisabled = isSubmitting || signerLoading;

  if (!isAuthenticated && !authLoading) {
    return null;
  }

  if (!selectedAccount && !authLoading) {
    return null;
  }

  if (authLoading) {
    return (
      <main className="fluid-wrapper" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div
          className="hb-d-flex hb-justify-content-center hb-align-items-center"
          style={{ minHeight: '50vh' }}
          role="status"
          aria-live="polite"
          aria-label="Loading"
        >
          <span className="hb-spinner hb-spinner-lg" aria-hidden="true" />
          <span className="hb-sr-only">Loading, please wait.</span>
        </div>
      </main>
    );
  }

  return (
    <main className="fluid-wrapper" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div className="hb-row hb-justify-content-center">
        <div className="hb-col-12 hb-col-md-10 hb-col-lg-8">
          {/* Header */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--hb-primary, #00468b)',
                margin: 0,
                fontFamily: 'var(--hb-font-family, inherit)',
              }}
            >
              Add Authorized Signer
            </h1>
            {selectedAccount && (
              <p
                className="hb-text-muted"
                style={{
                  margin: '0.25rem 0 0 0',
                  fontSize: '0.9375rem',
                  fontFamily: 'var(--hb-font-family, inherit)',
                }}
              >
                {selectedAccount.accountName || 'Selected Account'} &mdash;{' '}
                {selectedAccount.accountNumberMasked || '****'} &mdash;{' '}
                {selectedAccount.accountType || 'N/A'}
              </p>
            )}
          </div>

          {/* Alerts */}
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

          {/* Added Signers Summary */}
          {addedSigners.length > 0 && (
            <div className="hb-card hb-mb-4">
              <div className="hb-card-header">
                <h2
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'var(--hb-primary, #00468b)',
                    margin: 0,
                    fontFamily: 'var(--hb-font-family, inherit)',
                  }}
                >
                  Pending Signers ({addedSigners.length})
                </h2>
              </div>
              <div className="hb-card-body" style={{ padding: 0 }}>
                <table className="hb-table" aria-label="Pending signers list">
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Title/Role</th>
                      <th scope="col">Email</th>
                      <th scope="col">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addedSigners.map((signer) => {
                      const fullName = [signer.firstName, signer.middleName, signer.lastName]
                        .filter(Boolean)
                        .join(' ');

                      return (
                        <tr key={signer.id}>
                          <td
                            style={{
                              fontWeight: 500,
                              fontFamily: 'var(--hb-font-family, inherit)',
                            }}
                          >
                            {fullName}
                            {signer.suffix && (
                              <span className="hb-text-muted" style={{ marginLeft: '0.25rem' }}>
                                {signer.suffix}
                              </span>
                            )}
                          </td>
                          <td style={{ fontFamily: 'var(--hb-font-family, inherit)' }}>
                            {signer.title || 'N/A'}
                          </td>
                          <td
                            style={{
                              fontSize: '0.875rem',
                              fontFamily: 'var(--hb-font-family, inherit)',
                            }}
                          >
                            {signer.email || 'N/A'}
                          </td>
                          <td
                            style={{
                              fontSize: '0.875rem',
                              fontFamily: 'var(--hb-font-family, inherit)',
                            }}
                          >
                            {signer.phone || 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Add Signer Form */}
          <div className="hb-card">
            <div className="hb-card-header">
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--hb-primary, #00468b)',
                  margin: 0,
                  fontFamily: 'var(--hb-font-family, inherit)',
                }}
              >
                {addedSigners.length > 0 ? 'Add Another Signer' : 'Signer Information'}
              </h2>
            </div>
            <div className="hb-card-body">
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
                {/* Name Fields Row */}
                <div className="hb-row">
                  <div className="hb-col-12 hb-col-md-4">
                    <FloatingLabelInput
                      id="firstName"
                      name="firstName"
                      label="First Name"
                      type="text"
                      value={formValues.firstName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={fieldErrors.firstName}
                      required={true}
                      disabled={formDisabled}
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="hb-col-12 hb-col-md-4">
                    <FloatingLabelInput
                      id="middleName"
                      name="middleName"
                      label="Middle Name"
                      type="text"
                      value={formValues.middleName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={fieldErrors.middleName}
                      required={false}
                      disabled={formDisabled}
                      autoComplete="additional-name"
                    />
                  </div>
                  <div className="hb-col-12 hb-col-md-4">
                    <FloatingLabelInput
                      id="lastName"
                      name="lastName"
                      label="Last Name"
                      type="text"
                      value={formValues.lastName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={fieldErrors.lastName}
                      required={true}
                      disabled={formDisabled}
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                {/* Title and Suffix Row */}
                <div className="hb-row">
                  <div className="hb-col-12 hb-col-md-8">
                    <FloatingLabelInput
                      id="title"
                      name="title"
                      label="Title / Role"
                      type="text"
                      value={formValues.title}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={fieldErrors.title}
                      required={true}
                      disabled={formDisabled}
                      autoComplete="organization-title"
                    />
                  </div>
                  <div className="hb-col-12 hb-col-md-4">
                    <FloatingLabelInput
                      id="suffix"
                      name="suffix"
                      label="Suffix"
                      type="text"
                      value={formValues.suffix}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={fieldErrors.suffix}
                      required={false}
                      disabled={formDisabled}
                      autoComplete="honorific-suffix"
                    />
                  </div>
                </div>

                {/* Contact Fields Row */}
                <div className="hb-row">
                  <div className="hb-col-12 hb-col-md-6">
                    <FloatingLabelInput
                      id="email"
                      name="email"
                      label="Email"
                      type="email"
                      value={formValues.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={fieldErrors.email}
                      required={true}
                      disabled={formDisabled}
                      autoComplete="email"
                    />
                  </div>
                  <div className="hb-col-12 hb-col-md-6">
                    <FloatingLabelInput
                      id="phone"
                      name="phone"
                      label="Phone"
                      type="tel"
                      value={formValues.phone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={fieldErrors.phone}
                      required={true}
                      disabled={formDisabled}
                      autoComplete="tel"
                    />
                  </div>
                </div>

                {/* Additional Contact */}
                <div className="hb-row">
                  <div className="hb-col-12">
                    <FloatingLabelInput
                      id="additionalContact"
                      name="additionalContact"
                      label="Additional Contact"
                      type="text"
                      value={formValues.additionalContact}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={fieldErrors.additionalContact}
                      required={false}
                      disabled={formDisabled}
                      autoComplete="off"
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div
                  className="hb-d-flex hb-justify-content-between hb-align-items-center hb-flex-wrap hb-gap-2"
                  style={{ marginTop: '0.5rem' }}
                >
                  <Button
                    variant="secondary"
                    label="Cancel"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    ariaLabel="Cancel and go back"
                  />
                  <div className="hb-d-flex hb-gap-2">
                    {addedSigners.length > 0 && (
                      <Button
                        variant="secondary"
                        label="Done Adding Signers"
                        onClick={handleDone}
                        disabled={isSubmitting}
                        ariaLabel="Finish adding signers and return to signer list"
                      />
                    )}
                    <Button
                      variant="primary"
                      label="Add Signer"
                      type="submit"
                      loading={isSubmitting || signerLoading}
                      disabled={formDisabled}
                      ariaLabel="Add this signer to the pending list"
                    />
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Screen reader live region */}
          <div className="hb-sr-only" aria-live="polite" aria-atomic="true">
            {addedSigners.length > 0
              ? `${addedSigners.length} signer${addedSigners.length !== 1 ? 's' : ''} added to pending list.`
              : 'No signers added yet.'}
          </div>
        </div>
      </div>

      {/* Discard Confirmation Modal */}
      <ConfirmationModal
        isOpen={discardModalOpen}
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
        title="Discard Changes"
        message="You have unsaved changes. Are you sure you want to leave this page? Any signers already added will remain in the pending list."
        confirmLabel="Discard"
        cancelLabel="Stay"
      />
    </main>
  );
}

export default AddSignerScreen;