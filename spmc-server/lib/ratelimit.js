import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dataFile } from './paths.js';

// Lightweight rate-limit tracker. Adapters throw errors shaped like
// "X API 429: ...", so we detect rate-limit responses from the error message
// and tally them per platform. This is observational only — it records what the
// platforms told us, it does not yet gate sending. Unverified against live APIs
// (no credential testing yet); the detection is heuristic on the error text.

function file() {
  return dataFile('ratelimit.json');
}

function load() {
  if (!existsSync(file())) return {};
  try { return JSON.parse(readFileSync(file(), 'utf8')); }
  catch { return {}; }
}

function save(data) {
  try { writeFileSync(file(), JSON.stringify(data, null, 2)); }
  catch { /* never break a publish over a tracking write */ }
}

const RATE_LIMIT_RE = /\b429\b|rate.?limit|too many requests/i;

export function isRateLimitError(err) {
  return RATE_LIMIT_RE.test(err?.message || String(err || ''));
}

export function note(platform, message = '') {
  const data = load();
  const now = new Date().toISOString();
  const entry = data[platform] || { count: 0, first_seen: now, last_seen: null, last_message: null };
  entry.count += 1;
  entry.last_seen = now;
  if (message) entry.last_message = String(message).slice(0, 300);
  data[platform] = entry;
  save(data);
  return entry;
}

// Records only if the error actually looks like a rate-limit response.
export function noteFromError(platform, err) {
  if (!isRateLimitError(err)) return null;
  return note(platform, err?.message || '');
}

export function status() {
  return load();
}
