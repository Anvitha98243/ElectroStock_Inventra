import React, { useEffect, useState, useCallback } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolveModal, setResolveModal] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchRequests = useCallback(async () => {
    try {
      const res = await API.get('/requests/admin');
      setRequests(res.data);
    } catch { toast.error('Failed to load requests'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleResolve = async (status) => {
    setResolving(true);
    try {
      // FIX: use resolveModal.id instead of resolveModal._id
      await API.put(`/requests/${resolveModal.id}/resolve`, { status, adminNote });
      toast.success(`Request ${status}`);
      setResolveModal(null);
      setAdminNote('');
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve request');
    } finally { setResolving(false); }
  };

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
          <div className="page-title">🔄 Stock Requests</div>
          <div className="page-subtitle">Manage staff stock-in and stock-out requests</div>
        </div>
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
              <tr><th>Product</th><th>Staff</th><th>Type</th><th>Qty</th><th>Reason</th><th>Date</th><th>Status</th><th>Action</th></tr>
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
                    <div style={{ fontWeight: 500 }}>{r.staff?.username}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.staff?.email}</div>
                  </td>
                  <td><span className={`badge ${r.type === 'stock-in' ? 'badge-success' : 'badge-warning'}`}>{r.type === 'stock-in' ? '📥 Stock In' : '📤 Stock Out'}</span></td>
                  <td style={{ fontWeight: 600 }}>{r.quantity}</td>
                  <td style={{ color: '#6b7280', fontSize: 13, maxWidth: 160 }}>{r.reason || '—'}</td>
                  <td style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>
                    {r.status === 'pending' && <span className="badge badge-warning">⏳ Pending</span>}
                    {r.status === 'approved' && <span className="badge badge-success">✅ Approved</span>}
                    {r.status === 'rejected' && <span className="badge badge-danger">❌ Rejected</span>}
                  </td>
                  <td>
                    {r.status === 'pending' ? (
                      <button className="btn btn-primary btn-sm" onClick={() => { setResolveModal(r); setAdminNote(''); }}>Review</button>
                    ) : (
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>{r.adminNote || '—'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Review Stock Request</div>
              <button className="modal-close" onClick={() => setResolveModal(null)}>✕</button>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>PRODUCT</div><div style={{ fontWeight: 600 }}>{resolveModal.product?.name}</div></div>
                <div><div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>SKU</div><div>{resolveModal.product?.sku}</div></div>
                <div><div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>REQUESTED BY</div><div>{resolveModal.staff?.username}</div></div>
                <div><div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>TYPE</div><span className={`badge ${resolveModal.type === 'stock-in' ? 'badge-success' : 'badge-warning'}`}>{resolveModal.type}</span></div>
                <div><div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>QUANTITY</div><div style={{ fontWeight: 700, fontSize: 18 }}>{resolveModal.quantity}</div></div>
                <div><div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>CURRENT STOCK</div><div style={{ fontWeight: 700, fontSize: 18 }}>{resolveModal.product?.quantity}</div></div>
              </div>
              {resolveModal.reason && <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e5e7eb' }}><span style={{ fontSize: 11, color: '#9ca3af' }}>REASON: </span>{resolveModal.reason}</div>}
            </div>
            <div className="form-group">
              <label>Admin Note (optional)</label>
              <textarea className="form-control" rows={2} value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Add a note for the staff member..." />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setResolveModal(null)}>Cancel</button>
              <button className="btn btn-danger" disabled={resolving} onClick={() => handleResolve('rejected')}>❌ Reject</button>
              <button className="btn btn-success" disabled={resolving} onClick={() => handleResolve('approved')}>✅ Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}