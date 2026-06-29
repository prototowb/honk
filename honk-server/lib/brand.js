import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dataFile } from './paths.js';

// Brand voice profile (ALPHA-009): a persistent brand kit that the content
// skills read so every draft matches the user's voice without re-specifying it
// each time. Credential-free and stored per account ('' = default). This is
// content configuration, not secrets — it never holds tokens.

function file() { return dataFile('brand.json'); }

// The empty skeleton returned for an unconfigured account, so callers always
// see a predictable shape and know which fields a profile can carry.
export function emptyProfile() {
  return {
    voice: {
      tone:         '',   // e.g. "concise, direct, a little dry"
      audience:     '',   // e.g. "indie devs and technical founders"
      register:     '',   // e.g. "casual-professional"
      emoji_policy: '',   // one of: none | sparing | liberal
      banned_words: [],   // words/phrases to avoid (e.g. "synergy", "leverage")
      do:           [],   // voice guidance to follow
      dont:         [],   // voice guidance to avoid
    },
    hashtags: {
      default: [],        // hashtags to consider by default
      sets:    {},        // named sets, e.g. { launch: ["#..."], devlog: ["#..."] }
    },
    cta:   [],            // reusable calls-to-action, e.g. "Star the repo: {url}"
    visual: {             // visual identity — media_compose + the output skills default from this
      accent:        '',  // accent/emphasis color (chrome, kicker, rules), e.g. #1df7ed
      bg_color:      '',  // primary (dark) background, e.g. #05091e
      surface:       '',  // lighter panel/card background for depth, e.g. #121b33
      heading_color: '',  // headline text (else derived from bg for contrast), e.g. #f4f8ff
      body_color:    '',  // body text (else derived from bg for contrast), e.g. #8ac0dd
      logo_url:      '',  // logo stamped bottom-right on composed images
      icon_url:      '',  // circular avatar/icon for footers (square-news)
      handle:        '',  // @handle wordmark shown on templates
      default_template: '', // template id used when media_compose is called without one
    },
    links: {
      utm_defaults: {},   // e.g. { utm_source: "{platform}", utm_medium: "social" }
      shortener:    null, // optional short-link domain/service note
    },
    platforms: {},        // optional per-platform voice deltas, flat per platform,
                          // e.g. { x: { tone: "punchier", hashtags: ["#dev"] } }.
                          // Overridable keys: tone, register, emoji_policy, audience,
                          // hashtags, cta (see PLATFORM_OVERRIDE_FIELDS). A set value
                          // replaces the base for that platform; resolveVoice() merges.
    audiences: {},        // optional named audience segments — the second tailoring
                          // axis (INDIV-005), e.g. { "enterprise": { tone: "measured",
                          // hashtags: ["#infosec"] } }. Segment keys: tone, register,
                          // emoji_policy, hashtags, cta (NOT audience — selecting the
                          // segment IS the audience choice; see SEGMENT_OVERRIDE_FIELDS).
                          // resolveVoice() merges a segment over the base, under platform.
    policy: {             // content guardrails (INDIV-004) — what the brand must not
                          // say, what it must always say, and how freely it publishes.
                          // Checked by validate's checkPolicy() (the handler passes
                          // this block in; validate stays disk-free).
      banned_topics: [],  // semantic no-go themes (agent-judged, surfaced as reminders),
                          //   e.g. "competitor comparisons", "politics"
      disclosures: {      // required strings the text must contain
        always:    [],    //   always required — missing → warning, e.g. ["Ad"]
        sponsored: [],    //   required only on a sponsored post — missing → error, e.g. ["#ad"]
      },
      auto_publish: false,// false (default) = always confirm before publishing.
                          //   Agent-guided (documented in the persona/skills); a
                          //   deterministic dispatch gate is a deferred follow-up.
    },
    notes:     '',        // freeform brand notes for the agent
  };
}

// The voice fields a tailoring override can set, each mapped to where the base
// value lives in the profile. The single source for BOTH tailoring axes
// (per-platform and per-audience): resolveVoice() reads it, and a future UI panel /
// brand_schema extension renders from it (schema symmetry — same ethos as
// BRAND_FIELDS). `key` is the flat key under the override map; `basePath` is the
// dotted base fallback; `type` drives empty-value defaulting.
export const OVERRIDE_FIELDS = [
  { key: 'tone',         basePath: 'voice.tone',         label: 'Tone',         type: 'text' },
  { key: 'register',     basePath: 'voice.register',     label: 'Register',     type: 'text' },
  { key: 'emoji_policy', basePath: 'voice.emoji_policy', label: 'Emoji policy', type: 'enum' },
  { key: 'audience',     basePath: 'voice.audience',     label: 'Audience',     type: 'text' },
  { key: 'hashtags',     basePath: 'hashtags.default',   label: 'Hashtags',     type: 'list' },
  { key: 'cta',          basePath: 'cta',                label: 'CTAs',         type: 'list' },
];

// A per-platform override can set all six fields. (Alias kept as the platform set's
// stable name; it IS the full OVERRIDE_FIELDS.)
export const PLATFORM_OVERRIDE_FIELDS = OVERRIDE_FIELDS;

// A named audience SEGMENT can set every field EXCEPT `audience` — a segment can't
// redefine which audience it is (circular); selecting the segment is itself the
// audience choice (resolveVoice sets the effective audience to the segment name).
export const SEGMENT_OVERRIDE_FIELDS = OVERRIDE_FIELDS.filter(f => f.key !== 'audience');

