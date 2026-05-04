import { useCallback, useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import ProgressIndicator from '../common/ProgressIndicator.jsx';
import Button from '../common/Button.jsx';
import ConfirmationModal from '../common/ConfirmationModal.jsx';
import SessionTimeoutModal from '../auth/SessionTimeoutModal.jsx';

/**
 * Routes where the progress indicator should be displayed.
 * @type {Array<{ path: string, step: number }>}
 */
const PROGRESS_ROUTES = [
  { path: '/accounts', step: 1 },
  { path: '/dashboard', step: 2 },
  { path: '/signers', step: 2 },
  { path: '/confirm', step: 3 },
  { path: '/review', step: 4 },
  { path: '/submission', step: 4 },
];

/**
 * Routes where the cancel/exit button should be shown.
 * @type {Array<string>}
 */
const EXIT_BUTTON_ROUTES = [
  '/dashboard',
  '/signers',
  '/confirm',
  '/review',
];

/**
 * Routes that are considered part of the authenticated flow.
 * @type {Array<string>}
 */
const AUTHENTICATED_ROUTES = [
  '/accounts',
  '/dashboard',
  '/signers',
  '/confirm',
  '/review',
  '/submission',
  '/verify',
  '/token',
];

/**
 * Determines the current step number based on the current route path.
 * @param {string} pathname - The current route pathname.
 * @returns {number|null} The step number, or null if not in a progress route.
 */
const getStepFromPath = (pathname) => {
  if (!pathname || typeof pathname !== 'string') {
    return null;
  }

  const match = PROGRESS_ROUTES.find((route) => pathname.startsWith(route.path));
  return match ? match.step : null;
};

/**
 * Checks if the current route should show the exit/cancel button.
 * @param {string} pathname - The current route pathname.
 * @returns {boolean} True if the exit button should be shown.
 */
const shouldShowExitButton = (pathname) => {
  if (!pathname || typeof pathname !== 'string') {
    return false;
  }

  return EXIT_BUTTON_ROUTES.some((route) => pathname.startsWith(route));
};

/**
 * Checks if the current route is an authenticated flow route.
 * @param {string} pathname - The current route pathname.
 * @returns {boolean} True if the route is part of the authenticated flow.
 */
const isAuthenticatedRoute = (pathname) => {
  if (!pathname || typeof pathname !== 'string') {
    return false;
  }

  return AUTHENTICATED_ROUTES.some((route) => pathname.startsWith(route));
};

/**
 * Application title from environment variable or default.
 * @type {string}
 */
const APP_TITLE = import.meta.env.VITE_APP_TITLE || 'SIG Card Management';

/**
 * Main application layout wrapper component.
 * Includes header with app title and logout button (when authenticated),
 * ProgressIndicator (when in a multi-step flow), main content area via
 * Outlet or children, and footer. Manages SessionTimeoutModal display.
 * Provides Cancel/Exit button with ConfirmationModal for unsaved changes warning.
 * Uses HB CSS .fluid-wrapper layout.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.children] - Optional child components to render instead of Outlet.
 * @returns {React.ReactElement} The rendered application layout component.
 */
function AppLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, currentUser, logout } = useAuth();

  let appContext = null;
  try {
    appContext = useApp();
  } catch (_error) {
    // AppContext may not be available on all routes
  }

  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const currentPath = location.pathname;
  const currentStep = getStepFromPath(currentPath);
  const showProgress = isAuthenticated && currentStep !== null;
  const showExitButton = isAuthenticated && shouldShowExitButton(currentPath);
  const showLogout = isAuthenticated;
  const showAuthenticatedHeader = isAuthenticated && isAuthenticatedRoute(currentPath);

  const steps = appContext ? appContext.steps : [];

  /**
   * Handles the logout button click.
   */
  const handleLogout = useCallback(() => {
    setIsLoggingOut(true);

    try {
      logout();
      navigate('/login', { replace: true });
    } catch (_error) {
      // Silently handle logout errors
    } finally {
      setIsLoggingOut(false);
    }
  }, [logout, navigate]);

  /**
   * Handles the cancel/exit button click.
   * Shows a confirmation modal if in a flow.
   */
  const handleExitClick = useCallback(() => {
    setExitModalOpen(true);
  }, []);

  /**
   * Confirms the exit action and navigates to account selection.
   */
  const handleConfirmExit = useCallback(() => {
    setExitModalOpen(false);

    if (appContext && typeof appContext.confirmExit === 'function') {
      appContext.confirmExit();
    }

    navigate('/accounts', { replace: true });
  }, [appContext, navigate]);

  /**
   * Cancels the exit action and closes the modal.
   */
  const handleCancelExit = useCallback(() => {
    setExitModalOpen(false);

    if (appContext && typeof appContext.cancelExit === 'function') {
      appContext.cancelExit();
    }
  }, [appContext]);

  /**
   * Handles step click on the progress indicator for backward navigation.
   * @param {number} stepNumber - The step number clicked.
   */
  const handleStepClick = useCallback(
    (stepNumber) => {
      if (!currentStep || stepNumber >= currentStep) {
        return;
      }

      const targetRoute = PROGRESS_ROUTES.find((route) => route.step === stepNumber);

      if (targetRoute) {
        if (appContext && typeof appContext.goToStep === 'function') {
          appContext.goToStep(stepNumber);
        }

        navigate(targetRoute.path, { replace: true });
      }
    },
    [currentStep, appContext, navigate],
  );

  /**
   * Returns the display name for the current user.
   * @returns {string} The user's display name.
   */
  const getUserDisplayName = useCallback(() => {
    if (!currentUser) {
      return '';
    }

    if (currentUser.firstName && currentUser.lastName) {
      return `${currentUser.firstName} ${currentUser.lastName}`;
    }

    return currentUser.username || '';
  }, [currentUser]);

  const userDisplayName = getUserDisplayName();

  return (
    <div
      className="hb-d-flex hb-flex-column"
      style={{ minHeight: '100vh' }}
    >
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="skip-link"
        style={{
          position: 'absolute',
          top: '-40px',
          left: 0,
          background: 'var(--hb-primary, #00468b)',
          color: '#fff',
          padding: '0.5rem 1rem',
          zIndex: 1100,
          transition: 'top 0.2s ease',
        }}
        onFocus={(e) => {
          e.target.style.top = '0';
        }}
        onBlur={(e) => {
          e.target.style.top = '-40px';
        }}
      >
        Skip to main content
      </a>

      {/* Header */}
      <header
        style={{
          backgroundColor: 'var(--hb-primary, #00468b)',
          color: 'var(--hb-white, #ffffff)',
          padding: '0.75rem 0',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        }}
        role="banner"
      >
        <div className="fluid-wrapper">
          <div
            className="hb-d-flex hb-justify-content-between hb-align-items-center hb-flex-wrap hb-gap-2"
          >
            {/* App Title */}
            <div
              className="hb-d-flex hb-align-items-center hb-gap-2"
              style={{ minWidth: 0 }}
            >
              <h1
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--hb-white, #ffffff)',
                  fontFamily: 'var(--hb-font-family, inherit)',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
                onClick={() => navigate('/')}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/');
                  }
                }}
                aria-label={`${APP_TITLE} - Go to home page`}
              >
                {APP_TITLE}
              </h1>
            </div>

            {/* User Info and Actions */}
            {showLogout && (
              <div
                className="hb-d-flex hb-align-items-center hb-gap-3"
                style={{ flexShrink: 0 }}
              >
                {userDisplayName && (
                  <span
                    style={{
                      fontSize: '0.875rem',
                      color: 'rgba(255, 255, 255, 0.85)',
                      fontFamily: 'var(--hb-font-family, inherit)',
                      whiteSpace: 'nowrap',
                    }}
                    aria-label={`Logged in as ${userDisplayName}`}
                  >
                    {userDisplayName}
                    {currentUser && currentUser.role && (
                      <span
                        style={{
                          marginLeft: '0.375rem',
                          fontSize: '0.75rem',
                          opacity: 0.75,
                        }}
                      >
                        ({currentUser.role})
                      </span>
                    )}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  aria-label="Log out"
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: 'var(--hb-white, #ffffff)',
                    padding: '0.375rem 0.875rem',
                    borderRadius: 'var(--hb-border-radius, 4px)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    fontFamily: 'var(--hb-font-family, inherit)',
                    cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                    opacity: isLoggingOut ? 0.6 : 1,
                    transition: 'background-color 0.2s ease-in-out, opacity 0.2s ease-in-out',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoggingOut) {
                      e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                  }}
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Progress Indicator */}
      {showProgress && steps.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--hb-white, #ffffff)',
            borderBottom: '1px solid var(--hb-gray-300, #dee2e6)',
            padding: '1rem 0',
          }}
        >
          <div className="fluid-wrapper">
            <div className="hb-row hb-justify-content-center">
              <div className="hb-col-12 hb-col-md-10 hb-col-lg-8">
                <ProgressIndicator
                  steps={steps}
                  currentStep={currentStep}
                  onStepClick={handleStepClick}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exit/Cancel Button Bar */}
      {showExitButton && (
        <div
          style={{
            backgroundColor: 'var(--hb-gray-100, #f8f9fa)',
            borderBottom: '1px solid var(--hb-gray-200, #e9ecef)',
            padding: '0.5rem 0',
          }}
        >
          <div className="fluid-wrapper">
            <div className="hb-d-flex hb-justify-content-end">
              <Button
                variant="secondary"
                label="Cancel / Exit"
                onClick={handleExitClick}
                ariaLabel="Cancel and exit the current workflow"
                className="hb-text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main
        id="main-content"
        style={{
          flex: '1 1 auto',
          backgroundColor: 'var(--hb-gray-100, #f8f9fa)',
        }}
        role="main"
      >
        {children || <Outlet />}
      </main>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: 'var(--hb-gray-800, #343a40)',
          color: 'rgba(255, 255, 255, 0.7)',
          padding: '1rem 0',
          flexShrink: 0,
        }}
        role="contentinfo"
      >
        <div className="fluid-wrapper">
          <div
            className="hb-d-flex hb-justify-content-between hb-align-items-center hb-flex-wrap hb-gap-2"
          >
            <p
              style={{
                margin: 0,
                fontSize: '0.8125rem',
                fontFamily: 'var(--hb-font-family, inherit)',
              }}
            >
              &copy; {new Date().getFullYear()} {APP_TITLE}. All rights reserved.
            </p>
            <p
              style={{
                margin: 0,
                fontSize: '0.75rem',
                fontFamily: 'var(--hb-font-family, inherit)',
                opacity: 0.7,
              }}
            >
              Secure &amp; Compliant Banking Platform
            </p>
          </div>
        </div>
      </footer>

      {/* Session Timeout Modal */}
      {isAuthenticated && <SessionTimeoutModal />}

      {/* Exit Confirmation Modal */}
      <ConfirmationModal
        isOpen={exitModalOpen}
        onConfirm={handleConfirmExit}
        onCancel={handleCancelExit}
        title="Exit Workflow"
        message="Are you sure you want to exit? Any unsaved changes may be lost. You will be returned to the account selection page."
        confirmLabel="Exit"
        cancelLabel="Stay"
      />
    </div>
  );
}

AppLayout.propTypes = {
  children: PropTypes.node,
};

export default AppLayout;