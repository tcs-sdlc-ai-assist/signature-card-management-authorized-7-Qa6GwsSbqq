/**
 * Application-wide constants and configuration values.
 * Environment variables are accessed via import.meta.env.VITE_* with sensible defaults.
 */

/**
 * Keys used for localStorage persistence.
 * @readonly
 * @enum {string}
 */
export const STORAGE_KEYS = {
  USERS: 'sig_users',
  SESSIONS: 'sig_sessions',
  AUDIT_LOG: 'sig_audit_log',
  TOKENS: 'sig_tokens',
  VERIFICATION: 'sig_verification',
  CONTENT: 'sig_content',
  RATE_LIMITS: 'sig_rate_limits',
  FAILED_LOGINS: 'sig_failed_logins',
};

/**
 * Session timeout in milliseconds.
 * @type {number}
 */
export const SESSION_TIMEOUT_MS = Number(import.meta.env.VITE_SESSION_TIMEOUT_MS) || 900000;

/**
 * Maximum number of failed login attempts before account lockout.
 * @type {number}
 */
export const MAX_FAILED_LOGINS = Number(import.meta.env.VITE_MAX_FAILED_LOGINS) || 5;

/**
 * Token expiry duration in hours.
 * @type {number}
 */
export const TOKEN_EXPIRY_HOURS = Number(import.meta.env.VITE_TOKEN_EXPIRY_HOURS) || 72;

/**
 * Maximum number of requests allowed within the rate limit window.
 * @type {number}
 */
export const RATE_LIMIT_MAX = Number(import.meta.env.VITE_RATE_LIMIT_MAX) || 3;

/**
 * Possible statuses for a signer on a signature card.
 * @readonly
 * @enum {string}
 */
export const SIGNER_STATUSES = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  PENDING: 'Pending',
  REVOKED: 'Revoked',
};

/**
 * Supported account types for signature cards.
 * @readonly
 * @enum {string}
 */
export const ACCOUNT_TYPES = {
  CHECKING: 'Checking',
  SAVINGS: 'Savings',
  MONEY_MARKET: 'Money Market',
  CD: 'Certificate of Deposit',
  IRA: 'IRA',
  TRUST: 'Trust',
  BUSINESS_CHECKING: 'Business Checking',
  BUSINESS_SAVINGS: 'Business Savings',
};

/**
 * Steps for the multi-step progress indicator.
 * Each step has a numeric key, label, and description.
 * @type {Array<{ step: number, label: string, description: string }>}
 */
export const STEPS = [
  { step: 1, label: 'Account Info', description: 'Enter account information' },
  { step: 2, label: 'Signer Details', description: 'Add signer details' },
  { step: 3, label: 'Verification', description: 'Verify signer identity' },
  { step: 4, label: 'Review & Submit', description: 'Review and submit the card' },
];

/**
 * Available verification methods for signer identity.
 * @readonly
 * @enum {string}
 */
export const VERIFICATION_METHODS = {
  ID_VERIFICATION: 'ID Verification',
  KNOWLEDGE_BASED: 'Knowledge-Based Authentication',
  IN_PERSON: 'In-Person Verification',
  DIGITAL_SIGNATURE: 'Digital Signature',
};