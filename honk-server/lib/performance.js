// Output performance rollup (INIT-016). Joins two stores that were each
// individually complete but never connected: analytics.ts snapshots (keyed by
// platform+post_id) and assets.ts usage records (also keyed by platform+
// post_id — recorded per publish since INIT-013). Read-only join; no new
// JSON store. This is the piece that lets "which template performs better"
// be answered from data already on disk instead of requiring a new feature.
//
// Known current-data caveat (found while building this, not a hypothetical):
// the asset registry only started recording template usage 2026-07-07
// (INIT-013); most stored analytics snapshots predate that, so today's real
// store has near-zero overlap between the two keys. That's expected — this
// module is the plumbing so the join populates as new posts accrue both a
// template record and an analytics fetch, not a promise of results today.
import { allSnapshots } from './analytics.js';
import { list as listAssets } from './assets.js';
// Metrics that measure EXPOSURE (the post was shown) rather than a viewer's
// RESPONSE to it. Excluded from the engagement score — huge reach with zero
// response is the opposite of "converts well".
const EXPOSURE_METRICS = new Set(['reach', 'views', 'impressions']);
function engagementScore(metrics) {
    let total = 0;
    for (const [k, v] of Object.entries(metrics)) {
        if (EXPOSURE_METRICS.has(k))
            continue;
        if (typeof v === 'number')
            total += v;
    }
    return total;
}
function key(platform, postId) {
    return `${platform}:${postId}`;
}
// The latest snapshot per post (a post may have been fetched more than once).
function latestPerPost(snapshots) {
    const latest = new Map();
    for (const s of snapshots) {
        const k = key(s.platform, s.post_id);
        const prev = latest.get(k);
        if (!prev || s.ts > prev.ts)
            latest.set(k, s);
    }
    return [...latest.values()];
}
// post -> template(s) recorded against it in the asset registry. A carousel
// (several images, one post) can legitimately carry more than one asset
// (recordUsage writes one usage entry per matching asset); when they don't
// all agree on the same template, the post is flagged ambiguous rather than
// silently picking one.
function templatesByPost() {
    const map = new Map();
    for (const asset of listAssets()) {
        if (!asset.template)
            continue;
        for (const u of asset.usage) {
            if (!u.post_id)
                continue;
            const k = key(u.platform, u.post_id);
            const list = map.get(k) ?? [];
            if (!list.includes(asset.template))
                list.push(asset.template);
            map.set(k, list);
        }
    }
    return map;
}
export function postPerformance(filter = {}) {
    const snaps = latestPerPost(allSnapshots({ platform: filter.platform }));
    const templates = templatesByPost();
    return snaps
        .filter(s => !filter.account || s.account === filter.account)
        .map(s => {
        const tpls = templates.get(key(s.platform, s.post_id));
        return {
            post_id: s.post_id,
            platform: s.platform,
            account: s.account,
            ts: s.ts,
            ...(tpls && tpls.length === 1 ? { template: tpls[0] } : {}),
            ...(tpls && tpls.length > 1 ? { ambiguousTemplates: tpls } : {}),
            metrics: s.metrics,
            score: engagementScore(s.metrics),
        };
    })
        .sort((a, b) => b.score - a.score);
}
// Grouped by platform+template, NOT template alone: each platform's metric
// set is different shape (IG: likes/comments/saved/shares; FB: engagements/
// clicks/reactions; ...), so an average across platforms would silently mix
// incomparable units. Within one platform the ranking is meaningful; across
// platforms it isn't, so it's never collapsed into one number.
export function templatePerformance(filter = {}) {
    const withTemplate = postPerformance(filter).filter((p) => !!p.template);
    const groups = new Map();
    for (const p of withTemplate) {
        const k = key(p.platform, p.template);
        const arr = groups.get(k) ?? [];
        arr.push(p);
        groups.set(k, arr);
    }
    const stats = [];
    for (const posts of groups.values()) {
        const { platform, template } = posts[0];
        const avg = posts.reduce((sum, p) => sum + p.score, 0) / posts.length;
        const best = posts.reduce((a, b) => (b.score > a.score ? b : a));
        stats.push({ platform, template, posts: posts.length, avg_score: Math.round(avg * 100) / 100, best_post_id: best.post_id });
    }
    return stats.sort((a, b) => b.avg_score - a.avg_score);
}
// ── Formatting (tool surface) ────────────────────────────────────────────────
export function formatPerformance(posts, templates, { limit = 20 } = {}) {
    if (!posts.length) {
        return 'No analytics snapshots yet — nothing to rank. Run analytics_fetch (or wait for the '
            + '~24h auto follow-up, which needs the scheduler/start.js running) after a post has had '
            + 'time to accrue engagement.';
    }
    const shown = posts.slice(0, limit);
    const postLines = shown.map(p => `  ${p.post_id} | ${p.platform}${p.account ? `/${p.account}` : ''}`
        + (p.template ? ` | template:${p.template}`
            : p.ambiguousTemplates ? ` | templates:${p.ambiguousTemplates.join('+')} (carousel — not compared)` : '')
        + ` | score ${p.score} | ${JSON.stringify(p.metrics)}`);
    const out = [
        `${posts.length} post(s) with analytics (score = sum of non-exposure metrics; `
            + `reach/views/impressions excluded — they measure exposure, not response):`,
        '',
        ...postLines,
    ];
    if (posts.length > shown.length)
        out.push(`  … ${posts.length - shown.length} more (raise limit to see them)`);
    out.push('');
    const platforms = new Set(templates.map(t => t.platform));
    if (templates.length === 0) {
        out.push(`No template comparison yet — none of the above posts have a linked media_compose template `
            + `in the asset registry (older posts predate the registry, or their analytics haven't been `
            + `fetched since a template was recorded).`);
    }
    else if (platforms.size === 1 && templates.length === 1) {
        out.push(`Only one template ("${templates[0].platform}/${templates[0].template}") has analytics so far — nothing to compare against yet.`);
    }
    else {
        out.push('By template (avg score, high → low; each platform\'s metrics are a different shape, '
            + 'so scores only compare within the same platform — never across platforms):');
        out.push(...templates.map(t => `  ${t.platform}/${t.template} | ${t.posts} post(s) | avg ${t.avg_score} | best: ${t.best_post_id}`));
        out.push('', 'Small sample — treat as directional, not conclusive.');
    }
    return out.join('\n');
}