function at(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function isSet(v) {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  return String(v).trim() !== '';
}

// Resolve the effective voice for a platform and/or a named audience segment.
// Two tailoring axes layered over the base voice with precedence
// **base ▸ audience ▸ platform** — platform wins last because it is the hardest
// channel constraint (X wants 1–2 hashtags whatever the audience). Replace
// semantics throughout — a set override wins wholesale, arrays included (a delta's
// hashtag list replaces, never extends), matching the kit's deep-merge contract;
// so a platform delta on a field FULLY shadows an audience delta on the same field.
//
// `opts` is `{ platform?, audience? }`; a bare string is treated as the platform
// (back-compat). The `audience` field is special: a segment can't carry its own
// audience, so selecting a known segment sets the effective `audience` to the
// segment name (a platform delta can still override it). An audience NAME that
// isn't a defined segment does NOT silently apply — values stay base and
// `unknownAudience` is set so the caller can flag it.
//
// Pure and null-safe. Returns `effective` (the six fields), `sources` (per-field
// provenance: 'base' | 'audience' | 'platform'), `overridden` (the non-base keys),
// and `unknownAudience`.
export function resolveVoice(profile, opts = {}) {
  const { platform, audience } = typeof opts === 'string' ? { platform: opts } : (opts || {});
  const base       = profile || {};
  const platformOv = (platform && base.platforms && base.platforms[platform]) || {};
  const audiences  = base.audiences || {};
  const named      = audience != null && audience !== '';
  const knownAudience   = named && Object.prototype.hasOwnProperty.call(audiences, audience);
  const unknownAudience = named && !knownAudience;
  const segment    = knownAudience ? (audiences[audience] || {}) : {};

  const effective = {};
  const sources   = {};
  for (const f of OVERRIDE_FIELDS) {
    if (f.key === 'audience') {
      if (isSet(platformOv.audience)) { effective.audience = platformOv.audience; sources.audience = 'platform'; }
      else if (knownAudience)         { effective.audience = audience;            sources.audience = 'audience'; }
      else { const b = at(base, f.basePath); effective.audience = isSet(b) ? b : ''; sources.audience = 'base'; }
      continue;
    }
    if (isSet(platformOv[f.key]))   { effective[f.key] = platformOv[f.key]; sources[f.key] = 'platform'; }
    else if (isSet(segment[f.key])) { effective[f.key] = segment[f.key];   sources[f.key] = 'audience'; }
    else { const b = at(base, f.basePath); effective[f.key] = isSet(b) ? b : (f.type === 'list' ? [] : ''); sources[f.key] = 'base'; }
  }
  const overridden = OVERRIDE_FIELDS.map(f => f.key).filter(k => sources[k] !== 'base');
  return { platform, audience, effective, overridden, sources, unknownAudience };
}

function load() {
  if (!existsSync(file())) return {};
  try { return JSON.parse(readFileSync(file(), 'utf8')); }
  catch { return {}; }
}

// A `set`/`clear` is a deliberate user action — let write errors surface rather
// than silently dropping the change (unlike the background tracking stores).
function save(data) {
  writeFileSync(file(), JSON.stringify(data, null, 2));
}

function key(account) { return account || '_default'; }

// The stored profile for an account, or null if none is set.
export function get(account = '') {
  return load()[key(account)] || null;
}

// The stored profile or the empty skeleton — never null.
export function getOrEmpty(account = '') {
  return get(account) || emptyProfile();
}

// Deep-merge `patch` into the stored profile: nested objects merge, arrays and
// scalars replace. Pass replace:true to overwrite the profile wholesale.
export function set(patch, account = '', { replace = false } = {}) {
  const all = load();
  const k = key(account);
  all[k] = replace ? patch : deepMerge(all[k] || emptyProfile(), patch);
  save(all);
  return all[k];
}

export function clear(account = '') {
  const all = load();
  const k = key(account);
  const existed = k in all;
  delete all[k];
  save(all);
  return existed;
}

// Account keys that have a stored profile ('_default' for the default account).
export function list() {
  return Object.keys(load());
}

// ── Active account pointer (INDIV-006) ──────────────────────────────────────
// A single persisted "which account am I working on" selection, kept in its OWN
// small state file rather than inside brand.json — so the flat brand-profile map
// stays single-concern and this can grow into a fuller account registry (display
// names, created_at) when the UI lands, with no migration. '' = the default
// account. This is selection state the brand-management surface + a future UI
// read; it deliberately does NOT become a silent default for publishing/compose.
function activeFile() { return dataFile('brand-active.json'); }

export function getActive() {
  if (!existsSync(activeFile())) return '';
  try { return JSON.parse(readFileSync(activeFile(), 'utf8')).active || ''; }
  catch { return ''; }
}

export function setActive(account = '') {
  writeFileSync(activeFile(), JSON.stringify({ active: account || '' }, null, 2));
  return account || '';
}

// Copy an account's whole profile to a new account key as a starting point
// (multi-brand bootstrap). Deep clone so the two diverge independently. Refuses
// to clobber an existing target, and never touches the active pointer (this is
// "create", not "switch"). Throws if there's nothing to copy or no target.
export function clone(from = '', to) {
  const target = (to || '').trim();
  if (!target) throw new Error('clone needs a target account name (`to`).');
  const all = load();
  const src = all[key(from)];
  if (!src) throw new Error(`No brand profile to clone for ${from ? `'${from}'` : 'the default account'}.`);
  if (all[key(target)]) throw new Error(`Account '${target}' already has a profile — clear it first or pick another name.`);
  all[key(target)] = JSON.parse(JSON.stringify(src));
  save(all);
  return all[key(target)];
}

function deepMerge(base, patch) {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) return patch;
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    const into = out[k];
    if (v && typeof v === 'object' && !Array.isArray(v)
        && into && typeof into === 'object' && !Array.isArray(into)) {
      out[k] = deepMerge(into, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
