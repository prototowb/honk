import test   from 'node:test';
import assert from 'node:assert/strict';
import { BRIEF_FIELDS, briefSchema, formatBriefSchema } from '../lib/brief.js';

test('BRIEF_FIELDS: the three core fields are required with stable keys/types', () => {
  const byKey = Object.fromEntries(BRIEF_FIELDS.map(f => [f.key, f]));
  for (const k of ['angle', 'goal', 'platforms']) {
    assert.ok(byKey[k], `missing field ${k}`);
    assert.equal(byKey[k].required, true);
  }
  assert.equal(byKey.goal.type, 'enum');
  assert.ok(byKey.goal.options.includes('awareness'));
  assert.equal(byKey.platforms.type, 'multiselect');
  assert.ok(byKey.platforms.options.includes('decide-for-me'));
  assert.equal(byKey.schedule.required, false);
});

test('briefSchema is pure — it never mutates BRIEF_FIELDS', () => {
  const before = JSON.stringify(BRIEF_FIELDS);
  briefSchema({ voice: { audience: 'indie devs' } });
  assert.equal(JSON.stringify(BRIEF_FIELDS), before);
});

test('briefSchema annotates a field the brand kit pre-fills', () => {
  const fields = briefSchema({ voice: { audience: 'indie devs and founders' } });
  const aud = fields.find(f => f.key === 'audience');
  assert.equal(aud.prefill, 'indie devs and founders');
  // a field with no brandKitPath stays un-prefilled
  assert.ok(!('prefill' in fields.find(f => f.key === 'angle')));
});

test('briefSchema omits prefill when the kit value is empty or absent', () => {
  assert.ok(!('prefill' in briefSchema(null).find(f => f.key === 'audience')));
  assert.ok(!('prefill' in briefSchema({ voice: { audience: '' } }).find(f => f.key === 'audience')));
});

test('formatBriefSchema renders required-ness, options, conditional, and prefill', () => {
  const out = formatBriefSchema(briefSchema({ voice: { audience: 'indie devs' } }));
  assert.match(out, /`angle` \(text, required\)/);
  assert.match(out, /`goal` \(enum, required\)/);
  assert.match(out, /options: awareness,/);
  assert.match(out, /required if the piece cites any statistic/);
  assert.match(out, /brand kit: indie devs/);
});
