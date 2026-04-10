import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

const adminNav = [
  { to: '/admin',             label: 'Dashboard',      icon: '📊', end: true },
  { to: '/admin/products',    label: 'Products',        icon: '📦' },
  { to: '/admin/requests',    label: 'Stock Requests',  icon: '🔄' },
  { to: '/admin/logs',        label: 'Audit & Logs',    icon: '📋' },
  { to: '/admin/predictions', label: 'Predictions',     icon: '🔮' },
];

const staffNav = [
  { to: '/staff',           label: 'Dashboard',       icon: '📊', end: true },
  { to: '/staff/products',  label: 'Browse Products', icon: '🔍' },
  { to: '/staff/requests',  label: 'My Requests',     icon: '📤' },
];

// ── type → icon + color ───────────────────────────────────────────────────────
const NOTIF_META = {
  stock_request:    { icon: '🔄', color: '#2563eb', bg: '#eff6ff' },
  request_approved: { icon: '✅', color: '#16a34a', bg: '#f0fdf4' },
  request_rejected: { icon: '❌', color: '#dc2626', bg: '#fef2f2' },
  low_stock:        { icon: '🚨', color: '#d97706', bg: '#fffbeb' },
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400)return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

export default function Layout() {
  const { user, logout }            = useAuth();
  const navigate                    = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const nav                         = user?.role === 'admin' ? adminNav : staffNav;

  // ── notification state ────────────────────────────────────────────────────
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [notifs,      setNotifs]      = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef                      = useRef(null);

  // fetch unread count every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target))
        setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await API.get('/notifications/unread-count');
      setUnreadCount(res.data.unreadCount);
    } catch { /* silent */ }
  };

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      setNotifs(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch { /* silent */ }
  };

  const handleBellClick = () => {
    if (!notifOpen) fetchNotifications();
    setNotifOpen(o => !o);
  };

  const markAllRead = async () => {
    try {
      await API.put('/notifications/mark-all-read');
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f4f8' }}>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside style={{
        width: sidebarOpen ? 240 : 64,
        background: '#0f172a',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s ease',
        flexShrink: 0,
        position: 'sticky', top: 0,
        height: '100vh', overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px 16px', borderBottom: '1px solid #1e293b',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>⚡</span>
          {sidebarOpen && (
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>
                ElectroStock
              </div>
              <div style={{ color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>
                Inventory System
              </div>
            </div>
          )}
        </div>

        {sidebarOpen && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b' }}>
            <div style={{
              background: user?.role === 'admin' ? '#1d4ed8' : '#0f766e',
              borderRadius: 8, padding: '8px 12px'
            }}>
              <div style={{ color: '#93c5fd', fontSize: 11, fontWeight: 500 }}>
                {user?.role === 'admin' ? '🛡️ ADMIN' : '👤 STAFF'}
              </div>
              <div style={{
                color: '#fff', fontSize: 13, fontWeight: 600, marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {user?.username}
              </div>
            </div>
          </div>
        )}

        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {nav.map(({ to, label, icon, end }) => (
            <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 16px', margin: '2px 8px', borderRadius: 8,
              textDecoration: 'none',
              color:      isActive ? '#fff' : '#94a3b8',
              background: isActive ? '#1e40af' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              fontSize: 14, transition: 'all 0.15s',
              whiteSpace: 'nowrap', overflow: 'hidden'
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
          <NavLink to={user?.role === 'admin' ? '/admin/profile' : '/staff/profile'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', padding: '8px 8px', borderRadius: 8,
              background: isActive ? '#1e293b' : 'transparent',
              border: 'none', color: '#94a3b8', cursor: 'pointer',
              fontSize: 14, marginTop: 4,
              whiteSpace: 'nowrap', overflow: 'hidden', textDecoration: 'none'
            })}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>👤</span>
            {sidebarOpen && 'My Profile'}
          </NavLink>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            width: '100%', padding: '8px 8px', borderRadius: 8,
            background: 'transparent', border: 'none', color: '#f87171',
            cursor: 'pointer', fontSize: 14, marginTop: 4,
            whiteSpace: 'nowrap', overflow: 'hidden'
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>🚪</span>
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>

        {/* ── Top bar with notification bell ──────────────────────────────── */}
        <header style={{
          background: '#fff', borderBottom: '1px solid #e5e7eb',
          padding: '12px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          position: 'sticky', top: 0, zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          {/* Bell button */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button onClick={handleBellClick} style={{
              position: 'relative',
              background: notifOpen ? '#f0f4f8' : 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: 10, cursor: 'pointer',
              width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, transition: 'all 0.15s'
            }}>
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: '#dc2626', color: '#fff',
                  borderRadius: '50%', fontSize: 10, fontWeight: 700,
                  minWidth: 18, height: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px', border: '2px solid #fff'
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* ── Notification dropdown ──────────────────────────────────── */}
            {notifOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 48,
                width: 360, maxHeight: 480,
                background: '#fff', borderRadius: 14,
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                border: '1px solid #e5e7eb',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden', zIndex: 999
              }}>
                {/* header */}
                <div style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
                      Notifications
                    </div>
                    {unreadCount > 0 && (
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>
                        {unreadCount} unread
                      </div>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} style={{
                      background: 'none', border: 'none',
                      color: '#2563eb', cursor: 'pointer',
                      fontSize: 12, fontWeight: 500
                    }}>
                      Mark all read
                    </button>
                  )}
                </div>

                {/* list */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {notifs.length === 0 ? (
                    <div style={{
                      textAlign: 'center', padding: '40px 20px',
                      color: '#9ca3af'
                    }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>🔔</div>
                      <div style={{ fontSize: 14 }}>No notifications yet</div>
                    </div>
                  ) : notifs.map(n => {
                    const meta = NOTIF_META[n.type] || NOTIF_META.stock_request;
                    return (
                      <div key={n.id} style={{
                        padding: '12px 18px',
                        borderBottom: '1px solid #f9fafb',
                        background: n.read ? '#fff' : '#fafbff',
                        display: 'flex', gap: 12, alignItems: 'flex-start'
                      }}>
                        {/* icon */}
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: meta.bg, flexShrink: 0,
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 16
                        }}>
                          {meta.icon}
                        </div>
                        {/* content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: n.read ? 500 : 700,
                            fontSize: 13, color: '#111827',
                            marginBottom: 2
                          }}>
                            {n.title}
                          </div>
                          <div style={{
                            fontSize: 12, color: '#6b7280',
                            lineHeight: 1.5,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {n.message}
                          </div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                            {timeAgo(n.createdAt)}
                          </div>
                        </div>
                        {/* unread dot */}
                        {!n.read && (
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: '#2563eb', flexShrink: 0, marginTop: 4
                          }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ── Page content ────────────────────────────────────────────────── */}
        <main style={{ flex: 1, padding: 28 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}