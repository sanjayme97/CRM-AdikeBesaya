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
import './ProductsPage.css';

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

    </Layout>
  );
}
