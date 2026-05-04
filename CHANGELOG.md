# Changelog

All notable changes to the SIG Card Management project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-15

### Added

#### Welcome & Onboarding
- Welcome screen with admin-editable content loaded via ContentService.
- CMS-driven title, subtitle, body paragraphs, feature highlights, and CTA buttons from `welcomeContent.json`.
- "Get Started" and "Learn More" call-to-action buttons with smooth scroll to feature highlights.
- Responsive layout using HB CSS grid (`.fluid-wrapper`, `.hb-row`, `.hb-col-*`).

#### Authentication
- Login screen with floating label inputs for username and password.
- Generic error messages that do not reveal which field (username or password) is incorrect.
- Failed login attempt tracking with configurable lockout threshold (`VITE_MAX_FAILED_LOGINS`).
- Account lockout enforcement after exceeding maximum failed attempts.
- Sign-up screen with username, password, and confirm password fields.
- Password match validation and minimum length enforcement (8 characters).
- Automatic session creation on successful login or sign-up.
- Logout with session cleanup and audit logging.
- Role-based user accounts: admin, manager, teller, and read-only roles.
- Demo credentials for development and testing (admin, manager, teller, readonly, locked_user).

#### Identity Verification
- Post-login identity verification screen with KBA and OTP methods.
- Knowledge-Based Authentication (KBA) with multiple-choice security questions.
- One-Time Password (OTP) verification with 6-digit code input.
- Tab-based method switching between Security Questions and Verification Code.
- Attempt tracking with lockout after maximum failed verification attempts.
- OTP resend functionality with resend attempt limits.
- Case-insensitive KBA answer comparison.

#### eSign Token Validation
- Token validation screen accepting tokens from URL query parameter (`?token=...`) or manual input.
- Auto-validation when token is provided via URL parameter.
- Token validity checks: existence, expiration, usage status, and user association.
- Token status management: valid, used, expired, invalid, and confirmed states.
- Configurable token expiry duration (`VITE_TOKEN_EXPIRY_HOURS`).

#### Account Selection
- Paginated account list with configurable page size (6 accounts per page).
- Account cards displaying masked account number (last 4 digits), account type, and signer count.
- Auto-selection when only one account is available.
- Account status badges (Active, Pending).
- Pagination component with previous/next buttons, page numbers, and ellipsis truncation.

#### Signer Management
- Consolidated signer list screen with sortable table (name, role/title, status columns).
- Filterable signer list by status (All, Active, Pending, Inactive, Revoked).
- Keyboard-accessible sortable column headers with `aria-sort` attributes.
- Individual signer cards with status badges, contact information, and action buttons.
- Add authorized signer form with required fields: First Name, Last Name, Title/Role, Email, Phone.
- Optional signer fields: Middle Name, Suffix, Additional Contact.
- Inline real-time field validation with floating label inputs.
- Support for adding multiple signers before submission with pending signers summary table.
- Edit signer form pre-populated with current signer data and change tracking (before/after).
- Unsaved changes detection with discard confirmation modal.
- Remove signer with confirmation modal and minimum signer enforcement.

#### Self-Service Unlock & Resend
- Unlock signer modal with daily rate limiting (3 attempts per day).
- Resend invitation modal with daily rate limiting (3 attempts per day).
- Escalating contextual messaging based on attempt number from messaging matrix.
- "Contact Support" messaging after daily limit is reached.
- Rate limit counters with automatic midnight reset.
- New invitation token generation with previous token invalidation on resend.

#### Confirmation & Review Workflow
- Confirm signers screen displaying categorized staged changes: added (green), edited (yellow), removed (red).
- Change type badges and border indicators for visual differentiation.
- Review & submit screen with complete authorized signer list showing unchanged, modified, new, and removed signers.
- Account details card with account name, number, type, and status.
- Controlling party information (submitted by) display.
- Legal consent checkbox required before submission.
- Consent validation preventing submission without agreement.

#### Submission
- Submission confirmation and receipt screen with generated reference ID.
- Submission timestamp and submitted-by information display.
- Changes summary with categorized badges (added, modified, removed).
- Mock confirmation notification with audit logging.
- Next steps guidance with reference ID tracking information.
- Duplicate submission prevention (submit button disabled after first click).
- Error state with retry functionality.
- "Return to Welcome" and "Done" navigation options.

#### Session Management
- Configurable session timeout (`VITE_SESSION_TIMEOUT_MS`, default 30 minutes).
- Session timeout warning modal with countdown timer appearing 2 minutes before expiry.
- "Continue Session" button to reset activity timer.
- "Log Out" button for manual session termination from warning modal.
- Automatic logout when timer reaches zero.
- User activity tracking (mousedown, keydown, scroll, touchstart) for session refresh.
- Session persistence in localStorage with activity timestamps.

