/**
 * Product Modal Component
 *
 * Modal for viewing, creating, and editing products (Manager only)
 * Supports three modes: 'view', 'add', 'edit'
 */

import { useState, useEffect } from 'react';
import type { Product } from '../types';
import './ProductModal.css';

interface ProductModalProps {
  isOpen: boolean;
  mode: 'view' | 'add' | 'edit';
  product?: Product | null;
  onClose: () => void;
  onSave: (productData: Partial<Product>) => Promise<void>;
}


const initialFormData = {
  sku: '',
  name: '',
  nameKannada: '',
  description: '',
  dosage: '',
  unitPrice: 0,
  unit: '',
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
                    <input
                      type="text"
                      id="unit"
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      placeholder="e.g. 50 ml, 1 kg, 250 g"
                      required
                    />
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

    </div>
  );
}
