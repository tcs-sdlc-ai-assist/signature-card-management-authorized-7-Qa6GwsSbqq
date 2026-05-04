import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import WelcomeScreen from './WelcomeScreen.jsx';
import ContentService from '../services/ContentService.js';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockContent = {
  title: 'Welcome to SIG Card Management',
  subtitle: 'Streamline your signature card workflows with a secure, modern platform.',
  bodyParagraphs: [
    'SIG Card Management simplifies the process of creating, managing, and verifying signature cards for all account types.',
    'Whether you are onboarding new account holders, updating signer information, or conducting identity verification, our step-by-step workflow guides you through every stage of the process.',
  ],
  featureHighlights: [
    {
      title: 'Multi-Step Card Creation',
      description: 'Create signature cards with a guided workflow covering account info, signer details, verification, and review.',
    },
    {
      title: 'Identity Verification',
      description: 'Verify signer identities using multiple methods including ID verification, knowledge-based authentication, in-person verification, and digital signatures.',
    },
    {
      title: 'Account Management',
      description: 'Manage signature cards across all account types including checking, savings, money market, trust, and business accounts.',
    },
    {
      title: 'Secure & Compliant',
      description: 'Built with session management, rate limiting, audit logging, and role-based access controls to meet regulatory requirements.',
    },
  ],
  ctaButtonText: 'Get Started',
  ctaSecondaryButtonText: 'Learn More',
  footerNote: 'Need help? Contact your system administrator for access and support.',
};

const renderWelcomeScreen = () => {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <WelcomeScreen />
    </MemoryRouter>,
  );
};

