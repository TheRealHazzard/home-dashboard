import { useEffect, useState } from 'react';

/** The current time, ticking once a second — purely local, no server
    round-trip needed for a clock. */
export function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return now;
}
