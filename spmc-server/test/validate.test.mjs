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

// ── alt text (ALPHA-014) ────────────────────────────────────────────────────

test('alt_text is accepted on a supported platform with an image', () => {
  assert.equal(validate('instagram', { caption: 'hi', image_url: 'https://x/y.jpg', alt_text: 'a cat' }).ok, true);
  assert.equal(validate('facebook',  { message: 'hi', image_url: 'https://x/y.jpg', alt_text: 'a cat' }).ok, true);
  assert.equal(validate('threads',   { text: 'hi', image_url: 'https://x/y.jpg', alt_text: 'a cat' }).ok, true);
});

test('alt_text needs an image to attach to', () => {
  const v = validate('facebook', { message: 'hi', alt_text: 'a cat' });
  assert.equal(v.ok, false);
  assert.match(v.errors.join(), /alt_text needs an image/);
});

test('alt_text is rejected on a platform that does not support it', () => {
  const v = validate('bluesky', { text: 'hi', alt_text: 'a cat' });
  assert.equal(v.ok, false);
  assert.match(v.errors.join(), /does not support image alt text/);
});

test('single alt_text on a carousel is rejected in favor of alt_texts', () => {
  const v = validate('instagram', { caption: 'hi', image_urls: ['https://x/1.jpg', 'https://x/2.jpg'], alt_text: 'one' });
  assert.equal(v.ok, false);
  assert.match(v.errors.join(), /use "alt_texts"/);
});

test('alt_texts must match the number of carousel images 1:1', () => {
  const ok = validate('instagram', { caption: 'hi', image_urls: ['https://x/1.jpg', 'https://x/2.jpg'], alt_texts: ['a', 'b'] });
  assert.equal(ok.ok, true);
  const bad = validate('instagram', { caption: 'hi', image_urls: ['https://x/1.jpg', 'https://x/2.jpg'], alt_texts: ['a'] });
  assert.equal(bad.ok, false);
  assert.match(bad.errors.join(), /match 1:1/);
});

// ── first comment (ALPHA-015) ───────────────────────────────────────────────

test('first_comment is accepted on instagram and facebook', () => {
  assert.equal(validate('instagram', { caption: 'hi', image_url: 'https://x/y.jpg', first_comment: '#tags' }).ok, true);
  assert.equal(validate('facebook',  { message: 'hi', first_comment: 'see link' }).ok, true);
});

test('first_comment is rejected where there is no comments edge', () => {
  for (const p of [['threads', { text: 'hi' }], ['bluesky', { text: 'hi' }], ['x', { text: 'hi' }]]) {
    const v = validate(p[0], { ...p[1], first_comment: 'x' });
    assert.equal(v.ok, false, `${p[0]} should reject first_comment`);
    assert.match(v.errors.join(), /does not support a first comment/);
  }
});
