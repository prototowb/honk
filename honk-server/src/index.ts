import { Server }               from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import * as tiktok    from './adapters/tiktok.js';
import * as instagram from './adapters/instagram.js';
import * as facebook  from './adapters/facebook.js';
import * as queue     from './queue/store.js';
import * as media     from './media/upload.js';
import * as compose   from './media/compose.js';

import { publishAudited }                 from './lib/dispatch.js';
import { formatValidation } from './lib/validate.js';
import { validateWithPolicy } from './lib/policy-gate.js';
import { adapt, formatAdaptation }        from './lib/adapt.js';
import { report as configReport, formatReport, accountsOverview, formatAccounts } from './lib/config.js';
import { normalizeScheduledAt, isPast, timezoneWarning } from './lib/schedule.js';
import { read as auditRead, record as auditRecord, recentDuplicate } from './lib/audit.js';
import { hashContent }                    from './lib/hash.js';
import { status as rateLimitStatus }      from './lib/ratelimit.js';
import { fetchMetrics, report as analyticsReport, SUPPORTED_PLATFORMS } from './lib/analytics.js';
import * as brand from './lib/brand.js';
import { tagUrl } from './lib/links.js';
import { bestTimes, formatBestTimes } from './lib/besttime.js';
import { briefSchema, formatBriefSchema } from './lib/brief.js';
import { listWorkflows, getWorkflow, formatWorkflow, formatWorkflows } from './lib/workflows.js';
import { brandSchema, formatBrandSchema } from './lib/brand-schema.js';
import { TOOLS } from './lib/tools.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join }  from 'node:path';

import type { BrandProfile, ValidationResult, PolicyCheckResult, PolicyConfig, ResolvedVoice, AuditStatus, AuditSource, QueueItem } from './lib/types.js';

const pkg = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'package.json'), 'utf8')) as { name: string; version: string };

// ─── Helpers ──────────────────────────────────────────────────────────────

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function err(e: unknown) {
  return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
}

function formatBrandProfile(p: BrandProfile): string {
  const v = (x: unknown) => Array.isArray(x) ? (x.length ? (x as string[]).join(', ') : '—') : (String(x || '') || '—');
  const obj = (o: unknown) => { const e = Object.entries(o || {}); return e.length ? e.map(([k, val]) => `${k}=${val}`).join(', ') : '—'; };
  const voice = p.voice || {} as BrandProfile['voice'];
  const sets = Object.entries((p.hashtags || {}).sets || {});
  return [
    `voice.tone:         ${v(voice.tone)}`,
    `voice.audience:     ${v(voice.audience)}`,
    `voice.register:     ${v(voice.register)}`,
    `voice.emoji_policy: ${v(voice.emoji_policy)}`,
    `voice.banned_words: ${v(voice.banned_words)}`,
    `voice.do:           ${v((voice as unknown as Record<string, unknown>).do)}`,
    `voice.dont:         ${v((voice as unknown as Record<string, unknown>).dont)}`,
    `hashtags.default:   ${v((p.hashtags || {}).default)}`,
    `hashtags.sets:      ${sets.length ? sets.map(([k, arr]) => `${k}[${(arr as string[] || []).join(', ')}]`).join('; ') : '—'}`,
    `cta:                ${v(p.cta)}`,
    `visual:             ${obj(p.visual)}`,
    `links.utm_defaults: ${obj((p.links || {}).utm_defaults)}`,
    `links.shortener:    ${v((p.links || {}).shortener)}`,
    `platforms:          ${platformsLine(p.platforms)}`,
    `audiences:          ${platformsLine(p.audiences)}`,
    `policy:             ${policyLine(p.policy)}`,
    `notes:              ${v(p.notes)}`,
  ].join('\n');
}

