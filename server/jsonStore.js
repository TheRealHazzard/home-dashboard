'use strict';

const fs = require('fs');
const path = require('path');

/** Reads a JSON file, falling back cleanly (never throwing) when it's
    missing or malformed — a fresh clone with no data/ directory yet, or a
    file a human broke by hand-editing, both just behave like "empty". */
function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

// Deliberately synchronous, start to finish (readFileSync/writeFileSync/
// renameSync, never fs.promises) — a route handler's read-modify-write has
// no `await` in the middle, so Node's single-threaded event loop can never
// interleave two requests and race each other. That's the actual mutex
// protecting these files; switching any of this to async would silently
// reintroduce a lost-update bug the moment two writes land back to back.
function writeJsonSafe(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  // renameSync is atomic on the same filesystem (NTFS included) — a crash
  // mid-write leaves either the old complete file or the new one, never a
  // truncated one.
  fs.renameSync(tmpPath, filePath);
}

module.exports = { readJson, writeJsonSafe };