#### Audit Logging
- Immutable audit trail with unique event IDs and ISO timestamps.
- PII masking for sensitive fields: password, SSN, email, phone, address, token, account number.
- Action tracking for all user operations: login, logout, verification, token validation, account selection, signer CRUD, submission.
- Before/after state capture for change tracking.
- Maximum log entry retention (1000 entries) with oldest entry purging.
- Filterable logs by action type and user ID.

#### Progress Navigation
- Step-based progress indicator with 4 steps: Account Info, Signer Details, Verification, Review & Submit.
- Completed, active, and disabled step states with visual indicators.
- Backward navigation to completed steps via clickable step circles.
- Forward navigation prevention to unreached steps.
- Screen reader live region announcing current step.

#### Error Handling
- React error boundary with fallback UI, error message display, and retry button.
- Error boundary audit logging for render errors.
- Alert component supporting error, warning, success, and info types with optional dismiss.
- Confirmation modal for destructive actions (remove signer, exit workflow, discard changes).
- Form-level and field-level validation error display with `.invaliderr` styling.

#### Layout & Navigation
- Application layout with sticky header, progress indicator, main content area, and footer.
- Skip-to-content link for keyboard accessibility.
- User display name and role in header.
- Cancel/Exit button bar with unsaved changes warning.
- Protected route guard checking authentication, verification, and token validation status.
- Loading spinner display during authentication checks.

#### Accessibility
- WCAG-compliant ARIA attributes throughout all components.
- Focus trapping in modal dialogs with Escape key close.
- Screen reader live regions (`aria-live="polite"` and `aria-live="assertive"`).
- `aria-sort` attributes on sortable table column headers.
- `aria-invalid` and `aria-describedby` on form inputs with validation errors.
- `aria-current="page"` on active pagination buttons.
- `aria-current="step"` on active progress indicator step.
- `.hb-sr-only` utility class for screen reader-only content.
- Keyboard-navigable interactive elements with `tabIndex` and `onKeyDown` handlers.
- Reduced motion support via `prefers-reduced-motion` media query.

#### Services
- AuthService: login, sign-up, logout, session validation, failed attempt tracking, account lockout.
- AccountService: account listing, detail retrieval, signer count, pagination.
- SignerService: signer CRUD, staged change management, submit with reference ID generation, discard changes.
- TokenService: eSign token validation, status updates, token lookup by ID/user/signer.
- VerificationService: KBA verification, OTP verification, attempt tracking, lockout, OTP resend.
- SessionManager: session lifecycle, activity timer, time remaining calculation.
- RateLimiter: daily rate limiting with midnight reset, contextual messaging matrix.
- UnlockService: signer unlock with rate limiting.
- ResendService: invitation resend with rate limiting and token invalidation.
- ContentService: welcome content retrieval and admin editing.
- AuditLogger: event logging with PII masking and log management.

#### Utilities
- UUID generation via `uuid` v4.
- Timestamp formatting with `Intl.DateTimeFormat`.
- Account number masking (last 4 digits visible).
- Input sanitization (HTML entity encoding for XSS prevention).
- Debounce function with cancel support.
- Deep clone via `structuredClone` with JSON fallback.
- Expiry checking for tokens and sessions.
- localStorage wrapper with key resolution, get/set/remove/clear/has/getOrSet/updateItem.
- Form validation: required, email, phone, name, min/max length, account number, SSN, ZIP code.
- `validateForm` and `hasErrors` utilities for full-form validation.

#### Testing
- Vitest + React Testing Library test suite.
- Service tests: AuthService, TokenService, VerificationService, RateLimiter, AuditLogger.
- Utility tests: helpers (generateUUID, maskAccountNumber, sanitizeInput, debounce, deepClone, isExpired, getToday, formatTimestamp), validators.
- Page tests: WelcomeScreen, LoginScreen, SignerListScreen.
- jsdom test environment with localStorage mock.

#### Infrastructure
- Vite 5 build configuration with React plugin and source maps.
- ESLint 8 with React, React Hooks, and recommended rules.
- Prettier 3 formatting configuration.
- Vercel deployment configuration with SPA rewrite rules.
- Environment variable configuration via `.env.example`.
- HB (Honeybee) CSS Framework local implementation with CDN fallback.

[1.0.0]: https://github.com/sig-card-mgmt/sig-card-mgmt/releases/tag/v1.0.0