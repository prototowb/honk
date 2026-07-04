import test   from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const { writeJsonAtomic, readJsonOr } = await import('../lib/jsonstore.js');

const dir = mkdtempSync(join(tmpdir(), 'honk-jsonstore-'));

test('writeJsonAtomic round-trips and leaves no tmp file behind', () => {
  const p = join(dir, 'a.json');
  writeJsonAtomic(p, { hello: 'world' });
  assert.deepEqual(JSON.parse(readFileSync(p, 'utf8')), { hello: 'world' });
  assert.ok(!readdirSync(dir).some(f => f.endsWith('.tmp')), 'tmp file must be renamed away');
});

test('readJsonOr returns the fallback for a missing file', () => {
  assert.deepEqual(readJsonOr(join(dir, 'missing.json'), []), []);
});

test('readJsonOr backs a corrupt file up instead of silently discarding it', () => {
  const p = join(dir, 'corrupt.json');
  writeFileSync(p, '[{"id":"q_1","platform":"x"'); // torn write
  const out = readJsonOr(p, []);
  assert.deepEqual(out, [], 'falls back to empty');
  const backup = readdirSync(dir).find(f => f.startsWith('corrupt.json.corrupt-'));
  assert.ok(backup, 'expected a .corrupt-<ts> backup beside the store');
  assert.equal(readFileSync(join(dir, backup), 'utf8'), '[{"id":"q_1","platform":"x"', 'backup preserves the original bytes');
});

test('readJsonOr parses a healthy file normally (no backup created)', () => {
  const p = join(dir, 'ok.json');
  writeJsonAtomic(p, [1, 2, 3]);
  assert.deepEqual(readJsonOr(p, []), [1, 2, 3]);
  assert.ok(!existsSync(`${p}.corrupt`), 'no backup for a healthy file');
});

// ── INIT-008: versioned stores ────────────────────────────────────────────────

const { readVersioned, writeVersionedAtomic, STORE_SCHEMA_VERSION } = await import('../lib/jsonstore.js');

test('writeVersionedAtomic wraps items with schema_version; readVersioned unwraps', () => {
  const p = join(dir, 'versioned.json');
  writeVersionedAtomic(p, [{ id: 'q_1' }]);
  const onDisk = JSON.parse(readFileSync(p, 'utf8'));
  assert.equal(onDisk.schema_version, STORE_SCHEMA_VERSION);
  assert.deepEqual(readVersioned(p, []), [{ id: 'q_1' }]);
});

test('readVersioned reads a LEGACY bare array transparently (pre-versioning file)', () => {
  const p = join(dir, 'legacy.json');
  writeFileSync(p, JSON.stringify([{ id: 'q_old' }]));
  assert.deepEqual(readVersioned(p, []), [{ id: 'q_old' }], 'legacy shape must keep working');
});

test('readVersioned reads a legacy bare object map transparently', () => {
  const p = join(dir, 'legacy-map.json');
  writeFileSync(p, JSON.stringify({ x: { count: 2 } }));
  assert.deepEqual(readVersioned(p, {}), { x: { count: 2 } });
});

test('readVersioned tolerates a NEWER schema_version best-effort (no data loss)', () => {
  const p = join(dir, 'future.json');
  writeFileSync(p, JSON.stringify({ schema_version: STORE_SCHEMA_VERSION + 1, items: [1] }));
  assert.deepEqual(readVersioned(p, []), [1]);
});

test('readVersioned returns the fallback for a missing file', () => {
  assert.deepEqual(readVersioned(join(dir, 'nope.json'), ['fb']), ['fb']);
});
