/**
 * Payments Page
 *
 * Displays all payments in a hybrid view:
 * - Desktop (>=768px): Table view
 * - Mobile (<768px): Card view
 *
 * Payments are linked to Quotations (only "Accepted" quotations)
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PaymentModal } from '../components/PaymentModal';
import { QuotationModal } from '../components/QuotationModal';
import { LeadModal } from '../components/LeadModal';
import { useAuthStore } from '../store/authStore';
import { useModalHistory } from '../hooks/useModalHistory';
import {
  fetchPayments,
  deletePayment,
  createPayment,
  updatePayment,
  fetchLookups,
  fetchUsers,
  fetchQuotationsByIds,
  fetchLeadsByIds,
  searchAcceptedQuotations,
  fetchPaymentsByQuoteId,
  searchLeads,
  fetchVisitsByLeadId,
} from '../services/backend';
import type { Payment, Quotation, Lead, TalukWithDistrict } from '../types';

const PAGE_SIZE = 50;

type ModalMode = 'view' | 'add' | 'edit';

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
  paymentTypes: [] as string[],
  paymentMethods: [] as string[],
  users: [] as Array<{ email: string; role: string }>,
};

export function PaymentsPage() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get quoteId filter from URL params
  const filterQuoteId = searchParams.get('quoteId');

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasMore, setHasMore] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [lookups, setLookups] = useState(emptyLookups);

  // Quotation and Lead lookup maps for displaying info
  const [quotationMap, setQuotationMap] = useState<Map<string, Quotation>>(new Map());
  const [leadMap, setLeadMap] = useState<Map<string, Lead>>(new Map());

  // Quotation modal state for viewing quotation details when clicking on quote ID
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  // Lead modal state for viewing lead details when clicking on lead ID
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Check if any modal is open
  const isAnyModalOpen = modalOpen || quotationModalOpen || leadModalOpen;

  // Close all modals
  const closeAllModals = useCallback(() => {
    setModalOpen(false);
    setSelectedPayment(null);
    setQuotationModalOpen(false);
    setSelectedQuotation(null);
    setLeadModalOpen(false);
    setSelectedLead(null);
  }, []);

  // Handle back gesture to close modals
  const { closeWithHistory } = useModalHistory({
    isOpen: isAnyModalOpen,
    onClose: closeAllModals,
  });

  // Fetch payments and lookups on mount or when filter changes
  useEffect(() => {
    loadPayments();
    loadLookups();
  }, [filterQuoteId]);

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

  // Fetch quotations and leads for the currently displayed payments
  const loadQuotationsAndLeadsForPayments = async (paymentList: Payment[]) => {
    try {
      // Get unique quote IDs from payments
      const quoteIds = [...new Set(paymentList.map(p => p.quoteId).filter(Boolean))];

      // Only fetch quotations we don't already have
      const newQuoteIds = quoteIds.filter(id => !quotationMap.has(id));

      if (newQuoteIds.length > 0) {
        const newQuotations = await fetchQuotationsByIds(newQuoteIds);
        const newQuoteMap = new Map(quotationMap);
        newQuotations.forEach((q) => newQuoteMap.set(q.id, q));
        setQuotationMap(newQuoteMap);

        // Now fetch leads for these quotations
        const leadIds = [...new Set(newQuotations.map(q => q.leadId).filter(Boolean))];
        const newLeadIds = leadIds.filter(id => !leadMap.has(id));

        if (newLeadIds.length > 0) {
          const newLeads = await fetchLeadsByIds(newLeadIds);
          const newLeadMap = new Map(leadMap);
          newLeads.forEach((lead) => newLeadMap.set(lead.id, lead));
          setLeadMap(newLeadMap);
        }
      }
    } catch (err) {
      console.error('Failed to fetch quotations/leads for payments:', err);
    }
  };

  const loadPayments = async () => {
    setLoading(true);
    setError(null);

    try {
      let data: Payment[];
      if (filterQuoteId) {
        // Filter by specific quotation
        data = await fetchPaymentsByQuoteId(filterQuoteId);
        setHasMore(false); // No pagination when filtering
      } else {
        data = await fetchPayments(PAGE_SIZE);
        setHasMore(data.length >= PAGE_SIZE);
      }
      setPayments(data);

      // Fetch quotation and lead info for these payments
      await loadQuotationsAndLeadsForPayments(data);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);

    try {
      const offset = payments.length;
      const data = await fetchPayments(PAGE_SIZE, offset);

      if (data.length === 0) {
        setHasMore(false);
      } else {
        setPayments((prev) => [...prev, ...data]);
        setHasMore(data.length >= PAGE_SIZE);

        // Fetch quotation and lead info for newly loaded payments
        await loadQuotationsAndLeadsForPayments(data);
      }
    } catch (err) {
      console.error('Failed to load more payments:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.email) return;

    if (!confirm('Are you sure you want to delete this payment?')) return;

    try {
      await deletePayment(id, user.email);
      await loadPayments();
    } catch (err) {
      console.error('Failed to delete payment:', err);
      alert('Failed to delete payment. Please try again.');
    }
  };

  const openModal = (mode: ModalMode, payment?: Payment) => {
    setModalMode(mode);
    setSelectedPayment(payment || null);
    setModalOpen(true);
  };

  const closeModal = () => {
    closeWithHistory();
  };

  const handleSave = async (paymentData: Partial<Payment>) => {
    if (!user?.email) throw new Error('Not authenticated');

    if (modalMode === 'add') {
      await createPayment({
        ...paymentData,
        receivedBy: paymentData.receivedBy || user.email,
      } as Omit<Payment, 'id' | 'rowNumber' | 'displayId' | 'isDeleted' | 'deletedBy' | 'deletedDate' | 'deleteReason'>);
    } else if (modalMode === 'edit' && selectedPayment) {
      await updatePayment(selectedPayment.id, paymentData);
    }

    await loadPayments();
  };

  // Get quotation info from map
  const getQuotationDisplayId = (quoteId: string): string => {
    const quotation = quotationMap.get(quoteId);
    return quotation ? quotation.displayId : 'Unknown';
  };

  const getQuotationAmount = (quoteId: string): number => {
    const quotation = quotationMap.get(quoteId);
    return quotation ? quotation.quoteAmount : 0;
  };

  // Get farmer name from lead map via quotation
  const getFarmerName = (quoteId: string): string => {
    const quotation = quotationMap.get(quoteId);
    if (!quotation) return 'Unknown';
    const lead = leadMap.get(quotation.leadId);
    return lead ? lead.farmerName : 'Unknown';
  };

  // Get lead display ID from lead map via quotation
  const getLeadDisplayId = (quoteId: string): string => {
    const quotation = quotationMap.get(quoteId);
    if (!quotation) return '';
    const lead = leadMap.get(quotation.leadId);
    return lead ? lead.displayId : '';
  };

  // Handle clicking on quotation ID to open quotation details modal
  const handleQuotationClick = (quoteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const quotation = quotationMap.get(quoteId);
    if (quotation) {
      setSelectedQuotation(quotation);
      setQuotationModalOpen(true);
    }
  };

  // Handle clicking on lead ID to open lead details modal
  const handleLeadClick = (quoteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const quotation = quotationMap.get(quoteId);
    if (quotation) {
      const lead = leadMap.get(quotation.leadId);
      if (lead) {
        setSelectedLead(lead);
        setLeadModalOpen(true);
      }
    }
  };

  const closeQuotationModal = () => {
    closeWithHistory();
  };

  const closeLeadModal = () => {
    closeWithHistory();
  };

  // Dummy save handlers for view-only modals
  const handleQuotationSave = async () => {};
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

  // Filter payments by search term
  const filteredPayments = payments.filter((payment) => {
    const quoteDisplayId = getQuotationDisplayId(payment.quoteId).toLowerCase();
    const farmerName = getFarmerName(payment.quoteId).toLowerCase();
    const term = searchTerm.toLowerCase();

    return (
      payment.displayId.toLowerCase().includes(term) ||
      quoteDisplayId.includes(term) ||
      farmerName.includes(term) ||
      payment.paymentType.toLowerCase().includes(term) ||
      payment.paymentMethod.toLowerCase().includes(term) ||
      payment.receivedBy.toLowerCase().includes(term)
    );
  });

  // Clear the quote filter
  const clearFilter = () => {
    setSearchParams({});
  };

  // Get filtered quotation info for display
  const getFilteredQuotationInfo = () => {
    if (!filterQuoteId) return null;
    const quotation = quotationMap.get(filterQuoteId);
    if (!quotation) {
      // Only show loading if still loading, otherwise return null to hide filter indicator
      return loading ? { displayId: 'Loading...', farmerName: '' } : null;
    }
    const lead = leadMap.get(quotation.leadId);
    return {
      displayId: quotation.displayId,
      farmerName: lead?.farmerName || 'Unknown',
      amount: quotation.quoteAmount,
    };
  };

  const filteredQuotationInfo = getFilteredQuotationInfo();

  return (
    <Layout>
      <div className="payments-page">
        <div className="page-header">
          <h1>Payments</h1>
          <button className="btn-primary" onClick={() => openModal('add')}>
            + Record Payment
          </button>
        </div>

        {/* Filter indicator when viewing payments for specific quotation */}
        {filterQuoteId && filteredQuotationInfo && (
          <div className="filter-indicator">
            <span className="filter-text">
              Showing payments for: <strong>{filteredQuotationInfo.displayId}</strong>
              {filteredQuotationInfo.farmerName && ` - ${filteredQuotationInfo.farmerName}`}
              {filteredQuotationInfo.amount && ` (${formatCurrency(filteredQuotationInfo.amount)})`}
            </span>
            <button className="btn-clear-filter" onClick={clearFilter}>
              Show All Payments
            </button>
          </div>
        )}

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search payments by ID, farmer, quote, type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {loading && <LoadingSpinner message="Loading payments..." fullPage />}
        {error && <p className="error-text">Error: {error}</p>}

        {!loading && !error && (
          <>
            {/* Desktop: Table View */}
            <div className="table-view">
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Quote</th>
                    <th>Farmer</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>Method</th>
                    <th>Received By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.displayId}</td>
                      <td>
                        <div className="quote-cell">
                          <span className="quote-id clickable" onClick={(e) => handleQuotationClick(payment.quoteId, e)}>{getQuotationDisplayId(payment.quoteId)}</span>
                          <span className="quote-amount">{formatCurrency(getQuotationAmount(payment.quoteId))}</span>
                        </div>
                      </td>
                      <td>
                        <div className="farmer-cell">
                          <span className="farmer-name">{getFarmerName(payment.quoteId)}</span>
                          <span className="lead-id clickable" onClick={(e) => handleLeadClick(payment.quoteId, e)}>{getLeadDisplayId(payment.quoteId)}</span>
                        </div>
                      </td>
                      <td>{formatDate(payment.paymentDate)}</td>
                      <td className="amount-cell">{formatCurrency(payment.paymentAmount)}</td>
                      <td>
                        <span className={`type-badge ${payment.paymentType.toLowerCase()}`}>
                          {payment.paymentType}
                        </span>
                      </td>
                      <td>{payment.paymentMethod}</td>
                      <td>{payment.receivedBy.split('@')[0]}</td>
                      <td className="actions">
                        <button
                          className="btn-icon"
                          title="View"
                          onClick={() => openModal('view', payment)}
                        >
                          👁️
                        </button>
                        <button
                          className="btn-icon"
                          title="Edit"
                          onClick={() => openModal('edit', payment)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          title="Delete"
                          onClick={() => handleDelete(payment.id)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredPayments.length === 0 && (
                <p className="no-data">No payments found. Record your first payment!</p>
              )}
            </div>

            {/* Load More Button */}
            {hasMore && filteredPayments.length > 0 && (
              <div className="load-more-container">
                <button
                  className="btn-load-more"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
                <p className="payments-count">Showing {payments.length} payments</p>
              </div>
            )}

            {!hasMore && payments.length > 0 && (
              <p className="payments-count center">All {payments.length} payments loaded</p>
            )}

            {/* Mobile: Card View */}
            <div className="card-view">
              {filteredPayments.map((payment) => (
                <div key={payment.id} className="payment-card">
                  <div className="card-header">
                    <span className="payment-id">{payment.displayId}</span>
                    <span className={`type-badge ${payment.paymentType.toLowerCase()}`}>
                      {payment.paymentType}
                    </span>
                  </div>
                  <h3 className="farmer-name">{getFarmerName(payment.quoteId)}</h3>
                  <p className="card-info">
                    <span className="lead-ref clickable" onClick={(e) => handleLeadClick(payment.quoteId, e)}>{getLeadDisplayId(payment.quoteId)}</span>
                  </p>
                  <p className="card-info">
                    <span className="quote-ref clickable" onClick={(e) => handleQuotationClick(payment.quoteId, e)}>{getQuotationDisplayId(payment.quoteId)}</span>
                    <span className="quote-amount-small">({formatCurrency(getQuotationAmount(payment.quoteId))})</span>
                  </p>
                  <p className="card-info amount">
                    {formatCurrency(payment.paymentAmount)}
                  </p>
                  <p className="card-info">
                    📅 {formatDate(payment.paymentDate)} | 💳 {payment.paymentMethod}
                  </p>
                  <div className="card-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => openModal('view', payment)}
                    >
                      View Details
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => openModal('edit', payment)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => handleDelete(payment.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {filteredPayments.length === 0 && (
                <p className="no-data">No payments found. Record your first payment!</p>
              )}

              {/* Load More for Mobile */}
              {hasMore && filteredPayments.length > 0 && (
                <div className="load-more-container">
                  <button
                    className="btn-load-more"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </button>
                  <p className="payments-count">Showing {payments.length} payments</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <PaymentModal
        isOpen={modalOpen}
        mode={modalMode}
        payment={selectedPayment}
        quotationMap={quotationMap}
        leadMap={leadMap}
        existingPayments={payments}
        onSearchQuotations={searchAcceptedQuotations}
        onFetchPaymentsByQuote={fetchPaymentsByQuoteId}
        onFetchLeadsByIds={fetchLeadsByIds}
        lookups={lookups}
        onClose={closeModal}
        onSave={handleSave}
      />

      {/* Quotation Modal for viewing quotation details when clicking on quote ID */}
      <QuotationModal
        isOpen={quotationModalOpen}
        mode="view"
        quotation={selectedQuotation}
        leadMap={leadMap}
        onSearchLeads={searchLeads}
        onFetchVisitsByLead={fetchVisitsByLeadId}
        lookups={lookups}
        onClose={closeQuotationModal}
        onSave={handleQuotationSave}
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

      <style>{`
        .payments-page {
          width: 100%;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .page-header h1 {
          margin: 0;
          font-size: 28px;
          color: #333;
        }

        .btn-primary {
          background: #667eea;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-primary:hover {
          background: #5568d3;
        }

        .filter-indicator {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #e3f2fd;
          border: 1px solid #90caf9;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .filter-text {
          font-size: 14px;
          color: #1565c0;
        }

        .btn-clear-filter {
          background: white;
          border: 1px solid #1565c0;
          color: #1565c0;
          padding: 6px 14px;
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-clear-filter:hover {
          background: #1565c0;
          color: white;
        }

        .search-bar {
          margin-bottom: 20px;
        }

        .search-input {
          width: 100%;
          max-width: 500px;
          padding: 12px 16px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }

        .search-input:focus {
          outline: none;
          border-color: #667eea;
        }

        .error-text {
          color: #e53e3e;
          padding: 12px;
          background: #fee;
          border-radius: 6px;
        }

        /* Table View (Desktop) */
        .table-view {
          display: block;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          overflow-x: auto;
          max-width: 100%;
        }

        .card-view {
          display: none;
        }

        .payments-table {
          width: 100%;
          min-width: 1000px;
          border-collapse: collapse;
        }

        .payments-table th {
          background: #f8f9fa;
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          color: #666;
          text-transform: uppercase;
          border-bottom: 2px solid #e9ecef;
        }

        .payments-table td {
          padding: 16px;
          border-bottom: 1px solid #e9ecef;
          font-size: 14px;
          color: #333;
        }

        .payments-table tbody tr:hover {
          background: #f8f9fa;
        }

        .quote-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .quote-cell .quote-id {
          font-weight: 500;
          color: #667eea;
        }

        .quote-cell .quote-amount {
          font-size: 12px;
          color: #666;
        }

        .farmer-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .farmer-cell .farmer-name {
          font-weight: 500;
        }

        .farmer-cell .lead-id {
          font-size: 12px;
          color: #667eea;
        }

        .clickable {
          cursor: pointer;
          text-decoration: underline;
        }

        .clickable:hover {
          color: #5568d3;
        }

        .amount-cell {
          font-weight: 600;
          color: #2e7d32;
        }

        .type-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .type-badge.advance {
          background: #e3f2fd;
          color: #1565c0;
        }

        .type-badge.partial {
          background: #fff3cd;
          color: #856404;
        }

        .type-badge.final {
          background: #d4edda;
          color: #155724;
        }

        .actions {
          display: flex;
          gap: 8px;
        }

        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .btn-icon:hover {
          background: #f0f0f0;
        }

        .btn-danger {
          color: #e53e3e;
        }

        .no-data {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .load-more-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          gap: 10px;
        }

        .btn-load-more {
          background: white;
          border: 2px solid #667eea;
          color: #667eea;
          padding: 12px 32px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-load-more:hover:not(:disabled) {
          background: #667eea;
          color: white;
        }

        .btn-load-more:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .payments-count {
          margin: 0;
          font-size: 13px;
          color: #666;
        }

        .payments-count.center {
          text-align: center;
          padding: 20px;
        }

        /* Mobile: Card View */
        @media (max-width: 768px) {
          .table-view {
            display: none;
          }

          .card-view {
            display: flex;
            flex-direction: column;
            gap: 15px;
          }

          .payment-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }

          .payment-id {
            font-weight: 600;
            color: #667eea;
          }

          .farmer-name {
            margin: 0 0 10px 0;
            font-size: 18px;
            color: #333;
          }

          .card-info {
            margin: 5px 0;
            font-size: 14px;
            color: #666;
          }

          .card-info.amount {
            font-size: 20px;
            font-weight: 600;
            color: #2e7d32;
            margin: 10px 0;
          }

          .quote-ref {
            color: #667eea;
            font-weight: 500;
          }

          .quote-amount-small {
            color: #666;
            margin-left: 5px;
          }

          .card-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
          }

          .btn-secondary {
            flex: 1;
            background: white;
            border: 1px solid #667eea;
            color: #667eea;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
          }

          .btn-secondary:hover {
            background: #f0f0f0;
          }

          .card-actions .btn-danger {
            flex: 1;
            background: white;
            border: 1px solid #e53e3e;
            color: #e53e3e;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
          }

          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }

          .search-input {
            max-width: 100%;
            width:90%;
          }
        }
      `}</style>
    </Layout>
  );
}
