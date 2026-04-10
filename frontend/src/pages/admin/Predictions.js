import React, { useEffect, useState, useCallback } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';

const TREND_CONFIG = {
  rising:  { icon: '📈', label: 'Rising',  color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  falling: { icon: '📉', label: 'Falling', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
};

const URGENCY = (days) => {
  if (days === null || days === undefined) return { label: 'Monitor', color: '#9ca3af', bg: '#f9fafb' };
  if (days === 0)  return { label: 'Reorder Now!',       color: '#dc2626', bg: '#fef2f2' };
  if (days <= 3)   return { label: `${days}d — Urgent`,  color: '#dc2626', bg: '#fef2f2' };
  if (days <= 7)   return { label: `${days}d — Soon`,    color: '#d97706', bg: '#fffbeb' };
  if (days <= 14)  return { label: `${days}d — Plan`,    color: '#2563eb', bg: '#eff6ff' };
  return             { label: `${days}d — OK`,           color: '#16a34a', bg: '#f0fdf4' };
};

function TrendBadge({ trend }) {
  const cfg = TREND_CONFIG[trend] || TREND_CONFIG['falling'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${pct}%`,
        background: color, borderRadius: 99,
        transition: 'width 0.6s ease'
      }} />
    </div>
  );
}

function PredictionCard({ p }) {
  const urgency = URGENCY(p.reorderDaysFromNow);
  const trendCfg = TREND_CONFIG[p.trend] || TREND_CONFIG['falling'];
  const maxDemand = Math.max(p.demandOldest30Days || 0, p.demandPrev30Days, p.demandLast30Days, 1);

  return (
    <div style={{
      background: '#fff', borderRadius: 14,
      border: `1px solid ${p.reorderDaysFromNow !== null && p.reorderDaysFromNow <= 3 ? '#fca5a5' : '#e5e7eb'}`,
      padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
      boxShadow: p.reorderDaysFromNow !== null && p.reorderDaysFromNow <= 3
        ? '0 0 0 2px #fee2e2' : '0 1px 3px rgba(0,0,0,0.06)'
    }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{p.name}</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{p.sku} · {p.category}</div>
        </div>
        <TrendBadge trend={p.trend} />
      </div>

      {/* Stock snapshot */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'Current Stock', value: p.currentStock,
            color: p.currentStock < p.minThreshold ? '#dc2626' : '#111827' },
          { label: 'Min Threshold', value: p.minThreshold, color: '#6b7280' },
          { label: 'Avg/Day',       value: p.avgDailyConsumption, color: '#2563eb' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: '#f8fafc', borderRadius: 8,
            padding: '8px 10px', textAlign: 'center'
          }}>
            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500,
              textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* 3-period demand bars */}
      <div>
        <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 8 }}>
          Demand trend — stock-out units (90 day window)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { label: '61–90 days ago', value: p.demandOldest30Days || 0, color: '#cbd5e1' },
            { label: '31–60 days ago', value: p.demandPrev30Days,        color: '#94a3b8' },
            { label: 'Last 30 days',   value: p.demandLast30Days,        color: trendCfg.color },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>
                <span>{label}</span><span>{value} units</span>
              </div>
              <MiniBar value={value} max={maxDemand} color={color} />
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: trendCfg.color, marginTop: 8, fontStyle: 'italic' }}>
          {p.trendDetail}
        </div>
      </div>

      {/* Reorder recommendation */}
      <div style={{
        background: urgency.bg, borderRadius: 10,
        padding: '12px 14px', borderLeft: `3px solid ${urgency.color}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: urgency.color,
            textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            🗓️ Reorder Recommendation
          </div>
          <span style={{
            fontSize: 12, fontWeight: 700, color: urgency.color,
            background: '#fff', padding: '2px 10px', borderRadius: 99,
            border: `1px solid ${urgency.color}30`
          }}>
            {urgency.label}
          </span>
        </div>
        <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{p.reorderNote}</div>
        {p.suggestedQty > 0 && (
          <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: '#374151' }}>
            Suggested order:{' '}
            <span style={{ color: urgency.color }}>{p.suggestedQty} units</span>
            <span style={{ fontWeight: 400, color: '#9ca3af' }}>
              {' '}· Est. ₹{(p.suggestedQty * p.price).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Predictions() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('all');
  const [search, setSearch]           = useState('');

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/predictions');
      setPredictions(res.data);
    } catch {
      toast.error('Failed to load predictions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPredictions(); }, [fetchPredictions]);

  const counts = {
    all:     predictions.length,
    urgent:  predictions.filter(p => p.reorderDaysFromNow !== null && p.reorderDaysFromNow <= 7).length,
    rising:  predictions.filter(p => p.trend === 'rising').length,
    falling: predictions.filter(p => p.trend === 'falling').length,
  };

  const filtered = predictions.filter(p => {
    const matchSearch = !search
      || p.name.toLowerCase().includes(search.toLowerCase())
      || p.sku.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'urgent')  return p.reorderDaysFromNow !== null && p.reorderDaysFromNow <= 7;
    if (filter === 'rising')  return p.trend === 'rising';
    if (filter === 'falling') return p.trend === 'falling';
    return true;
  });

  const FILTER_TABS = [
    { key: 'all',     label: 'All',        color: '#2563eb' },
    { key: 'urgent',  label: '🚨 Urgent',  color: '#dc2626' },
    { key: 'rising',  label: '📈 Rising',  color: '#16a34a' },
    { key: 'falling', label: '📉 Falling', color: '#dc2626' },
  ];

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🔮</div>
      <div>Analysing transaction history...</div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🔮 Demand Predictions</div>
          <div className="page-subtitle">
            Rising &amp; falling demand trends with reorder recommendations
          </div>
        </div>
        <button className="btn btn-outline" onClick={fetchPredictions}>🔄 Refresh</button>
      </div>

      {predictions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '56px 24px' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🔮</div>
          <div style={{ fontWeight: 700, fontSize: 17, color: '#111827', marginBottom: 8 }}>
            No predictions yet
          </div>
          <div style={{ fontSize: 14, color: '#6b7280', maxWidth: 400,
            margin: '0 auto', lineHeight: 1.7 }}>
            Predictions are generated from approved stock-in and stock-out requests.
            Add products and have staff submit requests — predictions will appear automatically.
          </div>
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div style={{ display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Products Tracked', value: predictions.length, icon: '📦', color: '#2563eb' },
              { label: 'Reorder Urgent',   value: counts.urgent,      icon: '🚨', color: '#dc2626' },
              { label: 'Rising Demand',    value: counts.rising,      icon: '📈', color: '#16a34a' },
              { label: 'Falling Demand',   value: counts.falling,     icon: '📉', color: '#dc2626' },
            ].map(m => (
              <div key={m.label} style={{ background: '#fff', borderRadius: 12,
                padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500,
                  textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: m.color, marginTop: 4 }}>
                  {m.icon} {m.value}
                </div>
              </div>
            ))}
          </div>

          {/* Filters + search */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20,
            flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-box" style={{ minWidth: 200, flex: 1 }}>
              <span>🔍</span>
              <input
                placeholder="Search product name or SKU..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {FILTER_TABS.map(tab => (
                <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
                  padding: '7px 14px', borderRadius: 8, border: 'none',
                  cursor: 'pointer', fontWeight: 500, fontSize: 12,
                  background: filter === tab.key ? tab.color : '#fff',
                  color: filter === tab.key ? '#fff' : '#6b7280',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'all 0.15s'
                }}>
                  {tab.label} ({counts[tab.key]})
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="icon">🔍</div>
                <p>No products match this filter.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {filtered.map(p => <PredictionCard key={p.productId} p={p} />)}
            </div>
          )}

          <div style={{ marginTop: 20, padding: '12px 16px', background: '#f8fafc',
            borderRadius: 10, fontSize: 12, color: '#9ca3af', lineHeight: 1.7 }}>
            <strong style={{ color: '#6b7280' }}>How predictions work: </strong>
            Every product is classified as <strong>Rising</strong> or <strong>Falling</strong> using
            a weighted 3-period analysis (0–30, 31–60, 61–90 days). Recent periods carry more weight.
            Reorder dates use a 7-day lead-time buffer applied to your weighted average daily consumption.
            Based on all approved transactions from the last 90 days.
          </div>
        </>
      )}
    </div>
  );
}