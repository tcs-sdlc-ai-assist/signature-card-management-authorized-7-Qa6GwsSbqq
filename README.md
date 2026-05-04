# SIG Card Management

A secure, modern signature card management platform for banking institutions. Built with React 18 and Vite, this application streamlines the process of creating, managing, and verifying signature cards for all account types.

## Tech Stack

- **Framework:** React 18
- **Build Tool:** Vite 5
- **Routing:** React Router DOM 6
- **Styling:** HB (Honeybee) CSS Framework + custom CSS
- **Testing:** Vitest + React Testing Library
- **Linting:** ESLint 8
- **Formatting:** Prettier 3
- **UUID Generation:** uuid v10

## Features

- **Multi-Step Card Creation** — Guided workflow covering account info, signer details, verification, and review/submission.
- **Account Selection** — Paginated account list with masked account numbers, account type, and signer counts.
- **Signer Management** — Add, edit, remove, unlock, and resend invitations for authorized signers with sortable/filterable tables.
- **Identity Verification** — KBA (Knowledge-Based Authentication) and OTP (One-Time Password) verification methods.
- **eSign Token Validation** — Token-based authentication via URL parameter or manual input with expiry and user association checks.
- **Session Management** — Inactivity timeout with countdown warning modal, automatic logout, and session refresh.
- **Rate Limiting** — Daily attempt limits (3/day) for unlock and resend actions with escalating contextual messaging.
- **Audit Logging** — Immutable audit trail with PII masking, action tracking, and before/after state capture.
- **Role-Based Access** — Admin, manager, teller, and read-only user roles.
- **Staged Changes** — All signer modifications are staged before final submission with reference ID generation.
- **Legal Consent** — Required consent checkbox before signature card submission.
- **Accessibility** — WCAG-compliant with ARIA attributes, focus trapping in modals, skip-to-content links, and screen reader live regions.
- **Responsive Layout** — HB CSS grid system with fluid wrapper and responsive breakpoints.

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd sig-card-mgmt
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file and adjust values as needed:

```bash
cp .env.example .env
```

