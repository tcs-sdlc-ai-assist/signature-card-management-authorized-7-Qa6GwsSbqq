import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateUUID,
  formatTimestamp,
  maskAccountNumber,
  sanitizeInput,
  debounce,
  deepClone,
  isExpired,
  getToday,
} from './helpers.js';

describe('helpers', () => {
  describe('generateUUID', () => {
    it('returns a string', () => {
      const uuid = generateUUID();
      expect(typeof uuid).toBe('string');
    });

    it('returns a non-empty string', () => {
      const uuid = generateUUID();
      expect(uuid.length).toBeGreaterThan(0);
    });

    it('returns a valid UUID v4 format', () => {
      const uuid = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(uuid)).toBe(true);
    });

    it('generates unique IDs on each call', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      const uuid3 = generateUUID();

      expect(uuid1).not.toBe(uuid2);
      expect(uuid2).not.toBe(uuid3);
      expect(uuid1).not.toBe(uuid3);
    });
  });

  describe('maskAccountNumber', () => {
    it('masks all but the last 4 digits of a 10-digit account number', () => {
      const result = maskAccountNumber('1234567890');
      expect(result).toBe('******7890');
    });

    it('masks all but the last 4 digits of a 6-digit account number', () => {
      const result = maskAccountNumber('123456');
      expect(result).toBe('**3456');
    });

    it('returns the original value for a 4-character string', () => {
      const result = maskAccountNumber('1234');
      expect(result).toBe('1234');
    });

    it('returns the original value for a string shorter than 4 characters', () => {
      const result = maskAccountNumber('123');
      expect(result).toBe('123');
    });

    it('returns empty string for null input', () => {
      const result = maskAccountNumber(null);
      expect(result).toBe('');
    });

    it('returns empty string for undefined input', () => {
      const result = maskAccountNumber(undefined);
      expect(result).toBe('');
    });

    it('returns empty string for empty string input', () => {
      const result = maskAccountNumber('');
      expect(result).toBe('');
    });

    it('returns the input for non-string types', () => {
      const result = maskAccountNumber(12345);
      expect(result).toBe('');
    });

    it('correctly masks a long account number', () => {
      const result = maskAccountNumber('12345678901234567');
      expect(result).toBe('*************4567');
    });

    it('shows only last 4 digits with asterisks for the rest', () => {
      const result = maskAccountNumber('9876543210');
      const lastFour = result.slice(-4);
      const maskedPart = result.slice(0, -4);

      expect(lastFour).toBe('3210');
      expect(maskedPart).toBe('******');
      expect(maskedPart.split('').every((c) => c === '*')).toBe(true);
    });
  });

  describe('isExpired', () => {
    it('returns true for a date in the past', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString();
      expect(isExpired(pastDate)).toBe(true);
    });

    it('returns false for a date in the future', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60).toISOString();
      expect(isExpired(futureDate)).toBe(false);
    });

    it('returns true for null input', () => {
      expect(isExpired(null)).toBe(true);
    });

    it('returns true for undefined input', () => {
      expect(isExpired(undefined)).toBe(true);
    });

    it('returns true for empty string input', () => {
      expect(isExpired('')).toBe(true);
    });

    it('returns true for an invalid date string', () => {
      expect(isExpired('not-a-date')).toBe(true);
    });

    it('accepts a Date object in the past', () => {
      const pastDate = new Date(Date.now() - 1000 * 60);
      expect(isExpired(pastDate)).toBe(true);
    });

    it('accepts a Date object in the future', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24);
      expect(isExpired(futureDate)).toBe(false);
    });

    it('accepts epoch milliseconds in the past', () => {
      const pastEpoch = Date.now() - 1000 * 60 * 60;
      expect(isExpired(pastEpoch)).toBe(true);
    });

    it('accepts epoch milliseconds in the future', () => {
      const futureEpoch = Date.now() + 1000 * 60 * 60;
      expect(isExpired(futureEpoch)).toBe(false);
    });

    it('returns true for a date exactly at the current time', () => {
      const now = Date.now();
      // isExpired uses >= so exactly now should be expired
      expect(isExpired(now)).toBe(true);
    });
  });

  describe('formatTimestamp', () => {
    it('returns a non-empty string for a valid ISO timestamp', () => {
      const result = formatTimestamp('2024-12-01T09:15:00.000Z');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns a human-readable format containing month, day, and year', () => {
      const result = formatTimestamp('2024-06-15T10:30:00.000Z');
      // Should contain year
      expect(result).toContain('2024');
      // Should contain month abbreviation (Jun)
      expect(result).toContain('Jun');
    });

    it('returns empty string for null input', () => {
      expect(formatTimestamp(null)).toBe('');
    });

    it('returns empty string for undefined input', () => {
      expect(formatTimestamp(undefined)).toBe('');
    });

    it('returns empty string for empty string input', () => {
      expect(formatTimestamp('')).toBe('');
    });

    it('returns empty string for an invalid date string', () => {
      expect(formatTimestamp('not-a-date')).toBe('');
    });

    it('accepts a Date object', () => {
      const date = new Date('2024-01-15T14:30:00.000Z');
      const result = formatTimestamp(date);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('2024');
    });

    it('includes time information in the output', () => {
      const result = formatTimestamp('2024-06-15T14:30:00.000Z');
      // Should contain some time representation (AM/PM since hour12 is true by default)
      expect(result).toMatch(/AM|PM/i);
    });

    it('accepts custom options to override formatting', () => {
      const result = formatTimestamp('2024-06-15T14:30:00.000Z', {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
      });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('sanitizeInput', () => {
    it('returns the same string for safe input', () => {
      const result = sanitizeInput('Hello World');
      expect(result).toBe('Hello World');
    });

    it('escapes less-than angle brackets', () => {
      const result = sanitizeInput('<script>alert("xss")</script>');
      expect(result).not.toContain('<');
      expect(result).toContain('&lt;');
    });

    it('escapes greater-than angle brackets', () => {
      const result = sanitizeInput('value > 5');
      expect(result).not.toContain('>');
      expect(result).toContain('&gt;');
    });

    it('escapes double quotes', () => {
      const result = sanitizeInput('He said "hello"');
      expect(result).not.toContain('"');
      expect(result).toContain('&quot;');
    });

    it('escapes single quotes', () => {
      const result = sanitizeInput("It's a test");
      expect(result).not.toContain("'");
      expect(result).toContain('&#x27;');
    });

    it('escapes forward slashes', () => {
      const result = sanitizeInput('path/to/file');
      expect(result).not.toContain('/');
      expect(result).toContain('&#x2F;');
    });

    it('trims whitespace from the input', () => {
      const result = sanitizeInput('  hello  ');
      expect(result).toBe('hello');
    });

    it('returns empty string for null input', () => {
      expect(sanitizeInput(null)).toBe('');
    });

    it('returns empty string for undefined input', () => {
      expect(sanitizeInput(undefined)).toBe('');
    });

    it('converts non-string types to string', () => {
      const result = sanitizeInput(12345);
      expect(result).toBe('12345');
    });

    it('handles a complex XSS attack string', () => {
      const result = sanitizeInput('<img src="x" onerror="alert(1)">');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain('"');
    });

    it('returns empty string for empty string input', () => {
      expect(sanitizeInput('')).toBe('');
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('delays function execution by the specified delay', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 300);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('only calls the function once when invoked multiple times within the delay', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 200);

      debounced();
      debounced();
      debounced();

      vi.advanceTimersByTime(200);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('passes arguments to the debounced function', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('arg1', 'arg2');

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('uses the latest arguments when called multiple times', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('first');
      debounced('second');
      debounced('third');

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('third');
    });

    it('cancel method prevents the function from being called', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 200);

      debounced();
      debounced.cancel();

      vi.advanceTimersByTime(200);
      expect(fn).not.toHaveBeenCalled();
    });

    afterEach(() => {
      vi.useRealTimers();
    });
  });

  describe('deepClone', () => {
    it('creates a deep copy of a plain object', () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
    });

    it('creates a deep copy of an array', () => {
      const original = [1, [2, 3], { a: 4 }];
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned[1]).not.toBe(original[1]);
      expect(cloned[2]).not.toBe(original[2]);
    });

    it('returns null for null input', () => {
      expect(deepClone(null)).toBeNull();
    });

    it('returns undefined for undefined input', () => {
      expect(deepClone(undefined)).toBeUndefined();
    });

    it('returns primitive values as-is', () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone('hello')).toBe('hello');
      expect(deepClone(true)).toBe(true);
    });

    it('mutations on the clone do not affect the original', () => {
      const original = { name: 'Alice', address: { city: 'Springfield' } };
      const cloned = deepClone(original);

      cloned.name = 'Bob';
      cloned.address.city = 'Shelbyville';

      expect(original.name).toBe('Alice');
      expect(original.address.city).toBe('Springfield');
    });

    it('handles nested objects with multiple levels', () => {
      const original = { a: { b: { c: { d: 'deep' } } } };
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned.a.b.c).not.toBe(original.a.b.c);
      expect(cloned.a.b.c.d).toBe('deep');
    });
  });

  describe('getToday', () => {
    it('returns a Date object', () => {
      const today = getToday();
      expect(today instanceof Date).toBe(true);
    });

    it('returns a date set to midnight (00:00:00.000)', () => {
      const today = getToday();
      expect(today.getHours()).toBe(0);
      expect(today.getMinutes()).toBe(0);
      expect(today.getSeconds()).toBe(0);
      expect(today.getMilliseconds()).toBe(0);
    });

    it('returns the current date (year, month, day)', () => {
      const today = getToday();
      const now = new Date();

      expect(today.getFullYear()).toBe(now.getFullYear());
      expect(today.getMonth()).toBe(now.getMonth());
      expect(today.getDate()).toBe(now.getDate());
    });

    it('returns a date that is less than or equal to the current time', () => {
      const today = getToday();
      const now = new Date();

      expect(today.getTime()).toBeLessThanOrEqual(now.getTime());
    });
  });
});