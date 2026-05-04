import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSigners } from '../context/SignerContext.jsx';
import AccountService from '../services/AccountService.js';
import AuditLogger from '../services/AuditLogger.js';
import Alert from '../components/common/Alert.jsx';
import Button from '../components/common/Button.jsx';
import Pagination from '../components/common/Pagination.jsx';

/**
 * Number of accounts to display per page.
 * @type {number}
 */
const PAGE_SIZE = 6;

/**
 * Account selection page displaying a paginated list of business banking accounts.
 * Each account card shows masked account number (last 4 digits), account type,
 * and current signer count. User selects one account to proceed. Auto-selects
 * if only one account is available. Uses Pagination component and HB CSS grid layout.
 *
 * @returns {React.ReactElement} The rendered account selection screen component.
 */
function AccountSelectionScreen() {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const { selectAccount } = useSigners();

  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);

  /**
   * Redirect if not authenticated.
   */
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  /**
   * Load accounts on mount.
   */
  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      return;
    }

    try {
      AccountService.initialize();

      const userId = currentUser ? currentUser.id : null;
      const allAccounts = AccountService.getAccounts(userId);

      if (Array.isArray(allAccounts) && allAccounts.length > 0) {
        setAccounts(allAccounts);

        // Auto-select if only one account
        if (allAccounts.length === 1) {
          handleSelectAccount(allAccounts[0].id);
        }
      } else {
        setAccounts([]);
      }
    } catch (_error) {
      setError('Failed to load accounts. Please refresh the page and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading, currentUser]);

  /**
   * Calculates total pages based on accounts length and page size.
   */
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(accounts.length / PAGE_SIZE));
  }, [accounts.length]);

  /**
   * Returns the accounts for the current page.
   */
  const paginatedAccounts = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    return accounts.slice(startIndex, endIndex);
  }, [accounts, currentPage]);

  /**
   * Handles page change from the Pagination component.
   * @param {number} page - The new page number.
   */
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  /**
   * Handles selecting an account. Sets the account in SignerContext
   * and navigates to the dashboard/workflow.
   * @param {string} accountId - The account ID to select.
   */
  const handleSelectAccount = useCallback(
    (accountId) => {
      if (!accountId || isSelecting) {
        return;
      }

      setIsSelecting(true);
      setSelectedAccountId(accountId);
      setError(null);

      try {
        const result = selectAccount(accountId);

        if (result && result.status === 'success') {
          AuditLogger.logEvent('ACCOUNT_SELECTED_FROM_LIST', {
            userId: currentUser ? currentUser.id : 'unknown',
            accountId,
          });

          navigate('/dashboard', { replace: true });
        } else {
          const errorMessage =
            result && result.message
              ? result.message
              : 'Failed to select account. Please try again.';
          setError(errorMessage);
          setSelectedAccountId(null);
        }
      } catch (_error) {
        setError('An unexpected error occurred. Please try again.');
        setSelectedAccountId(null);
      } finally {
        setIsSelecting(false);
      }
    },
    [isSelecting, selectAccount, currentUser, navigate],
  );

  /**
   * Dismisses the error alert.
   */
  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  if (!isAuthenticated && !authLoading) {
    return null;
  }

  if (isLoading || authLoading) {
    return (
      <main className="fluid-wrapper" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div
          className="hb-d-flex hb-justify-content-center hb-align-items-center"
          style={{ minHeight: '50vh' }}
          role="status"
          aria-live="polite"
          aria-label="Loading accounts"
        >
          <span className="hb-spinner hb-spinner-lg" aria-hidden="true" />
          <span className="hb-sr-only">Loading accounts, please wait.</span>
        </div>
      </main>
    );
  }

  return (
    <main className="fluid-wrapper" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div className="hb-row hb-justify-content-center">
        <div className="hb-col-12 hb-col-md-10 hb-col-lg-8">
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--hb-primary, #00468b)',
              marginBottom: '0.5rem',
              textAlign: 'center',
              fontFamily: 'var(--hb-font-family, inherit)',
            }}
          >
            Select an Account
          </h1>
          <p
            className="hb-text-muted hb-text-center"
            style={{
              marginBottom: '1.5rem',
              fontFamily: 'var(--hb-font-family, inherit)',
            }}
          >
            Choose an account below to manage its signature card and signers.
          </p>

          {error && (
            <Alert
              type="error"
              message={error}
              dismissible={true}
              onDismiss={handleDismissError}
            />
          )}

          {accounts.length === 0 && (
            <div
              className="hb-card"
              style={{ textAlign: 'center', padding: '2rem' }}
            >
              <div className="hb-card-body">
                <p
                  className="hb-text-muted"
                  style={{
                    fontSize: '1rem',
                    margin: 0,
                    fontFamily: 'var(--hb-font-family, inherit)',
                  }}
                >
                  No accounts available. Please contact your administrator for access.
                </p>
              </div>
            </div>
          )}

          {accounts.length > 0 && (
            <>
              <div className="hb-row">
                {paginatedAccounts.map((account) => {
                  const isSelected = selectedAccountId === account.id;
                  const signerCount = account.signerCount
                    || (Array.isArray(account.signerIds) ? account.signerIds.length : 0);

                  return (
                    <div
                      key={account.id}
                      className="hb-col-12 hb-col-sm-6 hb-col-lg-4"
                      style={{ marginBottom: '1rem' }}
                    >
                      <div
                        className="hb-card"
                        style={{
                          height: '100%',
                          cursor: isSelecting ? 'not-allowed' : 'pointer',
                          border: isSelected
                            ? '2px solid var(--hb-primary, #00468b)'
                            : '1px solid var(--hb-gray-300, #dee2e6)',
                          transition: 'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                        }}
                        role="button"
                        tabIndex={isSelecting ? -1 : 0}
                        aria-label={`Select account ${account.accountName || ''} ending in ${account.accountNumberMasked ? account.accountNumberMasked.slice(-4) : ''}`}
                        aria-disabled={isSelecting || undefined}
                        aria-pressed={isSelected || undefined}
                        onClick={() => handleSelectAccount(account.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectAccount(account.id);
                          }
                        }}
                      >
                        <div className="hb-card-body">
                          {account.accountName && (
                            <h3
                              style={{
                                fontSize: '1.0625rem',
                                fontWeight: 600,
                                color: 'var(--hb-primary, #00468b)',
                                marginBottom: '0.5rem',
                                fontFamily: 'var(--hb-font-family, inherit)',
                              }}
                            >
                              {account.accountName}
                            </h3>
                          )}

                          <div
                            style={{
                              fontSize: '0.9375rem',
                              lineHeight: 1.7,
                              color: 'var(--hb-black, #292929)',
                              fontFamily: 'var(--hb-font-family, inherit)',
                            }}
                          >
                            <div
                              className="hb-d-flex hb-justify-content-between"
                              style={{ marginBottom: '0.25rem' }}
                            >
                              <span className="hb-text-muted">Account Number:</span>
                              <span style={{ fontWeight: 500 }}>
                                {account.accountNumberMasked || '****'}
                              </span>
                            </div>

                            <div
                              className="hb-d-flex hb-justify-content-between"
                              style={{ marginBottom: '0.25rem' }}
                            >
                              <span className="hb-text-muted">Account Type:</span>
                              <span style={{ fontWeight: 500 }}>
                                {account.accountType || 'N/A'}
                              </span>
                            </div>

                            <div className="hb-d-flex hb-justify-content-between">
                              <span className="hb-text-muted">Signers:</span>
                              <span style={{ fontWeight: 500 }}>
                                {signerCount}
                              </span>
                            </div>
                          </div>

                          {account.status && (
                            <div style={{ marginTop: '0.75rem' }}>
                              <span
                                className={
                                  account.status === 'Active'
                                    ? 'hb-badge hb-badge-success'
                                    : account.status === 'Pending'
                                      ? 'hb-badge hb-badge-warning'
                                      : 'hb-badge hb-badge-primary'
                                }
                              >
                                {account.status}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div
                  className="hb-d-flex hb-justify-content-center hb-mt-4"
                >
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}

              <div className="hb-sr-only" aria-live="polite" aria-atomic="true">
                {`Showing ${paginatedAccounts.length} of ${accounts.length} accounts. Page ${currentPage} of ${totalPages}.`}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default AccountSelectionScreen;