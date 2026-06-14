import test   from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Isolate state to a throwaway dir before importing the module under test.
process.env.SPMC_DATA_DIR = mkdtempSync(join(tmpdir(), 'spmc-audit-'));
const { record, read } = await import('../lib/audit.js');

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
