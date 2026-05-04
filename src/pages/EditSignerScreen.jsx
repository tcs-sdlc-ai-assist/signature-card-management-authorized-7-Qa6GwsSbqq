import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
 * Field validation configuration for the edit signer form.
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
 * Extracts form values from a signer object.
 * @param {Object} signer - The signer object.
 * @returns {Object} Form values populated from the signer.
 */
const extractFormValues = (signer) => {
  if (!signer || typeof signer !== 'object') {
    return {
      firstName: '',
      lastName: '',
      middleName: '',
      title: '',
      email: '',
      phone: '',
      suffix: '',
      additionalContact: '',
    };
  }

  return {
    firstName: signer.firstName || '',
    lastName: signer.lastName || '',
    middleName: signer.middleName || '',
    title: signer.title || '',
    email: signer.email || '',
    phone: signer.phone || '',
    suffix: signer.suffix || '',
    additionalContact: signer.additionalContact || '',
  };
};

/**
 * Computes the changed fields between original and current form values.
 * @param {Object} original - The original form values.
 * @param {Object} current - The current form values.
 * @returns {Object} An object containing only the fields that have changed.
 */
const getChangedFields = (original, current) => {
  if (!original || !current) {
    return {};
  }

  const changed = {};

  for (const key of Object.keys(current)) {
    const origVal = (original[key] || '').trim();
    const curVal = (current[key] || '').trim();

    if (origVal !== curVal) {
      changed[key] = curVal;
    }
  }

  return changed;
};

/**
 * Edit authorized signer form page. Pre-populates form with current signer info
 * from SignerContext. Same fields and validation as AddSignerScreen. Tracks changes
 * (before/after) for audit trail. On save, moves signer to pending confirmation state.
 * HB CSS form layout.
 *
 * @returns {React.ReactElement} The rendered edit signer screen component.
 */
function EditSignerScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading: authLoading, currentUser } = useAuth();
  const {
    selectedAccount,
    signers,
    editSigner,
    isLoading: signerLoading,
    error: signerError,
    clearError,
  } = useSigners();

  const signerId = searchParams.get('id') || '';

  const [formValues, setFormValues] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    title: '',
    email: '',
    phone: '',
    suffix: '',
    additionalContact: '',
  });

  const [originalValues, setOriginalValues] = useState(null);
  const [fieldErrors, setFieldErrors] = useState(createEmptyFieldErrors);
  const [submitError, setSubmitError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discardModalOpen, setDiscardModalOpen] = useState(false);
  const [signerNotFound, setSignerNotFound] = useState(false);

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
   * Load signer data and pre-populate the form.
   */
  useEffect(() => {
    if (!signerId || !Array.isArray(signers) || signers.length === 0) {
      if (signerId && !signerLoading && !authLoading && isAuthenticated && selectedAccount) {
        setSignerNotFound(true);
      }
      return;
    }

    const signer = signers.find((s) => s.id === signerId);

    if (!signer) {
      setSignerNotFound(true);
      return;
    }

    setSignerNotFound(false);
    const values = extractFormValues(signer);
    setFormValues(values);
    setOriginalValues(values);
  }, [signerId, signers, signerLoading, authLoading, isAuthenticated, selectedAccount]);

  /**
   * Determines if the form has unsaved changes.
   */
  const hasUnsavedChanges = useMemo(() => {
    if (!originalValues) {
      return false;
    }

    const changed = getChangedFields(originalValues, formValues);
    return Object.keys(changed).length > 0;
  }, [originalValues, formValues]);

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
   * Handles form submission. Validates all fields, calls editSigner via SignerContext,
   * and navigates back to the signer list on success.
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

      if (!hasUnsavedChanges) {
        setSubmitError('No changes detected. Please modify at least one field before saving.');
        return;
      }

      setIsSubmitting(true);

      try {
        const changedFields = getChangedFields(originalValues, formValues);

        const updates = {};
        for (const key of Object.keys(changedFields)) {
          updates[key] = changedFields[key];
        }

        // If title changed, also update role to match
        if (updates.title) {
          updates.role = updates.title;
        }

        // Move signer to pending confirmation state
        updates.status = 'Pending';

        const beforeState = { ...originalValues };
        const afterState = { ...formValues };

        const result = editSigner(signerId, updates);

        if (result && result.status === 'success') {
          const signerName = `${formValues.firstName.trim()} ${formValues.lastName.trim()}`;

          setSuccessMessage(`${signerName} has been updated and moved to pending confirmation.`);

          AuditLogger.logEvent('SIGNER_EDITED_VIA_FORM', {
            accountId: selectedAccount ? selectedAccount.id : 'unknown',
            userId: currentUser ? currentUser.id : 'unknown',
            signerId,
            signerName,
            changedFields: Object.keys(changedFields),
          }, beforeState, afterState);

          // Update original values to reflect saved state
          setOriginalValues({ ...formValues });

          setTimeout(() => {
            navigate('/signers', { replace: true });
          }, 1500);
        } else {
          const errorMessage =
            result && result.message
              ? result.message
              : 'Failed to update signer. Please try again.';
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
      originalValues,
      validateAllFields,
      editSigner,
      signerId,
      selectedAccount,
      currentUser,
      signerError,
      clearError,
      hasUnsavedChanges,
      navigate,
    ],
  );

  /**
   * Handles the cancel/discard action. If there are unsaved changes,
   * shows a confirmation modal. Otherwise, navigates back.
   */
  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      setDiscardModalOpen(true);
    } else {
      navigate('/signers', { replace: true });
    }
  }, [hasUnsavedChanges, navigate]);

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

  if (authLoading || signerLoading) {
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

  if (signerNotFound) {
    return (
      <main className="fluid-wrapper" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div className="hb-row hb-justify-content-center">
          <div className="hb-col-12 hb-col-md-10 hb-col-lg-8">
            <Alert
              type="error"
              message="The signer could not be found. Please go back and try again."
            />
            <div style={{ marginTop: '1rem' }}>
              <Button
                variant="secondary"
                label={'\u00AB Back to Signers'}
                onClick={() => navigate('/signers', { replace: true })}
                ariaLabel="Go back to signer list"
              />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!signerId) {
    return (
      <main className="fluid-wrapper" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div className="hb-row hb-justify-content-center">
          <div className="hb-col-12 hb-col-md-10 hb-col-lg-8">
            <Alert
              type="error"
              message="No signer ID provided. Please go back and select a signer to edit."
            />
            <div style={{ marginTop: '1rem' }}>
              <Button
                variant="secondary"
                label={'\u00AB Back to Signers'}
                onClick={() => navigate('/signers', { replace: true })}
                ariaLabel="Go back to signer list"
              />
            </div>
          </div>
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
              Edit Authorized Signer
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

          {/* Edit Signer Form */}
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
                Signer Information
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
                Fields marked with * are required. Changes will move the signer to pending confirmation.
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

                {/* Change Summary */}
                {hasUnsavedChanges && originalValues && (
                  <div
                    className="hb-alert-warning"
                    role="status"
                    aria-live="polite"
                    style={{ marginBottom: '1rem' }}
                  >
                    <span className="hb-sr-only">Changes detected: </span>
                    <strong>Unsaved changes:</strong>{' '}
                    {Object.keys(getChangedFields(originalValues, formValues)).join(', ')}
                  </div>
                )}

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
                    ariaLabel="Cancel and go back to signer list"
                  />
                  <Button
                    variant="primary"
                    label="Save Changes"
                    type="submit"
                    loading={isSubmitting || signerLoading}
                    disabled={formDisabled}
                    ariaLabel="Save signer changes"
                  />
                </div>
              </form>
            </div>
          </div>

          {/* Screen reader live region */}
          <div className="hb-sr-only" aria-live="polite" aria-atomic="true">
            {hasUnsavedChanges
              ? 'You have unsaved changes to this signer.'
              : 'No changes made yet.'}
          </div>
        </div>
      </div>

      {/* Discard Confirmation Modal */}
      <ConfirmationModal
        isOpen={discardModalOpen}
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
        title="Discard Changes"
        message="You have unsaved changes. Are you sure you want to leave this page? All changes will be lost."
        confirmLabel="Discard"
        cancelLabel="Stay"
      />
    </main>
  );
}

export default EditSignerScreen;