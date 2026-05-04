/**
 * Mock data fixtures for all services.
 * Provides sample data for demo/development including users, accounts,
 * signers, eSign tokens, KBA questions, and OTP codes.
 */

import { v4 as uuidv4 } from 'uuid';
import { SIGNER_STATUSES, ACCOUNT_TYPES, VERIFICATION_METHODS } from './constants.js';

/**
 * Simple hash function for mock passwords.
 * NOT cryptographically secure — for demo/development only.
 * @param {string} password - The plain text password to hash.
 * @returns {string} A base64-encoded hash of the password.
 */
const hashPassword = (password) => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return btoa(String(hash));
};

/**
 * Masks an account number, showing only the last 4 digits.
 * @param {string} accountNumber - The full account number.
 * @returns {string} The masked account number.
 */
const maskAccountNumber = (accountNumber) => {
  if (!accountNumber || accountNumber.length <= 4) {
    return accountNumber;
  }
  const lastFour = accountNumber.slice(-4);
  const masked = '*'.repeat(accountNumber.length - 4);
  return `${masked}${lastFour}`;
};

// ========================================
// User IDs
// ========================================

const USER_ID_1 = 'usr-001-admin';
const USER_ID_2 = 'usr-002-manager';
const USER_ID_3 = 'usr-003-teller';
const USER_ID_4 = 'usr-004-readonly';
const USER_ID_5 = 'usr-005-locked';

// ========================================
// Account IDs
// ========================================

const ACCOUNT_ID_1 = 'acct-1001';
const ACCOUNT_ID_2 = 'acct-1002';
const ACCOUNT_ID_3 = 'acct-1003';
const ACCOUNT_ID_4 = 'acct-1004';
const ACCOUNT_ID_5 = 'acct-1005';

// ========================================
// Signer IDs
// ========================================

const SIGNER_ID_1 = 'sgn-2001';
const SIGNER_ID_2 = 'sgn-2002';
const SIGNER_ID_3 = 'sgn-2003';
const SIGNER_ID_4 = 'sgn-2004';
const SIGNER_ID_5 = 'sgn-2005';
const SIGNER_ID_6 = 'sgn-2006';
const SIGNER_ID_7 = 'sgn-2007';
const SIGNER_ID_8 = 'sgn-2008';

// ========================================
// Mock Users
// ========================================

/**
 * Sample users with hashed passwords for demo/development.
 * @type {Array<Object>}
 */
export const MOCK_USERS = [
  {
    id: USER_ID_1,
    username: 'admin',
    passwordHash: hashPassword('Admin@1234'),
    firstName: 'Alice',
    lastName: 'Anderson',
    email: 'alice.anderson@sigbank.com',
    role: 'admin',
    isLocked: false,
    failedLoginAttempts: 0,
    lastLogin: '2024-12-01T09:15:00.000Z',
    createdAt: '2024-01-15T08:00:00.000Z',
    updatedAt: '2024-12-01T09:15:00.000Z',
  },
  {
    id: USER_ID_2,
    username: 'manager',
    passwordHash: hashPassword('Manager@1234'),
    firstName: 'Bob',
    lastName: 'Baker',
    email: 'bob.baker@sigbank.com',
    role: 'manager',
    isLocked: false,
    failedLoginAttempts: 0,
    lastLogin: '2024-11-28T14:30:00.000Z',
    createdAt: '2024-02-10T10:00:00.000Z',
    updatedAt: '2024-11-28T14:30:00.000Z',
  },
  {
    id: USER_ID_3,
    username: 'teller',
    passwordHash: hashPassword('Teller@1234'),
    firstName: 'Carol',
    lastName: 'Chen',
    email: 'carol.chen@sigbank.com',
    role: 'teller',
    isLocked: false,
    failedLoginAttempts: 1,
    lastLogin: '2024-12-02T11:45:00.000Z',
    createdAt: '2024-03-20T09:00:00.000Z',
    updatedAt: '2024-12-02T11:45:00.000Z',
  },
  {
    id: USER_ID_4,
    username: 'readonly',
    passwordHash: hashPassword('ReadOnly@1234'),
    firstName: 'David',
    lastName: 'Davis',
    email: 'david.davis@sigbank.com',
    role: 'readonly',
    isLocked: false,
    failedLoginAttempts: 0,
    lastLogin: '2024-11-30T16:00:00.000Z',
    createdAt: '2024-04-05T12:00:00.000Z',
    updatedAt: '2024-11-30T16:00:00.000Z',
  },
  {
    id: USER_ID_5,
    username: 'locked_user',
    passwordHash: hashPassword('Locked@1234'),
    firstName: 'Eve',
    lastName: 'Evans',
    email: 'eve.evans@sigbank.com',
    role: 'teller',
    isLocked: true,
    failedLoginAttempts: 5,
    lastLogin: '2024-11-25T08:00:00.000Z',
    createdAt: '2024-05-12T14:00:00.000Z',
    updatedAt: '2024-11-25T08:30:00.000Z',
  },
];

