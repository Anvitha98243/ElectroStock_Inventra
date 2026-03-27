import React, { useEffect, useState, useCallback } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';

const TREND_CONFIG = {
  increasing: { icon: '📈', label: 'Increasing', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  decreasing:  { icon: '📉', label: 'Decreasing', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  stable:      { icon: '➡️',  label: 'Stable',     color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  'no-data':   { icon: '❓',  label: 'No Data',    color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb' },
};

const URGENCY = (days) => {
  if (days === null || days === undefined) return { label: 'Monitor', color: '#9ca3af', bg: '#f9fafb' };
  if (days === 0)   return { label: 'Reorder Now!', color: '#dc2626', bg: '#fef2f2' };
  if (days <= 3)    return { label: `${days}d — Urgent`, color: '#dc2626', bg: '#fef2f2' };
  if (days <= 7)    return { label: `${days}d — Soon`,   color: '#d97706', bg: '#fffbeb' };
  if (days <= 14)   return { label: `${days}d — Plan`,   color: '#2563eb', bg: '#eff6ff' };
  return            { label: `${days}d — OK`,            color: '#16a34a', bg: '#f0fdf4' };
};

function TrendBadge({ trend }) {
  const cfg = TREND_CONFIG[trend] || TREND_CONFIG['no-data'];
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
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
    </div>
  );
}

function PredictionCard({ p }) {
  const urgency = URGENCY(p.reorderDaysFromNow);
  const trendCfg = TREND_CONFIG[p.trend] || TREND_CONFIG['no-data'];
  const maxDemand = Math.max(p.demandLast30Days, p.demandPrev30Days, 1);

  return (
    <div style={{
      background: '#fff', borderRadius: 14,
      border: `1px solid ${p.reorderDaysFromNow <= 3 ? '#fca5a5' : '#e5e7eb'}`,
      padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
      boxShadow: p.reorderDaysFromNow <= 3 ? '0 0 0 2px #fee2e2' : '0 1px 3px rgba(0,0,0,0.06)'
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
          { label: 'Current Stock', value: p.currentStock, color: p.currentStock < p.minThreshold ? '#dc2626' : '#111827' },
          { label: 'Min Threshold', value: p.minThreshold, color: '#6b7280' },
          { label: 'Avg/Day', value: p.avgDailyConsumption, color: '#2563eb' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Demand bars: prev 30 vs last 30 */}
      {p.trend !== 'no-data' && (
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 8 }}>Demand comparison (stock-out units)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>
                <span>Prev 30 days</span><span>{p.demandPrev30Days} units</span>
              </div>
              <MiniBar value={p.demandPrev30Days} max={maxDemand} color="#94a3b8" />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>
                <span>Last 30 days</span><span>{p.demandLast30Days} units</span>
              </div>
              <MiniBar value={p.demandLast30Days} max={maxDemand} color={trendCfg.color} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: trendCfg.color, marginTop: 8, fontStyle: 'italic' }}>{p.trendDetail}</div>
        </div>
      )}

      {p.trend === 'no-data' && (
        <div style={{ fontSize: 13, color: '#9ca3af', background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
          {p.trendDetail}
        </div>
      )}

      {/* Reorder recommendation */}
      <div style={{ background: urgency.bg, borderRadius: 10, padding: '12px 14px', borderLeft: `3px solid ${urgency.color}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: urgency.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            🗓️ Reorder Recommendation
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: urgency.color, background: '#fff', padding: '2px 10px', borderRadius: 99, border: `1px solid ${urgency.color}30` }}>
            {urgency.label}
          </span>
        </div>
        <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{p.reorderNote}</div>
        {p.suggestedQty > 0 && (
          <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: '#374151' }}>
            Suggested order: <span style={{ color: urgency.color }}>{p.suggestedQty} units</span>
            <span style={{ fontWeight: 400, color: '#9ca3af' }}> · Est. ₹{(p.suggestedQty * p.price).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Predictions() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/predictions');
      setPredictions(res.data);
    } catch (err) {
      toast.error('Failed to load predictions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPredictions(); }, [fetchPredictions]);

  const filtered = predictions.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'urgent')     return p.reorderDaysFromNow !== null && p.reorderDaysFromNow <= 7;
    if (filter === 'increasing') return p.trend === 'increasing';
    if (filter === 'decreasing') return p.trend === 'decreasing';
    if (filter === 'stable')     return p.trend === 'stable';
    if (filter === 'no-data')    return p.trend === 'no-data';
    return true;
  });

  const counts = {
    all: predictions.length,
    urgent: predictions.filter(p => p.reorderDaysFromNow !== null && p.reorderDaysFromNow <= 7).length,
    increasing: predictions.filter(p => p.trend === 'increasing').length,
    decreasing: predictions.filter(p => p.trend === 'decreasing').length,
    stable: predictions.filter(p => p.trend === 'stable').length,
    'no-data': predictions.filter(p => p.trend === 'no-data').length,
  };

  const FILTER_TABS = [
    { key: 'all',        label: 'All',        color: '#2563eb' },
    { key: 'urgent',     label: '🚨 Urgent',  color: '#dc2626' },
    { key: 'increasing', label: '📈 Rising',  color: '#16a34a' },
    { key: 'stable',     label: '➡️ Stable',  color: '#2563eb' },
    { key: 'decreasing', label: '📉 Falling', color: '#dc2626' },
    { key: 'no-data',    label: '❓ No Data', color: '#9ca3af' },
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
          <div className="page-title">🔮 Future Predictions</div>
          <div className="page-subtitle">Demand trends and reorder dates based on stock-in / stock-out history</div>
        </div>
        <button className="btn btn-outline" onClick={fetchPredictions}>🔄 Refresh</button>
      </div>

      {predictions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '56px 24px' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🔮</div>
          <div style={{ fontWeight: 700, fontSize: 17, color: '#111827', marginBottom: 8 }}>No predictions yet</div>
          <div style={{ fontSize: 14, color: '#6b7280', maxWidth: 400, margin: '0 auto', lineHeight: 1.7 }}>
            Predictions are calculated from approved stock-in and stock-out requests. Add products and have staff submit requests — predictions will appear automatically once transactions are recorded.
          </div>
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Products Tracked', value: predictions.length, icon: '📦', color: '#2563eb' },
              { label: 'Reorder Urgent', value: counts.urgent, icon: '🚨', color: '#dc2626' },
              { label: 'Rising Demand', value: counts.increasing, icon: '📈', color: '#16a34a' },
              { label: 'Falling Demand', value: counts.decreasing, icon: '📉', color: '#dc2626' },
              { label: 'Stable Demand', value: counts.stable, icon: '➡️', color: '#2563eb' },
            ].map(m => (
              <div key={m.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: m.color, marginTop: 4 }}>{m.icon} {m.value}</div>
              </div>
            ))}
          </div>

          {/* Filters + search */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-box" style={{ minWidth: 200, flex: 1 }}>
              <span>🔍</span>
              <input placeholder="Search product name or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {FILTER_TABS.map(tab => (
                <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
                  padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontWeight: 500, fontSize: 12,
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
            <div className="card"><div className="empty-state"><div className="icon">🔍</div><p>No products match this filter.</p></div></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {filtered.map(p => <PredictionCard key={p.productId} p={p} />)}
            </div>
          )}

          <div style={{ marginTop: 20, padding: '12px 16px', background: '#f8fafc', borderRadius: 10, fontSize: 12, color: '#9ca3af', lineHeight: 1.7 }}>
            <strong style={{ color: '#6b7280' }}>How predictions work:</strong> Demand trend compares stock-out units in the last 30 days vs the previous 30 days. Reorder date is calculated using your average daily consumption rate and a 7-day lead time buffer. Based on approved transactions from the last 90 days.
          </div>
        </>
      )}
    </div>
  );
}
import React, { useEffect, useState, useCallback } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';

const TREND_CONFIG = {
  increasing: { icon: '📈', label: 'Increasing', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  decreasing:  { icon: '📉', label: 'Decreasing', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  stable:      { icon: '➡️',  label: 'Stable',     color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  'no-data':   { icon: '❓',  label: 'No Data',    color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb' },
};

const URGENCY = (days) => {
  if (days === null || days === undefined) return { label: 'Monitor', color: '#9ca3af', bg: '#f9fafb' };
  if (days === 0)   return { label: 'Reorder Now!', color: '#dc2626', bg: '#fef2f2' };
  if (days <= 3)    return { label: `${days}d — Urgent`, color: '#dc2626', bg: '#fef2f2' };
  if (days <= 7)    return { label: `${days}d — Soon`,   color: '#d97706', bg: '#fffbeb' };
  if (days <= 14)   return { label: `${days}d — Plan`,   color: '#2563eb', bg: '#eff6ff' };
  return            { label: `${days}d — OK`,            color: '#16a34a', bg: '#f0fdf4' };
};

function TrendBadge({ trend }) {
  const cfg = TREND_CONFIG[trend] || TREND_CONFIG['no-data'];
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
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
    </div>
  );
}

function PredictionCard({ p }) {
  const urgency = URGENCY(p.reorderDaysFromNow);
  const trendCfg = TREND_CONFIG[p.trend] || TREND_CONFIG['no-data'];
  const maxDemand = Math.max(p.demandLast30Days, p.demandPrev30Days, 1);

  return (
    <div style={{
      background: '#fff', borderRadius: 14,
      border: `1px solid ${p.reorderDaysFromNow <= 3 ? '#fca5a5' : '#e5e7eb'}`,
      padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
      boxShadow: p.reorderDaysFromNow <= 3 ? '0 0 0 2px #fee2e2' : '0 1px 3px rgba(0,0,0,0.06)'
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
          { label: 'Current Stock', value: p.currentStock, color: p.currentStock < p.minThreshold ? '#dc2626' : '#111827' },
          { label: 'Min Threshold', value: p.minThreshold, color: '#6b7280' },
          { label: 'Avg/Day', value: p.avgDailyConsumption, color: '#2563eb' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Demand bars: prev 30 vs last 30 */}
      {p.trend !== 'no-data' && (
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 8 }}>Demand comparison (stock-out units)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>
                <span>Prev 30 days</span><span>{p.demandPrev30Days} units</span>
              </div>
              <MiniBar value={p.demandPrev30Days} max={maxDemand} color="#94a3b8" />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>
                <span>Last 30 days</span><span>{p.demandLast30Days} units</span>
              </div>
              <MiniBar value={p.demandLast30Days} max={maxDemand} color={trendCfg.color} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: trendCfg.color, marginTop: 8, fontStyle: 'italic' }}>{p.trendDetail}</div>
        </div>
      )}

      {p.trend === 'no-data' && (
        <div style={{ fontSize: 13, color: '#9ca3af', background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
          {p.trendDetail}
        </div>
      )}

      {/* Reorder recommendation */}
      <div style={{ background: urgency.bg, borderRadius: 10, padding: '12px 14px', borderLeft: `3px solid ${urgency.color}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: urgency.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            🗓️ Reorder Recommendation
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: urgency.color, background: '#fff', padding: '2px 10px', borderRadius: 99, border: `1px solid ${urgency.color}30` }}>
            {urgency.label}
          </span>
        </div>
        <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{p.reorderNote}</div>
        {p.suggestedQty > 0 && (
          <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: '#374151' }}>
            Suggested order: <span style={{ color: urgency.color }}>{p.suggestedQty} units</span>
            <span style={{ fontWeight: 400, color: '#9ca3af' }}> · Est. ₹{(p.suggestedQty * p.price).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Predictions() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/predictions');
      setPredictions(res.data);
    } catch (err) {
      toast.error('Failed to load predictions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPredictions(); }, [fetchPredictions]);

  const filtered = predictions.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'urgent')     return p.reorderDaysFromNow !== null && p.reorderDaysFromNow <= 7;
    if (filter === 'increasing') return p.trend === 'increasing';
    if (filter === 'decreasing') return p.trend === 'decreasing';
    if (filter === 'stable')     return p.trend === 'stable';
    if (filter === 'no-data')    return p.trend === 'no-data';
    return true;
  });

  const counts = {
    all: predictions.length,
    urgent: predictions.filter(p => p.reorderDaysFromNow !== null && p.reorderDaysFromNow <= 7).length,
    increasing: predictions.filter(p => p.trend === 'increasing').length,
    decreasing: predictions.filter(p => p.trend === 'decreasing').length,
    stable: predictions.filter(p => p.trend === 'stable').length,
    'no-data': predictions.filter(p => p.trend === 'no-data').length,
  };

  const FILTER_TABS = [
    { key: 'all',        label: 'All',        color: '#2563eb' },
    { key: 'urgent',     label: '🚨 Urgent',  color: '#dc2626' },
    { key: 'increasing', label: '📈 Rising',  color: '#16a34a' },
    { key: 'stable',     label: '➡️ Stable',  color: '#2563eb' },
    { key: 'decreasing', label: '📉 Falling', color: '#dc2626' },
    { key: 'no-data',    label: '❓ No Data', color: '#9ca3af' },
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
          <div className="page-title">🔮 Future Predictions</div>
          <div className="page-subtitle">Demand trends and reorder dates based on stock-in / stock-out history</div>
        </div>
        <button className="btn btn-outline" onClick={fetchPredictions}>🔄 Refresh</button>
      </div>

      {predictions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '56px 24px' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🔮</div>
          <div style={{ fontWeight: 700, fontSize: 17, color: '#111827', marginBottom: 8 }}>No predictions yet</div>
          <div style={{ fontSize: 14, color: '#6b7280', maxWidth: 400, margin: '0 auto', lineHeight: 1.7 }}>
            Predictions are calculated from approved stock-in and stock-out requests. Add products and have staff submit requests — predictions will appear automatically once transactions are recorded.
          </div>
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Products Tracked', value: predictions.length, icon: '📦', color: '#2563eb' },
              { label: 'Reorder Urgent', value: counts.urgent, icon: '🚨', color: '#dc2626' },
              { label: 'Rising Demand', value: counts.increasing, icon: '📈', color: '#16a34a' },
              { label: 'Falling Demand', value: counts.decreasing, icon: '📉', color: '#dc2626' },
              { label: 'Stable Demand', value: counts.stable, icon: '➡️', color: '#2563eb' },
            ].map(m => (
              <div key={m.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: m.color, marginTop: 4 }}>{m.icon} {m.value}</div>
              </div>
            ))}
          </div>

          {/* Filters + search */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-box" style={{ minWidth: 200, flex: 1 }}>
              <span>🔍</span>
              <input placeholder="Search product name or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {FILTER_TABS.map(tab => (
                <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
                  padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontWeight: 500, fontSize: 12,
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
            <div className="card"><div className="empty-state"><div className="icon">🔍</div><p>No products match this filter.</p></div></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {filtered.map(p => <PredictionCard key={p.productId} p={p} />)}
            </div>
          )}

          <div style={{ marginTop: 20, padding: '12px 16px', background: '#f8fafc', borderRadius: 10, fontSize: 12, color: '#9ca3af', lineHeight: 1.7 }}>
            <strong style={{ color: '#6b7280' }}>How predictions work:</strong> Demand trend compares stock-out units in the last 30 days vs the previous 30 days. Reorder date is calculated using your average daily consumption rate and a 7-day lead time buffer. Based on approved transactions from the last 90 days.
          </div>
        </>
      )}
    </div>
  );
}
