# Deployment Guide

This document covers deployment configuration, environment setup, CI/CD integration, and production considerations for the SIG Card Management application.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Build Configuration](#build-configuration)
- [Environment Variables](#environment-variables)
- [Vercel Deployment](#vercel-deployment)
  - [Git-Based Auto-Deploy](#git-based-auto-deploy)
  - [Manual Deployment via CLI](#manual-deployment-via-cli)
  - [SPA Rewrite Configuration](#spa-rewrite-configuration)
- [Other Hosting Platforms](#other-hosting-platforms)
  - [Netlify](#netlify)
  - [AWS S3 + CloudFront](#aws-s3--cloudfront)
  - [GitHub Pages](#github-pages)
- [CI/CD Notes](#cicd-notes)
- [Preview Production Build Locally](#preview-production-build-locally)
- [Production Considerations](#production-considerations)
- [Known Limitations for MVP](#known-limitations-for-mvp)

---

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+
- A hosting platform account (Vercel, Netlify, AWS, etc.)
- Git repository connected to your hosting provider (for auto-deploy)

---

## Build Configuration

The application uses **Vite 5** as the build tool. The production build is configured in `vite.config.js`:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

### Build Commands

| Command | Description |
|---|---|
| `npm run build` | Generates the production bundle in the `dist/` directory with source maps enabled |
| `npm run preview` | Serves the production build locally for verification |
| `npm run test` | Runs the full test suite (recommended before deploying) |
| `npm run lint` | Lints all `.js` and `.jsx` files with ESLint |

### Build Output

The `npm run build` command outputs static files to the `dist/` directory:

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── favicon.ico
```

This directory is the only artifact needed for deployment. All hosting platforms should be configured to serve files from `dist/`.

---

## Environment Variables

All environment variables are prefixed with `VITE_` and accessed at build time via `import.meta.env.VITE_*`. They are **baked into the JavaScript bundle** during the build step and cannot be changed at runtime without rebuilding.

| Variable | Default | Description |
|---|---|---|
| `VITE_SESSION_TIMEOUT_MS` | `1800000` | Session timeout in milliseconds (default: 30 minutes) |
| `VITE_MAX_FAILED_LOGINS` | `5` | Maximum failed login attempts before account lockout |
| `VITE_TOKEN_EXPIRY_HOURS` | `24` | eSign token expiry duration in hours |
| `VITE_RATE_LIMIT_MAX` | `100` | Maximum rate-limited attempts per day (unlock/resend actions use 3) |
| `VITE_APP_TITLE` | `SIG Card Management` | Application title displayed in the header and browser tab |

### Setting Environment Variables

**Local development:**

```bash
cp .env.example .env
# Edit .env with your values
```

**Vercel dashboard:**

Navigate to **Project Settings → Environment Variables** and add each variable with the `VITE_` prefix.

**CI/CD pipelines:**

Set environment variables in your CI provider's settings (GitHub Actions secrets, GitLab CI variables, etc.). They must be available at build time.

> **Important:** Because Vite embeds environment variables at build time, changing a variable requires a new build and deployment. There is no runtime configuration.

---

## Vercel Deployment

Vercel is the recommended deployment platform. The project includes a `vercel.json` configuration file for SPA routing.

### Git-Based Auto-Deploy

This is the recommended approach for continuous deployment.

1. **Connect your repository to Vercel:**
   - Log in to [vercel.com](https://vercel.com)
   - Click **"Add New Project"**
   - Import your Git repository (GitHub, GitLab, or Bitbucket)

2. **Configure build settings:**
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
   - **Node.js Version:** 18.x (or latest LTS)

3. **Add environment variables:**
   - Navigate to **Project Settings → Environment Variables**
   - Add each `VITE_*` variable for the appropriate environment (Production, Preview, Development)

4. **Deploy:**
   - Push to your default branch (e.g., `main`) to trigger a production deployment
   - Push to any other branch or open a pull request to trigger a preview deployment

5. **Auto-deploy behavior:**
   - Every push to `main` triggers a new production deployment
   - Every push to a feature branch or pull request creates a unique preview URL
   - Preview deployments are automatically cleaned up when branches are deleted

### Manual Deployment via CLI

For one-off deployments or testing:

```bash
# Install Vercel CLI globally
npm install -g vercel

# Log in to your Vercel account
vercel login

# Deploy to preview (staging)
vercel

# Deploy to production
vercel --prod
```

The CLI will prompt you for project settings on the first run. Subsequent runs use the saved configuration in `.vercel/`.

### SPA Rewrite Configuration

The `vercel.json` file configures Vercel to handle client-side routing by rewriting all requests to `index.html`:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Why this is necessary:**

The application uses React Router with `createBrowserRouter` for client-side routing. When a user navigates directly to a URL like `/accounts` or `/signers`, the server must return `index.html` so that React Router can handle the route on the client side. Without this rewrite rule, the server would return a 404 for any path other than `/`.

**How it works:**

- All incoming requests (e.g., `/login`, `/dashboard`, `/signers/add`) are rewritten to serve `index.html`
- Static assets in the `dist/assets/` directory are served directly (Vercel handles this automatically)
- React Router then reads the URL and renders the appropriate component

---

## Other Hosting Platforms

### Netlify

1. **Build settings:**
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`

2. **SPA redirect:** Create a `dist/_redirects` file (or add a `netlify.toml`):

   **`netlify.toml`:**
   ```toml
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

3. **Environment variables:** Add `VITE_*` variables in **Site Settings → Build & Deploy → Environment**.

### AWS S3 + CloudFront

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Upload `dist/` to an S3 bucket** configured for static website hosting.

3. **Configure CloudFront:**
   - Set the S3 bucket as the origin
   - Create a custom error response: for HTTP 403 and 404 errors, return `/index.html` with status 200
   - This handles SPA routing by serving `index.html` for all unmatched paths

4. **Environment variables:** Set them before running `npm run build` in your CI/CD pipeline.

### GitHub Pages

> **Note:** GitHub Pages does not natively support SPA rewrites. A `404.html` workaround is required.

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Copy `index.html` to `404.html`:**
   ```bash
   cp dist/index.html dist/404.html
   ```

3. **Deploy the `dist/` directory** to the `gh-pages` branch or configure GitHub Pages to serve from the `dist/` folder.

4. **Limitation:** This approach causes a brief 404 status code before the client-side router takes over. For production use, Vercel or Netlify is recommended.

---

## CI/CD Notes

### Recommended CI Pipeline Steps

A typical CI/CD pipeline for this project should include:

```
1. Install dependencies    →  npm ci
2. Lint                    →  npm run lint
3. Run tests               →  npm run test
4. Build                   →  npm run build
5. Deploy                  →  (platform-specific)
```

### GitHub Actions Example

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm run test

      - name: Build
        run: npm run build
        env:
          VITE_SESSION_TIMEOUT_MS: ${{ vars.VITE_SESSION_TIMEOUT_MS || '1800000' }}
          VITE_MAX_FAILED_LOGINS: ${{ vars.VITE_MAX_FAILED_LOGINS || '5' }}
          VITE_TOKEN_EXPIRY_HOURS: ${{ vars.VITE_TOKEN_EXPIRY_HOURS || '24' }}
          VITE_RATE_LIMIT_MAX: ${{ vars.VITE_RATE_LIMIT_MAX || '100' }}
          VITE_APP_TITLE: ${{ vars.VITE_APP_TITLE || 'SIG Card Management' }}
```

### Vercel Git Integration (Auto-Deploy)

When using Vercel's Git integration, no separate CI/CD pipeline is required for deployment:

- Vercel automatically runs `npm install` and `npm run build` on every push
- Environment variables are configured in the Vercel dashboard
- Preview deployments are created for pull requests
- Production deployments are triggered on pushes to the default branch

However, you should still run linting and tests in a separate CI step (e.g., GitHub Actions) to catch issues before the Vercel build.

### Branch Strategy

| Branch | Vercel Environment | Purpose |
|---|---|---|
| `main` | Production | Live production deployment |
| `develop` | Preview | Integration testing |
| Feature branches | Preview | Per-feature preview URLs |
| Pull requests | Preview | Code review with live preview |

---

## Preview Production Build Locally

Before deploying, verify the production build locally:

```bash
# Build the application
npm run build

# Serve the production build on a local server
npm run preview
```

The preview server runs at `http://localhost:4173` by default. This serves the exact same files that would be deployed to production, allowing you to verify:

- All routes work correctly with client-side routing
- Static assets (CSS, JS, fonts) load properly
- Environment variables are embedded correctly
- No console errors or broken functionality

---

## Production Considerations

### Security

- **Passwords are hashed with a simple non-cryptographic hash.** The current hash function in `mockData.js` and `AuthService.js` is for demo/development only. A production deployment MUST replace this with a proper cryptographic hash (e.g., bcrypt, argon2) on a real backend server.
- **All data is stored in localStorage.** This is inherently insecure for sensitive data. A production deployment MUST use a backend API with proper authentication, authorization, and encrypted data storage.
- **Session tokens are generated client-side.** In production, session management should be handled server-side with HTTP-only secure cookies.
- **No HTTPS enforcement in the application code.** The hosting platform (Vercel, Netlify, etc.) handles HTTPS. Ensure your hosting provider enforces HTTPS and redirects HTTP to HTTPS.
- **Content Security Policy (CSP):** Consider adding CSP headers via your hosting platform to prevent XSS attacks. The application already sanitizes user input, but CSP provides defense in depth.
- **Cache-Control headers:** The `index.html` includes `no-cache` meta tags. For production, configure your CDN/hosting to set proper `Cache-Control` headers on static assets (long cache for hashed files, no-cache for `index.html`).

### Performance

- **Source maps are enabled** in the production build (`sourcemap: true` in `vite.config.js`). For a public-facing production deployment, consider disabling source maps to reduce bundle size and prevent source code exposure:
  ```js
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
  ```
- **Code splitting:** Vite automatically code-splits the bundle. No additional configuration is needed.
- **Font loading:** Google Fonts (Roboto) is loaded via `<link>` in `index.html` with `preconnect` hints for optimal loading.
- **HB CSS Framework:** The CDN version is loaded in `index.html` as a fallback. The local implementation in `src/assets/hb-framework.css` is bundled with the application. For production, consider removing the CDN link if the local implementation is sufficient.

### Monitoring

- **Audit logs** are stored in localStorage and will be lost when the user clears browser data. For production, audit logs should be sent to a backend logging service.
- **Error tracking:** Consider integrating an error tracking service (e.g., Sentry) for production monitoring. The `ErrorBoundary` component already catches render errors and could be extended to report to an external service.

### Browser Support

The application targets modern browsers with ES2021+ support:

- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

Internet Explorer is not supported.

---

## Known Limitations for MVP

The following limitations are known and accepted for the MVP release. They should be addressed before a full production deployment.

### Data Persistence

- **All data is stored in localStorage.** There is no backend server or database. Data is lost when the user clears browser storage or switches browsers/devices.
- **No data synchronization** between browser tabs or sessions. Changes made in one tab are not reflected in another until the page is refreshed.
- **localStorage has a ~5MB limit** per origin. The audit log is capped at 1,000 entries to stay within this limit.

### Authentication & Security

- **Passwords use a simple non-cryptographic hash** (`btoa` of a basic hash). This is NOT suitable for production use.
- **No server-side session validation.** Sessions are managed entirely in the browser via localStorage.
- **No CSRF protection.** Not applicable for the current client-only architecture, but required when a backend is added.
- **No rate limiting on the server side.** Client-side rate limiting can be bypassed by clearing localStorage.
- **Demo credentials are hardcoded** in `mockData.js`. These must be removed for production.

### Functionality

- **Mock data only.** All accounts, signers, tokens, and KBA questions are hardcoded fixtures. No real API calls are made.
- **No real email/SMS notifications.** OTP codes and invitation emails are simulated. The mock OTP codes are visible in `mockData.js`.
- **No real eSign integration.** Token validation is performed against mock token data.
- **No file upload or signature capture.** The "signature on file" field is a boolean flag only.
- **Submission generates a reference ID** but does not persist the submission to any backend system.
- **Account lockout cannot be reset by the user.** An administrator must manually reset failed attempts (or clear localStorage).

### Accessibility

- **Keyboard navigation** is implemented for all interactive elements, but has not been tested with all screen readers.
- **Color contrast** meets WCAG AA standards for the primary brand color (`#00468b`) against white backgrounds.
- **Reduced motion** is supported via the `prefers-reduced-motion` media query.

### Deployment

- **Single-page application only.** Server-side rendering (SSR) is not supported.
- **No API proxy configuration.** When a backend is added, Vite's `server.proxy` or the hosting platform's proxy/rewrite rules will need to be configured.
- **No Docker configuration.** The application is deployed as static files only.
- **No infrastructure-as-code.** Hosting configuration is manual via the platform dashboard.

---

## Troubleshooting

### Common Deployment Issues

**Blank page after deployment:**
- Verify the SPA rewrite rule is configured correctly (`vercel.json`, `_redirects`, or CloudFront error pages)
- Check the browser console for 404 errors on JavaScript or CSS assets
- Ensure the build output directory is set to `dist`

**Environment variables not working:**
- Confirm all variables are prefixed with `VITE_`
- Verify variables are set in the hosting platform's environment settings
- Remember that environment variables are embedded at build time — a new build is required after changing them
- Check that the variable names match exactly (case-sensitive)

**Styles not loading:**
- Verify the HB CSS Framework CDN link in `index.html` is accessible
- Check that `src/assets/hb-framework.css` is imported in `App.jsx` and `main.jsx`
- Clear the browser cache and hard refresh

**Routes returning 404:**
- Ensure the SPA rewrite/redirect rule is in place for your hosting platform
- Verify `vercel.json` is in the project root (not inside `src/` or `dist/`)
- For Netlify, ensure `_redirects` is in the `dist/` directory (use a build plugin or copy step)

**Build failures:**
- Run `npm run lint` and `npm run test` locally to catch errors before deploying
- Ensure Node.js version matches the required version (18+)
- Run `npm ci` instead of `npm install` in CI environments for deterministic builds
- Check that all dependencies in `package.json` are installed