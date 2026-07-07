// Asset registry v1 (INIT-013) — store semantics, dedupe, usage, expiry.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let dir;
before(() => { dir = mkdtempSync(join(tmpdir(), 'honk-assets-')); process.env.HONK_DATA_DIR = dir; });
after(() => { try { rmSync(dir, { recursive: true, force: true }); } catch {} });

const assets = await import('../lib/assets.js');

test('register mints an asset with hash-based id and empty usage', () => {
  const { asset, deduped } = assets.register({
    url: 'https://cdn.example/one.png', hash: 'aaaa000011112222', provider: 'imgbb',
    source: 'upload', bytes: 1024, format: 'png',
  });
  assert.equal(deduped, false);
  assert.equal(asset.id, 'ast_aaaa000011112222');
  assert.deepEqual(asset.urls, ['https://cdn.example/one.png']);
  assert.deepEqual(asset.usage, []);
});

test('re-registering identical bytes under a new URL dedupes onto the same asset', () => {
  const { asset, deduped } = assets.register({
    url: 'https://cdn.example/one-reupload.png', hash: 'aaaa000011112222', source: 'upload',
  });
  assert.equal(deduped, true);
  assert.equal(asset.id, 'ast_aaaa000011112222');
  assert.equal(asset.urls.length, 2);
  assert.equal(asset.url, 'https://cdn.example/one-reupload.png'); // latest wins
  assert.equal(assets.list().length, 1);
});

test('url-only registration (no hash) dedupes by exact URL', () => {
  const a = assets.register({ url: 'https://brand.example/logo.svg', source: 'brand-kit', tags: ['brand-kit'] });
  const b = assets.register({ url: 'https://brand.example/logo.svg', source: 'brand-kit' });
  assert.equal(a.deduped, false);
  assert.equal(b.deduped, true);
  assert.match(a.asset.id, /^ast_u[0-9a-f]{16}$/);
});

test('compose registration carries template and dimensions', () => {
  const { asset } = assets.register({
    url: 'https://cdn.example/sq.png', hash: 'bbbb000011112222', source: 'compose',
    template: 'square-tall', width: 1080, height: 1350,
  });
  assert.equal(asset.template, 'square-tall');
  assert.equal(asset.width, 1080);
  assert.equal(assets.list({ template: 'square-tall' }).length, 1);
});

test('list filters: source, tag, used', () => {
  assert.equal(assets.list({ source: 'brand-kit' }).length, 1);
  assert.equal(assets.list({ tag: 'brand-kit' }).length, 1);
  assert.equal(assets.list({ used: true }).length, 0);
  assert.equal(assets.list({ used: false }).length, assets.list().length);
});

test('recordUsage appends to every asset the publish referenced', () => {
  const n = assets.recordUsage(
    ['https://cdn.example/one.png', 'https://cdn.example/unregistered.png'],
    { platform: 'instagram', post_id: '123', at: '2026-07-06T12:00:00Z' },
  );
  assert.equal(n, 1);
  const a = assets.find('ast_aaaa000011112222');
  assert.equal(a.usage.length, 1);
  assert.equal(a.usage[0].post_id, '123');
  assert.equal(assets.list({ used: true }).length, 1);
});

test('usage matches ANY known url of a deduped asset', () => {
  const n = assets.recordUsage(
    ['https://cdn.example/one-reupload.png'],
    { platform: 'facebook', at: '2026-07-06T13:00:00Z' },
  );
  assert.equal(n, 1);
  assert.equal(assets.find('ast_aaaa000011112222').usage.length, 2);
});

test('update sets rights + tags; find works by id, hash, and url', () => {
  const a = assets.update('ast_bbbb000011112222', {
    rights_note: 'stock license, campaign only', rights_expires_at: '2020-01-01T00:00:00Z',
    add_tags: ['campaign-q3'],
  });
  assert.equal(a.rights.note, 'stock license, campaign only');
  assert.ok(assets.isExpired(a));
  assert.equal(assets.find('bbbb000011112222').id, 'ast_bbbb000011112222');
  assert.equal(assets.find('https://cdn.example/sq.png').id, 'ast_bbbb000011112222');
  assert.throws(() => assets.update('nope', { add_tags: ['x'] }), /No asset matches/);
  assert.throws(() => assets.update('ast_bbbb000011112222', { rights_expires_at: 'not-a-date' }), /not a parseable date/);
});

test('expiryWarnings warns on expired, is silent on fresh or unregistered', () => {
  const warns = assets.expiryWarnings(['https://cdn.example/sq.png']);
  assert.equal(warns.length, 1);
  assert.match(warns[0], /rights expiry/);
  assert.equal(assets.expiryWarnings(['https://cdn.example/one.png']).length, 0);
  assert.equal(assets.expiryWarnings([]).length, 0);
  assert.equal(assets.list({ expired: true }).length, 1);
});

test('extractMediaUrls covers image_url, image_urls[], video_url', () => {
  assert.deepEqual(
    assets.extractMediaUrls({ image_url: 'a', image_urls: ['b', 'c'], video_url: 'd', caption: 'x' }),
    ['a', 'b', 'c', 'd'],
  );
  assert.deepEqual(assets.extractMediaUrls({ text: 'plain' }), []);
});

test('store is versioned on disk ({schema_version, items})', () => {
  const raw = JSON.parse(readFileSync(join(dir, 'assets.json'), 'utf8'));
  assert.equal(raw.schema_version, 1);
  assert.ok(Array.isArray(raw.items));
});
