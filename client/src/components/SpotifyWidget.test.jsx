import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SpotifyWidget from './SpotifyWidget.jsx';
import { mockFetch } from '../../test/fetchMock.js';

describe('SpotifyWidget', () => {
  it('shows a loading state before the first poll resolves', () => {
    mockFetch({ '/api/spotify/now-playing': () => new Promise(() => {}) });
    render(<SpotifyWidget />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows a Connect Spotify link (a real navigation, not a fetch) when not connected', async () => {
    mockFetch({ '/api/spotify/now-playing': { connected: false } });
    render(<SpotifyWidget />);
    const link = await screen.findByRole('link', { name: 'Connect Spotify' });
    expect(link).toHaveAttribute('href', '/auth/spotify/login');
  });

  it('shows "Nothing playing" when connected but idle', async () => {
    mockFetch({ '/api/spotify/now-playing': { connected: true, playing: false } });
    render(<SpotifyWidget />);
    expect(await screen.findByText('Nothing playing.')).toBeInTheDocument();
  });

  it('shows the track, artist, and album art when something is playing', async () => {
    mockFetch({
      '/api/spotify/now-playing': {
        connected: true, playing: true,
        track: 'Instant Crush', artist: 'Daft Punk, Julian Casablancas',
        album: 'Random Access Memories', albumArt: 'https://i.scdn.co/image/abc123',
        progressMs: 1000, durationMs: 337000,
      },
    });
    render(<SpotifyWidget />);
    expect(await screen.findByText('Instant Crush')).toBeInTheDocument();
    expect(screen.getByText('Daft Punk, Julian Casablancas')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Random Access Memories' })).toHaveAttribute('src', 'https://i.scdn.co/image/abc123');
  });

  it('renders without an album art image when none is available', async () => {
    mockFetch({
      '/api/spotify/now-playing': {
        connected: true, playing: true, track: 'A Podcast Episode', artist: 'Some Show', album: null, albumArt: null,
      },
    });
    render(<SpotifyWidget />);
    expect(await screen.findByText('A Podcast Episode')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
