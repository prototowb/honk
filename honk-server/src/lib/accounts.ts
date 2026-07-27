// Account registry v1 (INIT-014) — the seed grows up.
//
// `brand-active.json` (INDIV-006) held one thing: which account is active.
// Its own comment called it "the seed of a future account registry." This is
// that registry: still owns the active pointer, and now also caches the
// channel handle (from `account_info`) per account/platform, so a UI account
// switcher (BETA-011) has a real display surface without a live API round
// trip. Scope stays to what's stated in PROJECT_ARCHITECTURE.md — "credential
// identity (env prefix) x brand identity (brand.json key) x channel handles."
// Credential presence and brand-profile existence are NOT duplicated here —
// they're already live-computed from env and brand.json in config.ts's
// accountsOverview(); this store only owns what neither of those own.
//
// Versioned tracking store (INIT-008 contract): unlike brand.json/
// brand-active.json (deliberately flat, hand-editable-portable), this file is
// machine-written only (a `fetched_at`-stamped API cache) and will gain
// fields, so format drift should be detectable — { schema_version, items }
// via readVersioned/writeVersionedAtomic.
//
// Migration: when accounts.json doesn't exist yet, `active` is seeded
// read-only from the legacy brand-active.json pointer (no write, no explicit
// migration step for the user — the first setActive() call creates
// accounts.json going forward; brand-active.json is then simply unused).
//
// Registration is implicit and best-effort: only recordHandle() mints a
// registry row (called from the account_info tool). setActive() never
// creates a row — an account you've only ever switched to, never queried,
// has nothing worth caching yet.

import { existsSync } from 'fs';
import { dataFile } from './paths.js';
import { readJsonOr, readVersioned, writeVersionedAtomic } from './jsonstore.js';

const STORE = () => dataFile('accounts.json');
const LEGACY_ACTIVE_FILE = () => dataFile('brand-active.json');

export interface HandleInfo {
  id?: string;
  handle?: string | null;
  name?: string | null;
  icon_url?: string | null;
  fetched_at: string; // ISO timestamp of the account_info call that cached this
}

export interface AccountRecord {
  handles: Record<string, HandleInfo>; // platform -> cached account_info result
  created_at: string;
  updated_at: string;
}

interface AccountsStore {
  active: string;
  accounts: Record<string, AccountRecord>;
}

// Registry keys are lowercase-normalized (matches config.ts's accountsOverview
// join, which already lowercases both credential and brand-profile account
// names to unify e.g. "Brand" creds with a "brand" profile). The ACTIVE
// pointer is deliberately NOT normalized here — brand.get()/getOrEmpty() and
// env(key, account) key off the raw case the user set it to, so lowercasing
// getActive()'s return would desync the pointer from the accounts it points
// at (a live policy-fallback regression, not just a display quirk).
function key(account: string): string {
  return (account || '').trim().toLowerCase() || '_default';
}

function load(): AccountsStore {
  if (!existsSync(STORE())) {
    const legacy = readJsonOr<{ active?: string }>(LEGACY_ACTIVE_FILE(), {});
    return { active: legacy.active || '', accounts: {} };
  }
  return readVersioned<AccountsStore>(STORE(), { active: '', accounts: {} });
}

function save(data: AccountsStore): void {
  writeVersionedAtomic(STORE(), data);
}

export function getActive(): string {
  return load().active || '';
}

export function setActive(account = ''): string {
  const acct = account || '';
  const data = load();
  data.active = acct;
  save(data);
  return acct;
}

// The cached registry row for an account, or null if it has never had a
// handle recorded (case-insensitive lookup — see key()).
export function get(account = ''): AccountRecord | null {
  return load().accounts[key(account)] || null;
}

// Cache a platform's fetched profile (id/handle/name/icon_url) for an
// account, creating the registry row on first use. Called from the
// account_info tool — best-effort at the call site (a registry hiccup must
// never fail the profile read).
export function recordHandle(account: string, platform: string, info: Omit<HandleInfo, 'fetched_at'>): AccountRecord {
  const data = load();
  const k = key(account);
  const now = new Date().toISOString();
  const rec: AccountRecord = data.accounts[k] || { handles: {}, created_at: now, updated_at: now };
  rec.handles = { ...rec.handles, [platform]: { ...info, fetched_at: now } };
  rec.updated_at = now;
  data.accounts[k] = rec;
  save(data);
  return rec;
}
