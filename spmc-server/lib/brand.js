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

// The voice fields a per-platform override can set, each mapped to where the
// base value lives in the profile. This is the single source for per-platform
// tailoring: resolveVoice() reads it, and a future per-platform UI panel /
// brand_schema extension renders from it (schema symmetry — same ethos as
// BRAND_FIELDS). `key` is the flat key under profile.platforms[platform];
// `basePath` is the dotted base fallback; `type` drives empty-value defaulting.
export const PLATFORM_OVERRIDE_FIELDS = [
  { key: 'tone',         basePath: 'voice.tone',         label: 'Tone',         type: 'text' },
  { key: 'register',     basePath: 'voice.register',     label: 'Register',     type: 'text' },
  { key: 'emoji_policy', basePath: 'voice.emoji_policy', label: 'Emoji policy', type: 'enum' },
  { key: 'audience',     basePath: 'voice.audience',     label: 'Audience',     type: 'text' },
  { key: 'hashtags',     basePath: 'hashtags.default',   label: 'Hashtags',     type: 'list' },
  { key: 'cta',          basePath: 'cta',                label: 'CTAs',         type: 'list' },
];

function at(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function isSet(v) {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  return String(v).trim() !== '';
}

// Resolve the effective voice for a platform: for each overridable field, take
// the per-platform value (profile.platforms[platform][key]) when set, else fall
// back to the base value. Replace semantics throughout — a set override wins
// wholesale, arrays included (a per-platform hashtag list replaces the default
// list, it does not extend it), matching the kit's deep-merge contract. Pure and
// null-safe: a missing profile/override yields the base (or an empty value).
// `overridden` names the fields the platform layer actually changed (provenance,
// like media's appliedFromKit).
export function resolveVoice(profile, platform) {
  const base = profile || {};
  const override = (base.platforms && base.platforms[platform]) || {};
  const effective = {};
  const overridden = [];
  for (const f of PLATFORM_OVERRIDE_FIELDS) {
    if (isSet(override[f.key])) {
      effective[f.key] = override[f.key];
      overridden.push(f.key);
    } else {
      const baseVal = at(base, f.basePath);
      effective[f.key] = isSet(baseVal) ? baseVal : (f.type === 'list' ? [] : '');
    }
  }
  return { platform, effective, overridden };
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
