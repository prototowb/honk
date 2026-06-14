import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dataFile } from './paths.js';

import * as instagram from '../adapters/instagram.js';
import * as facebook  from '../adapters/facebook.js';
import * as threads   from '../adapters/threads.js';

// Engagement-metric ingestion. Each fetch routes to the platform adapter's
// getMetrics() and appends a timestamped snapshot to a local store, so you can
// track a post's performance over time.
//
// UNVERIFIED: the adapter insights calls have not been exercised against live
// APIs (credential testing is deferred). X, TikTok, and Bluesky have no
// getMetrics yet — their insights APIs need a higher access tier or aren't
// exposed. The store, routing, and tools are real; only live confirmation is
// pending.

const SUPPORTED = { instagram, facebook, threads };

export const SUPPORTED_PLATFORMS = Object.keys(SUPPORTED);

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