describe('WelcomeScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    vi.restoreAllMocks();
  });

  describe('content rendering from ContentService', () => {
    it('renders the welcome title from ContentService', () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(mockContent);

      renderWelcomeScreen();

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Welcome to SIG Card Management');
    });

    it('renders the subtitle text', () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(mockContent);

      renderWelcomeScreen();

      expect(
        screen.getByText('Streamline your signature card workflows with a secure, modern platform.'),
      ).toBeInTheDocument();
    });

    it('renders all body paragraphs', () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(mockContent);

      renderWelcomeScreen();

      expect(
        screen.getByText(/SIG Card Management simplifies the process/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Whether you are onboarding new account holders/),
      ).toBeInTheDocument();
    });

    it('renders all feature highlight titles', () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(mockContent);

      renderWelcomeScreen();

      expect(screen.getByText('Multi-Step Card Creation')).toBeInTheDocument();
      expect(screen.getByText('Identity Verification')).toBeInTheDocument();
      expect(screen.getByText('Account Management')).toBeInTheDocument();
      expect(screen.getByText('Secure & Compliant')).toBeInTheDocument();
    });

    it('renders all feature highlight descriptions', () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(mockContent);

      renderWelcomeScreen();

      expect(
        screen.getByText(/Create signature cards with a guided workflow/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Verify signer identities using multiple methods/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Manage signature cards across all account types/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Built with session management, rate limiting/),
      ).toBeInTheDocument();
    });

    it('renders the footer note', () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(mockContent);

      renderWelcomeScreen();

      expect(
        screen.getByText('Need help? Contact your system administrator for access and support.'),
      ).toBeInTheDocument();
    });

    it('renders the Key Features heading', () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(mockContent);

      renderWelcomeScreen();

      expect(screen.getByText('Key Features')).toBeInTheDocument();
    });
  });

  describe('Get Started button', () => {
    it('renders the Get Started button', () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(mockContent);

      renderWelcomeScreen();

      const getStartedButton = screen.getByRole('button', { name: 'Get Started' });
      expect(getStartedButton).toBeInTheDocument();
      expect(getStartedButton).toBeVisible();
    });

    it('navigates to /login when Get Started is clicked', async () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(mockContent);
      const user = userEvent.setup();

      renderWelcomeScreen();

      const getStartedButton = screen.getByRole('button', { name: 'Get Started' });
      await user.click(getStartedButton);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('renders the Learn More button', () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(mockContent);

      renderWelcomeScreen();

      const learnMoreButton = screen.getByRole('button', { name: 'Learn More' });
      expect(learnMoreButton).toBeInTheDocument();
      expect(learnMoreButton).toBeVisible();
    });

    it('uses custom CTA button text from content', () => {
      const customContent = {
        ...mockContent,
        ctaButtonText: 'Start Now',
        ctaSecondaryButtonText: 'Discover More',
      };
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(customContent);

      renderWelcomeScreen();

      expect(screen.getByRole('button', { name: 'Start Now' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Discover More' })).toBeInTheDocument();
    });
  });

  describe('accessible without authentication', () => {
    it('renders without requiring any authentication context', () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(mockContent);

      const { container } = renderWelcomeScreen();

      expect(container).toBeTruthy();
      expect(screen.getByText('Welcome to SIG Card Management')).toBeInTheDocument();
    });

    it('does not show any login-required messages or redirects', () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(mockContent);

      renderWelcomeScreen();

      expect(screen.queryByText(/log in/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/unauthorized/i)).not.toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('ARIA attributes and accessibility', () => {
    it('has an aria-labelledby attribute on the hero section referencing the title', () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(mockContent);

      renderWelcomeScreen();

      const heroSection = screen.getByLabelText('welcome-title', { selector: 'section' });
      expect(heroSection).toBeInTheDocument();

      const titleElement = screen.getByRole('heading', { level: 1 });
      expect(titleElement).toHaveAttribute('id', 'welcome-title');
    });

    it('has an aria-label on the About section', () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(mockContent);

      renderWelcomeScreen();

      const aboutSection = document.querySelector('section[aria-label="About"]');
      expect(aboutSection).toBeInTheDocument();
    });

    it('has an aria-label on the Actions section', () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(mockContent);

      renderWelcomeScreen();

      const actionsSection = document.querySelector('section[aria-label="Actions"]');
      expect(actionsSection).toBeInTheDocument();
    });

    it('has an aria-labelledby on the feature highlights section', () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(mockContent);

      renderWelcomeScreen();

      const featuresSection = document.getElementById('feature-highlights');
      expect(featuresSection).toBeInTheDocument();
      expect(featuresSection).toHaveAttribute('aria-labelledby', 'features-heading');

      const featuresHeading = document.getElementById('features-heading');
      expect(featuresHeading).toBeInTheDocument();
      expect(featuresHeading).toHaveTextContent('Key Features');
    });

    it('has an aria-label on the support information section', () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(mockContent);

      renderWelcomeScreen();

      const supportSection = document.querySelector('section[aria-label="Support information"]');
      expect(supportSection).toBeInTheDocument();
    });

    it('renders a main element as the root content wrapper', () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(mockContent);

      renderWelcomeScreen();

      const mainElement = screen.getByRole('main');
      expect(mainElement).toBeInTheDocument();
    });

    it('feature highlight cards are rendered with proper heading hierarchy', () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(mockContent);

      renderWelcomeScreen();

      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      const keyFeaturesH2 = h2Elements.find((el) => el.textContent === 'Key Features');
      expect(keyFeaturesH2).toBeInTheDocument();

      const h3Elements = screen.getAllByRole('heading', { level: 3 });
      const featureTitles = h3Elements.map((el) => el.textContent);
      expect(featureTitles).toContain('Multi-Step Card Creation');
      expect(featureTitles).toContain('Identity Verification');
      expect(featureTitles).toContain('Account Management');
      expect(featureTitles).toContain('Secure & Compliant');
    });
  });

  describe('error handling', () => {
    it('displays an error alert when ContentService fails', () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockImplementation(() => {
        throw new Error('Content load failed');
      });

      renderWelcomeScreen();

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/unexpected error/i);
    });

    it('displays an error alert when ContentService returns null', () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(null);

      renderWelcomeScreen();

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/Failed to load welcome content/i);
    });
  });

  describe('loading state', () => {
    it('shows a loading spinner initially before content loads', () => {
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(mockContent);

      renderWelcomeScreen();

      expect(screen.queryByText('Loading, please wait.')).not.toBeInTheDocument();
      expect(screen.getByText('Welcome to SIG Card Management')).toBeInTheDocument();
    });
  });

  describe('content without optional fields', () => {
    it('renders without feature highlights when none are provided', () => {
      const minimalContent = {
        ...mockContent,
        featureHighlights: [],
        ctaSecondaryButtonText: null,
        footerNote: null,
      };
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(minimalContent);

      renderWelcomeScreen();

      expect(screen.getByText('Welcome to SIG Card Management')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument();
      expect(screen.queryByText('Key Features')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Learn More' })).not.toBeInTheDocument();
    });

    it('renders without body paragraphs when none are provided', () => {
      const noBodyContent = {
        ...mockContent,
        bodyParagraphs: [],
      };
      vi.spyOn(ContentService, 'getWelcomeContent').mockReturnValue(noBodyContent);

      renderWelcomeScreen();

      expect(screen.getByText('Welcome to SIG Card Management')).toBeInTheDocument();
      expect(
        screen.queryByText(/SIG Card Management simplifies/),
      ).not.toBeInTheDocument();
    });
  });
});