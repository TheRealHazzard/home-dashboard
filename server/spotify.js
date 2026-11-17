'use strict';

const path = require('path');
const { readJson, writeJsonSafe } = require('./jsonStore');

const TOKEN_PATH = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'spotify-token.json');
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const NOW_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';
const SCOPE = 'user-read-currently-playing';
const REFRESH_BUFFER_MS = 60 * 1000; // refresh a little before real expiry, never right at it

class NotConnectedError extends Error {}

function loadToken() {
  return readJson(TOKEN_PATH, null);
}

function basicAuthHeader(config) {
  return 'Basic ' + Buffer.from(`${config.spotify.clientId}:${config.spotify.clientSecret}`).toString('base64');
}

function buildAuthorizeUrl(config, state) {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', config.spotify.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', config.spotify.redirectUri);
  url.searchParams.set('scope', SCOPE);
  url.searchParams.set('state', state);
  return url.toString();
}

async function exchangeCode(config, code) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: basicAuthHeader(config), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: config.spotify.redirectUri }),
  });
  if (!res.ok) throw new Error(`Spotify token exchange failed: ${res.status}`);
  const data = await res.json();
  writeJsonSafe(TOKEN_PATH, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });
}

async function refreshToken(config, token) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: basicAuthHeader(config), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: token.refreshToken }),
  });
  if (!res.ok) throw new Error(`Spotify token refresh failed: ${res.status}`);
  const data = await res.json();
  const updated = {
    accessToken: data.access_token,
    // Spotify doesn't always send a new refresh_token on a refresh call —
    // the docs are explicit that the app must keep the old one whenever a
    // new one isn't returned, never assume the field is static.
    refreshToken: data.refresh_token || token.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  writeJsonSafe(TOKEN_PATH, updated);
  return updated;
}

async function getValidAccessToken(config) {
  const token = loadToken();
  if (!token || !token.refreshToken) throw new NotConnectedError('Spotify not connected');
  if (Date.now() < token.expiresAt - REFRESH_BUFFER_MS) return token.accessToken;
  const updated = await refreshToken(config, token);
  return updated.accessToken;
}

let lastKnownPlaying = null;

async function getCurrentlyPlaying(config) {
  let accessToken;
  try {
    accessToken = await getValidAccessToken(config);
  } catch (err) {
    if (err instanceof NotConnectedError) return { connected: false };
    throw err;
  }

  const res = await fetch(NOW_PLAYING_URL, { headers: { Authorization: `Bearer ${accessToken}` } });

  if (res.status === 204) {
    lastKnownPlaying = { connected: true, playing: false };
    return lastKnownPlaying;
  }
  if (res.status === 401) {
    // The access token itself was rejected — since getValidAccessToken
    // always refreshes proactively before expiry, this means the grant
    // was revoked (or is otherwise invalid), not a transient fluke.
    // Clearing it sends the widget back to "Connect Spotify" instead of
    // erroring forever on a token that will never become valid again.
    writeJsonSafe(TOKEN_PATH, null);
    return { connected: false };
  }
  if (res.status === 429) {
    return lastKnownPlaying ? { ...lastKnownPlaying, stale: true } : { connected: true, playing: false, stale: true };
  }
  if (!res.ok) throw new Error(`Spotify now-playing request failed: ${res.status}`);

  const data = await res.json();
  const item = data.item;
  lastKnownPlaying = {
    connected: true,
    playing: !!data.is_playing,
    track: item?.name || null,
    artist: item?.artists ? item.artists.map(a => a.name).join(', ') : (item?.show?.name || null),
    album: item?.album?.name || null,
    albumArt: item?.album?.images?.[0]?.url || null,
    progressMs: data.progress_ms ?? null,
    durationMs: item?.duration_ms ?? null,
  };
  return lastKnownPlaying;
}

module.exports = { buildAuthorizeUrl, exchangeCode, getCurrentlyPlaying };
