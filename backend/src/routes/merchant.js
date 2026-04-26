const express = require('express');
const router  = express.Router();
const { getMerchantStats, getAllMerchantsStats } = require('../engines/analyticsEngine');
const merchantRulesData = require('../config/merchantRules.json');

// GET /api/merchant/all  — all merchants summary for dashboard overview
router.get('/all', (req, res) => {
  const stats   = getAllMerchantsStats();
  const merchants = merchantRulesData.merchants.map(m => ({
    id:       m.id,
    name:     m.name,
    category: m.category,
    logo:     m.logo,
    address:  m.address,
    active:   m.active,
    constraints: m.constraints,
    goals:    m.goals,
    brandVoice: m.brandVoice,
  }));
  res.json({ success: true, merchants, stats });
});

// GET /api/merchant/:merchantId  — per-merchant dashboard
router.get('/:merchantId', (req, res) => {
  const { merchantId } = req.params;
  const merchant = merchantRulesData.merchants.find(m => m.id === merchantId);
  if (!merchant) return res.status(404).json({ success: false, error: 'Merchant not found' });
  const stats = getMerchantStats(merchantId);
  res.json({ success: true, merchant, stats });
});

// PUT /api/merchant/:merchantId/rules  — update merchant constraints (Rule Config UI)
router.put('/:merchantId/rules', (req, res) => {
  const { merchantId } = req.params;
  const merchant = merchantRulesData.merchants.find(m => m.id === merchantId);
  if (!merchant) return res.status(404).json({ success: false, error: 'Merchant not found' });

  const { goals, constraints, brandVoice, contextTriggers } = req.body;
  // Apply updates (in-memory for demo; would persist to DB in production)
  if (goals)           merchant.goals           = goals;
  if (constraints)     merchant.constraints     = { ...merchant.constraints, ...constraints };
  if (brandVoice)      merchant.brandVoice      = brandVoice;
  if (contextTriggers) merchant.contextTriggers = contextTriggers;

  res.json({ success: true, message: 'Merchant rules updated.', merchant });
});

module.exports = router;
