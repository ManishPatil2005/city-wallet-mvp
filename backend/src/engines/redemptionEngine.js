const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'city-wallet-hackathon-secret-2026';
const redeemedTokens = new Map();

// ─── Generate Redemption Token ────────────────────────────────────
function generateToken(offer) {
  const payload = {
    offerId:      offer.id,
    merchantId:   offer.merchantId,
    merchantName: offer.merchantName,
    discount:     offer.discount,
    discountType: offer.discountType,
    expiresAt:    offer.expiresAt,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: offer.expiresInMinutes * 60 });
}

// ─── Validate & Redeem Token ──────────────────────────────────────
function redeemToken(token) {
  if (redeemedTokens.has(token)) {
    return { success: false, reason: 'already_redeemed', message: 'This offer has already been redeemed.' };
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    const reason = err.name === 'TokenExpiredError' ? 'expired' : 'invalid';
    return { success: false, reason, message: reason === 'expired' ? 'This offer has expired.' : 'Invalid token.' };
  }

  redeemedTokens.set(token, { redeemedAt: new Date().toISOString(), ...payload });

  return {
    success:          true,
    offerId:          payload.offerId,
    merchantId:       payload.merchantId,
    merchantName:     payload.merchantName,
    discount:         payload.discount,
    discountType:     payload.discountType,
    redeemedAt:       new Date().toISOString(),
    confirmationCode: `CW-${payload.offerId.slice(0, 8).toUpperCase()}`,
    payoneReference:  `PAYONE-${Date.now()}`,
    message:          `${payload.discount}% off applied at ${payload.merchantName}`,
  };
}

// ─── Prepare Redemption Package (no QR image — just token string) ─
function prepareRedemption(offer) {
  const token = generateToken(offer);
  return {
    token,
    redemptionUrl:    `citywallet://redeem?token=${token}`,
    offerId:          offer.id,
    merchantName:     offer.merchantName,
    merchantAddress:  offer.merchantAddress,
    discount:         offer.discount,
    discountType:     offer.discountType,
    expiresAt:        offer.expiresAt,
    expiresInMinutes: offer.expiresInMinutes,
    headline:         offer.headline,
  };
}

module.exports = { prepareRedemption, redeemToken };
