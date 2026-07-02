import test   from 'node:test';
import assert from 'node:assert/strict';
import { measure, sliceUnits, splitIntoChunks } from '../lib/specs.js';

test('measure counts characters', () => {
  assert.equal(measure('hello'), 5);
  assert.equal(measure(''), 0);
  assert.equal(measure(null), 0);
});

test('measure counts a multi-codepoint emoji family as one grapheme', () => {
  const family = '👨‍👩‍👧';
  assert.equal(measure(family, 'graphemes'), 1);
  assert.ok(measure(family, 'chars') > 1);
});

test('sliceUnits never splits a grapheme cluster', () => {
  assert.equal(sliceUnits('abcdef', 3), 'abc');
  const out = sliceUnits('👍👍👍👍', 2, 'graphemes');
  assert.equal(measure(out, 'graphemes'), 2);
});

test('splitIntoChunks keeps every chunk within the limit and preserves words', () => {
  const chunks = splitIntoChunks('one two three four five', 9);
  for (const c of chunks) assert.ok(measure(c) <= 9, `chunk "${c}" exceeds 9`);
  assert.equal(chunks.join(' '), 'one two three four five');
});

test('splitIntoChunks hard-splits a single oversized word', () => {
  const chunks = splitIntoChunks('x'.repeat(25), 10);
  assert.ok(chunks.length >= 3);
  for (const c of chunks) assert.ok(measure(c) <= 10);
  assert.equal(chunks.join(''), 'x'.repeat(25));
});
