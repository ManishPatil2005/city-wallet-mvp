const contextRules = require('../config/contextRules.json');
const cities = require('../config/cities.json');

// ─── Time Classification ──────────────────────────────────────────
function classifyTime(hour) {
  if (hour >= 5 && hour < 8)   return 'early_morning';
  if (hour >= 8 && hour < 11)  return 'morning';
  if (hour >= 11 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// ─── Deterministic Weather (no API, city-seeded) ──────────────────
function getWeather(city) {
  const month = new Date().getMonth();
  const hour  = new Date().getHours();
  const profile = city.weatherProfile || [5, 6, 10, 14, 18, 21, 23, 22, 18, 13, 8, 4];
  const baseTemp = profile[month];
  const diurnal  = Math.sin(((hour - 6) / 12) * Math.PI) * 4;
  const temp     = Math.round(baseTemp + diurnal);

  let condition = 'partly cloudy';
  if (temp < 4)       condition = 'clear sky, freezing';
  else if (temp < 10) condition = 'overcast';
  else if (temp < 18) condition = 'light clouds';
  else                condition = 'sunny intervals';

  return { temp, feelsLike: temp - 2, condition, humidity: 62 };
}

function classifyWeather(temp) {
  if (temp < 4)  return 'freezing';
  if (temp < 10) return 'cold';
  if (temp < 16) return 'cool';
  if (temp < 22) return 'mild';
  if (temp < 28) return 'warm';
  return 'hot';
}

// ─── Payone Transaction Density (simulated) ───────────────────────
function simulatePayoneDensity(hour, multiplier = 1.0) {
  const peaks = new Set([12, 13, 18, 19, 20]);
  const lows  = new Set([2, 3, 4, 5, 6]);
  const base  = peaks.has(hour) ? 0.80 : lows.has(hour) ? 0.12 : 0.50;
  // Deterministic noise using sine wave so it varies by hour but is never random
  const noise = Math.sin(hour) * 0.05; 
  const density = Math.min(1.0, Math.max(0.05, (base + noise) * multiplier));
  const deltaPercent = Math.round(((density - base * multiplier) / (base * multiplier)) * 100);

  let level = 'normal';
  if (base === 0.12) level = 'quiet';
  else if (base === 0.80) level = 'busy';

  return { absolute: parseFloat(density.toFixed(2)), deltaPercent, level };
}

// ─── Local Events (stubbed calendar) ──────────────────────────────
function getLocalEvents(timePeriod) {
  const dow = new Date().getDay();
  const recurring = contextRules.eventCalendar?.recurring || [];
  return recurring.filter(e => e.dayOfWeek === dow && e.timePeriod === timePeriod);
}

// ─── Composite State Resolver ─────────────────────────────────────
function resolveCompositeState(weatherClass, timePeriod, demand) {
  const states = contextRules.compositeStates || {};
  const matched = [];
  for (const [key, rule] of Object.entries(states)) {
    const wOk = !rule.weather    || rule.weather.includes(weatherClass);
    const tOk = !rule.timePeriod || rule.timePeriod.includes(timePeriod);
    const dOk = !rule.demand     || rule.demand.includes(demand.level);
    if (wOk && tOk && dOk) matched.push({ key, priority: rule.priority || 0, ...rule });
  }
  matched.sort((a, b) => b.priority - a.priority);
  return matched;
}

// ─── Visible Signals ──────────────────────────────────────────────
function buildSignals(weatherClass, weather, timePeriod, demand, events) {
  const wEmoji = { freezing:'❄️', cold:'🧊', cool:'🌤️', mild:'⛅', warm:'☀️', hot:'🌡️' };
  const tEmoji = contextRules.timeEmojis || {};
  const tLabel = contextRules.timeLabels || {};

  const signals = [
    { icon: wEmoji[weatherClass] || '🌡️', label: `${weather.temp}°C · ${weather.condition}`, type: 'weather' },
    { icon: tEmoji[timePeriod]   || '🕐', label: tLabel[timePeriod] || timePeriod,             type: 'time'    },
  ];

  if (demand.level !== 'normal') {
    signals.push({
      icon: demand.level === 'quiet' ? '📉' : '📈',
      label: demand.level === 'quiet'
        ? `Quieter than usual (${Math.abs(demand.deltaPercent)}% below avg)`
        : `Busier than usual (${demand.deltaPercent}% above avg)`,
      type: 'demand',
    });
  }

  events.slice(0, 1).forEach(e => signals.push({ icon: '🎟️', label: e.label, type: 'event' }));
  return signals;
}

// ─── Preset Scenarios for Demonstrations & Judging ───────────────────
const PRESET_SCENARIOS = {
  canonical_cold_lunch: {
    id: 'canonical_cold_lunch',
    name: 'Canonical: Cold Lunch Rush',
    description: 'Cold (8°C) + Weekday Lunch + Low footfall. Guaranteed Café Mitte offer.',
    hour: 12,
    timePeriod: 'lunch',
    weather: { temp: 8, feelsLike: 6, condition: 'overcast, chilly', humidity: 68, classification: 'cold' },
    demand: { absolute: 0.22, deltaPercent: -35, level: 'quiet' },
  },
  rainy_afternoon: {
    id: 'rainy_afternoon',
    name: 'Rainy Afternoon',
    description: 'Rainy (11°C) + Afternoon + Quiet footfall. Triggers shelter/comfort archetypes.',
    hour: 15,
    timePeriod: 'afternoon',
    weather: { temp: 11, feelsLike: 9, condition: 'rain showers', humidity: 90, classification: 'rainy' },
    demand: { absolute: 0.24, deltaPercent: -28, level: 'quiet' },
  },
  quiet_evening: {
    id: 'quiet_evening',
    name: 'Quiet Evening Social',
    description: 'Cool (14°C) + Evening + Quiet footfall. Triggers evening social archetypes.',
    hour: 19,
    timePeriod: 'evening',
    weather: { temp: 14, feelsLike: 12, condition: 'clear dusk', humidity: 60, classification: 'cool' },
    demand: { absolute: 0.28, deltaPercent: -22, level: 'quiet' },
  },
  dead_hour_night: {
    id: 'dead_hour_night',
    name: 'Night Dead Hour (No Offers)',
    description: '03:00 Night. Deterministically triggers 0 offers due to merchant closure policy.',
    hour: 3,
    timePeriod: 'night',
    weather: { temp: 3, feelsLike: 0, condition: 'clear sky, freezing', humidity: 75, classification: 'freezing' },
    demand: { absolute: 0.08, deltaPercent: -65, level: 'quiet' },
  },
};

// ─── Main: Build Context ──────────────────────────────────────────
function buildContext(cityId = 'berlin', zone = 'city-center', options = {}) {
  const city = cities[cityId] || cities.berlin;
  const scenarioKey = options.scenario;
  const preset = scenarioKey && PRESET_SCENARIOS[scenarioKey];

  let now = new Date();
  let hour = preset ? preset.hour : now.getHours();
  let timePeriod = preset ? preset.timePeriod : classifyTime(hour);
  let weather = preset ? preset.weather : getWeather(city);
  let weatherClass = weather.classification || classifyWeather(weather.temp);
  let demand = preset ? preset.demand : simulatePayoneDensity(hour, city.densityMultiplier || 1.0);
  let events = getLocalEvents(timePeriod);

  const compositeMatches = resolveCompositeState(weatherClass, timePeriod, demand);
  const primaryState     = compositeMatches[0]?.key || `${weatherClass}_${timePeriod}`;
  const signals          = buildSignals(weatherClass, weather, timePeriod, demand, events);

  return {
    cityId,
    cityName: city.name,
    zone,
    scenario: scenarioKey || 'live',
    timestamp: now.toISOString(),
    weather: { ...weather, classification: weatherClass },
    timePeriod,
    hour,
    demand,
    events,
    compositeMatches,
    primaryState,
    preferredArchetypes: compositeMatches[0]?.preferredArchetypes || [],
    signals,
    nearbyVenueTypes: city.venueTypes || ['cafe', 'restaurant'],
  };
}

module.exports = { buildContext, PRESET_SCENARIOS };
