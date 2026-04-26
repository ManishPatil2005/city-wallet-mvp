const express = require('express');
const router  = express.Router();
const { buildContext } = require('../engines/contextEngine');

// GET /api/context?city=berlin&zone=city-center
router.get('/', async (req, res) => {
  try {
    const { city = 'berlin', zone = 'city-center' } = req.query;
    const context = await buildContext(city, zone);
    res.json({ success: true, context });
  } catch (err) {
    console.error('Context error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to build context' });
  }
});

module.exports = router;
