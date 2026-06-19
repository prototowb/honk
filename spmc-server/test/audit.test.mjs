import test   from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Isolate state to a throwaway dir before importing the module under test.
process.env.SPMC_DATA_DIR = mkdtempSync(join(tmpdir(), 'spmc-audit-'));
const { record, read, recentDuplicate } = await import('../lib/audit.js');

test('records entries and reads them back most-recent-first', () => {
  record({ platform: 'x',       account: null,    source: 'direct', status: 'published', content_hash: 'abc' });
  record({ platform: 'bluesky', account: 'brand', source: 'queue',  status: 'failed', error: 'boom', content_hash: 'def' });

  const all = read();
  assert.equal(all.length, 2);
  assert.equal(all[0].platform, 'bluesky');
  assert.ok(all[0].ts);
});

test('filters by status', () => {
  const failed = read({ status: 'failed' });
  assert.equal(failed.length, 1);
  assert.equal(failed[0].error, 'boom');
});

test('filters by platform and respects limit', () => {
  assert.equal(read({ platform: 'x' }).length, 1);
  assert.equal(read({ limit: 1 }).length, 1);
});

test('recentDuplicate matches a recent published hash, scoped by platform and window', () => {
  record({ platform: 'threads', account: null, source: 'direct', status: 'published', content_hash: 'dupe', result: 'Threads post published! ID: 9' });
  assert.ok(recentDuplicate({ platform: 'threads', content_hash: 'dupe' }));      // found
  assert.equal(recentDuplicate({ platform: 'threads', content_hash: 'other' }), null); // no hash match
  assert.equal(recentDuplicate({ platform: 'x', content_hash: 'dupe' }), null);   // platform-scoped
  assert.equal(recentDuplicate({ platform: 'threads', content_hash: 'dupe', withinMs: 0 }), null); // outside window
  // a failed publish with the same hash is not a "duplicate" (only successes count)
  record({ platform: 'threads', account: null, source: 'direct', status: 'failed', content_hash: 'failhash' });
  assert.equal(recentDuplicate({ platform: 'threads', content_hash: 'failhash' }), null);
});
