import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { report, accountsOverview, formatAccounts } from '../lib/config.js';
import { env, hasAll, discoverAccounts } from '../lib/env.js';
import * as accounts from '../lib/accounts.js';

test('reports a configured platform and a missing one', () => {
  process.env.BLUESKY_IDENTIFIER   = 'me.bsky.social';
  process.env.BLUESKY_APP_PASSWORD = 'app-pw';
  delete process.env.X_API_KEY;

  const r = report();
  assert.equal(r.platforms.bluesky.default.configured, true);
  assert.equal(r.platforms.x.default.configured, false);
  assert.ok(r.platforms.x.default.missing.includes('X_API_KEY'));
});

test('discovers named accounts from ACCOUNT__ prefixed env vars', () => {
  process.env.BRAND__BLUESKY_IDENTIFIER   = 'brand.bsky.social';
  process.env.BRAND__BLUESKY_APP_PASSWORD = 'app-pw';

  const brand = report().platforms.bluesky.accounts.find(a => a.name === 'brand');
  assert.ok(brand, 'brand account should be discovered');
  assert.equal(brand.configured, true);
});

test('env resolution is prefix-based; default is not a fallback', () => {
  process.env.X_API_KEY            = 'default-key';
  process.env.PROTOCODE__X_API_KEY = 'protocode-key';

  assert.equal(env('X_API_KEY'),              'default-key');   // bare key = default
  assert.equal(env('X_API_KEY', 'protocode'), 'protocode-key'); // prefix resolves

  // A named account with no key of its own resolves undefined — never the
  // default value. This is the guardrail the desktop agent hit.
  assert.equal(env('X_API_SECRET', 'protocode'), undefined);
  assert.equal(hasAll(['X_API_KEY', 'X_API_SECRET'], 'protocode'), false);

  assert.deepEqual(discoverAccounts('X_API_KEY'), ['protocode']);
});

test('never includes credential values, only key names', () => {
  process.env.BLUESKY_APP_PASSWORD = 'super-secret-value';
  const serialized = JSON.stringify(report());
  assert.ok(!serialized.includes('super-secret-value'));
});

// Account registry handle enrichment (INIT-014) — accountsOverview() layers
// accounts.ts's cache onto rows; formatAccounts() renders it.
{
  let dir;
  before(() => { dir = mkdtempSync(join(tmpdir(), 'honk-config-')); process.env.HONK_DATA_DIR = dir; });
  after(() => { try { rmSync(dir, { recursive: true, force: true }); } catch {} });

  test('accountsOverview layers a cached handle onto the matching row', () => {
    process.env.BRAND__X_API_KEY            = 'k';
    process.env.BRAND__X_API_SECRET         = 's';
    process.env.BRAND__X_ACCESS_TOKEN       = 't';
    process.env.BRAND__X_ACCESS_TOKEN_SECRET = 'ts';
    accounts.recordHandle('brand', 'instagram', { id: '1', handle: '@brand_ig', name: 'Brand' });

    const row = accountsOverview().rows.find(r => r.account === 'brand');
    assert.ok(row);
    assert.equal(row.handles.instagram.handle, '@brand_ig');
  });

  test('formatAccounts does not double the @ prefix a handle already carries', () => {
    // Regression: the adapters (instagram.ts/facebook.ts getProfile) already
    // prefix '@' onto the handle before it reaches the registry — formatAccounts
    // must render it verbatim, not prepend a second '@'.
    const rendered = formatAccounts({
      active: '',
      rows: [{
        name: 'brand', account: 'brand', isDefault: false, active: false,
        brandProfile: false, platforms: [],
        handles: { instagram: { handle: '@brand_ig', name: null } },
      }],
    });
    assert.match(rendered, /instagram=@brand_ig\b/);
    assert.doesNotMatch(rendered, /@@/);
  });

  test('formatAccounts falls back to the profile name when a platform has no handle', () => {
    const rendered = formatAccounts({
      active: '',
      rows: [{
        name: 'brand', account: 'brand', isDefault: false, active: false,
        brandProfile: false, platforms: [],
        handles: { facebook: { handle: null, name: 'Brand Page' } },
      }],
    });
    assert.match(rendered, /facebook=Brand Page/);
  });
}
