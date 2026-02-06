/**
 * Quotations Page
 *
 * Displays all quotations in a hybrid view:
 * - Desktop (>=768px): Table view
 * - Mobile (<768px): Card view
 *
 * Features filter tabs:
 * - All: Shows all quotations
 * - My Work: Shows quotations prepared by the logged-in user
 * - Pending Payment: Shows delivered quotations not fully paid
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { QuotationModal } from '../components/QuotationModal';
import { LeadModal } from '../components/LeadModal';
import { useAuthStore } from '../store/authStore';
import { useModalHistory } from '../hooks/useModalHistory';
import {
  fetchQuotations,
  deleteQuotation,
  createQuotation,
  updateQuotation,
  fetchLookups,
  fetchUsers,
  fetchLeadsByIds,
  searchLeads,
  fetchVisitsByLeadId,
  fetchDeliveredQuotations,
  getPaymentTotalsByQuoteIds,
} from '../services/backend';
import { countQuotations } from '../services/supabase/quotations';
import type { Quotation, Lead, TalukWithDistrict } from '../types';
import './QuotationsPage.css';

const PAGE_SIZE = 50;

type ModalMode = 'view' | 'add' | 'edit';
type FilterTab = 'all' | 'my-work' | 'pending-payment';

// Extended quotation with balance info for pending payment view
interface QuotationWithBalance extends Quotation {
  totalPaid: number;
  balance: number;
}

const emptyLookups = {
  districts: [] as string[],
  taluks: [] as TalukWithDistrict[],
  cropTypes: [] as string[],
  leadSources: [] as string[],
  leadStatuses: [] as string[],
  irrigationTypes: [] as string[],
  visitStatuses: [] as string[],
  visitOutcomes: [] as string[],
  cropConditions: [] as string[],
  quotationStatuses: [] as string[],
  deliveryStatuses: [] as string[],
  users: [] as Array<{ email: string; role: string }>,
};

export function QuotationsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasMore, setHasMore] = useState(true);

  // Filter tab state
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [pendingPaymentQuotations, setPendingPaymentQuotations] = useState<QuotationWithBalance[]>([]);
  const [tabCounts, setTabCounts] = useState({ all: 0, myWork: 0, pendingPayment: 0 });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [lookups, setLookups] = useState(emptyLookups);

  // Lead lookup map for displaying farmer names
  const [leadMap, setLeadMap] = useState<Map<string, Lead>>(new Map());

  // Lead modal state for viewing lead details when clicking on lead ID
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Check if any modal is open
  const isAnyModalOpen = modalOpen || leadModalOpen;

  // Close all modals
  const closeAllModals = useCallback(() => {
    setModalOpen(false);
    setSelectedQuotation(null);
    setLeadModalOpen(false);
    setSelectedLead(null);
  }, []);

  // Handle back gesture to close modals
  const { closeWithHistory } = useModalHistory({
    isOpen: isAnyModalOpen,
    onClose: closeAllModals,
  });

  // Load lookups on mount
  useEffect(() => {
    loadLookups();
  }, []);

  // Load data when tab changes
  useEffect(() => {
    loadDataForTab();
  }, [activeTab, user?.email]);

  const loadLookups = async () => {
    try {
      const [lookupsData, usersData] = await Promise.all([
        fetchLookups(),
        fetchUsers(),
      ]);
      setLookups({ ...lookupsData, users: usersData });
    } catch (err) {
      console.error('Failed to fetch lookups:', err);
    }
  };

  // Fetch leads for the currently displayed quotations
  const loadLeadsForQuotations = useCallback(async (quotationList: Quotation[]) => {
    try {
      const leadIds = [...new Set(quotationList.map(q => q.leadId).filter(Boolean))];
      const newLeadIds = leadIds.filter(id => !leadMap.has(id));

      if (newLeadIds.length > 0) {
        const newLeads = await fetchLeadsByIds(newLeadIds);
        setLeadMap(prevMap => {
          const newMap = new Map(prevMap);
          newLeads.forEach((lead) => newMap.set(lead.id, lead));
          return newMap;
        });
      }
    } catch (err) {
      console.error('Failed to fetch leads for quotations:', err);
    }
  }, [leadMap]);

  const loadDataForTab = async () => {
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'all') {
        await loadAllQuotations();
      } else if (activeTab === 'my-work') {
        await loadMyWorkQuotations();
      } else if (activeTab === 'pending-payment') {
        await loadPendingPaymentQuotations();
      }

      // Update tab counts in background
      updateTabCounts();
    } catch (err) {
      console.error('Failed to load quotations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  const loadAllQuotations = async () => {
    const data = await fetchQuotations(PAGE_SIZE);
    setQuotations(data);
    setHasMore(data.length >= PAGE_SIZE);
    await loadLeadsForQuotations(data);
  };

  const loadMyWorkQuotations = async () => {
    if (!user?.email) return;
    const data = await fetchQuotations(PAGE_SIZE, 0, undefined, user.email);
    setQuotations(data);
    setHasMore(data.length >= PAGE_SIZE);
    await loadLeadsForQuotations(data);
  };

  const loadPendingPaymentQuotations = async () => {
    // Fetch delivered quotations
    const deliveredQuotes = await fetchDeliveredQuotations();

    if (deliveredQuotes.length === 0) {
      setPendingPaymentQuotations([]);
      setHasMore(false);
      return;
    }

    // Get payment totals for all delivered quotations
    const quoteIds = deliveredQuotes.map(q => q.id);
    const paymentTotals = await getPaymentTotalsByQuoteIds(quoteIds);

    // Calculate balance and filter those with pending balance
    const withBalance: QuotationWithBalance[] = deliveredQuotes
      .map(q => {
        const totalPaid = paymentTotals.get(q.id) || 0;
        const balance = q.quoteAmount - totalPaid;
        return { ...q, totalPaid, balance };
      })
      .filter(q => q.balance > 0); // Only show those with pending balance

    setPendingPaymentQuotations(withBalance);
    await loadLeadsForQuotations(withBalance);
    setHasMore(false); // No pagination for this view
  };

  const updateTabCounts = async () => {
    try {
      // Count-only queries for "All" and "My Work" (no row data transferred)
      const [allCount, myCount, deliveredQuotes] = await Promise.all([
        countQuotations(),
        user?.email ? countQuotations(user.email) : Promise.resolve(0),
        fetchDeliveredQuotations(),
      ]);

      // For pending payment, we still need row data to calculate balances
      let pendingPaymentCount = 0;
      if (deliveredQuotes.length > 0) {
        const quoteIds = deliveredQuotes.map(q => q.id);
        const paymentTotals = await getPaymentTotalsByQuoteIds(quoteIds);
        pendingPaymentCount = deliveredQuotes.filter(q => {
          const totalPaid = paymentTotals.get(q.id) || 0;
          return q.quoteAmount - totalPaid > 0;
        }).length;
      }

      setTabCounts({
        all: allCount,
        myWork: myCount,
        pendingPayment: pendingPaymentCount,
      });
    } catch (err) {
      console.error('Failed to update tab counts:', err);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || activeTab === 'pending-payment') return;

    setLoadingMore(true);

    try {
      const offset = quotations.length;
      const preparedBy = activeTab === 'my-work' ? user?.email : undefined;
      const data = await fetchQuotations(PAGE_SIZE, offset, undefined, preparedBy);

      if (data.length === 0) {
        setHasMore(false);
      } else {
        setQuotations((prev) => [...prev, ...data]);
        setHasMore(data.length >= PAGE_SIZE);
        await loadLeadsForQuotations(data);
      }
    } catch (err) {
      console.error('Failed to load more quotations:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.email) return;

    if (!confirm('Are you sure you want to delete this quotation?')) return;

    try {
      await deleteQuotation(id, user.email);
      await loadDataForTab();
    } catch (err) {
      console.error('Failed to delete quotation:', err);
      alert('Failed to delete quotation. Please try again.');
    }
  };

  const openModal = (mode: ModalMode, quotation?: Quotation) => {
    setModalMode(mode);
    setSelectedQuotation(quotation || null);
    setModalOpen(true);
  };

  const closeModal = () => {
    closeWithHistory();
  };

  const handleSave = async (quotationData: Partial<Quotation>): Promise<string | void> => {
    if (!user?.email) throw new Error('Not authenticated');

    if (modalMode === 'add') {
      const created = await createQuotation({
        ...quotationData,
        preparedBy: quotationData.preparedBy || user.email,
      } as Omit<Quotation, 'id' | 'rowNumber' | 'displayId' | 'lastUpdated' | 'isDeleted' | 'deletedBy' | 'deletedDate' | 'deleteReason'>);
      await loadDataForTab();
      return created.id;
    } else if (modalMode === 'edit' && selectedQuotation) {
      await updateQuotation(selectedQuotation.id, quotationData);
      await loadDataForTab();
      return selectedQuotation.id;
    }

    await loadDataForTab();
  };

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    setSearchTerm(''); // Clear search when switching tabs
  };

  // Navigate to payments page filtered by quotation
  const viewPayments = (quoteId: string) => {
    navigate(`/payments?quoteId=${quoteId}`);
  };

  // Get farmer name from lead map
  const getFarmerName = (leadId: string): string => {
    const lead = leadMap.get(leadId);
    return lead ? lead.farmerName : 'Unknown';
  };

  const getLeadDisplayId = (leadId: string): string => {
    const lead = leadMap.get(leadId);
    return lead ? lead.displayId : '';
  };

  // Handle clicking on lead ID to open lead details modal
  const handleLeadClick = (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const lead = leadMap.get(leadId);
    if (lead) {
      setSelectedLead(lead);
      setLeadModalOpen(true);
    }
  };

  const closeLeadModal = () => {
    closeWithHistory();
  };

  // Dummy save for lead modal (view only)
  const handleLeadSave = async () => {};

  // Format date for display
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Get display data based on active tab
  const getDisplayQuotations = (): (Quotation | QuotationWithBalance)[] => {
    if (activeTab === 'pending-payment') {
      return pendingPaymentQuotations;
    }
    return quotations;
  };

  // Filter quotations by search term
  const filteredQuotations = getDisplayQuotations().filter((quotation) => {
    const farmerName = getFarmerName(quotation.leadId).toLowerCase();
    const leadDisplayId = getLeadDisplayId(quotation.leadId).toLowerCase();
    const term = searchTerm.toLowerCase();

    return (
      quotation.displayId.toLowerCase().includes(term) ||
      farmerName.includes(term) ||
      leadDisplayId.includes(term) ||
      quotation.status.toLowerCase().includes(term) ||
      quotation.preparedBy.toLowerCase().includes(term)
    );
  });

  // Check if quotation has balance info
  const hasBalance = (q: Quotation | QuotationWithBalance): q is QuotationWithBalance => {
    return 'balance' in q;
  };

  return (
    <Layout>
      <div className="quotations-page">
        <div className="page-header">
          <h1>Quotations</h1>
          <button className="btn-primary" onClick={() => openModal('add')}>
            + Create Quotation
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button
            className={`filter-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => handleTabChange('all')}
          >
            All {tabCounts.all > 0 && `(${tabCounts.all})`}
          </button>
          <button
            className={`filter-tab ${activeTab === 'my-work' ? 'active' : ''}`}
            onClick={() => handleTabChange('my-work')}
          >
            My Work {tabCounts.myWork > 0 && `(${tabCounts.myWork})`}
          </button>
          <button
            className={`filter-tab ${activeTab === 'pending-payment' ? 'active' : ''}`}
            onClick={() => handleTabChange('pending-payment')}
          >
            Pending Payment {tabCounts.pendingPayment > 0 && `(${tabCounts.pendingPayment})`}
          </button>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search quotations by ID, farmer, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {loading && <LoadingSpinner message="Loading quotations..." fullPage />}
        {error && <p className="error-text">Error: {error}</p>}

        {!loading && !error && (
          <>
            {/* Desktop: Table View */}
            <div className="table-view">
              <table className="quotations-table">
                <thead>
                  <tr>
                    <th>Quote ID</th>
                    <th>Farmer</th>
                    <th>Date</th>
                    <th>Amount</th>
                    {activeTab === 'pending-payment' && <th>Paid</th>}
                    {activeTab === 'pending-payment' && <th>Balance</th>}
                    <th>Valid Until</th>
                    <th>Prepared By</th>
                    <th>Status</th>
                    {activeTab === 'pending-payment' && <th>Delivery</th>}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotations.map((quotation) => (
                    <tr key={quotation.id}>
                      <td>{quotation.displayId}</td>
                      <td>
                        <div className="farmer-cell">
                          <span className="farmer-name">{getFarmerName(quotation.leadId)}</span>
                          <span className="lead-id clickable" onClick={(e) => handleLeadClick(quotation.leadId, e)}>{getLeadDisplayId(quotation.leadId)}</span>
                        </div>
                      </td>
                      <td>{formatDate(quotation.quoteDate)}</td>
                      <td className="amount-cell">{formatCurrency(quotation.quoteAmount)}</td>
                      {activeTab === 'pending-payment' && (
                        <>
                          <td className="paid-cell">
                            {hasBalance(quotation) ? formatCurrency(quotation.totalPaid) : '-'}
                          </td>
                          <td className="balance-cell">
                            {hasBalance(quotation) ? formatCurrency(quotation.balance) : '-'}
                          </td>
                        </>
                      )}
                      <td>{formatDate(quotation.validUntil)}</td>
                      <td>{quotation.preparedBy.split('@')[0]}</td>
                      <td>
                        <span className={`status-badge ${quotation.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {quotation.status}
                        </span>
                      </td>
                      {activeTab === 'pending-payment' && (
                        <td>
                          <span className={`delivery-badge ${(quotation.deliveryStatus || '').toLowerCase()}`}>
                            {quotation.deliveryStatus || '-'}
                          </span>
                        </td>
                      )}
                      <td className="actions">
                        <button
                          className="btn-icon"
                          title="View"
                          onClick={() => openModal('view', quotation)}
                        >
                          👁️
                        </button>
                        <button
                          className="btn-icon"
                          title="Edit"
                          onClick={() => openModal('edit', quotation)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon"
                          title="See Payments"
                          onClick={() => viewPayments(quotation.id)}
                        >
                          💰
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          title="Delete"
                          onClick={() => handleDelete(quotation.id)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredQuotations.length === 0 && (
                <p className="no-data">
                  {activeTab === 'pending-payment'
                    ? 'No pending payments found. All delivered quotations are fully paid!'
                    : activeTab === 'my-work'
                    ? 'No quotations prepared by you. Create your first quotation!'
                    : 'No quotations found. Create your first quotation!'}
                </p>
              )}
            </div>

            {/* Load More Button */}
            {hasMore && filteredQuotations.length > 0 && activeTab !== 'pending-payment' && (
              <div className="load-more-container">
                <button
                  className="btn-load-more"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
                <p className="quotations-count">Showing {quotations.length} quotations</p>
              </div>
            )}

            {!hasMore && getDisplayQuotations().length > 0 && (
              <p className="quotations-count center">
                All {getDisplayQuotations().length} quotations loaded
              </p>
            )}

            {/* Mobile: Card View */}
            <div className="card-view">
              {filteredQuotations.map((quotation) => (
                <div key={quotation.id} className="quotation-card">
                  <div className="card-header">
                    <span className="quotation-id">{quotation.displayId}</span>
                    <span className={`status-badge ${quotation.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {quotation.status}
                    </span>
                  </div>
                  <h3 className="farmer-name">{getFarmerName(quotation.leadId)}</h3>
                  <p className="card-info">
                    <span className="lead-ref clickable" onClick={(e) => handleLeadClick(quotation.leadId, e)}>{getLeadDisplayId(quotation.leadId)}</span>
                  </p>
                  <p className="card-info amount">
                    {formatCurrency(quotation.quoteAmount)}
                  </p>
                  {activeTab === 'pending-payment' && (
                    <div className="balance-info">
                      <p className="card-info">
                        Paid: <span className="paid-amount">
                          {hasBalance(quotation) ? formatCurrency(quotation.totalPaid) : '-'}
                        </span>
                      </p>
                      <p className="card-info">
                        Balance Due: <span className="balance-amount">
                          {hasBalance(quotation) ? formatCurrency(quotation.balance) : '-'}
                        </span>
                      </p>
                    </div>
                  )}
                  <p className="card-info">
                    📅 Date: {formatDate(quotation.quoteDate)}
                  </p>
                  <p className="card-info">
                    ⏳ Valid until: {formatDate(quotation.validUntil)}
                  </p>
                  {activeTab === 'pending-payment' && quotation.deliveryStatus && (
                    <p className="card-info">
                      🚚 Delivery: {quotation.deliveryStatus}
                    </p>
                  )}
                  <div className="card-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => openModal('view', quotation)}
                    >
                      View Details
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => openModal('edit', quotation)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-secondary btn-payments"
                      onClick={() => viewPayments(quotation.id)}
                    >
                      See Payments
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => handleDelete(quotation.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {filteredQuotations.length === 0 && (
                <p className="no-data">
                  {activeTab === 'pending-payment'
                    ? 'No pending payments found. All delivered quotations are fully paid!'
                    : activeTab === 'my-work'
                    ? 'No quotations prepared by you. Create your first quotation!'
                    : 'No quotations found. Create your first quotation!'}
                </p>
              )}

              {/* Load More for Mobile */}
              {hasMore && filteredQuotations.length > 0 && activeTab !== 'pending-payment' && (
                <div className="load-more-container">
                  <button
                    className="btn-load-more"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </button>
                  <p className="quotations-count">Showing {quotations.length} quotations</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <QuotationModal
        isOpen={modalOpen}
        mode={modalMode}
        quotation={selectedQuotation}
        leadMap={leadMap}
        onSearchLeads={searchLeads}
        onFetchVisitsByLead={fetchVisitsByLeadId}
        lookups={lookups}
        onClose={closeModal}
        onSave={handleSave}
      />

      {/* Lead Modal for viewing lead details when clicking on lead ID */}
      <LeadModal
        isOpen={leadModalOpen}
        mode="view"
        lead={selectedLead}
        lookups={lookups}
        onClose={closeLeadModal}
        onSave={handleLeadSave}
      />

    </Layout>
  );
}
