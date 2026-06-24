import { PLATFORM_SPECS, measure } from './specs.js';

// Checks a content payload against a platform's rules without sending anything.
// Returns { ok, errors[], warnings[] }. errors block publishing; warnings don't.
// This is the verifiable substitute for live testing — it exercises the same
// content shape the adapters consume.
export function validate(platform, content) {
  const spec = PLATFORM_SPECS[platform];
  if (!spec) {
    return { ok: false, platform, errors: [`Unknown platform: ${platform}`], warnings: [] };
  }

  const errors = [];
  const warnings = [];
  const c = content || {};
  const { field, max, unit, required } = spec.text;

  // A thread (X tweets[]) is validated per item; otherwise the single text field.
  if (spec.thread && Array.isArray(c[spec.thread.field])) {
    const tweets = c[spec.thread.field];
    if (tweets.length === 0) {
      errors.push('Thread has no tweets.');
    }
    tweets.forEach((t, i) => {
      if (typeof t !== 'string' || t.trim() === '') {
        errors.push(`Tweet ${i + 1} is empty.`);
        return;
      }
      const n = measure(t, unit);
      if (n > spec.thread.perItemMax) {
        errors.push(`Tweet ${i + 1} is ${n}/${spec.thread.perItemMax} ${unit} (over by ${n - spec.thread.perItemMax}).`);
      }
    });
  } else {
    const value = c[field];
    const empty = value === undefined || value === null || String(value).trim() === '';
    if (required && empty) {
      errors.push(`Missing required field "${field}".`);
    } else if (!empty) {
      const n = measure(String(value), unit);
      if (n > max) {
        errors.push(`"${field}" is ${n}/${max} ${unit} (over by ${n - max}).`);
      } else if (n > Math.floor(max * 0.95)) {
        warnings.push(`"${field}" is ${n}/${max} ${unit} — close to the limit.`);
      }
    }
  }

  // Media: required for some platforms, must be a public URL when present.
  // Carousel form (e.g. Instagram image_urls[]) is validated per item.
  if (spec.media) {
    const cz   = spec.media.carousel;
    const urls = cz && Array.isArray(c[cz.field]) ? c[cz.field] : null;
    if (urls) {
      if (urls.length < cz.min || urls.length > cz.max) {
        errors.push(`${spec.label} carousel needs ${cz.min}–${cz.max} images (got ${urls.length}).`);
      }
      urls.forEach((u, i) => {
        if (typeof u !== 'string' || !/^https?:\/\//i.test(String(u).trim())) {
          errors.push(`Carousel image ${i + 1} must be a public http(s) URL.`);
        }
      });
    } else {
      const m = c[spec.media.field];
      const present = typeof m === 'string' && m.trim() !== '';
      if (spec.media.required && !present) {
        errors.push(`${spec.label} requires "${spec.media.field}" — a public ${spec.media.kind} URL.`);
      } else if (present && !/^https?:\/\//i.test(m.trim())) {
        errors.push(`"${spec.media.field}" must be a public http(s) URL.`);
      }
    }
  }

  // Whether this payload carries at least one image (single or carousel) for the
  // platform — alt text needs an image to attach to.
  const carouselField = spec.media?.carousel?.field;
  const carouselUrls  = carouselField && Array.isArray(c[carouselField]) ? c[carouselField] : null;
  const hasSingle     = spec.media && typeof c[spec.media.field] === 'string' && c[spec.media.field].trim() !== '';
  const hasImage      = !!(carouselUrls?.length || hasSingle);

  // Alt text (ALPHA-014): only on platforms whose API supports it, and only with
  // an image present. `alt_texts[]` is the per-slide form for a carousel.
  const altText = c.alt_text;
  if (altText != null && String(altText).trim() !== '') {
    if (!spec.altText) {
      errors.push(`${spec.label} does not support image alt text via the API.`);
    } else if (!hasImage) {
      errors.push(`alt_text needs an image — add "${spec.media.field}".`);
    } else if (carouselUrls?.length) {
      errors.push(`For a carousel, use "alt_texts" (one per image), not "alt_text".`);
    }
  }
  if (Array.isArray(c.alt_texts) && c.alt_texts.length) {
    if (!spec.altText || !carouselField) {
      errors.push(`"alt_texts" is only for ${spec.label} carousels.`);
    } else if (!carouselUrls?.length) {
      errors.push(`"alt_texts" needs carousel images in "${carouselField}".`);
    } else if (c.alt_texts.length !== carouselUrls.length) {
      errors.push(`"alt_texts" has ${c.alt_texts.length} entries but there are ${carouselUrls.length} images — they must match 1:1.`);
    }
  }

  // First comment (ALPHA-015): posted after a confirmed publish, only on
  // platforms whose API exposes a comments edge.
  const firstComment = c.first_comment;
  if (firstComment != null && String(firstComment).trim() !== '' && !spec.firstComment) {
    errors.push(`${spec.label} does not support a first comment via the API.`);
  }

  return { ok: errors.length === 0, platform, label: spec.label, errors, warnings };
}

