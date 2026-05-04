import { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * Maximum number of page buttons to display at once before truncating with ellipsis.
 * @type {number}
 */
const MAX_VISIBLE_PAGES = 7;

/**
 * Calculates the range of page numbers to display, including ellipsis markers.
 * Returns an array of page numbers and/or 'ellipsis-left' / 'ellipsis-right' strings.
 *
 * @param {number} currentPage - The current active page (1-based).
 * @param {number} totalPages - The total number of pages.
 * @returns {Array<number|string>} An array of page numbers and ellipsis markers.
 */
const getPageRange = (currentPage, totalPages) => {
  if (totalPages <= MAX_VISIBLE_PAGES) {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  const pages = [];

  // Always show first page
  pages.push(1);

  if (currentPage <= 3) {
    // Near the start: 1 2 3 4 5 ... last
    for (let i = 2; i <= 5; i++) {
      pages.push(i);
    }
    pages.push('ellipsis-right');
    pages.push(totalPages);
  } else if (currentPage >= totalPages - 2) {
    // Near the end: 1 ... n-4 n-3 n-2 n-1 n
    pages.push('ellipsis-left');
    for (let i = totalPages - 4; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // In the middle: 1 ... current-1 current current+1 ... last
    pages.push('ellipsis-left');
    pages.push(currentPage - 1);
    pages.push(currentPage);
    pages.push(currentPage + 1);
    pages.push('ellipsis-right');
    pages.push(totalPages);
  }

  return pages;
};

/**
 * Reusable pagination component with previous/next buttons and page number buttons.
 * Supports ARIA labels for accessibility and disables navigation at boundaries.
 *
 * @param {Object} props
 * @param {number} props.currentPage - The current active page number (1-based).
 * @param {number} props.totalPages - The total number of pages.
 * @param {Function} props.onPageChange - Callback invoked when a page is selected. Receives the page number.
 * @param {string} [props.className] - Additional CSS class names to apply to the nav wrapper.
 * @returns {React.ReactElement|null} The rendered pagination component, or null if totalPages <= 1.
 */
function Pagination({ currentPage, totalPages, onPageChange, className = '' }) {
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  const pageRange = useMemo(
    () => getPageRange(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const handlePrevious = useCallback(() => {
    if (!isFirstPage && typeof onPageChange === 'function') {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, isFirstPage, onPageChange]);

  const handleNext = useCallback(() => {
    if (!isLastPage && typeof onPageChange === 'function') {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, isLastPage, onPageChange]);

  const handlePageClick = useCallback(
    (page) => {
      if (typeof onPageChange === 'function' && page !== currentPage) {
        onPageChange(page);
      }
    },
    [currentPage, onPageChange],
  );

  const handleKeyDown = useCallback(
    (event, page) => {
      if ((event.key === 'Enter' || event.key === ' ') && page !== currentPage) {
        event.preventDefault();
        if (typeof onPageChange === 'function') {
          onPageChange(page);
        }
      }
    },
    [currentPage, onPageChange],
  );

  if (!totalPages || totalPages <= 1) {
    return null;
  }

  const wrapperClassName = `pagination${className ? ` ${className}` : ''}`;

  return (
    <nav aria-label="Pagination" className={wrapperClassName}>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          flexWrap: 'wrap',
        }}
        role="list"
      >
        {/* Previous Button */}
        <li>
          <button
            type="button"
            className="button-secondary-2"
            onClick={handlePrevious}
            disabled={isFirstPage}
            aria-label="Go to previous page"
            aria-disabled={isFirstPage || undefined}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.875rem',
              minWidth: '2.25rem',
            }}
          >
            &laquo; Previous
          </button>
        </li>

        {/* Page Number Buttons */}
        {pageRange.map((page) => {
          if (typeof page === 'string') {
            return (
              <li key={page} aria-hidden="true">
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.375rem 0.5rem',
                    fontSize: '0.875rem',
                    color: 'var(--hb-gray-600, #6c757d)',
                    userSelect: 'none',
                  }}
                >
                  &hellip;
                </span>
              </li>
            );
          }

          const isActive = page === currentPage;

          return (
            <li key={page}>
              <button
                type="button"
                className={isActive ? 'button-primary' : 'button-secondary-2'}
                onClick={() => handlePageClick(page)}
                onKeyDown={(e) => handleKeyDown(e, page)}
                aria-label={isActive ? `Page ${page}, current page` : `Go to page ${page}`}
                aria-current={isActive ? 'page' : undefined}
                disabled={isActive}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.875rem',
                  minWidth: '2.25rem',
                }}
              >
                {page}
              </button>
            </li>
          );
        })}

        {/* Next Button */}
        <li>
          <button
            type="button"
            className="button-secondary-2"
            onClick={handleNext}
            disabled={isLastPage}
            aria-label="Go to next page"
            aria-disabled={isLastPage || undefined}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.875rem',
              minWidth: '2.25rem',
            }}
          >
            Next &raquo;
          </button>
        </li>
      </ul>

      <div className="hb-sr-only" aria-live="polite" aria-atomic="true">
        {`Page ${currentPage} of ${totalPages}`}
      </div>
    </nav>
  );
}

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  className: PropTypes.string,
};

export default Pagination;