function policyLine(policy: BrandProfile['policy']): string {
  const pol = policy || {} as BrandProfile['policy'];
  const disc = pol.disclosures || {} as PolicyConfig['disclosures'];
  const arr = (a: unknown) => (Array.isArray(a) && (a as unknown[]).length ? (a as string[]).join(', ') : '—');
  const topics = Array.isArray(pol.banned_topics) ? pol.banned_topics : [];
  const always = Array.isArray(disc.always) ? disc.always : [];
  const sponsored = Array.isArray(disc.sponsored) ? disc.sponsored : [];
  if (!topics.length && !always.length && !sponsored.length && pol.auto_publish !== true) return '—';
  return `banned_topics=[${arr(topics)}], disclosures.always=[${arr(always)}], `
    + `disclosures.sponsored=[${arr(sponsored)}], auto_publish=${pol.auto_publish === true}`;
}

function platformsLine(platforms: Record<string, unknown> | undefined): string {
  const entries = Object.entries(platforms || {});
  if (!entries.length) return '—';
  return entries.map(([plat, o]) => {
    const fields = Object.entries(o as Record<string, unknown> || {})
      .map(([k, val]) => `${k}=${Array.isArray(val) ? (val as unknown[]).join(' ') : val}`)
      .join(', ');
    return `${plat}{${fields}}`;
  }).join('; ');
}

function formatResolvedVoice(r: ResolvedVoice, label: string, profile: BrandProfile | null): string {
  const p = profile || {} as BrandProfile;
  const voice = p.voice || {} as BrandProfile['voice'];
  const v = (x: unknown) => Array.isArray(x) ? ((x as unknown[]).length ? (x as string[]).join(', ') : '—') : (String(x || '') || '—');
  const mark = (k: string) => r.sources?.[k] === 'platform' ? '  (platform override)'
                            : r.sources?.[k] === 'audience' ? '  (audience override)'
                            : '';
  const scope = [r.platform, r.audience ? `audience "${r.audience}"` : null].filter(Boolean).join(' · ') || 'base';
  const sets = Object.entries((p.hashtags || {}).sets || {});
  const lines = [
    `Effective voice for ${scope} (${label} brand):`,
    '',
    `tone:         ${v(r.effective.tone)}${mark('tone')}`,
    `register:     ${v(r.effective.register)}${mark('register')}`,
    `emoji_policy: ${v(r.effective.emoji_policy)}${mark('emoji_policy')}`,
    `audience:     ${v(r.effective.audience)}${mark('audience')}`,
    `hashtags:     ${v(r.effective.hashtags)}${mark('hashtags')}`,
    `cta:          ${v(r.effective.cta)}${mark('cta')}`,
    '',
    'Global voice (applies everywhere):',
    `banned_words:  ${v(voice.banned_words)}`,
    `hashtags.sets: ${sets.length ? sets.map(([k, arr]) => `${k}[${(arr as string[] || []).join(', ')}]`).join('; ') : '—'}`,
    `do:            ${v((voice as unknown as Record<string, unknown>).do)}`,
    `dont:          ${v((voice as unknown as Record<string, unknown>).dont)}`,
  ];
  if (r.unknownAudience) {
    const names = Object.keys(p.audiences || {});
    lines.push('', `⚠ No audience segment named "${r.audience}" — fell back to the base voice. `
      + (names.length
          ? `Defined segments: ${names.join(', ')}.`
          : `No segments defined yet — add one with brand_voice(action:"set", profile:{audiences:{"<name>":{…}}}).`));
  } else if (!r.overridden.length) {
    lines.push('', `(no ${r.audience ? 'audience/' : ''}platform overrides for ${scope} — the six fields above are the base voice.)`);
  }
  return lines.join('\n');
}