// ========================================
// Mock Accounts
// ========================================

/** @type {string} */
const FULL_ACCOUNT_1 = '1234567890';
const FULL_ACCOUNT_2 = '2345678901';
const FULL_ACCOUNT_3 = '3456789012';
const FULL_ACCOUNT_4 = '4567890123';
const FULL_ACCOUNT_5 = '5678901234';

/**
 * Sample accounts with masked numbers, types, and signer counts.
 * @type {Array<Object>}
 */
export const MOCK_ACCOUNTS = [
  {
    id: ACCOUNT_ID_1,
    accountNumber: FULL_ACCOUNT_1,
    accountNumberMasked: maskAccountNumber(FULL_ACCOUNT_1),
    accountType: ACCOUNT_TYPES.CHECKING,
    accountName: 'Anderson Family Checking',
    signerCount: 2,
    signerIds: [SIGNER_ID_1, SIGNER_ID_2],
    status: 'Active',
    openedDate: '2023-06-15',
    branchCode: 'BR-001',
    createdAt: '2023-06-15T10:00:00.000Z',
    updatedAt: '2024-11-20T09:00:00.000Z',
  },
  {
    id: ACCOUNT_ID_2,
    accountNumber: FULL_ACCOUNT_2,
    accountNumberMasked: maskAccountNumber(FULL_ACCOUNT_2),
    accountType: ACCOUNT_TYPES.SAVINGS,
    accountName: 'Baker Savings Account',
    signerCount: 1,
    signerIds: [SIGNER_ID_3],
    status: 'Active',
    openedDate: '2023-08-22',
    branchCode: 'BR-002',
    createdAt: '2023-08-22T11:00:00.000Z',
    updatedAt: '2024-10-15T14:00:00.000Z',
  },
  {
    id: ACCOUNT_ID_3,
    accountNumber: FULL_ACCOUNT_3,
    accountNumberMasked: maskAccountNumber(FULL_ACCOUNT_3),
    accountType: ACCOUNT_TYPES.BUSINESS_CHECKING,
    accountName: 'Chen Enterprises LLC',
    signerCount: 3,
    signerIds: [SIGNER_ID_4, SIGNER_ID_5, SIGNER_ID_6],
    status: 'Active',
    openedDate: '2022-11-01',
    branchCode: 'BR-001',
    createdAt: '2022-11-01T09:00:00.000Z',
    updatedAt: '2024-12-01T10:00:00.000Z',
  },
  {
    id: ACCOUNT_ID_4,
    accountNumber: FULL_ACCOUNT_4,
    accountNumberMasked: maskAccountNumber(FULL_ACCOUNT_4),
    accountType: ACCOUNT_TYPES.MONEY_MARKET,
    accountName: 'Davis Investment Account',
    signerCount: 1,
    signerIds: [SIGNER_ID_7],
    status: 'Active',
    openedDate: '2024-01-10',
    branchCode: 'BR-003',
    createdAt: '2024-01-10T08:00:00.000Z',
    updatedAt: '2024-09-05T16:00:00.000Z',
  },
  {
    id: ACCOUNT_ID_5,
    accountNumber: FULL_ACCOUNT_5,
    accountNumberMasked: maskAccountNumber(FULL_ACCOUNT_5),
    accountType: ACCOUNT_TYPES.TRUST,
    accountName: 'Evans Family Trust',
    signerCount: 1,
    signerIds: [SIGNER_ID_8],
    status: 'Pending',
    openedDate: '2024-11-28',
    branchCode: 'BR-002',
    createdAt: '2024-11-28T13:00:00.000Z',
    updatedAt: '2024-11-28T13:00:00.000Z',
  },
];

