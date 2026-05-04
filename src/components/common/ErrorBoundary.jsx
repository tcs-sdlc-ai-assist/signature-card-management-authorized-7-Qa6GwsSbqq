import { Component } from 'react';
import PropTypes from 'prop-types';
import AuditLogger from '../../services/AuditLogger.js';
import Alert from './Alert.jsx';
import Button from './Button.jsx';

/**
 * React error boundary component that catches rendering errors in child components.
 * Displays fallback UI with error message and retry button using HB alert styling.
 * Logs errors via AuditLogger.
 *
 * @class ErrorBoundary
 * @extends {Component}
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to wrap.
 * @param {React.ReactNode} [props.fallback] - Optional custom fallback UI to render on error.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
    this.handleRetry = this.handleRetry.bind(this);
  }

  /**
   * Derives error state from a caught error during rendering.
   * @param {Error} error - The error that was thrown.
   * @returns {Object} Updated state indicating an error has occurred.
   */
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Logs the error and component stack via AuditLogger after an error is caught.
   * @param {Error} error - The error that was thrown.
   * @param {Object} errorInfo - An object with a componentStack property.
   */
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    try {
      AuditLogger.logEvent('RENDER_ERROR', {
        errorMessage: error ? error.message : 'Unknown error',
        errorName: error ? error.name : 'Error',
        componentStack: errorInfo ? errorInfo.componentStack : '',
      });
    } catch (_logError) {
      // Silently fail if logging itself errors
    }
  }

  /**
   * Resets the error state to allow re-rendering of child components.
   */
  handleRetry() {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  }

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, render it
      if (this.props.fallback !== undefined && this.props.fallback !== null) {
        return this.props.fallback;
      }

      const errorMessage =
        this.state.error && this.state.error.message
          ? `Something went wrong: ${this.state.error.message}`
          : 'An unexpected error occurred. Please try again.';

      return (
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          style={{
            padding: '2rem',
            maxWidth: '600px',
            margin: '2rem auto',
          }}
        >
          <Alert
            type="error"
            message={errorMessage}
          />
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <Button
              variant="primary"
              label="Retry"
              onClick={this.handleRetry}
              ariaLabel="Retry loading the page"
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
};

export default ErrorBoundary;