async function doPublish(platform: string, content: Record<string, unknown>, account: string, dryRun: boolean, { sponsored = false } = {}): Promise<string> {
  const v = validateWithPolicy(platform, content, account, { sponsored });
  if (!v.ok) {
    throw new Error(`Validation failed for ${v.label || platform}:\n` + v.errors.map(e => `  - ${e}`).join('\n'));
  }
  const warn  = v.warnings.length ? `\nWarnings:\n` + v.warnings.map(w => `  - ${w}`).join('\n') : '';
  const notes = (v.notes && v.notes.length) ? `\nPolicy:\n` + v.notes.map(n => `  - ${n}`).join('\n') : '';

  if (dryRun) {
    auditRecord({ platform, account: account || null, source: 'direct', status: 'dry_run', content_hash: hashContent(content) });
    const clip = (s: unknown) => { const t = String(s); return t.length > 60 ? t.slice(0, 57) + '…' : t; };
    const extras: string[] = [];
    if (content.alt_text)  extras.push(`alt text: "${clip(content.alt_text)}"`);
    if (Array.isArray(content.alt_texts) && (content.alt_texts as unknown[]).length) extras.push(`${(content.alt_texts as unknown[]).length} per-slide alt texts`);
    if (content.first_comment) extras.push(`first comment: "${clip(content.first_comment)}"`);
    if (sponsored) extras.push('flagged sponsored');
    const extraNote = extras.length ? `\nWould also set — ${extras.join('; ')}.` : '';
    return `DRY RUN — ${v.label} payload is valid; nothing was published.${extraNote}${warn}${notes}`;
  }

  const { summary } = await publishAudited(platform, content, account, { source: 'direct', sponsored });
  return summary + warn;
}

// ─── Server ───────────────────────────────────────────────────────────────

