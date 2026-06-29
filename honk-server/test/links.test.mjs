import test   from 'node:test';
import assert from 'node:assert/strict';
import { tagUrl } from '../lib/links.js';

test('tags a bare url', () => {
  const out = tagUrl('https://example.com/post', { utm_source: 'x', utm_medium: 'social' });
  const u = new URL(out);
  assert.equal(u.searchParams.get('utm_source'), 'x');
  assert.equal(u.searchParams.get('utm_medium'), 'social');
});

test('merges with an existing query string and preserves the fragment', () => {
  const out = tagUrl('https://example.com/p?ref=home#section', { utm_campaign: 'launch' });
  const u = new URL(out);
  assert.equal(u.searchParams.get('ref'), 'home');
  assert.equal(u.searchParams.get('utm_campaign'), 'launch');
  assert.equal(u.hash, '#section');
});

test('overwrites a same-key param and skips empty values', () => {
  const out = tagUrl('https://example.com?utm_source=old', { utm_source: 'new', utm_term: '', utm_content: null });
  const u = new URL(out);
  assert.equal(u.searchParams.get('utm_source'), 'new');
  assert.equal(u.searchParams.has('utm_term'), false);
  assert.equal(u.searchParams.has('utm_content'), false);
});

test('throws on an invalid url', () => {
  assert.throws(() => tagUrl('not a url', { a: '1' }), /not a valid url/i);
});
