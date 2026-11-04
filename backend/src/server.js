
const express = require('express');
const cors    = require('cors');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '1mb' }));

// ─── Routes (Both /api/* and /* aliases for Vercel Serverless compatibility) ───
const contextRoute    = require('./routes/context');
const offersRoute     = require('./routes/offers');
const redemptionRoute = require('./routes/redemption');
const merchantRoute   = require('./routes/merchant');

app.use('/api/context',  contextRoute);
app.use('/context',      contextRoute);

app.use('/api/offers',   offersRoute);
app.use('/offers',       offersRoute);

app.use('/api/redeem',   redemptionRoute);
app.use('/redeem',       redemptionRoute);

app.use('/api/merchant', merchantRoute);
app.use('/merchant',     merchantRoute);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:    'ok',
    service:   'City Wallet API',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
    weatherMode: process.env.WEATHER_API_KEY && process.env.WEATHER_API_KEY !== 'demo' ? 'live' : 'deterministic-fallback',
  });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🏙️  City Wallet API running on http://localhost:${PORT}`);
    console.log(`📡  Health:    http://localhost:${PORT}/health`);
    console.log(`🌤️  Context:   http://localhost:${PORT}/api/context?city=berlin`);
    console.log(`🎁  Offers:    POST http://localhost:${PORT}/api/offers/generate`);
    console.log(`🏪  Merchant:  http://localhost:${PORT}/api/merchant/all\n`);
  });
}

module.exports = app;
