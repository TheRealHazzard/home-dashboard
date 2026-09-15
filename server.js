'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { HttpError } = require('./server/httpError');
const config = require('./server/config');
const { getWeather } = require('./server/weather');
const tasksStore = require('./server/tasks');
const linksStore = require('./server/links');
const lights = require('./server/lights');

const PORT = process.env.PORT || 3200;
// A second, HTTPS listener alongside the plain one — installability (the
// service worker, "Add to Home Screen") needs a secure context, which a
// bare LAN IP over http:// never counts as. Entirely opt-in: `npm run
// cert:lan` (tools/gen-lan-cert.js) generates the files this loads below;
// until that's been run, this whole block is a no-op. Deliberately NOT
// botc-night's/smart-home-dashboard's shared 3000/3443 default — this app
// is meant to run alongside smart-home-dashboard on the same machine.
const HTTPS_PORT = process.env.HTTPS_PORT || 3543;
const PUBLIC = path.join(__dirname, 'public');

/* ------------------------------------------------------------- static */

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
};

function serveFile(res, file) {
  const full = path.join(PUBLIC, file);
  // The trailing separator is what actually confines this to PUBLIC's own
  // contents — a bare startsWith(PUBLIC) would also pass for a sibling
  // directory whose name happens to start with "public".
  if (!full.startsWith(PUBLIC + path.sep)) { res.writeHead(403).end('Forbidden'); return; }
  fs.readFile(full, (err, buf) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
    res.end(buf);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => {
      data += c;
      if (data.length > 1e6) { req.destroy(); reject(new Error('Body too large')); }
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function json(res, code, payload) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

/* --------------------------------------------------------------- routes */

// Tasks and links are both "a JSON-file-backed list with the same four
// routes" — GET list, POST create, PATCH/DELETE by id — so one generic
// handler serves both instead of duplicating the route-matching twice.
const CRUD_RESOURCES = [
  { basePath: '/api/tasks', listKey: 'tasks', notFoundLabel: 'Task', store: {
    list: tasksStore.listTasks, create: tasksStore.createTask, update: tasksStore.updateTask, remove: tasksStore.removeTask,
  } },
  { basePath: '/api/links', listKey: 'links', notFoundLabel: 'Link', store: {
    list: linksStore.listLinks, create: linksStore.createLink, update: linksStore.updateLink, remove: linksStore.removeLink,
  } },
];

/** Returns true once it has written a response (matched this resource),
    false if `route`/`req.method` belong to something else entirely — lets
    requestHandler just try each resource in turn and fall through. */
async function handleCrudResource(req, res, route, { basePath, listKey, store, notFoundLabel }) {
  if (route === basePath) {
    if (req.method === 'GET') { json(res, 200, { [listKey]: store.list() }); return true; }
    if (req.method === 'POST') { const body = await readBody(req); json(res, 201, store.create(body)); return true; }
  }
  const match = route.match(new RegExp(`^${basePath}/([^/]+)$`));
  if (match) {
    const id = match[1];
    if (req.method === 'PATCH') {
      const body = await readBody(req);
      const updated = store.update(id, body);
      updated ? json(res, 200, updated) : json(res, 404, { error: `${notFoundLabel} not found` });
      return true;
    }
    if (req.method === 'DELETE') {
      const removed = store.remove(id);
      removed ? res.writeHead(204).end() : json(res, 404, { error: `${notFoundLabel} not found` });
      return true;
    }
  }
  return false;
}

async function requestHandler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const route = url.pathname;

  try {
    if (route === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true, time: Date.now() });

    if (route === '/api/weather' && req.method === 'GET') {
      const weather = await getWeather(config);
      return json(res, 200, { location: config.location, units: config.location.units, ...weather });
    }

    for (const resource of CRUD_RESOURCES) {
      if (await handleCrudResource(req, res, route, resource)) return;
    }

    if (route === '/api/lights/devices' && req.method === 'GET') {
      return json(res, 200, await lights.listDevices(config));
    }
    const lightIdMatch = route.match(/^\/api\/lights\/devices\/([^/]+)$/);
    if (lightIdMatch && req.method === 'GET') {
      return json(res, 200, await lights.getDevice(config, lightIdMatch[1]));
    }
    const lightActionMatch = route.match(/^\/api\/lights\/devices\/([^/]+)\/(power|brightness|color)$/);
    if (lightActionMatch && req.method === 'POST') {
      const [, id, action] = lightActionMatch;
      const body = await readBody(req);
      try {
        const state = action === 'power' ? await lights.setPower(config, id, Boolean(body.on))
          : action === 'brightness' ? await lights.setBrightness(config, id, body.brightness)
          : await lights.setColor(config, id, body);
        return json(res, 200, { id, state });
      } catch (err) {
        return json(res, 503, { error: 'lights-offline', offline: true, message: err.message });
      }
    }

    if (req.method === 'GET') {
      // Explicit route (not the generic static fallback below) so this
      // always carries Cache-Control: no-cache — see the sw.js comment in
      // Phase F for why a stale cached service-worker script is a real,
      // previously-hit failure mode worth guarding against from day one.
      if (route === '/sw.js') {
        res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-cache' });
        return fs.createReadStream(path.join(PUBLIC, 'sw.js')).pipe(res);
      }

      if (route === '/' || route === '/index.html') return serveFile(res, 'dist/index.html');

      // Generic static fallback — everything else under public/ (manifest,
      // icons, and the built app's own hashed asset files) at the same
      // path it lives on disk.
      return serveFile(res, route.replace(/^\//, ''));
    }

    if (req.method === 'OPTIONS') return res.writeHead(204).end();

    res.writeHead(404).end('Not found');
  } catch (err) {
    if (err instanceof HttpError) return json(res, err.status, { error: err.message });
    console.error(err);
    json(res, 500, { error: 'Internal error' });
  }
}

/* ----------------------------------------------------------------- boot */

const server = http.createServer(requestHandler);

let httpsServer = null;
try {
  const key = fs.readFileSync(path.join(__dirname, 'certs', 'lan-key.pem'));
  const cert = fs.readFileSync(path.join(__dirname, 'certs', 'lan-cert.pem'));
  httpsServer = https.createServer({ key, cert }, requestHandler);
} catch { /* no local cert generated yet — run `npm run cert:lan` */ }

const VIRTUAL_ADAPTER = /vethernet|virtual|vmware|hyper-v|docker|wsl|tailscale|zerotier|tap-|tun\d|utun|npcap|ppp|loopback/i;

function lanCandidates() {
  const candidates = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) candidates.push({ name, address: net.address });
    }
  }
  return candidates;
}

