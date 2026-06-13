// Normalize a scheduled_at timestamp to canonical UTC ISO 8601.
//
// The scheduler compares `new Date(item.scheduled_at) <= now`. A naive local
// string like "2026-06-15T09:00:00" is interpreted in the *server's* timezone,
// so a post would fire at the wrong instant whenever the server TZ differs from
// the author's. We therefore require an explicit timezone (Z or ±HH:MM) and
// reject ambiguous input rather than guessing. The calling agent already knows
// the current date/time and can produce an absolute timestamp.

const HAS_TZ = /(?:Z|[+-]\d{2}:?\d{2})$/;

export function normalizeScheduledAt(input) {
  if (input === undefined || input === null || input === '') return null;
  if (typeof input !== 'string') {
    throw new Error('scheduled_at must be an ISO 8601 string.');
  }

  const s = input.trim();
  if (!HAS_TZ.test(s)) {
    throw new Error(
      `scheduled_at "${s}" has no timezone. Provide an explicit offset, e.g. ` +
      `"2026-06-15T09:00:00-04:00" or "2026-06-15T13:00:00Z". A naive local time ` +
      `would fire at the wrong instant on the server.`,
    );
  }

  const date = new Date(s);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`scheduled_at "${s}" is not a valid ISO 8601 datetime.`);
  }

  return date.toISOString();
}

// True when the normalized timestamp is already in the past (the scheduler would
// dispatch it on its next tick). Callers can surface this as a warning.
export function isPast(isoString, now = new Date()) {
  return new Date(isoString) <= now;
}
