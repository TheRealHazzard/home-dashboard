'use strict';

const path = require('path');
const { readJson } = require('./jsonStore');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'config.json');
const EXAMPLE_PATH = path.join(__dirname, '..', 'config', 'config.example.json');

// Falls back to config.example.json's own defaults (rather than hardcoding
// a second copy of them here) when config.json hasn't been created yet —
// the app still starts, the weather widget just won't have a real location
// until it's set up. One clear warning at boot, not a crash.
const DEFAULTS = readJson(EXAMPLE_PATH, {
  location: { lat: 0, lon: 0, label: 'Set your location', units: 'fahrenheit' },
  smartHome: { baseUrl: 'http://localhost:3000' },
});

const config = readJson(CONFIG_PATH, null);
if (!config) {
  console.log('');
  console.log('  No config/config.json found — using placeholder defaults.');
  console.log('  Copy config/config.example.json to config/config.json and fill in');
  console.log('  your real location (lat/lon) to get real weather.');
  console.log('');
}

module.exports = config || DEFAULTS;
