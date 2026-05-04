import { describe, it, expect } from 'vitest';
import {
  validateRequired,
  validateEmail,
  validatePhone,
  validateName,
  validateMinLength,
  validateMaxLength,
  validateAccountNumber,
  validateSSN,
  validateZip,
  getFieldError,
  validateForm,
  hasErrors,
} from './validators.js';

describe('validators', () => {
  describe('validateRequired', () => {
    it('returns empty string for a non-empty value', () => {
      const result = validateRequired('hello', 'Username');
      expect(result).toBe('');
    });

    it('returns error message for an empty string', () => {
      const result = validateRequired('', 'Username');
      expect(result).toBe('Username is required.');
    });

    it('returns error message for a whitespace-only string', () => {
      const result = validateRequired('   ', 'Username');
      expect(result).toBe('Username is required.');
    });

    it('returns error message for null value', () => {
      const result = validateRequired(null, 'Email');
      expect(result).toBe('Email is required.');
    });

    it('returns error message for undefined value', () => {
      const result = validateRequired(undefined, 'Email');
      expect(result).toBe('Email is required.');
    });

    it('uses default field name when not provided', () => {
      const result = validateRequired('');
      expect(result).toBe('This field is required.');
    });

    it('returns empty string for a value with leading/trailing spaces', () => {
      const result = validateRequired('  hello  ', 'Name');
      expect(result).toBe('');
    });

    it('returns empty string for a single character value', () => {
      const result = validateRequired('a', 'Field');
      expect(result).toBe('');
    });
  });

  describe('validateEmail', () => {
    it('returns empty string for a valid email address', () => {
      const result = validateEmail('user@example.com');
      expect(result).toBe('');
    });

    it('returns empty string for an email with subdomain', () => {
      const result = validateEmail('user@mail.example.com');
      expect(result).toBe('');
    });

    it('returns empty string for an email with plus addressing', () => {
      const result = validateEmail('user+tag@example.com');
      expect(result).toBe('');
    });

    it('returns empty string for an email with dots in local part', () => {
      const result = validateEmail('first.last@example.com');
      expect(result).toBe('');
    });

    it('returns empty string for an email with numbers', () => {
      const result = validateEmail('user123@example456.com');
      expect(result).toBe('');
    });

    it('returns error message for email without @ symbol', () => {
      const result = validateEmail('userexample.com');
      expect(result).toBe('Please enter a valid email address.');
    });

    it('returns error message for email without domain', () => {
      const result = validateEmail('user@');
      expect(result).toBe('Please enter a valid email address.');
    });

    it('returns error message for email without TLD', () => {
      const result = validateEmail('user@example');
      expect(result).toBe('Please enter a valid email address.');
    });

    it('returns error message for email with spaces', () => {
      const result = validateEmail('user @example.com');
      expect(result).toBe('Please enter a valid email address.');
    });

    it('returns error message for email with double @', () => {
      const result = validateEmail('user@@example.com');
      expect(result).toBe('Please enter a valid email address.');
    });

    it('returns error message for email with single char TLD', () => {
      const result = validateEmail('user@example.c');
      expect(result).toBe('Please enter a valid email address.');
    });

    it('returns empty string for empty input (not required check)', () => {
      const result = validateEmail('');
      expect(result).toBe('');
    });

    it('returns empty string for null input', () => {
      const result = validateEmail(null);
      expect(result).toBe('');
    });

    it('returns empty string for undefined input', () => {
      const result = validateEmail(undefined);
      expect(result).toBe('');
    });
  });

  describe('validatePhone', () => {
    it('returns empty string for a valid phone number with parentheses', () => {
      const result = validatePhone('(555) 123-4567');
      expect(result).toBe('');
    });

    it('returns empty string for a valid phone number with dashes', () => {
      const result = validatePhone('555-123-4567');
      expect(result).toBe('');
    });

    it('returns empty string for a valid phone number with dots', () => {
      const result = validatePhone('555.123.4567');
      expect(result).toBe('');
    });

    it('returns empty string for a valid phone number digits only', () => {
      const result = validatePhone('5551234567');
      expect(result).toBe('');
    });

    it('returns empty string for a valid phone number with country code', () => {
      const result = validatePhone('+1-555-123-4567');
      expect(result).toBe('');
    });

    it('returns empty string for a valid international phone number', () => {
      const result = validatePhone('+44 20 7946 0958');
      expect(result).toBe('');
    });

    it('returns error message for phone number with letters', () => {
      const result = validatePhone('555-ABC-4567');
      expect(result).toBe('Please enter a valid phone number.');
    });

    it('returns error message for phone number too short', () => {
      const result = validatePhone('12345');
      expect(result).toBe('Please enter a valid phone number.');
    });

    it('returns error message for phone number with special characters', () => {
      const result = validatePhone('555!123@4567');
      expect(result).toBe('Please enter a valid phone number.');
    });

    it('returns empty string for empty input (not required check)', () => {
      const result = validatePhone('');
      expect(result).toBe('');
    });

    it('returns empty string for null input', () => {
      const result = validatePhone(null);
      expect(result).toBe('');
    });

    it('returns empty string for undefined input', () => {
      const result = validatePhone(undefined);
      expect(result).toBe('');
    });

    it('returns error message for a single digit', () => {
      const result = validatePhone('5');
      expect(result).toBe('Please enter a valid phone number.');
    });
  });

  describe('validateName', () => {
    it('returns empty string for a valid simple name', () => {
      const result = validateName('Alice', 'First Name');
      expect(result).toBe('');
    });

    it('returns empty string for a name with spaces', () => {
      const result = validateName('Mary Jane', 'First Name');
      expect(result).toBe('');
    });

    it('returns empty string for a hyphenated name', () => {
      const result = validateName('Anne-Marie', 'First Name');
      expect(result).toBe('');
    });

    it('returns empty string for a name with apostrophe', () => {
      const result = validateName("O'Brien", 'Last Name');
      expect(result).toBe('');
    });

    it('returns error message for a name with numbers', () => {
      const result = validateName('Alice123', 'First Name');
      expect(result).toBe('First Name format is invalid.');
    });

    it('returns error message for a name with special characters', () => {
      const result = validateName('Alice@Home', 'First Name');
      expect(result).toBe('First Name format is invalid.');
    });

    it('returns error message for a name with underscores', () => {
      const result = validateName('Alice_Bob', 'First Name');
      expect(result).toBe('First Name format is invalid.');
    });

    it('returns empty string for empty input (not required check)', () => {
      const result = validateName('', 'First Name');
      expect(result).toBe('');
    });

    it('returns empty string for null input', () => {
      const result = validateName(null, 'First Name');
      expect(result).toBe('');
    });

    it('returns empty string for undefined input', () => {
      const result = validateName(undefined, 'First Name');
      expect(result).toBe('');
    });

    it('uses default field name when not provided', () => {
      const result = validateName('Alice123');
      expect(result).toBe('Name format is invalid.');
    });
  });

  describe('validateMinLength', () => {
    it('returns empty string when value meets minimum length', () => {
      const result = validateMinLength('hello', 3, 'Username');
      expect(result).toBe('');
    });

    it('returns empty string when value exactly meets minimum length', () => {
      const result = validateMinLength('abc', 3, 'Username');
      expect(result).toBe('');
    });

    it('returns error message when value is shorter than minimum', () => {
      const result = validateMinLength('ab', 3, 'Username');
      expect(result).toBe('Username must be at least 3 characters.');
    });

    it('returns empty string for empty input (not required check)', () => {
      const result = validateMinLength('', 3, 'Username');
      expect(result).toBe('Username must be at least 3 characters.');
    });

    it('returns empty string for null input', () => {
      const result = validateMinLength(null, 3, 'Username');
      expect(result).toBe('');
    });

    it('returns empty string for undefined input', () => {
      const result = validateMinLength(undefined, 3, 'Username');
      expect(result).toBe('');
    });

    it('trims whitespace before checking length', () => {
      const result = validateMinLength('  a  ', 3, 'Username');
      expect(result).toBe('Username must be at least 3 characters.');
    });
  });

  describe('validateMaxLength', () => {
    it('returns empty string when value is within maximum length', () => {
      const result = validateMaxLength('hello', 10, 'Username');
      expect(result).toBe('');
    });

    it('returns empty string when value exactly meets maximum length', () => {
      const result = validateMaxLength('hello', 5, 'Username');
      expect(result).toBe('');
    });

    it('returns error message when value exceeds maximum length', () => {
      const result = validateMaxLength('hello world', 5, 'Username');
      expect(result).toBe('Username must not exceed 5 characters.');
    });

    it('returns empty string for null input', () => {
      const result = validateMaxLength(null, 5, 'Username');
      expect(result).toBe('');
    });

    it('returns empty string for undefined input', () => {
      const result = validateMaxLength(undefined, 5, 'Username');
      expect(result).toBe('');
    });
  });

  describe('validateAccountNumber', () => {
    it('returns empty string for a valid 10-digit account number', () => {
      const result = validateAccountNumber('1234567890');
      expect(result).toBe('');
    });

    it('returns empty string for a valid 6-digit account number', () => {
      const result = validateAccountNumber('123456');
      expect(result).toBe('');
    });

    it('returns error message for account number with letters', () => {
      const result = validateAccountNumber('12345ABC');
      expect(result).toBe('Please enter a valid account number.');
    });

    it('returns error message for account number too short', () => {
      const result = validateAccountNumber('12345');
      expect(result).toBe('Please enter a valid account number.');
    });

    it('returns empty string for empty input', () => {
      const result = validateAccountNumber('');
      expect(result).toBe('');
    });

    it('returns empty string for null input', () => {
      const result = validateAccountNumber(null);
      expect(result).toBe('');
    });
  });

  describe('validateSSN', () => {
    it('returns empty string for a valid SSN with dashes', () => {
      const result = validateSSN('123-45-6789');
      expect(result).toBe('');
    });

    it('returns empty string for a valid SSN without dashes', () => {
      const result = validateSSN('123456789');
      expect(result).toBe('');
    });

    it('returns error message for SSN with letters', () => {
      const result = validateSSN('123-AB-6789');
      expect(result).toBe('Please enter a valid Social Security Number.');
    });

    it('returns error message for SSN too short', () => {
      const result = validateSSN('123-45');
      expect(result).toBe('Please enter a valid Social Security Number.');
    });

    it('returns empty string for empty input', () => {
      const result = validateSSN('');
      expect(result).toBe('');
    });

    it('returns empty string for null input', () => {
      const result = validateSSN(null);
      expect(result).toBe('');
    });
  });

  describe('validateZip', () => {
    it('returns empty string for a valid 5-digit ZIP code', () => {
      const result = validateZip('62701');
      expect(result).toBe('');
    });

    it('returns empty string for a valid ZIP+4 code', () => {
      const result = validateZip('62701-1234');
      expect(result).toBe('');
    });

    it('returns error message for ZIP code with letters', () => {
      const result = validateZip('6270A');
      expect(result).toBe('Please enter a valid ZIP code.');
    });

    it('returns error message for ZIP code too short', () => {
      const result = validateZip('627');
      expect(result).toBe('Please enter a valid ZIP code.');
    });

    it('returns empty string for empty input', () => {
      const result = validateZip('');
      expect(result).toBe('');
    });

    it('returns empty string for null input', () => {
      const result = validateZip(null);
      expect(result).toBe('');
    });
  });

  describe('getFieldError', () => {
    it('returns empty string when all validators pass', () => {
      const validators = [
        (v) => validateRequired(v, 'Name'),
        (v) => validateMinLength(v, 2, 'Name'),
      ];

      const result = getFieldError('Alice', validators);
      expect(result).toBe('');
    });

    it('returns the first error message when a validator fails', () => {
      const validators = [
        (v) => validateRequired(v, 'Name'),
        (v) => validateMinLength(v, 10, 'Name'),
      ];

      const result = getFieldError('Alice', validators);
      expect(result).toBe('Name must be at least 10 characters.');
    });

    it('returns the required error first when value is empty', () => {
      const validators = [
        (v) => validateRequired(v, 'Name'),
        (v) => validateMinLength(v, 2, 'Name'),
      ];

      const result = getFieldError('', validators);
      expect(result).toBe('Name is required.');
    });

    it('stops at the first failing validator', () => {
      const validators = [
        (v) => validateRequired(v, 'Email'),
        validateEmail,
        (v) => validateMinLength(v, 100, 'Email'),
      ];

      const result = getFieldError('bad-email', validators);
      expect(result).toBe('Please enter a valid email address.');
    });

    it('returns empty string for null validators', () => {
      const result = getFieldError('value', null);
      expect(result).toBe('');
    });

    it('returns empty string for undefined validators', () => {
      const result = getFieldError('value', undefined);
      expect(result).toBe('');
    });

    it('returns empty string for empty validators array', () => {
      const result = getFieldError('value', []);
      expect(result).toBe('');
    });

    it('skips non-function entries in validators array', () => {
      const validators = [
        null,
        'not a function',
        (v) => validateRequired(v, 'Name'),
      ];

      const result = getFieldError('Alice', validators);
      expect(result).toBe('');
    });
  });

  describe('validateForm', () => {
    it('returns empty errors for all valid fields', () => {
      const values = {
        firstName: 'Alice',
        email: 'alice@example.com',
      };

      const fieldConfig = {
        firstName: {
          validators: [
            (v) => validateRequired(v, 'First Name'),
            (v) => validateName(v, 'First Name'),
          ],
        },
        email: {
          validators: [
            (v) => validateRequired(v, 'Email'),
            validateEmail,
          ],
        },
      };

      const errors = validateForm(values, fieldConfig);

      expect(errors.firstName).toBe('');
      expect(errors.email).toBe('');
    });

    it('returns error messages for invalid fields', () => {
      const values = {
        firstName: '',
        email: 'not-an-email',
      };

      const fieldConfig = {
        firstName: {
          validators: [
            (v) => validateRequired(v, 'First Name'),
          ],
        },
        email: {
          validators: [
            (v) => validateRequired(v, 'Email'),
            validateEmail,
          ],
        },
      };

      const errors = validateForm(values, fieldConfig);

      expect(errors.firstName).toBe('First Name is required.');
      expect(errors.email).toBe('Please enter a valid email address.');
    });

    it('returns errors for some fields and empty for others', () => {
      const values = {
        firstName: 'Alice',
        lastName: '',
        email: 'alice@example.com',
        phone: 'abc',
      };

      const fieldConfig = {
        firstName: {
          validators: [
            (v) => validateRequired(v, 'First Name'),
          ],
        },
        lastName: {
          validators: [
            (v) => validateRequired(v, 'Last Name'),
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
      };

      const errors = validateForm(values, fieldConfig);

      expect(errors.firstName).toBe('');
      expect(errors.lastName).toBe('Last Name is required.');
      expect(errors.email).toBe('');
      expect(errors.phone).toBe('Please enter a valid phone number.');
    });

    it('handles missing values by treating them as empty string', () => {
      const values = {};

      const fieldConfig = {
        firstName: {
          validators: [
            (v) => validateRequired(v, 'First Name'),
          ],
        },
      };

      const errors = validateForm(values, fieldConfig);

      expect(errors.firstName).toBe('First Name is required.');
    });

    it('returns empty object for null values', () => {
      const errors = validateForm(null, {});
      expect(errors).toEqual({});
    });

    it('returns empty object for null fieldConfig', () => {
      const errors = validateForm({ name: 'Alice' }, null);
      expect(errors).toEqual({});
    });

    it('returns empty object for undefined values', () => {
      const errors = validateForm(undefined, {});
      expect(errors).toEqual({});
    });

    it('returns empty object for undefined fieldConfig', () => {
      const errors = validateForm({ name: 'Alice' }, undefined);
      expect(errors).toEqual({});
    });

    it('returns empty string for fields with no validators', () => {
      const values = { name: 'Alice' };
      const fieldConfig = { name: {} };

      const errors = validateForm(values, fieldConfig);

      expect(errors.name).toBe('');
    });

    it('runs all validators in order and returns first error per field', () => {
      const values = {
        username: 'a',
      };

      const fieldConfig = {
        username: {
          validators: [
            (v) => validateRequired(v, 'Username'),
            (v) => validateMinLength(v, 3, 'Username'),
            (v) => validateMaxLength(v, 20, 'Username'),
          ],
        },
      };

      const errors = validateForm(values, fieldConfig);

      expect(errors.username).toBe('Username must be at least 3 characters.');
    });

    it('validates multiple fields independently', () => {
      const values = {
        firstName: 'Alice',
        lastName: 'Anderson',
        email: 'alice@example.com',
        phone: '(555) 123-4567',
      };

      const fieldConfig = {
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
      };

      const errors = validateForm(values, fieldConfig);

      expect(errors.firstName).toBe('');
      expect(errors.lastName).toBe('');
      expect(errors.email).toBe('');
      expect(errors.phone).toBe('');
    });
  });

  describe('hasErrors', () => {
    it('returns false when all error values are empty strings', () => {
      const errors = {
        firstName: '',
        lastName: '',
        email: '',
      };

      expect(hasErrors(errors)).toBe(false);
    });

    it('returns true when at least one field has an error', () => {
      const errors = {
        firstName: '',
        lastName: 'Last Name is required.',
        email: '',
      };

      expect(hasErrors(errors)).toBe(true);
    });

    it('returns true when all fields have errors', () => {
      const errors = {
        firstName: 'First Name is required.',
        lastName: 'Last Name is required.',
        email: 'Please enter a valid email address.',
      };

      expect(hasErrors(errors)).toBe(true);
    });

    it('returns false for an empty object', () => {
      expect(hasErrors({})).toBe(false);
    });

    it('returns false for null input', () => {
      expect(hasErrors(null)).toBe(false);
    });

    it('returns false for undefined input', () => {
      expect(hasErrors(undefined)).toBe(false);
    });

    it('returns true for a single field with an error', () => {
      const errors = {
        name: 'Name is required.',
      };

      expect(hasErrors(errors)).toBe(true);
    });

    it('returns false for a single field with no error', () => {
      const errors = {
        name: '',
      };

      expect(hasErrors(errors)).toBe(false);
    });
  });

  describe('integration: validateForm + hasErrors', () => {
    it('hasErrors returns false for a fully valid form', () => {
      const values = {
        firstName: 'Alice',
        email: 'alice@example.com',
        phone: '(555) 123-4567',
      };

      const fieldConfig = {
        firstName: {
          validators: [
            (v) => validateRequired(v, 'First Name'),
            (v) => validateName(v, 'First Name'),
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
      };

      const errors = validateForm(values, fieldConfig);
      expect(hasErrors(errors)).toBe(false);
    });

    it('hasErrors returns true for a form with validation errors', () => {
      const values = {
        firstName: '',
        email: 'invalid',
        phone: '',
      };

      const fieldConfig = {
        firstName: {
          validators: [
            (v) => validateRequired(v, 'First Name'),
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
          ],
        },
      };

      const errors = validateForm(values, fieldConfig);
      expect(hasErrors(errors)).toBe(true);
    });
  });
});