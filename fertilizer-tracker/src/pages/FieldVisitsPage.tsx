/**
 * Field Visits Page
 *
 * Displays all field visits in a hybrid view:
 * - Desktop (>=768px): Table view
 * - Mobile (<768px): Card view
 */

import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { FieldVisitModal } from '../components/FieldVisitModal';
import { LeadModal } from '../components/LeadModal';
import { useAuthStore } from '../store/authStore';
import { useModalHistory } from '../hooks/useModalHistory';
import {
  fetchFieldVisits,
  deleteFieldVisit,
  createFieldVisit,
  updateFieldVisit,
  fetchLookups,
  fetchLeadsByIds,
  searchLeads,
  fetchUsers,
  createQuotation,
  fetchQuotationByVisitId,
} from '../services/backend';
import type { FieldVisit, Lead, TalukWithDistrict } from '../types';

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
  users: [] as Array<{ email: string; role: string }>,
};

export function FieldVisitsPage() {
  const { user } = useAuthStore();
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasMore, setHasMore] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [selectedVisit, setSelectedVisit] = useState<FieldVisit | null>(null);
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
    setSelectedVisit(null);
    setLeadModalOpen(false);
    setSelectedLead(null);
  }, []);

  // Handle back gesture to close modals
  const { closeWithHistory } = useModalHistory({
    isOpen: isAnyModalOpen,
    onClose: closeAllModals,
  });

  // Fetch visits and lookups on mount
  useEffect(() => {
    loadVisits();
    loadLookups();
  }, []);

  const loadLookups = async () => {
    try {
      const [lookupsData, usersData] = await Promise.all([
        fetchLookups(),
        fetchUsers(),
      ]);
      setLookups({
        ...lookupsData,
        users: usersData,
      });
    } catch (err) {
      console.error('Failed to fetch lookups:', err);
    }
  };

  // Fetch leads for the currently displayed visits
  const loadLeadsForVisits = async (visitList: FieldVisit[]) => {
    try {
      // Get unique lead IDs from visits
      const leadIds = [...new Set(visitList.map(v => v.leadId).filter(Boolean))];

      // Only fetch leads we don't already have
      const newLeadIds = leadIds.filter(id => !leadMap.has(id));

      if (newLeadIds.length > 0) {
        const newLeads = await fetchLeadsByIds(newLeadIds);
        const newMap = new Map(leadMap);
        newLeads.forEach((lead) => newMap.set(lead.id, lead));
        setLeadMap(newMap);
      }
    } catch (err) {
      console.error('Failed to fetch leads for visits:', err);
    }
  };

  const loadVisits = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchFieldVisits(PAGE_SIZE);
      setVisits(data);
      setHasMore(data.length >= PAGE_SIZE);

      // Fetch lead info for these visits
      await loadLeadsForVisits(data);
    } catch (err) {
      console.error('Failed to fetch visits:', err);
      setError(err instanceof Error ? err.message : 'Failed to load visits');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);

    try {
      const offset = visits.length;
      const data = await fetchFieldVisits(PAGE_SIZE, offset);

      if (data.length === 0) {
        setHasMore(false);
      } else {
        setVisits((prev) => [...prev, ...data]);
        setHasMore(data.length >= PAGE_SIZE);

        // Fetch lead info for newly loaded visits
        await loadLeadsForVisits(data);
      }
    } catch (err) {
      console.error('Failed to load more visits:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.email) return;

    // Find the visit to check its status
    const visitToDelete = visits.find(v => v.id === id);
    if (!visitToDelete) {
      alert('Visit not found.');
      return;
    }

    // Only allow deleting visits with status "Scheduled" or "Cancelled"
    if (visitToDelete.status !== 'Scheduled' && visitToDelete.status !== 'Cancelled') {
      alert(`Cannot delete this visit. Only visits with "Scheduled" or "Cancelled" status can be deleted.\n\nCurrent status: ${visitToDelete.status}`);
      return;
    }

    if (!confirm('Are you sure you want to delete this visit?')) return;

    try {
      await deleteFieldVisit(id, user.email);
      await loadVisits();
    } catch (err) {
      console.error('Failed to delete visit:', err);
      alert('Failed to delete visit. Please try again.');
    }
  };

  const openModal = (mode: ModalMode, visit?: FieldVisit) => {
    setModalMode(mode);
    setSelectedVisit(visit || null);
    setModalOpen(true);
  };

  const closeModal = () => {
    closeWithHistory();
  };

  const handleSave = async (visitData: Partial<FieldVisit>) => {
    if (!user?.email) throw new Error('Not authenticated');

    let createdVisit: FieldVisit | undefined;

    if (modalMode === 'add') {
      createdVisit = await createFieldVisit({
        ...visitData,
        createdBy: user.email,
        visitorId: visitData.visitorId || user.email,
      } as Omit<FieldVisit, 'id' | 'rowNumber' | 'displayId' | 'createdDate' | 'isDeleted' | 'deletedBy' | 'deletedDate' | 'deleteReason'>);

      // Auto-create quotation if requested
      if (visitData.quotationRequested === true && visitData.assignedTo && createdVisit) {
        try {
          const today = new Date();
          const validUntil = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

          await createQuotation({
            leadId: visitData.leadId!,
            visitId: createdVisit.id,
            quoteDate: today.toISOString().split('T')[0],
            quoteAmount: 0,
            preparedBy: visitData.assignedTo,
            validUntil: validUntil.toISOString().split('T')[0],
            status: 'Draft',
            notes: `Auto-created from visit ${createdVisit.displayId}`,
          });
          console.log('Auto-created quotation for visit:', createdVisit.displayId);
        } catch (quotationError) {
          console.error('Failed to auto-create quotation:', quotationError);
          // Don't fail the whole save if quotation creation fails
          alert('Visit saved, but failed to auto-create quotation. Please create it manually.');
        }
      }
    } else if (modalMode === 'edit' && selectedVisit) {
      await updateFieldVisit(selectedVisit.id, visitData);

      // Auto-create quotation if requested and doesn't already exist
      // This handles the case where user edits a visit to mark it as Visited/Successful and requests quotation
      if (visitData.quotationRequested === true && visitData.assignedTo) {
        try {
          // Check if quotation already exists for this visit
          const existingQuotation = await fetchQuotationByVisitId(selectedVisit.id);

          if (!existingQuotation) {
            const today = new Date();
            const validUntil = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

            await createQuotation({
              leadId: selectedVisit.leadId,
              visitId: selectedVisit.id,
              quoteDate: today.toISOString().split('T')[0],
              quoteAmount: 0,
              preparedBy: visitData.assignedTo,
              validUntil: validUntil.toISOString().split('T')[0],
              status: 'Draft',
              notes: `Auto-created from visit ${selectedVisit.displayId}`,
            });
            console.log('Auto-created quotation for visit:', selectedVisit.displayId);
          }
        } catch (quotationError) {
          console.error('Failed to auto-create quotation:', quotationError);
          alert('Visit saved, but failed to auto-create quotation. Please create it manually.');
        }
      }
    }

    await loadVisits();
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
    e.stopPropagation(); // Prevent row click from triggering
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

  // Filter visits by search term
  const filteredVisits = visits.filter((visit) => {
    const farmerName = getFarmerName(visit.leadId).toLowerCase();
    const leadDisplayId = getLeadDisplayId(visit.leadId).toLowerCase();
    const term = searchTerm.toLowerCase();

    return (
      visit.displayId.toLowerCase().includes(term) ||
      farmerName.includes(term) ||
      leadDisplayId.includes(term) ||
      visit.status.toLowerCase().includes(term) ||
      visit.visitorId.toLowerCase().includes(term)
    );
  });

  return (
    <Layout>
      <div className="visits-page">
        <div className="page-header">
          <h1>Field Visits</h1>
          <button className="btn-primary" onClick={() => openModal('add')}>
            + Schedule Visit
          </button>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search visits by ID, farmer, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {loading && <LoadingSpinner message="Loading visits..." fullPage />}
        {error && <p className="error-text">Error: {error}</p>}

        {!loading && !error && (
          <>
            {/* Desktop: Table View */}
            <div className="table-view">
              <table className="visits-table">
                <thead>
                  <tr>
                    <th>Visit ID</th>
                    <th>Farmer</th>
                    <th>Scheduled</th>
                    <th>Actual</th>
                    <th>Visitor</th>
                    <th>Outcome</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVisits.map((visit) => (
                    <tr key={visit.id}>
                      <td>{visit.displayId}</td>
                      <td>
                        <div className="farmer-cell">
                          <span className="farmer-name">{getFarmerName(visit.leadId)}</span>
                          <span className="lead-id clickable" onClick={(e) => handleLeadClick(visit.leadId, e)}>{getLeadDisplayId(visit.leadId)}</span>
                        </div>
                      </td>
                      <td>{formatDate(visit.scheduledDate)}</td>
                      <td>{formatDate(visit.actualDate || '')}</td>
                      <td>{visit.visitorId.split('@')[0]}</td>
                      <td>{visit.visitOutcome || '-'}</td>
                      <td>
                        <span className={`status-badge ${visit.status.toLowerCase()}`}>
                          {visit.status}
                        </span>
                      </td>
                      <td className="actions">
                        <button
                          className="btn-icon"
                          title="View"
                          onClick={() => openModal('view', visit)}
                        >
                          👁️
                        </button>
                        <button
                          className="btn-icon"
                          title="Edit"
                          onClick={() => openModal('edit', visit)}
                        >
                          ✏️
                        </button>
                        <button
                          className={`btn-icon btn-danger ${visit.status !== 'Scheduled' && visit.status !== 'Cancelled' ? 'disabled' : ''}`}
                          title={visit.status !== 'Scheduled' && visit.status !== 'Cancelled' ? 'Cannot delete visited visits' : 'Delete'}
                          onClick={() => handleDelete(visit.id)}
                          disabled={visit.status !== 'Scheduled' && visit.status !== 'Cancelled'}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredVisits.length === 0 && (
                <p className="no-data">No visits found. Schedule your first visit!</p>
              )}
            </div>

            {/* Load More Button */}
            {hasMore && filteredVisits.length > 0 && (
              <div className="load-more-container">
                <button
                  className="btn-load-more"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
                <p className="visits-count">Showing {visits.length} visits</p>
              </div>
            )}

            {!hasMore && visits.length > 0 && (
              <p className="visits-count center">All {visits.length} visits loaded</p>
            )}

            {/* Mobile: Card View */}
            <div className="card-view">
              {filteredVisits.map((visit) => (
                <div key={visit.id} className="visit-card">
                  <div className="card-header">
                    <span className="visit-id">{visit.displayId}</span>
                    <span className={`status-badge ${visit.status.toLowerCase()}`}>
                      {visit.status}
                    </span>
                  </div>
                  <h3 className="farmer-name">{getFarmerName(visit.leadId)}</h3>
                  <p className="card-info">
                    <span className="lead-ref clickable" onClick={(e) => handleLeadClick(visit.leadId, e)}>{getLeadDisplayId(visit.leadId)}</span>
                  </p>
                  <p className="card-info">
                    📅 Scheduled: {formatDate(visit.scheduledDate)}
                  </p>
                  {visit.actualDate && (
                    <p className="card-info">
                      ✅ Visited: {formatDate(visit.actualDate)}
                    </p>
                  )}
                  {visit.visitOutcome && (
                    <p className="card-info">📋 {visit.visitOutcome}</p>
                  )}
                  <div className="card-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => openModal('view', visit)}
                    >
                      View Details
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => openModal('edit', visit)}
                    >
                      Edit
                    </button>
                    <button
                      className={`btn-danger ${visit.status !== 'Scheduled' && visit.status !== 'Cancelled' ? 'disabled' : ''}`}
                      onClick={() => handleDelete(visit.id)}
                      disabled={visit.status !== 'Scheduled' && visit.status !== 'Cancelled'}
                      title={visit.status !== 'Scheduled' && visit.status !== 'Cancelled' ? 'Cannot delete visited visits' : 'Delete'}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {filteredVisits.length === 0 && (
                <p className="no-data">No visits found. Schedule your first visit!</p>
              )}

              {/* Load More for Mobile */}
              {hasMore && filteredVisits.length > 0 && (
                <div className="load-more-container">
                  <button
                    className="btn-load-more"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </button>
                  <p className="visits-count">Showing {visits.length} visits</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <FieldVisitModal
        isOpen={modalOpen}
        mode={modalMode}
        visit={selectedVisit}
        leadMap={leadMap}
        onSearchLeads={searchLeads}
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

      <style>{`
        .visits-page {
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

        .visits-table {
          width: 100%;
          min-width: 900px;
          border-collapse: collapse;
        }

        .visits-table th {
          background: #f8f9fa;
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          color: #666;
          text-transform: uppercase;
          border-bottom: 2px solid #e9ecef;
        }

        .visits-table td {
          padding: 16px;
          border-bottom: 1px solid #e9ecef;
          font-size: 14px;
          color: #333;
        }

        .visits-table tbody tr:hover {
          background: #f8f9fa;
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

        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.scheduled {
          background: #e3f2fd;
          color: #1565c0;
        }

        .status-badge.completed {
          background: #d4edda;
          color: #155724;
        }

        .status-badge.cancelled {
          background: #f8d7da;
          color: #721c24;
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

        .visits-count {
          margin: 0;
          font-size: 13px;
          color: #666;
        }

        .visits-count.center {
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

          .visit-card {
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

          .visit-id {
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

          .lead-ref {
            color: #667eea;
            font-weight: 500;
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
