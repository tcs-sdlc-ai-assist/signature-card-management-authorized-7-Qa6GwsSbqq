import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import WelcomeScreen from './pages/WelcomeScreen.jsx';
import LoginScreen from './pages/LoginScreen.jsx';
import SignUpScreen from './pages/SignUpScreen.jsx';
import VerificationScreen from './pages/VerificationScreen.jsx';
import TokenValidationScreen from './pages/TokenValidationScreen.jsx';
import AccountSelectionScreen from './pages/AccountSelectionScreen.jsx';
import SignerListScreen from './pages/SignerListScreen.jsx';
import AddSignerScreen from './pages/AddSignerScreen.jsx';
import EditSignerScreen from './pages/EditSignerScreen.jsx';
import ConfirmSignersScreen from './pages/ConfirmSignersScreen.jsx';
import ReviewSignersScreen from './pages/ReviewSignersScreen.jsx';
import SubmissionScreen from './pages/SubmissionScreen.jsx';

/**
 * Application router configuration.
 * Defines all client-side routes with appropriate protection levels.
 * Uses AppLayout as the shared layout wrapper for all routes.
 *
 * Route protection levels:
 * - Public: /, /login, /signup (no authentication required)
 * - Authenticated: /accounts, /signers/*, /confirm, /review, /submission, /dashboard
 * - Verified: /verify (requires authentication)
 * - Token validated: /token (requires authentication)
 *
 * @type {import('react-router-dom').Router}
 */
const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: '/',
        element: <WelcomeScreen />,
      },
      {
        path: '/login',
        element: <LoginScreen />,
      },
      {
        path: '/signup',
        element: <SignUpScreen />,
      },
      {
        path: '/verify',
        element: (
          <ProtectedRoute>
            <VerificationScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/token',
        element: (
          <ProtectedRoute requireVerification={true}>
            <TokenValidationScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/accounts',
        element: (
          <ProtectedRoute>
            <AccountSelectionScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/dashboard',
        element: (
          <ProtectedRoute>
            <AddSignerScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/signers',
        element: (
          <ProtectedRoute>
            <SignerListScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/signers/add',
        element: (
          <ProtectedRoute>
            <AddSignerScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/signers/edit/:id',
        element: (
          <ProtectedRoute>
            <EditSignerScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/signers/confirm',
        element: (
          <ProtectedRoute>
            <ConfirmSignersScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/signers/review',
        element: (
          <ProtectedRoute>
            <ReviewSignersScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/confirm',
        element: (
          <ProtectedRoute>
            <ConfirmSignersScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/review',
        element: (
          <ProtectedRoute>
            <ReviewSignersScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/submission',
        element: (
          <ProtectedRoute>
            <SubmissionScreen />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

export default router;