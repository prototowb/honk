import test   from 'node:test';
import assert from 'node:assert/strict';
import { normalizeScheduledAt, isPast, hasExplicitTimezone, timezoneWarning } from '../lib/schedule.js';

test('accepts a Z timestamp and canonicalizes it', () => {
  assert.equal(normalizeScheduledAt('2026-06-15T13:00:00Z'), '2026-06-15T13:00:00.000Z');
});

test('accepts an explicit offset and converts to UTC', () => {
  assert.equal(normalizeScheduledAt('2026-06-15T09:00:00-04:00'), '2026-06-15T13:00:00.000Z');
});

test('accepts a naive timestamp (interpreted as server-local) and canonicalizes', () => {
  const iso = normalizeScheduledAt('2026-06-15T09:00:00');
  assert.match(iso, /^2026-06-15T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);  // absolute UTC, exact value depends on server TZ
});

test('flags missing timezone so callers can warn', () => {
  assert.equal(hasExplicitTimezone('2026-06-15T13:00:00Z'), true);
  assert.equal(hasExplicitTimezone('2026-06-15T09:00:00-04:00'), true);
  assert.equal(hasExplicitTimezone('2026-06-15T09:00:00'), false);
  assert.ok(timezoneWarning('2026-06-15T09:00:00').length > 0);
  assert.equal(timezoneWarning('2026-06-15T13:00:00Z'), '');
});

test('rejects an invalid datetime', () => {
  assert.throws(() => normalizeScheduledAt('not-a-real-date'), /valid/);
});

test('passes null/empty through as no-schedule', () => {
  assert.equal(normalizeScheduledAt(null), null);
  assert.equal(normalizeScheduledAt(''), null);
});

test('isPast distinguishes past from future', () => {
  assert.equal(isPast('2000-01-01T00:00:00Z'), true);
  assert.equal(isPast('2999-01-01T00:00:00Z'), false);
});
