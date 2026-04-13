import React, { useState, useEffect, useRef } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

// ── QR Scanner Modal ─────────────────────────────────────────────────────────
// Uses html5-qrcode loaded dynamically to avoid SSR issues.
// We load it once, start the camera, parse the QR payload, then stop cleanly.
function QRScannerModal({ onScan, onClose }) {
  const scannerRef  = useRef(null);   // html5-qrcode instance
  const divId       = 'qr-reader-el'; // stable DOM id
  const [status, setStatus]   = useState('starting'); // starting | scanning | error
  const [errMsg, setErrMsg]   = useState('');
  const startedRef  = useRef(false);  // guard against double-start (StrictMode)

  useEffect(() => {
    let html5QrCode = null;

    const startScanner = async () => {
      if (startedRef.current) return;
      startedRef.current = true;

      try {
        // Dynamic import — only loads the lib when the modal opens
        const { Html5Qrcode } = await import('html5-qrcode');
        html5QrCode = new Html5Qrcode(divId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' }, // rear camera on phones
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            // ── Success ──────────────────────────────────────────────────────
            stopScanner(html5QrCode);
            try {
              const data = JSON.parse(decodedText);
              // Validate it's one of our product QR codes
              if (!data.productId || !data.adminId) throw new Error('Not a valid product QR');
              onScan(data);
            } catch {
              toast.error('Invalid QR code — not an ElectroStock product QR');
              onClose();
            }
          },
          () => { /* ignore per-frame decode failures */ }
        );

        setStatus('scanning');
      } catch (err) {
        const msg = err?.message || String(err);
        // Camera permission denied or not available
        if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
          setErrMsg('Camera permission denied. Please allow camera access and try again.');
        } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('no camera')) {
          setErrMsg('No camera found on this device.');
        } else {
          setErrMsg('Could not start camera: ' + msg);
        }
        setStatus('error');
      }
    };

    const stopScanner = async (instance) => {
      try {
        if (instance && instance.isScanning) {
          await instance.stop();
          instance.clear();
        }
      } catch { /* ignore stop errors */ }
    };

    startScanner();

    // Cleanup when modal unmounts
    return () => {
      if (scannerRef.current) {
        stopScanner(scannerRef.current);
        scannerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420, textAlign: 'center' }}>
        <div className="modal-header">
          <div className="modal-title">📷 Scan Product QR Code</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {status === 'starting' && (
          <div style={{ padding: '32px 0', color: '#6b7280' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📷</div>
            <div>Starting camera...</div>
          </div>
        )}

        {status === 'error' && (
          <div style={{ padding: '24px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <div className="alert alert-danger" style={{ textAlign: 'left' }}>{errMsg}</div>
            <button className="btn btn-outline" onClick={onClose}>Close</button>
          </div>
        )}

        {/* Camera viewfinder — always rendered so html5-qrcode can attach to it */}
        <div style={{ display: status === 'error' ? 'none' : 'block' }}>
          {/* html5-qrcode mounts the video inside this div */}
          <div
            id={divId}
            style={{ width: '100%', borderRadius: 10, overflow: 'hidden' }}
          />

          {status === 'scanning' && (
            <div style={{ marginTop: 16, fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
              Point your camera at a product QR code.
              <br />The form will auto-fill instantly on a successful scan.
            </div>
          )}

          <button
            className="btn btn-outline"
            onClick={onClose}
            style={{ marginTop: 16 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function StaffProducts() {
  const { user } = useAuth();
  const [adminSearch, setAdminSearch]     = useState('');
  const [foundAdmin, setFoundAdmin]       = useState(null);
  const [products, setProducts]           = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [filterCat, setFilterCat]         = useState('');
  const [requestModal, setRequestModal]   = useState(null);
  const [reqForm, setReqForm]             = useState({ type: 'stock-in', quantity: '', reason: '' });
  const [submitting, setSubmitting]       = useState(false);
  const [formError, setFormError]         = useState('');
  const [showScanner, setShowScanner]     = useState(false); // ← NEW

  // ── Load admin + products by id (used after QR scan too) ─────────────────
  const loadAdminProducts = async (adminId, adminData) => {
    try {
      const pRes = await API.get(`/products/by-admin/${adminId}`);
      setFoundAdmin(adminData);
      setProducts(pRes.data);
      return pRes.data;
    } catch {
      toast.error('Failed to load products for admin');
      return [];
    }
  };

  // ── Manual admin search (unchanged) ──────────────────────────────────────
  const searchAdmin = async () => {
    if (!adminSearch.trim()) { toast.error('Enter admin username'); return; }
    setSearchLoading(true);
    setFoundAdmin(null); setProducts([]);
    try {
      const res = await API.get(`/auth/search-admin?username=${adminSearch.trim()}`);
      await loadAdminProducts(res.data.id, res.data);
      toast.success(`Found admin: ${res.data.username}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Admin not found');
      setFoundAdmin(null); setProducts([]);
    } finally { setSearchLoading(false); }
  };

  // ── QR scan handler ───────────────────────────────────────────────────────
  const handleQRScan = async (data) => {
    setShowScanner(false);
    toast.loading('Loading product details...', { id: 'qr-load' });

    try {
      // 1. Load admin info by id
      let adminData = foundAdmin;
      if (!adminData || adminData.id !== data.adminId) {
        // Fetch admin via search — we use the adminUsername from QR payload
        const adminRes = await API.get(`/auth/search-admin?username=${data.adminUsername}`);
        adminData = adminRes.data;
        setAdminSearch(data.adminUsername);
      }

      // 2. Load products for that admin (if not already loaded for same admin)
      let productList = products;
      if (!foundAdmin || foundAdmin.id !== adminData.id) {
        productList = await loadAdminProducts(adminData.id, adminData);
      }

      // 3. Find the exact product in the list (fresh from server = accurate stock)
      const product = productList.find(p => p.id === data.productId);
      if (!product) {
        toast.error('Product not found in inventory. It may have been deleted.', { id: 'qr-load' });
        return;
      }

      toast.success(`✅ Scanned: ${product.name}`, { id: 'qr-load' });

      // 4. Auto-open the request modal with this product
      setRequestModal(product);
      setReqForm({ type: 'stock-in', quantity: '', reason: '' });
      setFormError('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load scanned product', { id: 'qr-load' });
    }
  };

  // ── Request submit (unchanged) ────────────────────────────────────────────
  const openRequest = (product) => {
    setRequestModal(product);
    setReqForm({ type: 'stock-in', quantity: '', reason: '' });
    setFormError('');
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!reqForm.quantity || Number(reqForm.quantity) < 1) { setFormError('Quantity must be at least 1'); return; }
    if (reqForm.type === 'stock-out' && Number(reqForm.quantity) > requestModal.quantity) {
      setFormError(`Cannot request more than available stock (${requestModal.quantity})`); return;
    }
    setSubmitting(true);
    try {
      await API.post('/requests', {
        productId: requestModal.id,
        adminId:   foundAdmin.id,
        type:      reqForm.type,
        quantity:  Number(reqForm.quantity),
        reason:    reqForm.reason,
      });
      toast.success('Request submitted successfully!');
      setRequestModal(null);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit request');
    } finally { setSubmitting(false); }
  };

  const filtered = products.filter(p => {
    const q = productSearch.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    const matchCat = !filterCat || p.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🔍 Browse Products</div>
          <div className="page-subtitle">Search for an admin to view and request their inventory</div>
        </div>
        {/* ── NEW: Scan QR button in header ── */}
        <button
          className="btn btn-primary"
          onClick={() => setShowScanner(true)}
          title="Scan a product QR code to instantly open its request form"
        >
          📷 Scan QR Code
        </button>
      </div>

      {/* ── NEW: QR tip banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)',
        border: '1px solid #bfdbfe',
        borderRadius: 10,
        padding: '12px 18px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 13,
        color: '#1e40af',
      }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>📱</span>
        <span>
          <strong>Quick tip:</strong> Click <strong>"Scan QR Code"</strong> and point your camera at any product QR code to instantly jump to its request form — no manual searching needed!
        </span>
      </div>

      {/* Admin Search — unchanged */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>🛡️ Find Admin</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="form-control" style={{ flex: 1 }} placeholder="Enter admin username..."
            value={adminSearch} onChange={e => setAdminSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchAdmin()} />
          <button className="btn btn-primary" onClick={searchAdmin} disabled={searchLoading}>
            {searchLoading ? 'Searching...' : '🔍 Search'}
          </button>
        </div>
        {foundAdmin && (
          <div style={{ marginTop: 14, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>
              {foundAdmin.username[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#15803d' }}>@{foundAdmin.username}</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>{foundAdmin.email} · {products.length} products</div>
            </div>
          </div>
        )}
      </div>

      {/* Products table — unchanged */}
      {foundAdmin && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="search-box" style={{ flex: 1, minWidth: 180 }}>
              <span>🔍</span>
              <input placeholder="Filter products..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
            </div>
            <select className="form-control" style={{ width: 180 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="">All Categories</option>
              {['Components', 'Consumer Electronics', 'Spare Parts', 'Accessories', 'Other'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Product</th><th>Category</th><th>Stock</th><th>Min Threshold</th><th>Price</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7}><div className="empty-state"><div className="icon">📦</div><p>No products found</p></div></td></tr>
                  ) : filtered.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af' }}>{p.sku}</div>
                      </td>
                      <td><span className="badge badge-info">{p.category}</span></td>
                      <td><span style={{ fontWeight: 700, fontSize: 15, color: p.quantity < p.minThreshold ? '#dc2626' : '#16a34a' }}>{p.quantity}</span></td>
                      <td style={{ color: '#6b7280' }}>{p.minThreshold}</td>
                      <td>₹{p.price.toLocaleString()}</td>
                      <td>
                        {p.quantity < p.minThreshold
                          ? <span className="badge badge-danger">🚨 Low Stock</span>
                          : <span className="badge badge-success">✅ In Stock</span>}
                      </td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => openRequest(p)}>Request</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── NEW: QR Scanner Modal ── */}
      {showScanner && (
        <QRScannerModal
          onScan={handleQRScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Request Modal — unchanged */}
      {requestModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setRequestModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">📤 Request Stock</div>
              <button className="modal-close" onClick={() => setRequestModal(null)}>✕</button>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 20 }}>
              <div style={{ fontWeight: 600 }}>{requestModal.name}</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>{requestModal.sku} · {requestModal.category}</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
                <div><span style={{ fontSize: 11, color: '#9ca3af' }}>CURRENT STOCK</span><br /><span style={{ fontWeight: 700, fontSize: 18, color: requestModal.quantity < requestModal.minThreshold ? '#dc2626' : '#16a34a' }}>{requestModal.quantity}</span></div>
                <div><span style={{ fontSize: 11, color: '#9ca3af' }}>PRICE</span><br /><span style={{ fontWeight: 600 }}>₹{requestModal.price}</span></div>
              </div>
            </div>
            {formError && <div className="alert alert-danger">{formError}</div>}
            <form onSubmit={handleRequest}>
              <div className="form-group">
                <label>Request Type *</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['stock-in', 'stock-out'].map(t => (
                    <label key={t} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: `2px solid ${reqForm.type === t ? '#2563eb' : '#e5e7eb'}`, borderRadius: 8, cursor: 'pointer', background: reqForm.type === t ? '#eff6ff' : '#fff' }}>
                      <input type="radio" name="type" value={t} checked={reqForm.type === t} onChange={() => setReqForm({ ...reqForm, type: t })} style={{ display: 'none' }} />
                      <span>{t === 'stock-in' ? '📥' : '📤'}</span>
                      <span style={{ fontWeight: 500, fontSize: 14, color: reqForm.type === t ? '#2563eb' : '#374151' }}>{t === 'stock-in' ? 'Stock In' : 'Stock Out'}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Quantity *</label>
                <input className="form-control" type="number" min="1" max={reqForm.type === 'stock-out' ? requestModal.quantity : undefined}
                  value={reqForm.quantity} onChange={e => setReqForm({ ...reqForm, quantity: e.target.value })} placeholder="Enter quantity" />
                {reqForm.type === 'stock-out' && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Max available: {requestModal.quantity}</div>}
              </div>
              <div className="form-group">
                <label>Reason</label>
                <textarea className="form-control" rows={2} value={reqForm.reason} onChange={e => setReqForm({ ...reqForm, reason: e.target.value })} placeholder="Why are you requesting this stock?" />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setRequestModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}