function lanAddress() {
  const candidates = lanCandidates();
  if (!candidates.length) return 'localhost';
  const real = candidates.find(c => !VIRTUAL_ADAPTER.test(c.name));
  return (real || candidates[0]).address;
}

server.listen(PORT, () => {
  const candidates = lanCandidates();
  const ip = lanAddress();
  console.log('');
  console.log('  Home dashboard is up.');
  console.log('');
  console.log(`  On this machine :  http://localhost:${PORT}`);
  console.log(`  On the LAN      :  http://${ip}:${PORT}`);
  if (httpsServer) {
    console.log(`  Installable     :  https://${ip}:${HTTPS_PORT}`);
    console.log(`  New device? Visit http://${ip}:${PORT}/ca.pem first and trust it once.`);
  } else {
    console.log('  No local HTTPS cert yet — install prompts need one. Run: npm run cert:lan');
  }
  if (candidates.length > 1) {
    console.log('');
    console.log('  Other network adapters found on this machine:');
    candidates.forEach(c => console.log(`    ${c.address}  (${c.name})${c.address === ip ? '  <- chosen' : ''}`));
  }
  console.log('');
});

if (httpsServer) {
  httpsServer.on('error', err => console.error('HTTPS server failed to start:', err.message));
  httpsServer.listen(HTTPS_PORT);
}