See the [Environment Variables](#environment-variables) section below for details.

### 4. Start the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server on port 3000 |
| `npm run build` | Build the production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run test` | Run all tests once with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint all `.js` and `.jsx` files with ESLint |

## Environment Variables

All environment variables are prefixed with `VITE_` and accessed via `import.meta.env.VITE_*`.

| Variable | Default | Description |
|---|---|---|
| `VITE_SESSION_TIMEOUT_MS` | `1800000` | Session timeout in milliseconds (default: 30 minutes) |
| `VITE_MAX_FAILED_LOGINS` | `5` | Maximum failed login attempts before account lockout |
| `VITE_TOKEN_EXPIRY_HOURS` | `24` | eSign token expiry duration in hours |
| `VITE_RATE_LIMIT_MAX` | `100` | Maximum rate-limited attempts per day (unlock/resend actions use 3) |
| `VITE_APP_TITLE` | `SIG Card Management` | Application title displayed in the header and browser tab |

## Folder Structure

```
sig-card-mgmt/
├── index.html                    # HTML entry point
├── package.json                  # Dependencies and scripts
├── vite.config.js                # Vite configuration
├── vitest.config.js              # Vitest test configuration
├── vitest.setup.js               # Test setup (jest-dom, localStorage mock)
├── vercel.json                   # Vercel SPA rewrite rules
├── .env.example                  # Environment variable template
├── .eslintrc.cjs                 # ESLint configuration
├── .prettierrc                   # Prettier configuration
├── src/
│   ├── main.jsx                  # React DOM entry point
│   ├── App.jsx                   # Root component with providers and router
│   ├── router.jsx                # Route definitions (createBrowserRouter)
│   ├── index.css                 # Global styles and utility classes
│   ├── assets/
│   │   └── hb-framework.css      # HB CSS framework stub (local implementation)
│   ├── components/
│   │   ├── auth/
│   │   │   ├── ProtectedRoute.jsx        # Route guard for auth/verification/token
│   │   │   └── SessionTimeoutModal.jsx   # Session timeout warning with countdown
│   │   ├── common/
│   │   │   ├── Alert.jsx                 # Alert/notification component
│   │   │   ├── Button.jsx                # Styled button with loading state
│   │   │   ├── ConfirmationModal.jsx     # Confirm/cancel modal for destructive actions
│   │   │   ├── ErrorBoundary.jsx         # React error boundary with retry
│   │   │   ├── FloatingLabelInput.jsx    # Floating label form input
│   │   │   ├── Modal.jsx                 # Accessible modal with focus trapping
│   │   │   ├── Pagination.jsx            # Page navigation with ellipsis
│   │   │   └── ProgressIndicator.jsx     # Step-based progress bar
│   │   ├── layout/
│   │   │   └── AppLayout.jsx             # Main layout (header, footer, progress, outlet)
│   │   └── signers/
│   │       ├── ResendInvitationModal.jsx  # Resend invitation with rate limiting
│   │       ├── SignerCard.jsx             # Individual signer display card
│   │       ├── SignerFilter.jsx           # Filter/sort controls for signer list
│   │       └── UnlockSignerModal.jsx      # Unlock signer with rate limiting
│   ├── constants/
│   │   ├── constants.js           # App-wide constants and configuration
│   │   ├── messages.js            # Centralized user-facing message strings
│   │   ├── mockData.js            # Mock data fixtures (users, accounts, signers, tokens)
│   │   └── welcomeContent.json    # Welcome screen CMS content
│   ├── context/
│   │   ├── AppContext.jsx         # Workflow state, step navigation, exit confirmation
│   │   ├── AuthContext.jsx        # Authentication state and actions
│   │   └── SignerContext.jsx      # Signer CRUD and staged change management
│   ├── pages/
│   │   ├── AccountSelectionScreen.jsx    # Paginated account selection
│   │   ├── AddSignerScreen.jsx           # Add authorized signer form
│   │   ├── ConfirmSignersScreen.jsx      # Staged changes confirmation
│   │   ├── EditSignerScreen.jsx          # Edit signer form with change tracking
│   │   ├── LoginScreen.jsx               # Login with lockout enforcement
│   │   ├── ReviewSignersScreen.jsx       # Final review with legal consent
│   │   ├── SignerListScreen.jsx          # Sortable/filterable signer table
│   │   ├── SignUpScreen.jsx              # User registration
│   │   ├── SubmissionScreen.jsx          # Submission receipt with reference ID
│   │   ├── TokenValidationScreen.jsx     # eSign token validation
│   │   ├── VerificationScreen.jsx        # KBA and OTP identity verification
│   │   └── WelcomeScreen.jsx             # Welcome/landing page
│   ├── services/
│   │   ├── AccountService.js      # Account data access (CRUD, pagination)
│   │   ├── AuditLogger.js         # Audit logging with PII masking
│   │   ├── AuthService.js         # Authentication (login, signup, lockout)
│   │   ├── ContentService.js      # Welcome content management
│   │   ├── RateLimiter.js         # Daily rate limiting with midnight reset
│   │   ├── ResendService.js       # Invitation resend with rate limiting
│   │   ├── SessionManager.js      # Session lifecycle management
│   │   ├── SignerService.js       # Signer CRUD and staged changes
│   │   ├── TokenService.js        # eSign token validation and management
│   │   ├── UnlockService.js       # Signer unlock with rate limiting
│   │   └── VerificationService.js # KBA and OTP verification
│   └── utils/
│       ├── helpers.js             # UUID, formatting, sanitization, deep clone
│       ├── storage.js             # localStorage wrapper with key resolution
│       └── validators.js          # Form validation (required, email, phone, etc.)
└── dist/                          # Production build output (gitignored)
```

## HB CSS Framework Usage

This project uses a local implementation of the HB (Honeybee) CSS Framework located at `src/assets/hb-framework.css`. The CDN version is also loaded in `index.html` for additional coverage.

### Key CSS Classes

| Category | Classes |
|---|---|
| **Layout** | `.fluid-wrapper`, `.hb-row`, `.hb-col-*`, `.hb-col-sm-*`, `.hb-col-md-*`, `.hb-col-lg-*` |
| **Buttons** | `.button-primary`, `.button-secondary-2` |
| **Alerts** | `.hb-alert-critical`, `.hb-alert-warning`, `.hb-alert-success` |
| **Forms** | `.hb-form-group`, `.hb-form-control`, `.hb-floating-label`, `.invaliderr` |
| **Cards** | `.hb-card`, `.hb-card-header`, `.hb-card-body`, `.hb-card-footer` |
| **Modals** | `.hb-modal`, `.hb-modal-dialog-centered`, `.hb-modal-content`, `.hb-modal-header`, `.hb-modal-body`, `.hb-modal-footer` |
| **Tables** | `.hb-table`, `.hb-table-striped` |
| **Badges** | `.hb-badge`, `.hb-badge-primary`, `.hb-badge-success`, `.hb-badge-danger`, `.hb-badge-warning` |
| **Spinners** | `.hb-spinner`, `.hb-spinner-sm`, `.hb-spinner-lg` |
| **Utilities** | `.hb-d-flex`, `.hb-justify-content-*`, `.hb-align-items-*`, `.hb-gap-*`, `.hb-mt-*`, `.hb-mb-*`, `.hb-text-*`, `.hb-sr-only` |

### Primary Brand Color

The primary brand color is `#00468b`, defined as `--hb-primary` in the CSS custom properties.

## Demo Credentials

The application ships with mock data for development and demonstration purposes.

| Username | Password | Role | Status |
|---|---|---|---|
| `admin` | `Admin@1234` | Admin | Active |
| `manager` | `Manager@1234` | Manager | Active |
| `teller` | `Teller@1234` | Teller | Active |
| `readonly` | `ReadOnly@1234` | Read-Only | Active |
| `locked_user` | `Locked@1234` | Teller | Locked |

## Testing

Tests are written with Vitest and React Testing Library. The test environment uses jsdom with a localStorage mock.

```bash
# Run all tests once
npm run test

# Run tests in watch mode
npm run test:watch
```

### Test Setup

- `vitest.config.js` — Vitest configuration with jsdom environment and React plugin.
- `vitest.setup.js` — Global setup importing `@testing-library/jest-dom` and providing a localStorage mock.
- `src/setupTests.js` — Referenced by vitest config for additional setup if needed.

### Test Coverage

Tests cover:
- **Services:** AuthService, TokenService, VerificationService, RateLimiter, AuditLogger
- **Utilities:** helpers, validators
- **Pages:** WelcomeScreen, LoginScreen, SignerListScreen

## Building for Production

```bash
npm run build
```

The production bundle is output to the `dist/` directory with source maps enabled.

## Deployment

### Vercel

The project includes a `vercel.json` with SPA rewrite rules. Deploy directly from the repository:

1. Connect your repository to Vercel.
2. Set the build command to `npm run build`.
3. Set the output directory to `dist`.
4. Add environment variables in the Vercel dashboard.

### Other Platforms

For any static hosting platform (Netlify, AWS S3 + CloudFront, GitHub Pages, etc.):

1. Run `npm run build` to generate the `dist/` directory.
2. Configure the hosting to serve `index.html` for all routes (SPA fallback).
3. Set environment variables at build time with the `VITE_` prefix.

### Preview Production Build Locally

```bash
npm run build
npm run preview
```

## Architecture Notes

- **All data is persisted in localStorage.** There is no backend server. Services simulate API behavior with mock data for demonstration purposes.
- **Passwords are hashed with a simple non-cryptographic hash.** This is for demo/development only and is NOT suitable for production use.
- **Session management** uses localStorage-based session objects with configurable timeout and activity tracking.
- **Staged changes pattern** — All signer modifications (add, edit, remove) are staged in localStorage before being finalized via a submit action, generating a reference ID.
- **Context composition** — `AppProvider` composes `AuthProvider`, `SignerProvider`, and `AppContextProvider` into a single wrapper used in `App.jsx`.
- **Router ownership** — The router is defined in `src/router.jsx` using `createBrowserRouter` and rendered via `RouterProvider` in `App.jsx`. `main.jsx` only renders `<App />` inside `<React.StrictMode>`.

## License

Private