import { useCallback, useEffect, useState } from 'react';
import { get, post } from '../lib/api.js';

const POLL_MS = 15 * 1000;

/** Polls the lights proxy — offline is a normal, expected state here (the
    separate smart-home-dashboard process not running), not an error, so
    this never surfaces a thrown error the way useWeather does. A
    mutation (toggling a light) re-polls immediately afterward so the
    widget reflects the real device state rather than optimistically
    assuming the command landed. */
export function useLights() {
  const [devices, setDevices] = useState([]);
  const [offline, setOffline] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    return get('/api/lights/devices').then(data => {
      setDevices(data.devices);
      setOffline(data.offline);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const setPower = useCallback((id, on) => {
    return post(`/api/lights/devices/${id}/power`, { on }).finally(refresh);
  }, [refresh]);

  const setBrightness = useCallback((id, brightness) => {
    return post(`/api/lights/devices/${id}/brightness`, { brightness }).finally(refresh);
  }, [refresh]);

  return { devices, offline, loaded, setPower, setBrightness };
}
