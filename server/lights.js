'use strict';

// Proxies to smart-home-dashboard's own REST API (a separate,
// independently-runnable project — see config.smartHome.baseUrl) rather
// than importing its adapters directly, so the two projects stay fully
// decoupled: neither can break the other, and this one degrades cleanly
// (an "offline" widget state, never a crash) whenever smart-home-
// dashboard just isn't running.

const TIMEOUT_MS = 3000;

let lastKnownDevices = [];

async function call(config, method, subPath, body) {
  const url = `${config.smartHome.baseUrl}/api/devices${subPath}`;
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`smart-home-dashboard returned ${res.status}`);
  return res.json();
}

/** A momentarily offline lighting service grays out the last-seen tiles
    (with an "unreachable" badge) instead of blanking the whole widget —
    this never throws. */
async function listDevices(config) {
  try {
    const devices = await call(config, 'GET', '');
    lastKnownDevices = devices;
    return { offline: false, devices };
  } catch {
    return { offline: true, devices: lastKnownDevices };
  }
}

async function getDevice(config, id) {
  try {
    const device = await call(config, 'GET', `/${id}`);
    return { offline: false, device };
  } catch {
    return { offline: true, device: null };
  }
}

// A mutation is a real user intent (they tapped a toggle) — surfacing it
// as a visible failure is correct here, unlike the GET routes' silent
// last-known-cache fallback.
async function setPower(config, id, on) {
  return call(config, 'POST', `/${id}/power`, { on });
}

async function setBrightness(config, id, brightness) {
  return call(config, 'POST', `/${id}/brightness`, { brightness });
}

async function setColor(config, id, color) {
  return call(config, 'POST', `/${id}/color`, color);
}

module.exports = { listDevices, getDevice, setPower, setBrightness, setColor };
