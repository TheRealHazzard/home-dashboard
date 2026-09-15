'use strict';

const path = require('path');
const crypto = require('crypto');
const { readJson, writeJsonSafe } = require('./jsonStore');
const { HttpError } = require('./httpError');

const DATA_PATH = path.join(__dirname, '..', 'data', 'links.json');

function load() {
  return readJson(DATA_PATH, { links: [] }).links;
}

function save(links) {
  writeJsonSafe(DATA_PATH, { links });
}

function validateUrl(url) {
  try {
    // eslint-disable-next-line no-new
    new URL(url);
  } catch {
    throw new HttpError(400, 'url must be a valid, absolute URL');
  }
}

function listLinks() {
  return load().sort((a, b) => a.order - b.order);
}

function createLink({ label, url, icon = '🔗', order }) {
  if (!label || !label.trim()) throw new HttpError(400, 'label is required');
  if (!url) throw new HttpError(400, 'url is required');
  validateUrl(url);
  const links = load();
  const link = {
    id: crypto.randomBytes(6).toString('hex'),
    label: label.trim(),
    url,
    icon,
    order: order ?? links.length,
    createdAt: Date.now(),
  };
  links.push(link);
  save(links);
  return link;
}

function updateLink(id, patch) {
  if (patch.url !== undefined) validateUrl(patch.url);
  const links = load();
  const index = links.findIndex(l => l.id === id);
  if (index === -1) return null;
  const updated = { ...links[index], ...patch, id };
  links[index] = updated;
  save(links);
  return updated;
}

function removeLink(id) {
  const links = load();
  const next = links.filter(l => l.id !== id);
  if (next.length === links.length) return false;
  save(next);
  return true;
}

module.exports = { listLinks, createLink, updateLink, removeLink };
