import { useState } from 'react';
import { useLinks } from '../hooks/useLinks.js';

export default function LinksWidget() {
  const { links, addLink, removeLink } = useLinks();
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');

  const submit = e => {
    e.preventDefault();
    if (!label.trim() || !url.trim()) return;
    // The kiosk's own standalone window should keep running underneath —
    // a real new tab/window, not a navigation away from the dashboard.
    addLink(label.trim(), url.trim()).then(() => {
      setLabel('');
      setUrl('');
    });
  };

  const open = link => window.open(link.url, '_blank', 'noopener,noreferrer');

  return (
    <section className="widget widget-links">
      <h2 className="widget-title">Quick Links</h2>
      {links === null ? (
        <div className="widget-loading">Loading links…</div>
      ) : links.length === 0 ? (
        <div className="widget-empty">No links yet.</div>
      ) : (
        <div className="link-grid">
          {links.map(link => (
            <div className="link-tile" key={link.id}>
              <button type="button" className="link-open" onClick={() => open(link)}>
                <span className="link-icon">{link.icon}</span>
                <span className="link-label">{link.label}</span>
              </button>
              <button type="button" className="link-remove" aria-label={`Remove ${link.label}`} onClick={() => removeLink(link.id)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <form className="link-add" onSubmit={submit}>
        <input type="text" placeholder="Label" value={label} onChange={e => setLabel(e.target.value)} />
        <input type="text" placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} />
        <button type="submit" disabled={!label.trim() || !url.trim()}>Add</button>
      </form>
    </section>
  );
}
