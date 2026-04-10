import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [showPwForm, setShowPwForm] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        if (user.role === 'admin') {
          const [products, requests] = await Promise.all([
            API.get('/products'),
            API.get('/requests/admin')
          ]);
          setStats({
            products: products.data.length,
            totalRequests: requests.data.length,
            pendingRequests: requests.data.filter(r => r.status === 'pending').length,
            approvedRequests: requests.data.filter(r => r.status === 'approved').length,
          });
        } else {
          const requests = await API.get('/requests/my');
          setStats({
            totalRequests: requests.data.length,
            pendingRequests: requests.data.filter(r => r.status === 'pending').length,
            approvedRequests: requests.data.filter(r => r.status === 'approved').length,
            rejectedRequests: requests.data.filter(r => r.status === 'rejected').length,
          });
        }
      } catch { /* stats are optional */ }
    };
    loadStats();
  }, [user]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      setPwError('All fields are required'); return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match'); return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('New password must be at least 6 characters'); return;
    }
    if (pwForm.currentPassword === pwForm.newPassword) {
      setPwError('New password must differ from current password'); return;
    }
    setPwLoading(true);
    try {
      await API.put('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword
      });
      toast.success('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPwForm(false);
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  const roleColor = user?.role === 'admin' ? '#1d4ed8' : '#0f766e';
  const roleBg   = user?.role === 'admin' ? '#eff6ff' : '#f0fdfa';
  const initials = user?.username?.slice(0, 2).toUpperCase() || '??';

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title">👤 My Profile</div>
          <div className="page-subtitle">Account details and security settings</div>
        </div>
      </div>

      {/* Profile card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: `linear-gradient(135deg, ${roleColor}, ${roleColor}cc)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 26, fontWeight: 700, flexShrink: 0
          }}>{initials}</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{user?.username}</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>{user?.email}</div>
            <span style={{
              display: 'inline-block', marginTop: 8,
              padding: '3px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
              background: roleBg, color: roleColor, textTransform: 'uppercase', letterSpacing: '0.06em'
            }}>
              {user?.role === 'admin' ? '🛡️ Admin' : '👤 Staff'}
            </span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>Account Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Username', value: user?.username, icon: '👤' },
              { label: 'Email Address', value: user?.email, icon: '📧' },
              { label: 'Role', value: user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1), icon: '🛡️' },
             { label: 'User ID', value: user?.id, icon: '🔑', mono: true },
{ label: 'Phone (WhatsApp)', value: user?.phone || 'Not set — add in settings', icon: '📱' },
            ].map(({ label, value, icon, mono }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>{label}</div>
                  <div style={{ fontSize: 14, color: '#374151', fontFamily: mono ? 'monospace' : 'inherit', marginTop: 2 }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>Account Stats</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
            {user.role === 'admin' && stats.products !== undefined && (
              <div style={{ background: '#eff6ff', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#2563eb' }}>{stats.products}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Products</div>
              </div>
            )}
            <div style={{ background: '#f5f3ff', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#7c3aed' }}>{stats.totalRequests}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Total Requests</div>
            </div>
            <div style={{ background: '#fffbeb', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#d97706' }}>{stats.pendingRequests}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Pending</div>
            </div>
            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>{stats.approvedRequests}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Approved</div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showPwForm ? 20 : 0 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>🔒 Change Password</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Update your account password</div>
          </div>
          <button
            className={`btn ${showPwForm ? 'btn-outline' : 'btn-primary'}`}
            onClick={() => { setShowPwForm(v => !v); setPwError(''); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
          >
            {showPwForm ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {showPwForm && (
          <form onSubmit={handleChangePassword}>
            {pwError && <div className="alert alert-danger">{pwError}</div>}
            <div className="form-group">
              <label>Current Password</label>
              <input className="form-control" type="password" placeholder="Enter current password"
                value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input className="form-control" type="password" placeholder="Min 6 characters"
                value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input className="form-control" type="password" placeholder="Repeat new password"
                value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} />
            </div>

            {/* Password strength indicator */}
            {pwForm.newPassword && (
              <div style={{ marginBottom: 16 }}>
                {(() => {
                  const len = pwForm.newPassword.length;
                  const hasUpper = /[A-Z]/.test(pwForm.newPassword);
                  const hasNum = /\d/.test(pwForm.newPassword);
                  const strength = len >= 10 && hasUpper && hasNum ? 3 : len >= 8 ? 2 : len >= 6 ? 1 : 0;
                  const labels = ['Too short', 'Weak', 'Fair', 'Strong'];
                  const colors = ['#dc2626', '#d97706', '#2563eb', '#16a34a'];
                  return (
                    <div>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        {[0,1,2,3].map(i => (
                          <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= strength ? colors[strength] : '#e5e7eb', transition: 'background 0.2s' }} />
                        ))}
                      </div>
                      <div style={{ fontSize: 12, color: colors[strength] }}>{labels[strength]}</div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowPwForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={pwLoading}>
                {pwLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
