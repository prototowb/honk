import test   from 'node:test';
import assert from 'node:assert/strict';
import { hashContent } from '../lib/hash.js';

test('hash is stable, 16 chars, and content-sensitive', () => {
  const a = hashContent({ text: 'hi' });
  assert.equal(a, hashContent({ text: 'hi' }));
  assert.equal(a.length, 16);
  assert.notEqual(a, hashContent({ text: 'bye' }));
});
