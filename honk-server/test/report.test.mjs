import test   from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

process.env.HONK_DATA_DIR = mkdtempSync(join(tmpdir(), 'honk-report-'));

const brand = await import('../lib/brand.js');
const { record: auditRecord } = await import('../lib/audit.js');
const { hashContent } = await import('../lib/hash.js');
const { contentCheck, formatContentCheck, AGENT_GATES } = await import('../lib/report.js');

brand.set({ policy: { disclosures: { always: [], sponsored: ['#ad'] }, banned_topics: [] } }, 'acme');

test('clean content passes with the agent checklist attached', () => {
  const r = contentCheck('bluesky', { text: 'hello world' }, 'acme');
  assert.equal(r.verdict, 'pass');
  assert.equal(r.duplicate.hit, false);
  assert.deepEqual(r.agentGates, AGENT_GATES);
  assert.match(formatContentCheck(r), /PASS/);
  assert.match(formatContentCheck(r), /☐/);
});

test('a sponsored post missing its disclosure BLOCKS', () => {
  const r = contentCheck('bluesky', { text: 'buy now' }, 'acme', { sponsored: true });
  assert.equal(r.verdict, 'block');
  assert.match(r.errors.join(), /disclosure "#ad"/);
  assert.match(formatContentCheck(r), /BLOCK/);
});

test('an over-limit payload blocks via platform validation', () => {
  const r = contentCheck('bluesky', { text: 'x'.repeat(400) }, 'acme');
  assert.equal(r.verdict, 'block');
});

test('a recent identical publish downgrades to WARN with detail', () => {
  const content = { text: 'once only' };
  auditRecord({ platform: 'bluesky', account: 'acme', source: 'direct', status: 'published', content_hash: hashContent(content), result: 'ok' });
  const r = contentCheck('bluesky', content, 'acme');
  assert.equal(r.verdict, 'warn');
  assert.equal(r.duplicate.hit, true);
  assert.match(r.warnings.join(), /Possible duplicate/);
});

test('a past scheduled_at warns; a future one with offset does not', () => {
  const past = contentCheck('bluesky', { text: 'schedule me' }, 'acme', { scheduled_at: '2020-01-01T10:00:00+00:00' });
  assert.equal(past.verdict, 'warn');
  assert.match(past.warnings.join(), /in the past/);
  const future = contentCheck('bluesky', { text: 'schedule me later' }, 'acme', { scheduled_at: '2099-01-01T10:00:00+00:00' });
  assert.equal(future.verdict, 'pass');
});

test('policy falls back to the ACTIVE account when none is given (INIT-006 parity)', () => {
  brand.setActive('acme');
  try {
    const r = contentCheck('bluesky', { text: 'buy now' }, '', { sponsored: true });
    assert.equal(r.verdict, 'block');
    assert.match(r.notes.join(), /active brand account "acme"/);
  } finally { brand.setActive(''); }
});
