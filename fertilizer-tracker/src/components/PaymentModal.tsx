/**
 * Payment Modal Component
 *
 * Modal for viewing, creating, and editing payments
 * Supports three modes: 'view', 'add', 'edit'
 *
 * Payments are linked to Quotations.
 * Only quotations with status "Accepted" can receive payments.
 * Shows existing payments for the quotation and validates amount doesn't exceed balance.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Payment, Quotation, Lead } from '../types';
import './PaymentModal.css';

interface PaymentModalProps {
  isOpen: boolean;
  mode: 'view' | 'add' | 'edit';
  payment?: Payment | null;
  quotationMap: Map<string, Quotation>;
  leadMap: Map<string, Lead>;
  existingPayments: Payment[]; // All payments for display and validation
  onSearchQuotations: (searchTerm: string, limit?: number) => Promise<Quotation[]>;
  onFetchPaymentsByQuote: (quoteId: string) => Promise<Payment[]>;
  onFetchLeadsByIds: (leadIds: string[]) => Promise<Lead[]>;
  lookups: {
    paymentTypes: string[];
    paymentMethods: string[];
  };
  onClose: () => void;
  onSave: (paymentData: Partial<Payment>) => Promise<void>;
}

const initialFormData = {
  quoteId: '',
  paymentDate: '',
  paymentAmount: 0,
  paymentType: 'Advance',
  paymentMethod: 'Cash',
  transactionRef: '',
  receivedBy: '',
  notes: '',
};

export function PaymentModal({
  isOpen,
  mode,
  payment,
  quotationMap,
  leadMap,
  existingPayments,
  onSearchQuotations,
  onFetchPaymentsByQuote,
  onFetchLeadsByIds,
  lookups,
  onClose,
  onSave,
}: PaymentModalProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Searchable quotation dropdown state
  const [quoteSearchTerm, setQuoteSearchTerm] = useState('');
  const [quoteOptions, setQuoteOptions] = useState<Quotation[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [showQuoteDropdown, setShowQuoteDropdown] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Payments for selected quotation
  const [quotePayments, setQuotePayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Local leads map for quotations fetched in modal
  const [localLeadMap, setLocalLeadMap] = useState<Map<string, Lead>>(new Map());

  // Get selected quotation info
  const selectedQuotation = quotationMap.get(formData.quoteId) || quoteOptions.find((q: Quotation) => q.id === formData.quoteId);

  // Get lead info for the selected quotation (check both maps)
  const selectedLead = selectedQuotation
    ? (leadMap.get(selectedQuotation.leadId) || localLeadMap.get(selectedQuotation.leadId))
    : null;

  // Calculate payment summary for selected quotation
  const calculatePaymentSummary = () => {
    if (!selectedQuotation) return { totalPaid: 0, remaining: 0, quoteAmount: 0 };

    const quoteAmount = selectedQuotation.quoteAmount;
    // Use quotePayments if available, otherwise filter from existingPayments
    const payments = quotePayments.length > 0
      ? quotePayments
      : existingPayments.filter(p => p.quoteId === formData.quoteId);

    // In edit mode, exclude current payment from total
    const totalPaid = payments
      .filter(p => mode !== 'edit' || p.id !== payment?.id)
      .reduce((sum, p) => sum + p.paymentAmount, 0);

    const remaining = quoteAmount - totalPaid;
    return { totalPaid, remaining, quoteAmount };
  };

  const { totalPaid, remaining, quoteAmount } = calculatePaymentSummary();

  // Load payments when quotation is selected
  const loadPaymentsForQuote = useCallback(async (quoteId: string) => {
    if (!quoteId) {
      setQuotePayments([]);
      return;
    }

    setLoadingPayments(true);
    try {
      const payments = await onFetchPaymentsByQuote(quoteId);
      setQuotePayments(payments);
    } catch (err) {
      console.error('Failed to load payments for quote:', err);
      setQuotePayments([]);
    } finally {
      setLoadingPayments(false);
    }
  }, [onFetchPaymentsByQuote]);

  // Populate form when editing
  useEffect(() => {
    if (mode === 'edit' && payment) {
      setFormData({
        quoteId: payment.quoteId || '',
        paymentDate: payment.paymentDate ? payment.paymentDate.split('T')[0] : '',
        paymentAmount: payment.paymentAmount || 0,
        paymentType: payment.paymentType || 'Advance',
        paymentMethod: payment.paymentMethod || 'Cash',
        transactionRef: payment.transactionRef || '',
        receivedBy: payment.receivedBy || '',
        notes: payment.notes || '',
      });
      // Load payments for this quote
      if (payment.quoteId) {
        loadPaymentsForQuote(payment.quoteId);
      }
    } else if (mode === 'view' && payment) {
      // Load payments for view mode too
      if (payment.quoteId) {
        loadPaymentsForQuote(payment.quoteId);
      }
    } else if (mode === 'add') {
      setFormData({
        ...initialFormData,
        paymentDate: new Date().toISOString().split('T')[0],
      });
      setQuotePayments([]);
      // Load initial quotation options when opening add modal
      loadInitialQuotations();
    }
  }, [mode, payment, loadPaymentsForQuote]);

  // Fetch leads for a list of quotations
  const fetchLeadsForQuotations = useCallback(async (quotations: Quotation[]) => {
    const leadIds = [...new Set(quotations.map(q => q.leadId).filter(Boolean))];
    // Filter out leads we already have
    const newLeadIds = leadIds.filter(id => !leadMap.has(id) && !localLeadMap.has(id));

    if (newLeadIds.length > 0) {
      try {
        const newLeads = await onFetchLeadsByIds(newLeadIds);
        setLocalLeadMap(prev => {
          const updated = new Map(prev);
          newLeads.forEach(lead => updated.set(lead.id, lead));
          return updated;
        });
      } catch (err) {
        console.error('Failed to fetch leads for quotations:', err);
      }
    }
  }, [leadMap, localLeadMap, onFetchLeadsByIds]);

  // Load initial accepted quotations when modal opens for add mode
  const loadInitialQuotations = useCallback(async () => {
    setLoadingQuotes(true);
    try {
      const quotations = await onSearchQuotations('', 100);
      setQuoteOptions(quotations);
      // Fetch leads for these quotations
      await fetchLeadsForQuotations(quotations);
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setLoadingQuotes(false);
    }
  }, [onSearchQuotations, fetchLeadsForQuotations]);

  // Search quotations with debounce
  const handleQuoteSearch = useCallback((term: string) => {
    setQuoteSearchTerm(term);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      setLoadingQuotes(true);
      try {
        const quotations = await onSearchQuotations(term, 100);
        setQuoteOptions(quotations);
        // Fetch leads for these quotations
        await fetchLeadsForQuotations(quotations);
      } catch (err) {
        console.error('Failed to search quotations:', err);
      } finally {
        setLoadingQuotes(false);
      }
    }, 300);
  }, [onSearchQuotations, fetchLeadsForQuotations]);

  // Handle quotation selection
  const handleSelectQuotation = (quotation: Quotation) => {
    setFormData((prev) => ({ ...prev, quoteId: quotation.id, paymentAmount: 0 }));
    setQuoteSearchTerm('');
    setShowQuoteDropdown(false);
    // Load existing payments for this quotation
    loadPaymentsForQuote(quotation.id);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowQuoteDropdown(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.quoteId) {
      setError('Please select a quotation');
      return;
    }
    if (!formData.paymentDate) {
      setError('Payment date is required');
      return;
    }
    if (!formData.paymentAmount || formData.paymentAmount <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }
    if (!formData.paymentType) {
      setError('Payment type is required');
      return;
    }
    if (!formData.paymentMethod) {
      setError('Payment method is required');
      return;
    }

    // Validate payment doesn't exceed remaining balance
    if (formData.paymentAmount > remaining) {
      setError(`Payment amount (${formatCurrency(formData.paymentAmount)}) exceeds remaining balance (${formatCurrency(remaining)})`);
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const title =
    mode === 'add'
      ? 'Record Payment'
      : mode === 'edit'
      ? 'Edit Payment'
      : 'Payment Details';

  // Get quotation and lead info for display in view mode
  const viewQuotation = payment ? quotationMap.get(payment.quoteId) : null;
  const viewLead = viewQuotation ? leadMap.get(viewQuotation.leadId) : null;

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

  // Get farmer name for quotation dropdown display (check both maps)
  const getFarmerNameForQuote = (quotation: Quotation): string => {
    const lead = leadMap.get(quotation.leadId) || localLeadMap.get(quotation.leadId);
    return lead ? lead.farmerName : 'Loading...';
  };

  // Get payments to display (for the selected quotation)
  const displayPayments = quotePayments.length > 0
    ? quotePayments
    : existingPayments.filter(p => p.quoteId === (formData.quoteId || payment?.quoteId));

  return (
    <div className="modal-overlay payment-modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          {payment && mode !== 'add' && (
            <span className="payment-display-id">{payment.displayId}</span>
          )}
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-body">
          {/* Quotation Selection Section */}
          <div className="form-section">
            <h3>Quotation Information</h3>
            {isReadOnly && viewQuotation ? (
              <div className="quote-info-readonly">
                <div className="quote-info-row">
                  <span className="label">Quote ID:</span>
                  <span className="value">{viewQuotation.displayId}</span>
                </div>
                <div className="quote-info-row">
                  <span className="label">Quote Amount:</span>
                  <span className="value amount">{formatCurrency(viewQuotation.quoteAmount)}</span>
                </div>
                {viewLead && (
                  <>
                    <div className="quote-info-row">
                      <span className="label">Farmer:</span>
                      <span className="value">{viewLead.farmerName}</span>
                    </div>
                    <div className="quote-info-row">
                      <span className="label">Phone:</span>
                      <span className="value">{viewLead.phone}</span>
                    </div>
                    <div className="quote-info-row">
                      <span className="label">Location:</span>
                      <span className="value">
                        {viewLead.village && `${viewLead.village}, `}
                        {viewLead.taluk && `${viewLead.taluk}, `}
                        {viewLead.district}
                      </span>
                    </div>
                    <div className="quote-info-row">
                      <span className="label">Lead Owner:</span>
                      <span className="value">{viewLead.leadOwner || '-'}</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="form-grid">
                {/* Quotation Selection */}
                <div className="form-group full-width" ref={dropdownRef}>
                  <label htmlFor="quoteSearch">Select Quotation (Accepted Only) *</label>
                  {mode === 'edit' && selectedQuotation ? (
                    // In edit mode, show selected quotation as read-only
                    <div className="selected-quote-display">
                      {selectedQuotation.displayId} - {getFarmerNameForQuote(selectedQuotation)} ({formatCurrency(selectedQuotation.quoteAmount)})
                    </div>
                  ) : (
                    // In add mode, show searchable dropdown
                    <div className="quote-search-container">
                      <input
                        type="text"
                        id="quoteSearch"
                        placeholder={selectedQuotation ? `${selectedQuotation.displayId} - ${getFarmerNameForQuote(selectedQuotation)}` : "Search by quote ID (e.g., QUO-0001)..."}
                        value={quoteSearchTerm}
                        onChange={(e) => handleQuoteSearch(e.target.value)}
                        onFocus={() => setShowQuoteDropdown(true)}
                        className="quote-search-input"
                        autoComplete="off"
                      />
                      {showQuoteDropdown && (
                        <div className="quote-dropdown">
                          {loadingQuotes ? (
                            <div className="quote-dropdown-loading">Searching...</div>
                          ) : quoteOptions.length === 0 ? (
                            <div className="quote-dropdown-empty">No accepted quotations found</div>
                          ) : (
                            quoteOptions.map((quotation: Quotation) => (
                              <div
                                key={quotation.id}
                                className={`quote-dropdown-item ${formData.quoteId === quotation.id ? 'selected' : ''}`}
                                onClick={() => handleSelectQuotation(quotation)}
                              >
                                <span className="quote-display-id">{quotation.displayId}</span>
                                <span className="quote-farmer">{getFarmerNameForQuote(quotation)}</span>
                                <span className="quote-amount">{formatCurrency(quotation.quoteAmount)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedQuotation && selectedLead && (
                  <div className="selected-quote-info">
                    <p>💰 Quote Amount: {formatCurrency(selectedQuotation.quoteAmount)}</p>
                    <p>👤 {selectedLead.farmerName}</p>
                    <p>📞 {selectedLead.phone}</p>
                    <p>📍 {selectedLead.village && `${selectedLead.village}, `}{selectedLead.taluk && `${selectedLead.taluk}, `}{selectedLead.district}</p>
                    <p>🏷️ Owner: {selectedLead.leadOwner || '-'}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Summary Section - Show when quotation is selected */}
          {(selectedQuotation || viewQuotation) && (
            <div className="form-section">
              <h3>Payment Summary</h3>
              <div className="payment-summary">
                <div className="summary-row">
                  <span className="summary-label">Quote Amount:</span>
                  <span className="summary-value">{formatCurrency(quoteAmount || viewQuotation?.quoteAmount || 0)}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Total Paid:</span>
                  <span className="summary-value paid">{formatCurrency(totalPaid)}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Remaining Balance:</span>
                  <span className={`summary-value ${remaining <= 0 ? 'fully-paid' : 'remaining'}`}>
                    {formatCurrency(remaining)}
                    {remaining <= 0 && ' (Fully Paid)'}
                  </span>
                </div>
              </div>

              {/* Existing Payments List */}
              {loadingPayments ? (
                <p className="loading-text">Loading payments...</p>
              ) : displayPayments.length > 0 ? (
                <div className="existing-payments">
                  <h4>Previous Payments ({displayPayments.length})</h4>
                  <table className="payments-mini-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Type</th>
                        <th>Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayPayments.map((p) => (
                        <tr key={p.id} className={p.id === payment?.id ? 'current-payment' : ''}>
                          <td>{p.displayId}</td>
                          <td>{formatDate(p.paymentDate)}</td>
                          <td className="amount">{formatCurrency(p.paymentAmount)}</td>
                          <td>{p.paymentType}</td>
                          <td>{p.paymentMethod}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="no-payments-text">No previous payments for this quotation</p>
              )}
            </div>
          )}

          {/* Payment Details Section */}
          <div className="form-section">
            <h3>{mode === 'view' ? 'This Payment' : 'Payment Details'}</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="paymentDate">Payment Date *</label>
                <input
                  type="date"
                  id="paymentDate"
                  name="paymentDate"
                  value={isReadOnly && payment ? (payment.paymentDate?.split('T')[0] || '') : formData.paymentDate}
                  onChange={handleChange}
                  onKeyDown={(e) => e.preventDefault()}
                  disabled={isReadOnly}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="paymentAmount">
                  Amount (INR) *
                  {!isReadOnly && remaining > 0 && (
                    <span className="max-hint"> (Max: {formatCurrency(remaining)})</span>
                  )}
                </label>
                {isReadOnly && payment ? (
                  <div className="amount-display">{formatCurrency(payment.paymentAmount)}</div>
                ) : (
                  <input
                    type="number"
                    id="paymentAmount"
                    name="paymentAmount"
                    value={formData.paymentAmount || ''}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    min="0"
                    max={remaining > 0 ? remaining : undefined}
                    step="100"
                    required
                  />
                )}
              </div>

              <div className="form-group">
                <label htmlFor="paymentType">Payment Type *</label>
                <select
                  id="paymentType"
                  name="paymentType"
                  value={isReadOnly && payment ? payment.paymentType : formData.paymentType}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  required
                >
                  {lookups.paymentTypes.length > 0 ? (
                    lookups.paymentTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Advance">Advance</option>
                      <option value="Partial">Partial</option>
                      <option value="Final">Final</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="paymentMethod">Payment Method *</label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  value={isReadOnly && payment ? payment.paymentMethod : formData.paymentMethod}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  required
                >
                  {lookups.paymentMethods.length > 0 ? (
                    lookups.paymentMethods.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="transactionRef">Transaction Reference</label>
                <input
                  type="text"
                  id="transactionRef"
                  name="transactionRef"
                  value={isReadOnly && payment ? payment.transactionRef : formData.transactionRef}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  placeholder="UPI ID, Check No., etc."
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={isReadOnly && payment ? payment.notes : formData.notes}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  rows={3}
                  placeholder="Any additional notes about this payment..."
                />
              </div>
            </div>
          </div>

          {/* Metadata (view mode only) */}
          {isReadOnly && payment && (
            <div className="form-section">
              <h3>Metadata</h3>
              <div className="form-grid metadata">
                <div className="form-group">
                  <label>Received By</label>
                  <span className="metadata-value">{payment.receivedBy}</span>
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
              <button
                type="submit"
                className="btn-save"
                disabled={saving || (remaining <= 0 && mode === 'add')}
              >
                {saving ? 'Saving...' : mode === 'add' ? 'Record Payment' : 'Save Changes'}
              </button>
            )}
          </div>
        </form>
      </div>

    </div>
  );
}
