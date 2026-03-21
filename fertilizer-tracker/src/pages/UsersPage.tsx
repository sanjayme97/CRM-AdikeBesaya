/**
 * User Management Page (Manager only)
 *
 * Manage allowed users: add, edit roles, activate/deactivate.
 * Works with the allowed_users table (email allowlist).
 */

import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { UserModal } from '../components/UserModal';
import {
  fetchAllowedUsers,
  addAllowedUser,
  updateAllowedUser,
  deactivateAllowedUser,
  reactivateAllowedUser,
} from '../services/supabase/allowedUsers';
import type { AllowedUser } from '../services/supabase/allowedUsers';
import './UsersPage.css';

type ModalMode = 'view' | 'add' | 'edit';

export function UsersPage() {
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [selectedUser, setSelectedUser] = useState<AllowedUser | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllowedUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openModal = (mode: ModalMode, user?: AllowedUser) => {
    setModalMode(mode);
    setSelectedUser(user || null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
  };

  const handleSave = async (data: { email: string; role: string; notes: string }) => {
    if (modalMode === 'add') {
      await addAllowedUser(data.email, data.role, data.notes);
    } else if (modalMode === 'edit' && selectedUser) {
      await updateAllowedUser(selectedUser.id, {
        role: data.role,
        notes: data.notes,
      });
    }
    await loadUsers();
  };

  const handleToggleActive = async (user: AllowedUser) => {
    const action = user.isActive ? 'deactivate' : 'reactivate';
    if (!confirm(`Are you sure you want to ${action} ${user.email}?`)) return;

    try {
      if (user.isActive) {
        await deactivateAllowedUser(user.email);
      } else {
        await reactivateAllowedUser(user.id);
      }
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} user`);
    }
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getRoleBadgeClass = (role: string): string => {
    switch (role) {
      case 'Admin': return 'role-badge admin';
      case 'Manager': return 'role-badge manager';
      case 'Sales Executive': return 'role-badge sales';
      default: return 'role-badge agronomist';
    }
  };

  // Filter users by search
  const filteredUsers = users.filter((u) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.email.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term) ||
      u.notes?.toLowerCase().includes(term)
    );
  });

  const activeCount = filteredUsers.filter((u) => u.isActive).length;
  const inactiveCount = filteredUsers.filter((u) => !u.isActive).length;

  return (
    <Layout>
      <div className="users-page">
        <div className="page-header">
          <div className="page-title-section">
            <h1>User Management</h1>
            <span className="record-count">
              {activeCount} active{inactiveCount > 0 ? `, ${inactiveCount} inactive` : ''}
            </span>
          </div>
          <button className="btn-add" onClick={() => openModal('add')}>
            + Add User
          </button>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by email, role, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>
              Clear
            </button>
          )}
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <LoadingSpinner />
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <p>{searchTerm ? 'No users match your search' : 'No users yet. Click "+ Add User" to get started.'}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-view">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Added</th>
                    <th>Invited By</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className={`user-row ${!user.isActive ? 'inactive' : ''}`}
                      onClick={() => openModal('view', user)}
                    >
                      <td className="email-cell">{user.email}</td>
                      <td>
                        <span className={getRoleBadgeClass(user.role)}>{user.role}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="date-cell">{formatDate(user.invitedAt)}</td>
                      <td className="invited-cell">{user.invitedBy || '-'}</td>
                      <td className="notes-cell">{user.notes || '-'}</td>
                      <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn-action edit"
                          onClick={() => openModal('edit', user)}
                        >
                          Edit
                        </button>
                        <button
                          className={`btn-action ${user.isActive ? 'deactivate' : 'activate'}`}
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="card-view">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`user-card ${!user.isActive ? 'inactive' : ''}`}
                  onClick={() => openModal('view', user)}
                >
                  <div className="card-header">
                    <span className="card-email">{user.email}</span>
                    <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="card-meta">
                    <span className={getRoleBadgeClass(user.role)}>{user.role}</span>
                    <span className="card-date">{formatDate(user.invitedAt)}</span>
                  </div>
                  {user.notes && <div className="card-notes">{user.notes}</div>}
                  <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-action edit"
                      onClick={() => openModal('edit', user)}
                    >
                      Edit
                    </button>
                    <button
                      className={`btn-action ${user.isActive ? 'deactivate' : 'activate'}`}
                      onClick={() => handleToggleActive(user)}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* User Modal */}
        <UserModal
          isOpen={modalOpen}
          mode={modalMode}
          user={selectedUser}
          onClose={closeModal}
          onSave={handleSave}
        />
      </div>
    </Layout>
  );
}
