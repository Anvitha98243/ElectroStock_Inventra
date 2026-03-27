import React, { useEffect, useState, useCallback } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ACTION_LABELS = {
  USER_LOGIN: { label: 'User Login', color: 'badge-info' },
  PRODUCT_CREATED: { label: 'Product Created', color: 'badge-success' },
  PRODUCT_UPDATED: { label: 'Product Updated', color: 'badge-warning' },
  PRODUCT_DELETED: { label: 'Product Deleted', color: 'badge-danger' },
  STOCK_REQUEST_CREATED: { label: 'Request Created', color: 'badge-info' },
  STOCK_REQUEST_APPROVED: { label: 'Request Approved', color: 'badge-success' },
  STOCK_REQUEST_REJECTED: { label: 'Request Rejected', color: 'badge-danger' },
};

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('audit');

  const fetchLogs = useCallback(async () => {
    try {
      const [l, t] = await Promise.all([API.get('/logs'), API.get('/logs/transactions')]);
      setLogs(l.data);
      setTransactions(t.data);
    } catch { toast.error('Failed to load logs'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const exportAuditPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('Audit Log Report', 14, 18);
    doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
    autoTable(doc, {
      startY: 32,
      head: [['Date', 'Action', 'User', 'Details']],
      body: logs.map(l => [
        new Date(l.createdAt).toLocaleString(),
        l.action,
        l.performedBy?.username || 'N/A',
        JSON.stringify(l.details || {}).slice(0, 80)
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] }
    });
    doc.save('audit-log.pdf');
    toast.success('Audit PDF exported');
  };

  const exportTransactionPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('Transaction Log Report', 14, 18);
    doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
    autoTable(doc, {
      startY: 32,
      head: [['Date', 'Action', 'User', 'Details']],
      body: transactions.map(t => [
        new Date(t.createdAt).toLocaleString(),
        t.action,
        t.performedBy?.username || 'N/A',
        JSON.stringify(t.details || {}).slice(0, 80)
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 163, 74] }
    });
    doc.save('transaction-log.pdf');
    toast.success('Transaction PDF exported');
  };

  const exportAuditExcel = () => {
    const data = logs.map(l => ({
      Date: new Date(l.createdAt).toLocaleString(),
      Action: l.action,
      'Performed By': l.performedBy?.username || 'N/A',
      Role: l.performedBy?.role || 'N/A',
      Details: JSON.stringify(l.details || {})
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
    XLSX.writeFile(wb, 'audit-log.xlsx');
    toast.success('Audit Excel exported');
  };

  const exportTransactionExcel = () => {
    const data = transactions.map(t => ({
      Date: new Date(t.createdAt).toLocaleString(),
      Action: t.action,
      'Performed By': t.performedBy?.username || 'N/A',
      Details: JSON.stringify(t.details || {})
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, 'transaction-log.xlsx');
    toast.success('Transaction Excel exported');
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading logs...</div>;

  const current = tab === 'audit' ? logs : transactions;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📋 Audit & Logs</div>
          <div className="page-subtitle">Full activity history and transaction records</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={tab === 'audit' ? exportAuditPDF : exportTransactionPDF}>📄 Export PDF</button>
          <button className="btn btn-outline btn-sm" onClick={tab === 'audit' ? exportAuditExcel : exportTransactionExcel}>📊 Export Excel</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[{ id: 'audit', label: `📋 Audit Logs (${logs.length})` }, { id: 'transactions', label: `🔄 Transactions (${transactions.length})` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 500, fontSize: 13,
            background: tab === t.id ? '#2563eb' : '#fff',
            color: tab === t.id ? '#fff' : '#6b7280',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
          }}>{t.label}</button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date & Time</th><th>Action</th><th>Performed By</th><th>Details</th></tr>
            </thead>
            <tbody>
              {current.length === 0 ? (
                <tr><td colSpan={4}><div className="empty-state"><div className="icon">📭</div><p>No logs found</p></div></td></tr>
              ) : current.map(l => {
                const meta = ACTION_LABELS[l.action] || { label: l.action, color: 'badge-gray' };
                return (
                  <tr key={l._id}>
                    <td style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {new Date(l.createdAt).toLocaleDateString()}<br />
                      <span style={{ color: '#9ca3af' }}>{new Date(l.createdAt).toLocaleTimeString()}</span>
                    </td>
                    <td><span className={`badge ${meta.color}`}>{meta.label}</span></td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{l.performedBy?.username || 'N/A'}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase' }}>{l.performedBy?.role}</div>
                    </td>
                    <td style={{ fontSize: 12, color: '#6b7280', maxWidth: 300 }}>
                      {l.details && Object.keys(l.details).length > 0 && (
                        <div style={{ fontFamily: 'monospace', fontSize: 11, background: '#f8fafc', padding: '4px 8px', borderRadius: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                          {JSON.stringify(l.details)}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
