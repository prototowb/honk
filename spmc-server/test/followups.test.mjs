import test   from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Isolate state to a throwaway dir before importing the modules under test.
process.env.SPMC_DATA_DIR = mkdtempSync(join(tmpdir(), 'spmc-followups-'));

const followups = await import('../lib/followups.js');
const { extractPostId } = await import('../lib/analytics.js');

test('extractPostId maps each supported platform’s raw payload', () => {
  assert.equal(extractPostId('instagram', { id: '111' }), '111');
  assert.equal(extractPostId('facebook',  { post_id: '222' }), '222');
  assert.equal(extractPostId('facebook',  { id: '333' }), '333');       // fallback
  assert.equal(extractPostId('threads',   { id: '444' }), '444');
  assert.equal(extractPostId('x',         { id: '555' }), null);        // unsupported
  assert.equal(extractPostId('instagram', null), null);
});

test('schedule no-ops for unsupported platforms and missing ids', () => {
  assert.equal(followups.schedule({ platform: 'x',       raw: { id: '1' } }), null);
  assert.equal(followups.schedule({ platform: 'bluesky', raw: { uri: 'at://x' } }), null);
  assert.equal(followups.schedule({ platform: 'instagram', raw: {} }), null);
  assert.equal(followups.list().length, 0);
});

test('schedule creates a future-due job for a supported platform', () => {
  const job = followups.schedule({ platform: 'instagram', raw: { id: 'M1' }, account: 'brand' });
  assert.ok(job);
  assert.equal(job.platform, 'instagram');
  assert.equal(job.post_id, 'M1');
  assert.equal(job.account, 'brand');
  assert.equal(job.attempts, 0);
  // Default delay (~24h) → not yet due.
  assert.equal(followups.due(Date.now()).length, 0);
  // Due once we look far enough ahead.
  assert.equal(followups.due(Date.now() + followups.DEFAULT_DELAY_MS + 1000).length, 1);
});

test('runDue fetches due jobs and removes them on success', async () => {
  // Fresh, already-due job.
  followups.schedule({ platform: 'threads', raw: { id: 'T1' }, delay: -1000 });
  const calls = [];
  const r = await followups.runDue({ fetch: async (p, id, acct) => { calls.push([p, id, acct]); } });
  assert.equal(r.succeeded, 1);
  assert.equal(r.failed, 0);
  assert.deepEqual(calls.at(-1), ['threads', 'T1', '']);
  // The threads job is gone; the earlier instagram job (not yet due) remains.
  assert.equal(followups.list().some(j => j.post_id === 'T1'), false);
});

test('runDue backs off on failure, then drops after MAX_ATTEMPTS', async () => {
  followups.schedule({ platform: 'facebook', raw: { post_id: 'F1' }, delay: -1000 });
  const failing = async () => { throw new Error('insights not ready'); };
  const farFuture = () => Date.now() + 10 * followups.RETRY_DELAY_MS;

  // Attempts 1..MAX_ATTEMPTS-1 back the job off but keep it.
  for (let i = 1; i < followups.MAX_ATTEMPTS; i++) {
    const r = await followups.runDue({ now: farFuture(), fetch: failing });
    assert.equal(r.failed, 1, `attempt ${i} should fail`);
    assert.equal(r.dropped, 0);
    assert.equal(followups.list().some(j => j.post_id === 'F1'), true);
  }
  // Final attempt drops it.
  const last = await followups.runDue({ now: farFuture(), fetch: failing });
  assert.equal(last.dropped, 1);
  assert.equal(followups.list().some(j => j.post_id === 'F1'), false);
});
