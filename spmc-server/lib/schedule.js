// Normalize a scheduled_at timestamp to canonical UTC ISO 8601.
//
// The scheduler compares `new Date(item.scheduled_at) <= now`. A naive string
// like "2026-06-15T09:00:00" is interpreted in the *server's* timezone. On the
// primary surface today — a local single-user stdio server — server TZ == the
// author's TZ, so naive input means exactly what the user intended. We therefore
// accept it and canonicalize to absolute UTC, but flag it (see
// hasExplicitTimezone) so callers can warn: a naive time becomes ambiguous the
// moment SPMC runs hosted/multi-tenant, where it would fire at the wrong instant.
// Only genuinely invalid datetimes are rejected.

const HAS_TZ = /(?:Z|[+-]\d{2}:?\d{2})$/;

// True when the input pins an absolute instant (trailing Z or ±HH:MM). When
// false, normalizeScheduledAt still works but the result depended on server TZ.
export function hasExplicitTimezone(input) {
  return typeof input === 'string' && HAS_TZ.test(input.trim());
}

export function normalizeScheduledAt(input) {
  if (input === undefined || input === null || input === '') return null;
  if (typeof input !== 'string') {
    throw new Error('scheduled_at must be an ISO 8601 string.');
  }

  const s = input.trim();
  const date = new Date(s);
  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `scheduled_at "${s}" is not a valid ISO 8601 datetime. ` +
      `Use e.g. "2026-06-15T13:00:00Z" or "2026-06-15T09:00:00-04:00".`,
    );
  }

  return date.toISOString();
}

// Standard warning for a timezone-less timestamp, or '' when one was given.
export function timezoneWarning(input) {
  return hasExplicitTimezone(input)
    ? ''
    : 'No timezone given — interpreted as this server\'s local time. Add an explicit offset (…Z or ±HH:MM) to be unambiguous, especially before any hosted/multi-user deployment.';
}

// True when the normalized timestamp is already in the past (the scheduler would
// dispatch it on its next tick). Callers can surface this as a warning.
export function isPast(isoString, now = new Date()) {
  return new Date(isoString) <= now;
}
