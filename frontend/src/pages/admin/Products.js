import React, { useEffect, useState, useCallback } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const CATEGORIES = ['Components', 'Consumer Electronics', 'Spare Parts', 'Accessories', 'Other'];

const emptyForm = { name: '', sku: '', category: 'Components', description: '', quantity: '', minThreshold: '10', price: '', supplier: '', location: '' };

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await API.get('/products');
      setProducts(res.data);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openAdd = () => { setEditProduct(null); setForm(emptyForm); setFormError(''); setShowModal(true); };
  const openEdit = (p) => {
    setEditProduct(p);
    setForm({ name: p.name, sku: p.sku, category: p.category, description: p.description || '', quantity: String(p.quantity), minThreshold: String(p.minThreshold), price: String(p.price), supplier: p.supplier || '', location: p.location || '' });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name || !form.sku || !form.category || form.price === '') { setFormError('Name, SKU, category and price are required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, quantity: Number(form.quantity) || 0, minThreshold: Number(form.minThreshold) || 10, price: Number(form.price) };
      if (editProduct) {
        // FIX: use editProduct.id instead of editProduct._id
        await API.put(`/products/${editProduct.id}`, payload);
        toast.success('Product updated');
      } else {
        await API.post('/products', payload);
        toast.success('Product added');
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/products/${id}`);
      toast.success('Product deleted');
      setDeleteConfirm(null);
      fetchProducts();
    } catch { toast.error('Delete failed'); }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Electronics Inventory Report', 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
    autoTable(doc, {
      startY: 32,
      head: [['Name', 'SKU', 'Category', 'Qty', 'Min', 'Price (₹)', 'Status']],
      body: filtered.map(p => [p.name, p.sku, p.category, p.quantity, p.minThreshold, p.price, p.quantity < p.minThreshold ? 'LOW STOCK' : 'OK']),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] }
    });
    doc.save('inventory-report.pdf');
    toast.success('PDF exported');
  };

  const exportExcel = () => {
    const data = filtered.map(p => ({
      Name: p.name, SKU: p.sku, Category: p.category, Quantity: p.quantity,
      'Min Threshold': p.minThreshold, 'Price (₹)': p.price,
      Supplier: p.supplier || '', Location: p.location || '',
      Status: p.quantity < p.minThreshold ? 'LOW STOCK' : 'OK',
      'Total Value (₹)': p.price * p.quantity
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'inventory.xlsx');
    toast.success('Excel exported');
  };

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.supplier || '').toLowerCase().includes(q);
    const matchCat = !filterCat || p.category === filterCat;
    return matchSearch && matchCat;
  });

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading products...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📦 Products</div>
          <div className="page-subtitle">{products.length} products · {products.filter(p => p.quantity < p.minThreshold).length} low stock</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={exportPDF}>📄 Export PDF</button>
          <button className="btn btn-outline btn-sm" onClick={exportExcel}>📊 Export Excel</button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
          <span>🔍</span>
          <input placeholder="Search by name, SKU, supplier..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control" style={{ width: 200 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th><th>SKU</th><th>Category</th><th>Quantity</th><th>Min Threshold</th><th>Price</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state"><div className="icon">📦</div><p>No products found</p></div></td></tr>
              ) : filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                    {p.supplier && <div style={{ fontSize: 12, color: '#9ca3af' }}>{p.supplier}</div>}
                  </td>
                  <td><code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{p.sku}</code></td>
                  <td><span className="badge badge-info">{p.category}</span></td>
                  <td><span style={{ fontWeight: 600, fontSize: 15, color: p.quantity < p.minThreshold ? '#dc2626' : '#1a202c' }}>{p.quantity}</span></td>
                  <td style={{ color: '#6b7280' }}>{p.minThreshold}</td>
                  <td>₹{p.price.toLocaleString()}</td>
                  <td>
                    {p.quantity < p.minThreshold
                      ? <span className="badge badge-danger">🚨 Low Stock</span>
                      : <span className="badge badge-success">✅ OK</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>✏️ Edit</button>
                      {/* FIX: pass p directly, id extracted in modal confirm */}
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(p)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editProduct ? '✏️ Edit Product' : '+ Add Product'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {formError && <div className="alert alert-danger">{formError}</div>}
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Product Name *</label>
                  <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Arduino Uno Rev3" />
                </div>
                <div className="form-group">
                  <label>SKU *</label>
                  <input className="form-control" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="e.g. ARD-UNO-001" />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select className="form-control" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantity</label>
                  <input className="form-control" type="number" min="0" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Min Threshold</label>
                  <input className="form-control" type="number" min="0" value={form.minThreshold} onChange={e => setForm({ ...form, minThreshold: e.target.value })} placeholder="10" />
                </div>
                <div className="form-group">
                  <label>Price (₹) *</label>
                  <input className="form-control" type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label>Supplier</label>
                  <input className="form-control" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} placeholder="Supplier name" />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input className="form-control" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Shelf / Bin" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Description</label>
                  <textarea className="form-control" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (editProduct ? 'Update Product' : 'Add Product')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <div className="modal-title">🗑️ Delete Product</div>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <p style={{ color: '#4b5563', marginBottom: 20 }}>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              {/* FIX: use deleteConfirm.id instead of deleteConfirm._id */}
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
