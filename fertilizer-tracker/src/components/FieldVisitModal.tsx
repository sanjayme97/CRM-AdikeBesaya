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
import './FieldVisitModal.css';

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
    <div className="modal-overlay field-visit-modal" onClick={onClose}>
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

    </div>
  );
}
