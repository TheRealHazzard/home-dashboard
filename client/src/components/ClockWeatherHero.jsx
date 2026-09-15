import { useClock } from '../hooks/useClock.js';
import { useWeather } from '../hooks/useWeather.js';

const DEGREE = { fahrenheit: '°F', celsius: '°C' };

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDate(date) {
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function ClockWeatherHero() {
  const now = useClock();
  const { weather, error } = useWeather();

  return (
    <section className="widget widget-hero">
      <div className="hero-clock">
        <div className="hero-time">{formatTime(now)}</div>
        <div className="hero-date">{formatDate(now)}</div>
      </div>
      <div className="hero-weather">
        {weather ? (
          <>
            <div className="hero-weather-now">
              <span className="hero-weather-icon">{weather.current.condition.icon}</span>
              <span className="hero-weather-temp">
                {weather.current.temp}
                {DEGREE[weather.units]}
              </span>
              <span className="hero-weather-label">{weather.current.condition.label}</span>
            </div>
            <div className="hero-weather-sub">
              {weather.location.label} · H {weather.today.high}° L {weather.today.low}°
              {weather.stale && <span className="hero-weather-stale"> · last updated a while ago</span>}
            </div>
          </>
        ) : error ? (
          <div className="hero-weather-error">Weather unavailable: {error}</div>
        ) : (
          <div className="hero-weather-loading">Loading weather…</div>
        )}
      </div>
    </section>
  );
}