// ========================================
// Mock Signers
// ========================================

/**
 * Sample signers with names, roles, statuses, contact info, and locked/pending states.
 * @type {Array<Object>}
 */
export const MOCK_SIGNERS = [
  {
    id: SIGNER_ID_1,
    accountId: ACCOUNT_ID_1,
    firstName: 'Alice',
    lastName: 'Anderson',
    middleName: 'Marie',
    title: 'Primary Account Holder',
    role: 'Owner',
    status: SIGNER_STATUSES.ACTIVE,
    email: 'alice.anderson@email.com',
    phone: '(555) 123-4567',
    ssn: '***-**-1234',
    dateOfBirth: '1985-03-15',
    address: {
      street: '123 Main Street',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
    },
    verificationMethod: VERIFICATION_METHODS.ID_VERIFICATION,
    verificationStatus: 'Verified',
    isLocked: false,
    signatureOnFile: true,
    addedDate: '2023-06-15T10:00:00.000Z',
    createdAt: '2023-06-15T10:00:00.000Z',
    updatedAt: '2024-11-20T09:00:00.000Z',
  },
  {
    id: SIGNER_ID_2,
    accountId: ACCOUNT_ID_1,
    firstName: 'Robert',
    lastName: 'Anderson',
    middleName: 'James',
    title: 'Joint Account Holder',
    role: 'Co-Owner',
    status: SIGNER_STATUSES.ACTIVE,
    email: 'robert.anderson@email.com',
    phone: '(555) 123-4568',
    ssn: '***-**-5678',
    dateOfBirth: '1983-07-22',
    address: {
      street: '123 Main Street',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
    },
    verificationMethod: VERIFICATION_METHODS.IN_PERSON,
    verificationStatus: 'Verified',
    isLocked: false,
    signatureOnFile: true,
    addedDate: '2023-06-15T10:30:00.000Z',
    createdAt: '2023-06-15T10:30:00.000Z',
    updatedAt: '2024-08-10T11:00:00.000Z',
  },
  {
    id: SIGNER_ID_3,
    accountId: ACCOUNT_ID_2,
    firstName: 'Bob',
    lastName: 'Baker',
    middleName: '',
    title: 'Account Holder',
    role: 'Owner',
    status: SIGNER_STATUSES.ACTIVE,
    email: 'bob.baker@email.com',
    phone: '(555) 234-5678',
    ssn: '***-**-9012',
    dateOfBirth: '1990-11-08',
    address: {
      street: '456 Oak Avenue',
      city: 'Riverside',
      state: 'CA',
      zip: '92501',
    },
    verificationMethod: VERIFICATION_METHODS.DIGITAL_SIGNATURE,
    verificationStatus: 'Verified',
    isLocked: false,
    signatureOnFile: true,
    addedDate: '2023-08-22T11:00:00.000Z',
    createdAt: '2023-08-22T11:00:00.000Z',
    updatedAt: '2024-10-15T14:00:00.000Z',
  },
  {
    id: SIGNER_ID_4,
    accountId: ACCOUNT_ID_3,
    firstName: 'Carol',
    lastName: 'Chen',
    middleName: 'Li',
    title: 'CEO',
    role: 'Authorized Signer',
    status: SIGNER_STATUSES.ACTIVE,
    email: 'carol.chen@chenenterprises.com',
    phone: '(555) 345-6789',
    ssn: '***-**-3456',
    dateOfBirth: '1978-05-20',
    address: {
      street: '789 Business Blvd',
      city: 'Chicago',
      state: 'IL',
      zip: '60601',
    },
    verificationMethod: VERIFICATION_METHODS.ID_VERIFICATION,
    verificationStatus: 'Verified',
    isLocked: false,
    signatureOnFile: true,
    addedDate: '2022-11-01T09:00:00.000Z',
    createdAt: '2022-11-01T09:00:00.000Z',
    updatedAt: '2024-12-01T10:00:00.000Z',
  },
  {
    id: SIGNER_ID_5,
    accountId: ACCOUNT_ID_3,
    firstName: 'Frank',
    lastName: 'Foster',
    middleName: 'William',
    title: 'CFO',
    role: 'Authorized Signer',
    status: SIGNER_STATUSES.PENDING,
    email: 'frank.foster@chenenterprises.com',
    phone: '(555) 345-6790',
    ssn: '***-**-7890',
    dateOfBirth: '1982-09-14',
    address: {
      street: '321 Finance Way',
      city: 'Chicago',
      state: 'IL',
      zip: '60602',
    },
    verificationMethod: VERIFICATION_METHODS.KNOWLEDGE_BASED,
    verificationStatus: 'Pending',
    isLocked: false,
    signatureOnFile: false,
    addedDate: '2024-11-15T14:00:00.000Z',
    createdAt: '2024-11-15T14:00:00.000Z',
    updatedAt: '2024-11-15T14:00:00.000Z',
  },
  {
    id: SIGNER_ID_6,
    accountId: ACCOUNT_ID_3,
    firstName: 'Grace',
    lastName: 'Garcia',
    middleName: '',
    title: 'Operations Manager',
    role: 'Authorized Signer',
    status: SIGNER_STATUSES.REVOKED,
    email: 'grace.garcia@chenenterprises.com',
    phone: '(555) 345-6791',
    ssn: '***-**-2345',
    dateOfBirth: '1988-12-03',
    address: {
      street: '555 Commerce Drive',
      city: 'Chicago',
      state: 'IL',
      zip: '60603',
    },
    verificationMethod: VERIFICATION_METHODS.IN_PERSON,
    verificationStatus: 'Revoked',
    isLocked: true,
    signatureOnFile: false,
    addedDate: '2023-02-10T10:00:00.000Z',
    createdAt: '2023-02-10T10:00:00.000Z',
    updatedAt: '2024-09-20T08:00:00.000Z',
  },
  {
    id: SIGNER_ID_7,
    accountId: ACCOUNT_ID_4,
    firstName: 'David',
    lastName: 'Davis',
    middleName: 'Michael',
    title: 'Account Holder',
    role: 'Owner',
    status: SIGNER_STATUSES.ACTIVE,
    email: 'david.davis@email.com',
    phone: '(555) 456-7890',
    ssn: '***-**-6789',
    dateOfBirth: '1975-01-30',
    address: {
      street: '900 Investment Lane',
      city: 'New York',
      state: 'NY',
      zip: '10001',
    },
    verificationMethod: VERIFICATION_METHODS.DIGITAL_SIGNATURE,
    verificationStatus: 'Verified',
    isLocked: false,
    signatureOnFile: true,
    addedDate: '2024-01-10T08:00:00.000Z',
    createdAt: '2024-01-10T08:00:00.000Z',
    updatedAt: '2024-09-05T16:00:00.000Z',
  },
  {
    id: SIGNER_ID_8,
    accountId: ACCOUNT_ID_5,
    firstName: 'Eve',
    lastName: 'Evans',
    middleName: 'Rose',
    title: 'Trustee',
    role: 'Trustee',
    status: SIGNER_STATUSES.PENDING,
    email: 'eve.evans@email.com',
    phone: '(555) 567-8901',
    ssn: '***-**-0123',
    dateOfBirth: '1992-06-18',
    address: {
      street: '222 Trust Circle',
      city: 'Boston',
      state: 'MA',
      zip: '02101',
    },
    verificationMethod: VERIFICATION_METHODS.KNOWLEDGE_BASED,
    verificationStatus: 'Pending',
    isLocked: false,
    signatureOnFile: false,
    addedDate: '2024-11-28T13:00:00.000Z',
    createdAt: '2024-11-28T13:00:00.000Z',
    updatedAt: '2024-11-28T13:00:00.000Z',
  },
];

