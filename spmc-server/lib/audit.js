import { appendFileSync, readFileSync, existsSync } from 'fs';
import { dataFile } from './paths.js';

// Append-only audit trail. One JSON object per line (JSONL) so it is trivially
// appendable and survives partial writes. Records every publish attempt
// (success, failure, and dry-run) with a content hash rather than the payload.

function file() {
  return dataFile('audit.log');
}

export function record(entry) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
  try {
    appendFileSync(file(), line + '\n');
  } catch {
    // Auditing must never take down a publish. Swallow write errors.
  }
}

export function read({ platform, status, source, limit = 50 } = {}) {
  const path = file();
  if (!existsSync(path)) return [];

  let entries = readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);

  if (platform) entries = entries.filter(e => e.platform === platform);
  if (status)   entries = entries.filter(e => e.status === status);
  if (source)   entries = entries.filter(e => e.source === source);

  return entries.slice(-limit).reverse();
}

// The most recent *successful publish* of identical content to a platform within
// a lookback window, or null. Backs duplicate_check (ALPHA-012) so an accidental
// repost can be caught before it goes out. Entries are most-recent-first, so we
// stop as soon as we pass the window.
export function recentDuplicate({ platform, content_hash, withinMs = 7 * 24 * 60 * 60 * 1000 } = {}) {
  if (!content_hash) return null;
  const cutoff = Date.now() - withinMs;
  for (const e of read({ platform, status: 'published', limit: 1000 })) {
    if (new Date(e.ts).getTime() < cutoff) break;   // beyond the window; the rest are older
    if (e.content_hash === content_hash) return e;
  }
  return null;
}
