// Account registry v1 (INIT-014) — active pointer, migration, handle cache.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let dir;
before(() => { dir = mkdtempSync(join(tmpdir(), 'honk-accounts-')); process.env.HONK_DATA_DIR = dir; });
after(() => { try { rmSync(dir, { recursive: true, force: true }); } catch {} });

const accounts = await import('../lib/accounts.js');

test('getActive defaults to empty (default account) with no store at all', () => {
  assert.equal(accounts.getActive(), '');
});

test('setActive/getActive round-trip, case preserved', () => {
  const saved = accounts.setActive('Acme');
  assert.equal(saved, 'Acme');
  assert.equal(accounts.getActive(), 'Acme'); // NOT lowercased — must match brand.json's raw-case keys
  accounts.setActive('');
  assert.equal(accounts.getActive(), '');
});

test('legacy brand-active.json seeds the active pointer when accounts.json does not exist yet', async () => {
  const legacyDir = mkdtempSync(join(tmpdir(), 'honk-accounts-legacy-'));
  const prevDir = process.env.HONK_DATA_DIR;
  process.env.HONK_DATA_DIR = legacyDir;
  writeFileSync(join(legacyDir, 'brand-active.json'), JSON.stringify({ active: 'legacy-brand' }));
  try {
    assert.equal(accounts.getActive(), 'legacy-brand');
  } finally {
    process.env.HONK_DATA_DIR = prevDir;
    rmSync(legacyDir, { recursive: true, force: true });
  }
});

test('recordHandle creates a registry row on first use', () => {
  const rec = accounts.recordHandle('brand', 'instagram', { id: '123', handle: 'brand_ig', name: 'Brand Co' });
  assert.equal(rec.handles.instagram.handle, 'brand_ig');
  assert.ok(rec.created_at);
  assert.equal(rec.created_at, rec.updated_at);
});

test('get() is case-insensitive against the account name recordHandle used', () => {
  accounts.recordHandle('CaseTest', 'facebook', { id: '456', handle: 'case_test_fb', name: 'Case Test' });
  const rec = accounts.get('casetest');
  assert.ok(rec);
  assert.equal(rec.handles.facebook.handle, 'case_test_fb');
});

test('recordHandle for a second platform merges into the same account row', () => {
  accounts.recordHandle('multi', 'instagram', { id: '1', handle: 'multi_ig' });
  accounts.recordHandle('multi', 'facebook', { id: '2', handle: 'multi_fb' });
  const rec = accounts.get('multi');
  assert.deepEqual(Object.keys(rec.handles).sort(), ['facebook', 'instagram']);
  assert.equal(accounts.list().filter(r => r.account === 'multi').length, 1);
});

test('get() returns null for an account that was never recorded', () => {
  assert.equal(accounts.get('never-seen'), null);
});

test('the default account (empty string) stores under its own row, separate from named accounts', () => {
  accounts.recordHandle('', 'instagram', { id: '789', handle: 'default_ig' });
  const rec = accounts.get('');
  assert.equal(rec.handles.instagram.handle, 'default_ig');
  assert.ok(accounts.list().some(r => r.account === ''));
});
