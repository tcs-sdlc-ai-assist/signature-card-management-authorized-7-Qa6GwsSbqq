import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a new UUID v4 string.
 * @returns {string} A unique identifier string.
 */
export const generateUUID = () => {
  return uuidv4();
};

/**
 * Formats an ISO timestamp string into a human-readable format.
 * @param {string|Date} timestamp - An ISO 8601 date string or Date object.
 * @param {Object} [options] - Intl.DateTimeFormat options override.
 * @returns {string} A formatted date/time string, or empty string if invalid.
 */
export const formatTimestamp = (timestamp, options = {}) => {
  if (!timestamp) {
    return '';
  }

  try {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

    if (isNaN(date.getTime())) {
      return '';
    }

    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      ...options,
    };

    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
  } catch (_error) {
    return '';
  }
};

/**
 * Masks an account number, showing only the last 4 digits.
 * Characters before the last 4 are replaced with asterisks.
 * @param {string} accountNumber - The full account number.
 * @returns {string} The masked account number, or the original value if 4 chars or fewer.
 */
export const maskAccountNumber = (accountNumber) => {
  if (!accountNumber || typeof accountNumber !== 'string') {
    return accountNumber || '';
  }

  if (accountNumber.length <= 4) {
    return accountNumber;
  }

  const lastFour = accountNumber.slice(-4);
  const masked = '*'.repeat(accountNumber.length - 4);
  return `${masked}${lastFour}`;
};

/**
 * Sanitizes user input by stripping potentially dangerous HTML/script content.
 * Trims whitespace and removes angle-bracket tags.
 * @param {string} input - The raw user input string.
 * @returns {string} The sanitized string.
 */
export const sanitizeInput = (input) => {
  if (input === null || input === undefined) {
    return '';
  }

  if (typeof input !== 'string') {
    return String(input);
  }

  return input
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Creates a debounced version of the provided function that delays invocation
 * until after `delay` milliseconds have elapsed since the last call.
 * @param {Function} fn - The function to debounce.
 * @param {number} delay - The debounce delay in milliseconds.
 * @returns {Function} A debounced version of `fn` with a `.cancel()` method.
 */
export const debounce = (fn, delay) => {
  let timerId = null;

  const debounced = (...args) => {
    if (timerId !== null) {
      clearTimeout(timerId);
    }

    timerId = setTimeout(() => {
      fn(...args);
      timerId = null;
    }, delay);
  };

  /**
   * Cancels any pending debounced invocation.
   */
  debounced.cancel = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  return debounced;
};

/**
 * Creates a deep clone of the provided value using structured cloning
 * with a JSON fallback for environments that lack structuredClone.
 * @param {*} obj - The value to deep clone.
 * @returns {*} A deep copy of the input value.
 */
export const deepClone = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(obj);
    }
  } catch (_error) {
    // Fall through to JSON method
  }

  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (_error) {
    return obj;
  }
};

/**
 * Checks whether a given expiry timestamp has passed (i.e., the token/session is expired).
 * @param {string|Date|number} expiresAt - The expiry time as an ISO string, Date, or epoch ms.
 * @returns {boolean} True if the current time is past the expiry time, false otherwise.
 */
export const isExpired = (expiresAt) => {
  if (!expiresAt) {
    return true;
  }

  try {
    let expiryDate;

    if (expiresAt instanceof Date) {
      expiryDate = expiresAt;
    } else if (typeof expiresAt === 'number') {
      expiryDate = new Date(expiresAt);
    } else {
      expiryDate = new Date(expiresAt);
    }

    if (isNaN(expiryDate.getTime())) {
      return true;
    }

    return Date.now() >= expiryDate.getTime();
  } catch (_error) {
    return true;
  }
};

/**
 * Returns a Date object set to midnight (00:00:00.000) of the current day
 * in the local timezone. Useful for rate-limit window resets.
 * @returns {Date} A Date representing the start of today.
 */
export const getToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};