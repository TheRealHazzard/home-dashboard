import { useEffect, useRef, useState } from 'react';
import { get } from '../lib/api.js';

// Matches the server's own cache TTL (server/weather.js) — polling faster
// would just re-request the same cached response.
const POLL_MS = 10 * 60 * 1000;

/** Polls /api/weather. `error` is only ever set when there's truly no data
    to show at all (first load with no network) — once any data has
    loaded, a later failed poll is silently skipped and the last-known
    data just keeps showing (the server's own stale-cache fallback covers
    the common case; this covers the server being unreachable entirely). */
export function useWeather() {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);
  const hasDataRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const poll = () => {
      get('/api/weather')
        .then(data => {
          if (cancelled) return;
          hasDataRef.current = true;
          setWeather(data);
          setError(null);
        })
        .catch(err => {
          if (cancelled || hasDataRef.current) return;
          setError(err.message || 'Weather unavailable');
        });
    };

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { weather, error };
}
