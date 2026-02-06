/**
 * Products Admin Page (Manager only)
 *
 * Displays all products in a hybrid view:
 * - Desktop (>=768px): Table view
 * - Mobile (<768px): Card view
 */

import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ProductModal } from '../components/ProductModal';
import {
  fetchProducts,
  createProduct,
  updateProduct,
} from '../services/supabase/products';
import type { Product } from '../types';

type ModalMode = 'view' | 'add' | 'edit';

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts(false); // show all including inactive
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const openModal = (mode: ModalMode, product?: Product) => {
    setModalMode(mode);
    setSelectedProduct(product || null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedProduct(null);
  };

  const handleSave = async (productData: Partial<Product>) => {
    if (modalMode === 'add') {
      await createProduct(productData as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>);
    } else if (modalMode === 'edit' && selectedProduct) {
      await updateProduct(selectedProduct.id, productData);
    }
    await loadProducts();
  };

  const handleToggleActive = async (product: Product) => {
    try {
      await updateProduct(product.id, { isActive: !product.isActive });
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
    }
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Filter products by search
  const filteredProducts = products.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term) ||
      p.nameKannada?.toLowerCase().includes(term)
    );
  });

  return (
    <Layout>
      <div className="products-page">
        <div className="page-header">
          <div className="page-title-section">
            <h1>Products</h1>
            <span className="record-count">{filteredProducts.length} products</span>
          </div>
          <button className="btn-add" onClick={() => openModal('add')}>
            + Add Product
          </button>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by name, SKU, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>
              Clear
            </button>
          )}
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <LoadingSpinner />
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <p>{searchTerm ? 'No products match your search' : 'No products yet. Click "+ Add Product" to get started.'}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-view">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Name (Kannada)</th>
                    <th>Unit Price</th>
                    <th>Unit</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr
                      key={product.id}
                      className={`product-row ${!product.isActive ? 'inactive' : ''}`}
                      onClick={() => openModal('view', product)}
                    >
                      <td className="sku-cell">{product.sku || '-'}</td>
                      <td className="name-cell">{product.name}</td>
                      <td className="kannada-cell">{product.nameKannada || '-'}</td>
                      <td className="price-cell">{formatCurrency(product.unitPrice)}</td>
                      <td>{product.unit}</td>
                      <td>{product.category || '-'}</td>
                      <td>
                        <span className={`status-badge ${product.isActive ? 'active' : 'inactive'}`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn-action edit"
                          onClick={() => openModal('edit', product)}
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          className={`btn-action ${product.isActive ? 'deactivate' : 'activate'}`}
                          onClick={() => handleToggleActive(product)}
                          title={product.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {product.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="card-view">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={`product-card ${!product.isActive ? 'inactive' : ''}`}
                  onClick={() => openModal('view', product)}
                >
                  <div className="card-header">
                    <span className="card-name">{product.name}</span>
                    <span className={`status-badge ${product.isActive ? 'active' : 'inactive'}`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {product.nameKannada && (
                    <div className="card-kannada">{product.nameKannada}</div>
                  )}
                  <div className="card-details">
                    <span className="card-price">{formatCurrency(product.unitPrice)}</span>
                    <span className="card-unit">/ {product.unit}</span>
                    {product.category && <span className="card-category">{product.category}</span>}
                  </div>
                  {product.sku && <div className="card-sku">SKU: {product.sku}</div>}
                  <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-action edit"
                      onClick={() => openModal('edit', product)}
                    >
                      Edit
                    </button>
                    <button
                      className={`btn-action ${product.isActive ? 'deactivate' : 'activate'}`}
                      onClick={() => handleToggleActive(product)}
                    >
                      {product.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Product Modal */}
        <ProductModal
          isOpen={modalOpen}
          mode={modalMode}
          product={selectedProduct}
          onClose={closeModal}
          onSave={handleSave}
        />
      </div>

      <style>{`
        .products-page {
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .page-title-section {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }

        .page-title-section h1 {
          margin: 0;
          font-size: 24px;
          color: #333;
        }

        .record-count {
          font-size: 14px;
          color: #888;
        }

        .btn-add {
          background: #667eea;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-add:hover {
          background: #5568d3;
        }

        .search-bar {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .search-input {
          flex: 1;
          padding: 10px 16px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }

        .search-input:focus {
          outline: none;
          border-color: #667eea;
        }

        .clear-search {
          background: white;
          border: 1px solid #ddd;
          color: #666;
          padding: 10px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .error-banner {
          background: #fee;
          color: #c00;
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 16px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #888;
          font-size: 16px;
        }

        /* Desktop Table */
        .table-view {
          display: block;
          overflow-x: auto;
        }

        .table-view table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .table-view th {
          background: #f8f9fa;
          padding: 12px 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          border-bottom: 2px solid #e9ecef;
        }

        .table-view td {
          padding: 12px 16px;
          font-size: 14px;
          color: #333;
          border-bottom: 1px solid #f0f0f0;
        }

        .product-row {
          cursor: pointer;
          transition: background 0.15s;
        }

        .product-row:hover {
          background: #f8f9fa;
        }

        .product-row.inactive {
          opacity: 0.6;
        }

        .sku-cell {
          font-family: monospace;
          font-size: 13px;
          color: #667eea;
        }

        .name-cell {
          font-weight: 500;
        }

        .price-cell {
          font-weight: 600;
          color: #2e7d32;
        }

        .status-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.active {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .status-badge.inactive {
          background: #fbe9e7;
          color: #c62828;
        }

        .actions-cell {
          display: flex;
          gap: 8px;
        }

        .btn-action {
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid;
        }

        .btn-action.edit {
          background: white;
          border-color: #667eea;
          color: #667eea;
        }

        .btn-action.edit:hover {
          background: #f0f4ff;
        }

        .btn-action.deactivate {
          background: white;
          border-color: #f44336;
          color: #f44336;
        }

        .btn-action.deactivate:hover {
          background: #fef0ef;
        }

        .btn-action.activate {
          background: white;
          border-color: #4caf50;
          color: #4caf50;
        }

        .btn-action.activate:hover {
          background: #f0faf0;
        }

        /* Mobile Card View */
        .card-view {
          display: none;
        }

        .product-card {
          background: white;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
        }

        .product-card.inactive {
          opacity: 0.6;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .card-name {
          font-weight: 600;
          font-size: 16px;
          color: #333;
        }

        .card-kannada {
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }

        .card-details {
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin-bottom: 8px;
        }

        .card-price {
          font-size: 18px;
          font-weight: 600;
          color: #2e7d32;
        }

        .card-unit {
          font-size: 14px;
          color: #888;
        }

        .card-category {
          margin-left: auto;
          font-size: 12px;
          background: #e3f2fd;
          color: #1565c0;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .card-sku {
          font-size: 12px;
          color: #888;
          font-family: monospace;
          margin-bottom: 12px;
        }

        .card-actions {
          display: flex;
          gap: 8px;
          border-top: 1px solid #f0f0f0;
          padding-top: 12px;
        }

        .card-actions .btn-action {
          flex: 1;
          text-align: center;
          padding: 8px;
        }

        @media (max-width: 768px) {
          .table-view {
            display: none;
          }

          .card-view {
            display: block;
          }

          .page-header {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .btn-add {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </Layout>
  );
}
