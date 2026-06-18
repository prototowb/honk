// Deterministic URL tagging (ALPHA-013): merge query params (UTM/campaign) into a
// URL for click attribution. Pure — the brand-kit defaults merge and {platform}
// substitution happen in the caller (index.js), so this stays trivially testable.

// Returns `url` with `params` set as query parameters. Existing query params with
// the same key are overwritten; other query params and the fragment are
// preserved. Empty/null/undefined values are skipped. Throws on an invalid URL.
export function tagUrl(url, params = {}) {
  let u;
  try { u = new URL(url); }
  catch { throw new Error(`Not a valid URL: ${url}`); }

  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}
