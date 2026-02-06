/**
 * Dashboard Page
 *
 * Main landing page showing business metrics:
 * - Revenue Overview (Total, This Month, Pending, Collection Rate)
 * - Sales Pipeline (Total Leads, New Leads, Quotes Sent, Accepted, Conversion %)
 * - Alerts (Expiring quotes, Upcoming visits)
 * - Recent Activity (Leads, Payments)
 *
 * Clicking on IDs opens the respective detail modals
 */

import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LeadModal } from '../components/LeadModal';
import { FieldVisitModal } from '../components/FieldVisitModal';
import { QuotationModal } from '../components/QuotationModal';
import { PaymentModal } from '../components/PaymentModal';
import { useAuthStore } from '../store/authStore';
import {
  fetchDashboardStats,
  fetchLookups,
  fetchUsers,
  fetchLeadById,
  fetchQuotationById,
  fetchLeadsByIds,
  searchLeads,
  fetchVisitsByLeadId,
  searchAcceptedQuotations,
  fetchPaymentsByQuoteId,
  type DashboardStats,
} from '../services/backend';
import type { Lead, FieldVisit, Quotation, Payment, TalukWithDistrict } from '../types';
import './DashboardPage.css';

const emptyStats: DashboardStats = {
  totalRevenue: 0,
  thisMonthRevenue: 0,
  pendingAmount: 0,
  collectionRate: 0,
  totalLeads: 0,
  newLeads: 0,
  quotationsSent: 0,
  quotationsAccepted: 0,
  conversionRate: 0,
  expiringQuotes: [],
  upcomingVisits: [],
  recentLeads: [],
  recentPayments: [],
};

// Empty lookups for modals
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

type ModalType = 'lead' | 'visit' | 'quotation' | 'payment' | null;

