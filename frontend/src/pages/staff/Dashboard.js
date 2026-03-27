import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function StaffDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/requests/my')
      .then(res => setRequests(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  const rejected = requests.filter(r => r.status === 'rejected').length;

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Welcome, {user?.username} 👋</div>
          <div className="page-subtitle">Staff Portal — Browse and request stock from admins</div>
        </div>
        <Link to="/staff/products" className="btn btn-primary">🔍 Browse Products</Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eff6ff' }}>📤</div>
          <div><div className="stat-label">Total Requests</div><div className="stat-value">{requests.length}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fffbeb' }}>⏳</div>
          <div><div className="stat-label">Pending</div><div className="stat-value" style={{ color: '#d97706' }}>{pending}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0fdf4' }}>✅</div>
          <div><div className="stat-label">Approved</div><div className="stat-value" style={{ color: '#16a34a' }}>{approved}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef2f2' }}>❌</div>
          <div><div className="stat-label">Rejected</div><div className="stat-value" style={{ color: '#dc2626' }}>{rejected}</div></div>
        </div>
      </div>

      {/* How to use guide */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>📖 How to Use</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { icon: '🔍', title: 'Browse Products', desc: 'Go to "Browse Products" and search for an admin by username to view their inventory.' },
            { icon: '📤', title: 'Request Stock', desc: 'Select a product and submit a Stock In or Stock Out request with quantity and reason.' },
            { icon: '⏳', title: 'Wait for Approval', desc: 'The admin will review and approve or reject your request.' },
            { icon: '✅', title: 'Track Status', desc: 'View all your requests and their status in "My Requests".' },
          ].map(step => (
            <div key={step.title} style={{ background: '#f8fafc', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{step.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{step.title}</div>
              <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent requests */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontWeight: 600, fontSize: 16 }}>🕐 Recent Requests</h3>
          <Link to="/staff/requests" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>View all</Link>
        </div>
        {requests.length === 0 ? (
          <div className="empty-state"><div className="icon">📭</div><p>No requests yet. Browse products to get started.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Admin</th><th>Type</th><th>Qty</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {requests.slice(0, 8).map(r => (
                  <tr key={r.id}>
                    <td><div style={{ fontWeight: 500 }}>{r.product?.name}</div><div style={{ fontSize: 12, color: '#9ca3af' }}>{r.product?.sku}</div></td>
                    <td>{r.admin?.username}</td>
                    <td><span className={`badge ${r.type === 'stock-in' ? 'badge-success' : 'badge-warning'}`}>{r.type}</span></td>
                    <td style={{ fontWeight: 600 }}>{r.quantity}</td>
                    <td>
                      {r.status === 'pending' && <span className="badge badge-warning">⏳ Pending</span>}
                      {r.status === 'approved' && <span className="badge badge-success">✅ Approved</span>}
                      {r.status === 'rejected' && <span className="badge badge-danger">❌ Rejected</span>}
                    </td>
                    <td style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
