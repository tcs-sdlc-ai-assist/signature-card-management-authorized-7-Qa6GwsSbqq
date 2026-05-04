import { VALIDATION_MESSAGES } from '../constants/messages.js';

/**
 * Validates that a value is not empty, null, or undefined.
 * @param {string} value - The value to validate.
 * @param {string} [fieldName='This field'] - The display name of the field for error messages.
 * @returns {string} An error message if invalid, or an empty string if valid.
 */
export const validateRequired = (value, fieldName = 'This field') => {
  if (value === null || value === undefined) {
    return VALIDATION_MESSAGES.REQUIRED_FIELD(fieldName);
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    return VALIDATION_MESSAGES.REQUIRED_FIELD(fieldName);
  }

  return '';
};

/**
 * Validates an email address format.
 * @param {string} email - The email address to validate.
 * @returns {string} An error message if invalid, or an empty string if valid.
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    return '';
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(email.trim())) {
    return VALIDATION_MESSAGES.INVALID_EMAIL;
  }

  return '';
};

/**
 * Validates a phone number format.
 * Accepts formats like (555) 123-4567, 555-123-4567, 5551234567, +1-555-123-4567.
 * @param {string} phone - The phone number to validate.
 * @returns {string} An error message if invalid, or an empty string if valid.
 */
export const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
    return '';
  }

  const phoneRegex = /^[+]?[\d\s().-]{7,20}$/;

  if (!phoneRegex.test(phone.trim())) {
    return VALIDATION_MESSAGES.INVALID_PHONE;
  }

  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return VALIDATION_MESSAGES.INVALID_PHONE;
  }

  return '';
};

/**
 * Validates a name field (alphabetic characters, spaces, hyphens, and apostrophes only).
 * @param {string} name - The name value to validate.
 * @param {string} [fieldName='Name'] - The display name of the field for error messages.
 * @returns {string} An error message if invalid, or an empty string if valid.
 */
export const validateName = (name, fieldName = 'Name') => {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return '';
  }

  const nameRegex = /^[a-zA-Z\s'-]+$/;

  if (!nameRegex.test(name.trim())) {
    return VALIDATION_MESSAGES.PATTERN_MISMATCH(fieldName);
  }

  return '';
};

/**
 * Validates a minimum length constraint.
 * @param {string} value - The value to validate.
 * @param {number} min - The minimum number of characters required.
 * @param {string} [fieldName='This field'] - The display name of the field for error messages.
 * @returns {string} An error message if invalid, or an empty string if valid.
 */
export const validateMinLength = (value, min, fieldName = 'This field') => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  if (value.trim().length < min) {
    return VALIDATION_MESSAGES.MIN_LENGTH(fieldName, min);
  }

  return '';
};

/**
 * Validates a maximum length constraint.
 * @param {string} value - The value to validate.
 * @param {number} max - The maximum number of characters allowed.
 * @param {string} [fieldName='This field'] - The display name of the field for error messages.
 * @returns {string} An error message if invalid, or an empty string if valid.
 */
export const validateMaxLength = (value, max, fieldName = 'This field') => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  if (value.trim().length > max) {
    return VALIDATION_MESSAGES.MAX_LENGTH(fieldName, max);
  }

  return '';
};

/**
 * Validates an account number format (numeric, typically 6-17 digits).
 * @param {string} accountNumber - The account number to validate.
 * @returns {string} An error message if invalid, or an empty string if valid.
 */
export const validateAccountNumber = (accountNumber) => {
  if (!accountNumber || typeof accountNumber !== 'string' || accountNumber.trim().length === 0) {
    return '';
  }

  const accountRegex = /^\d{6,17}$/;

  if (!accountRegex.test(accountNumber.trim())) {
    return VALIDATION_MESSAGES.INVALID_ACCOUNT_NUMBER;
  }

  return '';
};

/**
 * Validates a SSN format (accepts ###-##-#### or #########).
 * @param {string} ssn - The SSN to validate.
 * @returns {string} An error message if invalid, or an empty string if valid.
 */
export const validateSSN = (ssn) => {
  if (!ssn || typeof ssn !== 'string' || ssn.trim().length === 0) {
    return '';
  }

  const ssnRegex = /^(?:\d{3}-\d{2}-\d{4}|\d{9})$/;

  if (!ssnRegex.test(ssn.trim())) {
    return VALIDATION_MESSAGES.INVALID_SSN;
  }

  return '';
};

/**
 * Validates a ZIP code format (accepts 5-digit or ZIP+4 format).
 * @param {string} zip - The ZIP code to validate.
 * @returns {string} An error message if invalid, or an empty string if valid.
 */
export const validateZip = (zip) => {
  if (!zip || typeof zip !== 'string' || zip.trim().length === 0) {
    return '';
  }

  const zipRegex = /^\d{5}(-\d{4})?$/;

  if (!zipRegex.test(zip.trim())) {
    return VALIDATION_MESSAGES.INVALID_ZIP;
  }

  return '';
};

/**
 * Retrieves the first error message for a given field by running its configured validators.
 * @param {string} value - The current value of the field.
 * @param {Array<Function>} validators - An array of validator functions to run against the value.
 * @returns {string} The first error message encountered, or an empty string if all validators pass.
 */
export const getFieldError = (value, validators) => {
  if (!validators || !Array.isArray(validators)) {
    return '';
  }

  for (const validator of validators) {
    if (typeof validator !== 'function') {
      continue;
    }

    const error = validator(value);
    if (error) {
      return error;
    }
  }

  return '';
};

/**
 * Validates an entire form by running validators on each field according to a field configuration.
 *
 * @param {Object} values - An object of field names to their current values.
 * @param {Object} fieldConfig - An object mapping field names to their validation configuration.
 *   Each key is a field name, and each value is an object with:
 *   - {Array<Function>} validators - An array of validator functions for the field.
 * @returns {Object} An object mapping field names to their first error message (empty string if valid).
 *
 * @example
 * const errors = validateForm(
 *   { email: 'bad', firstName: '' },
 *   {
 *     email: {
 *       validators: [
 *         (v) => validateRequired(v, 'Email'),
 *         validateEmail,
 *       ],
 *     },
 *     firstName: {
 *       validators: [
 *         (v) => validateRequired(v, 'First name'),
 *         (v) => validateName(v, 'First name'),
 *       ],
 *     },
 *   },
 * );
 * // errors => { email: 'Please enter a valid email address.', firstName: 'First name is required.' }
 */
export const validateForm = (values, fieldConfig) => {
  if (!values || typeof values !== 'object') {
    return {};
  }

  if (!fieldConfig || typeof fieldConfig !== 'object') {
    return {};
  }

  const errors = {};

  for (const fieldName of Object.keys(fieldConfig)) {
    const config = fieldConfig[fieldName];

    if (!config || !config.validators) {
      errors[fieldName] = '';
      continue;
    }

    const value = values[fieldName] !== undefined ? values[fieldName] : '';
    errors[fieldName] = getFieldError(value, config.validators);
  }

  return errors;
};

/**
 * Checks whether a form errors object contains any non-empty error messages.
 * @param {Object} errors - An object mapping field names to error message strings.
 * @returns {boolean} True if at least one field has a non-empty error message.
 */
export const hasErrors = (errors) => {
  if (!errors || typeof errors !== 'object') {
    return false;
  }

  return Object.values(errors).some((error) => error !== '');
};