export function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<FieldVisit | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [lookups, setLookups] = useState(emptyLookups);
  const [leadMap, setLeadMap] = useState<Map<string, Lead>>(new Map());
  const [quotationMap, setQuotationMap] = useState<Map<string, Quotation>>(new Map());

  useEffect(() => {
    loadStats();
    loadLookups();
  }, []);

  const loadLookups = async () => {
    try {
      const [lookupsData, usersData] = await Promise.all([
        fetchLookups(),
        fetchUsers(),
      ]);
      setLookups({ ...lookupsData, users: usersData });
    } catch (err) {
      console.error('Failed to load lookups:', err);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  };

  // Click handlers for opening modals - fetch full objects from partial dashboard data
  const handleLeadClick = async (partialLead: { id: string }) => {
    const lead = await fetchLeadById(partialLead.id);
    if (lead) {
      setSelectedLead(lead);
      setModalType('lead');
    }
  };

  const handleVisitClick = async (partialVisit: { id: string; leadId: string }) => {
    // For now, just fetch the lead - visit modal needs lead context
    const lead = await fetchLeadById(partialVisit.leadId);
    if (lead) {
      setLeadMap(new Map([[lead.id, lead]]));
      // Get visits for this lead to find the full visit object
      const visits = await fetchVisitsByLeadId(partialVisit.leadId);
      const fullVisit = visits.find(v => v.id === partialVisit.id);
      if (fullVisit) {
        setSelectedVisit(fullVisit);
        setModalType('visit');
      }
    }
  };

  const handleQuotationClick = async (partialQuotation: { id: string; leadId: string }) => {
    const quotation = await fetchQuotationById(partialQuotation.id);
    if (quotation) {
      setSelectedQuotation(quotation);
      const lead = await fetchLeadById(partialQuotation.leadId);
      if (lead) {
        setLeadMap(new Map([[lead.id, lead]]));
      }
      setModalType('quotation');
    }
  };

  const handlePaymentClick = async (partialPayment: { id: string; quoteId: string }) => {
    // Load the quotation and lead for this payment
    const quotation = await fetchQuotationById(partialPayment.quoteId);
    if (quotation) {
      setQuotationMap(new Map([[quotation.id, quotation]]));
      const lead = await fetchLeadById(quotation.leadId);
      if (lead) {
        setLeadMap(new Map([[lead.id, lead]]));
      }
      // Get payments for this quotation to find the full payment
      const payments = await fetchPaymentsByQuoteId(partialPayment.quoteId);
      const fullPayment = payments.find(p => p.id === partialPayment.id);
      if (fullPayment) {
        setSelectedPayment(fullPayment);
        setModalType('payment');
      }
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedLead(null);
    setSelectedVisit(null);
    setSelectedQuotation(null);
    setSelectedPayment(null);
  };

  // Dummy save function (modals are view-only from dashboard)
  const handleSave = async () => {};

  return (
    <Layout>
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h2>Welcome back, {user?.name}!</h2>
          <button className="btn-refresh" onClick={loadStats} disabled={loading}>
            Refresh
          </button>
        </div>

        {loading && <LoadingSpinner message="Loading dashboard..." fullPage />}
        {error && <p className="error-text">Error: {error}</p>}

        {!loading && !error && (
          <>
            {/* Revenue Section */}
            <section className="dashboard-section">
              <h3 className="section-title">Revenue Overview</h3>
              <div className="stats-grid four-cols">
                <div className="stat-card highlight-green">
                  <p className="stat-label">Total Revenue</p>
                  <p className="stat-value">{formatCurrency(stats.totalRevenue)}</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">This Month</p>
                  <p className="stat-value">{formatCurrency(stats.thisMonthRevenue)}</p>
                </div>
                <div className="stat-card highlight-orange">
                  <p className="stat-label">Pending Collection</p>
                  <p className="stat-value">{formatCurrency(stats.pendingAmount)}</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">Collection Rate</p>
                  <p className="stat-value">{stats.collectionRate}%</p>
                </div>
              </div>
            </section>

            {/* Pipeline Section */}
            <section className="dashboard-section">
              <h3 className="section-title">Sales Pipeline</h3>
              <div className="stats-grid five-cols">
                <div className="stat-card">
                  <p className="stat-label">Total Leads</p>
                  <p className="stat-value">{stats.totalLeads}</p>
                </div>
                <div className="stat-card highlight-blue">
                  <p className="stat-label">New Leads</p>
                  <p className="stat-value">{stats.newLeads}</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">Quotes Sent</p>
                  <p className="stat-value">{stats.quotationsSent}</p>
                </div>
                <div className="stat-card highlight-green">
                  <p className="stat-label">Accepted</p>
                  <p className="stat-value">{stats.quotationsAccepted}</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">Conversion</p>
                  <p className="stat-value">{stats.conversionRate}%</p>
                </div>
              </div>
            </section>

            {/* Alerts Section */}
            <section className="dashboard-section">
              <h3 className="section-title">Action Required</h3>
              <div className="alerts-grid">
                <div className="alert-card">
                  <h4>Expiring Quotes (7 days)</h4>
                  {stats.expiringQuotes.length === 0 ? (
                    <p className="no-alerts">No quotes expiring soon</p>
                  ) : (
                    <ul className="alert-list">
                      {stats.expiringQuotes.map((q) => (
                        <li key={q.id}>
                          <span className="alert-id clickable" onClick={() => handleQuotationClick(q)}>{q.displayId}</span>
                          <span className="alert-amount">{formatCurrency(q.quoteAmount)}</span>
                          <span className="alert-date">Expires {formatDate(q.validUntil)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="alert-card">
                  <h4>Upcoming Visits (3 days)</h4>
                  {stats.upcomingVisits.length === 0 ? (
                    <p className="no-alerts">No visits scheduled</p>
                  ) : (
                    <ul className="alert-list">
                      {stats.upcomingVisits.map((v) => (
                        <li key={v.id}>
                          <span className="alert-id clickable" onClick={() => handleVisitClick(v)}>{v.displayId}</span>
                          <span className="alert-date">{formatDate(v.scheduledDate)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            {/* Recent Activity Section */}
            <section className="dashboard-section">
              <h3 className="section-title">Recent Activity</h3>
              <div className="activity-grid">
                <div className="activity-card">
                  <h4>Recent Leads</h4>
                  {stats.recentLeads.length === 0 ? (
                    <p className="no-data">No recent leads</p>
                  ) : (
                    <ul className="activity-list">
                      {stats.recentLeads.map((l) => (
                        <li key={l.id}>
                          <div className="activity-main">
                            <span className="activity-id clickable" onClick={() => handleLeadClick(l)}>{l.displayId}</span>
                            <span className="activity-name">{l.farmerName}</span>
                          </div>
                          <div className="activity-meta">
                            <span>{l.district}</span>
                            <span className={`status-badge ${l.status.toLowerCase()}`}>{l.status}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="activity-card">
                  <h4>Recent Payments</h4>
                  {stats.recentPayments.length === 0 ? (
                    <p className="no-data">No recent payments</p>
                  ) : (
                    <ul className="activity-list">
                      {stats.recentPayments.map((p) => (
                        <li key={p.id}>
                          <div className="activity-main">
                            <span className="activity-id clickable" onClick={() => handlePaymentClick(p)}>{p.displayId}</span>
                            <span className="activity-amount">{formatCurrency(p.paymentAmount)}</span>
                          </div>
                          <div className="activity-meta">
                            <span>{formatDate(p.paymentDate)}</span>
                            <span>{p.paymentMethod}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {/* Lead Modal */}
      <LeadModal
        isOpen={modalType === 'lead'}
        mode="view"
        lead={selectedLead}
        lookups={lookups}
        onClose={closeModal}
        onSave={handleSave}
      />

      {/* Visit Modal */}
      <FieldVisitModal
        isOpen={modalType === 'visit'}
        mode="view"
        visit={selectedVisit}
        leadMap={leadMap}
        lookups={{
          visitStatuses: lookups.visitStatuses,
          visitOutcomes: lookups.visitOutcomes,
          cropConditions: lookups.cropConditions,
          users: lookups.users,
        }}
        onSearchLeads={searchLeads}
        onClose={closeModal}
        onSave={handleSave}
      />

      {/* Quotation Modal */}
      <QuotationModal
        isOpen={modalType === 'quotation'}
        mode="view"
        quotation={selectedQuotation}
        leadMap={leadMap}
        visitMap={new Map()}
        lookups={{
          quotationStatuses: lookups.quotationStatuses,
          deliveryStatuses: lookups.deliveryStatuses,
        }}
        onSearchLeads={searchLeads}
        onFetchVisitsByLead={fetchVisitsByLeadId}
        onClose={closeModal}
        onSave={handleSave}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={modalType === 'payment'}
        mode="view"
        payment={selectedPayment}
        quotationMap={quotationMap}
        leadMap={leadMap}
        existingPayments={[]}
        onSearchQuotations={searchAcceptedQuotations}
        onFetchPaymentsByQuote={fetchPaymentsByQuoteId}
        onFetchLeadsByIds={fetchLeadsByIds}
        lookups={lookups}
        onClose={closeModal}
        onSave={handleSave}
      />

    </Layout>
  );
}
