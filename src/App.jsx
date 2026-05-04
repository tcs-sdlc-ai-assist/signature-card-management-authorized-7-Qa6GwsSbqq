import { RouterProvider } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import router from './router.jsx';
import './index.css';
import './assets/hb-framework.css';

/**
 * Root application component.
 * Wraps the router with AppContext (AuthContext + SignerContext providers)
 * and ErrorBoundary. Imports global CSS and HB framework CSS.
 * Renders RouterProvider with the application route configuration.
 *
 * @returns {React.ReactElement} The rendered root application component.
 */
function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;