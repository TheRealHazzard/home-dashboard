# Home Dashboard

An always-on kiosk dashboard for a mounted tablet/screen: the time and
today's weather, a short agenda, a quick-links launcher, and (through a
proxy) smart-home lighting control.

## Setup

```
npm install
cp config/config.example.json config/config.json
```

Edit `config/config.json`:
- `location.lat` / `location.lon` — your coordinates. Look them up, or use
  Open-Meteo's free geocoding endpoint:
  `https://geocoding-api.open-meteo.com/v1/search?name=<your city>&count=1`
- `location.units` — `"fahrenheit"` or `"celsius"`.
- `smartHome.baseUrl` — where
  [`smart-home-dashboard`](../smart-home-dashboard) is running, if you
  want the lighting widget. It's a separate project/process — start it
  with its own `npm start` alongside this one. Leave the default in place
  and the lights widget just shows "unreachable" until it's running.

Then:

```
npm start
```

It prints the URL to open — `http://localhost:3200`, or the LAN address
to reach it from the actual kiosk device.

For local development with hot reload, run the server and the Vite dev
server side by side (two terminals): `npm start` and `npm run dev`.

## Connecting Spotify

The Spotify widget shows what's currently playing (read-only, no
playback controls). It needs a one-time OAuth connection:

1. Create an app at the [Spotify Developer
   Dashboard](https://developer.spotify.com/dashboard) → "Create app".
2. Add this exact **Redirect URI**: `http://127.0.0.1:3200/auth/spotify/callback`
   (Spotify requires the literal `127.0.0.1`, not `localhost`, for a
   plain-http redirect). Check "Web API" under the APIs used, save.
3. On the app's Settings page, copy the **Client ID**, and click "View
   client secret" for the **Client Secret**.
4. Paste both into `config/config.json`'s `spotify.clientId` /
   `spotify.clientSecret`.
5. With the server running, visit **`http://127.0.0.1:3200`** (not the
   LAN address — it has to match the redirect URI you registered) and
   click "Connect Spotify" on the widget. Approve access, and you're
   done — the app persists a refresh token and keeps itself signed in
   from then on, including across restarts.

If the connection is ever revoked from Spotify's side, the widget just
shows "Connect Spotify" again — no error, no restart needed.

## Installing on the kiosk device (optional)

PWA install (full-screen, no browser chrome) needs HTTPS. Once
[mkcert](https://github.com/FiloSottile/mkcert) is installed:

```
npm run cert:lan
```

Then visit `https://<lan-ip>:3543` on the kiosk device and install it to
the home screen.

## Project layout

- `server.js` — plain Node `http`/`https`, no framework. Serves the built
  React app and every `/api/*` route.
- `server/` — one file per concern: `config.js`, `jsonStore.js` (atomic
  JSON-file persistence for tasks/links), `weather.js`, `tasks.js`,
  `links.js`, `lights.js` (the smart-home-dashboard proxy), `spotify.js`
  (OAuth + now-playing).
- `config/config.json` — your real location, smart-home-dashboard URL,
  and Spotify app credentials (gitignored; `config.example.json` is the
  committed template).
- `data/` — tasks.json / links.json / spotify-token.json, this device's
  own data (gitignored).
- `client/` — the React kiosk UI (Vite).
- `tools/` — `gen-lan-cert.js` (LAN HTTPS setup), `make-icons.js` (PWA
  icons).

## Why no database

Tasks and links are a personal to-do list and a handful of launcher
tiles — plain JSON files (written atomically: temp file + rename) cover
that fully without a database engine to install, back up, or migrate.

## Why no real-time sync

This is a single always-on device, not a multi-client app like
botc-night — there's no "another viewer" to keep in sync with, so
widgets just poll on a timer instead of needing a push channel.
