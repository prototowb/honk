import { readJsonOr, writeJsonAtomic } from './jsonstore.js';
import { dataFile } from './paths.js';
import type { BrandProfile, VoiceDelta, OverrideField, ResolvedVoice } from './types.js';

// Brand voice profile (ALPHA-009): a persistent brand kit that the content
// skills read so every draft matches the user's voice without re-specifying it
// each time. Credential-free and stored per account ('' = default). This is
// content configuration, not secrets — it never holds tokens.

function file(): string { return dataFile('brand.json'); }

// The empty skeleton returned for an unconfigured account, so callers always
// see a predictable shape and know which fields a profile can carry.
export function emptyProfile(): BrandProfile {
  return {
    voice: {
      tone:         '',
      audience:     '',
      register:     '',
      emoji_policy: '',
      banned_words: [],
      do:           [],
      dont:         [],
    },
    hashtags: {
      default: [],
      sets:    {},
    },
    cta:   [],
    visual: {
      accent:        '',
      bg_color:      '',
      surface:       '',
      heading_color: '',
      body_color:    '',
      logo_url:      '',
      icon_url:      '',
      handle:        '',
      default_template: '',
    },
    links: {
      utm_defaults: {},
      shortener:    null,
    },
    platforms: {},
    audiences: {},
    policy: {
      banned_topics: [],
      disclosures: {
        always:    [],
        sponsored: [],
      },
      auto_publish: false,
    },
    notes:     '',
  };
}

// The voice fields a tailoring override can set, each mapped to where the base
// value lives in the profile. The single source for BOTH tailoring axes
// (per-platform and per-audience): resolveVoice() reads it, and a future UI panel /
// brand_schema extension renders from it (schema symmetry — same ethos as
// BRAND_FIELDS). `key` is the flat key under the override map; `basePath` is the
// dotted base fallback; `type` drives empty-value defaulting.
export const OVERRIDE_FIELDS: OverrideField[] = [
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

function at(obj: unknown, path: string): unknown {
  return path.split('.').reduce((o: unknown, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj);
}

function isSet(v: unknown): boolean {
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
export function resolveVoice(profile: BrandProfile | null | undefined, opts: { platform?: string; audience?: string } | string = {}): ResolvedVoice {
  const { platform, audience } = typeof opts === 'string' ? { platform: opts } : (opts || {});
  const base       = profile || {} as BrandProfile;
  const platformOv: VoiceDelta = (platform && base.platforms && base.platforms[platform]) || {};
  const audiences  = base.audiences || {};
  const named      = audience != null && audience !== '';
  const knownAudience   = named && Object.prototype.hasOwnProperty.call(audiences, audience!);
  const unknownAudience = named && !knownAudience;
  const segment: Omit<VoiceDelta, 'audience'>    = knownAudience ? (audiences[audience!] || {}) : {};

  const effective: Record<string, string | string[]> = {};
  const sources: Record<string, 'base' | 'audience' | 'platform'> = {};
  for (const f of OVERRIDE_FIELDS) {
    if (f.key === 'audience') {
      if (isSet(platformOv.audience)) { effective.audience = platformOv.audience!; sources.audience = 'platform'; }
      else if (knownAudience)         { effective.audience = audience!;            sources.audience = 'audience'; }
      else { const b = at(base, f.basePath); effective.audience = isSet(b) ? String(b) : ''; sources.audience = 'base'; }
      continue;
    }
    const segVal = (segment as VoiceDelta)[f.key as keyof VoiceDelta];
    const platVal = platformOv[f.key as keyof VoiceDelta];
    if (isSet(platVal))   { effective[f.key] = platVal as string | string[]; sources[f.key] = 'platform'; }
    else if (isSet(segVal)) { effective[f.key] = segVal as string | string[]; sources[f.key] = 'audience'; }
    else { const b = at(base, f.basePath); effective[f.key] = isSet(b) ? b as string | string[] : (f.type === 'list' ? [] : ''); sources[f.key] = 'base'; }
  }
  const overridden = OVERRIDE_FIELDS.map(f => f.key).filter(k => sources[k] !== 'base');
  return { platform, audience, effective, overridden, sources, unknownAudience };
}

function load(): Record<string, BrandProfile> {
  // Corrupt-file backup via readJsonOr: the brand kit is user-authored data —
  // never silently treat a torn file as empty (INIT-006).
  return readJsonOr<Record<string, BrandProfile>>(file(), {});
}

// A `set`/`clear` is a deliberate user action — let write errors surface rather
// than silently dropping the change (unlike the background tracking stores).
function save(data: Record<string, BrandProfile>): void {
  writeJsonAtomic(file(), data);
}

function key(account: string): string { return account || '_default'; }

// The stored profile for an account, or null if none is set.
export function get(account = ''): BrandProfile | null {
  return load()[key(account)] || null;
}

// The stored profile or the empty skeleton — never null.
export function getOrEmpty(account = ''): BrandProfile {
  return get(account) || emptyProfile();
}

// Deep-merge `patch` into the stored profile: nested objects merge, arrays and
// scalars replace. Pass replace:true to overwrite the profile wholesale.
export function set(patch: Partial<BrandProfile>, account = '', { replace = false }: { replace?: boolean } = {}): BrandProfile {
  const all = load();
  const k = key(account);
  all[k] = replace ? (patch as BrandProfile) : deepMerge((all[k] || emptyProfile()) as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>);
  save(all);
  return all[k];
}

export function clear(account = ''): boolean {
  const all = load();
  const k = key(account);
  const existed = k in all;
  delete all[k];
  save(all);
  return existed;
}

// Account keys that have a stored profile ('_default' for the default account).
export function list(): string[] {
  return Object.keys(load());
}

// ── Active account pointer (INDIV-006) ──────────────────────────────────────
// A single persisted "which account am I working on" selection, kept in its OWN
// small state file rather than inside brand.json — so the flat brand-profile map
// stays single-concern and this can grow into a fuller account registry (display
// names, created_at) when the UI lands, with no migration. '' = the default
// account. This is selection state the brand-management surface + a future UI
// read; it deliberately does NOT become a silent default for publishing/compose.
function activeFile(): string { return dataFile('brand-active.json'); }

export function getActive(): string {
  return readJsonOr<{ active?: string }>(activeFile(), {}).active || '';
}

export function setActive(account = ''): string {
  writeJsonAtomic(activeFile(), { active: account || '' });
  return account || '';
}

// Copy an account's whole profile to a new account key as a starting point
// (multi-brand bootstrap). Deep clone so the two diverge independently. Refuses
// to clobber an existing target, and never touches the active pointer (this is
// "create", not "switch"). Throws if there's nothing to copy or no target.
export function clone(from = '', to: string): BrandProfile {
  const target = (to || '').trim();
  if (!target) throw new Error('clone needs a target account name (`to`).');
  const all = load();
  const src = all[key(from)];
  if (!src) throw new Error(`No brand profile to clone for ${from ? `'${from}'` : 'the default account'}.`);
  if (all[key(target)]) throw new Error(`Account '${target}' already has a profile — clear it first or pick another name.`);
  all[key(target)] = JSON.parse(JSON.stringify(src)) as BrandProfile;
  save(all);
  return all[key(target)];
}

function deepMerge(base: Record<string, unknown>, patch: Record<string, unknown>): BrandProfile {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) return patch as unknown as BrandProfile;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    const into = out[k];
    if (v && typeof v === 'object' && !Array.isArray(v)
        && into && typeof into === 'object' && !Array.isArray(into)) {
      out[k] = deepMerge(into as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out as unknown as BrandProfile;
}
