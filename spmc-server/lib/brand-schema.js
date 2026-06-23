// The brand-kit field schema — the single source for guided brand setup (the
// `brand-setup` skill walks it field-by-field) and a future web-UI settings form
// (which renders these fields directly). This is the *persistent* individuality
// layer; lib/brief.js is the *per-run* delta. The kit's emptyProfile() is the
// full storage shape; this is the curated, ordered, human-facing subset worth
// onboarding — each field carries the dotted `path` into a brand profile so the
// same spec can read current values and write updates. Credential-free.

// Each field: a dotted `path` into the profile (also its stable key), a `label`,
// a `type` (text | enum | multiselect | list | color | url), a `group` for
// ordering, `help`, optional `options` (enum), and `recommended` (the high-value
// fields setup should secure first). Nothing is hard-required — a kit is useful
// partially filled — but recommended fields are what make outputs feel on-brand.
export const BRAND_FIELDS = [
  // ── Voice ──────────────────────────────────────────────────────────────────
  { path: 'voice.tone', label: 'Tone', type: 'text', group: 'Voice', recommended: true,
    help: 'How it should sound, e.g. "concise, direct, a little dry".' },
  { path: 'voice.audience', label: 'Audience', type: 'text', group: 'Voice', recommended: true,
    help: 'Who it speaks to, e.g. "indie devs and technical founders".' },
  { path: 'voice.register', label: 'Register', type: 'text', group: 'Voice',
    help: 'Formality, e.g. "casual-professional".' },
  { path: 'voice.emoji_policy', label: 'Emoji policy', type: 'enum', group: 'Voice',
    options: ['none', 'sparing', 'liberal'], help: 'How freely to use emoji.' },
  { path: 'voice.banned_words', label: 'Banned words', type: 'list', group: 'Voice',
    help: 'Words/phrases to avoid, e.g. "synergy", "leverage".' },

  // ── Visual identity (drives media_compose) ──────────────────────────────────
  { path: 'visual.accent', label: 'Accent color', type: 'color', group: 'Visual identity', recommended: true,
    help: 'Emphasis color for chrome (kicker, rules, mark), e.g. #1df7ed. Reserved for accents, not large fills.' },
  { path: 'visual.bg_color', label: 'Background (dark)', type: 'color', group: 'Visual identity', recommended: true,
    help: 'Primary dark background, e.g. #05091e.' },
  { path: 'visual.surface', label: 'Surface (panel)', type: 'color', group: 'Visual identity',
    help: 'Lighter panel/card background for depth, e.g. #121b33. Leave blank to match the background.' },
  { path: 'visual.heading_color', label: 'Heading text', type: 'color', group: 'Visual identity',
    help: 'Headline color, e.g. #f4f8ff. Leave blank to auto-derive a legible color from the background.' },
  { path: 'visual.body_color', label: 'Body text', type: 'color', group: 'Visual identity',
    help: 'Body color, e.g. #8ac0dd. Leave blank to auto-derive a legible color from the background.' },
  { path: 'visual.handle', label: 'Handle', type: 'text', group: 'Visual identity', recommended: true,
    help: 'The @handle wordmark shown on composed images, e.g. @yourbrand.' },
  { path: 'visual.logo_url', label: 'Logo URL', type: 'url', group: 'Visual identity',
    help: 'Public URL of a logo stamped bottom-right on composed images.' },
  { path: 'visual.icon_url', label: 'Icon URL', type: 'url', group: 'Visual identity',
    help: 'Public URL of a circular avatar/icon for the square-news footer.' },
  { path: 'visual.default_template', label: 'Default template', type: 'enum', group: 'Visual identity',
    options: ['square-dark', 'square-tall', 'story-dark', 'banner-wide', 'square-news'],
    help: 'Template media_compose uses when none is named. square-tall (4:5) gets the most feed reach.' },

  // ── Hashtags & CTA ──────────────────────────────────────────────────────────
  { path: 'hashtags.default', label: 'Default hashtags', type: 'list', group: 'Hashtags & CTA',
    help: 'Hashtags to consider by default, e.g. "#buildinpublic", "#AI".' },
  { path: 'cta', label: 'Calls to action', type: 'list', group: 'Hashtags & CTA',
    help: 'Reusable CTAs, e.g. "Star the repo: {url}".' },

  // ── Notes ─────────────────────────────────────────────────────────────────
  { path: 'notes', label: 'Brand notes', type: 'text', group: 'Notes',
    help: 'Anything else the agent should keep in mind when writing for this brand.' },
];

// Dotted-path getter used to resolve a field's `path` against a brand profile.
function at(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function isSet(v) {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  return String(v).trim() !== '';
}

// Annotate the spec with each field's current value for an account so guided
// setup can confirm/skip what is already set and a UI can pre-populate. Pure:
// profile in, annotated copy out (never mutates BRAND_FIELDS). A field that is
// already set gets `current`; `set` is the boolean.
export function brandSchema(brandProfile = null) {
  return BRAND_FIELDS.map((f) => {
    const v = brandProfile ? at(brandProfile, f.path) : undefined;
    return isSet(v) ? { ...f, set: true, current: v } : { ...f, set: false };
  });
}

// Human-readable rendering for the brand_schema tool: fields grouped, marking
// recommended-ness, options, and the current value where set. Leads with a
// short status line (how many recommended fields remain) so the agent knows
// whether to offer guided setup.
export function formatBrandSchema(fields) {
  const groups = [];
  for (const f of fields) {
    let g = groups.find(x => x.name === f.group);
    if (!g) { g = { name: f.group, items: [] }; groups.push(g); }
    g.items.push(f);
  }
  const recMissing = fields.filter(f => f.recommended && !f.set).length;
  const head = recMissing === 0
    ? 'Brand kit — all recommended fields are set. Fields and current values:'
    : `Brand kit setup — ${recMissing} recommended field(s) still empty. Walk these one at a time, confirming any already set:`;

  const body = groups.map((g) => {
    const lines = g.items.map((f) => {
      const tag  = f.recommended ? 'recommended' : 'optional';
      const opts = f.options ? ` — options: ${f.options.join(', ')}` : '';
      const cur  = f.set
        ? `\n    ↳ current: ${Array.isArray(f.current) ? f.current.join(', ') : f.current}`
        : '';
      return `• ${f.label} \`${f.path}\` (${f.type}, ${tag})${opts}\n    ${f.help}${cur}`;
    });
    return `\n${g.name}\n${lines.join('\n')}`;
  }).join('\n');

  return `${head}\n${body}\n\nWrite values with brand_voice(action:"set", profile:{…}) using the dotted paths above.`;
}
