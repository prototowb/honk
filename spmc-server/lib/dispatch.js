// The single publish dispatcher. Previously duplicated in index.js and
// scheduler.js — the copies had diverged (the scheduler dropped `account`, so
// scheduled multi-account posts published from the default account). Both
// callers now route through here, which is also the one hook point for audit
// logging and rate-limit tracking.

import * as x         from '../adapters/x.js';
import * as instagram from '../adapters/instagram.js';
import * as tiktok    from '../adapters/tiktok.js';
import * as facebook  from '../adapters/facebook.js';
import * as threads   from '../adapters/threads.js';
import * as bluesky   from '../adapters/bluesky.js';

import { record as auditRecord }    from './audit.js';
import { noteFromError }            from './ratelimit.js';
import { hashContent }             from './hash.js';
import { schedule as scheduleFollowup } from './followups.js';
import { extractPostId }            from './analytics.js';

// Routes to the right adapter and returns a structured result:
//   { summary, raw }  — summary is the human-readable line shown to the agent.
export async function publish(platform, content, account = '') {
  switch (platform) {
    case 'x': {
      if (content.tweets) {
        const r = await x.postThread(content.tweets, account);
        return { summary: `Thread posted! ${r.count} tweets.\nFirst: ${r.firstUrl}`, raw: r };
      }
      const r = await x.postSingleTweet(content.text, account);
      return { summary: `Tweet posted!\nID: ${r.id}\nURL: ${r.url}`, raw: r };
    }
    case 'instagram': {
      if (Array.isArray(content.image_urls) && content.image_urls.length) {
        const r = await instagram.postCarousel(content.image_urls, content.caption, account);
        return { summary: `Instagram carousel published! Media ID: ${r.id} (${r.children} slides)`, raw: r };
      }
      const r = await instagram.post(content.image_url, content.caption, account);
      return { summary: `Instagram post published! Media ID: ${r.id}`, raw: r };
    }
    case 'tiktok': {
      const r = await tiktok.postVideo(content.video_url, content.caption, content.privacy_level, account);
      return {
        summary: `TikTok submitted! Publish ID: ${r.publish_id}\n`
          + `Use tiktok_check_publish_status to confirm.\n`
          + `Note: unaudited apps post as private/self-only regardless of privacy_level.`,
        raw: r,
      };
    }
    case 'facebook': {
      const r = await facebook.post(content.message, content.image_url, account);
      return { summary: `Facebook post published! ID: ${r.post_id || r.id}`, raw: r };
    }
    case 'threads': {
      const r = await threads.post(content.text, content.image_url, account);
      return { summary: `Threads post published! ID: ${r.id}`, raw: r };
    }
    case 'bluesky': {
      const r = await bluesky.post(content.text, account);
      const postId = r.uri.split('/').pop();
      return {
        summary: `Bluesky post published!\nURI: ${r.uri}\n`
          + `View: https://bsky.app/profile/${r.identifier}/post/${postId}`,
        raw: r,
      };
    }
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

// publish() wrapped with audit + rate-limit recording. Every real publish path
// (direct tools, queue_dispatch, scheduler) goes through here so there is one
// durable record of what was sent.
export async function publishAudited(platform, content, account = '', meta = {}) {
  const base = {
    platform,
    account: account || null,
    source: meta.source || 'direct',
    content_hash: hashContent(content),
  };
  try {
    const result = await publish(platform, content, account);
    // Capture the platform post/media ID on the audit entry (when extractable) so
    // a future best-time own-data join can map publish-time → engagement without
    // parsing the summary string. Additive; null for platforms without an ID.
    const postId = extractPostId(platform, result.raw);
    auditRecord({ ...base, status: 'published', result: result.summary, ...(postId ? { post_id: postId } : {}) });
    // Queue a deferred analytics fetch for analytics-capable platforms (ALPHA-008).
    // Best-effort and self-filtering — never let it break a publish.
    try { scheduleFollowup({ platform, raw: result.raw, account }); }
    catch { /* analytics follow-up is best-effort */ }
    return result;
  } catch (e) {
    auditRecord({ ...base, status: 'failed', error: e.message });
    noteFromError(platform, e);
    throw e;
  }
}
