import React, { useState, useEffect } from 'react';
import { generateOffers, acceptOffer, dismissOffer, prepareRedemption, simulateRedeem } from './api';

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const SCENARIOS = [
  { id: 'canonical_cold_lunch', label: '❄️ Canonical: Cold Lunch (Guaranteed)', badge: 'Judge Scenario 1' },
  { id: 'rainy_afternoon',      label: '🌧️ Rainy Afternoon',                 badge: 'Context Trigger 2' },
  { id: 'quiet_evening',        label: '🌆 Quiet Evening Social',             badge: 'Context Trigger 3' },
  { id: 'dead_hour_night',      label: '⛔ Night Dead Hour (0 Offers)',       badge: 'Deterministic Guard' },
  { id: 'live',                 label: '⏱️ Live Host Clock',                  badge: 'Real-time' },
];

export default function ConsumerView({ city }) {
  const [scenario, setScenario] = useState('canonical_cold_lunch');
  const [context, setContext] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeOffer, setActiveOffer] = useState(null);
  const [redemption, setRedemption] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [simulating, setSimulating] = useState(false);
  const [validated, setValidated] = useState(null);

  const fetchOffers = async (selectedScenario = scenario) => {
    setLoading(true);
    setError(null);
    try {
      const data = await generateOffers(city, 'city-center', selectedScenario);
      setContext(data.context);
      setOffers(data.offers || []);
    } catch (e) {
      setError('Cannot reach backend API. Is it running on port 3001?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers(scenario);
  }, [city, scenario]);

  // Countdown timer for expanded offer & redemption
  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const openOffer = (offer) => {
    setActiveOffer(offer);
    setTimeLeft(offer.expiresInMinutes * 60);
  };

  const closeOffer = async () => {
    if (activeOffer) {
      try { await dismissOffer(activeOffer.id, activeOffer.merchantId); } catch(e){}
    }
    setActiveOffer(null);
    fetchOffers(); // Refresh feed
  };

  const claimOffer = async () => {
    try {
      await acceptOffer(activeOffer.id, activeOffer.merchantId);
      const res = await prepareRedemption(activeOffer);
      setRedemption(res);
      setTimeLeft(res.expiresInMinutes * 60);
      setActiveOffer(null);
    } catch (e) {
      alert('Failed to claim offer. Is backend running?');
    }
  };

  const handleSimulateScan = async () => {
    setSimulating(true);
    try {
      const res = await simulateRedeem(redemption.token);
      setValidated(res);
    } catch (e) {
      alert('Simulation failed.');
    } finally {
      setSimulating(false);
    }
  };

  const timeLabel = {
    early_morning: 'Early Morning', morning: 'Morning', lunch: 'Lunchtime',
    afternoon: 'Afternoon', evening: 'Evening', night: 'Late Night',
  };

  if (redemption) {
    if (validated) {
      return (
        <div className="redemption-overlay">
          <div className="redemption-card">
            <div className="success-circle">✓</div>
            <h2 className="success-title">Offer Redeemed!</h2>
            <p className="success-msg">{validated.message}</p>

            <div className="receipt">
              <div className="receipt-row">
                <span className="receipt-label">Merchant</span>
                <span className="receipt-val">{validated.merchantName}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">Discount</span>
                <span className="receipt-val">{validated.discount}% OFF</span>
              </div>
              <div className="receipt-row" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                <span className="receipt-label">Ref Code</span>
                <span className="receipt-val">{validated.confirmationCode}</span>
              </div>
            </div>

            <button className="done-btn" onClick={() => { setRedemption(null); setValidated(null); fetchOffers(); }}>
              Done
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="redemption-overlay">
        <div className="redemption-card">
          <h2 className="redemption-merchant">{redemption.merchantName}</h2>
          <div className="redemption-badge">{redemption.discount}% OFF</div>

          <div className="redemption-token-box">
            <div className="redemption-token-label">Redemption Token</div>
            <div className="redemption-token">{redemption.token.substring(0, 40)}...</div>
          </div>

          <div className="redemption-timer">
            Offer valid for
            <strong>{formatTime(timeLeft)}</strong>
          </div>

          <button className="scan-btn" onClick={handleSimulateScan} disabled={simulating || timeLeft === 0}>
            {simulating ? 'Scanning...' : 'Demo: Simulate Merchant Scan'}
          </button>
          
          <div className="powered-by">Powered by <strong>PAYONE</strong></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Deterministic Judge Scenario Selector */}
      <div className="scenario-bar">
        <div className="scenario-label">🎯 Judge Context Scenario:</div>
        <div className="scenario-pills">
          {SCENARIOS.map(s => (
            <button
              key={s.id}
              className={`scenario-pill ${scenario === s.id ? 'active' : ''}`}
              onClick={() => setScenario(s.id)}
            >
              <span>{s.label}</span>
              <span className="scenario-sub-badge">{s.badge}</span>
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="loading">Sensing city context...</div>}
      
      {error && !loading && (
        <div className="error-card">
          <p>⚠️ {error}</p>
          <button className="retry-btn" onClick={() => fetchOffers(scenario)}>Retry</button>
        </div>
      )}

      {context && !loading && !error && (
        <div className="context-panel">
          <div className="context-header">
            <span className="context-title">📍 {context.cityName} · {timeLabel[context.timePeriod] || context.timePeriod}</span>
            <span className="context-time">{scenario === 'live' ? 'Live Clock' : 'Preset Deterministic'}</span>
          </div>
          <div className="signal-row">
            {context.signals?.map((sig, i) => (
              <div key={i} className={`signal-pill ${sig.type}`}>
                <span className="icon">{sig.icon}</span>
                <span>{sig.label}</span>
              </div>
            ))}
          </div>
          {context.primaryState && (
            <div className="state-tag">Composite Context: {context.primaryState.replace(/_/g, ' ')}</div>
          )}
        </div>
      )}

      {!loading && !error && offers.length === 0 && context && (
        <div className="empty-state">
          <div className="icon">🌃</div>
          {context.hour >= 2 && context.hour <= 5 ? (
            <>
              <h3>Night Mode Active (02:00 - 05:00)</h3>
              <p>Deterministic Guard: Inner-city retail is closed during late night dead hours. Push generation is suppressed to protect battery and merchant operating hours.</p>
            </>
          ) : (
            <>
              <h3>No Merchant Rules Triggered</h3>
              <p>Current context state (<code>{context.primaryState}</code>) does not meet merchant constraints. Switch to <strong>Canonical: Cold Lunch</strong> above to see guaranteed offer generation.</p>
            </>
          )}
        </div>
      )}

      {!loading && !error && offers.map(offer => {
        const bgColors = offer.visualStyle?.gradient || ['#4F9EFF', '#2979FF'];
        return (
          <div key={offer.id} className="offer-card" onClick={() => openOffer(offer)}>
            <div className="offer-card-inner" style={{ background: `linear-gradient(135deg, ${bgColors[0]}, ${bgColors[1]})` }}>
              <div className="offer-top">
                <span className="offer-logo">{offer.merchantLogo}</span>
                <span className="offer-badge">{offer.discount}% OFF</span>
              </div>
              <div className="offer-merchant">{offer.merchantName} · 📍 {offer.distance}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                {offer.contextReasons?.map((r, i) => <span key={i} style={{ marginRight: '8px' }}>{r.icon} {r.label}</span>)}
              </div>
              <div className="offer-headline">{offer.headline}</div>
              <div className="offer-footer">
                <span className="offer-timer">⏳ Expires in {offer.expiresInMinutes}m</span>
                <button className="offer-view-btn">View →</button>
              </div>
            </div>
          </div>
        );
      })}

      <div className="refresh-bar">
        <button className="refresh-btn" onClick={fetchOffers} disabled={loading}>
          {loading ? '⟳ Refreshing...' : '⟳ Force Refresh Offers'}
        </button>
      </div>
      <div style={{ height: '40px' }} />

      {/* Expanded Offer Modal */}
      {activeOffer && (
        <div className="offer-detail-overlay" onClick={(e) => { if (e.target.className === 'offer-detail-overlay') setActiveOffer(null); }}>
          <div className="offer-detail" style={{ background: `linear-gradient(135deg, ${activeOffer.visualStyle?.gradient?.[0] || '#4F9EFF'}, ${activeOffer.visualStyle?.gradient?.[1] || '#2979FF'})` }}>
            <button className="close-x" onClick={() => setActiveOffer(null)}>✕</button>
            <div className="offer-detail-body">
              <div className="detail-merchant-row">
                <span className="detail-merchant-logo">{activeOffer.merchantLogo}</span>
                <div>
                  <div className="detail-merchant-name">{activeOffer.merchantName}</div>
                  <div className="detail-merchant-addr">{activeOffer.merchantAddress}</div>
                </div>
              </div>
              
              <div className="detail-discount">
                <span className="detail-discount-val">{activeOffer.discount}%</span>
                <span className="detail-discount-label">OFF</span>
              </div>

              <div className="detail-headline">{activeOffer.headline}</div>
              <div className="detail-body">{activeOffer.body}</div>

              <div className="detail-reasons">
                <div className="detail-reasons-label">Why you're seeing this:</div>
                <div>
                  {activeOffer.contextReasons?.map((r, i) => (
                    <span key={i} className="detail-reason-pill">{r.icon} {r.label}</span>
                  ))}
                </div>
              </div>

              <div className="detail-timer">
                <div className="detail-timer-label">Offer expires in</div>
                <div className={`detail-timer-value ${timeLeft < 300 ? 'urgent' : ''}`}>
                  {formatTime(timeLeft)}
                </div>
              </div>
            </div>
            
            <div className="detail-actions">
              <button className="claim-btn" style={{ background: activeOffer.visualStyle?.gradient?.[0] || '#4F9EFF' }} onClick={claimOffer} disabled={timeLeft === 0}>
                {timeLeft === 0 ? 'Expired' : '⚡ Claim Now'}
              </button>
              <button className="dismiss-btn" onClick={closeOffer}>Not right now</button>
              <div className="privacy-note">🔒 {activeOffer.privacyNote}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
