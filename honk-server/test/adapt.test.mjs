import test   from 'node:test';
import assert from 'node:assert/strict';
import { adapt } from '../lib/adapt.js';
import { measure } from '../lib/specs.js';

test('keeps a short post as a single tweet', () => {
  const r = adapt('short post', ['x']);
  assert.equal(r.variants.x.format, 'single');
  assert.deepEqual(r.variants.x.content, { text: 'short post' });
});

test('auto-splits a long post into an in-limit thread', () => {
  const long = 'sentence '.repeat(80).trim();
  const r = adapt(long, ['x']);
  assert.equal(r.variants.x.format, 'thread');
  assert.ok(r.variants.x.content.tweets.length > 1);
  for (const t of r.variants.x.content.tweets) assert.ok(measure(t) <= 280);
});

test('truncates Bluesky to its grapheme limit and marks it not-fitting', () => {
  const r = adapt('a'.repeat(500), ['bluesky']);
  assert.equal(r.variants.bluesky.fits, false);
  assert.ok(measure(r.variants.bluesky.content.text, 'graphemes') <= 300);
});

test('notes the media requirement for image/video platforms', () => {
  assert.match(adapt('hello', ['instagram']).variants.instagram.notes.join(), /image_url/);
  assert.match(adapt('hello', ['tiktok']).variants.tiktok.notes.join(), /video_url/);
});

test('defaults to all platforms when none specified', () => {
  const r = adapt('hello world');
  assert.deepEqual(Object.keys(r.variants).sort(), ['bluesky', 'facebook', 'instagram', 'threads', 'tiktok', 'x']);
});

test('reports an unknown platform instead of throwing', () => {
  assert.ok(adapt('hi', ['nope']).variants.nope.error);
});

test('rejects empty source text', () => {
  assert.throws(() => adapt('   ', ['x']), /non-empty/);
});
