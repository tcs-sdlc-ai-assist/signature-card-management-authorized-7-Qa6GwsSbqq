/**
 * Centralized user-facing message strings for UI feedback.
 * Organized by category for consistent messaging across the application.
 */

/**
 * Error messages displayed to users when operations fail.
 * @readonly
 * @enum {string}
 */
export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Unable to connect to the server. Please check your connection and try again.',
  TIMEOUT: 'The request timed out. Please try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied. You do not have permission to access this resource.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'A server error occurred. Please try again later.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment and try again.',
  ACCOUNT_LOCKED: 'Your account has been locked due to too many failed attempts. Please contact support.',
  INVALID_CREDENTIALS: 'Invalid username or password. Please try again.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  TOKEN_INVALID: 'Your authentication token is invalid. Please log in again.',
  TOKEN_EXPIRED: 'Your authentication token has expired. Please log in again.',
  DATA_LOAD_FAILED: 'Failed to load data. Please refresh the page and try again.',
  SAVE_FAILED: 'Failed to save changes. Please try again.',
  DELETE_FAILED: 'Failed to delete the item. Please try again.',
  DUPLICATE_ENTRY: 'This entry already exists. Please use a different value.',
  FILE_UPLOAD_FAILED: 'File upload failed. Please try again.',
  CARD_NOT_FOUND: 'The signature card could not be found.',
  SIGNER_NOT_FOUND: 'The signer could not be found.',
  SUBMISSION_FAILED: 'Failed to submit the signature card. Please review and try again.',
};

/**
 * Success messages displayed to users when operations complete.
 * @readonly
 * @enum {string}
 */
export const SUCCESS_MESSAGES = {
  LOGIN: 'You have successfully logged in.',
  LOGOUT: 'You have been successfully logged out.',
  SAVE: 'Changes have been saved successfully.',
  DELETE: 'The item has been deleted successfully.',
  CARD_CREATED: 'Signature card has been created successfully.',
  CARD_UPDATED: 'Signature card has been updated successfully.',
  CARD_SUBMITTED: 'Signature card has been submitted successfully.',
  CARD_DELETED: 'Signature card has been deleted successfully.',
  SIGNER_ADDED: 'Signer has been added successfully.',
  SIGNER_UPDATED: 'Signer information has been updated successfully.',
  SIGNER_REMOVED: 'Signer has been removed successfully.',
  VERIFICATION_COMPLETE: 'Verification has been completed successfully.',
  PASSWORD_CHANGED: 'Your password has been changed successfully.',
  PROFILE_UPDATED: 'Your profile has been updated successfully.',
  ACCOUNT_UNLOCKED: 'The account has been unlocked successfully.',
  CODE_RESENT: 'A new verification code has been sent.',
};

/**
 * Unlock attempt messaging matrix.
 * Provides escalating messages based on the number of failed unlock attempts.
 * @readonly
 * @type {Object<number, string>}
 */
export const UNLOCK_ATTEMPT_MESSAGES = {
  1: 'Incorrect unlock code. You have 2 attempts remaining.',
  2: 'Incorrect unlock code. You have 1 attempt remaining. Please double-check your code.',
  3: 'Incorrect unlock code. This is your final attempt.',
};

/**
 * Message displayed when the unlock attempt limit has been reached.
 * @type {string}
 */
export const UNLOCK_LIMIT_REACHED_MESSAGE =
  'You have exceeded the maximum number of unlock attempts. Your account has been locked. Please contact support for assistance.';

/**
 * Resend attempt messaging matrix.
 * Provides escalating messages based on the number of resend requests.
 * @readonly
 * @type {Object<number, string>}
 */
export const RESEND_ATTEMPT_MESSAGES = {
  1: 'A new code has been sent. Please check your email.',
  2: 'Another code has been sent. You have 1 resend attempt remaining.',
  3: 'A final code has been sent. No more resend attempts are available.',
};

/**
 * Message displayed when the resend attempt limit has been reached.
 * @type {string}
 */
export const RESEND_LIMIT_REACHED_MESSAGE =
  'You have reached the maximum number of resend attempts. Please contact support if you need further assistance.';

/**
 * Validation messages for form fields.
 * @readonly
 * @enum {string}
 */
