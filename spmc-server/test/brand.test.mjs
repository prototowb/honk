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

test('empty profile carries the visual identity block', () => {
  const v = brand.getOrEmpty().visual;
  for (const k of ['accent', 'bg_color', 'surface', 'heading_color', 'body_color',
                   'logo_url', 'icon_url', 'handle', 'default_template']) {
    assert.equal(v[k], '', `visual.${k} should default to ''`);
  }
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

// ── resolveVoice: per-platform voice deltas (replace semantics, provenance) ──

const baseProfile = {
  voice:    { tone: 'concise', register: 'casual', emoji_policy: 'sparing', audience: 'devs' },
  hashtags: { default: ['#a', '#b'] },
  cta:      ['Star the repo'],
};

test('resolveVoice falls back to base when no platform override exists', () => {
  const r = brand.resolveVoice(baseProfile, 'x');
  assert.equal(r.platform, 'x');
  assert.equal(r.effective.tone, 'concise');
  assert.deepEqual(r.effective.hashtags, ['#a', '#b']);
  assert.deepEqual(r.effective.cta, ['Star the repo']);
  assert.deepEqual(r.overridden, []);
});

test('resolveVoice overrides a scalar field and records provenance', () => {
  const p = { ...baseProfile, platforms: { x: { tone: 'punchier' } } };
  const r = brand.resolveVoice(p, 'x');
  assert.equal(r.effective.tone, 'punchier');     // overridden
  assert.equal(r.effective.register, 'casual');   // inherited
  assert.deepEqual(r.overridden, ['tone']);
});

test('resolveVoice replaces (does not extend) an overridden list', () => {
  const p = { ...baseProfile, platforms: { x: { hashtags: ['#x'] } } };
  const r = brand.resolveVoice(p, 'x');
  assert.deepEqual(r.effective.hashtags, ['#x']);  // replaced, base ['#a','#b'] gone
  assert.ok(r.overridden.includes('hashtags'));
});

test('resolveVoice ignores an empty-array override and keeps the base list', () => {
  const p = { ...baseProfile, platforms: { x: { hashtags: [] } } };
  const r = brand.resolveVoice(p, 'x');
  assert.deepEqual(r.effective.hashtags, ['#a', '#b']); // [] is "unset", base wins
  assert.deepEqual(r.overridden, []);
});

test('resolveVoice for a platform with no overrides yields the base', () => {
  const p = { ...baseProfile, platforms: { instagram: { tone: 'warm' } } };
  const r = brand.resolveVoice(p, 'x');
  assert.equal(r.effective.tone, 'concise');
  assert.deepEqual(r.overridden, []);
});

test('resolveVoice is null-safe and returns empty values for an unset profile', () => {
  const r = brand.resolveVoice(null, 'x');
  assert.equal(r.effective.tone, '');
  assert.deepEqual(r.effective.hashtags, []);
  assert.deepEqual(r.effective.cta, []);
  assert.deepEqual(r.overridden, []);
});

test('PLATFORM_OVERRIDE_FIELDS is the single source of overridable keys', () => {
  const keys = brand.PLATFORM_OVERRIDE_FIELDS.map(f => f.key);
  assert.deepEqual(keys.sort(),
    ['audience', 'cta', 'emoji_policy', 'hashtags', 'register', 'tone']);
});
