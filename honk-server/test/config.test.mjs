import test   from 'node:test';
import assert from 'node:assert/strict';
import { report } from '../lib/config.js';
import { env, hasAll, discoverAccounts } from '../lib/env.js';

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
