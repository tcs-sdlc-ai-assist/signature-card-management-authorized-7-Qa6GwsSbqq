import { STORAGE_KEYS } from '../constants/constants.js';

/**
 * Prefix used for all localStorage keys to avoid collisions.
 * @type {string}
 */
const KEY_PREFIX = 'sig_app_';

/**
 * Resolves a storage key. If the key matches a value in STORAGE_KEYS,
 * it is used as-is (already prefixed by convention). Otherwise, the
 * KEY_PREFIX is prepended.
 * @param {string} key - The storage key or STORAGE_KEYS constant value.
 * @returns {string} The resolved key for localStorage.
 */
const resolveKey = (key) => {
  if (!key || typeof key !== 'string') {
    return '';
  }

  const knownKeys = Object.values(STORAGE_KEYS);
  if (knownKeys.includes(key)) {
    return key;
  }

  return `${KEY_PREFIX}${key}`;
};

/**
 * Retrieves a value from localStorage by key, parsing it from JSON.
 * Returns the provided default value if the key does not exist, the
 * stored value cannot be parsed, or localStorage is unavailable.
 *
 * @param {string} key - The storage key (or a STORAGE_KEYS constant).
 * @param {*} [defaultValue=null] - The fallback value if retrieval fails.
 * @returns {*} The parsed value from storage, or the default value.
 */
export const getItem = (key, defaultValue = null) => {
  const resolvedKey = resolveKey(key);

  if (!resolvedKey) {
    return defaultValue;
  }

  try {
    const raw = localStorage.getItem(resolvedKey);

    if (raw === null || raw === undefined) {
      return defaultValue;
    }

    return JSON.parse(raw);
  } catch (_error) {
    return defaultValue;
  }
};

/**
 * Stores a value in localStorage under the given key, serializing it to JSON.
 * Silently fails if localStorage is unavailable or the value cannot be serialized.
 *
 * @param {string} key - The storage key (or a STORAGE_KEYS constant).
 * @param {*} value - The value to store (must be JSON-serializable).
 * @returns {boolean} True if the value was stored successfully, false otherwise.
 */
export const setItem = (key, value) => {
  const resolvedKey = resolveKey(key);

  if (!resolvedKey) {
    return false;
  }

  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(resolvedKey, serialized);
    return true;
  } catch (_error) {
    return false;
  }
};

/**
 * Removes a single item from localStorage by key.
 *
 * @param {string} key - The storage key (or a STORAGE_KEYS constant).
 * @returns {boolean} True if the removal succeeded, false otherwise.
 */
export const removeItem = (key) => {
  const resolvedKey = resolveKey(key);

  if (!resolvedKey) {
    return false;
  }

  try {
    localStorage.removeItem(resolvedKey);
    return true;
  } catch (_error) {
    return false;
  }
};

/**
 * Clears all application-related keys from localStorage.
 * Removes every key that is either a known STORAGE_KEYS value or
 * starts with the application prefix.
 *
 * @returns {boolean} True if the operation succeeded, false otherwise.
 */
export const clear = () => {
  try {
    const knownKeys = Object.values(STORAGE_KEYS);

    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);

      if (!storageKey) {
        continue;
      }

      if (knownKeys.includes(storageKey) || storageKey.startsWith(KEY_PREFIX)) {
        keysToRemove.push(storageKey);
      }
    }

    for (const storageKey of keysToRemove) {
      localStorage.removeItem(storageKey);
    }

    return true;
  } catch (_error) {
    return false;
  }
};

/**
 * Checks whether a key exists in localStorage and holds a non-null value.
 *
 * @param {string} key - The storage key (or a STORAGE_KEYS constant).
 * @returns {boolean} True if the key exists with a non-null value.
 */
export const hasItem = (key) => {
  const resolvedKey = resolveKey(key);

  if (!resolvedKey) {
    return false;
  }

  try {
    return localStorage.getItem(resolvedKey) !== null;
  } catch (_error) {
    return false;
  }
};

/**
 * Retrieves a value from localStorage, and if it does not exist,
 * initializes it with the provided default value before returning it.
 *
 * @param {string} key - The storage key (or a STORAGE_KEYS constant).
 * @param {*} defaultValue - The value to store and return if the key is absent.
 * @returns {*} The existing or newly stored value.
 */
export const getOrSet = (key, defaultValue) => {
  const existing = getItem(key);

  if (existing !== null) {
    return existing;
  }

  setItem(key, defaultValue);
  return defaultValue;
};

/**
 * Updates an existing value in localStorage by applying a transform function.
 * If the key does not exist, the transform receives the provided default value.
 *
 * @param {string} key - The storage key (or a STORAGE_KEYS constant).
 * @param {Function} updater - A function that receives the current value and returns the new value.
 * @param {*} [defaultValue=null] - The fallback value passed to the updater if the key is absent.
 * @returns {boolean} True if the update was stored successfully, false otherwise.
 */
export const updateItem = (key, updater, defaultValue = null) => {
  if (typeof updater !== 'function') {
    return false;
  }

  try {
    const current = getItem(key, defaultValue);
    const updated = updater(current);
    return setItem(key, updated);
  } catch (_error) {
    return false;
  }
};