// ========================================
// Mock eSign Tokens
// ========================================

/**
 * Sample eSign tokens including valid, expired, and invalid states.
 * @type {Array<Object>}
 */
export const MOCK_ESIGN_TOKENS = [
  {
    id: 'tkn-3001',
    token: 'esign-valid-token-abc123',
    userId: USER_ID_1,
    signerId: SIGNER_ID_1,
    accountId: ACCOUNT_ID_1,
    status: 'valid',
    issuedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    usedAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'tkn-3002',
    token: 'esign-valid-token-def456',
    userId: USER_ID_2,
    signerId: SIGNER_ID_3,
    accountId: ACCOUNT_ID_2,
    status: 'valid',
    issuedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
    usedAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 'tkn-3003',
    token: 'esign-expired-token-ghi789',
    userId: USER_ID_3,
    signerId: SIGNER_ID_4,
    accountId: ACCOUNT_ID_3,
    status: 'expired',
    issuedAt: '2024-10-01T08:00:00.000Z',
    expiresAt: '2024-10-02T08:00:00.000Z',
    usedAt: null,
    createdAt: '2024-10-01T08:00:00.000Z',
  },
  {
    id: 'tkn-3004',
    token: 'esign-used-token-jkl012',
    userId: USER_ID_1,
    signerId: SIGNER_ID_2,
    accountId: ACCOUNT_ID_1,
    status: 'used',
    issuedAt: '2024-11-15T10:00:00.000Z',
    expiresAt: '2024-11-16T10:00:00.000Z',
    usedAt: '2024-11-15T11:30:00.000Z',
    createdAt: '2024-11-15T10:00:00.000Z',
  },
  {
    id: 'tkn-3005',
    token: 'esign-invalid-token-mno345',
    userId: USER_ID_5,
    signerId: SIGNER_ID_6,
    accountId: ACCOUNT_ID_3,
    status: 'invalid',
    issuedAt: '2024-09-20T08:00:00.000Z',
    expiresAt: '2024-09-21T08:00:00.000Z',
    usedAt: null,
    createdAt: '2024-09-20T08:00:00.000Z',
  },
];

