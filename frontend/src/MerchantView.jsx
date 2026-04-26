import React, { useState, useEffect } from 'react';
import { getAllMerchants } from './api';

export default function MerchantView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMerchantId, setSelectedMerchantId] = useState(null);

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

  if (loading || !data) return <div className="loading">Loading dashboard...</div>;

  const merchant = data.merchants.find(m => m.id === selectedMerchantId);
  const stats = data.stats.find(s => s.merchantId === selectedMerchantId)?.summary || {
    totalOffersGenerated: 0, acceptanceRate: 0, redemptionRate: 0, totalDismissed: 0
  };
  const recentOffers = data.stats.find(s => s.merchantId === selectedMerchantId)?.recentOffers || [];

  return (
    <div>
      <div className="merchant-header">
        <h2>Merchant Dashboard</h2>
        <p>Live generative offer performance & configuration.</p>
      </div>

      <div className="merchant-select-bar">
        {data.merchants.map(m => (
          <button
            key={m.id}
            className={`merchant-pill ${m.id === selectedMerchantId ? 'active' : ''}`}
            onClick={() => setSelectedMerchantId(m.id)}
          >
            {m.logo} {m.name}
          </button>
        ))}
      </div>

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
        <h3 className="feed-title">Live Offer Feed</h3>
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
          <h3 className="feed-title">Active AI Rules (Read-only)</h3>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
            The AI Generative Engine is using these constraints to build offers on the fly.
          </p>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '12px', color: '#69f0ae', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify({ goals: merchant.goals, constraints: merchant.constraints }, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
}
