import test   from 'node:test';
import assert from 'node:assert/strict';
import { BRAND_FIELDS, brandSchema, formatBrandSchema } from '../lib/brand-schema.js';

test('BRAND_FIELDS: visual identity fields carry dotted paths and the high-value ones are recommended', () => {
  const byPath = Object.fromEntries(BRAND_FIELDS.map(f => [f.path, f]));
  for (const p of ['visual.accent', 'visual.bg_color', 'visual.handle', 'voice.tone', 'voice.audience']) {
    assert.ok(byPath[p], `missing field ${p}`);
    assert.equal(byPath[p].recommended, true);
  }
  assert.equal(byPath['visual.accent'].type, 'color');
  assert.equal(byPath['visual.default_template'].type, 'enum');
  assert.ok(byPath['visual.default_template'].options.includes('square-tall'));
});

test('brandSchema is pure — it never mutates BRAND_FIELDS', () => {
  const before = JSON.stringify(BRAND_FIELDS);
  brandSchema({ visual: { accent: '#1df7ed' } });
  assert.equal(JSON.stringify(BRAND_FIELDS), before);
});

test('brandSchema marks set fields with their current value and leaves the rest unset', () => {
  const fields = brandSchema({ visual: { accent: '#1df7ed' }, voice: { banned_words: ['synergy'] } });
  const accent = fields.find(f => f.path === 'visual.accent');
  assert.equal(accent.set, true);
  assert.equal(accent.current, '#1df7ed');
  const banned = fields.find(f => f.path === 'voice.banned_words');
  assert.equal(banned.set, true);
  assert.deepEqual(banned.current, ['synergy']);
  const bg = fields.find(f => f.path === 'visual.bg_color');
  assert.equal(bg.set, false);
  assert.ok(!('current' in bg));
});

test('brandSchema treats empty strings / empty arrays as unset', () => {
  const fields = brandSchema({ visual: { accent: '' }, hashtags: { default: [] } });
  assert.equal(fields.find(f => f.path === 'visual.accent').set, false);
  assert.equal(fields.find(f => f.path === 'hashtags.default').set, false);
});

test('formatBrandSchema leads with remaining recommended count and lists current values', () => {
  const empty = formatBrandSchema(brandSchema(null));
  assert.match(empty, /recommended field\(s\) still empty/);
  const partial = formatBrandSchema(brandSchema({
    voice: { tone: 'concise', audience: 'devs' },
    visual: { accent: '#1df7ed', bg_color: '#05091e', handle: '@brand' },
  }));
  assert.match(partial, /all recommended fields are set/);
  assert.match(partial, /current: #1df7ed/);
  assert.match(partial, /Visual identity/);
});
