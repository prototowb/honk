import { PLATFORM_SPECS } from './specs.js';
import { env, hasAll, discoverAccounts } from './env.js';
import * as brand from './brand.js';
import type { AccountsOverview, AccountRow } from './types.js';

export const MEDIA_PROVIDERS: Record<string, string[]> = {
  cloudinary: ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
  imgbb:      ['IMGBB_API_KEY'],
};

interface PlatformStatus {
  label: string;
  default: { configured: boolean; missing: string[] };
  accounts: { name: string; configured: boolean; missing: string[] }[];
}

interface ConfigReport {
  platforms: Record<string, PlatformStatus>;
  media: Record<string, { configured: boolean; missing: string[] }>;
}

// Reports which platforms and named accounts are configured, by env-var
// presence only. Never returns or logs a credential value — onboarding aid,
// not a secrets dump.
export function report(): ConfigReport {
  const platforms: Record<string, PlatformStatus> = {};

  for (const [platform, spec] of Object.entries(PLATFORM_SPECS)) {
    const accountNames = new Set<string>();
    for (const key of spec.credentials) {
      for (const name of discoverAccounts(key)) accountNames.add(name);
    }

    platforms[platform] = {
      label: spec.label,
      default: {
        configured: hasAll(spec.credentials),
        missing:    spec.credentials.filter(k => !env(k)),
      },
      accounts: [...accountNames].sort().map(name => ({
        name,
        configured: hasAll(spec.credentials, name),
        missing:    spec.credentials.filter(k => !env(k, name)),
      })),
    };
  }

  const media: Record<string, { configured: boolean; missing: string[] }> = {};
  for (const [name, keys] of Object.entries(MEDIA_PROVIDERS)) {
    // Cloudinary is also satisfiable by the single CLOUDINARY_URL one-liner.
    if (name === 'cloudinary' && !hasAll(keys) && env('CLOUDINARY_URL')) {
      media[name] = { configured: true, missing: [] };
    } else {
      media[name] = { configured: hasAll(keys), missing: keys.filter(k => !env(k)) };
    }
  }

  return { platforms, media };
}

// Account overview (INDIV-006): join the two account axes — brand profiles
// (brand.json) and credentials (env __ACCOUNT suffixes) — into one list for
// multi-brand management and a future UI. The default account is always present;
// named accounts are the union of profile keys and fully-credentialed accounts,
// **lowercase-normalized** so a profile saved under "Brand" and creds under
// __BRAND don't double-count. A half-credentialed account with no profile is not
// "usable" yet, so it's omitted (config_doctor shows partial creds). Marks which
// account the active pointer selects. Reads env + the brand store; pure of args.
export function accountsOverview(): AccountsOverview {
  const rep      = report();
  const active   = brand.getActive();
  const profiles = brand.list();

  const defaultPlatforms: string[] = [];
  const credPlatforms: Record<string, Set<string>> = {};
  for (const [platform, p] of Object.entries(rep.platforms)) {
    if (p.default.configured) defaultPlatforms.push(platform);
    for (const a of p.accounts) {
      if (a.configured) {
        if (!credPlatforms[a.name.toLowerCase()]) credPlatforms[a.name.toLowerCase()] = new Set();
        credPlatforms[a.name.toLowerCase()].add(platform);
      }
    }
  }

  const profileLc = new Set(profiles.map(k => k === '_default' ? '' : k.toLowerCase()));
  const rows: AccountRow[] = [{
    name: 'default', account: '', isDefault: true,
    active: !active, brandProfile: profileLc.has(''), platforms: defaultPlatforms.sort(),
  }];

  const named = new Set<string>();
  for (const k of profiles) if (k !== '_default') named.add(k.toLowerCase());
  for (const n of Object.keys(credPlatforms)) named.add(n);
  for (const name of [...named].sort()) {
    rows.push({
      name, account: name, isDefault: false,
      active: active.toLowerCase() === name,
      brandProfile: profileLc.has(name),
      platforms: [...(credPlatforms[name] || [])].sort(),
    });
  }
  return { active, rows };
}

export function formatAccounts(o: AccountsOverview): string {
  const lines = [`Accounts (active: ${o.active || 'default'}):`, ''];
  for (const r of o.rows) {
    lines.push(`${r.active ? '▸' : ' '} ${r.name} — brand kit: ${r.brandProfile ? 'set' : '—'}`
      + ` · creds: ${r.platforms.length ? r.platforms.join(', ') : '—'}${r.active ? '  (active)' : ''}`);
  }
  lines.push('', 'Switch with brand_voice(action:"use", account:"<name>"); copy a profile with action:"clone".');
  return lines.join('\n');
}

export function formatReport(r: ConfigReport): string {
  const lines = ['SPMC configuration:', ''];
  let ready = 0;

  for (const [, p] of Object.entries(r.platforms)) {
    const mark = p.default.configured ? '✓' : '·';
    const detail = p.default.configured
      ? 'configured'
      : `missing ${p.default.missing.join(', ')}`;
    if (p.default.configured) ready++;
    lines.push(`${mark} ${p.label} — ${detail}`);
    for (const acct of p.accounts) {
      const m = acct.configured ? '✓' : '·';
      lines.push(`    ${m} account "${acct.name}" — ${acct.configured ? 'configured' : `missing ${acct.missing.join(', ')}`}`);
    }
  }

  lines.push('', 'Media providers:');
  for (const [name, info] of Object.entries(r.media)) {
    lines.push(`  ${info.configured ? '✓' : '·'} ${name}${info.configured ? '' : ` — missing ${info.missing.join(', ')}`}`);
  }

  lines.push('', `${ready}/${Object.keys(r.platforms).length} platforms ready to publish (default account).`);
  return lines.join('\n');
}
