import test   from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../lib/validate.js';

test('accepts a short tweet', () => {
  assert.equal(validate('x', { text: 'hi' }).ok, true);
});

test('rejects an over-limit tweet with a specific error', () => {
  const v = validate('x', { text: 'a'.repeat(281) });
  assert.equal(v.ok, false);
  assert.match(v.errors[0], /280/);
});

test('validates each tweet in a thread', () => {
  const v = validate('x', { tweets: ['ok', 'b'.repeat(300)] });
  assert.equal(v.ok, false);
  assert.match(v.errors.join(), /Tweet 2/);
});

test('flags an empty thread', () => {
  assert.equal(validate('x', { tweets: [] }).ok, false);
});

test('instagram requires an image url', () => {
  const v = validate('instagram', { caption: 'hi' });
  assert.equal(v.ok, false);
  assert.match(v.errors.join(), /image_url/);
});

test('media field must be an http(s) url', () => {
  assert.equal(validate('instagram', { caption: 'hi', image_url: 'not-a-url' }).ok, false);
  assert.equal(validate('instagram', { caption: 'hi', image_url: 'https://x/y.jpg' }).ok, true);
});

test('instagram carousel accepts 2–10 http(s) image urls', () => {
  const v = validate('instagram', { caption: 'hi', image_urls: ['https://x/1.jpg', 'https://x/2.jpg'] });
  assert.equal(v.ok, true);
});

test('instagram carousel rejects fewer than 2 images', () => {
  const v = validate('instagram', { caption: 'hi', image_urls: ['https://x/1.jpg'] });
  assert.equal(v.ok, false);
  assert.match(v.errors.join(), /2–10/);
});

test('instagram carousel rejects a non-url slide', () => {
  const v = validate('instagram', { caption: 'hi', image_urls: ['https://x/1.jpg', 'not-a-url'] });
  assert.equal(v.ok, false);
  assert.match(v.errors.join(), /image 2/);
});

test('bluesky counts graphemes, not code units', () => {
  assert.equal(validate('bluesky', { text: '👍'.repeat(300) }).ok, true);
  assert.equal(validate('bluesky', { text: '👍'.repeat(301) }).ok, false);
});

test('warns near the limit without failing', () => {
  const v = validate('x', { text: 'a'.repeat(279) });
  assert.equal(v.ok, true);
  assert.ok(v.warnings.length >= 1);
});

test('missing required text is an error', () => {
  assert.equal(validate('bluesky', {}).ok, false);
});

test('unknown platform is rejected', () => {
  assert.equal(validate('myspace', { text: 'hi' }).ok, false);
});
