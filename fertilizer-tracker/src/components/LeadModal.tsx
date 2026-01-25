/**
 * Lead Modal Component
 *
 * Modal for viewing, adding, and editing leads
 * Supports three modes: 'view', 'add', 'edit'
 */

import { useState, useEffect, useMemo } from 'react';
import type { Lead, TalukWithDistrict } from '../types';

interface LeadModalProps {
  isOpen: boolean;
  mode: 'view' | 'add' | 'edit';
  lead?: Lead | null;
  lookups: {
    districts: string[];
    taluks: TalukWithDistrict[];
    cropTypes: string[];
    leadSources: string[];
    leadStatuses: string[];
    irrigationTypes: string[];
    users: Array<{ email: string; role: string }>;
  };
  onClose: () => void;
  onSave: (leadData: Partial<Lead>) => Promise<void>;
}

const initialFormData = {
  farmerName: '',
  phone: '',
  whatsapp: '',
  village: '',
  taluk: '',
  district: '',
  farmSizeAcres: 0,
  cropType: '',
  cropAge: '',
  numPlants: 0,
  irrigationType: '',
  leadSource: '',
  leadOwner: '',
  status: 'New',
  remarks: '',
};

export function LeadModal({
  isOpen,
  mode,
  lead,
  lookups,
  onClose,
  onSave,
}: LeadModalProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter taluks based on selected district
  const filteredTaluks = useMemo(() => {
    if (!formData.district) return [];
    return lookups.taluks
      .filter((t) => t.district === formData.district)
      .map((t) => t.taluk);
  }, [formData.district, lookups.taluks]);

  // Populate form when viewing or editing
  useEffect(() => {
    if ((mode === 'view' || mode === 'edit') && lead) {
      setFormData({
        farmerName: lead.farmerName || '',
        phone: lead.phone || '',
        whatsapp: lead.whatsapp || '',
        village: lead.village || '',
        taluk: lead.taluk || '',
        district: lead.district || '',
        farmSizeAcres: lead.farmSizeAcres || 0,
        cropType: lead.cropType || '',
        cropAge: lead.cropAge || '',
        numPlants: lead.numPlants || 0,
        irrigationType: lead.irrigationType || '',
        leadSource: lead.leadSource || '',
        leadOwner: lead.leadOwner || '',
        status: lead.status || 'New',
        remarks: lead.remarks || '',
      });
    } else if (mode === 'add') {
      setFormData(initialFormData);
    }
  }, [mode, lead]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    // Clear taluk when district changes
    if (name === 'district') {
      setFormData((prev) => ({
        ...prev,
        district: value,
        taluk: '', // Reset taluk when district changes
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.farmerName.trim()) {
      setError('Farmer name is required');
      return;
    }
    if (!formData.phone.trim() || formData.phone.length !== 10) {
      setError('Valid 10-digit phone number is required');
      return;
    }
    if (!formData.district) {
      setError('District is required');
      return;
    }
    if (!formData.cropType) {
      setError('Crop type is required');
      return;
    }
    if (!formData.leadSource) {
      setError('Lead source is required');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const title =
    mode === 'add'
      ? 'Add New Lead'
      : mode === 'edit'
      ? 'Edit Lead'
      : 'Lead Details';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          {lead && mode !== 'add' && (
            <span className="lead-display-id">{lead.displayId}</span>
          )}
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-body">
          <div className="form-section">
            <h3>Farmer Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="farmerName">Farmer Name *</label>
                <input
                  type="text"
                  id="farmerName"
                  name="farmerName"
                  value={isReadOnly && lead ? lead.farmerName : formData.farmerName}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={isReadOnly && lead ? lead.phone : formData.phone}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  maxLength={10}
                  pattern="[0-9]{10}"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="whatsapp">WhatsApp</label>
                <input
                  type="tel"
                  id="whatsapp"
                  name="whatsapp"
                  value={isReadOnly && lead ? lead.whatsapp : formData.whatsapp}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Location</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="village">Village</label>
                <input
                  type="text"
                  id="village"
                  name="village"
                  value={isReadOnly && lead ? lead.village : formData.village}
                  onChange={handleChange}
                  disabled={isReadOnly}
                />
              </div>

              <div className="form-group">
                <label htmlFor="district">District *</label>
                <select
                  id="district"
                  name="district"
                  value={isReadOnly && lead ? lead.district : formData.district}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  required
                >
                  <option value="">Select District</option>
                  {lookups.districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="taluk">Taluk</label>
                <select
                  id="taluk"
                  name="taluk"
                  value={isReadOnly && lead ? lead.taluk : formData.taluk}
                  onChange={handleChange}
                  disabled={isReadOnly || (!isReadOnly && !formData.district)}
                >
                  <option value="">
                    {formData.district ? 'Select Taluk' : 'Select District first'}
                  </option>
                  {filteredTaluks.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Farm Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="farmSizeAcres">Farm Size (Acres)</label>
                <input
                  type="number"
                  id="farmSizeAcres"
                  name="farmSizeAcres"
                  value={isReadOnly && lead ? lead.farmSizeAcres : formData.farmSizeAcres}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  min="0"
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="cropType">Crop Type *</label>
                <select
                  id="cropType"
                  name="cropType"
                  value={isReadOnly && lead ? lead.cropType : formData.cropType}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  required
                >
                  <option value="">Select Crop</option>
                  {lookups.cropTypes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="cropAge">Crop Age</label>
                <input
                  type="text"
                  id="cropAge"
                  name="cropAge"
                  value={isReadOnly && lead ? lead.cropAge : formData.cropAge}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  placeholder="e.g., 5 years"
                />
              </div>

              <div className="form-group">
                <label htmlFor="numPlants">Number of Plants</label>
                <input
                  type="number"
                  id="numPlants"
                  name="numPlants"
                  value={isReadOnly && lead ? lead.numPlants : formData.numPlants}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="irrigationType">Irrigation Type</label>
                <select
                  id="irrigationType"
                  name="irrigationType"
                  value={isReadOnly && lead ? lead.irrigationType : formData.irrigationType}
                  onChange={handleChange}
                  disabled={isReadOnly}
                >
                  <option value="">Select Irrigation</option>
                  {lookups.irrigationTypes.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Lead Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="leadSource">Lead Source *</label>
                <select
                  id="leadSource"
                  name="leadSource"
                  value={isReadOnly && lead ? lead.leadSource : formData.leadSource}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  required
                >
                  <option value="">Select Source</option>
                  {lookups.leadSources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="status">Status *</label>
                <select
                  id="status"
                  name="status"
                  value={isReadOnly && lead ? lead.status : formData.status}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  required
                >
                  {lookups.leadStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="leadOwner">Lead Owner</label>
                <select
                  id="leadOwner"
                  name="leadOwner"
                  value={isReadOnly && lead ? lead.leadOwner : formData.leadOwner}
                  onChange={handleChange}
                  disabled={isReadOnly}
                >
                  <option value="">Select User</option>
                  {lookups.users.map((u) => (
                    <option key={u.email} value={u.email}>
                      {u.email.split('@')[0]} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group full-width">
              <label htmlFor="remarks">Remarks</label>
              <textarea
                id="remarks"
                name="remarks"
                value={isReadOnly && lead ? (lead.remarks || '') : formData.remarks}
                onChange={handleChange}
                disabled={isReadOnly}
                rows={3}
                placeholder="Add any notes or remarks about this lead..."
              />
            </div>
          </div>

          {isReadOnly && lead && (
            <div className="form-section">
              <h3>Metadata</h3>
              <div className="form-grid metadata">
                <div className="form-group">
                  <label>Created Date</label>
                  <span className="metadata-value">
                    {new Date(lead.createdDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="form-group">
                  <label>Last Updated</label>
                  <span className="metadata-value">
                    {new Date(lead.lastUpdated).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              {isReadOnly ? 'Close' : 'Cancel'}
            </button>
            {!isReadOnly && (
              <button type="submit" className="btn-save" disabled={saving}>
                {saving ? 'Saving...' : mode === 'add' ? 'Create Lead' : 'Save Changes'}
              </button>
            )}
          </div>
        </form>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          max-width: 700px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .modal-header {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 20px 24px;
          border-bottom: 1px solid #e9ecef;
          background: white;
          border-radius: 12px 12px 0 0;
          flex-shrink: 0;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          color: #333;
          flex: 1;
        }

        .lead-display-id {
          background: #667eea;
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #666;
          line-height: 1;
          padding: 0;
        }

        .modal-close:hover {
          color: #333;
        }

        .modal-error {
          background: #fee;
          color: #c00;
          padding: 12px 24px;
          border-bottom: 1px solid #fcc;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e9ecef;
          background: white;
          border-radius: 0 0 12px 12px;
          flex-shrink: 0;
        }

        .form-section {
          margin-bottom: 24px;
        }

        .form-section h3 {
          font-size: 14px;
          font-weight: 600;
          color: #667eea;
          text-transform: uppercase;
          margin: 0 0 16px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #e9ecef;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .form-grid.metadata {
          grid-template-columns: repeat(2, 1fr);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 500;
          color: #555;
        }

        .form-group input,
        .form-group select {
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #667eea;
        }

        .form-group input:disabled,
        .form-group select:disabled,
        .form-group textarea:disabled {
          background: #f5f5f5;
          cursor: default;
        }

        .form-group textarea {
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          min-height: 80px;
          transition: border-color 0.2s;
        }

        .form-group textarea:focus {
          outline: none;
          border-color: #667eea;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .metadata-value {
          font-size: 14px;
          color: #333;
          padding: 10px 0;
        }

        .btn-cancel {
          background: white;
          border: 1px solid #ddd;
          color: #666;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
        }

        .btn-cancel:hover {
          background: #f5f5f5;
        }

        .btn-save {
          background: #667eea;
          border: none;
          color: white;
          padding: 10px 24px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-save:hover:not(:disabled) {
          background: #5568d3;
        }

        .btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 600px) {
          .modal-overlay {
            padding: 0;
            align-items: flex-end;
          }

          .modal-content {
            max-height: 95vh;
            border-radius: 12px 12px 0 0;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .modal-footer {
            flex-direction: column;
          }

          .btn-cancel,
          .btn-save {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
