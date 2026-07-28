// Deterministic CTA-presence heuristic (INIT-016) — informational only, never
// changes a verdict. See report.test.mjs for the content_check integration.
import test   from 'node:test';
import assert from 'node:assert/strict';
import { hasCta, ctaNote } from '../lib/cta-check.js';

test('detects CTA-shaped phrasing across platforms\' text fields', () => {
  assert.equal(hasCta('bluesky', { text: 'Comment below with your favorite tool.' }), true);
  assert.equal(hasCta('facebook', { message: 'Sign up for the newsletter today.' }), true);
  assert.equal(hasCta('instagram', { caption: 'Swipe to see the full breakdown.' }), true);
  assert.equal(hasCta('tiktok', { caption: 'Follow for part 2.' }), true);
});

test('detects a bare link as its own CTA', () => {
  assert.equal(hasCta('threads', { text: 'Full writeup: https://example.com/post' }), true);
});

test('detects CTA phrasing inside an X thread (joined tweets)', () => {
  assert.equal(hasCta('x', { tweets: ['Here is why this matters.', 'Reply with your take.'] }), true);
});

test('plain informational text with no CTA or link returns false', () => {
  assert.equal(hasCta('bluesky', { text: 'The sky was clear all week.' }), false);
});

test('empty/missing text is not a false positive for CTA presence', () => {
  assert.equal(hasCta('bluesky', {}), false);
  assert.equal(hasCta('bluesky', { text: '' }), false);
});

test('ctaNote reports presence vs absence without throwing', () => {
  assert.match(ctaNote('bluesky', { text: 'Reply with your favorite.' }), /Call-to-action or link detected/);
  assert.match(ctaNote('bluesky', { text: 'Just a status update.' }), /No call-to-action or link detected/);
});
