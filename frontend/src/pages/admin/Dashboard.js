import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/products'),
      API.get('/requests/admin'),
      API.get('/products/alerts')
    ]).then(([p, r, a]) => {
      setProducts(p.data);
      setRequests(r.data);
      setAlerts(a.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading dashboard...</div>;

  const pending = requests.filter(r => r.status === 'pending');
  const totalValue = products.reduce((s, p) => s + (p.price * p.quantity), 0);
  const categories = [...new Set(products.map(p => p.category))];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Welcome back, {user?.username} 👋</div>
          <div className="page-subtitle">Electronics Inventory Overview</div>
        </div>
        <Link to="/admin/products" className="btn btn-primary">+ Add Product</Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eff6ff' }}>📦</div>
          <div>
            <div className="stat-label">Total Products</div>
            <div className="stat-value">{products.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef2f2' }}>🚨</div>
          <div>
            <div className="stat-label">Low Stock Alerts</div>
            <div className="stat-value" style={{ color: alerts.length > 0 ? '#dc2626' : '#1a202c' }}>{alerts.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fffbeb' }}>🔄</div>
          <div>
            <div className="stat-label">Pending Requests</div>
            <div className="stat-value" style={{ color: pending.length > 0 ? '#d97706' : '#1a202c' }}>{pending.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0fdf4' }}>💰</div>
          <div>
            <div className="stat-label">Inventory Value</div>
            <div className="stat-value" style={{ fontSize: 18 }}>₹{totalValue.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Low Stock Alerts */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 600, fontSize: 16 }}>🚨 Low Stock Alerts</h3>
            <span className="badge badge-danger">{alerts.length}</span>
          </div>
          {alerts.length === 0 ? (
            <div className="empty-state"><div className="icon">✅</div><p>All stock levels are healthy</p></div>
          ) : (
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {alerts.map(p => (
                <div key={p._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{p.sku} • {p.category}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#dc2626' }}>{p.quantity}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>min: {p.minThreshold}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Requests */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 600, fontSize: 16 }}>🔄 Pending Requests</h3>
            <Link to="/admin/requests" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>View all</Link>
          </div>
          {pending.length === 0 ? (
            <div className="empty-state"><div className="icon">✅</div><p>No pending requests</p></div>
          ) : (
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {pending.slice(0, 6).map(r => (
                <div key={r._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{r.product?.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>by {r.staff?.username}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${r.type === 'stock-in' ? 'badge-success' : 'badge-warning'}`}>{r.type}</span>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>Qty: {r.quantity}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="card">
        <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>📊 Inventory by Category</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {['Components', 'Consumer Electronics', 'Spare Parts', 'Accessories', 'Other'].map(cat => {
            const count = products.filter(p => p.category === cat).length;
            const qty = products.filter(p => p.category === cat).reduce((s, p) => s + p.quantity, 0);
            return (
              <div key={cat} style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', borderLeft: '4px solid #2563eb' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{cat}</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{count}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>items · {qty} units</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
