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
