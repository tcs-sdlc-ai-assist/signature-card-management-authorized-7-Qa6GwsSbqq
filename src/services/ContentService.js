import { STORAGE_KEYS } from '../constants/constants.js';
import { getItem, setItem } from '../utils/storage.js';
import { deepClone } from '../utils/helpers.js';
import AuditLogger from './AuditLogger.js';
import defaultContent from '../constants/welcomeContent.json';

/**
 * Content management service for the welcome screen and other configurable content.
 * Loads content from localStorage if available, otherwise falls back to the
 * default content defined in welcomeContent.json. Supports admin content editing
 * without requiring code changes.
 *
 * @namespace ContentService
 */
const ContentService = {
  /**
   * Retrieves the welcome screen content.
   * First checks localStorage for any previously saved content.
   * Falls back to the default content from welcomeContent.json if none is found.
   *
   * @returns {Object} The welcome content object containing title, subtitle,
   *   bodyParagraphs, featureHighlights, ctaButtonText, ctaSecondaryButtonText,
   *   and footerNote.
   */
  getWelcomeContent() {
    try {
      const storedContent = getItem(STORAGE_KEYS.CONTENT, null);

      if (storedContent && typeof storedContent === 'object') {
        return deepClone(storedContent);
      }

      return deepClone(defaultContent);
    } catch (_error) {
      return deepClone(defaultContent);
    }
  },

  /**
   * Saves updated welcome screen content to localStorage.
   * Merges the provided content with the existing content to ensure
   * all required fields are preserved.
   *
   * @param {Object} content - The updated content object. May contain any subset
   *   of the welcome content fields (title, subtitle, bodyParagraphs,
   *   featureHighlights, ctaButtonText, ctaSecondaryButtonText, footerNote).
   * @returns {boolean} True if the content was saved successfully, false otherwise.
   */
  updateWelcomeContent(content) {
    if (!content || typeof content !== 'object') {
      return false;
    }

    try {
      const currentContent = this.getWelcomeContent();

      const updatedContent = {
        ...currentContent,
        ...content,
      };

      const success = setItem(STORAGE_KEYS.CONTENT, updatedContent);

      if (success) {
        AuditLogger.logEvent('CONTENT_UPDATED', {
          contentType: 'welcome',
          updatedFields: Object.keys(content),
        });
      }

      return success;
    } catch (_error) {
      return false;
    }
  },

  /**
   * Resets the welcome screen content to the default values from welcomeContent.json.
   * Removes any customized content from localStorage.
   *
   * @returns {boolean} True if the content was reset successfully, false otherwise.
   */
  resetWelcomeContent() {
    try {
      const success = setItem(STORAGE_KEYS.CONTENT, deepClone(defaultContent));

      if (success) {
        AuditLogger.logEvent('CONTENT_RESET', {
          contentType: 'welcome',
        });
      }

      return success;
    } catch (_error) {
      return false;
    }
  },

  /**
   * Retrieves the default welcome screen content from welcomeContent.json
   * without checking localStorage. Useful for comparing against customized content
   * or for reset previews.
   *
   * @returns {Object} The default welcome content object.
   */
  getDefaultWelcomeContent() {
    return deepClone(defaultContent);
  },
};

export default ContentService;