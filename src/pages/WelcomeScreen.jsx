import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ContentService from '../services/ContentService.js';
import Button from '../components/common/Button.jsx';
import Alert from '../components/common/Alert.jsx';

/**
 * Welcome/onboarding landing page displaying admin-editable content
 * loaded via ContentService. Shows title, body content, feature highlights,
 * and prominent 'Get Started' CTA button navigating to login.
 * Accessible pre-login (no auth required).
 * Uses HB CSS grid (.fluid-wrapper, .hb-row, .hb-col) for responsive layout.
 *
 * @returns {React.ReactElement} The rendered welcome screen component.
 */
function WelcomeScreen() {
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Loads welcome content from ContentService on mount.
   */
  useEffect(() => {
    try {
      const welcomeContent = ContentService.getWelcomeContent();

      if (welcomeContent && typeof welcomeContent === 'object') {
        setContent(welcomeContent);
      } else {
        setError('Failed to load welcome content. Please refresh the page.');
      }
    } catch (_error) {
      setError('An unexpected error occurred while loading content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handles the 'Get Started' CTA button click.
   * Navigates to the login page.
   */
  const handleGetStarted = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  /**
   * Handles the secondary CTA button click.
   * Scrolls to the feature highlights section.
   */
  const handleLearnMore = useCallback(() => {
    const featuresSection = document.getElementById('feature-highlights');

    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  if (isLoading) {
    return (
      <div
        className="fluid-wrapper hb-d-flex hb-justify-content-center hb-align-items-center"
        style={{ minHeight: '60vh' }}
        role="status"
        aria-live="polite"
        aria-label="Loading welcome content"
      >
        <span className="hb-spinner hb-spinner-lg" aria-hidden="true" />
        <span className="hb-sr-only">Loading, please wait.</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fluid-wrapper" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <Alert type="error" message={error} />
      </div>
    );
  }

  if (!content) {
    return null;
  }

  const {
    title,
    subtitle,
    bodyParagraphs,
    featureHighlights,
    ctaButtonText,
    ctaSecondaryButtonText,
    footerNote,
  } = content;

  return (
    <main className="fluid-wrapper" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      {/* Hero Section */}
      <section
        aria-labelledby="welcome-title"
        style={{ textAlign: 'center', marginBottom: '2.5rem' }}
      >
        <div className="hb-row hb-justify-content-center">
          <div className="hb-col-12 hb-col-md-10 hb-col-lg-8">
            {title && (
              <h1
                id="welcome-title"
                style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: 'var(--hb-primary, #00468b)',
                  marginBottom: '0.75rem',
                  fontFamily: 'var(--hb-font-family, inherit)',
                }}
              >
                {title}
              </h1>
            )}
            {subtitle && (
              <p
                style={{
                  fontSize: '1.125rem',
                  color: 'var(--hb-gray-700, #495057)',
                  marginBottom: '1.5rem',
                  lineHeight: 1.6,
                  fontFamily: 'var(--hb-font-family, inherit)',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Body Paragraphs */}
      {Array.isArray(bodyParagraphs) && bodyParagraphs.length > 0 && (
        <section aria-label="About" style={{ marginBottom: '2.5rem' }}>
          <div className="hb-row hb-justify-content-center">
            <div className="hb-col-12 hb-col-md-10 hb-col-lg-8">
              {bodyParagraphs.map((paragraph, index) => (
                <p
                  key={index}
                  style={{
                    fontSize: '1rem',
                    lineHeight: 1.7,
                    color: 'var(--hb-black, #292929)',
                    marginBottom: '1rem',
                    fontFamily: 'var(--hb-font-family, inherit)',
                  }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Buttons */}
      <section
        aria-label="Actions"
        style={{ textAlign: 'center', marginBottom: '2.5rem' }}
      >
        <div
          className="hb-d-flex hb-justify-content-center hb-align-items-center hb-gap-3"
          style={{ flexWrap: 'wrap' }}
        >
          <Button
            variant="primary"
            label={ctaButtonText || 'Get Started'}
            onClick={handleGetStarted}
            ariaLabel={ctaButtonText || 'Get Started'}
          />
          {ctaSecondaryButtonText && (
            <Button
              variant="secondary"
              label={ctaSecondaryButtonText}
              onClick={handleLearnMore}
              ariaLabel={ctaSecondaryButtonText}
            />
          )}
        </div>
      </section>

      {/* Feature Highlights */}
      {Array.isArray(featureHighlights) && featureHighlights.length > 0 && (
        <section
          id="feature-highlights"
          aria-labelledby="features-heading"
          style={{ marginBottom: '2.5rem' }}
        >
          <div className="hb-row hb-justify-content-center">
            <div className="hb-col-12 hb-col-md-10 hb-col-lg-8">
              <h2
                id="features-heading"
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  color: 'var(--hb-primary, #00468b)',
                  textAlign: 'center',
                  marginBottom: '1.5rem',
                  fontFamily: 'var(--hb-font-family, inherit)',
                }}
              >
                Key Features
              </h2>
            </div>
          </div>
          <div className="hb-row hb-justify-content-center">
            {featureHighlights.map((feature, index) => (
              <div
                key={index}
                className="hb-col-12 hb-col-sm-6 hb-col-lg-3"
                style={{ marginBottom: '1rem' }}
              >
                <div
                  className="hb-card"
                  style={{ height: '100%' }}
                >
                  <div className="hb-card-body">
                    {feature.title && (
                      <h3
                        style={{
                          fontSize: '1.0625rem',
                          fontWeight: 600,
                          color: 'var(--hb-primary, #00468b)',
                          marginBottom: '0.5rem',
                          fontFamily: 'var(--hb-font-family, inherit)',
                        }}
                      >
                        {feature.title}
                      </h3>
                    )}
                    {feature.description && (
                      <p
                        style={{
                          fontSize: '0.9375rem',
                          lineHeight: 1.6,
                          color: 'var(--hb-gray-700, #495057)',
                          margin: 0,
                          fontFamily: 'var(--hb-font-family, inherit)',
                        }}
                      >
                        {feature.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer Note */}
      {footerNote && (
        <section aria-label="Support information" style={{ textAlign: 'center' }}>
          <div className="hb-row hb-justify-content-center">
            <div className="hb-col-12 hb-col-md-10 hb-col-lg-8">
              <p
                className="hb-text-muted"
                style={{
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  margin: 0,
                  fontFamily: 'var(--hb-font-family, inherit)',
                }}
              >
                {footerNote}
              </p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export default WelcomeScreen;