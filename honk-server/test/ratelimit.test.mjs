import test   from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

process.env.HONK_DATA_DIR = mkdtempSync(join(tmpdir(), 'spmc-rl-'));
const { isRateLimitError, noteFromError, status } = await import('../lib/ratelimit.js');

test('detects rate-limit responses from error text', () => {
  assert.equal(isRateLimitError(new Error('X API 429: Too Many Requests')), true);
  assert.equal(isRateLimitError(new Error('rate limit exceeded')), true);
  assert.equal(isRateLimitError(new Error('X API 400: bad request')), false);
});

test('noteFromError tallies only rate-limit errors', () => {
  noteFromError('x', new Error('X API 429: slow down'));
  noteFromError('x', new Error('X API 500: server error')); // ignored
  noteFromError('x', new Error('429 again'));

  const s = status();
  assert.equal(s.x.count, 2);
  assert.ok(s.x.last_message);
});
