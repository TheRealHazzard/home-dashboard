'use strict';

const { HttpError } = require('./httpError');

const CACHE_MS = 10 * 60 * 1000; // 10 minutes — plenty fresh for a kiosk glance

// The complete WMO weather-code table Open-Meteo uses. The server is the
// single source of truth for code -> {label, icon} — the client never maps
// codes itself, it just renders whatever strings this sends.
const WEATHER_CODES = {
  0: { label: 'Clear sky', icon: '☀️', nightIcon: '🌙' },
  1: { label: 'Mainly clear', icon: '🌤️', nightIcon: '🌙' },
  2: { label: 'Partly cloudy', icon: '⛅', nightIcon: '☁️' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Fog', icon: '🌫️' },
  48: { label: 'Rime fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  53: { label: 'Drizzle', icon: '🌦️' },
  55: { label: 'Dense drizzle', icon: '🌧️' },
  56: { label: 'Freezing drizzle', icon: '🌧️' },
  57: { label: 'Freezing drizzle', icon: '🌧️' },
  61: { label: 'Light rain', icon: '🌦️' },
  63: { label: 'Rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  66: { label: 'Freezing rain', icon: '🌧️' },
  67: { label: 'Freezing rain', icon: '🌧️' },
  71: { label: 'Light snow', icon: '🌨️' },
  73: { label: 'Snow', icon: '❄️' },
  75: { label: 'Heavy snow', icon: '❄️' },
  77: { label: 'Snow grains', icon: '❄️' },
  80: { label: 'Rain showers', icon: '🌦️' },
  81: { label: 'Rain showers', icon: '🌧️' },
  82: { label: 'Heavy rain showers', icon: '⛈️' },
  85: { label: 'Snow showers', icon: '🌨️' },
  86: { label: 'Heavy snow showers', icon: '❄️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm, hail', icon: '⛈️' },
  99: { label: 'Severe thunderstorm', icon: '⛈️' },
};

function condition(code, isDay) {
  const entry = WEATHER_CODES[code] || { label: 'Unknown', icon: '❔' };
  const icon = isDay === false && entry.nightIcon ? entry.nightIcon : entry.icon;
  return { label: entry.label, icon };
}

async function fetchWeather({ lat, lon, units = 'fahrenheit' }) {
  const windUnit = units === 'fahrenheit' ? 'mph' : 'kmh';
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('current', 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day');
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset');
  url.searchParams.set('hourly', 'temperature_2m,weather_code,precipitation_probability');
  url.searchParams.set('temperature_unit', units);
  url.searchParams.set('wind_speed_unit', windUnit);
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '2');

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Open-Meteo returned ${res.status}`);
  const raw = await res.json();

  const isDay = raw.current.is_day === 1;
  const nowHourIndex = raw.hourly.time.findIndex(t => t >= raw.current.time);
  const hourly = raw.hourly.time
    .slice(Math.max(0, nowHourIndex), Math.max(0, nowHourIndex) + 6)
    .map((time, i) => {
      const idx = Math.max(0, nowHourIndex) + i;
      return {
        time,
        temp: Math.round(raw.hourly.temperature_2m[idx]),
        precipChance: raw.hourly.precipitation_probability[idx],
        condition: condition(raw.hourly.weather_code[idx]),
      };
    });

  return {
    current: {
      temp: Math.round(raw.current.temperature_2m),
      feelsLike: Math.round(raw.current.apparent_temperature),
      humidity: raw.current.relative_humidity_2m,
      wind: Math.round(raw.current.wind_speed_10m),
      isDay,
      condition: condition(raw.current.weather_code, isDay),
    },
    today: {
      high: Math.round(raw.daily.temperature_2m_max[0]),
      low: Math.round(raw.daily.temperature_2m_min[0]),
      precipChance: raw.daily.precipitation_probability_max[0],
      condition: condition(raw.daily.weather_code[0]),
      sunrise: raw.daily.sunrise[0],
      sunset: raw.daily.sunset[0],
    },
    hourly,
  };
}

let cache = { data: null, fetchedAt: 0 };

/** Serves cache while fresh; past the TTL, refetches — on a failed
    refetch, serves whatever cache exists (marked stale) rather than
    erroring, so a brief Wi-Fi blip doesn't blank the hero widget. Only
    throws when there's no cache at all yet (first boot with no network). */
async function getWeather(config) {
  const fresh = cache.data && Date.now() - cache.fetchedAt < CACHE_MS;
  if (fresh) return { ...cache.data, fetchedAt: cache.fetchedAt, stale: false };

  try {
    const data = await fetchWeather({
      lat: config.location.lat,
      lon: config.location.lon,
      units: config.location.units,
    });
    cache = { data, fetchedAt: Date.now() };
    return { ...data, fetchedAt: cache.fetchedAt, stale: false };
  } catch (err) {
    if (cache.data) return { ...cache.data, fetchedAt: cache.fetchedAt, stale: true };
    throw new HttpError(503, `Weather unavailable: ${err.message}`);
  }
}

module.exports = { getWeather, WEATHER_CODES };
