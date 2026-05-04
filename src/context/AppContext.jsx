import { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { AuthProvider } from './AuthContext.jsx';
import { SignerProvider } from './SignerContext.jsx';
import { STEPS } from '../constants/constants.js';

/**
 * @typedef {Object} AppContextValue
 * @property {number} currentStep - The current step number in the multi-step workflow (1-based).
 * @property {Array<Object>} steps - The full list of step definitions from constants.
 * @property {Function} goToStep - Navigates to a specific step by number.
 * @property {Function} goBack - Navigates to the previous step.
 * @property {Function} goForward - Navigates to the next step.
 * @property {boolean} canGoForward - Whether the user can advance to the next step.
 * @property {boolean} canGoBack - Whether the user can go back to the previous step.
 * @property {boolean} isFirstStep - Whether the current step is the first step.
 * @property {boolean} isLastStep - Whether the current step is the last step.
 * @property {boolean} showExitConfirmation - Whether the exit/cancel confirmation dialog is visible.
 * @property {Function} requestExit - Requests to show the exit/cancel confirmation dialog.
 * @property {Function} confirmExit - Confirms the exit action and resets state.
 * @property {Function} cancelExit - Cancels the exit action and hides the dialog.
 * @property {Function} resetWorkflow - Resets the workflow to the first step.
 */

const AppContext = createContext(null);

/**
 * Inner application context provider that manages multi-step workflow state,
 * navigation helpers, and exit/cancel confirmation state.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to wrap.
 * @returns {React.ReactElement} The provider component.
 */
function AppContextProvider({ children }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  const totalSteps = STEPS.length;

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;
  const canGoBack = currentStep > 1;
  const canGoForward = currentStep < totalSteps;

  /**
   * Navigates to a specific step by number.
   * Clamps the step to the valid range [1, totalSteps].
   *
   * @param {number} stepNumber - The step number to navigate to (1-based).
   */
  const goToStep = useCallback((stepNumber) => {
    if (typeof stepNumber !== 'number' || isNaN(stepNumber)) {
      return;
    }

    const clamped = Math.max(1, Math.min(Math.floor(stepNumber), totalSteps));
    setCurrentStep(clamped);
  }, [totalSteps]);

  /**
   * Navigates to the previous step if possible.
   */
  const goBack = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev <= 1) {
        return prev;
      }
      return prev - 1;
    });
  }, []);

  /**
   * Navigates to the next step if possible.
   */
  const goForward = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev >= totalSteps) {
        return prev;
      }
      return prev + 1;
    });
  }, [totalSteps]);

  /**
   * Requests to show the exit/cancel confirmation dialog.
   */
  const requestExit = useCallback(() => {
    setShowExitConfirmation(true);
  }, []);

  /**
   * Confirms the exit action, hides the dialog, and resets the workflow.
   */
  const confirmExit = useCallback(() => {
    setShowExitConfirmation(false);
    setCurrentStep(1);
  }, []);

  /**
   * Cancels the exit action and hides the confirmation dialog.
   */
  const cancelExit = useCallback(() => {
    setShowExitConfirmation(false);
  }, []);

  /**
   * Resets the workflow to the first step.
   */
  const resetWorkflow = useCallback(() => {
    setCurrentStep(1);
    setShowExitConfirmation(false);
  }, []);

  const value = {
    currentStep,
    steps: STEPS,
    goToStep,
    goBack,
    goForward,
    canGoForward,
    canGoBack,
    isFirstStep,
    isLastStep,
    showExitConfirmation,
    requestExit,
    confirmExit,
    cancelExit,
    resetWorkflow,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

AppContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Top-level application context composition provider.
 * Composes AuthProvider, SignerProvider, and AppContextProvider into a single wrapper.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to wrap.
 * @returns {React.ReactElement} The composed provider component.
 */
function AppProvider({ children }) {
  return (
    <AuthProvider>
      <SignerProvider>
        <AppContextProvider>
          {children}
        </AppContextProvider>
      </SignerProvider>
    </AuthProvider>
  );
}

AppProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Custom hook to access the application context.
 * Must be used within an AppProvider.
 *
 * @returns {AppContextValue} The application context value.
 * @throws {Error} If used outside of an AppProvider.
 */
function useApp() {
  const context = useContext(AppContext);

  if (context === null) {
    throw new Error('useApp must be used within an AppProvider.');
  }

  return context;
}

export { AppProvider, useApp };
export default AppContext;