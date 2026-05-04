import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { SIGNER_STATUSES } from '../../constants/constants.js';

/**
 * Filter options for signer status.
 * @type {Array<{ value: string, label: string }>}
 */
const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: SIGNER_STATUSES.ACTIVE, label: SIGNER_STATUSES.ACTIVE },
  { value: SIGNER_STATUSES.PENDING, label: SIGNER_STATUSES.PENDING },
  { value: SIGNER_STATUSES.INACTIVE, label: SIGNER_STATUSES.INACTIVE },
  { value: SIGNER_STATUSES.REVOKED, label: SIGNER_STATUSES.REVOKED },
];

/**
 * Sort options for signer list.
 * @type {Array<{ value: string, label: string }>}
 */
const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
  { value: 'status-asc', label: 'Status (A–Z)' },
  { value: 'status-desc', label: 'Status (Z–A)' },
  { value: 'role-asc', label: 'Role (A–Z)' },
  { value: 'role-desc', label: 'Role (Z–A)' },
];

/**
 * Signer list filter/sort controls component.
 * Provides a dropdown for filtering by status (All, Active, Pending, Inactive, Revoked)
 * and a dropdown for sorting by name, status, or role. Uses HB CSS form styling.
 *
 * @param {Object} props
 * @param {Function} props.onFilterChange - Callback invoked when the status filter changes. Receives the selected status value.
 * @param {Function} props.onSortChange - Callback invoked when the sort selection changes. Receives the selected sort value (e.g., 'name-asc').
 * @param {string} [props.currentFilter=''] - The currently active status filter value.
 * @param {string} [props.currentSort='name-asc'] - The currently active sort value.
 * @param {boolean} [props.disabled=false] - Whether the controls should be disabled.
 * @param {string} [props.className] - Additional CSS class names to apply to the wrapper.
 * @returns {React.ReactElement} The rendered signer filter component.
 */
function SignerFilter({
  onFilterChange,
  onSortChange,
  currentFilter = '',
  currentSort = 'name-asc',
  disabled = false,
  className = '',
}) {
  /**
   * Handles status filter dropdown change.
   * @param {React.ChangeEvent<HTMLSelectElement>} event - The change event.
   */
  const handleFilterChange = useCallback(
    (event) => {
      if (typeof onFilterChange === 'function') {
        onFilterChange(event.target.value);
      }
    },
    [onFilterChange],
  );

  /**
   * Handles sort dropdown change.
   * @param {React.ChangeEvent<HTMLSelectElement>} event - The change event.
   */
  const handleSortChange = useCallback(
    (event) => {
      if (typeof onSortChange === 'function') {
        onSortChange(event.target.value);
      }
    },
    [onSortChange],
  );

  const wrapperClassName = `signer-filter${className ? ` ${className}` : ''}`;

  return (
    <div
      className={wrapperClassName}
      role="group"
      aria-label="Signer list filter and sort controls"
    >
      <div
        className="hb-d-flex hb-align-items-center hb-gap-3 hb-flex-wrap"
        style={{ marginBottom: '1rem' }}
      >
        {/* Status Filter */}
        <div className="hb-d-flex hb-align-items-center hb-gap-2">
          <label
            htmlFor="signer-status-filter"
            style={{
              fontSize: '0.9375rem',
              fontWeight: 500,
              color: 'var(--hb-gray-700, #495057)',
              fontFamily: 'var(--hb-font-family, inherit)',
              whiteSpace: 'nowrap',
            }}
          >
            Filter by Status:
          </label>
          <select
            id="signer-status-filter"
            className="hb-form-control"
            value={currentFilter}
            onChange={handleFilterChange}
            disabled={disabled}
            aria-label="Filter signers by status"
            style={{
              width: 'auto',
              minWidth: '10rem',
              height: '2.5rem',
              padding: '0.375rem 0.75rem',
              fontSize: '0.9375rem',
            }}
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Control */}
        <div className="hb-d-flex hb-align-items-center hb-gap-2">
          <label
            htmlFor="signer-sort"
            style={{
              fontSize: '0.9375rem',
              fontWeight: 500,
              color: 'var(--hb-gray-700, #495057)',
              fontFamily: 'var(--hb-font-family, inherit)',
              whiteSpace: 'nowrap',
            }}
          >
            Sort by:
          </label>
          <select
            id="signer-sort"
            className="hb-form-control"
            value={currentSort}
            onChange={handleSortChange}
            disabled={disabled}
            aria-label="Sort signers"
            style={{
              width: 'auto',
              minWidth: '10rem',
              height: '2.5rem',
              padding: '0.375rem 0.75rem',
              fontSize: '0.9375rem',
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Screen reader live region for filter/sort changes */}
      <div className="hb-sr-only" aria-live="polite" aria-atomic="true">
        {currentFilter
          ? `Filtered by status: ${currentFilter}.`
          : 'Showing all statuses.'}
        {` Sorted by ${currentSort.replace('-', ' ')}.`}
      </div>
    </div>
  );
}

SignerFilter.propTypes = {
  onFilterChange: PropTypes.func.isRequired,
  onSortChange: PropTypes.func.isRequired,
  currentFilter: PropTypes.string,
  currentSort: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default SignerFilter;