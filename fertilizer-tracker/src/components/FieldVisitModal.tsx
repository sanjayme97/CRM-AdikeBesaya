/**
 * Field Visit Modal Component
 *
 * Modal for viewing, scheduling, and editing field visits
 * Supports three modes: 'view', 'add', 'edit'
 * Uses searchable lead dropdown that fetches from sheets
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { FieldVisit, Lead } from '../types';
import { CROP_PROBLEMS } from '../types';
import { uploadFile, getDownloadLink } from '../services/driveService';

interface FieldVisitModalProps {
  isOpen: boolean;
  mode: 'view' | 'add' | 'edit';
  visit?: FieldVisit | null;
  leadMap: Map<string, Lead>;
  onSearchLeads: (searchTerm: string, limit?: number) => Promise<Lead[]>;
  lookups: {
    visitStatuses: string[];
    visitOutcomes: string[];
    cropConditions: string[];
    users: Array<{ email: string; role: string }>;
  };
  onClose: () => void;
  onSave: (visitData: Partial<FieldVisit>) => Promise<void>;
}

const initialFormData = {
  leadId: '',
  scheduledDate: '',
  actualDate: '',
  visitorId: '',
  visitOutcome: '',
  cropCondition: '',
  identifiedProblems: [] as string[],
  diagnosisNotes: '',
  followUpDate: '',
  status: 'Scheduled',
  visitedBy: [] as string[],
  quotationRequested: false,
  assignedTo: '',
  attachmentFileId: '',
};

export function FieldVisitModal({
  isOpen,
  mode,
  visit,
  leadMap,
  onSearchLeads,
  lookups,
  onClose,
  onSave,
}: FieldVisitModalProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Track if quotation was already requested when modal opened (for field locking)
  const [wasQuotationRequested, setWasQuotationRequested] = useState(false);

  // Searchable lead dropdown state
  const [leadSearchTerm, setLeadSearchTerm] = useState('');
  const [leadOptions, setLeadOptions] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get selected lead info from leadMap or leadOptions
  const selectedLead = leadMap.get(formData.leadId) || leadOptions.find((l: Lead) => l.id === formData.leadId);

  // Populate form when editing
  useEffect(() => {
    if (mode === 'edit' && visit) {
      setFormData({
        leadId: visit.leadId || '',
        scheduledDate: visit.scheduledDate ? visit.scheduledDate.slice(0, 16) : '', // Keep datetime format
        actualDate: visit.actualDate ? visit.actualDate.split('T')[0] : '',
        visitorId: visit.visitorId || '',
        visitOutcome: visit.visitOutcome || '',
        cropCondition: visit.cropCondition || '',
        identifiedProblems: visit.identifiedProblems || [],
        diagnosisNotes: visit.diagnosisNotes || '',
        followUpDate: visit.followUpDate ? visit.followUpDate.split('T')[0] : '',
        status: visit.status || 'Scheduled',
        visitedBy: visit.visitedBy || [],
        quotationRequested: visit.quotationRequested || false,
        assignedTo: visit.assignedTo || '',
        attachmentFileId: visit.attachmentFileId || '',
      });
      setUploadedFileName(visit.attachmentFileId ? 'Existing file' : null);
      // Track original state for field locking
      setWasQuotationRequested(visit.quotationRequested || false);
    } else if (mode === 'add') {
      // Default to today at 10:00 AM
      const now = new Date();
      now.setHours(10, 0, 0, 0);
      setFormData({
        ...initialFormData,
        scheduledDate: now.toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:mm
      });
      setWasQuotationRequested(false);
      setUploadedFileName(null);
      // Load initial lead options when opening add modal
      loadInitialLeads();
    }
  }, [mode, visit]);

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
    setFormData((prev) => ({ ...prev, leadId: lead.id }));
    setLeadSearchTerm('');
    setShowLeadDropdown(false);
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
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => {
      const updates: Partial<typeof prev> = {
        [name]: type === 'checkbox' ? checked : value,
      };

      // Clear assignedTo when quotationRequested is unchecked
      if (name === 'quotationRequested' && !checked) {
        updates.assignedTo = '';
      }

      // Clear visitedBy, quotationRequested, assignedTo when status changes away from Visited
      if (name === 'status' && value !== 'Visited') {
        updates.visitedBy = [];
        updates.quotationRequested = false;
        updates.assignedTo = '';
      }

      // Clear quotationRequested and assignedTo when visitOutcome changes away from Successful
      if (name === 'visitOutcome' && value !== 'Successful') {
        updates.quotationRequested = false;
        updates.assignedTo = '';
      }

      return { ...prev, ...updates };
    });
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setError(null);

    try {
      const result = await uploadFile(file, 'FieldVisits');
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

  // Handle PDF generation
  const handleGeneratePDF = async () => {
    if (!visit) return;
    setGeneratingPDF(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { FieldVisitPDF } = await import('./FieldVisitPDF');

      const blob = await pdf(
        FieldVisitPDF({
          visit,
          lead: viewLead || null,
        })
      ).toBlob();

      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('PDF generation failed, falling back to browser print:', err);
      window.print();
    } finally {
      setGeneratingPDF(false);
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
    if (!formData.scheduledDate) {
      setError('Scheduled date is required');
      return;
    }
    if (!formData.status) {
      setError('Status is required');
      return;
    }

    // If status is "Visited", actualDate and visitOutcome are required
    if (formData.status === 'Visited') {
      if (!formData.actualDate) {
        setError('Actual Visit Date is required when status is Visited');
        return;
      }
      if (!formData.visitOutcome) {
        setError('Outcome is required when status is Visited');
        return;
      }
    }

    // If outcome is "Follow-up Needed", followUpDate is required
    if (formData.visitOutcome === 'Follow-up Needed' && !formData.followUpDate) {
      setError('Follow-up Date is required when outcome is Follow-up Needed');
      return;
    }

    // If quotationRequested is true, assignedTo is required
    if (formData.quotationRequested && !formData.assignedTo) {
      setError('Assigned To is required when Quotation Requested is checked');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save visit');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const title =
    mode === 'add'
      ? 'Schedule Field Visit'
      : mode === 'edit'
      ? 'Edit Visit'
      : 'Visit Details';

  // Get lead info for display in view mode
  const viewLead = visit ? leadMap.get(visit.leadId) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Print-only header */}
        <div className="print-only-header">
          <h1>Fertilizer Tracker CRM</h1>
          <p>Field Visit Report</p>
          <p className="print-date">Printed on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
        </div>

        <div className="modal-header">
          <h2>{title}</h2>
          {visit && mode !== 'add' && (
            <span className="visit-display-id">{visit.displayId}</span>
          )}
          {isReadOnly && (
            <button className="btn-print no-print" onClick={handleGeneratePDF} disabled={generatingPDF} title="Print Visit Details">
              {generatingPDF ? 'Generating...' : '🖨️ Print'}
            </button>
          )}
          <button className="modal-close no-print" onClick={onClose}>
            &times;
          </button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-body">
          {/* Lead Selection Section */}
          <div className="form-section">
            <h3>Farmer Information</h3>
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
                  <span className="label">Lead Owner:</span>
                  <span className="value">{viewLead.leadOwner || '-'}</span>
                </div>
                <div className="lead-info-row">
                  <span className="label">Crop:</span>
                  <span className="value">
                    {viewLead.cropType} - {viewLead.farmSizeAcres} acres
                  </span>
                </div>
              </div>
            ) : (
              <div className="form-grid">
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
              </div>
            )}
          </div>

          {/* Visit Schedule Section */}
          <div className="form-section">
            <h3>Visit Schedule</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="scheduledDate">Scheduled Date & Time *</label>
                <input
                  type="datetime-local"
                  id="scheduledDate"
                  name="scheduledDate"
                  value={isReadOnly && visit ? (visit.scheduledDate?.slice(0, 16) || '') : formData.scheduledDate}
                  onChange={handleChange}
                  onKeyDown={(e) => e.preventDefault()}
                  disabled={isReadOnly}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="status">Status *</label>
                <select
                  id="status"
                  name="status"
                  value={isReadOnly && visit ? visit.status : formData.status}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  required
                >
                  {lookups.visitStatuses.length > 0 ? (
                    lookups.visitStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Visited">Visited</option>
                      <option value="Cancelled">Cancelled</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Visit Outcome Section */}
          <div className="form-section">
            <h3>Visit Outcome</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="actualDate">
                  Actual Visit Date {formData.status === 'Visited' && <span className="required">*</span>}
                </label>
                <input
                  type="date"
                  id="actualDate"
                  name="actualDate"
                  value={isReadOnly && visit ? (visit.actualDate?.split('T')[0] || '') : formData.actualDate}
                  onChange={handleChange}
                  onKeyDown={(e) => e.preventDefault()}
                  disabled={isReadOnly}
                  required={formData.status === 'Visited'}
                />
              </div>

              <div className="form-group">
                <label htmlFor="followUpDate">
                  Follow-up Date {formData.visitOutcome === 'Follow-up Needed' && <span className="required">*</span>}
                </label>
                <input
                  type="date"
                  id="followUpDate"
                  name="followUpDate"
                  value={isReadOnly && visit ? (visit.followUpDate?.split('T')[0] || '') : formData.followUpDate}
                  onChange={handleChange}
                  onKeyDown={(e) => e.preventDefault()}
                  disabled={isReadOnly}
                  required={formData.visitOutcome === 'Follow-up Needed'}
                />
              </div>

              <div className="form-group">
                <label htmlFor="visitOutcome">
                  Outcome {formData.status === 'Visited' && <span className="required">*</span>}
                </label>
                <select
                  id="visitOutcome"
                  name="visitOutcome"
                  value={isReadOnly && visit ? visit.visitOutcome : formData.visitOutcome}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  required={formData.status === 'Visited'}
                >
                  <option value="">Select Outcome</option>
                  {lookups.visitOutcomes.length > 0 ? (
                    lookups.visitOutcomes.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Successful">Successful</option>
                      <option value="Follow-up Needed">Follow-up Needed</option>
                      <option value="Not Interested">Not Interested</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="cropCondition">Crop Condition</label>
                <select
                  id="cropCondition"
                  name="cropCondition"
                  value={isReadOnly && visit ? visit.cropCondition : formData.cropCondition}
                  onChange={handleChange}
                  disabled={isReadOnly}
                >
                  <option value="">Select Condition</option>
                  {lookups.cropConditions.length > 0 ? (
                    lookups.cropConditions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Healthy">Healthy</option>
                      <option value="Pest Issues">Pest Issues</option>
                      <option value="Nutrient Deficiency">Nutrient Deficiency</option>
                      <option value="Disease">Disease</option>
                    </>
                  )}
                </select>
              </div>

              {/* Identified Problems - Checkboxes */}
              <div className="form-group full-width">
                <label>Identified Problems / Diseases (ಗುರುತಿಸಲಾದ ಸಮಸ್ಯೆಗಳು / ರೋಗಗಳು)</label>
                <div className={`problems-grid ${isReadOnly ? 'disabled' : ''}`}>
                  {CROP_PROBLEMS.map((problem) => {
                    const problemKey = problem.en;
                    const isChecked = isReadOnly && visit
                      ? (visit.identifiedProblems || []).includes(problemKey)
                      : formData.identifiedProblems.includes(problemKey);

                    return (
                      <label key={problemKey} className="problem-checkbox-label">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (!isReadOnly) {
                              const checked = e.target.checked;
                              setFormData((prev) => ({
                                ...prev,
                                identifiedProblems: checked
                                  ? [...prev.identifiedProblems, problemKey]
                                  : prev.identifiedProblems.filter((p) => p !== problemKey),
                              }));
                            }
                          }}
                          disabled={isReadOnly}
                        />
                        <span className="problem-text">
                          <span className="problem-en">{problem.en}</span>
                          <span className="problem-kn">{problem.kn}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {!isReadOnly && formData.identifiedProblems.length === 0 && (
                  <p className="help-text">Select all problems that apply</p>
                )}
                {(isReadOnly || formData.identifiedProblems.length > 0) && (
                  <p className="selected-count">
                    {isReadOnly && visit ? visit.identifiedProblems?.length || 0 : formData.identifiedProblems.length} problem(s) selected
                  </p>
                )}
              </div>

              <div className="form-group full-width">
                <label htmlFor="diagnosisNotes">Diagnosis Notes</label>
                <textarea
                  id="diagnosisNotes"
                  name="diagnosisNotes"
                  value={isReadOnly && visit ? visit.diagnosisNotes : formData.diagnosisNotes}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  rows={3}
                  placeholder="Enter observations, diagnosis, and notes from the field visit..."
                  className="screen-only"
                />
                <div className="print-only-text">
                  {isReadOnly && visit ? visit.diagnosisNotes : formData.diagnosisNotes}
                </div>
              </div>

              {/* File Attachment */}
              <div className="form-group full-width">
                <label>Visit Photos/Documents</label>
                {isReadOnly ? (
                  // View mode - show download link if file exists
                  visit?.attachmentFileId ? (
                    <div className="file-attachment-view">
                      <a
                        href={getDownloadLink(visit.attachmentFileId)}
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

              {/* Visited By - always visible, disabled when status is not Visited */}
              <div className="form-group full-width">
                <label>Visited By</label>
                <div className={`multi-select-container ${isReadOnly || formData.status !== 'Visited' ? 'disabled' : ''}`}>
                  <div className="chips-container">
                    {(isReadOnly && visit ? visit.visitedBy : formData.visitedBy).map((email) => {
                      const user = lookups.users.find((u) => u.email === email);
                      return (
                        <span key={email} className="chip">
                          {email.split('@')[0]}
                          {user && ` (${user.role})`}
                          {!isReadOnly && formData.status === 'Visited' && (
                            <button
                              type="button"
                              className="chip-remove"
                              onClick={() => setFormData((prev) => ({
                                ...prev,
                                visitedBy: prev.visitedBy.filter((e) => e !== email),
                              }))}
                            >
                              ×
                            </button>
                          )}
                        </span>
                      );
                    })}
                    {!isReadOnly && formData.status === 'Visited' && (
                      <select
                        className="add-user-select"
                        value=""
                        onChange={(e) => {
                          if (e.target.value && !formData.visitedBy.includes(e.target.value)) {
                            setFormData((prev) => ({
                              ...prev,
                              visitedBy: [...prev.visitedBy, e.target.value],
                            }));
                          }
                        }}
                      >
                        <option value="">+ Add User</option>
                        {lookups.users
                          .filter((u) => !formData.visitedBy.includes(u.email))
                          .map((u) => (
                            <option key={u.email} value={u.email}>
                              {u.email.split('@')[0]} ({u.role})
                            </option>
                          ))}
                      </select>
                    )}
                    {(isReadOnly || formData.status !== 'Visited') && formData.visitedBy.length === 0 && (
                      <span className="empty-placeholder">-</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quotation Requested - locked in edit mode if was already requested */}
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="quotationRequested"
                    checked={isReadOnly && visit ? visit.quotationRequested : formData.quotationRequested}
                    onChange={handleChange}
                    disabled={isReadOnly || formData.visitOutcome !== 'Successful' || (mode === 'edit' && wasQuotationRequested)}
                  />
                  Quotation Requested
                  {mode === 'edit' && wasQuotationRequested && (
                    <span className="locked-indicator" title="Cannot change - quotation already created">🔒</span>
                  )}
                </label>
              </div>

              {/* Assigned To - locked in edit mode if quotation was already requested */}
              <div className="form-group">
                <label htmlFor="assignedTo">
                  Assigned To {formData.quotationRequested && <span className="required">*</span>}
                  {mode === 'edit' && wasQuotationRequested && (
                    <span className="locked-indicator" title="Cannot change - quotation already created">🔒</span>
                  )}
                </label>
                <select
                  id="assignedTo"
                  name="assignedTo"
                  value={isReadOnly && visit ? visit.assignedTo : formData.assignedTo}
                  onChange={handleChange}
                  disabled={isReadOnly || !formData.quotationRequested || (mode === 'edit' && wasQuotationRequested)}
                  required={formData.quotationRequested}
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
          </div>

          {/* Metadata (view mode only) */}
          {isReadOnly && visit && (
            <div className="form-section">
              <h3>Metadata</h3>
              <div className="form-grid metadata">
                <div className="form-group">
                  <label>Visitor</label>
                  <span className="metadata-value">{visit.visitorId}</span>
                </div>
                {visit.visitedBy && visit.visitedBy.length > 0 && (
                  <div className="form-group">
                    <label>Visited By</label>
                    <span className="metadata-value">
                      {visit.visitedBy.map((e) => e.split('@')[0]).join(', ')}
                    </span>
                  </div>
                )}
                {visit.quotationRequested && (
                  <div className="form-group">
                    <label>Quotation Requested</label>
                    <span className="metadata-value">Yes</span>
                  </div>
                )}
                {visit.assignedTo && (
                  <div className="form-group">
                    <label>Assigned To</label>
                    <span className="metadata-value">{visit.assignedTo.split('@')[0]}</span>
                  </div>
                )}
                <div className="form-group">
                  <label>Created By</label>
                  <span className="metadata-value">{visit.createdBy}</span>
                </div>
                <div className="form-group">
                  <label>Created Date</label>
                  <span className="metadata-value">
                    {new Date(visit.createdDate).toLocaleDateString()}
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
                {saving ? 'Saving...' : mode === 'add' ? 'Schedule Visit' : 'Save Changes'}
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

        .print-only-header {
          display: none;
        }

        .print-only-text {
          display: none;
        }

        .screen-only {
          display: block;
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

        .visit-display-id {
          background: #667eea;
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
        }

        .btn-print {
          background: #4caf50;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .btn-print:hover {
          background: #43a047;
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
          grid-template-columns: repeat(3, 1fr);
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

        .required {
          color: #dc3545;
          margin-left: 2px;
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

        .checkbox-group {
          flex-direction: row;
          align-items: center;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
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

        .metadata-value {
          font-size: 14px;
          color: #333;
          padding: 10px 0;
        }

        /* Multi-select chips styles */
        .multi-select-container {
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 8px 12px;
          min-height: 42px;
          background: white;
        }

        .multi-select-container.disabled {
          background: #f5f5f5;
        }

        .chips-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #e8f0fe;
          color: #1a73e8;
          padding: 4px 10px;
          border-radius: 16px;
          font-size: 13px;
          font-weight: 500;
        }

        .chip-remove {
          background: none;
          border: none;
          color: #1a73e8;
          font-size: 16px;
          cursor: pointer;
          padding: 0 2px;
          line-height: 1;
        }

        .chip-remove:hover {
          color: #c00;
        }

        .add-user-select {
          background: #667eea;
          color: white;
          border: none;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 13px;
          cursor: pointer;
        }

        .add-user-select:hover {
          background: #5568d3;
        }

        .add-user-select option {
          background: white;
          color: #333;
        }

        .empty-placeholder {
          color: #999;
          font-style: italic;
          font-size: 13px;
        }

        .locked-indicator {
          margin-left: 8px;
          font-size: 12px;
          color: #666;
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

        /* Problem Identification Checkboxes */
        .problems-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          padding: 12px;
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
        }

        .problems-grid.disabled {
          background: #f5f5f5;
        }

        .problem-checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          padding: 6px 10px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .problem-checkbox-label:hover:not(.disabled) {
          border-color: #667eea;
          background: #f8f9ff;
        }

        .problem-checkbox-label input[type="checkbox"] {
          margin-top: 3px;
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          cursor: pointer;
        }

        .problem-checkbox-label input[type="checkbox"]:disabled {
          cursor: default;
        }

        .problem-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }

        .problem-en {
          font-size: 13px;
          font-weight: 500;
          color: #333;
          line-height: 1.3;
        }

        .problem-kn {
          font-size: 12px;
          color: #666;
          line-height: 1.3;
        }

        .help-text {
          font-size: 12px;
          color: #666;
          font-style: italic;
          margin: 8px 0 0 0;
        }

        .selected-count {
          font-size: 13px;
          color: #667eea;
          font-weight: 500;
          margin: 8px 0 0 0;
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

          .problems-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Print Styles */
        @media print {
          /* Remove default page margins */
          @page {
            margin: 0.3cm;
            size: A4;
          }

          /* Hide everything except the modal */
          body * {
            visibility: hidden;
          }

          .modal-overlay,
          .modal-overlay * {
            visibility: visible;
          }

          body {
            margin: 0 !important;
            padding: 0 !important;
          }

          .modal-overlay {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: none !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }

          .modal-content {
            max-width: 100% !important;
            max-height: none !important;
            height: auto !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }

          .print-only-header {
            display: block;
            text-align: center;
            padding: 5px 0 8px 0;
            border-bottom: 2px solid #333;
            margin: 0 0 10px 0;
          }

          .print-only-header h1 {
            margin: 0 0 3px 0;
            font-size: 20px;
            color: #333;
          }

          .print-only-header p {
            margin: 2px 0;
            font-size: 12px;
            color: #666;
          }

          .print-date {
            font-size: 9px !important;
            color: #999 !important;
          }

          .modal-header {
            border-bottom: 1px solid #333;
            padding: 5px 0 6px 0;
            margin-bottom: 8px;
          }

          .modal-header h2 {
            font-size: 16px;
            margin: 0;
          }

          .visit-display-id {
            background: #333;
            font-size: 11px;
            padding: 3px 10px;
          }

          .no-print,
          .modal-close,
          .btn-print,
          .modal-footer {
            display: none !important;
          }

          .modal-body {
            padding: 0 !important;
            overflow: visible !important;
            margin: 0 !important;
            max-height: none !important;
            height: auto !important;
            min-height: 0 !important;
            flex: none !important;
            display: block !important;
          }

          .modal-header {
            margin: 0;
            padding: 8px 0;
          }

          .modal-form {
            display: block !important;
            flex: none !important;
            min-height: 0 !important;
          }

          .form-section {
            page-break-inside: auto;
            page-break-before: auto;
            page-break-after: auto;
            margin-bottom: 8px;
            padding: 0;
          }

          /* Allow sections with long content to break naturally */
          .form-section:not(:last-child) {
            page-break-before: auto !important;
            page-break-after: auto;
          }

          .form-section h3 {
            color: #333;
            border-bottom: 1px solid #333;
            font-size: 14px;
            margin: 0 0 6px 0;
            padding-bottom: 3px;
          }

          /* Prevent orphaned sections */
          .form-section:not(:last-child) {
            orphans: 3;
            widows: 3;
          }

          .form-grid {
            gap: 6px;
            margin-bottom: 4px;
          }

          .form-group {
            margin-bottom: 3px;
          }

          .form-group.full-width {
            margin-bottom: 4px;
          }

          .form-group label {
            font-weight: bold;
            color: #333;
            font-size: 11px;
            margin: 0 0 1px 0;
            padding: 0;
            line-height: 1.2;
          }

          .form-group input,
          .form-group select,
          .form-group textarea {
            border: none;
            background: none;
            padding: 1px 0;
            font-size: 11px;
            color: #000;
            line-height: 1.3;
            margin: 0;
            overflow: visible;
          }

          .form-group select {
            height: auto;
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
          }

          /* Hide textarea on print, show text content instead */
          .screen-only {
            display: none !important;
          }

          .print-only-text {
            display: block !important;
            width: 100% !important;
            white-space: pre-wrap !important;
            word-wrap: break-word !important;
            border: 1px solid #ddd !important;
            padding: 4px !important;
            line-height: 1.4 !important;
            font-size: 11px !important;
            color: #000 !important;
            min-height: 20px !important;
          }

          .metadata-value {
            padding: 1px 0;
            font-size: 11px;
            line-height: 1.3;
          }

          .lead-info-readonly {
            background: none;
            border: 1px solid #ddd;
            padding: 6px;
          }

          .lead-info-row {
            padding: 2px 0;
          }

          .lead-info-row .label {
            font-size: 11px;
          }

          .lead-info-row .value {
            font-size: 11px;
          }

          .selected-lead-info {
            background: none;
            border: 1px solid #ddd;
            padding: 6px;
          }

          .status-badge {
            border: 1px solid #333;
          }

          .problems-grid {
            background: none;
            border: 1px solid #ddd;
            padding: 6px;
            gap: 4px;
            page-break-inside: auto;
          }

          .problem-checkbox-label {
            border: 1px solid #ddd;
            padding: 3px 6px;
            background: none;
            page-break-inside: avoid;
          }

          .problem-checkbox-label input[type="checkbox"] {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            width: 14px;
            height: 14px;
            margin-top: 1px;
          }

          .problem-en {
            font-size: 10px;
            line-height: 1.2;
          }

          .problem-kn {
            font-size: 9px;
            line-height: 1.2;
          }

          .chip {
            background: #eee;
            border: 1px solid #999;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            padding: 2px 8px;
            font-size: 10px;
          }

          .multi-select-container {
            border: 1px solid #ddd;
            background: none;
            padding: 4px;
            min-height: auto;
          }

          .file-attachment-view,
          .uploaded-file {
            border: 1px solid #ddd;
            padding: 8px;
            background: none;
          }

          .selected-count,
          .help-text {
            font-size: 9px;
            color: #666;
            margin: 2px 0 0 0;
          }

          /* Ensure proper spacing for print */
          body {
            margin: 0;
            padding: 0;
          }

          /* Force all sections to flow naturally */
          * {
            box-sizing: border-box;
          }

          .form-group input[type="datetime-local"],
          .form-group input[type="date"] {
            padding: 0 !important;
            height: auto !important;
            line-height: 1.2 !important;
          }

          /* Hide dropdown arrows that take space */
          select::-ms-expand {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
