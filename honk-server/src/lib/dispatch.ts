import * as x         from '../adapters/x.js';
import * as instagram from '../adapters/instagram.js';
import * as tiktok    from '../adapters/tiktok.js';
import * as facebook  from '../adapters/facebook.js';
import * as threads   from '../adapters/threads.js';
import * as bluesky   from '../adapters/bluesky.js';

import { record as auditRecord }        from './audit.js';
import { noteFromError }                from './ratelimit.js';
import { hashContent }                  from './hash.js';
import { schedule as scheduleFollowup } from './followups.js';
import { extractPostId }                from './analytics.js';
import { validateWithPolicy }           from './policy-gate.js';
import type { PublishResult, AuditSource } from './types.js';

// Routes to the right adapter and returns a structured result:
//   { summary, raw }  — summary is the human-readable line shown to the agent.
export async function publish(platform: string, content: Record<string, unknown>, account = ''): Promise<PublishResult> {
  switch (platform) {
    case 'x': {
      if (content.tweets) {
        const r = await x.postThread(content.tweets as string[], account);
        return { summary: `Thread posted! ${r.count} tweets.\nFirst: ${r.firstUrl}`, raw: r };
      }
      const r = await x.postSingleTweet(content.text as string, account);
      return { summary: `Tweet posted!\nID: ${r.id}\nURL: ${r.url}`, raw: r };
    }
    case 'instagram': {
      if (Array.isArray(content.image_urls) && (content.image_urls as string[]).length) {
        const r = await instagram.postCarousel(content.image_urls as string[], content.caption as string, account, { alt_texts: content.alt_texts as string[] });
        return { summary: `Instagram carousel published! Media ID: ${r.id} (${r.children} slides)`, raw: r };
      }
      const r = await instagram.post(content.image_url as string, content.caption as string, account, { alt_text: content.alt_text as string });
      return { summary: `Instagram post published! Media ID: ${r.id}`, raw: r };
    }
    case 'tiktok': {
      const r = await tiktok.postVideo(content.video_url as string, content.caption as string, content.privacy_level as string, account);
      return {
        summary: `TikTok submitted! Publish ID: ${r.publish_id}\n`
          + `Use tiktok_check_publish_status to confirm.\n`
          + `Note: unaudited apps post as private/self-only regardless of privacy_level.`,
        raw: r,
      };
    }
    case 'facebook': {
      const r = await facebook.post(content.message as string, content.image_url as string, account, { alt_text: content.alt_text as string });
      return { summary: `Facebook post published! ID: ${(r as { post_id?: string; id?: string }).post_id || (r as { post_id?: string; id?: string }).id}`, raw: r as unknown as Record<string, unknown> };
    }
    case 'threads': {
      const r = await threads.post(content.text as string, content.image_url as string, account, { alt_text: content.alt_text as string });
      return { summary: `Threads post published! ID: ${r.id}`, raw: r };
    }
    case 'bluesky': {
      const r = await bluesky.post(content.text as string, account);
      const postId = r.uri.split('/').pop();
      return {
        summary: `Bluesky post published!\nURI: ${r.uri}\n`
          + `View: https://bsky.app/profile/${r.identifier}/post/${postId}`,
        raw: r as unknown as Record<string, unknown>,
      };
    }
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

async function postFirstComment(platform: string, postId: string | null, message: string, account = ''): Promise<unknown> {
  if (!postId) throw new Error('no post id to comment on');
  if (platform === 'instagram') return instagram.comment(postId, message, account);
  if (platform === 'facebook')  return facebook.comment(postId, message, account);
  throw new Error(`first comment is not supported for ${platform}`);
}

// publish() wrapped with audit + rate-limit recording. Every real publish path
// (direct tools, queue_dispatch, scheduler) goes through here so there is one
// durable record of what was sent — and one place that enforces validation +
// brand policy before anything leaves. The gate runs here (not only at the
// direct-publish handler) so a queued or scheduled post is re-validated against
// policy at DISPATCH time: the scheduler has no live agent to catch a sponsored
// post missing its required disclosure, so the deterministic gate must live on
// the send path itself (INIT-005, closing the INDIV-004 dispatch re-validation
// gap). A validation failure throws before publish() — no network call is made,
// the catch records a `failed` audit entry, and the caller (queue_dispatch /
// scheduler) marks the queue item failed rather than silently publishing or
// silently dropping it.
export async function publishAudited(platform: string, content: Record<string, unknown>, account = '', meta: { source?: string; sponsored?: boolean } = {}): Promise<PublishResult> {
  const base = {
    platform,
    account: account || null,
    source: (meta.source || 'direct') as AuditSource,
    content_hash: hashContent(content),
  };
  try {
    const gate = validateWithPolicy(platform, content, account, { sponsored: meta.sponsored ?? false });
    if (!gate.ok) {
      throw new Error(`Blocked before publish — ${gate.label || platform} failed validation:\n`
        + gate.errors.map(e => `  - ${e}`).join('\n'));
    }
    const result = await publish(platform, content, account);
    // Capture the platform post/media ID on the audit entry (when extractable) so
    // a future best-time own-data join can map publish-time → engagement without
    // parsing the summary string.
    const postId = extractPostId(platform, result.raw as Record<string, unknown>);
    auditRecord({ ...base, status: 'published', result: result.summary, ...(postId ? { post_id: postId } : {}) });
    // First comment (ALPHA-015): best-effort, AFTER the publish is confirmed and
    // audited `published`. A comment failure must not fail the live post.
    if (content.first_comment) {
      try {
        await postFirstComment(platform, postId, content.first_comment as string, account);
        result.summary += `\n✓ First comment posted.`;
      } catch (e) {
        result.summary += `\n⚠ First comment failed (the post is live): ${(e as Error).message}`;
      }
    }
    // Queue a deferred analytics fetch for analytics-capable platforms (ALPHA-008).
    try { scheduleFollowup({ platform, raw: result.raw as Record<string, unknown>, account }); }
    catch { /* analytics follow-up is best-effort */ }
    return result;
  } catch (e) {
    auditRecord({ ...base, status: 'failed', error: (e as Error).message });
    noteFromError(platform, e);
    throw e;
  }
}
