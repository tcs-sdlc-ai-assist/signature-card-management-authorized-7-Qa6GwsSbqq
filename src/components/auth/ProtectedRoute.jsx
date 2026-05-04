import { useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Route guard component that checks authentication, verification, and token
 * validation status from AuthContext. Redirects unauthenticated users to login,
 * unverified users to verification, and users without valid tokens to token
 * validation.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The child components to render if access is granted.
 * @param {boolean} [props.requireVerification=false] - Whether the route requires identity verification.
 * @param {boolean} [props.requireToken=false] - Whether the route requires a validated eSign token.
 * @returns {React.ReactElement} The rendered children if authorized, or a Navigate redirect.
 */
function ProtectedRoute({ children, requireVerification = false, requireToken = false }) {
  const { isAuthenticated, isVerified, isTokenValidated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        className="hb-d-flex hb-justify-content-center hb-align-items-center"
        style={{ minHeight: '50vh' }}
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        <span className="hb-spinner hb-spinner-lg" aria-hidden="true" />
        <span className="hb-sr-only">Loading, please wait.</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireVerification && !isVerified) {
    return <Navigate to="/verify" state={{ from: location }} replace />;
  }

  if (requireToken && !isTokenValidated) {
    return <Navigate to="/token" state={{ from: location }} replace />;
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requireVerification: PropTypes.bool,
  requireToken: PropTypes.bool,
};

export default ProtectedRoute;