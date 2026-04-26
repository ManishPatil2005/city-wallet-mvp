// In-memory analytics store for demo (aggregate only — no user PII ever stored)
const store = {
  offers:      [],   // { offerId, merchantId, merchantName, discount, archetype, compositeState, generatedAt }
  acceptances: [],   // { offerId, merchantId, acceptedAt }
  dismissals:  [],   // { offerId, merchantId, dismissedAt }
  redemptions: [],   // { offerId, merchantId, redeemedAt, confirmationCode }
};

// ─── Track Offer Generated ────────────────────────────────────────────────────
function trackOfferGenerated(offer) {
  store.offers.push({
    offerId:        offer.id,
    merchantId:     offer.merchantId,
    merchantName:   offer.merchantName,
    discount:       offer.discount,
    archetype:      offer.archetype,
    compositeState: offer.compositeState,
    headline:       offer.headline,
    generatedAt:    offer.generatedAt,
    status:         'generated',
  });
}

// ─── Track User Action ────────────────────────────────────────────────────────
function trackAcceptance(offerId, merchantId) {
  store.acceptances.push({ offerId, merchantId, acceptedAt: new Date().toISOString() });
  _updateOfferStatus(offerId, 'accepted');
}

function trackDismissal(offerId, merchantId) {
  store.dismissals.push({ offerId, merchantId, dismissedAt: new Date().toISOString() });
  _updateOfferStatus(offerId, 'dismissed');
}

function trackRedemption(offerId, merchantId, confirmationCode) {
  store.redemptions.push({ offerId, merchantId, confirmationCode, redeemedAt: new Date().toISOString() });
  _updateOfferStatus(offerId, 'redeemed');
}

function _updateOfferStatus(offerId, status) {
  const offer = store.offers.find(o => o.offerId === offerId);
  if (offer) offer.status = status;
}

// ─── Merchant Dashboard Stats ─────────────────────────────────────────────────
function getMerchantStats(merchantId) {
  const offered   = store.offers.filter(o => o.merchantId === merchantId);
  const accepted  = store.acceptances.filter(a => a.merchantId === merchantId);
  const dismissed = store.dismissals.filter(d => d.merchantId === merchantId);
  const redeemed  = store.redemptions.filter(r => r.merchantId === merchantId);
  const total     = offered.length;

  const acceptanceRate = total > 0 ? Math.round((accepted.length / total) * 100) : 0;
  const redemptionRate = total > 0 ? Math.round((redeemed.length / total) * 100) : 0;

  // Hourly breakdown (last 6 hours)
  const now = Date.now();
  const hourlyData = Array.from({ length: 6 }, (_, i) => {
    const windowStart = now - (6 - i) * 3600000;
    const windowEnd   = now - (5 - i) * 3600000;
    const label = new Date(windowStart).toTimeString().slice(0, 5);
    const generated = offered.filter(o => {
      const t = new Date(o.generatedAt).getTime();
      return t >= windowStart && t < windowEnd;
    }).length;
    const acc = accepted.filter(a => {
      const t = new Date(a.acceptedAt).getTime();
      return t >= windowStart && t < windowEnd;
    }).length;
    return { label, generated, accepted: acc };
  });

  // Archetype breakdown
  const archetypeCounts = {};
  offered.forEach(o => {
    archetypeCounts[o.archetype] = (archetypeCounts[o.archetype] || 0) + 1;
  });

  return {
    merchantId,
    summary: {
      totalOffersGenerated: total,
      totalAccepted:  accepted.length,
      totalDismissed: dismissed.length,
      totalRedeemed:  redeemed.length,
      acceptanceRate,
      redemptionRate,
    },
    hourlyData,
    archetypeBreakdown: archetypeCounts,
    recentOffers: offered.slice(-10).reverse(),
  };
}

// ─── All Merchants Summary ────────────────────────────────────────────────────
function getAllMerchantsStats() {
  const merchantIds = [...new Set(store.offers.map(o => o.merchantId))];
  return merchantIds.map(id => getMerchantStats(id));
}

// ─── Seed demo data so dashboard is non-empty from the start ─────────────────
function seedDemoData() {
  const merchants = require('../config/merchantRules.json').merchants;
  const archetypes = ['weather_comfort', 'off_peak_boost', 'lunch_special', 'evening_social'];
  const now = Date.now();

  merchants.forEach(m => {
    for (let i = 0; i < 8; i++) {
      const offerId = `demo-${m.id}-${i}`;
      const generatedAt = new Date(now - (8 - i) * 1800000).toISOString(); // last 4h, every 30min
      store.offers.push({
        offerId, merchantId: m.id, merchantName: m.name,
        discount: m.constraints.minDiscountPercent + Math.round(Math.random() * (m.constraints.maxDiscountPercent - m.constraints.minDiscountPercent)),
        archetype: archetypes[i % archetypes.length],
        compositeState: 'cold_quiet_lunch',
        headline: 'Demo offer',
        generatedAt, status: 'generated',
      });
    }
    // Seed ~60% acceptance rate
    store.offers.filter(o => o.merchantId === m.id).slice(0, 5).forEach(o => {
      store.acceptances.push({ offerId: o.offerId, merchantId: m.id, acceptedAt: o.generatedAt });
      o.status = 'accepted';
    });
    // Seed ~35% redemption rate
    store.acceptances.filter(a => a.merchantId === m.id).slice(0, 3).forEach(a => {
      store.redemptions.push({ offerId: a.offerId, merchantId: m.id, confirmationCode: `CW-DEMO`, redeemedAt: a.acceptedAt });
    });
  });
}

seedDemoData();

module.exports = { trackOfferGenerated, trackAcceptance, trackDismissal, trackRedemption, getMerchantStats, getAllMerchantsStats };
