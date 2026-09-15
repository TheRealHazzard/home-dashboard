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
  `links.js`, `lights.js` (the smart-home-dashboard proxy).
- `config/config.json` — your real location and smart-home-dashboard URL
  (gitignored; `config.example.json` is the committed template).
- `data/` — tasks.json / links.json, this device's own data (gitignored).
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
