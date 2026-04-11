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
import type { Quotation, Lead, FieldVisit, Product, LineItemRow } from '../types';
import { CROP_PROBLEMS } from '../types';
import { uploadFile, getDownloadLink } from '../services/driveService';
import { fetchProducts } from '../services/supabase/products';
import { fetchLineItemsByQuotationId, saveLineItemsForQuotation } from '../services/supabase/lineItems';
import { numberToWords } from '../utils/numberToWords';
import './QuotationModal.css';

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
  onSave: (quotationData: Partial<Quotation>) => Promise<string | void>;
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
  usageInstructions: '',
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
  const [generatingPDF, setGeneratingPDF] = useState(false);

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

  // Line items state
  const [lineItems, setLineItems] = useState<LineItemRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingLineItems, setLoadingLineItems] = useState(false);

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

  // Populate form when editing/viewing or reset when adding
  useEffect(() => {
    if (!isOpen) return;
    if ((mode === 'edit' || mode === 'view') && quotation) {
      setFormData({
        leadId: quotation.leadId || '',
        visitId: quotation.visitId || '',
        quoteDate: quotation.quoteDate ? quotation.quoteDate.split('T')[0] : '',
        quoteAmount: quotation.quoteAmount || 0,
        preparedBy: quotation.preparedBy || '',
        validUntil: quotation.validUntil ? quotation.validUntil.split('T')[0] : '',
        status: quotation.status || 'Draft',
        notes: quotation.notes || '',
        usageInstructions: quotation.usageInstructions || '',
        attachmentFileId: quotation.attachmentFileId || '',
        deliveryStatus: quotation.deliveryStatus || '',
        deliveryDate: quotation.deliveryDate ? quotation.deliveryDate.split('T')[0] : '',
      });
      setUploadedFileName(quotation.attachmentFileId ? 'Existing file' : null);
      // Load visits for this lead (needed for selectedVisit in PDF)
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
  }, [isOpen, mode, quotation, loadVisitsForLead, loadInitialLeads]);

  // Load products and line items when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Load products for dropdown (add/edit) and for print view (view mode needs categories)
    setLoadingProducts(true);
    fetchProducts(mode === 'view' ? false : true)
      .then((prods) => setProducts(prods))
      .catch((err) => console.error('Failed to load products:', err))
      .finally(() => setLoadingProducts(false));

    // Load existing line items (edit/view mode)
    if ((mode === 'edit' || mode === 'view') && quotation) {
      setLoadingLineItems(true);
      fetchLineItemsByQuotationId(quotation.id)
        .then((items) =>
          setLineItems(
            items.map((item) => ({
              id: item.id,
              productId: item.productId,
              productName: item.productName,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              notes: item.notes || '',
              displayOrder: item.displayOrder,
            }))
          )
        )
        .catch((err) => console.error('Failed to load line items:', err))
        .finally(() => setLoadingLineItems(false));
    } else {
      setLineItems([]);
    }
  }, [isOpen, mode, quotation]);

  // Line item handlers
  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        productId: '',
        productName: '',
        unitPrice: 0,
        quantity: 1,
        notes: '',
        displayOrder: prev.length,
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // When product changes, auto-fill name and price
      if (field === 'productId') {
        const product = products.find((p) => p.id === value);
        if (product) {
          updated[index].productName = product.name;
          updated[index].unitPrice = product.unitPrice;
        }
      }

      return updated;
    });
  };

  // Computed total from line items
  const lineItemsTotal = lineItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

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

    // Amount validation: either line items or manual amount
    const hasLineItems = lineItems.length > 0;
    if (!hasLineItems && (!formData.quoteAmount || formData.quoteAmount <= 0)) {
      setError('Quote amount must be greater than 0 (or add line items)');
      return;
    }

    // Validate line items if any exist
    if (hasLineItems) {
      const invalidItems = lineItems.filter(
        (item) => !item.productId || item.quantity <= 0 || item.unitPrice <= 0
      );
      if (invalidItems.length > 0) {
        setError('All line items must have a product selected with valid quantity and price');
        return;
      }
    }

    if (!formData.status) {
      setError('Status is required');
      return;
    }

    setSaving(true);
    try {
      // If line items exist, override quoteAmount with computed total
      const saveData = { ...formData };
      if (hasLineItems) {
        saveData.quoteAmount = lineItemsTotal;
      }

      const quotationId = await onSave(saveData);

      // Save line items if we have a quotation ID
      const resolvedId = quotationId || quotation?.id;
      if (resolvedId && hasLineItems) {
        await saveLineItemsForQuotation(
          resolvedId,
          lineItems.map((item, idx) => ({
            productId: item.productId,
            productName: item.productName,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            notes: item.notes || undefined,
            displayOrder: idx,
          }))
        );
      } else if (resolvedId && !hasLineItems && mode === 'edit') {
        // If editing and all line items were removed, clear them in DB
        await saveLineItemsForQuotation(resolvedId, []);
      }

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

  const handleGeneratePDF = async () => {
    if (!quotation) return;
    setGeneratingPDF(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { QuotationPDF } = await import('./QuotationPDF');

      const blob = await pdf(
        QuotationPDF({
          quotation,
          lead: viewLead || null,
          visit: selectedVisit || null,
          lineItems,
          products,
        })
      ).toBlob();

      const leadName = (viewLead?.farmerName || 'Quotation').replace(/[^a-zA-Z0-9]/g, '_');
      const displayId = quotation.displayId || 'QUO';
      const fileName = `${leadName}_${displayId}.pdf`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed, falling back to browser print:', err);
      window.print();
    } finally {
      setGeneratingPDF(false);
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
          {isReadOnly && (
            <button
              type="button"
              className="btn-print no-print"
              onClick={handleGeneratePDF}
              disabled={generatingPDF}
              title="Generate PDF"
            >
              {generatingPDF ? 'Generating...' : 'Print'}
            </button>
          )}
          <button className="modal-close no-print" onClick={onClose}>
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

          {/* Line Items Section */}
          <div className="form-section">
            <h3>Line Items {lineItems.length > 0 && `(${lineItems.length})`}</h3>
            {loadingLineItems ? (
              <div style={{ padding: '12px', color: '#888' }}>Loading line items...</div>
            ) : isReadOnly ? (
              // View mode: read-only table
              lineItems.length > 0 ? (
                <div className="line-items-table-wrapper">
                  <table className="line-items-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Product</th>
                        <th className="num-col">Qty</th>
                        <th className="num-col">Unit Price</th>
                        <th className="num-col">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{item.productName}</td>
                          <td className="num-col">{item.quantity}</td>
                          <td className="num-col">{formatCurrency(item.unitPrice)}</td>
                          <td className="num-col">{formatCurrency(item.unitPrice * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4} className="total-label">Total</td>
                        <td className="num-col total-value">{formatCurrency(lineItemsTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '8px 0', color: '#888', fontSize: '14px' }}>No line items — manual amount</div>
              )
            ) : (
              // Add/Edit mode: editable rows
              <div className="line-items-editor">
                {loadingProducts && <div style={{ padding: '8px 0', color: '#888', fontSize: '13px' }}>Loading products...</div>}
                {lineItems.map((item, idx) => (
                  <div key={idx} className="line-item-row">
                    <div className="line-item-fields">
                      <div className="li-field li-product">
                        <label>Product</label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleLineItemChange(idx, 'productId', e.target.value)}
                        >
                          <option value="">-- Select Product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="li-field li-qty">
                        <label>Qty</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity || ''}
                          onChange={(e) => handleLineItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="li-field li-price">
                        <label>Unit Price</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unitPrice || ''}
                          onChange={(e) => handleLineItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="li-field li-subtotal">
                        <label>Subtotal</label>
                        <div className="li-subtotal-value">{formatCurrency(item.unitPrice * item.quantity)}</div>
                      </div>
                      <button
                        type="button"
                        className="btn-remove-line-item"
                        onClick={() => handleRemoveLineItem(idx)}
                        title="Remove"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-add-line-item" onClick={handleAddLineItem}>
                  + Add Product
                </button>
                {lineItems.length > 0 && (
                  <div className="line-items-total">
                    <span>Total:</span>
                    <span className="total-value">{formatCurrency(lineItemsTotal)}</span>
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
                ) : lineItems.length > 0 ? (
                  <div className="amount-display computed">
                    {formatCurrency(lineItemsTotal)}
                    <span className="computed-hint">Auto-calculated from line items</span>
                  </div>
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

              <div className="form-group full-width">
                <label htmlFor="usageInstructions">How to Use / Usage Instructions</label>
                <textarea
                  id="usageInstructions"
                  name="usageInstructions"
                  value={isReadOnly && quotation ? (quotation.usageInstructions || '') : formData.usageInstructions}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  rows={5}
                  placeholder="Enter day-by-day product application schedule..."
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

        {/* Print-only quotation document */}
        {isReadOnly && quotation && (
          <div className="print-only quotation-print">
            <img src="/quotation-header.jpg" alt="Company Header" className="print-header-img" />

            <div className="print-doc-info">
              <div className="print-doc-row">
                <span>Q Number: <strong>{quotation.displayId}</strong></span>
                <span>Date: <strong>{formatDate(quotation.quoteDate)}</strong></span>
              </div>
              <div className="print-doc-row">
                <span>&nbsp;</span>
                <span>Evaluation</span>
              </div>
            </div>

            {viewLead && (
              <div className="print-customer-info">
                <p>By the name of: <strong>{viewLead.farmerName}</strong></p>
                <p>Location: <strong>
                  {[viewLead.village, viewLead.taluk, viewLead.district].filter(Boolean).join(', ')}
                </strong></p>
                <p>Contact: <strong>{viewLead.phone}</strong></p>
                <p>Subject: Comprehensive crop care; Solutions for identified diseases and deficiencies.</p>
              </div>
            )}

            {/* Identified Problems from linked visit */}
            {selectedVisit && selectedVisit.identifiedProblems && selectedVisit.identifiedProblems.length > 0 && (
              <div className="print-problems-section">
                <p>Dear Sir,</p>
                <p>
                  Upon our visit to your arecanut plantation, we have identified the following issues:{' '}
                  {selectedVisit.identifiedProblems.map((key, idx) => {
                    const prob = CROP_PROBLEMS.find((p) => p.en === key);
                    const label = prob ? `${prob.en} (${prob.kn})` : key;
                    return (
                      <span key={key}>
                        {label}
                        {idx < selectedVisit.identifiedProblems!.length - 1 ? ', ' : '.'}
                      </span>
                    );
                  })}
                </p>
                <p>We recommend the following treatment plan for your crops.</p>
              </div>
            )}

            {/* Crop info */}
            {viewLead && (
              <div className="print-crop-info">
                <p>
                  <strong>Quotation details:</strong> As follows
                </p>
                <p>
                  {viewLead.cropType}
                  {viewLead.numPlants ? ` \u2013 ${viewLead.numPlants} Plants` : ''}
                  {viewLead.cropAge ? `, ${viewLead.cropAge}` : ''}
                  {viewLead.farmSizeAcres ? ` (${viewLead.farmSizeAcres} acres)` : ''}
                </p>
              </div>
            )}

            {/* Materials required - descriptive list */}
            {lineItems.length > 0 && (() => {
              const grouped = new Map<string, LineItemRow[]>();
              lineItems.forEach((item) => {
                const product = products.find((p) => p.id === item.productId);
                const category = product?.category || 'General';
                if (!grouped.has(category)) grouped.set(category, []);
                grouped.get(category)!.push(item);
              });

              return (
                <div className="print-materials-section">
                  <p><strong>Materials required;</strong></p>
                  {Array.from(grouped.entries()).map(([category, items]) => (
                    <div key={category}>
                      <p><strong>{category} Materials;</strong></p>
                      <ul className="print-materials-list">
                        {items.map((item, idx) => {
                          const product = products.find((p) => p.id === item.productId);
                          return (
                            <li key={idx}>
                              {item.productName}
                              {product?.dosage ? ` - ${product.dosage}` : ''}
                              {` = ${item.quantity}`}
                              {product?.description ? ` (${product.description})` : ''}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Line items grouped by category - pricing table */}
            {lineItems.length > 0 && (() => {
              const grouped = new Map<string, LineItemRow[]>();
              lineItems.forEach((item) => {
                const product = products.find((p) => p.id === item.productId);
                const category = product?.category || 'General';
                if (!grouped.has(category)) grouped.set(category, []);
                grouped.get(category)!.push(item);
              });

              let slNo = 1;
              return Array.from(grouped.entries()).map(([category, items]) => {
                const categoryTotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
                return (
                  <div key={category} className="print-category-section">
                    <h4 className="print-category-title">{category}</h4>
                    <table className="print-items-table">
                      <thead>
                        <tr>
                          <th>Sl</th>
                          <th>Particular</th>
                          <th>Packing</th>
                          <th className="num-col">Qty</th>
                          <th className="num-col">Rate</th>
                          <th className="num-col">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => {
                          const product = products.find((p) => p.id === item.productId);
                          return (
                            <tr key={slNo}>
                              <td>{slNo++}</td>
                              <td>{item.productName}</td>
                              <td>{product?.unit || ''}</td>
                              <td className="num-col">{item.quantity}</td>
                              <td className="num-col">{formatCurrency(item.unitPrice)}</td>
                              <td className="num-col">{formatCurrency(item.unitPrice * item.quantity)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'right', fontWeight: 600 }}>Total</td>
                          <td className="num-col" style={{ fontWeight: 600 }}>{formatCurrency(categoryTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              });
            })()}

            {/* Grand total */}
            <div className="print-grand-total">
              <p><strong>Total Amount: {formatCurrency(quotation.quoteAmount)}/-</strong></p>
              <p className="amount-words">{numberToWords(quotation.quoteAmount)}</p>
              {viewLead?.numPlants && viewLead.numPlants > 0 && (
                <p className="cost-per-plant">
                  Cost per plant: {formatCurrency(Math.round(quotation.quoteAmount / viewLead.numPlants))}
                </p>
              )}
            </div>

            {/* Notes */}
            {quotation.notes && (
              <div className="print-notes-section">
                <p><strong>Note:</strong></p>
                <p style={{ whiteSpace: 'pre-wrap' }}>{quotation.notes}</p>
              </div>
            )}

            {/* Usage Instructions */}
            {quotation.usageInstructions && (
              <div className="print-usage-section">
                <p><strong>How to Use;</strong></p>
                <p style={{ whiteSpace: 'pre-wrap' }}>{quotation.usageInstructions}</p>
              </div>
            )}

            <img src="/quotation-footer.jpg" alt="Company Footer" className="print-footer-img" />
          </div>
        )}
      </div>

    </div>
  );
}
