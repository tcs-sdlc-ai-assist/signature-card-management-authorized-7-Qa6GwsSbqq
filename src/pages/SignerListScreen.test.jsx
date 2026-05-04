import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SignerListScreen from './SignerListScreen.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { SignerProvider } from '../context/SignerContext.jsx';
import AuthService from '../services/AuthService.js';
import AccountService from '../services/AccountService.js';
import SignerService from '../services/SignerService.js';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

/**
 * Helper to log in and select an account before rendering SignerListScreen.
 * Sets up localStorage state so that AuthContext and SignerContext are hydrated.
 */
const setupAuthenticatedState = (accountId = 'acct-1003') => {
  AuthService.initialize();
  AccountService.initialize();
  SignerService.initialize();

  // Log in as admin
  AuthService.login({ username: 'admin', password: 'Admin@1234' });
};

const renderSignerListScreen = () => {
  return render(
    <MemoryRouter initialEntries={['/signers']}>
      <AuthProvider>
        <SignerProvider>
          <SignerListScreen />
        </SignerProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
};

/**
 * Helper that sets up auth, selects an account via SignerContext manually
 * by calling selectAccount, then renders the screen.
 */
const renderWithAccount = (accountId = 'acct-1003') => {
  setupAuthenticatedState();

  // We need to set up the selected account in SignerContext.
  // Since SignerContext reads from its own state, we render a wrapper
  // that calls selectAccount on mount.
  const TestWrapper = () => {
    const { useSigners } = require('../context/SignerContext.jsx');
    const { selectAccount } = useSigners();
    const { useEffect } = require('react');

    useEffect(() => {
      selectAccount(accountId);
    }, []);

    return <SignerListScreen />;
  };

  // Instead, we use a simpler approach: render with a component that
  // triggers selectAccount. But since we can't use hooks outside components,
  // let's use a different strategy.

  // We'll create a proper wrapper component inline.
  return null;
};

/**
 * A wrapper component that selects an account before rendering children.
 */
function AccountSelectedWrapper({ accountId, children }) {
  const { useState, useEffect } = require('react');
  const { useSigners } = require('../context/SignerContext.jsx');
  const { selectAccount } = useSigners();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const result = selectAccount(accountId);
    setReady(true);
  }, []);

  if (!ready) {
    return null;
  }

  return children;
}

