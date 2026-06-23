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
    platforms: {},        // optional per-platform overrides, e.g. { x: { tone: "punchier" } }
    notes:     '',        // freeform brand notes for the agent
  };
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
