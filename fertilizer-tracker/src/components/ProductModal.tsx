/**
 * Product Modal Component
 *
 * Modal for viewing, creating, and editing products (Manager only)
 * Supports three modes: 'view', 'add', 'edit'
 */

import { useState, useEffect } from 'react';
import type { Product } from '../types';

interface ProductModalProps {
  isOpen: boolean;
  mode: 'view' | 'add' | 'edit';
  product?: Product | null;
  onClose: () => void;
  onSave: (productData: Partial<Product>) => Promise<void>;
}

const UNIT_OPTIONS = ['unit', 'kg', 'g', 'litre', 'ml', 'bag', 'bottle', 'pouch', 'pack'];

const initialFormData = {
  sku: '',
  name: '',
  nameKannada: '',
  description: '',
  dosage: '',
  unitPrice: 0,
  unit: 'unit',
  category: '',
  isActive: true,
  displayOrder: 0,
};

export function ProductModal({
  isOpen,
  mode,
  product,
  onClose,
  onSave,
}: ProductModalProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'edit' && product) {
      setFormData({
        sku: product.sku || '',
        name: product.name || '',
        nameKannada: product.nameKannada || '',
        description: product.description || '',
        dosage: product.dosage || '',
        unitPrice: product.unitPrice || 0,
        unit: product.unit || 'unit',
        category: product.category || '',
        isActive: product.isActive,
        displayOrder: product.displayOrder || 0,
      });
    } else if (mode === 'add') {
      setFormData(initialFormData);
    }
  }, [mode, product]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }
    if (formData.unitPrice < 0) {
      setError('Unit price cannot be negative');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const title =
    mode === 'add'
      ? 'Add Product'
      : mode === 'edit'
      ? 'Edit Product'
      : 'Product Details';

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
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
              <h3>Product Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="sku">SKU</label>
                  {isReadOnly ? (
                    <span className="readonly-value">{product?.sku || '-'}</span>
                  ) : (
                    <input
                      type="text"
                      id="sku"
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      placeholder="e.g., SEC-50ML"
                    />
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  {isReadOnly ? (
                    <span className="readonly-value">{product?.category || '-'}</span>
                  ) : (
                    <input
                      type="text"
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      placeholder="e.g., Drenching, Spraying"
                    />
                  )}
                </div>

                <div className="form-group full-width">
                  <label htmlFor="name">Product Name (English) *</label>
                  {isReadOnly ? (
                    <span className="readonly-value">{product?.name}</span>
                  ) : (
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Product name in English"
                    />
                  )}
                </div>

                <div className="form-group full-width">
                  <label htmlFor="nameKannada">Product Name (Kannada)</label>
                  {isReadOnly ? (
                    <span className="readonly-value">{product?.nameKannada || '-'}</span>
                  ) : (
                    <input
                      type="text"
                      id="nameKannada"
                      name="nameKannada"
                      value={formData.nameKannada}
                      onChange={handleChange}
                      placeholder="Product name in Kannada"
                    />
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="unitPrice">Unit Price (INR) *</label>
                  {isReadOnly ? (
                    <div className="amount-display">{formatCurrency(product?.unitPrice || 0)}</div>
                  ) : (
                    <input
                      type="number"
                      id="unitPrice"
                      name="unitPrice"
                      value={formData.unitPrice || ''}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      required
                    />
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="unit">Unit *</label>
                  {isReadOnly ? (
                    <span className="readonly-value">{product?.unit}</span>
                  ) : (
                    <select
                      id="unit"
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      required
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group full-width">
                  <label htmlFor="description">Description</label>
                  {isReadOnly ? (
                    <span className="readonly-value">{product?.description || '-'}</span>
                  ) : (
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Product description / benefits"
                    />
                  )}
                </div>

                <div className="form-group full-width">
                  <label htmlFor="dosage">Dosage / Application Rate</label>
                  {isReadOnly ? (
                    <span className="readonly-value">{product?.dosage || '-'}</span>
                  ) : (
                    <input
                      type="text"
                      id="dosage"
                      name="dosage"
                      value={formData.dosage}
                      onChange={handleChange}
                      placeholder="e.g., 50ml/200 Liters"
                    />
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="displayOrder">Display Order</label>
                  {isReadOnly ? (
                    <span className="readonly-value">{product?.displayOrder || 0}</span>
                  ) : (
                    <input
                      type="number"
                      id="displayOrder"
                      name="displayOrder"
                      value={formData.displayOrder}
                      onChange={handleChange}
                      min="0"
                    />
                  )}
                </div>

                {!isReadOnly && (
                  <div className="form-group">
                    <label htmlFor="isActive" className="checkbox-label">
                      <input
                        type="checkbox"
                        id="isActive"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleChange}
                      />
                      Active (visible in quotation dropdowns)
                    </label>
                  </div>
                )}

                {isReadOnly && product && (
                  <div className="form-group">
                    <label>Status</label>
                    <span className={`status-badge ${product.isActive ? 'active' : 'inactive'}`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
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
                {saving ? 'Saving...' : mode === 'add' ? 'Add Product' : 'Save Changes'}
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
          max-width: 600px;
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
          flex-shrink: 0;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          color: #333;
          flex: 1;
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

        .readonly-value {
          font-size: 14px;
          color: #333;
          padding: 10px 0;
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

        .checkbox-label {
          display: flex !important;
          flex-direction: row !important;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding-top: 10px;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
          width: fit-content;
        }

        .status-badge.active {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .status-badge.inactive {
          background: #fbe9e7;
          color: #c62828;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e9ecef;
          flex-shrink: 0;
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
