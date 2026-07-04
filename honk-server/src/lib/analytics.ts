import { readFileSync, existsSync } from 'fs';
import { writeJsonAtomic } from './jsonstore.js';
import { dataFile } from './paths.js';
import type { AnalyticsSnapshot } from './types.js';

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

const SUPPORTED: Record<string, { getMetrics: (postId: string, account: string) => Promise<Record<string, unknown>> }> = { instagram, facebook, threads };

export const SUPPORTED_PLATFORMS = Object.keys(SUPPORTED);

// Map a publish result's raw payload to the platform post/media ID that the
// insights API expects. Returns null when no ID is extractable (e.g. an
// unsupported platform or an unexpected payload shape). Mirrors the id fields
// the dispatcher reads in its per-platform summaries.
export function extractPostId(platform: string, raw: Record<string, unknown> | null | undefined): string | null {
  if (!raw) return null;
  switch (platform) {
    case 'instagram': return (raw.id as string) || null;
    case 'facebook':  return (raw.post_id as string) || (raw.id as string) || null;
    case 'threads':   return (raw.id as string) || null;
    default:          return null;
  }
}

function file(): string {
  return dataFile('analytics.json');
}

function load(): AnalyticsSnapshot[] {
  if (!existsSync(file())) return [];
  try { return JSON.parse(readFileSync(file(), 'utf8')) as AnalyticsSnapshot[]; }
  catch { return []; }
}

function save(items: AnalyticsSnapshot[]): void {
  try { writeJsonAtomic(file(), items); }
  catch { /* tracking write must not throw into a tool call */ }
}

export function record(platform: string, postId: string, metrics: Record<string, unknown>, account = ''): AnalyticsSnapshot {
  const items = load();
  const snapshot: AnalyticsSnapshot = { ts: new Date().toISOString(), platform, account: account || null, post_id: postId, metrics };
  items.push(snapshot);
  save(items);
  return snapshot;
}

export async function fetchMetrics(platform: string, postId: string, account = ''): Promise<Record<string, unknown>> {
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

export function report({ platform, post_id, limit = 50 }: {
  platform?: string;
  post_id?: string;
  limit?: number;
} = {}): AnalyticsSnapshot[] {
  let items = load();
  if (platform) items = items.filter(i => i.platform === platform);
  if (post_id)  items = items.filter(i => i.post_id === post_id);
  return items.slice(-limit).reverse();
}
