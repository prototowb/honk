import test   from 'node:test';
import assert from 'node:assert/strict';
import { report } from '../lib/config.js';

test('reports a configured platform and a missing one', () => {
  process.env.BLUESKY_IDENTIFIER   = 'me.bsky.social';
  process.env.BLUESKY_APP_PASSWORD = 'app-pw';
  delete process.env.X_API_KEY;

  const r = report();
  assert.equal(r.platforms.bluesky.default.configured, true);
  assert.equal(r.platforms.x.default.configured, false);
  assert.ok(r.platforms.x.default.missing.includes('X_API_KEY'));
});

test('discovers named accounts from suffixed env vars', () => {
  process.env.BLUESKY_IDENTIFIER__BRAND   = 'brand.bsky.social';
  process.env.BLUESKY_APP_PASSWORD__BRAND = 'app-pw';

  const brand = report().platforms.bluesky.accounts.find(a => a.name === 'brand');
  assert.ok(brand, 'brand account should be discovered');
  assert.equal(brand.configured, true);
});

test('never includes credential values, only key names', () => {
  process.env.BLUESKY_APP_PASSWORD = 'super-secret-value';
  const serialized = JSON.stringify(report());
  assert.ok(!serialized.includes('super-secret-value'));
});