export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required.',
  REQUIRED_FIELD: (fieldName) => `${fieldName} is required.`,
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_PHONE: 'Please enter a valid phone number.',
  INVALID_SSN: 'Please enter a valid Social Security Number.',
  INVALID_ACCOUNT_NUMBER: 'Please enter a valid account number.',
  INVALID_ROUTING_NUMBER: 'Please enter a valid routing number.',
  INVALID_DATE: 'Please enter a valid date.',
  INVALID_ZIP: 'Please enter a valid ZIP code.',
  PASSWORD_MIN_LENGTH: 'Password must be at least 8 characters long.',
  PASSWORD_REQUIREMENTS:
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
  PASSWORD_MISMATCH: 'Passwords do not match.',
  MIN_LENGTH: (fieldName, min) => `${fieldName} must be at least ${min} characters.`,
  MAX_LENGTH: (fieldName, max) => `${fieldName} must not exceed ${max} characters.`,
  MIN_VALUE: (fieldName, min) => `${fieldName} must be at least ${min}.`,
  MAX_VALUE: (fieldName, max) => `${fieldName} must not exceed ${max}.`,
  PATTERN_MISMATCH: (fieldName) => `${fieldName} format is invalid.`,
  MIN_SIGNERS: 'At least one signer is required.',
  MAX_SIGNERS: 'Maximum number of signers has been reached.',
  DUPLICATE_SIGNER: 'This signer has already been added to the card.',
  ACCOUNT_TYPE_REQUIRED: 'Please select an account type.',
  VERIFICATION_METHOD_REQUIRED: 'Please select a verification method.',
  SIGNER_NAME_REQUIRED: 'Signer name is required.',
  SIGNER_TITLE_REQUIRED: 'Signer title is required.',
};

/**
 * Session timeout warning messages.
 * @readonly
 * @enum {string}
 */
export const SESSION_MESSAGES = {
  TIMEOUT_WARNING: 'Your session is about to expire due to inactivity. Would you like to continue?',
  TIMEOUT_EXPIRED: 'Your session has expired due to inactivity. Please log in again.',
  EXTEND_SESSION: 'Your session has been extended.',
  ACTIVITY_DETECTED: 'Session activity detected.',
};

/**
 * General UI labels used across the application.
 * @readonly
 * @enum {string}
 */
export const UI_LABELS = {
  APP_TITLE: 'SIG Card Management',
  LOGIN: 'Log In',
  LOGOUT: 'Log Out',
  SUBMIT: 'Submit',
  CANCEL: 'Cancel',
  SAVE: 'Save',
  DELETE: 'Delete',
  EDIT: 'Edit',
  ADD: 'Add',
  CLOSE: 'Close',
  CONFIRM: 'Confirm',
  BACK: 'Back',
  NEXT: 'Next',
  PREVIOUS: 'Previous',
  SEARCH: 'Search',
  FILTER: 'Filter',
  RESET: 'Reset',
  CLEAR: 'Clear',
  LOADING: 'Loading...',
  SAVING: 'Saving...',
  SUBMITTING: 'Submitting...',
  DELETING: 'Deleting...',
  NO_RESULTS: 'No results found.',
  NO_DATA: 'No data available.',
  REQUIRED_INDICATOR: '*',
  REQUIRED_FIELD_NOTE: 'Fields marked with * are required.',
  YES: 'Yes',
  NO: 'No',
  OK: 'OK',
  CONTINUE: 'Continue',
  STAY_LOGGED_IN: 'Stay Logged In',
  RETRY: 'Retry',
  VIEW_DETAILS: 'View Details',
  DOWNLOAD: 'Download',
  PRINT: 'Print',
  ACTIONS: 'Actions',
  STATUS: 'Status',
  DATE_CREATED: 'Date Created',
  LAST_MODIFIED: 'Last Modified',
  CREATED_BY: 'Created By',
  ACCOUNT_NUMBER: 'Account Number',
  ACCOUNT_TYPE: 'Account Type',
  SIGNER_NAME: 'Signer Name',
  SIGNER_TITLE: 'Signer Title',
  SIGNER_STATUS: 'Signer Status',
  VERIFICATION_METHOD: 'Verification Method',
  SIGNATURE_CARD: 'Signature Card',
  SIGNATURE_CARDS: 'Signature Cards',
  NEW_SIGNATURE_CARD: 'New Signature Card',
  REVIEW_AND_SUBMIT: 'Review & Submit',
};

/**
 * Confirmation dialog messages.
 * @readonly
 * @enum {string}
 */
export const CONFIRMATION_MESSAGES = {
  DELETE_CARD: 'Are you sure you want to delete this signature card? This action cannot be undone.',
  DELETE_SIGNER: 'Are you sure you want to remove this signer from the card?',
  DISCARD_CHANGES: 'You have unsaved changes. Are you sure you want to leave this page?',
  SUBMIT_CARD: 'Are you sure you want to submit this signature card for processing?',
  LOGOUT: 'Are you sure you want to log out?',
  REVOKE_SIGNER: 'Are you sure you want to revoke this signer\'s access?',
};