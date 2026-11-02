const { v4: uuidv4 } = require('uuid');
const merchantRulesData = require('../config/merchantRules.json');

// ─── Offer Archetypes ─────────────────────────────────────────────────────────
// Each archetype: trigger affinity, tone, headline pool, body pool, visual style.
const ARCHETYPES = {
  weather_comfort: {
    priority: 10,
    tone: 'emotional',
    weatherAffinity: ['cold', 'freezing', 'rainy', 'snowy', 'hot'],
    headlines: {
      cold:    ['Warm up with {D}% off your {P}', 'Escape the cold — {D}% off inside', 'Beat the {T}°C chill — {D}% off today', '{D}% off to warm your {TL}'],
      freezing:['Step in from the freeze — {D}% off', '{T}°C outside. {D}% off inside. Easy choice.', 'Frozen out there? {D}% off in here.'],
      rainy:   ['Stay dry, save {D}% — come in', 'Rainy day special: {D}% off {P}', 'The rain brought you a deal: {D}% off'],
      snowy:   ['Snow day? {D}% off to warm up', '{D}% off — because {T}°C and snow deserve it'],
      hot:     ['Beat the heat — {D}% off', 'Stay cool with {D}% off {P}', '{T}°C outside, {D}% off inside'],
    },
    bodies: {
      cold:    ["It's {T}°C out there. Step in and save {D}%.", 'Outside: freezing. Inside: warm, delicious, {D}% cheaper.', 'The cold is real. Our {D}% discount is realer.'],
      rainy:   ["You're already out in the rain. Make it worth it — {D}% off.", 'Rain outside, warmth inside. {D}% off for showing up.'],
      hot:     ["It's {T}°C and climbing. Cool off with {D}% off.", 'The heat stops here — {D}% off today.'],
    },
    visualKey: (wc) => wc === 'rainy' || wc === 'snowy' ? 'shelter' : wc === 'hot' || wc === 'warm' ? 'cool_fresh' : 'warm_cozy',
  },

  off_peak_boost: {
    priority: 9,
    tone: 'factual',
    demandAffinity: ['quiet'],
    headlines: {
      default: ['Skip the queue — {D}% off right now', 'Perfect timing: {D}% off, no wait', 'Quiet hour deal: {D}% off for {E} minutes', 'No crowds, no wait — just {D}% off'],
    },
    bodies: {
      default: ["It's unusually quiet right now — perfect time to visit. We're saying thanks with {D}% off.", 'Right now: calm tables, full menu, {D}% cheaper. Come in.', 'Zero queue. Full menu. {D}% off. Window closes in {E} minutes.'],
    },
    visualKey: () => 'off_peak',
  },

  lunch_special: {
    priority: 8,
    tone: 'factual',
    timeAffinity: ['lunch'],
    headlines: {
      default: ['Lunch deal: {D}% off — {E} min only', 'Your lunch just got {D}% cheaper', "Today's lunch offer: {D}% off, ends {ET}", '{D}% off your lunch — grab it now'],
    },
    bodies: {
      default: ['Lunchtime is short. This offer is shorter — {E} minutes, {D}% off.', 'Fuel up. {D}% off your lunch, valid until {ET}.', 'Quick, delicious, {D}% cheaper. Your lunch break will thank you.'],
    },
    visualKey: () => 'lunch_energy',
  },

  discovery: {
    priority: 6,
    tone: 'emotional',
    headlines: {
      default: ['New here? {D}% off to welcome you', 'Discover {M} — {D}% off your first visit', 'First time in the area? {D}% off inside', 'Best find of the day: {D}% off at {M}'],
    },
    bodies: {
      default: ['Just passing through? Make it a stop worth remembering — {D}% off.', 'This neighbourhood has a secret: {D}% off at {M}.', 'Best discovery of the day: {M}, {D}% cheaper right now.'],
    },
    visualKey: () => 'discovery',
  },

  evening_social: {
    priority: 7,
    tone: 'emotional',
    timeAffinity: ['evening'],
    headlines: {
      default: ["Evening's better with {D}% off", "Tonight's deal: {D}% off at {M}", 'Unwind with {D}% off this evening', 'End the day right — {D}% off'],
    },
    bodies: {
      default: ["Work's done. Evening's here. {D}% off to help you unwind.", "The best evenings aren't planned — they're {D}% off.", 'Tonight at {M}: great atmosphere, {D}% off.'],
    },
    visualKey: () => 'evening_social',
  },

  flash_urgency: {
    priority: 5,
    tone: 'factual',
    demandAffinity: ['quiet'],
    timeAffinity: ['lunch', 'afternoon'],
    headlines: {
      default: ['Flash deal: {D}% off — {E} min only', '{E}-minute offer: {D}% off', 'Limited: {D}% off, expires {ET}'],
    },
    bodies: {
      default: ['This offer self-destructs in {E} minutes. {D}% off — move.', '{E} minutes. {D}% off. That is the deal.', 'No extensions. No exceptions. {D}% off for {E} minutes.'],
    },
    visualKey: () => 'flash_urgency',
  },
};