const renderSignerListWithAccount = (accountId = 'acct-1003') => {
  setupAuthenticatedState();

  return render(
    <MemoryRouter initialEntries={['/signers']}>
      <AuthProvider>
        <SignerProvider>
          <AccountSelectedWrapper accountId={accountId}>
            <SignerListScreen />
          </AccountSelectedWrapper>
        </SignerProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
};

describe('SignerListScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    vi.restoreAllMocks();
  });

  describe('rendering with signer data', () => {
    it('renders the Authorized Signers heading', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toBeInTheDocument();
        expect(heading).toHaveTextContent('Authorized Signers');
      });
    });

    it('renders signer names in the table', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        // acct-1003 has signers: Carol Chen, Frank Foster, Grace Garcia
        expect(screen.getByText(/Carol/)).toBeInTheDocument();
        expect(screen.getByText(/Frank/)).toBeInTheDocument();
        expect(screen.getByText(/Grace/)).toBeInTheDocument();
      });
    });

    it('renders signer statuses as badges', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('Revoked')).toBeInTheDocument();
      });
    });

    it('renders signer email and phone contact info', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        expect(screen.getByText('carol.chen@chenenterprises.com')).toBeInTheDocument();
        expect(screen.getByText('(555) 345-6789')).toBeInTheDocument();
      });
    });

    it('renders signer titles and roles', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        expect(screen.getByText('CEO')).toBeInTheDocument();
        expect(screen.getByText('CFO')).toBeInTheDocument();
        expect(screen.getByText('Operations Manager')).toBeInTheDocument();
      });
    });

    it('renders account info in the subheading', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        expect(screen.getByText(/Chen Enterprises LLC/)).toBeInTheDocument();
        expect(screen.getByText(/Business Checking/)).toBeInTheDocument();
      });
    });
  });

  describe('total signer count display', () => {
    it('displays the total signer count badge', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        expect(screen.getByText('3 Signers')).toBeInTheDocument();
      });
    });

    it('displays singular form for single signer account', async () => {
      renderSignerListWithAccount('acct-1002');

      await waitFor(() => {
        expect(screen.getByText('1 Signer')).toBeInTheDocument();
      });
    });

    it('displays the showing count text', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        expect(screen.getByText(/Showing 3 of 3 signer/)).toBeInTheDocument();
      });
    });
  });

  describe('action buttons based on signer status', () => {
    it('renders Edit and Remove buttons for all signers', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        const editButtons = screen.getAllByRole('button', { name: /Edit/i });
        expect(editButtons.length).toBeGreaterThanOrEqual(2);

        const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
        expect(removeButtons.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('renders Resend button for pending signers', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        const resendButtons = screen.getAllByRole('button', { name: /Resend/i });
        expect(resendButtons.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('renders Unlock button for locked signers', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        // Grace Garcia is locked
        const unlockButtons = screen.getAllByRole('button', { name: /Unlock/i });
        expect(unlockButtons.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows Locked badge for locked signers', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        expect(screen.getByText('Locked')).toBeInTheDocument();
      });
    });

    it('disables Edit button for revoked signers', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        // Grace Garcia is revoked - her Edit button should be disabled
        const editGraceButton = screen.getByRole('button', { name: /Edit Grace/i });
        expect(editGraceButton).toBeDisabled();
      });
    });
  });

  describe('sorting functionality', () => {
    it('renders sortable column headers for Name, Role, and Status', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        const nameHeader = screen.getByRole('columnheader', { name: /Name/i });
        expect(nameHeader).toBeInTheDocument();

        const roleHeader = screen.getByRole('columnheader', { name: /Role/i });
        expect(roleHeader).toBeInTheDocument();

        const statusHeader = screen.getByRole('columnheader', { name: /Status/i });
        expect(statusHeader).toBeInTheDocument();
      });
    });

    it('sorts by name ascending by default', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        const nameHeader = screen.getByRole('columnheader', { name: /Name/i });
        expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
      });
    });

    it('toggles sort direction when clicking the same column header', async () => {
      const user = userEvent.setup();
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        expect(screen.getByRole('columnheader', { name: /Name/i })).toBeInTheDocument();
      });

      const nameHeader = screen.getByRole('columnheader', { name: /Name/i });
      await user.click(nameHeader);

      await waitFor(() => {
        expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
      });
    });

    it('changes sort column when clicking a different column header', async () => {
      const user = userEvent.setup();
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        expect(screen.getByRole('columnheader', { name: /Status/i })).toBeInTheDocument();
      });

      const statusHeader = screen.getByRole('columnheader', { name: /Status/i });
      await user.click(statusHeader);

      await waitFor(() => {
        expect(statusHeader).toHaveAttribute('aria-sort', 'ascending');
      });

      const nameHeader = screen.getByRole('columnheader', { name: /Name/i });
      expect(nameHeader).toHaveAttribute('aria-sort', 'none');
    });
  });

  describe('filtering functionality', () => {
    it('renders the status filter dropdown', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        const filterSelect = screen.getByLabelText(/Filter signers by status/i);
        expect(filterSelect).toBeInTheDocument();
      });
    });

    it('shows all signers when All Statuses is selected', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        expect(screen.getByText(/Showing 3 of 3/)).toBeInTheDocument();
      });
    });

    it('filters signers by Active status', async () => {
      const user = userEvent.setup();
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        expect(screen.getByLabelText(/Filter signers by status/i)).toBeInTheDocument();
      });

      const filterSelect = screen.getByLabelText(/Filter signers by status/i);
      await user.selectOptions(filterSelect, 'Active');

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 3/)).toBeInTheDocument();
      });
    });

    it('filters signers by Pending status', async () => {
      const user = userEvent.setup();
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        expect(screen.getByLabelText(/Filter signers by status/i)).toBeInTheDocument();
      });

      const filterSelect = screen.getByLabelText(/Filter signers by status/i);
      await user.selectOptions(filterSelect, 'Pending');

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 3/)).toBeInTheDocument();
      });
    });

    it('filters signers by Revoked status', async () => {
      const user = userEvent.setup();
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        expect(screen.getByLabelText(/Filter signers by status/i)).toBeInTheDocument();
      });

      const filterSelect = screen.getByLabelText(/Filter signers by status/i);
      await user.selectOptions(filterSelect, 'Revoked');

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 3/)).toBeInTheDocument();
      });
    });

    it('shows no signers message when filter returns no results', async () => {
      const user = userEvent.setup();
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        expect(screen.getByLabelText(/Filter signers by status/i)).toBeInTheDocument();
      });

      const filterSelect = screen.getByLabelText(/Filter signers by status/i);
      await user.selectOptions(filterSelect, 'Inactive');

      await waitFor(() => {
        expect(screen.getByText(/No signers found with status "Inactive"/)).toBeInTheDocument();
      });
    });
  });

  describe('remove confirmation modal', () => {
    it('opens confirmation modal when Remove button is clicked', async () => {
      const user = userEvent.setup();
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Remove Carol/i })).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: /Remove Carol/i });
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.getByText('Remove Signer')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to remove/)).toBeInTheDocument();
      });
    });

    it('shows signer name in the confirmation modal message', async () => {
      const user = userEvent.setup();
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Remove Carol/i })).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: /Remove Carol/i });
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.getByText(/Carol Li Chen/)).toBeInTheDocument();
      });
    });

    it('closes confirmation modal when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Remove Carol/i })).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: /Remove Carol/i });
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.getByText('Remove Signer')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Remove Signer')).not.toBeInTheDocument();
      });
    });

    it('shows Remove as the confirm button label in the modal', async () => {
      const user = userEvent.setup();
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Remove Carol/i })).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: /Remove Carol/i });
      await user.click(removeButton);

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: 'Remove' });
        expect(confirmButton).toBeInTheDocument();
      });
    });
  });

  describe('Add Signer button', () => {
    it('renders the Add Signer button', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /Add a new signer/i });
        expect(addButton).toBeInTheDocument();
      });
    });

    it('navigates to dashboard when Add Signer is clicked', async () => {
      const user = userEvent.setup();
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add a new signer/i })).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /Add a new signer/i });
      await user.click(addButton);

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Back to Accounts button', () => {
    it('renders the Back to Accounts button', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /Go back to account selection/i });
        expect(backButton).toBeInTheDocument();
      });
    });

    it('navigates to accounts when Back to Accounts is clicked', async () => {
      const user = userEvent.setup();
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Go back to account selection/i })).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /Go back to account selection/i });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/accounts');
    });
  });

  describe('accessibility', () => {
    it('renders a main element as the root content wrapper', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        const mainElement = screen.getByRole('main');
        expect(mainElement).toBeInTheDocument();
      });
    });

    it('renders the signer table with an accessible label', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        const table = screen.getByRole('table', { name: /Authorized signers list/i });
        expect(table).toBeInTheDocument();
      });
    });

    it('has a screen reader live region for sort/filter changes', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        const srRegion = document.querySelector('.hb-sr-only[aria-live="polite"]');
        expect(srRegion).toBeInTheDocument();
      });
    });

    it('filter dropdown has an accessible label', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        const filterSelect = screen.getByLabelText(/Filter signers by status/i);
        expect(filterSelect).toBeInTheDocument();
      });
    });

    it('sortable column headers have aria-sort attributes', async () => {
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        const nameHeader = screen.getByRole('columnheader', { name: /Name/i });
        expect(nameHeader).toHaveAttribute('aria-sort');

        const roleHeader = screen.getByRole('columnheader', { name: /Role/i });
        expect(roleHeader).toHaveAttribute('aria-sort');

        const statusHeader = screen.getByRole('columnheader', { name: /Status/i });
        expect(statusHeader).toHaveAttribute('aria-sort');
      });
    });
  });

  describe('redirects when not authenticated', () => {
    it('redirects to login when not authenticated', () => {
      render(
        <MemoryRouter initialEntries={['/signers']}>
          <AuthProvider>
            <SignerProvider>
              <SignerListScreen />
            </SignerProvider>
          </AuthProvider>
        </MemoryRouter>,
      );

      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  describe('redirects when no account selected', () => {
    it('redirects to accounts when authenticated but no account selected', async () => {
      AuthService.initialize();
      AuthService.login({ username: 'admin', password: 'Admin@1234' });

      render(
        <MemoryRouter initialEntries={['/signers']}>
          <AuthProvider>
            <SignerProvider>
              <SignerListScreen />
            </SignerProvider>
          </AuthProvider>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/accounts', { replace: true });
      });
    });
  });

  describe('empty state', () => {
    it('shows no signers message for account with no matching filter', async () => {
      const user = userEvent.setup();
      renderSignerListWithAccount('acct-1002');

      await waitFor(() => {
        expect(screen.getByLabelText(/Filter signers by status/i)).toBeInTheDocument();
      });

      const filterSelect = screen.getByLabelText(/Filter signers by status/i);
      await user.selectOptions(filterSelect, 'Revoked');

      await waitFor(() => {
        expect(screen.getByText(/No signers found with status "Revoked"/)).toBeInTheDocument();
      });
    });
  });

  describe('keyboard interaction on sort headers', () => {
    it('sorts when Enter key is pressed on a column header', async () => {
      const user = userEvent.setup();
      renderSignerListWithAccount('acct-1003');

      await waitFor(() => {
        expect(screen.getByRole('columnheader', { name: /Status/i })).toBeInTheDocument();
      });

      const statusHeader = screen.getByRole('columnheader', { name: /Status/i });
      statusHeader.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(statusHeader).toHaveAttribute('aria-sort', 'ascending');
      });
    });
  });
});