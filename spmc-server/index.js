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
import { validate, formatValidation }     from './lib/validate.js';
import { adapt, formatAdaptation }        from './lib/adapt.js';
import { report as configReport, formatReport } from './lib/config.js';
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
    `platforms:          ${obj(p.platforms)}`,
    `notes:              ${v(p.notes)}`,
  ].join('\n');
}

function err(e) {
  return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
}

// Single publish path for every direct posting tool: validate → (dry-run preview
// | audited publish). Returns the agent-facing summary string.
async function doPublish(platform, content, account, dryRun) {
  const v = validate(platform, content);
  if (!v.ok) {
    throw new Error(`Validation failed for ${v.label || platform}:\n` + v.errors.map(e => `  - ${e}`).join('\n'));
  }
  const warn = v.warnings.length ? `\nWarnings:\n` + v.warnings.map(w => `  - ${w}`).join('\n') : '';

  if (dryRun) {
    auditRecord({ platform, account: account || null, source: 'direct', status: 'dry_run', content_hash: hashContent(content) });
    const clip = (s) => { const t = String(s); return t.length > 60 ? t.slice(0, 57) + '…' : t; };
    const extras = [];
    if (content.alt_text)  extras.push(`alt text: "${clip(content.alt_text)}"`);
    if (Array.isArray(content.alt_texts) && content.alt_texts.length) extras.push(`${content.alt_texts.length} per-slide alt texts`);
    if (content.first_comment) extras.push(`first comment: "${clip(content.first_comment)}"`);
    const extraNote = extras.length ? `\nWould also set — ${extras.join('; ')}.` : '';
    return `DRY RUN — ${v.label} payload is valid; nothing was published.${extraNote}${warn}`;
  }

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
        return ok(await doPublish('x', { text: args.text }, args.account ?? '', args.dry_run));
      case 'x_post_thread':
        return ok(await doPublish('x', { tweets: args.tweets }, args.account ?? '', args.dry_run));
      case 'instagram_post': {
        const igContent = { caption: args.caption };
        if (Array.isArray(args.image_urls) && args.image_urls.length) igContent.image_urls = args.image_urls;
        else igContent.image_url = args.image_url;
        if (args.alt_text)      igContent.alt_text = args.alt_text;
        if (Array.isArray(args.alt_texts)) igContent.alt_texts = args.alt_texts;
        if (args.first_comment) igContent.first_comment = args.first_comment;
        return ok(await doPublish('instagram', igContent, args.account ?? '', args.dry_run));
      }
      case 'tiktok_post_video':
        return ok(await doPublish('tiktok', { video_url: args.video_url, caption: args.caption, privacy_level: args.privacy_level }, args.account ?? '', args.dry_run));
      case 'tiktok_check_publish_status': {
        const r = await tiktok.checkStatus(args.publish_id, args.account ?? '');
        return ok(`TikTok publish status: ${r.status}${r.fail_reason ? ` (reason: ${r.fail_reason})` : ''}`);
      }
      case 'facebook_post': {
        const fbContent = { message: args.message, image_url: args.image_url };
        if (args.alt_text)      fbContent.alt_text = args.alt_text;
        if (args.first_comment) fbContent.first_comment = args.first_comment;
        return ok(await doPublish('facebook', fbContent, args.account ?? '', args.dry_run));
      }
      case 'threads_post': {
        const thContent = { text: args.text, image_url: args.image_url };
        if (args.alt_text) thContent.alt_text = args.alt_text;
        return ok(await doPublish('threads', thContent, args.account ?? '', args.dry_run));
      }
      case 'bluesky_post':
        return ok(await doPublish('bluesky', { text: args.text }, args.account ?? '', args.dry_run));

      // ── Content intelligence ──────────────────────────────────────────────
      case 'content_validate':
        return ok(formatValidation(validate(args.platform, args.content)));
      case 'content_adapt':
        return ok(formatAdaptation(adapt(args.text, args.platforms)));
      case 'config_doctor':
        return ok(formatReport(configReport()));
      case 'account_info': {
        const mod = { instagram, facebook }[args.platform];
        if (!mod) throw new Error(`account_info not available for "${args.platform}". Supported: instagram, facebook.`);
        const p = await mod.getProfile(args.account ?? '');
        return ok(
          `${p.platform}${args.account ? `/${args.account}` : ''} profile:\n`
          + `  name:   ${p.name ?? '(none)'}\n`
          + `  handle: ${p.handle ?? '(none set)'}\n`
          + `  id:     ${p.id}\n`
          + `  icon:   ${p.icon_url ?? '(none)'}`
        );
      }
      case 'brand_voice': {
        const account = args.account ?? '';
        const label = account ? `'${account}'` : 'default';
        const action = args.action ?? 'get';
        if (action === 'clear') {
          const existed = brand.clear(account);
          return ok(existed ? `Cleared the ${label} brand profile.` : `No ${label} brand profile to clear.`);
        }
        if (action === 'set') {
          if (!args.profile || typeof args.profile !== 'object') throw new Error('brand_voice set requires a `profile` object.');
          const saved = brand.set(args.profile, account, { replace: !!args.replace });
          return ok(`Saved the ${label} brand profile (${args.replace ? 'replaced' : 'merged'}).\n\n${formatBrandProfile(saved)}`);
        }
        const current = brand.get(account);
        if (!current) return ok(`No brand profile set for ${label}. Set one with brand_voice(action:"set", profile:{...}). Empty shape:\n\n${formatBrandProfile(brand.emptyProfile())}`);
        return ok(`Brand profile (${label}):\n\n${formatBrandProfile(current)}`);
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
        const profile = brand.get(args.account ?? '');
        return ok(formatBrandSchema(brandSchema(profile)));
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
        const v = validate(args.platform, args.content);
        const item = queue.add(args.platform, args.content, scheduledAt, args.account ?? '', args.draft ? 'draft' : 'pending');
        const warn = v.ok
          ? (v.warnings.length ? `\n⚠ ${v.warnings.join('; ')}` : '')
          : `\n⚠ Content has validation errors (saved anyway):\n` + v.errors.map(e => `  - ${e}`).join('\n');
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
          const v = validate(item.platform, item.content);
          auditRecord({ platform: item.platform, account: item.account || null, source: 'queue', status: 'dry_run', content_hash: hashContent(item.content) });
          return ok(`DRY RUN — ${item.id} (${item.platform}) ${v.ok ? 'is valid; not published.' : 'has errors:\n' + v.errors.map(e => `  - ${e}`).join('\n')}`);
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
        const visual = (brand.get(args.account ?? '') || {}).visual || {};
        const { template, variables, appliedFromKit } = compose.resolveVisualVars(args, visual);
        if (!template) throw new Error('media_compose needs a `template` (or set visual.default_template in the brand kit via brand_voice).');
        const result = await compose.compose(template, variables, { provider: args.provider ?? null, account: args.account ?? '' });
        return ok(
          `Composed ${result.template} (${result.dimensions.width}×${result.dimensions.height})\n`
          + `Uploaded to ${result.provider}!\nPublic URL: ${result.url}`
          + (result.public_id ? `\nPublic ID: ${result.public_id}` : '')
          + (appliedFromKit.length ? `\n(brand kit applied: ${appliedFromKit.join(', ')})` : '')
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
