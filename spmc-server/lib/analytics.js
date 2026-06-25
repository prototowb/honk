import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dataFile } from './paths.js';

import * as instagram from '../adapters/instagram.js';
import * as facebook  from '../adapters/facebook.js';
import * as threads   from '../adapters/threads.js';

// Engagement-metric ingestion. Each fetch routes to the platform adapter's
// getMetrics() and appends a timestamped snapshot to a local store, so you can
// track a post's performance over time.
//
// Live status (metric names re-verified 2026-06-25 against the Meta/Threads docs):
//   • Metric names are CURRENT. The June-2026 FB Page-insights cull is
//     reach/impression/video-view only; our engagement/click/reaction set is
//     unaffected. IG dropped `impressions` for `views` earlier, so we use
//     `reach`; the IG set (reach,likes,comments,saved,shares) was fetched live on
//     2026-06-17. Threads metric names are valid but live-UNVERIFIED (no creds).
//   • The auto-follow-up loop (followups.js → scheduler) is wired and the
//     scheduler loads its own creds, but the full publish→drain→snapshot loop has
//     not been run end-to-end live. See ANALYTICS_VERIFICATION.md to verify it
//     without the 24h wait (SPMC_ANALYTICS_DELAY_MS=0).
//   • X, TikTok, Bluesky have no getMetrics — their insights need a higher access
//     tier or aren't exposed.
// The store, routing, and tools are real; what remains is the live end-to-end run.

const SUPPORTED = { instagram, facebook, threads };

export const SUPPORTED_PLATFORMS = Object.keys(SUPPORTED);

// Map a publish result's raw payload to the platform post/media ID that the
// insights API expects. Returns null when no ID is extractable (e.g. an
// unsupported platform or an unexpected payload shape). Mirrors the id fields
// the dispatcher reads in its per-platform summaries.
export function extractPostId(platform, raw) {
  if (!raw) return null;
  switch (platform) {
    case 'instagram': return raw.id || null;
    case 'facebook':  return raw.post_id || raw.id || null;
    case 'threads':   return raw.id || null;
    default:          return null;
  }
}

function file() {
  return dataFile('analytics.json');
}

function load() {
  if (!existsSync(file())) return [];
  try { return JSON.parse(readFileSync(file(), 'utf8')); }
  catch { return []; }
}

function save(items) {
  try { writeFileSync(file(), JSON.stringify(items, null, 2)); }
  catch { /* tracking write must not throw into a tool call */ }
}

export function record(platform, postId, metrics, account = '') {
  const items = load();
  const snapshot = { ts: new Date().toISOString(), platform, account: account || null, post_id: postId, metrics };
  items.push(snapshot);
  save(items);
  return snapshot;
}

export async function fetchMetrics(platform, postId, account = '') {
  const mod = SUPPORTED[platform];
  if (!mod || typeof mod.getMetrics !== 'function') {
    throw new Error(
      `Analytics not available for "${platform}" yet. Supported: ${SUPPORTED_PLATFORMS.join(', ')}.`,
    );
  }
  const metrics = await mod.getMetrics(postId, account);
  record(platform, postId, metrics, account);
  return metrics;
}

export function report({ platform, post_id, limit = 50 } = {}) {
  let items = load();
  if (platform) items = items.filter(i => i.platform === platform);
  if (post_id)  items = items.filter(i => i.post_id === post_id);
  return items.slice(-limit).reverse();
}
