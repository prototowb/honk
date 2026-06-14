import test   from 'node:test';
import assert from 'node:assert/strict';
import { normalizeScheduledAt, isPast } from '../lib/schedule.js';

test('accepts a Z timestamp and canonicalizes it', () => {
  assert.equal(normalizeScheduledAt('2026-06-15T13:00:00Z'), '2026-06-15T13:00:00.000Z');
});

test('accepts an explicit offset and converts to UTC', () => {
  assert.equal(normalizeScheduledAt('2026-06-15T09:00:00-04:00'), '2026-06-15T13:00:00.000Z');
});

test('rejects a naive timestamp with no timezone', () => {
  assert.throws(() => normalizeScheduledAt('2026-06-15T09:00:00'), /timezone/);
});

test('rejects an invalid datetime', () => {
  assert.throws(() => normalizeScheduledAt('not-a-real-dateZ'), /valid/);
});

test('passes null/empty through as no-schedule', () => {
  assert.equal(normalizeScheduledAt(null), null);
  assert.equal(normalizeScheduledAt(''), null);
});

test('isPast distinguishes past from future', () => {
  assert.equal(isPast('2000-01-01T00:00:00Z'), true);
  assert.equal(isPast('2999-01-01T00:00:00Z'), false);
});
