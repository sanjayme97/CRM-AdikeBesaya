/**
 * Leads Page
 *
 * Displays all leads in a hybrid view:
 * - Desktop (≥768px): Table view
 * - Mobile (<768px): Card view
 */

import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LeadModal } from '../components/LeadModal';
import { useAuthStore } from '../store/authStore';
import { useModalHistory } from '../hooks/useModalHistory';
import { fetchLeads, deleteLead, createLead, updateLead, fetchLookups, fetchUsers } from '../services/backend';
import type { Lead, TalukWithDistrict } from '../types';

const PAGE_SIZE = 50;

type ModalMode = 'view' | 'add' | 'edit';

const emptyLookups: {
  districts: string[];
  taluks: TalukWithDistrict[];
  cropTypes: string[];
  leadSources: string[];
  leadStatuses: string[];
  irrigationTypes: string[];
  users: Array<{ email: string; role: string }>;
} = {
  districts: [],
  taluks: [],
  cropTypes: [],
  leadSources: [],
  leadStatuses: ['New'],
  irrigationTypes: [],
  users: [],
};

export function LeadsPage() {
  const { user } = useAuthStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasMore, setHasMore] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [lookups, setLookups] = useState(emptyLookups);

  // Close modal handler
  const closeModalInternal = useCallback(() => {
    setModalOpen(false);
    setSelectedLead(null);
  }, []);

  // Handle back gesture to close modal
  const { closeWithHistory } = useModalHistory({
    isOpen: modalOpen,
    onClose: closeModalInternal,
  });

  // Fetch leads and lookups on mount
  useEffect(() => {
    loadLeads();
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

  const loadLeads = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchLeads(PAGE_SIZE);
      setLeads(data);
      setHasMore(data.length >= PAGE_SIZE);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);

    try {
      const offset = leads.length;
      const data = await fetchLeads(PAGE_SIZE, offset);

      if (data.length === 0) {
        setHasMore(false);
      } else {
        setLeads(prev => [...prev, ...data]);
        setHasMore(data.length >= PAGE_SIZE);
      }
    } catch (err) {
      console.error('Failed to load more leads:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.email) return;

    // Find the lead to check its status
    const leadToDelete = leads.find(l => l.id === id);
    if (!leadToDelete) {
      alert('Lead not found.');
      return;
    }

    // Only allow deletion of leads with "New" status
    if (leadToDelete.status !== 'New') {
      alert(`Cannot delete this lead. Only leads with "New" status can be deleted.\n\nCurrent status: ${leadToDelete.status}`);
      return;
    }

    if (!confirm('Are you sure you want to delete this lead?')) return;

    try {
      await deleteLead(id, user.email);
      await loadLeads();
    } catch (err) {
      console.error('Failed to delete lead:', err);
      alert('Failed to delete lead. Please try again.');
    }
  };

  const openModal = (mode: ModalMode, lead?: Lead) => {
    setModalMode(mode);
    setSelectedLead(lead || null);
    setModalOpen(true);
  };

  const closeModal = () => {
    closeWithHistory();
  };

  const handleSave = async (leadData: Partial<Lead>) => {
    if (modalMode === 'add') {
      await createLead(
        leadData as Omit<Lead, 'id' | 'rowNumber' | 'displayId' | 'createdDate' | 'lastUpdated' | 'isDeleted' | 'deletedBy' | 'deletedDate' | 'deleteReason'>
      );
    } else if (modalMode === 'edit' && selectedLead) {
      await updateLead(selectedLead.id, leadData);
    }

    await loadLeads();
  };

  // Filter leads by search term
  const filteredLeads = leads.filter((lead) =>
    lead.farmerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone.includes(searchTerm) ||
    lead.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.displayId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="leads-page">
        <div className="page-header">
          <h1>Leads</h1>
          <button className="btn-primary" onClick={() => openModal('add')}>
            + Add New Lead
          </button>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search leads by name, phone, district..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {loading && <LoadingSpinner message="Loading leads..." fullPage />}
        {error && <p className="error-text">Error: {error}</p>}

        {!loading && !error && (
          <>
            {/* Desktop: Table View */}
            <div className="table-view">
              <table className="leads-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Farmer Name</th>
                    <th>Phone</th>
                    <th>District</th>
                    <th>Crop</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id}>
                      <td>{lead.displayId}</td>
                      <td>{lead.farmerName}</td>
                      <td>{lead.phone}</td>
                      <td>{lead.district}</td>
                      <td>{lead.cropType}</td>
                      <td>
                        <span className={`status-badge ${lead.status.toLowerCase()}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="actions">
                        <button
                          className="btn-icon"
                          title="View"
                          onClick={() => openModal('view', lead)}
                        >
                          👁️
                        </button>
                        <button
                          className="btn-icon"
                          title="Edit"
                          onClick={() => openModal('edit', lead)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          title={lead.status === 'New' ? 'Delete' : 'Cannot delete - status is not New'}
                          onClick={() => handleDelete(lead.id)}
                          disabled={lead.status !== 'New'}
                          style={{ opacity: lead.status !== 'New' ? 0.5 : 1, cursor: lead.status !== 'New' ? 'not-allowed' : 'pointer' }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredLeads.length === 0 && (
                <p className="no-data">No leads found. Add your first lead!</p>
              )}
            </div>

            {/* Load More Button */}
            {hasMore && filteredLeads.length > 0 && (
              <div className="load-more-container">
                <button
                  className="btn-load-more"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
                <p className="leads-count">Showing {leads.length} leads</p>
              </div>
            )}

            {!hasMore && leads.length > 0 && (
              <p className="leads-count center">All {leads.length} leads loaded</p>
            )}

            {/* Mobile: Card View */}
            <div className="card-view">
              {filteredLeads.map((lead) => (
                <div key={lead.id} className="lead-card">
                  <div className="card-header">
                    <span className="lead-id">{lead.displayId}</span>
                    <span className={`status-badge ${lead.status.toLowerCase()}`}>
                      {lead.status}
                    </span>
                  </div>
                  <h3 className="farmer-name">{lead.farmerName}</h3>
                  <p className="card-info">📞 {lead.phone}</p>
                  <p className="card-info">
                    📍 {lead.district} • 🌱 {lead.cropType} • {lead.farmSizeAcres} acres
                  </p>
                  <div className="card-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => openModal('view', lead)}
                    >
                      View Details
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => openModal('edit', lead)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => handleDelete(lead.id)}
                      disabled={lead.status !== 'New'}
                      title={lead.status === 'New' ? 'Delete' : 'Cannot delete - status is not New'}
                      style={{ opacity: lead.status !== 'New' ? 0.5 : 1, cursor: lead.status !== 'New' ? 'not-allowed' : 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {filteredLeads.length === 0 && (
                <p className="no-data">No leads found. Add your first lead!</p>
              )}

              {/* Load More for Mobile */}
              {hasMore && filteredLeads.length > 0 && (
                <div className="load-more-container">
                  <button
                    className="btn-load-more"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </button>
                  <p className="leads-count">Showing {leads.length} leads</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <LeadModal
        isOpen={modalOpen}
        mode={modalMode}
        lead={selectedLead}
        lookups={lookups}
        onClose={closeModal}
        onSave={handleSave}
      />

      <style>{`
        .leads-page {
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

        .leads-table {
          width: 100%;
          min-width: 800px;
          border-collapse: collapse;
        }

        .leads-table th {
          background: #f8f9fa;
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          color: #666;
          text-transform: uppercase;
          border-bottom: 2px solid #e9ecef;
        }

        .leads-table td {
          padding: 16px;
          border-bottom: 1px solid #e9ecef;
          font-size: 14px;
          color: #333;
        }

        .leads-table tbody tr:hover {
          background: #f8f9fa;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.active {
          background: #d4edda;
          color: #155724;
        }

        .status-badge.follow-up {
          background: #fff3cd;
          color: #856404;
        }

        .status-badge.closed {
          background: #e2e3e5;
          color: #6c757d;
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

        .leads-count {
          margin: 0;
          font-size: 13px;
          color: #666;
        }

        .leads-count.center {
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

          .lead-card {
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

          .lead-id {
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
