import test   from 'node:test';
import assert from 'node:assert/strict';
import { bestTimes, formatBestTimes } from '../lib/besttime.js';

test('returns ranked windows for a platform, default count 3', () => {
  const r = bestTimes({ platform: 'instagram' });
  assert.equal(r.platform, 'instagram');
  assert.equal(r.label, 'Instagram');
  assert.equal(r.windows.length, 3);
  // ranked by score, descending
  assert.ok(r.windows[0].score >= r.windows[1].score);
  assert.ok(r.windows[1].score >= r.windows[2].score);
  // shape
  assert.match(r.windows[0].time, /^\d{2}:00$/);
  assert.equal(r.windows[0].source, 'research');
  assert.equal(r.has_own_data, false);
});

test('respects the count argument', () => {
  assert.equal(bestTimes({ platform: 'x', count: 5 }).windows.length, 5);
  assert.equal(bestTimes({ platform: 'x', count: 1 }).windows.length, 1);
});

test('throws on an unknown platform', () => {
  assert.throws(() => bestTimes({ platform: 'mastodon' }), /unknown platform/i);
});

test('observedWindows seam blends in own-data and labels it', () => {
  // Feed an out-of-baseline slot; it should appear, ranked, and be sourced
  // from your-data with has_own_data flipped on.
  const r = bestTimes({
    platform: 'bluesky',
    count: 6,
    observedWindows: [{ day: 'Sun', hour: 21, score: 99, note: 'your night owls' }],
  });
  assert.equal(r.has_own_data, true);
  const own = r.windows.find(w => w.source === 'your-data');
  assert.ok(own, 'expected a your-data window');
  assert.equal(own.day, 'Sun');
  assert.equal(own.time, '21:00');
  assert.equal(own.note, 'your night owls');
  // highest score, so it ranks first
  assert.equal(r.windows[0], own);
});

test('formatBestTimes renders label, windows, and the baseline note', () => {
  const out = formatBestTimes(bestTimes({ platform: 'facebook' }));
  assert.match(out, /Best times to post on Facebook/);
  assert.match(out, /\[research\]/);
  assert.match(out, /engagement research/i);
  assert.match(out, /queue_add/);
});
