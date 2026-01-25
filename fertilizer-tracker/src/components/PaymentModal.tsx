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
    <div className="modal-overlay" onClick={onClose}>
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
          max-width: 750px;
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

        .payment-display-id {
          background: #2e7d32;
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
          color: #2e7d32;
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

        .form-group label .max-hint {
          font-weight: 400;
          color: #888;
          font-size: 12px;
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
          border-color: #2e7d32;
        }

        .form-group input:disabled,
        .form-group select:disabled,
        .form-group textarea:disabled {
          background: #f5f5f5;
          cursor: default;
        }

        .quote-info-readonly {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
        }

        .quote-info-row {
          display: flex;
          gap: 12px;
          padding: 6px 0;
        }

        .quote-info-row .label {
          font-weight: 500;
          color: #666;
          min-width: 100px;
        }

        .quote-info-row .value {
          color: #333;
        }

        .quote-info-row .value.amount {
          font-weight: 600;
          color: #2e7d32;
        }

        .selected-quote-info {
          grid-column: 1 / -1;
          background: #e8f5e9;
          padding: 12px 16px;
          border-radius: 6px;
          font-size: 14px;
        }

        .selected-quote-info p {
          margin: 4px 0;
          color: #2e7d32;
        }

        /* Payment Summary Styles */
        .payment-summary {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e9ecef;
        }

        .summary-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .summary-label {
          font-weight: 500;
          color: #666;
        }

        .summary-value {
          font-weight: 600;
          color: #333;
        }

        .summary-value.paid {
          color: #2e7d32;
        }

        .summary-value.remaining {
          color: #e65100;
        }

        .summary-value.fully-paid {
          color: #2e7d32;
        }

        /* Existing Payments Table */
        .existing-payments {
          margin-top: 16px;
        }

        .existing-payments h4 {
          font-size: 13px;
          font-weight: 600;
          color: #555;
          margin: 0 0 12px 0;
        }

        .payments-mini-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .payments-mini-table th {
          background: #f0f0f0;
          padding: 8px 10px;
          text-align: left;
          font-weight: 600;
          color: #666;
          border-bottom: 1px solid #ddd;
        }

        .payments-mini-table td {
          padding: 8px 10px;
          border-bottom: 1px solid #eee;
          color: #333;
        }

        .payments-mini-table td.amount {
          font-weight: 500;
          color: #2e7d32;
        }

        .payments-mini-table tr.current-payment {
          background: #fff3cd;
        }

        .payments-mini-table tr:hover {
          background: #f8f8f8;
        }

        .loading-text,
        .no-payments-text {
          font-size: 13px;
          color: #666;
          padding: 12px 0;
          margin: 0;
        }

        /* Searchable Quote Dropdown Styles */
        .quote-search-container {
          position: relative;
        }

        .quote-search-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }

        .quote-search-input:focus {
          outline: none;
          border-color: #2e7d32;
        }

        .quote-dropdown {
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

        .quote-dropdown-loading,
        .quote-dropdown-empty {
          padding: 12px 16px;
          color: #666;
          font-size: 14px;
          text-align: center;
        }

        .quote-dropdown-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 10px 16px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
          transition: background 0.15s;
        }

        .quote-dropdown-item:last-child {
          border-bottom: none;
        }

        .quote-dropdown-item:hover {
          background: #f5f5f5;
        }

        .quote-dropdown-item.selected {
          background: #e8f5e9;
        }

        .quote-dropdown-item .quote-display-id {
          font-weight: 600;
          color: #667eea;
          font-size: 12px;
        }

        .quote-dropdown-item .quote-farmer {
          font-weight: 500;
          color: #333;
          font-size: 14px;
        }

        .quote-dropdown-item .quote-amount {
          font-size: 12px;
          color: #2e7d32;
          font-weight: 500;
        }

        .selected-quote-display {
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
          background: #2e7d32;
          border: none;
          color: white;
          padding: 10px 24px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-save:hover:not(:disabled) {
          background: #1b5e20;
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

          .payments-mini-table {
            font-size: 12px;
          }

          .payments-mini-table th,
          .payments-mini-table td {
            padding: 6px 8px;
          }
        }
      `}</style>
    </div>
  );
}
