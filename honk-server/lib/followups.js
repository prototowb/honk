import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dataFile } from './paths.js';
import { SUPPORTED_PLATFORMS, extractPostId, fetchMetrics } from './analytics.js';

// Deferred analytics follow-ups (ALPHA-008). After a real publish to an
// analytics-capable platform, publishAudited schedules a job here to fetch
// engagement metrics once the post has had time to accumulate them (~24h). The
// scheduler tick drains due jobs. Persisted to disk so a follow-up survives the
// short-lived MCP process (run.js) and is picked up whenever the scheduler runs.

// Default delay before the first metrics fetch. Override with
// SPMC_ANALYTICS_DELAY_MS (tests set 0 to make jobs immediately due).
export const DEFAULT_DELAY_MS = 24 * 60 * 60 * 1000;

// On a failed fetch, back the job off by this much, up to MAX_ATTEMPTS times.
export const RETRY_DELAY_MS = 60 * 60 * 1000;
export const MAX_ATTEMPTS   = 3;

function delayMs() {
  const v = Number(process.env.SPMC_ANALYTICS_DELAY_MS);
  return Number.isFinite(v) && process.env.SPMC_ANALYTICS_DELAY_MS !== '' ? v : DEFAULT_DELAY_MS;
}

function file() { return dataFile('followups.json'); }

function load() {
  if (!existsSync(file())) return [];
  try { return JSON.parse(readFileSync(file(), 'utf8')); }
  catch { return []; }
}

function save(items) {
  try { writeFileSync(file(), JSON.stringify(items, null, 2)); }
  catch { /* never break a publish over a tracking write */ }
}

let seq = 0;
function newId() {
  return `f_${Date.now().toString(36)}_${(seq++).toString(36)}`;
}

// Schedule a metrics follow-up for a freshly published post. No-ops (returns
// null) for platforms without analytics support or when no post ID is
// extractable, so callers don't need to pre-check.
export function schedule({ platform, raw, account = '', delay } = {}) {
  if (!SUPPORTED_PLATFORMS.includes(platform)) return null;
  const postId = extractPostId(platform, raw);
  if (!postId) return null;

  const now = Date.now();
  const wait = Number.isFinite(delay) ? delay : delayMs();
  const job = {
    id:         newId(),
    platform,
    post_id:    postId,
    account:    account || null,
    created_at: new Date(now).toISOString(),
    due_at:     new Date(now + wait).toISOString(),
    attempts:   0,
  };
  const items = load();
  items.push(job);
  save(items);
  return job;
}

export function list() { return load(); }

// Jobs whose due_at has passed, oldest-due first.
export function due(now = Date.now()) {
  const t = now instanceof Date ? now.getTime() : now;
  return load()
    .filter(j => new Date(j.due_at).getTime() <= t)
    .sort((a, b) => new Date(a.due_at) - new Date(b.due_at));
}

export function remove(id) {
  save(load().filter(j => j.id !== id));
}

// Record a failed attempt: drop the job after MAX_ATTEMPTS, otherwise back its
// due_at off by RETRY_DELAY_MS. Returns the job with a `dropped` flag, or null
// if the id is unknown.
export function recordFailure(id) {
  const items = load();
  const job = items.find(j => j.id === id);
  if (!job) return null;
  job.attempts = (job.attempts || 0) + 1;
  if (job.attempts >= MAX_ATTEMPTS) {
    save(items.filter(j => j.id !== id));
    return { ...job, dropped: true };
  }
  job.due_at = new Date(Date.now() + RETRY_DELAY_MS).toISOString();
  save(items);
  return { ...job, dropped: false };
}

// Drain all due follow-ups: fetch metrics for each, removing the job on success
// and backing it off (or dropping after MAX_ATTEMPTS) on failure. The metrics
// fetch is injectable so tests don't hit the network. Never throws — one bad
// job must not kill a scheduler tick.
export async function runDue({ now = Date.now(), fetch = fetchMetrics } = {}) {
  const jobs = due(now);
  const result = { processed: 0, succeeded: 0, failed: 0, dropped: 0 };
  for (const job of jobs) {
    result.processed++;
    try {
      await fetch(job.platform, job.post_id, job.account || '');
      remove(job.id);
      result.succeeded++;
    } catch {
      const r = recordFailure(job.id);
      result.failed++;
      if (r?.dropped) result.dropped++;
    }
  }
  return result;
}
