// Single source of truth for per-platform constraints. Consumed by validate,
// adapt, config, and the content_validate / content_adapt tools. Keeping the
// limits here (not scattered through adapters) means one edit when a platform
// changes its rules.

export const PLATFORM_SPECS = {
  x: {
    label: 'X (Twitter)',
    text:  { field: 'text', max: 280, unit: 'chars', required: true },
    thread: { field: 'tweets', perItemMax: 280 },
    media: { field: 'image_url', kind: 'image', required: false },
    credentials: ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET'],
  },
  instagram: {
    label: 'Instagram',
    text:  { field: 'caption', max: 2200, unit: 'chars', required: true },
    media: { field: 'image_url', kind: 'image', required: true, carousel: { field: 'image_urls', min: 2, max: 10 } },
    // Image alt text (ALPHA-014) via the /media container `alt_text` field; a
    // first comment (ALPHA-015) via the /{media}/comments edge after publish.
    altText: true,
    firstComment: true,
    credentials: ['INSTAGRAM_USER_ID', 'INSTAGRAM_ACCESS_TOKEN'],
  },
  tiktok: {
    label: 'TikTok',
    text:  { field: 'caption', max: 2200, unit: 'chars', required: true },
    media: { field: 'video_url', kind: 'video', required: true },
    credentials: ['TIKTOK_ACCESS_TOKEN'],
  },
  facebook: {
    label: 'Facebook',
    text:  { field: 'message', max: 63206, unit: 'chars', required: true },
    media: { field: 'image_url', kind: 'image', required: false },
    // Photo alt text (ALPHA-014) via the /photos `alt_text_custom` field —
    // UNVERIFIED live (it did not read back off the photo in testing; may need a
    // fuller-scoped token or a two-step set). First comment (ALPHA-015) via the
    // /{post}/comments edge after publish — needs the `pages_manage_engagement`
    // scope (a token without it fails the comment soft; the post stays live).
    altText: true,
    firstComment: true,
    credentials: ['FACEBOOK_PAGE_ID', 'FACEBOOK_ACCESS_TOKEN'],
  },
  threads: {
    label: 'Threads',
    text:  { field: 'text', max: 500, unit: 'chars', required: true },
    media: { field: 'image_url', kind: 'image', required: false },
    // Image alt text (ALPHA-014) via the IMAGE container `alt_text` param.
    // Unverified against the live API (no Threads credentials yet).
    altText: true,
    credentials: ['THREADS_USER_ID', 'THREADS_ACCESS_TOKEN'],
  },
  bluesky: {
    label: 'Bluesky',
    text:  { field: 'text', max: 300, unit: 'graphemes', required: true },
    credentials: ['BLUESKY_IDENTIFIER', 'BLUESKY_APP_PASSWORD'],
  },
};

export const PLATFORMS = Object.keys(PLATFORM_SPECS);

// Length in the unit a platform counts by. Bluesky (AT Protocol) counts
// grapheme clusters, so "👨‍👩‍👧" is one unit, not several code units.
const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null;

export function measure(str, unit = 'chars') {
  const s = str ?? '';
  if (unit === 'graphemes' && segmenter) {
    let n = 0;
    for (const _ of segmenter.segment(s)) n++;
    return n;
  }
  return [...s].length;
}

// First `max` units of a string, never splitting a grapheme cluster.
export function sliceUnits(str, max, unit = 'chars') {
  const s = str ?? '';
  if (unit === 'graphemes' && segmenter) {
    let out = '', n = 0;
    for (const seg of segmenter.segment(s)) {
      if (n >= max) break;
      out += seg.segment;
      n++;
    }
    return out;
  }
  return [...s].slice(0, max).join('');
}

// Greedily pack words into chunks of at most `max` units, preferring word
// boundaries. A single word longer than `max` is hard-split.
export function splitIntoChunks(text, max, unit = 'chars') {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const chunks = [];
  let current = '';

  const pushCurrent = () => { if (current) { chunks.push(current); current = ''; } };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate, unit) <= max) {
      current = candidate;
      continue;
    }
    pushCurrent();
    if (measure(word, unit) <= max) {
      current = word;
    } else {
      let rest = word;
      while (measure(rest, unit) > max) {
        const head = sliceUnits(rest, max, unit);
        chunks.push(head);
        rest = rest.slice(head.length);
      }
      current = rest;
    }
  }
  pushCurrent();
  return chunks;
}
