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
import { validate, checkPolicy, formatValidation } from './lib/validate.js';
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
import { brandSchema, formatBrandSchema } from './lib/brand-schema.js';
import { TOOLS } from './lib/tools.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join }  from 'node:path';

// Tool schemas live in lib/tools.js — the single origin shared by this server
// and the build generator. See BUILD_CONCEPT.md.

// Server identity comes from package.json — the single version origin (the
// build generator reads the same file for plugin.json). No hardcoded version.
const pkg = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'package.json'), 'utf8'));

// ─── Helpers ──────────────────────────────────────────────────────────────

function ok(text) {
  return { content: [{ type: 'text', text }] };
}

// Render a brand profile as readable text rather than raw JSON, so the agent
// (and the user) can scan it. Empty fields are shown as a dash.
function formatBrandProfile(p) {
  const v = (x) => Array.isArray(x) ? (x.length ? x.join(', ') : '—') : (x || '—');
  const obj = (o) => { const e = Object.entries(o || {}); return e.length ? e.map(([k, val]) => `${k}=${val}`).join(', ') : '—'; };
  const voice = p.voice || {};
  const sets = Object.entries((p.hashtags || {}).sets || {});
  return [
    `voice.tone:         ${v(voice.tone)}`,
    `voice.audience:     ${v(voice.audience)}`,
    `voice.register:     ${v(voice.register)}`,
    `voice.emoji_policy: ${v(voice.emoji_policy)}`,
    `voice.banned_words: ${v(voice.banned_words)}`,
    `voice.do:           ${v(voice.do)}`,
    `voice.dont:         ${v(voice.dont)}`,
    `hashtags.default:   ${v((p.hashtags || {}).default)}`,
    `hashtags.sets:      ${sets.length ? sets.map(([k, arr]) => `${k}[${(arr || []).join(', ')}]`).join('; ') : '—'}`,
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

// Render the content-policy block (INDIV-004) readably: banned topics, the
// always/sponsored required disclosures, and the auto_publish setting.
function policyLine(policy) {
  const pol = policy || {};
  const disc = pol.disclosures || {};
  const arr = (a) => (Array.isArray(a) && a.length ? a.join(', ') : '—');
  const topics = Array.isArray(pol.banned_topics) ? pol.banned_topics : [];
  const always = Array.isArray(disc.always) ? disc.always : [];
  const sponsored = Array.isArray(disc.sponsored) ? disc.sponsored : [];
  if (!topics.length && !always.length && !sponsored.length && pol.auto_publish !== true) return '—';
  return `banned_topics=[${arr(topics)}], disclosures.always=[${arr(always)}], `
    + `disclosures.sponsored=[${arr(sponsored)}], auto_publish=${pol.auto_publish === true}`;
}

// Render a map of named voice deltas readably (per-platform OR per-audience —
// same shape; the generic obj() would print each value as "[object Object]").
function platformsLine(platforms) {
  const entries = Object.entries(platforms || {});
  if (!entries.length) return '—';
  return entries.map(([plat, o]) => {
    const fields = Object.entries(o || {})
      .map(([k, val]) => `${k}=${Array.isArray(val) ? val.join(' ') : val}`)
      .join(', ');
    return `${plat}{${fields}}`;
  }).join('; ');
}

// Render the effective voice resolved for a platform, marking which fields the
// per-platform layer overrode (provenance) so the agent sees base vs delta. This
// is a SUPERSET view, not just the six overridable fields: it also passes through
// the global voice fields a platform skill still needs (banned_words, hashtag
// sets, do/dont) so one platform-scoped get returns everything needed to draft.
function formatResolvedVoice(r, label, profile) {
  const p = profile || {};
  const voice = p.voice || {};
  const v = (x) => Array.isArray(x) ? (x.length ? x.join(', ') : '—') : (x || '—');
  // Provenance per field: platform overrides win over audience (base ▸ audience ▸ platform).
  const mark = (k) => r.sources?.[k] === 'platform' ? '  (platform override)'
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
    `hashtags.sets: ${sets.length ? sets.map(([k, arr]) => `${k}[${(arr || []).join(', ')}]`).join('; ') : '—'}`,
    `do:            ${v(voice.do)}`,
    `dont:          ${v(voice.dont)}`,
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

function err(e) {
  return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
}

// Platform-rule validation merged with the brand kit's content policy (INDIV-004).
// validate() stays pure/disk-free; the policy is loaded here and passed into the
// pure checkPolicy(). Policy errors (e.g. a sponsored post missing #ad) block like
// any validation error; warnings/notes flow through. `sponsored` is a per-call
// flag (it escalates the sponsored-disclosure check from absent → error), not
// stored content.
function validateWithPolicy(platform, content, account, { sponsored = false } = {}) {
  const v = validate(platform, content);
  const policy = (brand.getOrEmpty(account) || {}).policy || {};
  const pol = checkPolicy(platform, content, policy, { sponsored });
  return {
    ...v,
    errors:   [...v.errors, ...pol.errors],
    warnings: [...v.warnings, ...pol.warnings],
    notes:    pol.notes,
    ok:       v.ok && pol.errors.length === 0,
  };
}

// Single publish path for every direct posting tool: validate (+ policy) →
// (dry-run preview | audited publish). Returns the agent-facing summary string.
async function doPublish(platform, content, account, dryRun, { sponsored = false } = {}) {
  const v = validateWithPolicy(platform, content, account, { sponsored });
  if (!v.ok) {
    throw new Error(`Validation failed for ${v.label || platform}:\n` + v.errors.map(e => `  - ${e}`).join('\n'));
  }
  const warn  = v.warnings.length ? `\nWarnings:\n` + v.warnings.map(w => `  - ${w}`).join('\n') : '';
  const notes = v.notes.length    ? `\nPolicy:\n`   + v.notes.map(n => `  - ${n}`).join('\n')   : '';

  if (dryRun) {
    auditRecord({ platform, account: account || null, source: 'direct', status: 'dry_run', content_hash: hashContent(content) });
    const clip = (s) => { const t = String(s); return t.length > 60 ? t.slice(0, 57) + '…' : t; };
    const extras = [];
    if (content.alt_text)  extras.push(`alt text: "${clip(content.alt_text)}"`);
    if (Array.isArray(content.alt_texts) && content.alt_texts.length) extras.push(`${content.alt_texts.length} per-slide alt texts`);
    if (content.first_comment) extras.push(`first comment: "${clip(content.first_comment)}"`);
    if (sponsored) extras.push('flagged sponsored');
    const extraNote = extras.length ? `\nWould also set — ${extras.join('; ')}.` : '';
    return `DRY RUN — ${v.label} payload is valid; nothing was published.${extraNote}${warn}${notes}`;
  }

  // Policy notes are pre-publish drafting guidance (e.g. banned-topic reminders);
  // they'd be backward-facing noise on every live publish, so they stay in the
  // dry-run/validate paths only. Warnings about this post's content still echo.
  const { summary } = await publishAudited(platform, content, account, { source: 'direct' });
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
  try {
    switch (name) {
      // ── Direct publishing ───────────────────────────────────────────────
      case 'x_post_tweet':
        return ok(await doPublish('x', { text: args.text }, args.account ?? '', args.dry_run, { sponsored: args.sponsored }));
      case 'x_post_thread':
        return ok(await doPublish('x', { tweets: args.tweets }, args.account ?? '', args.dry_run, { sponsored: args.sponsored }));
      case 'instagram_post': {
        const igContent = { caption: args.caption };
        if (Array.isArray(args.image_urls) && args.image_urls.length) igContent.image_urls = args.image_urls;
        else igContent.image_url = args.image_url;
        if (args.alt_text)      igContent.alt_text = args.alt_text;
        if (Array.isArray(args.alt_texts)) igContent.alt_texts = args.alt_texts;
        if (args.first_comment) igContent.first_comment = args.first_comment;
        return ok(await doPublish('instagram', igContent, args.account ?? '', args.dry_run, { sponsored: args.sponsored }));
      }
      case 'tiktok_post_video':
        return ok(await doPublish('tiktok', { video_url: args.video_url, caption: args.caption, privacy_level: args.privacy_level }, args.account ?? '', args.dry_run, { sponsored: args.sponsored }));
      case 'tiktok_check_publish_status': {
        const r = await tiktok.checkStatus(args.publish_id, args.account ?? '');
        return ok(`TikTok publish status: ${r.status}${r.fail_reason ? ` (reason: ${r.fail_reason})` : ''}`);
      }
      case 'facebook_post': {
        const fbContent = { message: args.message, image_url: args.image_url };
        if (args.alt_text)      fbContent.alt_text = args.alt_text;
        if (args.first_comment) fbContent.first_comment = args.first_comment;
        return ok(await doPublish('facebook', fbContent, args.account ?? '', args.dry_run, { sponsored: args.sponsored }));
      }
      case 'threads_post': {
        const thContent = { text: args.text, image_url: args.image_url };
        if (args.alt_text) thContent.alt_text = args.alt_text;
        return ok(await doPublish('threads', thContent, args.account ?? '', args.dry_run, { sponsored: args.sponsored }));
      }
      case 'bluesky_post':
        return ok(await doPublish('bluesky', { text: args.text }, args.account ?? '', args.dry_run, { sponsored: args.sponsored }));

      // ── Content intelligence ──────────────────────────────────────────────
      case 'content_validate':
        return ok(formatValidation(validateWithPolicy(args.platform, args.content, args.account ?? '', { sponsored: args.sponsored })));
      case 'content_adapt':
        return ok(formatAdaptation(adapt(args.text, args.platforms)));
      case 'config_doctor':
        return ok(formatReport(configReport()));
      case 'account_info': {
        const mod = { instagram, facebook }[args.platform];
        if (!mod) throw new Error(`account_info not available for "${args.platform}". Supported: instagram, facebook.`);
        const p = await mod.getProfile(args.account ?? '');
        let seedNote = '';
        if (args.seed_brand_kit && (p.handle || p.icon_url)) {
          const brandAccount = args.account ?? brand.getActive();
          const patch = { visual: {} };
          if (p.handle) patch.visual.handle = p.handle;
          // Re-upload the profile picture to the configured image provider so
          // the brand kit stores a permanent URL instead of the Graph API's
          // signed CDN URL (which carries an expiry token and stops resolving
          // after ~weeks). Falls back to the raw CDN URL if no provider is
          // configured or the upload fails — better than nothing.
          let permanentIconUrl = p.icon_url ?? null;
          if (p.icon_url) {
            try {
              const imgRes = await fetch(p.icon_url);
              if (imgRes.ok) {
                const buf = Buffer.from(await imgRes.arrayBuffer());
                const up  = await media.upload(null, null, args.account ?? '', buf, 'profile-icon.png');
                permanentIconUrl = up.url;
              }
            } catch { /* keep raw CDN URL as fallback */ }
            patch.visual.icon_url = permanentIconUrl;
          }
          brand.set(patch, brandAccount);
          const label = brandAccount || 'default';
          const updated = [
            p.handle         && `handle → ${p.handle}`,
            permanentIconUrl && 'icon_url → set',
          ].filter(Boolean);
          seedNote = `\n\nBrand kit updated (account '${label}'): ${updated.join(', ')}.`;
        }
        return ok(
          `${p.platform}${args.account ? `/${args.account}` : ''} profile:\n`
          + `  name:   ${p.name ?? '(none)'}\n`
          + `  handle: ${p.handle ?? '(none set)'}\n`
          + `  id:     ${p.id}\n`
          + `  icon:   ${p.icon_url ?? '(none)'}`
          + seedNote
        );
      }
      case 'brand_voice': {
        const action = args.action ?? 'get';

        // ── Multi-brand management (INDIV-006) — explicit account; never the active default ──
        if (action === 'list') {
          return ok(formatAccounts(accountsOverview()));
        }
        if (action === 'use') {
          const saved = brand.setActive(args.account ?? '');
          if (!saved) return ok('Active account reset to default.');
          const known = accountsOverview().rows.some(r => !r.isDefault && r.account.toLowerCase() === saved.toLowerCase());
          const note = known ? '' : `\n(Note: '${saved}' has no brand profile or credentials yet — set one up with brand_voice(action:"set", account:"${saved}") and the account's __${saved.toUpperCase()} env vars.)`;
          return ok(`Active account set to '${saved}'. Reads (brand_voice get / brand_schema) now default to it; publishing stays explicit — confirm the brand before any post.${note}`);
        }
        if (action === 'clone') {
          const from = args.account ?? '';
          const saved = brand.clone(from, args.to); // throws on no source / missing or existing target; leaves the active pointer alone
          return ok(`Cloned ${from ? `'${from}'` : 'default'} → '${args.to}'. Edit it independently with brand_voice(action:"set", account:"${args.to}"). Active account unchanged.\n\n${formatBrandProfile(saved)}`);
        }

        // ── Write ops — explicit account or default; do NOT follow the active pointer ──
        if (action === 'clear') {
          const account = args.account ?? '';
          const label = account ? `'${account}'` : 'default';
          const existed = brand.clear(account);
          return ok(existed ? `Cleared the ${label} brand profile.` : `No ${label} brand profile to clear.`);
        }
        if (action === 'set') {
          const account = args.account ?? '';
          const label = account ? `'${account}'` : 'default';
          if (!args.profile || typeof args.profile !== 'object') throw new Error('brand_voice set requires a `profile` object.');
          const saved = brand.set(args.profile, account, { replace: !!args.replace });
          return ok(`Saved the ${label} brand profile (${args.replace ? 'replaced' : 'merged'}).\n\n${formatBrandProfile(saved)}`);
        }

        // ── Read (get) — defaults to the active account when none is given, and echoes it ──
        const account = args.account ?? brand.getActive();
        const fromActive = args.account == null && !!brand.getActive();
        const label = account ? `'${account}'` : 'default';
        const activeSuffix = fromActive
          ? `\n\n(resolved from the active account ${label} — pass account: explicitly to override)` : '';
        const current = brand.get(account);
        if (args.platform || args.audience) {
          // Resolve the effective voice for a platform and/or audience segment —
          // null-safe (current may be null when no profile is set; resolveVoice
          // yields the base/empty). Precedence: base ▸ audience ▸ platform.
          return ok(formatResolvedVoice(
            brand.resolveVoice(current, { platform: args.platform, audience: args.audience }), label, current) + activeSuffix);
        }
        if (!current) return ok(`No brand profile set for ${label}. Set one with brand_voice(action:"set", profile:{...}). Empty shape:\n\n${formatBrandProfile(brand.emptyProfile())}${activeSuffix}`);
        return ok(`Brand profile (${label}):\n\n${formatBrandProfile(current)}${activeSuffix}`);
      }
      case 'link_tag': {
        const profile = brand.getOrEmpty(args.account ?? '');
        const defaults = (profile.links && profile.links.utm_defaults) || {};
        const merged = { ...defaults, ...(args.params || {}) };
        if (args.platform) {
          for (const k of Object.keys(merged)) {
            if (typeof merged[k] === 'string') merged[k] = merged[k].split('{platform}').join(args.platform);
          }
        }
        const tagged = tagUrl(args.url, merged);
        const used = Object.keys(merged).filter(k => merged[k] !== '' && merged[k] != null);
        return ok(`Tagged URL:\n${tagged}${used.length ? `\nParams: ${used.join(', ')}` : '\n(no params applied — set links.utm_defaults in brand_voice or pass params)'}`);
      }
      case 'duplicate_check': {
        const hours = args.within_hours ?? 168;
        const hash = hashContent(args.content);
        const dup = recentDuplicate({ platform: args.platform, content_hash: hash, withinMs: hours * 3600 * 1000 });
        if (!dup) return ok(`No duplicate — no identical ${args.platform} publish in the last ${hours}h (content hash #${hash}).`);
        return ok(
          `⚠ Possible duplicate — identical content (hash #${hash}) was published to `
          + `${dup.platform}${dup.account ? `/${dup.account}` : ''} at ${dup.ts}.`
          + (dup.result ? `\n  ${dup.result.split('\n')[0]}` : '')
          + `\nConfirm with the user before reposting.`,
        );
      }
      case 'best_time': {
        const result = bestTimes({ platform: args.platform, count: args.count, account: args.account ?? '' });
        return ok(formatBestTimes(result));
      }
      case 'brief_schema': {
        const profile = brand.get(args.account ?? '');
        return ok(formatBriefSchema(briefSchema(profile)));
      }
      case 'brand_schema': {
        const account = args.account ?? brand.getActive();
        const fromActive = args.account == null && !!brand.getActive();
        const profile = brand.get(account);
        return ok(formatBrandSchema(brandSchema(profile))
          + (fromActive ? `\n\n(account: ${account ? `'${account}'` : 'default'} — active)` : ''));
      }
      case 'audit_log': {
        const entries = auditRead({ platform: args.platform, status: args.status, source: args.source, limit: args.limit });
        if (entries.length === 0) return ok('No audit entries yet.');
        const lines = entries.map(e =>
          `${e.ts} | ${e.status.padEnd(9)} | ${e.platform}${e.account ? `/${e.account}` : ''} | ${e.source} | #${e.content_hash}`
          + (e.post_id ? ` | post ${e.post_id}` : '')
          + (e.error ? `\n    error: ${e.error}` : '')
        );
        return ok(`${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} (most recent first):\n${lines.join('\n')}`);
      }
      case 'schedule_check': {
        const normalized = normalizeScheduledAt(args.scheduled_at);
        const tzWarn = timezoneWarning(args.scheduled_at);
        return ok(
          `Normalized: ${normalized}\nIn the past: ${isPast(normalized) ? 'yes — would dispatch on next scheduler tick' : 'no'}`
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
        const metrics = await fetchMetrics(args.platform, args.post_id, args.account ?? '');
        const lines = Object.entries(metrics).map(([k, v]) => `  ${k}: ${v}`);
        return ok(`Metrics for ${args.platform} post ${args.post_id}:\n${lines.join('\n') || '  (none returned)'}`);
      }
      case 'analytics_report': {
        const snaps = analyticsReport({ platform: args.platform, post_id: args.post_id, limit: args.limit });
        if (snaps.length === 0) return ok(`No analytics snapshots yet. Supported platforms: ${SUPPORTED_PLATFORMS.join(', ')}.`);
        const lines = snaps.map(s =>
          `${s.ts} | ${s.platform}${s.account ? `/${s.account}` : ''} | ${s.post_id} | ${JSON.stringify(s.metrics)}`
        );
        return ok(`${snaps.length} snapshot(s):\n${lines.join('\n')}`);
      }

      // ── Queue ────────────────────────────────────────────────────────────
      case 'queue_add': {
        const scheduledAt = normalizeScheduledAt(args.scheduled_at ?? null);
        // Policy-aware (account-resolved) but without the sponsored escalation —
        // a queued item carries no per-call sponsored flag, and the real dispatch
        // path does not re-validate, so this is advisory only (see SESSION_HANDOFF).
        const v = validateWithPolicy(args.platform, args.content, args.account ?? '');
        const item = queue.add(args.platform, args.content, scheduledAt, args.account ?? '', args.draft ? 'draft' : 'pending');
        const note = v.notes.length ? `\n${v.notes.map(n => `  - ${n}`).join('\n')}` : '';
        const warn = (v.ok
          ? (v.warnings.length ? `\n⚠ ${v.warnings.join('; ')}` : '')
          : `\n⚠ Content has validation errors (saved anyway):\n` + v.errors.map(e => `  - ${e}`).join('\n')) + note;
        // Drafts are never auto-dispatched, so the past-time/dispatch warning doesn't apply.
        const past = (!args.draft && scheduledAt && isPast(scheduledAt)) ? `\n⚠ scheduled_at is in the past — will dispatch on next scheduler tick.` : '';
        const tzWarn = scheduledAt ? timezoneWarning(args.scheduled_at) : '';
        const draftNote = args.draft ? `\nDraft — held for review; won't publish until promoted (queue_update status:"pending" or queue_dispatch).` : '';
        return ok(`${args.draft ? 'Draft saved' : 'Queued'}! ID: ${item.id}\nPlatform: ${item.platform}\nStatus: ${item.status}${item.account ? `\nAccount: ${item.account}` : ''}${item.scheduled_at ? `\nScheduled: ${item.scheduled_at}` : ''}${draftNote}${past}${tzWarn ? `\n⚠ ${tzWarn}` : ''}${warn}`);
      }
      case 'queue_list': {
        const items = queue.list({ status: args.status, platform: args.platform });
        if (items.length === 0) return ok('Queue is empty.');
        const lines = items.map(i =>
          `[${i.id}] ${i.platform} | ${i.status}${i.scheduled_at ? ` | scheduled: ${i.scheduled_at}` : ''} | created: ${i.created_at}`
        );
        return ok(`${items.length} item(s):\n${lines.join('\n')}`);
      }
      case 'queue_update': {
        const item = queue.update(args.id, args.updates);
        return ok(`Updated ${item.id}: ${JSON.stringify(args.updates)}`);
      }
      case 'queue_remove': {
        const item = queue.remove(args.id);
        return ok(`Removed ${item.id} (${item.platform})`);
      }
      case 'queue_dispatch': {
        const item = queue.get(args.id);
        if (args.dry_run) {
          const v = validateWithPolicy(item.platform, item.content, item.account ?? '');
          auditRecord({ platform: item.platform, account: item.account || null, source: 'queue', status: 'dry_run', content_hash: hashContent(item.content) });
          const note = v.notes.length ? `\nPolicy:\n` + v.notes.map(n => `  - ${n}`).join('\n') : '';
          return ok(`DRY RUN — ${item.id} (${item.platform}) ${v.ok ? 'is valid; not published.' : 'has errors:\n' + v.errors.map(e => `  - ${e}`).join('\n')}${note}`);
        }
        queue.update(args.id, { status: 'dispatched' });
        try {
          const { summary } = await publishAudited(item.platform, item.content, item.account ?? '', { source: 'queue' });
          queue.update(args.id, { status: 'published', published_at: new Date().toISOString(), result: summary });
          return ok(`Dispatched!\n${summary}`);
        } catch (e) {
          queue.update(args.id, { status: 'failed', error: e.message });
          throw e;
        }
      }

      // ── Media ──────────────────────────────────────────────────────────────
      case 'media_compose': {
        // Resolve identity/visual fields from the brand kit so callers don't
        // re-specify colors/logo/handle every call: explicit arg ▸ kit.visual ▸
        // template default. The brand kit is the individualization layer.
        // Brand visual resolution follows the same active-account fallback as
        // brand_voice get / brand_schema — explicit arg wins, else the active
        // account's kit. Upload credentials remain on the default (credential)
        // account: brand identity and publishing identity can differ.
        const brandAccount = args.account ?? brand.getActive();
        const visual = (brand.get(brandAccount) || {}).visual || {};
        const { template, variables, appliedFromKit } = compose.resolveVisualVars(args, visual);
        if (!template) throw new Error('media_compose needs a `template` (or set visual.default_template in the brand kit via brand_voice).');
        const result = await compose.compose(template, variables, { provider: args.provider ?? null, account: args.account ?? '' });
        const activeNote = brandAccount && !args.account
          ? `\n(brand kit from active account '${brandAccount}')` : '';
        return ok(
          `Composed ${result.template} (${result.dimensions.width}×${result.dimensions.height})\n`
          + `Uploaded to ${result.provider}!\nPublic URL: ${result.url}`
          + (result.public_id ? `\nPublic ID: ${result.public_id}` : '')
          + (appliedFromKit.length ? `\n(brand kit applied: ${appliedFromKit.join(', ')})` : '')
          + activeNote
        );
      }
      case 'media_upload': {
        const result = await media.upload(args.file_path, args.provider ?? null, args.account ?? '');
        return ok(
          `Uploaded to ${result.provider}!\nPublic URL: ${result.url}`
          + (result.public_id ? `\nPublic ID: ${result.public_id}` : '')
          + (result.bytes     ? `\nSize: ${(result.bytes / 1024).toFixed(1)} KB` : '')
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
