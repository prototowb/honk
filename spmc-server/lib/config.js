import { PLATFORM_SPECS } from './specs.js';
import { env, hasAll, discoverAccounts } from './env.js';

export const MEDIA_PROVIDERS = {
  cloudinary: ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
  imgbb:      ['IMGBB_API_KEY'],
};

// Reports which platforms and named accounts are configured, by env-var
// presence only. Never returns or logs a credential value — onboarding aid,
// not a secrets dump.
export function report() {
  const platforms = {};

  for (const [platform, spec] of Object.entries(PLATFORM_SPECS)) {
    const accountNames = new Set();
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

  const media = {};
  for (const [name, keys] of Object.entries(MEDIA_PROVIDERS)) {
    media[name] = { configured: hasAll(keys), missing: keys.filter(k => !env(k)) };
  }

  return { platforms, media };
}

export function formatReport(r) {
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