// ─── Visual Style Map ─────────────────────────────────────────────────────────
const VISUAL_STYLES = {
  warm_cozy:     { theme: 'warm_cozy',     primary: '#E8681A', secondary: '#FF8C42', bg: '#1A0800', text: '#FFFFFF', gradient: ['#E8681A', '#C45210', '#8B2500'], animation: 'warm_pulse',   iconSet: 'fire_coffee',  mood: 'inviting'    },
  shelter:       { theme: 'shelter',       primary: '#4A90D9', secondary: '#74B3E8', bg: '#071428', text: '#FFFFFF', gradient: ['#4A90D9', '#2E6BAD', '#1A3F6B'], animation: 'rain_drops',  iconSet: 'umbrella',     mood: 'sheltered'   },
  cool_fresh:    { theme: 'cool_fresh',    primary: '#00BCD4', secondary: '#4DD0E1', bg: '#001E26', text: '#FFFFFF', gradient: ['#00BCD4', '#0097A7', '#006064'], animation: 'cool_wave',   iconSet: 'ice_breeze',   mood: 'refreshing'  },
  off_peak:      { theme: 'off_peak',      primary: '#7C4DFF', secondary: '#B39DDB', bg: '#0D0020', text: '#FFFFFF', gradient: ['#7C4DFF', '#5E35B1', '#311B92'], animation: 'slide_up',    iconSet: 'deal_tag',     mood: 'opportunity' },
  lunch_energy:  { theme: 'lunch_energy',  primary: '#FF6B35', secondary: '#FFA500', bg: '#1A0E00', text: '#FFFFFF', gradient: ['#FF6B35', '#E55100', '#BF360C'], animation: 'bounce_in',   iconSet: 'fork_plate',   mood: 'energetic'   },
  discovery:     { theme: 'discovery',     primary: '#00C853', secondary: '#69F0AE', bg: '#00120A', text: '#FFFFFF', gradient: ['#00C853', '#00A041', '#007530'], animation: 'fade_up',     iconSet: 'compass',      mood: 'curious'     },
  evening_social:{ theme: 'evening_social',primary: '#9C27B0', secondary: '#CE93D8', bg: '#1A0020', text: '#FFFFFF', gradient: ['#9C27B0', '#6A1B9A', '#4A148C'], animation: 'glow_pulse',  iconSet: 'star_social',  mood: 'vibrant'     },
  flash_urgency: { theme: 'flash_urgency', primary: '#FF1744', secondary: '#FF8A80', bg: '#1A0005', text: '#FFFFFF', gradient: ['#FF1744', '#D50000', '#9B0000'], animation: 'flash',       iconSet: 'lightning',    mood: 'urgent'      },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function deterministicPick(arr, seed = '') {
  if (!arr || arr.length === 0) return '';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return arr[Math.abs(hash) % arr.length];
}

function fillTemplate(tpl, vars) {
  return tpl
    .replace(/{D}/g,  vars.discount)
    .replace(/{T}/g,  vars.temp)
    .replace(/{TL}/g, vars.timeLabel)
    .replace(/{P}/g,  vars.product)
    .replace(/{M}/g,  vars.merchant)
    .replace(/{E}/g,  vars.expiryMin)
    .replace(/{ET}/g, vars.expiryTime);
}

function computeDiscount(merchant, demand, compositeMatches) {
  const { minDiscountPercent: min, maxDiscountPercent: max } = merchant.constraints;
  // Quiet demand → push toward max; busy → stay near min
  const demandFactor = demand.level === 'quiet' ? 0.75 : demand.level === 'busy' ? 0.25 : 0.5;
  // Higher priority composite state → slightly more generous
  const priorityFactor = Math.min((compositeMatches[0]?.priority || 5) / 10, 1.0);
  const factor = (demandFactor * 0.7) + (priorityFactor * 0.3);
  const raw = min + Math.round((max - min) * factor);
  return Math.min(max, Math.max(min, raw));
}

function computeExpiry(timePeriod, archetype) {
  const base = { early_morning: 60, morning: 45, lunch: 22, afternoon: 35, evening: 40, night: 50 };
  const archetypeAdj = { flash_urgency: -10, off_peak_boost: +5, lunch_special: -5 };
  const mins = (base[timePeriod] || 30) + (archetypeAdj[archetype] || 0);
  const bounded = Math.max(10, Math.min(90, mins));
  const expiresAt = new Date(Date.now() + bounded * 60 * 1000);
  return {
    expiresInMinutes: bounded,
    expiresAt: expiresAt.toISOString(),
    expiryTime: expiresAt.toTimeString().slice(0, 5),
  };
}

function selectArchetype(merchant, context) {
  const { preferredArchetypes } = context;
  const { demand, timePeriod, weather } = context;

  const scored = Object.entries(ARCHETYPES).map(([key, archetype]) => {
    let score = archetype.priority;
    // Boost if merchant prefers this archetype
    if (preferredArchetypes.includes(key)) score += 5;
    // Boost by signal affinity
    if (archetype.weatherAffinity?.includes(weather.classification)) score += 3;
    if (archetype.demandAffinity?.includes(demand.level)) score += 3;
    if (archetype.timeAffinity?.includes(timePeriod)) score += 3;
    // Penalise if archetype time is wrong (e.g. evening archetype at lunch)
    if (archetype.timeAffinity && !archetype.timeAffinity.includes(timePeriod)) score -= 2;
    return { key, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].key;
}

// ─── Core Generator ───────────────────────────────────────────────────────────
function generateOffer(merchant, context) {
  const archetypeKey = selectArchetype(merchant, context);
  const archetype    = ARCHETYPES[archetypeKey];
  const wc           = context.weather.classification;
  const discount     = computeDiscount(merchant, context.demand, context.compositeMatches);
  const expiry       = computeExpiry(context.timePeriod, archetypeKey);
  const product      = deterministicPick(merchant.productHints, `${merchant.id}_${context.primaryState}`);

  const vars = {
    discount,
    temp:       context.weather.temp,
    timeLabel:  context.timePeriod.replace('_', ' '),
    product,
    merchant:   merchant.name,
    expiryMin:  expiry.expiresInMinutes,
    expiryTime: expiry.expiryTime,
  };

  // Select headline pool: weather-specific → default
  const headlinePool = archetype.headlines[wc] || archetype.headlines.default || archetype.headlines[Object.keys(archetype.headlines)[0]];
  const bodyPool     = archetype.bodies[wc]    || archetype.bodies.default    || archetype.bodies[Object.keys(archetype.bodies)[0]];

  const headline = fillTemplate(deterministicPick(headlinePool, `${merchant.id}_${archetypeKey}_head`), vars);
  const body     = fillTemplate(deterministicPick(bodyPool,     `${merchant.id}_${archetypeKey}_body`), vars);

  const visualKey   = archetype.visualKey(wc);
  const visualStyle = VISUAL_STYLES[visualKey] || VISUAL_STYLES.off_peak;

  return {
    id:              `offer_${merchant.id}_${context.primaryState}`,
    merchantId:      merchant.id,
    merchantName:    merchant.name,
    merchantLogo:    merchant.logo,
    merchantAddress: merchant.address,
    distance:        merchant.constraints?.distance || '0.2 km',
    archetype:       archetypeKey,
    tone:            archetype.tone,
    headline,
    body,
    discount,
    discountType:    'percentage',
    product,
    ...expiry,
    visualStyle,
    contextReasons:  context.signals.slice(0, 2),
    allSignals:      context.signals,
    compositeState:  context.primaryState,
    privacyNote:     'Generated from city weather + time of day. No personal data used.',
    generatedAt:     new Date().toISOString(),
    redeemed:        false,
    status:          'active',
  };
}

// ─── Public: Generate Offers for Context ─────────────────────────────────────
function generateOffersForContext(context, limit = 3) {
  const { merchants } = merchantRulesData;
  const contextHHMM = `${String(context.hour).padStart(2,'0')}:00`;

  // Deterministic Dead Hour Scenario (02:00 - 05:00)
  if (context.hour >= 2 && context.hour <= 5) {
    return [];
  }

  const eligible = merchants.filter(m => {
    if (!m.active) return false;
    if (m.city !== context.cityId && m.city !== 'all') return false;
    // Check active hours against context time
    if (contextHHMM < m.constraints.activeHoursStart || contextHHMM > m.constraints.activeHoursEnd) return false;
    // Check context triggers
    return m.contextTriggers.some(trigger =>
      context.compositeMatches.some(cm => cm.key === trigger) ||
      trigger === context.primaryState
    );
  });

  return eligible.slice(0, limit).map(m => generateOffer(m, context));
}

module.exports = { generateOffersForContext, generateOffer, VISUAL_STYLES };
