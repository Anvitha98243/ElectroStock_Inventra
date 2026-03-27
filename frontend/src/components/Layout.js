import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/products', label: 'Products', icon: '📦' },
  { to: '/admin/requests', label: 'Stock Requests', icon: '🔄' },
  { to: '/admin/logs', label: 'Audit & Logs', icon: '📋' },
  { to: '/admin/predictions', label: 'Predictions', icon: '🔮' },
];

const staffNav = [
  { to: '/staff', label: 'Dashboard', icon: '📊', end: true },
  { to: '/staff/products', label: 'Browse Products', icon: '🔍' },
  { to: '/staff/requests', label: 'My Requests', icon: '📤' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const nav = user?.role === 'admin' ? adminNav : staffNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f4f8' }}>
      <aside style={{
        width: sidebarOpen ? 240 : 64,
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>⚡</span>
          {sidebarOpen && (
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>ElectroStock</div>
              <div style={{ color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>Inventory System</div>
            </div>
          )}
        </div>

        {sidebarOpen && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b' }}>
            <div style={{ background: user?.role === 'admin' ? '#1d4ed8' : '#0f766e', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ color: '#93c5fd', fontSize: 11, fontWeight: 500 }}>{user?.role === 'admin' ? '🛡️ ADMIN' : '👤 STAFF'}</div>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username}</div>
            </div>
          </div>
        )}

        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {nav.map(({ to, label, icon, end }) => (
            <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 16px', margin: '2px 8px', borderRadius: 8,
              textDecoration: 'none', color: isActive ? '#fff' : '#94a3b8',
              background: isActive ? '#1e40af' : 'transparent',
              fontWeight: isActive ? 600 : 400, fontSize: 14,
              transition: 'all 0.15s', whiteSpace: 'nowrap', overflow: 'hidden'
            })}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
              {sidebarOpen && label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '12px 8px', borderTop: '1px solid #1e293b' }}>
          <button onClick={() => setSidebarOpen(o => !o)} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            width: '100%', padding: '8px 8px', borderRadius: 8,
            background: 'transparent', border: 'none', color: '#64748b',
            cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden'
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{sidebarOpen ? '◀' : '▶'}</span>
            {sidebarOpen && 'Collapse'}
          </button>
          <NavLink
            to={user?.role === 'admin' ? '/admin/profile' : '/staff/profile'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', padding: '8px 8px', borderRadius: 8,
              background: isActive ? '#1e293b' : 'transparent',
              border: 'none', color: '#94a3b8',
              cursor: 'pointer', fontSize: 14, marginTop: 4,
              whiteSpace: 'nowrap', overflow: 'hidden', textDecoration: 'none'
            })}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>👤</span>
            {sidebarOpen && 'My Profile'}
          </NavLink>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            width: '100%', padding: '8px 8px', borderRadius: 8,
            background: 'transparent', border: 'none', color: '#f87171',
            cursor: 'pointer', fontSize: 14, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden'
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>🚪</span>
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto', padding: 28 }}>
        <Outlet />
      </main>
    </div>
  );
}
