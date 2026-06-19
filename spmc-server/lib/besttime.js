// Best-time-to-post suggestions (ALPHA-019). Returns ranked posting windows per
// platform. Pure and credential-free — touches no adapter.
//
// The windows below are a research-backed *baseline*: aggregate engagement-timing
// studies (Sprout/Buffer/Hootsuite-style), expressed in AUDIENCE-LOCAL time and
// US-centric. They are not the account's own history. Once a connected account
// accrues real engagement history, callers can pass `observedWindows` to blend in
// its own best-performing slots — see bestTimes(). Nothing feeds that seam today
// (there is no live analytics history), so it degrades to the baseline honestly.

import { PLATFORMS, PLATFORM_SPECS } from './specs.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// { day, hour (0–23 local), score (relative 0–100), note }. Kept small and
// ranked by score; bestTimes() returns the top N.
const WINDOWS = {
  x: [
    { day: 'Wed', hour: 9,  score: 95, note: 'midweek morning peak' },
    { day: 'Tue', hour: 10, score: 90, note: 'weekday late morning' },
    { day: 'Thu', hour: 9,  score: 88, note: 'midweek morning' },
    { day: 'Mon', hour: 12, score: 78, note: 'lunch scroll' },
    { day: 'Fri', hour: 9,  score: 72, note: 'pre-weekend morning' },
  ],
  instagram: [
    { day: 'Wed', hour: 11, score: 95, note: 'midweek late-morning peak' },
    { day: 'Tue', hour: 11, score: 92, note: 'weekday late morning' },
    { day: 'Fri', hour: 10, score: 88, note: 'pre-weekend morning' },
    { day: 'Thu', hour: 13, score: 84, note: 'lunch break' },
    { day: 'Mon', hour: 11, score: 76, note: 'week kickoff' },
  ],
  tiktok: [
    { day: 'Thu', hour: 19, score: 95, note: 'evening prime time' },
    { day: 'Tue', hour: 9,  score: 90, note: 'morning scroll' },
    { day: 'Fri', hour: 17, score: 88, note: 'after-work wind-down' },
    { day: 'Wed', hour: 20, score: 85, note: 'late-evening peak' },
    { day: 'Sat', hour: 11, score: 80, note: 'weekend late morning' },
  ],
  facebook: [
    { day: 'Wed', hour: 11, score: 92, note: 'midday midweek' },
    { day: 'Tue', hour: 10, score: 88, note: 'weekday morning' },
    { day: 'Thu', hour: 12, score: 84, note: 'midday' },
    { day: 'Mon', hour: 13, score: 80, note: 'post-lunch' },
    { day: 'Fri', hour: 10, score: 78, note: 'pre-weekend' },
  ],
  threads: [
    { day: 'Tue', hour: 9,  score: 90, note: 'weekday morning' },
    { day: 'Wed', hour: 12, score: 88, note: 'midday midweek' },
    { day: 'Thu', hour: 9,  score: 85, note: 'morning' },
    { day: 'Mon', hour: 11, score: 76, note: 'week start' },
    { day: 'Fri', hour: 13, score: 72, note: 'lunch' },
  ],
  bluesky: [
    { day: 'Wed', hour: 10, score: 90, note: 'weekday morning (tech-leaning audience)' },
    { day: 'Tue', hour: 9,  score: 88, note: 'morning' },
    { day: 'Thu', hour: 18, score: 84, note: 'evening tech crowd' },
    { day: 'Mon', hour: 10, score: 76, note: 'week start' },
    { day: 'Fri', hour: 9,  score: 72, note: 'morning' },
  ],
};

// Merge any account-observed windows into the research baseline. A slot that
// matches an existing baseline window (same day+hour) is promoted to "your-data"
// and boosted; a new slot is appended. Unused today — see the module header.
function blend(base, observed) {
  if (!Array.isArray(observed) || observed.length === 0) return base;
  const out = base.map(w => ({ ...w }));
  for (const o of observed) {
    const day  = typeof o.day === 'number' ? DAYS[o.day] : o.day;
    const hour = o.hour;
    const score = Number.isFinite(o.score) ? o.score : 80;
    const note = o.note || 'observed in your post history';
    const existing = out.find(w => w.day === day && w.hour === hour);
    if (existing) {
      existing.score  = Math.max(existing.score, score) + 5;
      existing.source = 'your-data';
      existing.note   = note;
    } else {
      out.push({ day, hour, score, source: 'your-data', note });
    }
  }
  return out;
}

// Ranked posting windows for a platform. `count` caps how many to return.
// `observedWindows` is the (currently unfed) own-history seam; `account` is
// accepted for parity and forward use but does not change the baseline.
export function bestTimes({ platform, count = 3, observedWindows = null, account = '' } = {}) {
  if (!PLATFORMS.includes(platform)) {
    throw new Error(`Unknown platform "${platform}". One of: ${PLATFORMS.join(', ')}.`);
  }
  const base = (WINDOWS[platform] || []).map(w => ({ ...w, source: 'research' }));
  const merged = blend(base, observedWindows);
  merged.sort((a, b) => b.score - a.score);

  const windows = merged.slice(0, Math.max(1, count)).map(w => ({
    day:    w.day,
    time:   `${String(w.hour).padStart(2, '0')}:00`,
    score:  w.score,
    source: w.source,
    note:   w.note || '',
  }));

  return {
    platform,
    label: PLATFORM_SPECS[platform].label,
    has_own_data: windows.some(w => w.source === 'your-data'),
    windows,
  };
}

// Human-readable rendering for the tool handler.
export function formatBestTimes(result) {
  const lines = result.windows.map((w, i) =>
    `  ${i + 1}. ${w.day} ${w.time}  — ${w.note} [${w.source}]`,
  );
  return [
    `Best times to post on ${result.label} (audience-local time):`,
    ...lines,
    '',
    'Schedule with queue_add using scheduled_at + an explicit timezone offset',
    '(e.g. 2026-06-23T11:00:00-04:00) so the instant is unambiguous.',
    result.has_own_data
      ? 'Includes windows learned from your own post history.'
      : 'Based on general engagement research — will refine to your own analytics as post history accrues.',
  ].join('\n');
}
