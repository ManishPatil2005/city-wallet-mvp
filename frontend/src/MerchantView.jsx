import React, { useState, useEffect } from 'react';
import { getAllMerchants, updateMerchantRules } from './api';

export default function MerchantView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMerchantId, setSelectedMerchantId] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await getAllMerchants();
      setData(res);
      if (res.merchants?.length > 0 && !selectedMerchantId) {
        setSelectedMerchantId(res.merchants[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleActive = async (merchant) => {
    setUpdating(true);
    try {
      await updateMerchantRules(merchant.id, { active: !merchant.active });
      await fetchStats();
    } catch (e) {
      alert('Failed to update merchant rules');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateMaxDiscount = async (merchant, delta) => {
    const currentMax = merchant.constraints?.maxDiscountPercent || 20;
    const newMax = Math.min(35, Math.max(merchant.constraints?.minDiscountPercent || 5, currentMax + delta));
    setUpdating(true);
    try {
      await updateMerchantRules(merchant.id, {
        constraints: { ...merchant.constraints, maxDiscountPercent: newMax },
      });
      await fetchStats();
    } catch (e) {
      alert('Failed to update discount');
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !data) return <div className="loading">Loading dashboard...</div>;

  const merchant = data.merchants.find(m => m.id === selectedMerchantId);
  const stats = data.stats.find(s => s.merchantId === selectedMerchantId)?.summary || {
    totalOffersGenerated: 0, acceptanceRate: 0, redemptionRate: 0, totalDismissed: 0
  };
  const recentOffers = data.stats.find(s => s.merchantId === selectedMerchantId)?.recentOffers || [];

  return (
    <div>
      <div className="merchant-header">
        <h2>Merchant Operations & Analytics</h2>
        <p>Live demand steering, active AI rule enforcement, and transaction telemetry.</p>
      </div>

      <div className="merchant-select-bar">
        {data.merchants.map(m => (
          <button
            key={m.id}
            className={`merchant-pill ${m.id === selectedMerchantId ? 'active' : ''}`}
            onClick={() => setSelectedMerchantId(m.id)}
          >
            {m.logo} {m.name} {!m.active && '(Paused)'}
          </button>
        ))}
      </div>

      {merchant && (
        <div className="merchant-control-card">
          <div className="merchant-control-header">
            <div>
              <h3>{merchant.logo} {merchant.name}</h3>
              <p className="merchant-control-sub">
                Status: <span className={merchant.active ? 'status-active' : 'status-paused'}>
                  {merchant.active ? '● Active Demand Generation' : '○ Paused (Suppressed)'}
                </span>
                {' · '}📍 Distance: <strong>{merchant.constraints?.distance || '0.2 km'}</strong>
              </p>
            </div>
            <button
              className={`toggle-campaign-btn ${merchant.active ? 'btn-pause' : 'btn-resume'}`}
              onClick={() => handleToggleActive(merchant)}
              disabled={updating}
            >
              {merchant.active ? 'Pause Campaign' : 'Resume Campaign'}
            </button>
          </div>

          <div className="merchant-param-row">
            <div className="param-item">
              <span className="param-label">Max Discount Cap:</span>
              <span className="param-val">{merchant.constraints?.maxDiscountPercent}%</span>
              <div className="param-btns">
                <button onClick={() => handleUpdateMaxDiscount(merchant, -2)} disabled={updating}>-2%</button>
                <button onClick={() => handleUpdateMaxDiscount(merchant, +2)} disabled={updating}>+2%</button>
              </div>
            </div>
            <div className="param-item">
              <span className="param-label">Active Operating Hours:</span>
              <span className="param-val">{merchant.constraints?.activeHoursStart} - {merchant.constraints?.activeHoursEnd}</span>
            </div>
            <div className="param-item">
              <span className="param-label">Target Archetypes:</span>
              <span className="param-val">{merchant.goals?.slice(0, 2).join(', ')}</span>
            </div>
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Offers Generated</div>
          <div className="stat-value">{stats.totalOffersGenerated}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Acceptance Rate</div>
          <div className="stat-value">{stats.acceptanceRate}%</div>
          <div className="stat-sub">{stats.totalAccepted} total</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Redemption Rate</div>
          <div className="stat-value">{stats.redemptionRate}%</div>
          <div className="stat-sub">{stats.totalRedeemed} total</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Dismissed</div>
          <div className="stat-value">{stats.totalDismissed}</div>
        </div>
      </div>

      <div className="feed-section">
        <h3 className="feed-title">Real-Time Payone Telemetry Feed</h3>
        {recentOffers.length === 0 ? (
          <div className="loading">No offers generated yet. Switch to Consumer tab to trigger some!</div>
        ) : (
          recentOffers.map(offer => (
            <div key={offer.offerId} className="feed-item">
              <div className="feed-item-top">
                <span className="feed-discount">{offer.discount}% OFF</span>
                <span className={`feed-status ${offer.status}`}>{offer.status}</span>
              </div>
              <div className="feed-headline">{offer.headline}</div>
              <div className="feed-meta">
                <span style={{ textTransform: 'capitalize' }}>{offer.compositeState.replace(/_/g, ' ')}</span>
                <span>{new Date(offer.generatedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {merchant && (
        <div className="feed-section" style={{ marginTop: '24px' }}>
          <h3 className="feed-title">Deterministic Engine Constraints</h3>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
            The offline generation engine synthesizes copy, discount boundaries, and visual themes strictly within these boundaries without LLM hallucinations.
          </p>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '12px', color: '#69f0ae', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify({ active: merchant.active, goals: merchant.goals, constraints: merchant.constraints }, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
}
