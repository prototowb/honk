import test   from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Isolate state before importing anything that resolves dataFile().
process.env.HONK_DATA_DIR = mkdtempSync(join(tmpdir(), 'spmc-dispatch-'));

const brand      = await import('../lib/brand.js');
const queue      = await import('../queue/store.js');
const { validateWithPolicy } = await import('../lib/policy-gate.js');
const { publishAudited }     = await import('../lib/dispatch.js');
const { read: auditRead }    = await import('../lib/audit.js');

// A brand account whose policy requires "#ad" on sponsored posts (INIT-005).
brand.set({ policy: { disclosures: { always: [], sponsored: ['#ad'] }, banned_topics: [] } }, 'acme');

// ── policy-gate: the shared validate + policy layer ──────────────────────────

test('validateWithPolicy blocks a sponsored post missing its disclosure', () => {
  const v = validateWithPolicy('bluesky', { text: 'buy now' }, 'acme', { sponsored: true });
  assert.equal(v.ok, false);
  assert.match(v.errors.join(), /disclosure "#ad"/);
});

test('validateWithPolicy passes a sponsored post that includes the disclosure', () => {
  const v = validateWithPolicy('bluesky', { text: 'buy now #ad' }, 'acme', { sponsored: true });
  assert.equal(v.ok, true);
});

test('validateWithPolicy does not enforce sponsored disclosure when not flagged', () => {
  const v = validateWithPolicy('bluesky', { text: 'buy now' }, 'acme', { sponsored: false });
  assert.equal(v.ok, true);
});

test('validateWithPolicy is null-safe for an account with no policy', () => {
  const v = validateWithPolicy('bluesky', { text: 'hi' }, 'nobody', { sponsored: true });
  assert.equal(v.ok, true);
});

// ── queue store persists the sponsored flag ──────────────────────────────────

test('queue.add persists the sponsored flag; defaults to false', () => {
  const flagged = queue.add('bluesky', { text: 'ad' }, null, 'acme', 'pending', true);
  assert.equal(queue.get(flagged.id).sponsored, true);

  const plain = queue.add('bluesky', { text: 'no ad' }, null, 'acme', 'pending');
  assert.equal(queue.get(plain.id).sponsored, false);
});

// ── the dispatch chokepoint enforces policy before any network call ──────────

test('publishAudited blocks a sponsored post missing its disclosure before publishing', async () => {
  await assert.rejects(
    () => publishAudited('bluesky', { text: 'buy now' }, 'acme', { source: 'scheduler', sponsored: true }),
    /Blocked before publish/,
  );
  // A blocked dispatch is recorded as a failed audit entry, not silently dropped.
  const failed = auditRead().filter(e => e.status === 'failed');
  assert.ok(failed.some(e => /Blocked before publish/.test(e.error || '')), 'expected a failed audit entry for the blocked dispatch');
});
