const express = require('express');
const router  = express.Router();
const { prepareRedemption, redeemToken } = require('../engines/redemptionEngine');
const { trackRedemption }                = require('../engines/analyticsEngine');

// POST /api/redeem/prepare — consumer taps "Claim", get QR + token
router.post('/prepare', async (req, res) => {
  try {
    const { offer } = req.body;
    if (!offer?.id) return res.status(400).json({ success: false, error: 'offer object required' });
    const redemptionPackage = await prepareRedemption(offer);
    res.json({ success: true, ...redemptionPackage });
  } catch (err) {
    console.error('Prepare redemption error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to prepare redemption' });
  }
});

// POST /api/redeem/validate — merchant scanner hits this endpoint
router.post('/validate', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: 'token required' });
    const result = await redeemToken(token);
    if (result.success) {
      trackRedemption(result.offerId, result.merchantId, result.confirmationCode);
    }
    res.json(result);
  } catch (err) {
    console.error('Redemption validation error:', err.message);
    res.status(500).json({ success: false, error: 'Redemption validation failed' });
  }
});

// POST /api/redeem/simulate — demo endpoint: auto-validate in consumer flow
router.post('/simulate', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: 'token required' });
    const result = await redeemToken(token);
    if (result.success) {
      trackRedemption(result.offerId, result.merchantId, result.confirmationCode);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Simulation failed' });
  }
});

module.exports = router;
