import { useSpotify } from '../hooks/useSpotify.js';

export default function SpotifyWidget() {
  const data = useSpotify();

  return (
    <section className="widget widget-spotify">
      <h2 className="widget-title">Spotify</h2>
      {data === null ? (
        <div className="widget-loading">Loading…</div>
      ) : !data.connected ? (
        <div className="spotify-connect">
          <p className="widget-empty">Not connected.</p>
          {/* A real navigation to Spotify's own login page, not a fetch —
              this can't be an onClick handler. */}
          <a className="spotify-connect-link" href="/auth/spotify/login">Connect Spotify</a>
        </div>
      ) : !data.playing ? (
        <div className="widget-empty">Nothing playing.</div>
      ) : (
        <div className="spotify-now-playing">
          {data.albumArt && <img className="spotify-art" src={data.albumArt} alt={data.album || ''} />}
          <div className="spotify-track-info">
            <div className="spotify-track">{data.track}</div>
            <div className="spotify-artist">{data.artist}</div>
          </div>
        </div>
      )}
    </section>
  );
}
