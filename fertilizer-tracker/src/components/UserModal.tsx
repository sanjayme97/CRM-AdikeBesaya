/**
 * User Modal Component
 *
 * Modal for viewing, adding, and editing allowed users (Manager only)
 */

import { useState, useEffect } from 'react';
import type { AllowedUser } from '../services/supabase/allowedUsers';
import './UserModal.css';

interface UserModalProps {
  isOpen: boolean;
  mode: 'view' | 'add' | 'edit';
  user?: AllowedUser | null;
  onClose: () => void;
  onSave: (data: { email: string; role: string; notes: string }) => Promise<void>;
}

const ROLES = ['Field Agronomist', 'Sales Executive', 'Manager', 'Admin'] as const;

const initialFormData = {
  email: '',
  role: 'Field Agronomist',
  notes: '',
};

export function UserModal({ isOpen, mode, user, onClose, onSave }: UserModalProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'edit' && user) {
      setFormData({
        email: user.email,
        role: user.role,
        notes: user.notes || '',
      });
    } else if (mode === 'add') {
      setFormData(initialFormData);
    }
    setError(null);
  }, [mode, user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const title =
    mode === 'add' ? 'Add User' : mode === 'edit' ? 'Edit User' : 'User Details';

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-body">
            <div className="form-section">
              <h3>User Information</h3>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="email">Email Address *</label>
                  {isReadOnly ? (
                    <span className="readonly-value">{user?.email}</span>
                  ) : mode === 'edit' ? (
                    <span className="readonly-value">{formData.email}</span>
                  ) : (
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="user@gmail.com"
                      required
                    />
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="role">Role *</label>
                  {isReadOnly ? (
                    <span className="readonly-value">{user?.role}</span>
                  ) : (
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      required
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {isReadOnly && user && (
                  <div className="form-group">
                    <label>Status</label>
                    <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                )}

                <div className="form-group full-width">
                  <label htmlFor="notes">Notes</label>
                  {isReadOnly ? (
                    <span className="readonly-value">{user?.notes || '-'}</span>
                  ) : (
                    <textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={2}
                      placeholder="e.g., Region, team, hire date..."
                    />
                  )}
                </div>

                {isReadOnly && user && (
                  <>
                    <div className="form-group">
                      <label>Added On</label>
                      <span className="readonly-value">{formatDate(user.invitedAt)}</span>
                    </div>
                    <div className="form-group">
                      <label>Invited By</label>
                      <span className="readonly-value">{user.invitedBy || '-'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              {isReadOnly ? 'Close' : 'Cancel'}
            </button>
            {!isReadOnly && (
              <button type="submit" className="btn-save" disabled={saving}>
                {saving ? 'Saving...' : mode === 'add' ? 'Add User' : 'Save Changes'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
