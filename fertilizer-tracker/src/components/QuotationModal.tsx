/**
 * Quotation Modal Component
 *
 * Modal for viewing, creating, and editing quotations
 * Supports three modes: 'view', 'add', 'edit'
 *
 * Linking: Quotation must be linked to a Lead.
 * Optionally can also be linked to a Field Visit for that lead.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Quotation, Lead, FieldVisit } from '../types';
import { uploadFile, getDownloadLink } from '../services/driveService';

interface QuotationModalProps {
  isOpen: boolean;
  mode: 'view' | 'add' | 'edit';
  quotation?: Quotation | null;
  leadMap: Map<string, Lead>;
  visitMap?: Map<string, FieldVisit>;
  onSearchLeads: (searchTerm: string, limit?: number) => Promise<Lead[]>;
  onFetchVisitsByLead: (leadId: string) => Promise<FieldVisit[]>;
  lookups: {
    quotationStatuses: string[];
    deliveryStatuses: string[];
  };
  onClose: () => void;
  onSave: (quotationData: Partial<Quotation>) => Promise<void>;
}

const initialFormData = {
  leadId: '',
  visitId: '',
  quoteDate: '',
  quoteAmount: 0,
  preparedBy: '',
  validUntil: '',
  status: 'Draft',
  notes: '',
  attachmentFileId: '',
  deliveryStatus: '',
  deliveryDate: '',
};

export function QuotationModal({
  isOpen,
  mode,
  quotation,
  leadMap,
  visitMap,
  onSearchLeads,
  onFetchVisitsByLead,
  lookups,
  onClose,
  onSave,
}: QuotationModalProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Searchable lead dropdown state
  const [leadSearchTerm, setLeadSearchTerm] = useState('');
  const [leadOptions, setLeadOptions] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Visits for selected lead
  const [leadVisits, setLeadVisits] = useState<FieldVisit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get selected lead info from leadMap or leadOptions
  const selectedLead = leadMap.get(formData.leadId) || leadOptions.find((l: Lead) => l.id === formData.leadId);

  // Get selected visit info
  const selectedVisit = formData.visitId
    ? (visitMap?.get(formData.visitId) || leadVisits.find((v: FieldVisit) => v.id === formData.visitId))
    : null;

  // Load visits for selected lead (defined before useEffect that uses it)
  const loadVisitsForLead = useCallback(async (leadId: string) => {
    if (!leadId) {
      setLeadVisits([]);
      return;
    }

    setLoadingVisits(true);
    try {
      const visits = await onFetchVisitsByLead(leadId);
      setLeadVisits(visits);
    } catch (err) {
      console.error('Failed to load visits for lead:', err);
      setLeadVisits([]);
    } finally {
      setLoadingVisits(false);
    }
  }, [onFetchVisitsByLead]);

  // Load initial 100 leads when modal opens for add mode
  const loadInitialLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const leads = await onSearchLeads('', 100);
      setLeadOptions(leads);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoadingLeads(false);
    }
  }, [onSearchLeads]);

  // Populate form when editing or reset when adding
  useEffect(() => {
    if (mode === 'edit' && quotation) {
      setFormData({
        leadId: quotation.leadId || '',
        visitId: quotation.visitId || '',
        quoteDate: quotation.quoteDate ? quotation.quoteDate.split('T')[0] : '',
        quoteAmount: quotation.quoteAmount || 0,
        preparedBy: quotation.preparedBy || '',
        validUntil: quotation.validUntil ? quotation.validUntil.split('T')[0] : '',
        status: quotation.status || 'Draft',
        notes: quotation.notes || '',
        attachmentFileId: quotation.attachmentFileId || '',
        deliveryStatus: quotation.deliveryStatus || '',
        deliveryDate: quotation.deliveryDate ? quotation.deliveryDate.split('T')[0] : '',
      });
      setUploadedFileName(quotation.attachmentFileId ? 'Existing file' : null);
      // Load visits for this lead
      if (quotation.leadId) {
        loadVisitsForLead(quotation.leadId);
      }
    } else if (mode === 'add') {
      const today = new Date();
      const validUntilDate = new Date(today);
      validUntilDate.setDate(validUntilDate.getDate() + 30); // Default 30 days validity

      setFormData({
        ...initialFormData,
        quoteDate: today.toISOString().split('T')[0],
        validUntil: validUntilDate.toISOString().split('T')[0],
      });
      setLeadVisits([]);
      setUploadedFileName(null);
      // Load initial lead options when opening add modal
      loadInitialLeads();
    }
  }, [mode, quotation, loadVisitsForLead, loadInitialLeads]);

  // Search leads with debounce
  const handleLeadSearch = useCallback((term: string) => {
    setLeadSearchTerm(term);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      setLoadingLeads(true);
      try {
        const leads = await onSearchLeads(term, 100);
        setLeadOptions(leads);
      } catch (err) {
        console.error('Failed to search leads:', err);
      } finally {
        setLoadingLeads(false);
      }
    }, 300);
  }, [onSearchLeads]);

  // Handle lead selection
  const handleSelectLead = (lead: Lead) => {
    setFormData((prev) => ({ ...prev, leadId: lead.id, visitId: '' })); // Clear visit when lead changes
    setLeadSearchTerm('');
    setShowLeadDropdown(false);
    // Load visits for this lead
    loadVisitsForLead(lead.id);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowLeadDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setError(null);

    try {
      const result = await uploadFile(file, 'Quotations');
      setFormData((prev) => ({ ...prev, attachmentFileId: result.fileId }));
      setUploadedFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  // Remove uploaded file
  const handleRemoveFile = () => {
    setFormData((prev) => ({ ...prev, attachmentFileId: '' }));
    setUploadedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.leadId) {
      setError('Please select a lead/farmer');
      return;
    }
    if (!formData.quoteDate) {
      setError('Quote date is required');
      return;
    }
    if (!formData.quoteAmount || formData.quoteAmount <= 0) {
      setError('Quote amount must be greater than 0');
      return;
    }
    if (!formData.status) {
      setError('Status is required');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save quotation');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const title =
    mode === 'add'
      ? 'Create Quotation'
      : mode === 'edit'
      ? 'Edit Quotation'
      : 'Quotation Details';

  // Get lead info for display in view mode
  const viewLead = quotation ? leadMap.get(quotation.leadId) : null;

  // Format currency for display
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          {quotation && mode !== 'add' && (
            <span className="quotation-display-id">{quotation.displayId}</span>
          )}
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-body">
          {/* Lead & Visit Selection Section */}
          <div className="form-section">
            <h3>Farmer & Visit Information</h3>
            {isReadOnly && viewLead ? (
              <div className="lead-info-readonly">
                <div className="lead-info-row">
                  <span className="label">Lead ID:</span>
                  <span className="value">{viewLead.displayId}</span>
                </div>
                <div className="lead-info-row">
                  <span className="label">Farmer:</span>
                  <span className="value">{viewLead.farmerName}</span>
                </div>
                <div className="lead-info-row">
                  <span className="label">Phone:</span>
                  <span className="value">{viewLead.phone}</span>
                </div>
                <div className="lead-info-row">
                  <span className="label">Location:</span>
                  <span className="value">
                    {viewLead.village && `${viewLead.village}, `}
                    {viewLead.taluk && `${viewLead.taluk}, `}
                    {viewLead.district}
                  </span>
                </div>
                <div className="lead-info-row">
                  <span className="label">Crop:</span>
                  <span className="value">
                    {viewLead.cropType} - {viewLead.farmSizeAcres} acres
                  </span>
                </div>
                <div className="lead-info-row">
                  <span className="label">Lead Owner:</span>
                  <span className="value">{viewLead.leadOwner || '-'}</span>
                </div>
                {quotation?.visitId && selectedVisit && (
                  <div className="lead-info-row">
                    <span className="label">Visit:</span>
                    <span className="value">
                      {selectedVisit.displayId} - {formatDate(selectedVisit.scheduledDate)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="form-grid">
                {/* Lead Selection */}
                <div className="form-group full-width" ref={dropdownRef}>
                  <label htmlFor="leadSearch">Select Farmer *</label>
                  {mode === 'edit' && selectedLead ? (
                    // In edit mode, show selected lead as read-only
                    <div className="selected-lead-display">
                      {selectedLead.displayId} - {selectedLead.farmerName} ({selectedLead.district})
                    </div>
                  ) : (
                    // In add mode, show searchable dropdown
                    <div className="lead-search-container">
                      <input
                        type="text"
                        id="leadSearch"
                        placeholder={selectedLead ? `${selectedLead.displayId} - ${selectedLead.farmerName}` : "Search by name, phone, or location..."}
                        value={leadSearchTerm}
                        onChange={(e) => handleLeadSearch(e.target.value)}
                        onFocus={() => setShowLeadDropdown(true)}
                        className="lead-search-input"
                        autoComplete="off"
                      />
                      {showLeadDropdown && (
                        <div className="lead-dropdown">
                          {loadingLeads ? (
                            <div className="lead-dropdown-loading">Searching...</div>
                          ) : leadOptions.length === 0 ? (
                            <div className="lead-dropdown-empty">No leads found</div>
                          ) : (
                            leadOptions.map((lead: Lead) => (
                              <div
                                key={lead.id}
                                className={`lead-dropdown-item ${formData.leadId === lead.id ? 'selected' : ''}`}
                                onClick={() => handleSelectLead(lead)}
                              >
                                <span className="lead-display-id">{lead.displayId}</span>
                                <span className="lead-name">{lead.farmerName}</span>
                                <span className="lead-location">{lead.village && `${lead.village}, `}{lead.district}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {!formData.leadId && !selectedLead && (
                    <input type="hidden" name="leadId" value="" required />
                  )}
                </div>

                {selectedLead && (
                  <div className="selected-lead-info">
                    <p>📞 {selectedLead.phone}</p>
                    <p>📍 {selectedLead.village && `${selectedLead.village}, `}{selectedLead.taluk && `${selectedLead.taluk}, `}{selectedLead.district}</p>
                    <p>🌱 {selectedLead.cropType} - {selectedLead.farmSizeAcres} acres</p>
                    <p>👤 Owner: {selectedLead.leadOwner || '-'}</p>
                  </div>
                )}

                {/* Visit Selection (optional) - shown after lead is selected */}
                {selectedLead && (
                  <div className="form-group full-width">
                    <label htmlFor="visitId">Link to Field Visit (Optional)</label>
                    <select
                      id="visitId"
                      name="visitId"
                      value={formData.visitId}
                      onChange={handleChange}
                      disabled={loadingVisits}
                    >
                      <option value="">-- No visit linked --</option>
                      {loadingVisits ? (
                        <option disabled>Loading visits...</option>
                      ) : leadVisits.length === 0 ? (
                        <option disabled>No visits for this lead</option>
                      ) : (
                        leadVisits.map((visit: FieldVisit) => (
                          <option key={visit.id} value={visit.id}>
                            {visit.displayId} - {formatDate(visit.scheduledDate)} ({visit.status})
                          </option>
                        ))
                      )}
                    </select>
                    {formData.visitId && selectedVisit && (
                      <div className="visit-info-hint">
                        Outcome: {selectedVisit.visitOutcome || 'Not recorded'} |
                        Condition: {selectedVisit.cropCondition || 'Not recorded'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quotation Details Section */}
          <div className="form-section">
            <h3>Quotation Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="quoteDate">Quote Date *</label>
                <input
                  type="date"
                  id="quoteDate"
                  name="quoteDate"
                  value={isReadOnly && quotation ? (quotation.quoteDate?.split('T')[0] || '') : formData.quoteDate}
                  onChange={handleChange}
                  onKeyDown={(e) => e.preventDefault()}
                  disabled={isReadOnly}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="quoteAmount">Amount (INR) *</label>
                {isReadOnly && quotation ? (
                  <div className="amount-display">{formatCurrency(quotation.quoteAmount)}</div>
                ) : (
                  <input
                    type="number"
                    id="quoteAmount"
                    name="quoteAmount"
                    value={formData.quoteAmount || ''}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    min="0"
                    required
                  />
                )}
              </div>

              <div className="form-group">
                <label htmlFor="validUntil">Valid Until</label>
                <input
                  type="date"
                  id="validUntil"
                  name="validUntil"
                  value={isReadOnly && quotation ? (quotation.validUntil?.split('T')[0] || '') : formData.validUntil}
                  onChange={handleChange}
                  onKeyDown={(e) => e.preventDefault()}
                  disabled={isReadOnly}
                />
              </div>

              <div className="form-group">
                <label htmlFor="status">Status *</label>
                <select
                  id="status"
                  name="status"
                  value={isReadOnly && quotation ? quotation.status : formData.status}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  required
                >
                  {lookups.quotationStatuses.length > 0 ? (
                    lookups.quotationStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Draft">Draft</option>
                      <option value="Sent">Sent</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Expired">Expired</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="deliveryStatus">Delivery Status</label>
                <select
                  id="deliveryStatus"
                  name="deliveryStatus"
                  value={isReadOnly && quotation ? (quotation.deliveryStatus || '') : formData.deliveryStatus}
                  onChange={handleChange}
                  disabled={isReadOnly}
                >
                  <option value="">-- Select --</option>
                  {lookups.deliveryStatuses.length > 0 ? (
                    lookups.deliveryStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Pending">Pending</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Partial">Partial</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="deliveryDate">Delivery Date</label>
                <input
                  type="date"
                  id="deliveryDate"
                  name="deliveryDate"
                  value={isReadOnly && quotation ? (quotation.deliveryDate?.split('T')[0] || '') : formData.deliveryDate}
                  onChange={handleChange}
                  onKeyDown={(e) => e.preventDefault()}
                  disabled={isReadOnly}
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={isReadOnly && quotation ? quotation.notes : formData.notes}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  rows={3}
                  placeholder="Enter any notes or special terms for this quotation..."
                />
              </div>

              {/* File Attachment */}
              <div className="form-group full-width">
                <label>Quotation Document</label>
                {isReadOnly ? (
                  // View mode - show download link if file exists
                  quotation?.attachmentFileId ? (
                    <div className="file-attachment-view">
                      <a
                        href={getDownloadLink(quotation.attachmentFileId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="file-link download"
                      >
                        Download
                      </a>
                    </div>
                  ) : (
                    <span className="no-file">No document attached</span>
                  )
                ) : (
                  // Edit/Add mode - show upload
                  <div className="file-upload-container">
                    {formData.attachmentFileId ? (
                      <div className="uploaded-file">
                        <span className="file-name">{uploadedFileName || 'File attached'}</span>
                        <div className="file-actions">
                          <a
                            href={getDownloadLink(formData.attachmentFileId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="file-link download"
                          >
                            Download
                          </a>
                          <button
                            type="button"
                            className="btn-remove-file"
                            onClick={handleRemoveFile}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="file-input-wrapper">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                          disabled={uploadingFile}
                        />
                        {uploadingFile && <span className="uploading-text">Uploading...</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Metadata (view mode only) */}
          {isReadOnly && quotation && (
            <div className="form-section">
              <h3>Metadata</h3>
              <div className="form-grid metadata">
                <div className="form-group">
                  <label>Prepared By</label>
                  <span className="metadata-value">{quotation.preparedBy}</span>
                </div>
                <div className="form-group">
                  <label>Last Updated</label>
                  <span className="metadata-value">
                    {new Date(quotation.lastUpdated).toLocaleDateString()}
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
                {saving ? 'Saving...' : mode === 'add' ? 'Create Quotation' : 'Save Changes'}
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

        .quotation-display-id {
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

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 500;
          color: #555;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #667eea;
        }

        .form-group input:disabled,
        .form-group select:disabled,
        .form-group textarea:disabled {
          background: #f5f5f5;
          cursor: default;
        }

        .lead-info-readonly {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
        }

        .lead-info-row {
          display: flex;
          gap: 12px;
          padding: 6px 0;
        }

        .lead-info-row .label {
          font-weight: 500;
          color: #666;
          min-width: 80px;
        }

        .lead-info-row .value {
          color: #333;
        }

        .selected-lead-info {
          grid-column: 1 / -1;
          background: #e8f5e9;
          padding: 12px 16px;
          border-radius: 6px;
          font-size: 14px;
        }

        .selected-lead-info p {
          margin: 4px 0;
          color: #2e7d32;
        }

        .visit-info-hint {
          margin-top: 8px;
          font-size: 12px;
          color: #666;
          background: #f5f5f5;
          padding: 8px 12px;
          border-radius: 4px;
        }

        /* Searchable Lead Dropdown Styles */
        .lead-search-container {
          position: relative;
        }

        .lead-search-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }

        .lead-search-input:focus {
          outline: none;
          border-color: #667eea;
        }

        .lead-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          max-height: 250px;
          overflow-y: auto;
          background: white;
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 6px 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 100;
        }

        .lead-dropdown-loading,
        .lead-dropdown-empty {
          padding: 12px 16px;
          color: #666;
          font-size: 14px;
          text-align: center;
        }

        .lead-dropdown-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 10px 16px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
          transition: background 0.15s;
        }

        .lead-dropdown-item:last-child {
          border-bottom: none;
        }

        .lead-dropdown-item:hover {
          background: #f5f5f5;
        }

        .lead-dropdown-item.selected {
          background: #e8f0fe;
        }

        .lead-dropdown-item .lead-display-id {
          font-weight: 600;
          color: #667eea;
          font-size: 12px;
        }

        .lead-dropdown-item .lead-name {
          font-weight: 500;
          color: #333;
          font-size: 14px;
        }

        .lead-dropdown-item .lead-location {
          font-size: 12px;
          color: #666;
        }

        .selected-lead-display {
          padding: 10px 12px;
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          color: #333;
        }

        .amount-display {
          padding: 10px 12px;
          background: #e8f5e9;
          border: 1px solid #c8e6c9;
          border-radius: 6px;
          font-size: 18px;
          font-weight: 600;
          color: #2e7d32;
        }

        .metadata-value {
          font-size: 14px;
          color: #333;
          padding: 10px 0;
        }

        /* File Upload Styles */
        .file-attachment-view {
          display: flex;
          gap: 12px;
        }

        .file-link {
          display: inline-block;
          padding: 8px 16px;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
        }

        .file-link:hover {
          background: #5568d3;
        }

        .file-link.download {
          background: #4caf50;
        }

        .file-link.download:hover {
          background: #43a047;
        }

        .no-file {
          color: #999;
          font-style: italic;
          font-size: 14px;
        }

        .file-upload-container {
          margin-top: 4px;
        }

        .uploaded-file {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: #e8f5e9;
          border: 1px solid #c8e6c9;
          border-radius: 6px;
        }

        .file-name {
          font-size: 14px;
          color: #2e7d32;
          font-weight: 500;
        }

        .file-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .file-actions .file-link {
          padding: 4px 12px;
          font-size: 12px;
        }

        .btn-remove-file {
          background: #f44336;
          color: white;
          border: none;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
        }

        .btn-remove-file:hover {
          background: #d32f2f;
        }

        .file-input-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .file-input-wrapper input[type="file"] {
          font-size: 14px;
        }

        .uploading-text {
          color: #667eea;
          font-size: 13px;
          font-weight: 500;
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

          .form-grid.metadata {
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
