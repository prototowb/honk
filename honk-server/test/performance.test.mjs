// Output performance rollup (INIT-016) — joins analytics.ts snapshots to
// assets.ts template usage via the shared platform+post_id key. Pure read
// join; no new store, so fixtures go through the real analytics/assets APIs.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let dir;
before(() => { dir = mkdtempSync(join(tmpdir(), 'honk-performance-')); process.env.HONK_DATA_DIR = dir; });
after(() => { try { rmSync(dir, { recursive: true, force: true }); } catch {} });

const analytics = await import('../lib/analytics.js');
const assets    = await import('../lib/assets.js');
const perf      = await import('../lib/performance.js');

test('no snapshots yet: empty rollup, diagnostic message', () => {
  assert.deepEqual(perf.postPerformance(), []);
  assert.deepEqual(perf.templatePerformance(), []);
  assert.match(perf.formatPerformance([], []), /No analytics snapshots yet/);
});

test('snapshots with no linked template: posts rank, template section explains the gap', () => {
  analytics.record('instagram', 'post-untemplated', { reach: 50, likes: 3, comments: 1, saved: 0, shares: 0 });
  const posts = perf.postPerformance();
  assert.equal(posts.length, 1);
  assert.equal(posts[0].template, undefined);
  assert.equal(posts[0].score, 4); // likes+comments+saved+shares, reach excluded

  const templates = perf.templatePerformance();
  assert.deepEqual(templates, []);
  assert.match(perf.formatPerformance(posts, templates), /No template comparison yet/);
});

test('a post linked to exactly one template: not enough templates to compare', () => {
  assets.register({ url: 'https://cdn.example/a.png', hash: 'h1'.padEnd(16, '0'), source: 'compose', template: 'square-tall' });
  assets.recordUsage(['https://cdn.example/a.png'], { platform: 'facebook', post_id: 'post-a', at: '2026-07-10T00:00:00Z' });
  analytics.record('facebook', 'post-a', { post_clicks: 5, post_reactions_like_total: 10 });

  const posts = perf.postPerformance({ platform: 'facebook' });
  const linked = posts.find(p => p.post_id === 'post-a');
  assert.equal(linked.template, 'square-tall');
  assert.equal(linked.score, 15);

  const templates = perf.templatePerformance({ platform: 'facebook' });
  assert.equal(templates.length, 1); // one template group exists, but nothing to compare it against yet
  assert.equal(templates[0].template, 'square-tall');
  assert.match(perf.formatPerformance(posts, templates), /Only one template \("facebook\/square-tall"\)/);
});

test('two templates with results: templatePerformance ranks by avg score, formatter shows comparison', () => {
  assets.register({ url: 'https://cdn.example/b.png', hash: 'h2'.padEnd(16, '0'), source: 'compose', template: 'square-news' });
  assets.recordUsage(['https://cdn.example/b.png'], { platform: 'facebook', post_id: 'post-b', at: '2026-07-11T00:00:00Z' });
  analytics.record('facebook', 'post-b', { post_clicks: 1, post_reactions_like_total: 1 }); // score 2, lower than square-tall's 15

  const templates = perf.templatePerformance({ platform: 'facebook' });
  assert.equal(templates.length, 2);
  assert.equal(templates[0].template, 'square-tall'); // higher avg first
  assert.equal(templates[0].posts, 1);
  assert.equal(templates[1].template, 'square-news');

  const out = perf.formatPerformance(perf.postPerformance({ platform: 'facebook' }), templates);
  assert.match(out, /By template \(avg score/);
  assert.match(out, /square-tall/);
  assert.match(out, /square-news/);
});

test('templates are grouped by platform+template — never averaged across platforms', () => {
  // Same template name used on two different platforms: must NOT collapse into
  // one cross-platform average (IG and FB metric sets are different shapes).
  assets.register({ url: 'https://cdn.example/ig-tall.png', hash: 'h5'.padEnd(16, '0'), source: 'compose', template: 'shared-name' });
  assets.recordUsage(['https://cdn.example/ig-tall.png'], { platform: 'instagram', post_id: 'post-shared-ig', at: '2026-07-13T00:00:00Z' });
  analytics.record('instagram', 'post-shared-ig', { reach: 10, likes: 5 });

  assets.register({ url: 'https://cdn.example/fb-tall.png', hash: 'h6'.padEnd(16, '0'), source: 'compose', template: 'shared-name' });
  assets.recordUsage(['https://cdn.example/fb-tall.png'], { platform: 'facebook', post_id: 'post-shared-fb', at: '2026-07-13T00:00:01Z' });
  analytics.record('facebook', 'post-shared-fb', { post_clicks: 3, post_reactions_like_total: 2 });

  const templates = perf.templatePerformance();
  const shared = templates.filter(t => t.template === 'shared-name');
  assert.equal(shared.length, 2); // one group per platform, not merged into one
  assert.deepEqual(shared.map(t => t.platform).sort(), ['facebook', 'instagram']);
  assert.ok(shared.every(t => t.posts === 1));

  const out = perf.formatPerformance(perf.postPerformance(), templates);
  assert.match(out, /never compare[sd]? across platforms|scores only compare within the same platform/);
  assert.match(out, /instagram\/shared-name/);
  assert.match(out, /facebook\/shared-name/);
});

test('a carousel post with mixed templates is flagged ambiguous, excluded from template comparison', () => {
  assets.register({ url: 'https://cdn.example/c1.png', hash: 'h3'.padEnd(16, '0'), source: 'compose', template: 'square-tall' });
  assets.register({ url: 'https://cdn.example/c2.png', hash: 'h4'.padEnd(16, '0'), source: 'compose', template: 'square-news' });
  assets.recordUsage(['https://cdn.example/c1.png'], { platform: 'instagram', post_id: 'post-carousel', at: '2026-07-12T00:00:00Z' });
  assets.recordUsage(['https://cdn.example/c2.png'], { platform: 'instagram', post_id: 'post-carousel', at: '2026-07-12T00:00:01Z' });
  analytics.record('instagram', 'post-carousel', { reach: 100, likes: 20 });

  const posts = perf.postPerformance({ platform: 'instagram' });
  const carousel = posts.find(p => p.post_id === 'post-carousel');
  assert.equal(carousel.template, undefined);
  assert.deepEqual(carousel.ambiguousTemplates.sort(), ['square-news', 'square-tall']);

  const templates = perf.templatePerformance({ platform: 'instagram' });
  assert.ok(!templates.some(t => t.posts && carousel.ambiguousTemplates.includes(t.template) && t.best_post_id === 'post-carousel'));
  const line = perf.formatPerformance(posts, templates);
  assert.match(line, /carousel — not compared/);
});

test('only the latest snapshot per post counts toward the score', () => {
  analytics.record('threads', 'post-repeat', { views: 900, likes: 1 });
  analytics.record('threads', 'post-repeat', { views: 900, likes: 9 }); // later fetch, higher engagement
  const posts = perf.postPerformance({ platform: 'threads' });
  const p = posts.find(x => x.post_id === 'post-repeat');
  assert.equal(p.score, 9);
});

test('account filter narrows the rollup', () => {
  analytics.record('bluesky', 'post-acct', { likes: 3 }, 'brandco');
  assert.equal(perf.postPerformance({ platform: 'bluesky', account: 'brandco' }).length, 1);
  assert.equal(perf.postPerformance({ platform: 'bluesky', account: 'someone-else' }).length, 0);
});
