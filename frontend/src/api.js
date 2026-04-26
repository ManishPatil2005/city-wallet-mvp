const API = '';

export async function generateOffers(city = 'berlin', zone = 'city-center') {
  const res = await fetch(`${API}/api/offers/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ city, zone, limit: 3 }),
  });
  return res.json();
}

export async function acceptOffer(offerId, merchantId) {
  return fetch(`${API}/api/offers/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ offerId, merchantId }),
  }).then(r => r.json());
}

export async function dismissOffer(offerId, merchantId) {
  return fetch(`${API}/api/offers/dismiss`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ offerId, merchantId }),
  }).then(r => r.json());
}

export async function prepareRedemption(offer) {
  const res = await fetch(`${API}/api/redeem/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ offer }),
  });
  return res.json();
}

export async function simulateRedeem(token) {
  const res = await fetch(`${API}/api/redeem/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return res.json();
}

export async function getMerchantStats(merchantId) {
  const res = await fetch(`${API}/api/merchant/${merchantId}`);
  return res.json();
}

export async function getAllMerchants() {
  const res = await fetch(`${API}/api/merchant/all`);
  return res.json();
}
