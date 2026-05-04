import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginScreen from './LoginScreen.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import AuthService from '../services/AuthService.js';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderLoginScreen = (initialEntries = ['/login']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    </MemoryRouter>,
  );
};

describe('LoginScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    vi.restoreAllMocks();
    AuthService.initialize();
  });

  describe('form rendering', () => {
    it('renders the Log In heading', () => {
      renderLoginScreen();

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Log In');
    });

    it('renders the username input field', () => {
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      expect(usernameInput).toBeInTheDocument();
      expect(usernameInput).toHaveAttribute('type', 'text');
    });

    it('renders the password input field', () => {
      renderLoginScreen();

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('renders the Log In submit button', () => {
      renderLoginScreen();

      const submitButton = screen.getByRole('button', { name: /log in/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeVisible();
    });

    it('renders the Sign Up link', () => {
      renderLoginScreen();

      const signUpLink = screen.getByRole('link', { name: /sign up/i });
      expect(signUpLink).toBeInTheDocument();
      expect(signUpLink).toHaveAttribute('href', '/signup');
    });

    it('renders the required fields note', () => {
      renderLoginScreen();

      expect(screen.getByText(/fields marked with \* are required/i)).toBeInTheDocument();
    });

    it('renders a main element as the root content wrapper', () => {
      renderLoginScreen();

      const mainElement = screen.getByRole('main');
      expect(mainElement).toBeInTheDocument();
    });
  });

  describe('inline validation errors', () => {
    it('displays required error for empty username on blur', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      await user.click(usernameInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Username is required.')).toBeInTheDocument();
      });
    });

    it('displays required error for empty password on blur', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const passwordInput = screen.getByLabelText(/password/i);
      await user.click(passwordInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Password is required.')).toBeInTheDocument();
      });
    });

    it('displays validation errors for both fields on empty form submission', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const submitButton = screen.getByRole('button', { name: /log in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Username is required.')).toBeInTheDocument();
        expect(screen.getByText('Password is required.')).toBeInTheDocument();
      });
    });

    it('clears username error when user starts typing', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      await user.click(usernameInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Username is required.')).toBeInTheDocument();
      });

      await user.click(usernameInput);
      await user.type(usernameInput, 'a');

      await waitFor(() => {
        expect(screen.queryByText('Username is required.')).not.toBeInTheDocument();
      });
    });

    it('clears password error when user starts typing', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const passwordInput = screen.getByLabelText(/password/i);
      await user.click(passwordInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Password is required.')).toBeInTheDocument();
      });

      await user.click(passwordInput);
      await user.type(passwordInput, 'a');

      await waitFor(() => {
        expect(screen.queryByText('Password is required.')).not.toBeInTheDocument();
      });
    });
  });

  describe('failed login shows generic error', () => {
    it('displays generic error message for invalid credentials', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /log in/i });

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'WrongPassword123');
      await user.click(submitButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent('Invalid username or password. Please try again.');
      });
    });

    it('displays generic error for non-existent username without revealing which field is wrong', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /log in/i });

      await user.type(usernameInput, 'nonexistentuser');
      await user.type(passwordInput, 'SomePassword@123');
      await user.click(submitButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent('Invalid username or password. Please try again.');
      });

      const alertText = screen.getByRole('alert').textContent;
      expect(alertText.toLowerCase()).not.toContain('not found');
      expect(alertText.toLowerCase()).not.toContain('username is incorrect');
      expect(alertText.toLowerCase()).not.toContain('password is incorrect');
    });

    it('does not navigate on failed login', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /log in/i });

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'WrongPassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('lockout message after threshold', () => {
    it('displays lockout message for already locked account', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /log in/i });

      await user.type(usernameInput, 'locked_user');
      await user.type(passwordInput, 'Locked@1234');
      await user.click(submitButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent(/locked/i);
      });
    });

    it('displays lockout message after exceeding maximum failed attempts', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /log in/i });

      // Use readonly user which starts with 0 failed attempts
      // MAX_FAILED_LOGINS is 5
      for (let i = 0; i < 5; i++) {
        await user.clear(usernameInput);
        await user.clear(passwordInput);
        await user.type(usernameInput, 'readonly');
        await user.type(passwordInput, 'WrongPassword');
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByRole('alert')).toBeInTheDocument();
        });
      }

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent(/locked/i);
      });
    });

    it('disables form inputs after lockout', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /log in/i });

      await user.type(usernameInput, 'locked_user');
      await user.type(passwordInput, 'Locked@1234');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent(/locked/i);
      });

      // After lockout, the form should be disabled
      expect(usernameInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('navigation to signup link', () => {
    it('renders the Sign Up link pointing to /signup', () => {
      renderLoginScreen();

      const signUpLink = screen.getByRole('link', { name: /sign up/i });
      expect(signUpLink).toBeInTheDocument();
      expect(signUpLink).toHaveAttribute('href', '/signup');
    });

    it('renders the "Don\'t have an account?" text', () => {
      renderLoginScreen();

      expect(screen.getByText(/don't have an account\?/i)).toBeInTheDocument();
    });
  });

  describe('successful login', () => {
    it('navigates to dashboard on successful login', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /log in/i });

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'Admin@1234');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      });
    });

    it('does not display error alert on successful login', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /log in/i });

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'Admin@1234');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });

      expect(screen.queryByText('Invalid username or password. Please try again.')).not.toBeInTheDocument();
    });
  });

  describe('success message from navigation state', () => {
    it('displays success message when navigated from signup', () => {
      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/login',
              state: { message: 'Account created successfully. Please log in.' },
            },
          ]}
        >
          <AuthProvider>
            <LoginScreen />
          </AuthProvider>
        </MemoryRouter>,
      );

      expect(
        screen.getByText('Account created successfully. Please log in.'),
      ).toBeInTheDocument();
    });
  });

  describe('error dismissal', () => {
    it('dismisses error alert when dismiss button is clicked', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /log in/i });

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'WrongPassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      const dismissButton = screen.getByLabelText(/dismiss error alert/i);
      await user.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText('Invalid username or password. Please try again.')).not.toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('username input has required attribute', () => {
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      expect(usernameInput).toBeRequired();
    });

    it('password input has required attribute', () => {
      renderLoginScreen();

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toBeRequired();
    });

    it('submit button has accessible label', () => {
      renderLoginScreen();

      const submitButton = screen.getByRole('button', { name: /log in to your account/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('username input has autocomplete attribute', () => {
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      expect(usernameInput).toHaveAttribute('autocomplete', 'username');
    });

    it('password input has autocomplete attribute', () => {
      renderLoginScreen();

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    it('sets aria-invalid on username field when validation error exists', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      await user.click(usernameInput);
      await user.tab();

      await waitFor(() => {
        expect(usernameInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('validation error messages have role="alert"', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const submitButton = screen.getByRole('button', { name: /log in/i });
      await user.click(submitButton);

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
      });
    });
  });
});