// ========================================
// Mock KBA Questions and Answers
// ========================================

/**
 * Knowledge-Based Authentication questions and expected answers.
 * Each set is keyed by signer ID.
 * @type {Object<string, Array<Object>>}
 */
export const MOCK_KBA_QUESTIONS = {
  [SIGNER_ID_5]: [
    {
      id: 'kba-q001',
      question: 'What is the name of the street you grew up on?',
      answer: 'Maple Street',
      options: ['Maple Street', 'Oak Avenue', 'Pine Road', 'Elm Drive'],
    },
    {
      id: 'kba-q002',
      question: 'What was the make of your first car?',
      answer: 'Honda',
      options: ['Toyota', 'Honda', 'Ford', 'Chevrolet'],
    },
    {
      id: 'kba-q003',
      question: 'In which city were you born?',
      answer: 'Chicago',
      options: ['New York', 'Los Angeles', 'Chicago', 'Houston'],
    },
  ],
  [SIGNER_ID_8]: [
    {
      id: 'kba-q004',
      question: 'What is the name of your first pet?',
      answer: 'Buddy',
      options: ['Max', 'Buddy', 'Charlie', 'Rocky'],
    },
    {
      id: 'kba-q005',
      question: 'What high school did you attend?',
      answer: 'Lincoln High',
      options: ['Lincoln High', 'Washington High', 'Jefferson High', 'Roosevelt High'],
    },
    {
      id: 'kba-q006',
      question: 'What is your mother\'s maiden name?',
      answer: 'Thompson',
      options: ['Johnson', 'Thompson', 'Williams', 'Brown'],
    },
  ],
};

