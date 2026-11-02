const express = require('express');
const router  = express.Router();
const { buildContext }            = require('../engines/contextEngine');
const { generateOffersForContext } = require('../engines/offerEngine');
const { trackOfferGenerated, trackAcceptance, trackDismissal } = require('../engines/analyticsEngine');

// POST /api/offers/generate
// Body: { city, zone, limit, scenario }
router.post('/generate', async (req, res) => {
  try {
    const { city = 'berlin', zone = 'city-center', limit = 3, scenario } = req.body;
    const context = await buildContext(city, zone, { scenario });
    const offers  = generateOffersForContext(context, limit);

    if (offers.length === 0) {
      return res.json({ success: true, offers: [], context, message: 'No offers triggered for current context.' });
    }

    offers.forEach(o => trackOfferGenerated(o));
    res.json({ success: true, offers, context });
  } catch (err) {
    console.error('Offer generation error:', err.message);
    res.status(500).json({ success: false, error: 'Offer generation failed' });
  }
});

// POST /api/offers/accept  — user tapped "Claim"
router.post('/accept', (req, res) => {
  const { offerId, merchantId } = req.body;
  if (!offerId || !merchantId) return res.status(400).json({ success: false, error: 'offerId and merchantId required' });
  trackAcceptance(offerId, merchantId);
  res.json({ success: true });
});

// POST /api/offers/dismiss  — user dismissed
router.post('/dismiss', (req, res) => {
  const { offerId, merchantId } = req.body;
  if (!offerId || !merchantId) return res.status(400).json({ success: false, error: 'offerId and merchantId required' });
  trackDismissal(offerId, merchantId);
  res.json({ success: true });
});

module.exports = router;
