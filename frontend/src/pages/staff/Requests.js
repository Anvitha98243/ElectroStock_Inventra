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
          <div className="page-subtitle">Track all your stock requests and their status</div>
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

      {filtered.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="icon">📭</div><p>No requests found. Browse products to make your first request!</p></div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(r => (
            <div key={r._id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{r.product?.name}</span>
                    <span className={`badge ${r.type === 'stock-in' ? 'badge-success' : 'badge-warning'}`}>
                      {r.type === 'stock-in' ? '📥 Stock In' : '📤 Stock Out'}
                    </span>
                    {r.status === 'pending' && <span className="badge badge-warning">⏳ Pending</span>}
                    {r.status === 'approved' && <span className="badge badge-success">✅ Approved</span>}
                    {r.status === 'rejected' && <span className="badge badge-danger">❌ Rejected</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <div><span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>SKU </span><span style={{ fontSize: 13 }}>{r.product?.sku}</span></div>
                    <div><span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>CATEGORY </span><span style={{ fontSize: 13 }}>{r.product?.category}</span></div>
                    <div><span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>ADMIN </span><span style={{ fontSize: 13 }}>@{r.admin?.username}</span></div>
                    <div><span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>QUANTITY </span><span style={{ fontSize: 13, fontWeight: 700 }}>{r.quantity}</span></div>
                    <div><span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>DATE </span><span style={{ fontSize: 13 }}>{new Date(r.createdAt).toLocaleDateString()}</span></div>
                  </div>
                  {r.reason && (
                    <div style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
                      <span style={{ fontWeight: 500 }}>Reason:</span> {r.reason}
                    </div>
                  )}
                  {r.adminNote && (
                    <div style={{ marginTop: 8, padding: '8px 12px', background: r.status === 'approved' ? '#f0fdf4' : '#fef2f2', borderRadius: 8, fontSize: 13 }}>
                      <span style={{ fontWeight: 500, color: r.status === 'approved' ? '#16a34a' : '#dc2626' }}>Admin Note:</span> {r.adminNote}
                    </div>
                  )}
                </div>
                {r.resolvedAt && (
                  <div style={{ textAlign: 'right', fontSize: 12, color: '#9ca3af' }}>
                    Resolved<br />{new Date(r.resolvedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