// The human-visible text of a payload for a platform — the single text field, or
// a thread's tweets joined — used by the policy disclosure check. Mirrors how
// validate() locates the text field via the platform spec.
function contentText(platform, content) {
  const spec = PLATFORM_SPECS[platform];
  const c = content || {};
  if (spec?.thread && Array.isArray(c[spec.thread.field])) {
    return c[spec.thread.field].filter(t => typeof t === 'string').join('\n');
  }
  const field = spec?.text?.field;
  return field != null && c[field] != null ? String(c[field]) : '';
}

function tokenSet(v) {
  return Array.isArray(v) ? v.filter(t => String(t ?? '').trim() !== '') : [];
}

// Whether `token` appears in `text` (both already lowercased) as a standalone
// unit, not buried inside a larger word. Plain substring containment fails open:
// "#ad" would match "#advanced" and "Ad" would match "had", letting a post skip a
// required disclosure. So we require a non-word char (or string edge) on each side
// of the match. Token-internal characters (e.g. the leading "#", or a space in
// "paid partnership") are unaffected — only the outer edges are boundary-checked.
const isWordChar = (ch) => ch !== undefined && /[a-z0-9_]/.test(ch);
function containsToken(text, token) {
  if (!token) return false;
  for (let i = text.indexOf(token); i !== -1; i = text.indexOf(token, i + 1)) {
    const before = i > 0 ? text[i - 1] : undefined;
    const after  = text[i + token.length]; // undefined past the end
    if (!isWordChar(before) && !isWordChar(after)) return true;
  }
  return false;
}

// Content policy / guardrail check (INDIV-004). PURE: the handler loads the
// brand kit's `policy` block via brand.getOrEmpty(account) and passes it in, so
// validate stays disk-free (the link_tag pattern). Returns errors[] (blocking),
// warnings[] (non-blocking), and notes[] (agent reminders) the caller merges
// into the validation result and the dry-run preview.
//
// - Required disclosures: a `disclosures.always` token absent from the text is a
//   WARNING. On a sponsored post (sponsored:true — a per-call flag, not stored
//   content), a `disclosures.sponsored` token absent is an ERROR (you may not
//   ship a sponsored post missing #ad). Present tokens are echoed as notes so the
//   preview is a positive confirmation, not just a list of what's wrong.
// - Banned topics: not string-detectable (agent-judged) — surfaced as a note so
//   the drafter is reminded; banned_words stays the agent-consulted voice check.
//
// Null-safe: a missing/empty policy yields no errors/warnings/notes.
export function checkPolicy(platform, content, policy, { sponsored = false } = {}) {
  const errors = [];
  const warnings = [];
  const notes = [];
  const p = policy || {};
  const disc = p.disclosures || {};
  const text = contentText(platform, content).toLowerCase();
  const present = (tok) => containsToken(text, String(tok).toLowerCase());

  for (const tok of tokenSet(disc.always)) {
    if (present(tok)) notes.push(`Disclosure "${tok}" present ✓`);
    else warnings.push(`Required disclosure "${tok}" is missing from the text.`);
  }
  if (sponsored) {
    for (const tok of tokenSet(disc.sponsored)) {
      if (present(tok)) notes.push(`Sponsored disclosure "${tok}" present ✓`);
      else errors.push(`Sponsored post is missing the required disclosure "${tok}".`);
    }
  }

  const topics = tokenSet(p.banned_topics);
  if (topics.length) notes.push(`Banned topics — do not write about: ${topics.join(', ')} (agent-judged).`);

  return { errors, warnings, notes };
}

// Human-readable one-tool summary.
export function formatValidation(v) {
  const head = v.ok
    ? `✓ Valid for ${v.label || v.platform}.`
    : `✗ Invalid for ${v.label || v.platform}.`;
  const parts = [head];
  if (v.errors.length)   parts.push('Errors:\n' + v.errors.map(e => `  - ${e}`).join('\n'));
  if (v.warnings.length) parts.push('Warnings:\n' + v.warnings.map(w => `  - ${w}`).join('\n'));
  if (v.notes && v.notes.length) parts.push('Policy:\n' + v.notes.map(n => `  - ${n}`).join('\n'));
  return parts.join('\n');
}
