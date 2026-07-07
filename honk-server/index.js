import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as tiktok from './adapters/tiktok.js';
import * as instagram from './adapters/instagram.js';
import * as facebook from './adapters/facebook.js';
import * as queue from './queue/store.js';
import * as media from './media/upload.js';
import * as compose from './media/compose.js';
import { publishAudited } from './lib/dispatch.js';
import { formatValidation } from './lib/validate.js';
import { validateWithPolicy } from './lib/policy-gate.js';
import { adapt, formatAdaptation } from './lib/adapt.js';
import { report as configReport, formatReport, accountsOverview, formatAccounts } from './lib/config.js';
import { normalizeScheduledAt, isPast, timezoneWarning } from './lib/schedule.js';
import { read as auditRead, record as auditRecord, recentDuplicate } from './lib/audit.js';
import { hashContent } from './lib/hash.js';
import { status as rateLimitStatus } from './lib/ratelimit.js';
import { fetchMetrics, report as analyticsReport, SUPPORTED_PLATFORMS } from './lib/analytics.js';
import * as brand from './lib/brand.js';
import { tagUrl } from './lib/links.js';
import { bestTimes, formatBestTimes } from './lib/besttime.js';
import { briefSchema, formatBriefSchema } from './lib/brief.js';
import { listWorkflows, getWorkflow, formatWorkflow, formatWorkflows } from './lib/workflows.js';
import { contentCheck, formatContentCheck } from './lib/report.js';
import { brandSchema, formatBrandSchema } from './lib/brand-schema.js';
import * as assets from './lib/assets.js';
import { TOOLS } from './lib/tools.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const pkg = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'package.json'), 'utf8'));
// ─── Helpers ──────────────────────────────────────────────────────────────
function ok(text) {
    return { content: [{ type: 'text', text }] };
}
function err(e) {
    return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
}
function formatBrandProfile(p) {
    const v = (x) => Array.isArray(x) ? (x.length ? x.join(', ') : '—') : (String(x || '') || '—');
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
function policyLine(policy) {
    const pol = policy || {};
    const disc = pol.disclosures || {};
    const arr = (a) => (Array.isArray(a) && a.length ? a.join(', ') : '—');
    const topics = Array.isArray(pol.banned_topics) ? pol.banned_topics : [];
    const always = Array.isArray(disc.always) ? disc.always : [];
    const sponsored = Array.isArray(disc.sponsored) ? disc.sponsored : [];
    if (!topics.length && !always.length && !sponsored.length && pol.auto_publish !== true)
        return '—';
    return `banned_topics=[${arr(topics)}], disclosures.always=[${arr(always)}], `
        + `disclosures.sponsored=[${arr(sponsored)}], auto_publish=${pol.auto_publish === true}`;
}
function platformsLine(platforms) {
    const entries = Object.entries(platforms || {});
    if (!entries.length)
        return '—';
    return entries.map(([plat, o]) => {
        const fields = Object.entries(o || {})
            .map(([k, val]) => `${k}=${Array.isArray(val) ? val.join(' ') : val}`)
            .join(', ');
        return `${plat}{${fields}}`;
    }).join('; ');
}
function formatResolvedVoice(r, label, profile) {
    const p = profile || {};
    const voice = p.voice || {};
    const v = (x) => Array.isArray(x) ? (x.length ? x.join(', ') : '—') : (String(x || '') || '—');
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
    }
    else if (!r.overridden.length) {
        lines.push('', `(no ${r.audience ? 'audience/' : ''}platform overrides for ${scope} — the six fields above are the base voice.)`);
    }
    return lines.join('\n');
}
async function doPublish(platform, content, account, dryRun, { sponsored = false } = {}) {
    const v = validateWithPolicy(platform, content, account, { sponsored });
    if (!v.ok) {
        throw new Error(`Validation failed for ${v.label || platform}:\n` + v.errors.map(e => `  - ${e}`).join('\n'));
    }
    const warn = v.warnings.length ? `\nWarnings:\n` + v.warnings.map(w => `  - ${w}`).join('\n') : '';
    const notes = (v.notes && v.notes.length) ? `\nPolicy:\n` + v.notes.map(n => `  - ${n}`).join('\n') : '';
    if (dryRun) {
        auditRecord({ platform, account: account || null, source: 'direct', status: 'dry_run', content_hash: hashContent(content) });
        const clip = (s) => { const t = String(s); return t.length > 60 ? t.slice(0, 57) + '…' : t; };
        const extras = [];
        if (content.alt_text)
            extras.push(`alt text: "${clip(content.alt_text)}"`);
        if (Array.isArray(content.alt_texts) && content.alt_texts.length)
            extras.push(`${content.alt_texts.length} per-slide alt texts`);
        if (content.first_comment)
            extras.push(`first comment: "${clip(content.first_comment)}"`);
        if (sponsored)
            extras.push('flagged sponsored');
        const extraNote = extras.length ? `\nWould also set — ${extras.join('; ')}.` : '';
        return `DRY RUN — ${v.label} payload is valid; nothing was published.${extraNote}${warn}${notes}`;
    }
    const { summary } = await publishAudited(platform, content, account, { source: 'direct', sponsored });
    return summary + warn;
}
// ─── Server ───────────────────────────────────────────────────────────────
const server = new Server({ name: pkg.name, version: pkg.version }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const a = (args ?? {});
    try {
        switch (name) {
            // ── Direct publishing ───────────────────────────────────────────────
            case 'x_post_tweet':
                return ok(await doPublish('x', { text: a.text }, String(a.account ?? ''), Boolean(a.dry_run), { sponsored: Boolean(a.sponsored) }));
            case 'x_post_thread':
                return ok(await doPublish('x', { tweets: a.tweets }, String(a.account ?? ''), Boolean(a.dry_run), { sponsored: Boolean(a.sponsored) }));
            case 'instagram_post': {
                const igContent = { caption: a.caption };
                if (Array.isArray(a.image_urls) && a.image_urls.length)
                    igContent.image_urls = a.image_urls;
                else
                    igContent.image_url = a.image_url;
                if (a.alt_text)
                    igContent.alt_text = a.alt_text;
                if (Array.isArray(a.alt_texts))
                    igContent.alt_texts = a.alt_texts;
                if (a.first_comment)
                    igContent.first_comment = a.first_comment;
                return ok(await doPublish('instagram', igContent, String(a.account ?? ''), Boolean(a.dry_run), { sponsored: Boolean(a.sponsored) }));
            }
            case 'tiktok_post_video':
                return ok(await doPublish('tiktok', { video_url: a.video_url, caption: a.caption, privacy_level: a.privacy_level }, String(a.account ?? ''), Boolean(a.dry_run), { sponsored: Boolean(a.sponsored) }));
            case 'tiktok_check_publish_status': {
                const r = await tiktok.checkStatus(String(a.publish_id), String(a.account ?? ''));
                return ok(`TikTok publish status: ${r.status}${r.fail_reason ? ` (reason: ${r.fail_reason})` : ''}`);
            }
            case 'facebook_post': {
                const fbContent = { message: a.message, image_url: a.image_url };
                if (a.alt_text)
                    fbContent.alt_text = a.alt_text;
                if (a.first_comment)
                    fbContent.first_comment = a.first_comment;
                return ok(await doPublish('facebook', fbContent, String(a.account ?? ''), Boolean(a.dry_run), { sponsored: Boolean(a.sponsored) }));
            }
            case 'threads_post': {
                const thContent = { text: a.text, image_url: a.image_url };
                if (a.alt_text)
                    thContent.alt_text = a.alt_text;
                return ok(await doPublish('threads', thContent, String(a.account ?? ''), Boolean(a.dry_run), { sponsored: Boolean(a.sponsored) }));
            }
            case 'bluesky_post':
                return ok(await doPublish('bluesky', { text: a.text }, String(a.account ?? ''), Boolean(a.dry_run), { sponsored: Boolean(a.sponsored) }));
            // ── Content intelligence ──────────────────────────────────────────────
            case 'content_validate':
                return ok(formatValidation(validateWithPolicy(String(a.platform), a.content, String(a.account ?? ''), { sponsored: Boolean(a.sponsored) })));
            case 'content_check': {
                const r = contentCheck(String(a.platform), a.content, String(a.account ?? ''), {
                    sponsored: Boolean(a.sponsored),
                    scheduled_at: a.scheduled_at != null ? String(a.scheduled_at) : null,
                    duplicateWindowHours: a.within_hours ?? 168,
                });
                return ok(formatContentCheck(r));
            }
            case 'content_adapt':
                return ok(formatAdaptation(adapt(String(a.text), a.platforms)));
            case 'config_doctor':
                return ok(formatReport(configReport()));
            case 'account_info': {
                const mod = { instagram, facebook }[String(a.platform)];
                if (!mod)
                    throw new Error(`account_info not available for "${a.platform}". Supported: instagram, facebook.`);
                const p = await mod.getProfile(String(a.account ?? ''));
                let seedNote = '';
                if (a.seed_brand_kit && (p.handle || p.icon_url)) {
                    const brandAccount = a.account ?? brand.getActive();
                    const patch = { visual: {} };
                    if (p.handle)
                        patch.visual.handle = p.handle;
                    let permanentIconUrl = p.icon_url ?? null;
                    if (p.icon_url) {
                        try {
                            const imgRes = await fetch(p.icon_url);
                            if (imgRes.ok) {
                                const buf = Buffer.from(await imgRes.arrayBuffer());
                                const up = await media.upload(null, null, String(a.account ?? ''), buf, 'profile-icon.png');
                                permanentIconUrl = up.url;
                            }
                        }
                        catch { /* keep raw CDN URL as fallback */ }
                        patch.visual.icon_url = permanentIconUrl;
                    }
                    brand.set(patch, brandAccount);
                    const label = brandAccount || 'default';
                    const updated = [
                        p.handle && `handle → ${p.handle}`,
                        permanentIconUrl && 'icon_url → set',
                    ].filter(Boolean);
                    seedNote = `\n\nBrand kit updated (account '${label}'): ${updated.join(', ')}.`;
                }
                return ok(`${p.platform}${a.account ? `/${a.account}` : ''} profile:\n`
                    + `  name:   ${p.name ?? '(none)'}\n`
                    + `  handle: ${p.handle ?? '(none set)'}\n`
                    + `  id:     ${p.id}\n`
                    + `  icon:   ${p.icon_url ?? '(none)'}`
                    + seedNote);
            }
            case 'brand_voice': {
                const action = String(a.action ?? 'get');
                if (action === 'list') {
                    return ok(formatAccounts(accountsOverview()));
                }
                if (action === 'use') {
                    const saved = brand.setActive(String(a.account ?? ''));
                    if (!saved)
                        return ok('Active account reset to default.');
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
                    if (!a.profile || typeof a.profile !== 'object')
                        throw new Error('brand_voice set requires a `profile` object.');
                    const saved = brand.set(a.profile, acct, { replace: Boolean(a.replace) });
                    return ok(`Saved the ${label} brand profile (${a.replace ? 'replaced' : 'merged'}).\n\n${formatBrandProfile(saved)}`);
                }
                const acct = a.account != null ? String(a.account) : brand.getActive();
                const fromActive = a.account == null && !!brand.getActive();
                const label = acct ? `'${acct}'` : 'default';
                const activeSuffix = fromActive
                    ? `\n\n(resolved from the active account ${label} — pass account: explicitly to override)` : '';
                const current = brand.get(acct);
                if (a.platform || a.audience) {
                    return ok(formatResolvedVoice(brand.resolveVoice(current, { platform: a.platform, audience: a.audience }), label, current) + activeSuffix);
                }
                if (!current)
                    return ok(`No brand profile set for ${label}. Set one with brand_voice(action:"set", profile:{...}). Empty shape:\n\n${formatBrandProfile(brand.emptyProfile())}${activeSuffix}`);
                return ok(`Brand profile (${label}):\n\n${formatBrandProfile(current)}${activeSuffix}`);
            }
            case 'link_tag': {
                const profile = brand.getOrEmpty(String(a.account ?? ''));
                const defaults = (profile.links && profile.links.utm_defaults) || {};
                const merged = { ...defaults, ...(a.params || {}) };
                if (a.platform) {
                    for (const k of Object.keys(merged)) {
                        if (typeof merged[k] === 'string')
                            merged[k] = merged[k].split('{platform}').join(String(a.platform));
                    }
                }
                const tagged = tagUrl(String(a.url), merged);
                const used = Object.keys(merged).filter(k => merged[k] !== '' && merged[k] != null);
                return ok(`Tagged URL:\n${tagged}${used.length ? `\nParams: ${used.join(', ')}` : '\n(no params applied — set links.utm_defaults in brand_voice or pass params)'}`);
            }
            case 'duplicate_check': {
                const hours = a.within_hours ?? 168;
                const hash = hashContent(a.content);
                const dup = recentDuplicate({ platform: String(a.platform), content_hash: hash, withinMs: hours * 3600 * 1000 });
                if (!dup)
                    return ok(`No duplicate — no identical ${a.platform} publish in the last ${hours}h (content hash #${hash}).`);
                return ok(`⚠ Possible duplicate — identical content (hash #${hash}) was published to `
                    + `${dup.platform}${dup.account ? `/${dup.account}` : ''} at ${dup.ts}.`
                    + (dup.result ? `\n  ${dup.result.split('\n')[0]}` : '')
                    + `\nConfirm with the user before reposting.`);
            }
            case 'best_time': {
                const result = bestTimes({ platform: String(a.platform), count: a.count, account: String(a.account ?? '') });
                return ok(formatBestTimes(result));
            }
            case 'workflow_list': {
                if (a.name != null) {
                    const w = getWorkflow(String(a.name));
                    if (!w)
                        return ok(`No workflow named '${String(a.name)}'. Available: ${listWorkflows().map(x => x.name).join(', ')}.`);
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
                const entries = auditRead({ platform: a.platform, status: a.status, source: a.source, limit: a.limit });
                if (entries.length === 0)
                    return ok('No audit entries yet.');
                const lines = entries.map(e => `${e.ts} | ${e.status.padEnd(9)} | ${e.platform}${e.account ? `/${e.account}` : ''} | ${e.source} | #${e.content_hash}`
                    + (e.post_id ? ` | post ${e.post_id}` : '')
                    + (e.error ? `\n    error: ${e.error}` : ''));
                return ok(`${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} (most recent first):\n${lines.join('\n')}`);
            }
            case 'schedule_check': {
                const normalized = normalizeScheduledAt(a.scheduled_at);
                const tzWarn = timezoneWarning(a.scheduled_at);
                return ok(`Normalized: ${normalized}\nIn the past: ${isPast(normalized) ? 'yes — would dispatch on next scheduler tick' : 'no'}`
                    + (tzWarn ? `\n⚠ ${tzWarn}` : ''));
            }
            // ── Observability ─────────────────────────────────────────────────────
            case 'rate_limits': {
                const s = rateLimitStatus();
                const platforms = Object.keys(s);
                if (platforms.length === 0)
                    return ok('No rate-limit responses observed.');
                const lines = platforms.map(p => `${p}: ${s[p].count} hit(s) | last: ${s[p].last_seen}${s[p].last_message ? `\n    ${s[p].last_message}` : ''}`);
                return ok(`Rate-limit responses seen:\n${lines.join('\n')}`);
            }
            case 'analytics_fetch': {
                const metrics = await fetchMetrics(String(a.platform), String(a.post_id), String(a.account ?? ''));
                const lines = Object.entries(metrics).map(([k, v]) => `  ${k}: ${v}`);
                return ok(`Metrics for ${a.platform} post ${a.post_id}:\n${lines.join('\n') || '  (none returned)'}`);
            }
            case 'analytics_report': {
                const snaps = analyticsReport({ platform: a.platform, post_id: a.post_id, limit: a.limit });
                if (snaps.length === 0)
                    return ok(`No analytics snapshots yet. Supported platforms: ${SUPPORTED_PLATFORMS.join(', ')}.`);
                const lines = snaps.map(s => `${s.ts} | ${s.platform}${s.account ? `/${s.account}` : ''} | ${s.post_id} | ${JSON.stringify(s.metrics)}`);
                return ok(`${snaps.length} snapshot(s):\n${lines.join('\n')}`);
            }
            // ── Queue ────────────────────────────────────────────────────────────
            case 'queue_add': {
                const scheduledAt = normalizeScheduledAt(a.scheduled_at ?? null);
                const sponsored = Boolean(a.sponsored);
                const v = validateWithPolicy(String(a.platform), a.content, String(a.account ?? ''), { sponsored });
                const item = queue.add(String(a.platform), a.content, scheduledAt, String(a.account ?? ''), a.draft ? 'draft' : 'pending', sponsored);
                const note = v.notes && v.notes.length ? `\n${v.notes.map(n => `  - ${n}`).join('\n')}` : '';
                const warn = (v.ok
                    ? (v.warnings.length ? `\n⚠ ${v.warnings.join('; ')}` : '')
                    : `\n⚠ Content has validation errors (saved anyway):\n` + v.errors.map(e => `  - ${e}`).join('\n')) + note;
                const past = (!a.draft && scheduledAt && isPast(scheduledAt)) ? `\n⚠ scheduled_at is in the past — will dispatch on next scheduler tick.` : '';
                const tzWarn = scheduledAt ? timezoneWarning(a.scheduled_at) : '';
                const draftNote = a.draft ? `\nDraft — held for review; won't publish until promoted (queue_update status:"pending" or queue_dispatch).` : '';
                return ok(`${a.draft ? 'Draft saved' : 'Queued'}! ID: ${item.id}\nPlatform: ${item.platform}\nStatus: ${item.status}${item.account ? `\nAccount: ${item.account}` : ''}${item.scheduled_at ? `\nScheduled: ${item.scheduled_at}` : ''}${draftNote}${past}${tzWarn ? `\n⚠ ${tzWarn}` : ''}${warn}`);
            }
            case 'queue_list': {
                const items = queue.list({ status: a.status, platform: a.platform });
                if (items.length === 0)
                    return ok('Queue is empty.');
                const lines = items.map(i => `[${i.id}] ${i.platform} | ${i.status}${i.scheduled_at ? ` | scheduled: ${i.scheduled_at}` : ''} | created: ${i.created_at}`);
                return ok(`${items.length} item(s):\n${lines.join('\n')}`);
            }
            case 'queue_update': {
                const item = queue.update(String(a.id), a.updates);
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
                }
                catch (e) {
                    queue.update(String(a.id), { status: 'failed', error: e.message });
                    throw e;
                }
            }
            // ── Asset registry (DAM seed, INIT-013) ───────────────────────────────
            case 'asset_list': {
                if (a.query != null) {
                    const found = assets.find(String(a.query));
                    if (!found)
                        return ok(`No asset matches '${String(a.query)}' (id, hash, or URL).`);
                    return ok(assets.formatAsset(found));
                }
                const filter = {};
                if (a.source != null)
                    filter.source = String(a.source);
                if (a.tag != null)
                    filter.tag = String(a.tag);
                if (a.account != null)
                    filter.account = String(a.account);
                if (a.template != null)
                    filter.template = String(a.template);
                if (typeof a.expired === 'boolean')
                    filter.expired = a.expired;
                if (typeof a.used === 'boolean')
                    filter.used = a.used;
                let items = assets.list(filter);
                if (a.limit != null)
                    items = items.slice(0, Number(a.limit));
                return ok(assets.formatAssets(items));
            }
            case 'asset_update': {
                const updated = assets.update(String(a.id), {
                    ...(a.rights_note != null ? { rights_note: String(a.rights_note) } : {}),
                    ...(a.rights_expires_at != null ? { rights_expires_at: String(a.rights_expires_at) } : {}),
                    ...(Array.isArray(a.add_tags) ? { add_tags: a.add_tags } : {}),
                    ...(Array.isArray(a.remove_tags) ? { remove_tags: a.remove_tags } : {}),
                });
                return ok(`Asset updated.\n${assets.formatAsset(updated)}`);
            }
            // ── Media ──────────────────────────────────────────────────────────────
            case 'media_compose': {
                const brandAccount = a.account ?? brand.getActive();
                const visual = (brand.get(brandAccount) || {}).visual || {};
                const { template, variables, appliedFromKit } = compose.resolveVisualVars(a, visual);
                if (!template)
                    throw new Error('media_compose needs a `template` (or set visual.default_template in the brand kit via brand_voice).');
                const result = await compose.compose(template, variables, { provider: a.provider ?? undefined, account: String(a.account ?? '') });
                // Asset registry (INIT-013): the brand kit's identity media are assets
                // too — register the kit's logo/icon URLs (dedupe by URL) best-effort.
                const v = visual;
                for (const [kind, u] of [['logo', v.logo_url], ['icon', v.icon_url]]) {
                    if (typeof u === 'string' && u) {
                        try {
                            assets.register({ url: u, source: 'brand-kit', tags: ['brand-kit', kind], ...(brandAccount ? { account: brandAccount } : {}) });
                        }
                        catch { /* best-effort */ }
                    }
                }
                const activeNote = brandAccount && !a.account
                    ? `\n(brand kit from active account '${brandAccount}')` : '';
                return ok(`Composed ${result.template} (${result.dimensions.width}×${result.dimensions.height})\n`
                    + `Uploaded to ${result.provider}!\nPublic URL: ${result.url}`
                    + (result.public_id ? `\nPublic ID: ${result.public_id}` : '')
                    + (appliedFromKit.length ? `\n(brand kit applied: ${appliedFromKit.join(', ')})` : '')
                    + activeNote);
            }
            case 'media_upload': {
                const result = await media.upload(String(a.file_path), a.provider ?? null, String(a.account ?? ''));
                return ok(`Uploaded to ${result.provider}!\nPublic URL: ${result.url}`
                    + (result.public_id ? `\nPublic ID: ${result.public_id}` : '')
                    + (result.bytes ? `\nSize: ${(result.bytes / 1024).toFixed(1)} KB` : ''));
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (e) {
        return err(e);
    }
});
const transport = new StdioServerTransport();
await server.connect(transport);
