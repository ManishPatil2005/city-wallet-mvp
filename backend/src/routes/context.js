const express = require('express');
const router  = express.Router();
const { buildContext, PRESET_SCENARIOS } = require('../engines/contextEngine');

// GET /api/context/scenarios — list available demo scenarios
router.get('/scenarios', (req, res) => {
  res.json({ success: true, scenarios: Object.values(PRESET_SCENARIOS) });
});

// GET /api/context?city=berlin&zone=city-center&scenario=canonical_cold_lunch
router.get('/', async (req, res) => {
  try {
    const { city = 'berlin', zone = 'city-center', scenario } = req.query;
    const context = await buildContext(city, zone, { scenario });
    res.json({ success: true, context });
  } catch (err) {
    console.error('Context error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to build context' });
  }
});

module.exports = router;