const server = new Server(
  { name: pkg.name, version: pkg.version },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, unknown>;
  try {
    switch (name) {
      // ── Direct publishing ───────────────────────────────────────────────
      case 'x_post_tweet':
        return ok(await doPublish('x', { text: a.text }, String(a.account ?? ''), Boolean(a.dry_run), { sponsored: Boolean(a.sponsored) }));
      case 'x_post_thread':
        return ok(await doPublish('x', { tweets: a.tweets }, String(a.account ?? ''), Boolean(a.dry_run), { sponsored: Boolean(a.sponsored) }));
      case 'instagram_post': {
        const igContent: Record<string, unknown> = { caption: a.caption };
        if (Array.isArray(a.image_urls) && (a.image_urls as unknown[]).length) igContent.image_urls = a.image_urls;
        else igContent.image_url = a.image_url;
        if (a.alt_text)      igContent.alt_text = a.alt_text;
        if (Array.isArray(a.alt_texts)) igContent.alt_texts = a.alt_texts;
        if (a.first_comment) igContent.first_comment = a.first_comment;
        return ok(await doPublish('instagram', igContent, String(a.account ?? ''), Boolean(a.dry_run), { sponsored: Boolean(a.sponsored) }));
      }
      case 'tiktok_post_video':
        return ok(await doPublish('tiktok', { video_url: a.video_url, caption: a.caption, privacy_level: a.privacy_level }, String(a.account ?? ''), Boolean(a.dry_run), { sponsored: Boolean(a.sponsored) }));
      case 'tiktok_check_publish_status': {
        const r = await tiktok.checkStatus(String(a.publish_id), String(a.account ?? ''));
        return ok(`TikTok publish status: ${(r as { status?: string; fail_reason?: string }).status}${(r as { fail_reason?: string }).fail_reason ? ` (reason: ${(r as { fail_reason?: string }).fail_reason})` : ''}`);
      }
      case 'facebook_post': {
        const fbContent: Record<string, unknown> = { message: a.message, image_url: a.image_url };
        if (a.alt_text)      fbContent.alt_text = a.alt_text;
        if (a.first_comment) fbContent.first_comment = a.first_comment;
        return ok(await doPublish('facebook', fbContent, String(a.account ?? ''), Boolean(a.dry_run), { sponsored: Boolean(a.sponsored) }));
      }
      case 'threads_post': {
        const thContent: Record<string, unknown> = { text: a.text, image_url: a.image_url };
        if (a.alt_text) thContent.alt_text = a.alt_text;
        return ok(await doPublish('threads', thContent, String(a.account ?? ''), Boolean(a.dry_run), { sponsored: Boolean(a.sponsored) }));
      }
      case 'bluesky_post':
        return ok(await doPublish('bluesky', { text: a.text }, String(a.account ?? ''), Boolean(a.dry_run), { sponsored: Boolean(a.sponsored) }));

      // ── Content intelligence ──────────────────────────────────────────────
      case 'content_validate':
        return ok(formatValidation(validateWithPolicy(String(a.platform), a.content as Record<string, unknown>, String(a.account ?? ''), { sponsored: Boolean(a.sponsored) })));
      case 'content_adapt':
        return ok(formatAdaptation(adapt(String(a.text), a.platforms as string[])));
      case 'config_doctor':
        return ok(formatReport(configReport()));
      case 'account_info': {
        const mod = ({ instagram, facebook } as Record<string, typeof instagram | typeof facebook>)[String(a.platform)];
        if (!mod) throw new Error(`account_info not available for "${a.platform}". Supported: instagram, facebook.`);
        const p = await mod.getProfile(String(a.account ?? ''));
        let seedNote = '';
        if (a.seed_brand_kit && (p.handle || p.icon_url)) {
          const brandAccount = (a.account as string | undefined) ?? brand.getActive();
          const patch: Record<string, unknown> = { visual: {} };
          if (p.handle) (patch.visual as Record<string, unknown>).handle = p.handle;
          let permanentIconUrl: string | null = p.icon_url ?? null;
          if (p.icon_url) {
            try {
              const imgRes = await fetch(p.icon_url);
              if (imgRes.ok) {
                const buf = Buffer.from(await imgRes.arrayBuffer());
                const up  = await media.upload(null, null, String(a.account ?? ''), buf, 'profile-icon.png');
                permanentIconUrl = up.url;
              }
            } catch { /* keep raw CDN URL as fallback */ }
            (patch.visual as Record<string, unknown>).icon_url = permanentIconUrl;
          }
          brand.set(patch as Parameters<typeof brand.set>[0], brandAccount);
          const label = brandAccount || 'default';
          const updated = [
            p.handle         && `handle → ${p.handle}`,
            permanentIconUrl && 'icon_url → set',
          ].filter(Boolean);
          seedNote = `\n\nBrand kit updated (account '${label}'): ${updated.join(', ')}.`;
        }
        return ok(
          `${p.platform}${a.account ? `/${a.account}` : ''} profile:\n`
          + `  name:   ${p.name ?? '(none)'}\n`
          + `  handle: ${p.handle ?? '(none set)'}\n`
          + `  id:     ${p.id}\n`
          + `  icon:   ${p.icon_url ?? '(none)'}`
          + seedNote
        );
      }
      case 'brand_voice': {
        const action = String(a.action ?? 'get');

        if (action === 'list') {
          return ok(formatAccounts(accountsOverview()));
        }
        if (action === 'use') {
          const saved = brand.setActive(String(a.account ?? ''));
          if (!saved) return ok('Active account reset to default.');
          const known = accountsOverview().rows.some(r => !r.isDefault && r.account.toLowerCase() === saved.toLowerCase());
          const note = known ? '' : `\n(Note: '${saved}' has no brand profile or credentials yet — set one up with brand_voice(action:"set", account:"${saved}") and the account's __${saved.toUpperCase()} env vars.)`;
          return ok(`Active account set to '${saved}'. Reads (brand_voice get / brand_schema) now default to it; publishing stays explicit — confirm the brand before any post.${note}`);
        }
        if (action === 'clone') {
          const from = String(a.account ?? '');
          const saved = brand.clone(from, String(a.to));
          return ok(`Cloned ${from ? `'${from}'` : 'default'} → '${a.to}'. Edit it independently with brand_voice(action:"set", account:"${a.to}"). Active account unchanged.\n\n${formatBrandProfile(saved)}`);
        }

        if (action === 'clear') {
          const acct = String(a.account ?? '');
          const label = acct ? `'${acct}'` : 'default';
          const existed = brand.clear(acct);
          return ok(existed ? `Cleared the ${label} brand profile.` : `No ${label} brand profile to clear.`);
        }
        if (action === 'set') {
          const acct = String(a.account ?? '');
          const label = acct ? `'${acct}'` : 'default';
          if (!a.profile || typeof a.profile !== 'object') throw new Error('brand_voice set requires a `profile` object.');
          const saved = brand.set(a.profile as Partial<BrandProfile>, acct, { replace: Boolean(a.replace) });
          return ok(`Saved the ${label} brand profile (${a.replace ? 'replaced' : 'merged'}).\n\n${formatBrandProfile(saved)}`);
        }

        const acct = a.account != null ? String(a.account) : brand.getActive();
        const fromActive = a.account == null && !!brand.getActive();
        const label = acct ? `'${acct}'` : 'default';
        const activeSuffix = fromActive
          ? `\n\n(resolved from the active account ${label} — pass account: explicitly to override)` : '';
        const current = brand.get(acct);
        if (a.platform || a.audience) {
          return ok(formatResolvedVoice(
            brand.resolveVoice(current, { platform: a.platform as string | undefined, audience: a.audience as string | undefined }), label, current) + activeSuffix);
        }
        if (!current) return ok(`No brand profile set for ${label}. Set one with brand_voice(action:"set", profile:{...}). Empty shape:\n\n${formatBrandProfile(brand.emptyProfile())}${activeSuffix}`);
        return ok(`Brand profile (${label}):\n\n${formatBrandProfile(current)}${activeSuffix}`);
      }
      case 'link_tag': {
        const profile = brand.getOrEmpty(String(a.account ?? ''));
        const defaults = (profile.links && profile.links.utm_defaults) || {};
        const merged = { ...defaults, ...(a.params as Record<string, string> || {}) };
        if (a.platform) {
          for (const k of Object.keys(merged)) {
            if (typeof merged[k] === 'string') merged[k] = (merged[k] as string).split('{platform}').join(String(a.platform));
          }
        }
        const tagged = tagUrl(String(a.url), merged);
        const used = Object.keys(merged).filter(k => merged[k] !== '' && merged[k] != null);
        return ok(`Tagged URL:\n${tagged}${used.length ? `\nParams: ${used.join(', ')}` : '\n(no params applied — set links.utm_defaults in brand_voice or pass params)'}`);
      }
      case 'duplicate_check': {
        const hours = (a.within_hours as number) ?? 168;
        const hash = hashContent(a.content as unknown);
        const dup = recentDuplicate({ platform: String(a.platform), content_hash: hash, withinMs: hours * 3600 * 1000 });
        if (!dup) return ok(`No duplicate — no identical ${a.platform} publish in the last ${hours}h (content hash #${hash}).`);
        return ok(
          `⚠ Possible duplicate — identical content (hash #${hash}) was published to `
          + `${dup.platform}${dup.account ? `/${dup.account}` : ''} at ${dup.ts}.`
          + (dup.result ? `\n  ${dup.result.split('\n')[0]}` : '')
          + `\nConfirm with the user before reposting.`,
        );
      }
      case 'best_time': {
        const result = bestTimes({ platform: String(a.platform), count: a.count as number | undefined, account: String(a.account ?? '') });
        return ok(formatBestTimes(result));
      }
      case 'workflow_list': {
        if (a.name != null) {
          const w = getWorkflow(String(a.name));
          if (!w) return ok(`No workflow named '${String(a.name)}'. Available: ${listWorkflows().map(x => x.name).join(', ')}.`);
          return ok(formatWorkflow(w));
        }
        return ok(formatWorkflows(listWorkflows()));
      }
      case 'brief_schema': {
        const profile = brand.get(String(a.account ?? ''));
        return ok(formatBriefSchema(briefSchema(profile)));
      }
      case 'brand_schema': {
        const acct = a.account != null ? String(a.account) : brand.getActive();
        const fromActive = a.account == null && !!brand.getActive();
        const profile = brand.get(acct);
        return ok(formatBrandSchema(brandSchema(profile))
          + (fromActive ? `\n\n(account: ${acct ? `'${acct}'` : 'default'} — active)` : ''));
      }
      case 'audit_log': {
        const entries = auditRead({ platform: a.platform as string | undefined, status: a.status as AuditStatus | undefined, source: a.source as AuditSource | undefined, limit: a.limit as number | undefined });
        if (entries.length === 0) return ok('No audit entries yet.');
        const lines = entries.map(e =>
          `${e.ts} | ${e.status.padEnd(9)} | ${e.platform}${e.account ? `/${e.account}` : ''} | ${e.source} | #${e.content_hash}`
          + (e.post_id ? ` | post ${e.post_id}` : '')
          + (e.error ? `\n    error: ${e.error}` : '')
        );
        return ok(`${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} (most recent first):\n${lines.join('\n')}`);
      }
      case 'schedule_check': {
        const normalized = normalizeScheduledAt(a.scheduled_at as string | null | undefined);
        const tzWarn = timezoneWarning(a.scheduled_at as string | null | undefined);
        return ok(
          `Normalized: ${normalized}\nIn the past: ${isPast(normalized!) ? 'yes — would dispatch on next scheduler tick' : 'no'}`
          + (tzWarn ? `\n⚠ ${tzWarn}` : ''),
        );
      }

      // ── Observability ─────────────────────────────────────────────────────
      case 'rate_limits': {
        const s = rateLimitStatus();
        const platforms = Object.keys(s);
        if (platforms.length === 0) return ok('No rate-limit responses observed.');
        const lines = platforms.map(p =>
          `${p}: ${s[p].count} hit(s) | last: ${s[p].last_seen}${s[p].last_message ? `\n    ${s[p].last_message}` : ''}`
        );
        return ok(`Rate-limit responses seen:\n${lines.join('\n')}`);
      }
      case 'analytics_fetch': {
        const metrics = await fetchMetrics(String(a.platform), String(a.post_id), String(a.account ?? ''));
        const lines = Object.entries(metrics).map(([k, v]) => `  ${k}: ${v}`);
        return ok(`Metrics for ${a.platform} post ${a.post_id}:\n${lines.join('\n') || '  (none returned)'}`);
      }
      case 'analytics_report': {
        const snaps = analyticsReport({ platform: a.platform as string | undefined, post_id: a.post_id as string | undefined, limit: a.limit as number | undefined });
        if (snaps.length === 0) return ok(`No analytics snapshots yet. Supported platforms: ${SUPPORTED_PLATFORMS.join(', ')}.`);
        const lines = snaps.map(s =>
          `${s.ts} | ${s.platform}${s.account ? `/${s.account}` : ''} | ${s.post_id} | ${JSON.stringify(s.metrics)}`
        );
        return ok(`${snaps.length} snapshot(s):\n${lines.join('\n')}`);
      }

      // ── Queue ────────────────────────────────────────────────────────────
      case 'queue_add': {
        const scheduledAt = normalizeScheduledAt((a.scheduled_at as string | null) ?? null);
        const sponsored = Boolean(a.sponsored);
        const v = validateWithPolicy(String(a.platform), a.content as Record<string, unknown>, String(a.account ?? ''), { sponsored });
        const item = queue.add(String(a.platform), a.content as Record<string, unknown>, scheduledAt, String(a.account ?? ''), a.draft ? 'draft' : 'pending', sponsored);
        const note = v.notes && v.notes.length ? `\n${v.notes.map(n => `  - ${n}`).join('\n')}` : '';
        const warn = (v.ok
          ? (v.warnings.length ? `\n⚠ ${v.warnings.join('; ')}` : '')
          : `\n⚠ Content has validation errors (saved anyway):\n` + v.errors.map(e => `  - ${e}`).join('\n')) + note;
        const past = (!a.draft && scheduledAt && isPast(scheduledAt)) ? `\n⚠ scheduled_at is in the past — will dispatch on next scheduler tick.` : '';
        const tzWarn = scheduledAt ? timezoneWarning(a.scheduled_at as string | null | undefined) : '';
        const draftNote = a.draft ? `\nDraft — held for review; won't publish until promoted (queue_update status:"pending" or queue_dispatch).` : '';
        return ok(`${a.draft ? 'Draft saved' : 'Queued'}! ID: ${item.id}\nPlatform: ${item.platform}\nStatus: ${item.status}${item.account ? `\nAccount: ${item.account}` : ''}${item.scheduled_at ? `\nScheduled: ${item.scheduled_at}` : ''}${draftNote}${past}${tzWarn ? `\n⚠ ${tzWarn}` : ''}${warn}`);
      }
      case 'queue_list': {
        const items = queue.list({ status: a.status as string | undefined, platform: a.platform as string | undefined });
        if (items.length === 0) return ok('Queue is empty.');
        const lines = items.map(i =>
          `[${i.id}] ${i.platform} | ${i.status}${i.scheduled_at ? ` | scheduled: ${i.scheduled_at}` : ''} | created: ${i.created_at}`
        );
        return ok(`${items.length} item(s):\n${lines.join('\n')}`);
      }
      case 'queue_update': {
        const item = queue.update(String(a.id), a.updates as Partial<QueueItem>);
        return ok(`Updated ${item.id}: ${JSON.stringify(a.updates)}`);
      }
      case 'queue_remove': {
        const item = queue.remove(String(a.id));
        return ok(`Removed ${item.id} (${item.platform})`);
      }
      case 'queue_dispatch': {
        const item = queue.get(String(a.id));
        if (a.dry_run) {
          const v = validateWithPolicy(item.platform, item.content, item.account ?? '', { sponsored: item.sponsored ?? false });
          auditRecord({ platform: item.platform, account: item.account || null, source: 'queue', status: 'dry_run', content_hash: hashContent(item.content) });
          const note = v.notes && v.notes.length ? `\nPolicy:\n` + v.notes.map(n => `  - ${n}`).join('\n') : '';
          return ok(`DRY RUN — ${item.id} (${item.platform}) ${v.ok ? 'is valid; not published.' : 'has errors:\n' + v.errors.map(e => `  - ${e}`).join('\n')}${note}`);
        }
        queue.update(String(a.id), { status: 'dispatched' });
        try {
          const { summary } = await publishAudited(item.platform, item.content, item.account ?? '', { source: 'queue', sponsored: item.sponsored ?? false });
          queue.update(String(a.id), { status: 'published', published_at: new Date().toISOString(), result: summary });
          return ok(`Dispatched!\n${summary}`);
        } catch (e) {
          queue.update(String(a.id), { status: 'failed', error: (e as Error).message });
          throw e;
        }
      }

      // ── Media ──────────────────────────────────────────────────────────────
      case 'media_compose': {
        const brandAccount = (a.account as string | undefined) ?? brand.getActive();
        const visual = (brand.get(brandAccount) || {}).visual || {} as BrandProfile['visual'];
        const { template, variables, appliedFromKit } = compose.resolveVisualVars(a as Parameters<typeof compose.resolveVisualVars>[0], visual as Parameters<typeof compose.resolveVisualVars>[1]);
        if (!template) throw new Error('media_compose needs a `template` (or set visual.default_template in the brand kit via brand_voice).');
        const result = await compose.compose(template, variables, { provider: (a.provider as string) ?? undefined, account: String(a.account ?? '') });
        const activeNote = brandAccount && !a.account
          ? `\n(brand kit from active account '${brandAccount}')` : '';
        return ok(
          `Composed ${result.template} (${result.dimensions!.width}×${result.dimensions!.height})\n`
          + `Uploaded to ${result.provider}!\nPublic URL: ${result.url}`
          + (result.public_id ? `\nPublic ID: ${result.public_id}` : '')
          + (appliedFromKit.length ? `\n(brand kit applied: ${appliedFromKit.join(', ')})` : '')
          + activeNote
        );
      }
      case 'media_upload': {
        const result = await media.upload(String(a.file_path), (a.provider as string) ?? null, String(a.account ?? ''));
        return ok(
          `Uploaded to ${result.provider}!\nPublic URL: ${result.url}`
          + (result.public_id ? `\nPublic ID: ${result.public_id}` : '')
          + (result.bytes     ? `\nSize: ${((result.bytes as number) / 1024).toFixed(1)} KB` : '')
        );
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (e) {
    return err(e);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
