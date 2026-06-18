import test   from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

process.env.SPMC_DATA_DIR = mkdtempSync(join(tmpdir(), 'spmc-brand-'));
const brand = await import('../lib/brand.js');

test('get is null when unset; getOrEmpty returns the skeleton shape', () => {
  assert.equal(brand.get(), null);
  const empty = brand.getOrEmpty();
  assert.deepEqual(empty.voice.banned_words, []);
  assert.equal(empty.notes, '');
  assert.ok('utm_defaults' in empty.links);
});

test('set stores a profile and reads it back', () => {
  brand.set({ voice: { tone: 'concise', banned_words: ['synergy'] }, notes: 'launch week' });
  const p = brand.get();
  assert.equal(p.voice.tone, 'concise');
  assert.deepEqual(p.voice.banned_words, ['synergy']);
  assert.equal(p.notes, 'launch week');
});

test('set deep-merges objects and replaces arrays/scalars', () => {
  brand.set({ voice: { audience: 'devs' }, hashtags: { default: ['#a'] } });
  let p = brand.get();
  assert.equal(p.voice.tone, 'concise');     // preserved from earlier merge
  assert.equal(p.voice.audience, 'devs');    // added
  assert.deepEqual(p.hashtags.default, ['#a']);

  brand.set({ voice: { banned_words: ['leverage'] } });
  p = brand.get();
  assert.deepEqual(p.voice.banned_words, ['leverage']); // array replaced, not concatenated
});

test('replace:true overwrites the whole profile', () => {
  brand.set({ notes: 'fresh' }, '', { replace: true });
  const p = brand.get();
  assert.equal(p.notes, 'fresh');
  assert.equal(p.voice, undefined); // everything else gone
});

test('profiles are isolated per account', () => {
  brand.set({ voice: { tone: 'punchy' } }, 'brand');
  assert.equal(brand.get('brand').voice.tone, 'punchy');
  assert.equal(brand.get().notes, 'fresh');            // default untouched
  assert.deepEqual(brand.list().sort(), ['_default', 'brand']);
});

test('clear removes a profile and reports whether it existed', () => {
  assert.equal(brand.clear('brand'), true);
  assert.equal(brand.get('brand'), null);
  assert.equal(brand.clear('brand'), false);
});
