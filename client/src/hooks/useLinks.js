import { useCallback, useEffect, useState } from 'react';
import { get, post, del } from '../lib/api.js';

/** Owns the quick-links list — same fetch-once-then-fold-mutations-in
    shape as useTasks.js (single kiosk, nothing else to stay in sync
    with). */
export function useLinks() {
  const [links, setLinks] = useState(null);

  useEffect(() => {
    get('/api/links').then(data => setLinks(data.links));
  }, []);

  const addLink = useCallback((label, url) => {
    return post('/api/links', { label, url }).then(link => {
      setLinks(prev => [...(prev || []), link]);
      return link;
    });
  }, []);

  const removeLink = useCallback(id => {
    return del(`/api/links/${id}`).then(() => {
      setLinks(prev => (prev || []).filter(l => l.id !== id));
    });
  }, []);

  return { links, addLink, removeLink };
}
