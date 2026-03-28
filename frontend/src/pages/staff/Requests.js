import React, { useEffect, useState, useCallback } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';

export default function StaffRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchRequests = useCallback(async () => {
    try {
      const res = await API.get('/requests/my');
      setRequests(res.data);
    } catch { toast.error('Failed to load requests'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading requests...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📤 My Requests</div>
          <div className="page-subtitle">Track your stock-in and stock-out requests</div>
        </div>
        <button className="btn btn-outline" onClick={fetchRequests}>🔄 Refresh</button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 500, fontSize: 13,
            background: filter === f ? '#2563eb' : '#fff',
            color: filter === f ? '#fff' : '#6b7280',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Admin</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Reason</th>
                <th>Date</th>
                <th>Status</th>
                <th>Admin Note</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state"><div className="icon">📭</div><p>No requests found</p></div></td></tr>
              ) : filtered.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{r.product?.name || 'N/A'}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.product?.sku}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{r.admin?.username || 'N/A'}</div>
                  </td>
                  <td>
                    <span className={`badge ${r.type === 'stock-in' ? 'badge-success' : 'badge-warning'}`}>
                      {r.type === 'stock-in' ? '📥 Stock In' : '📤 Stock Out'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{r.quantity}</td>
                  <td style={{ color: '#6b7280', fontSize: 13, maxWidth: 160 }}>{r.reason || '—'}</td>
                  <td style={{ fontSize: 12, color: '#9ca3af' }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    {r.status === 'pending' && <span className="badge badge-warning">⏳ Pending</span>}
                    {r.status === 'approved' && <span className="badge badge-success">✅ Approved</span>}
                    {r.status === 'rejected' && <span className="badge badge-danger">❌ Rejected</span>}
                  </td>
                  <td style={{ fontSize: 12, color: '#6b7280' }}>{r.adminNote || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}