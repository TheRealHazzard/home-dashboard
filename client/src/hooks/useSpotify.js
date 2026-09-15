import { useEffect, useState } from 'react';
import { get } from '../lib/api.js';

const POLL_MS = 10 * 1000;

/** Polls /api/spotify/now-playing. `connected:false` is a normal, expected
    state here (never connected yet, or the grant was revoked) — same
    treatment useLights.js gives its own "offline" state, not an error. */
export function useSpotify() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      get('/api/spotify/now-playing').then(result => {
        if (!cancelled) setData(result);
      });
    };
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return data;
}
