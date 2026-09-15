import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClockWeatherHero from './ClockWeatherHero.jsx';
import { mockFetch } from '../../test/fetchMock.js';

const weatherPayload = {
  location: { lat: 40.7128, lon: -74.006, label: 'New York, NY', units: 'fahrenheit' },
  units: 'fahrenheit',
  current: { temp: 60, feelsLike: 57, humidity: 71, wind: 6, isDay: true, condition: { label: 'Clear sky', icon: '☀️' } },
  today: { high: 73, low: 55, precipChance: 1, condition: { label: 'Mainly clear', icon: '🌤️' }, sunrise: '2026-09-15T06:36', sunset: '2026-09-15T19:04' },
  hourly: [],
  fetchedAt: Date.now(),
  stale: false,
};

describe('ClockWeatherHero', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows a loading state before the first weather fetch resolves', () => {
    mockFetch({ '/api/weather': () => new Promise(() => {}) }); // never resolves
    render(<ClockWeatherHero />);
    expect(screen.getByText('Loading weather…')).toBeInTheDocument();
  });

  it('renders the current conditions, today\'s high/low, and location once loaded', async () => {
    mockFetch({ '/api/weather': weatherPayload });
    render(<ClockWeatherHero />);
    expect(await screen.findByText('60°F')).toBeInTheDocument();
    expect(screen.getByText('Clear sky')).toBeInTheDocument();
    expect(screen.getByText('☀️')).toBeInTheDocument();
    expect(screen.getByText(/New York, NY/)).toBeInTheDocument();
    expect(screen.getByText(/H 73° L 55°/)).toBeInTheDocument();
  });

  it('shows a stale note when the server served cached data past its TTL', async () => {
    mockFetch({ '/api/weather': { ...weatherPayload, stale: true } });
    const { container } = render(<ClockWeatherHero />);
    await screen.findByText('60°F'); // wait for the fetch to resolve
    expect(container.querySelector('.hero-weather-stale').textContent).toMatch(/last updated a while ago/);
  });

  it('shows an error only when there is no data at all to fall back on', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('network down')));
    render(<ClockWeatherHero />);
    expect(await screen.findByText(/Weather unavailable: network down/)).toBeInTheDocument();
  });

  it('the clock ticks forward on its own once mounted', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-09-15T09:00:00'));
    mockFetch({ '/api/weather': weatherPayload });
    render(<ClockWeatherHero />);
    const before = document.querySelector('.hero-time').textContent;

    vi.setSystemTime(new Date('2026-09-15T09:01:05'));
    await vi.advanceTimersByTimeAsync(1500);

    const after = document.querySelector('.hero-time').textContent;
    expect(after).not.toBe(before);
  });
});
