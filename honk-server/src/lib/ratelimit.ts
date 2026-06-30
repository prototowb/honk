import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dataFile } from './paths.js';
import type { RateLimitEntry } from './types.js';

// Lightweight rate-limit tracker. Adapters throw errors shaped like
// "X API 429: ...", so we detect rate-limit responses from the error message
// and tally them per platform. This is observational only — it records what the
// platforms told us, it does not yet gate sending. Unverified against live APIs
// (no credential testing yet); the detection is heuristic on the error text.

function file(): string {
  return dataFile('ratelimit.json');
}

function load(): Record<string, RateLimitEntry> {
  if (!existsSync(file())) return {};
  try { return JSON.parse(readFileSync(file(), 'utf8')) as Record<string, RateLimitEntry>; }
  catch { return {}; }
}

function save(data: Record<string, RateLimitEntry>): void {
  try { writeFileSync(file(), JSON.stringify(data, null, 2)); }
  catch { /* never break a publish over a tracking write */ }
}

const RATE_LIMIT_RE = /\b429\b|rate.?limit|too many requests/i;

export function isRateLimitError(err: unknown): boolean {
  return RATE_LIMIT_RE.test((err as Error)?.message || String(err || ''));
}

export function note(platform: string, message = ''): RateLimitEntry {
  const data = load();
  const now = new Date().toISOString();
  const entry: RateLimitEntry = data[platform] || { count: 0, first_seen: now, last_seen: null, last_message: null };
  entry.count += 1;
  entry.last_seen = now;
  if (message) entry.last_message = String(message).slice(0, 300);
  data[platform] = entry;
  save(data);
  return entry;
}

// Records only if the error actually looks like a rate-limit response.
export function noteFromError(platform: string, err: unknown): RateLimitEntry | null {
  if (!isRateLimitError(err)) return null;
  return note(platform, (err as Error)?.message || '');
}

export function status(): Record<string, RateLimitEntry> {
  return load();
}