/**
 * Default KBA question set used when no signer-specific questions are available.
 * @type {Array<Object>}
 */
export const MOCK_KBA_DEFAULT_QUESTIONS = [
  {
    id: 'kba-default-001',
    question: 'What is the name of the city where you were born?',
    answer: 'Springfield',
    options: ['Springfield', 'Shelbyville', 'Capital City', 'Ogdenville'],
  },
  {
    id: 'kba-default-002',
    question: 'What was the name of your elementary school?',
    answer: 'Washington Elementary',
    options: ['Lincoln Elementary', 'Washington Elementary', 'Jefferson Elementary', 'Adams Elementary'],
  },
  {
    id: 'kba-default-003',
    question: 'What is the middle name of your oldest sibling?',
    answer: 'Marie',
    options: ['Ann', 'Marie', 'Lynn', 'Rose'],
  },
];

// ========================================
// Mock OTP Codes
// ========================================

/**
 * Sample OTP codes for verification flows.
 * Each entry is keyed by user ID or signer ID.
 * @type {Object<string, Object>}
 */
export const MOCK_OTP_CODES = {
  [USER_ID_1]: {
    code: '123456',
    expiresAt: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
    attempts: 0,
    maxAttempts: 3,
    isUsed: false,
    createdAt: new Date().toISOString(),
  },
  [USER_ID_2]: {
    code: '234567',
    expiresAt: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
    attempts: 0,
    maxAttempts: 3,
    isUsed: false,
    createdAt: new Date().toISOString(),
  },
  [USER_ID_3]: {
    code: '345678',
    expiresAt: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
    attempts: 1,
    maxAttempts: 3,
    isUsed: false,
    createdAt: new Date().toISOString(),
  },
  [USER_ID_5]: {
    code: '567890',
    expiresAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    attempts: 3,
    maxAttempts: 3,
    isUsed: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  [SIGNER_ID_5]: {
    code: '654321',
    expiresAt: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
    attempts: 0,
    maxAttempts: 3,
    isUsed: false,
    createdAt: new Date().toISOString(),
  },
  [SIGNER_ID_8]: {
    code: '789012',
    expiresAt: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
    attempts: 0,
    maxAttempts: 3,
    isUsed: false,
    createdAt: new Date().toISOString(),
  },
};

// ========================================
// Mock Signature Cards
// ========================================

/**
 * Sample signature cards combining accounts and signers.
 * @type {Array<Object>}
 */
export const MOCK_SIGNATURE_CARDS = [
  {
    id: 'card-4001',
    accountId: ACCOUNT_ID_1,
    accountNumber: maskAccountNumber(FULL_ACCOUNT_1),
    accountType: ACCOUNT_TYPES.CHECKING,
    accountName: 'Anderson Family Checking',
    signers: [SIGNER_ID_1, SIGNER_ID_2],
    status: 'Active',
    submittedBy: USER_ID_1,
    submittedAt: '2023-06-15T10:30:00.000Z',
    approvedBy: USER_ID_2,
    approvedAt: '2023-06-15T14:00:00.000Z',
    createdAt: '2023-06-15T10:00:00.000Z',
    updatedAt: '2024-11-20T09:00:00.000Z',
  },
  {
    id: 'card-4002',
    accountId: ACCOUNT_ID_2,
    accountNumber: maskAccountNumber(FULL_ACCOUNT_2),
    accountType: ACCOUNT_TYPES.SAVINGS,
    accountName: 'Baker Savings Account',
    signers: [SIGNER_ID_3],
    status: 'Active',
    submittedBy: USER_ID_3,
    submittedAt: '2023-08-22T11:30:00.000Z',
    approvedBy: USER_ID_2,
    approvedAt: '2023-08-22T15:00:00.000Z',
    createdAt: '2023-08-22T11:00:00.000Z',
    updatedAt: '2024-10-15T14:00:00.000Z',
  },
  {
    id: 'card-4003',
    accountId: ACCOUNT_ID_3,
    accountNumber: maskAccountNumber(FULL_ACCOUNT_3),
    accountType: ACCOUNT_TYPES.BUSINESS_CHECKING,
    accountName: 'Chen Enterprises LLC',
    signers: [SIGNER_ID_4, SIGNER_ID_5, SIGNER_ID_6],
    status: 'Pending',
    submittedBy: USER_ID_3,
    submittedAt: '2024-11-15T14:30:00.000Z',
    approvedBy: null,
    approvedAt: null,
    createdAt: '2022-11-01T09:00:00.000Z',
    updatedAt: '2024-12-01T10:00:00.000Z',
  },
  {
    id: 'card-4004',
    accountId: ACCOUNT_ID_4,
    accountNumber: maskAccountNumber(FULL_ACCOUNT_4),
    accountType: ACCOUNT_TYPES.MONEY_MARKET,
    accountName: 'Davis Investment Account',
    signers: [SIGNER_ID_7],
    status: 'Active',
    submittedBy: USER_ID_1,
    submittedAt: '2024-01-10T08:30:00.000Z',
    approvedBy: USER_ID_2,
    approvedAt: '2024-01-10T12:00:00.000Z',
    createdAt: '2024-01-10T08:00:00.000Z',
    updatedAt: '2024-09-05T16:00:00.000Z',
  },
  {
    id: 'card-4005',
    accountId: ACCOUNT_ID_5,
    accountNumber: maskAccountNumber(FULL_ACCOUNT_5),
    accountType: ACCOUNT_TYPES.TRUST,
    accountName: 'Evans Family Trust',
    signers: [SIGNER_ID_8],
    status: 'Draft',
    submittedBy: null,
    submittedAt: null,
    approvedBy: null,
    approvedAt: null,
    createdAt: '2024-11-28T13:00:00.000Z',
    updatedAt: '2024-11-28T13:00:00.000Z',
  },
];

// ========================================
// Mock Audit Log Entries
// ========================================

/**
 * Sample audit log entries for tracking user actions.
 * @type {Array<Object>}
 */
export const MOCK_AUDIT_LOG = [
  {
    id: 'audit-5001',
    userId: USER_ID_1,
    action: 'LOGIN',
    description: 'User logged in successfully.',
    timestamp: '2024-12-01T09:15:00.000Z',
    ipAddress: '192.168.1.100',
    metadata: { userAgent: 'Mozilla/5.0' },
  },
  {
    id: 'audit-5002',
    userId: USER_ID_1,
    action: 'CARD_CREATED',
    description: 'Signature card card-4001 created for account ******7890.',
    timestamp: '2023-06-15T10:00:00.000Z',
    ipAddress: '192.168.1.100',
    metadata: { cardId: 'card-4001', accountId: ACCOUNT_ID_1 },
  },
  {
    id: 'audit-5003',
    userId: USER_ID_3,
    action: 'SIGNER_ADDED',
    description: 'Signer Frank Foster added to account ******9012.',
    timestamp: '2024-11-15T14:00:00.000Z',
    ipAddress: '192.168.1.105',
    metadata: { signerId: SIGNER_ID_5, accountId: ACCOUNT_ID_3 },
  },
  {
    id: 'audit-5004',
    userId: USER_ID_2,
    action: 'CARD_APPROVED',
    description: 'Signature card card-4002 approved.',
    timestamp: '2023-08-22T15:00:00.000Z',
    ipAddress: '192.168.1.102',
    metadata: { cardId: 'card-4002' },
  },
  {
    id: 'audit-5005',
    userId: USER_ID_5,
    action: 'LOGIN_FAILED',
    description: 'Failed login attempt. Account locked after 5 failed attempts.',
    timestamp: '2024-11-25T08:30:00.000Z',
    ipAddress: '192.168.1.110',
    metadata: { failedAttempts: 5 },
  },
];

// ========================================
// Helper / Lookup Utilities
// ========================================

/**
 * Retrieves a mock user by username.
 * @param {string} username - The username to look up.
 * @returns {Object|undefined} The matching user object or undefined.
 */
export const getMockUserByUsername = (username) => {
  return MOCK_USERS.find((user) => user.username === username);
};

/**
 * Retrieves a mock user by ID.
 * @param {string} userId - The user ID to look up.
 * @returns {Object|undefined} The matching user object or undefined.
 */
export const getMockUserById = (userId) => {
  return MOCK_USERS.find((user) => user.id === userId);
};

/**
 * Retrieves a mock account by ID.
 * @param {string} accountId - The account ID to look up.
 * @returns {Object|undefined} The matching account object or undefined.
 */
export const getMockAccountById = (accountId) => {
  return MOCK_ACCOUNTS.find((account) => account.id === accountId);
};

/**
 * Retrieves all mock signers for a given account ID.
 * @param {string} accountId - The account ID to look up signers for.
 * @returns {Array<Object>} An array of signer objects for the account.
 */
export const getMockSignersByAccountId = (accountId) => {
  return MOCK_SIGNERS.filter((signer) => signer.accountId === accountId);
};

/**
 * Retrieves a mock signer by ID.
 * @param {string} signerId - The signer ID to look up.
 * @returns {Object|undefined} The matching signer object or undefined.
 */
export const getMockSignerById = (signerId) => {
  return MOCK_SIGNERS.find((signer) => signer.id === signerId);
};

/**
 * Retrieves a mock eSign token by token string.
 * @param {string} token - The token string to look up.
 * @returns {Object|undefined} The matching token object or undefined.
 */
export const getMockESignToken = (token) => {
  return MOCK_ESIGN_TOKENS.find((t) => t.token === token);
};

/**
 * Retrieves KBA questions for a given signer ID, falling back to defaults.
 * @param {string} signerId - The signer ID to look up questions for.
 * @returns {Array<Object>} An array of KBA question objects.
 */
export const getMockKBAQuestions = (signerId) => {
  return MOCK_KBA_QUESTIONS[signerId] || MOCK_KBA_DEFAULT_QUESTIONS;
};

/**
 * Retrieves the OTP code entry for a given entity ID (user or signer).
 * @param {string} entityId - The user ID or signer ID to look up.
 * @returns {Object|undefined} The OTP code object or undefined.
 */
export const getMockOTPCode = (entityId) => {
  return MOCK_OTP_CODES[entityId];
};

/**
 * Validates a mock password against a user's stored hash.
 * @param {string} password - The plain text password to validate.
 * @param {string} storedHash - The stored password hash.
 * @returns {boolean} True if the password matches the hash.
 */
export const validateMockPassword = (password, storedHash) => {
  return hashPassword(password) === storedHash;
};

/**
 * Retrieves a mock signature card by ID.
 * @param {string} cardId - The card ID to look up.
 * @returns {Object|undefined} The matching signature card object or undefined.
 */
export const getMockSignatureCardById = (cardId) => {
  return MOCK_SIGNATURE_CARDS.find((card) => card.id === cardId);
};

/**
 * Retrieves all mock signature cards for a given account ID.
 * @param {string} accountId - The account ID to look up cards for.
 * @returns {Array<Object>} An array of signature card objects.
 */
export const getMockSignatureCardsByAccountId = (accountId) => {
  return MOCK_SIGNATURE_CARDS.filter((card) => card.accountId === accountId);
};