import { Server }               from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import * as x         from './adapters/x.js';
import * as instagram from './adapters/instagram.js';
import * as tiktok    from './adapters/tiktok.js';
import * as facebook  from './adapters/facebook.js';
import * as threads   from './adapters/threads.js';
import * as bluesky   from './adapters/bluesky.js';
import * as queue     from './queue/store.js';
import * as media     from './media/upload.js';
import * as compose   from './media/compose.js';

// ─── Tool definitions ─────────────────────────────────────────────────────

const TOOLS = [
  // ── X (Twitter) ──────────────────────────────────────────────────────────
  {
    name: 'x_post_tweet',
    description: 'Post a single tweet to X (Twitter). Max 280 characters.',
    inputSchema: {
      type: 'object',
      properties: {
        text:    { type: 'string', description: 'Tweet text (max 280 chars)' },
        account: { type: 'string', description: "Named account to post from (e.g. 'brand'). Omit to use the default account." },
      },
      required: ['text'],
    },
  },
  {
    name: 'x_post_thread',
    description: 'Post a thread of tweets to X. Each array item is one tweet, chained as replies.',
    inputSchema: {
      type: 'object',
      properties: {
        tweets:  { type: 'array', items: { type: 'string' }, description: 'Ordered array of tweet texts' },
        account: { type: 'string', description: "Named account to post from (e.g. 'brand'). Omit to use the default account." },
      },
      required: ['tweets'],
    },
  },
  // ── Instagram ─────────────────────────────────────────────────────────────
  {
    name: 'instagram_post',
    description: 'Post an image with caption to Instagram. Requires a publicly accessible image URL.',
    inputSchema: {
      type: 'object',
      properties: {
        image_url: { type: 'string', description: 'Public image URL' },
        caption:   { type: 'string', description: 'Caption text including hashtags' },
        account:   { type: 'string', description: "Named account to post from (e.g. 'brand'). Omit to use the default account." },
      },
      required: ['image_url', 'caption'],
    },
  },
  // ── TikTok ────────────────────────────────────────────────────────────────
  {
    name: 'tiktok_post_video',
    description: 'Post a video to TikTok (PULL_FROM_URL). Until your app passes audit, posts land as private/self-only regardless of privacy_level.',
    inputSchema: {
      type: 'object',
      properties: {
        video_url:     { type: 'string', description: 'Public video URL (mp4/mov/webm, 3–600s, max 4GB)' },
        caption:       { type: 'string', description: 'Caption/title including hashtags' },
        privacy_level: {
          type: 'string',
          description: 'Visibility. Defaults to SELF_ONLY (required for unaudited apps).',
          enum: ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'],
        },
        account: { type: 'string', description: "Named account to post from (e.g. 'brand'). Omit to use the default account." },
      },
      required: ['video_url', 'caption'],
    },
  },
  {
    name: 'tiktok_check_publish_status',
    description: 'Check the async publish status of a TikTok video post.',
    inputSchema: {
      type: 'object',
      properties: {
        publish_id: { type: 'string', description: 'publish_id from tiktok_post_video' },
        account:    { type: 'string', description: "Named account (e.g. 'brand'). Must match the account used when posting." },
      },
      required: ['publish_id'],
    },
  },
  // ── Facebook ──────────────────────────────────────────────────────────────
  {
    name: 'facebook_post',
    description: 'Post to a Facebook Page feed. Optionally attach a public image URL to post as a photo.',
    inputSchema: {
      type: 'object',
      properties: {
        message:   { type: 'string', description: 'Post text / photo caption' },
        image_url: { type: 'string', description: 'Optional public image URL' },
        account:   { type: 'string', description: "Named account to post from (e.g. 'brand'). Omit to use the default account." },
      },
      required: ['message'],
    },
  },
  // ── Threads ───────────────────────────────────────────────────────────────
  {
    name: 'threads_post',
    description: 'Post text (optionally with an image) to Threads.',
    inputSchema: {
      type: 'object',
      properties: {
        text:      { type: 'string', description: 'Post text (max 500 chars)' },
        image_url: { type: 'string', description: 'Optional public image URL' },
        account:   { type: 'string', description: "Named account to post from (e.g. 'brand'). Omit to use the default account." },
      },
      required: ['text'],
    },
  },
  // ── Bluesky ───────────────────────────────────────────────────────────────
  {
    name: 'bluesky_post',
    description: 'Post text to Bluesky via the AT Protocol. No OAuth — just an app password.',
    inputSchema: {
      type: 'object',
      properties: {
        text:    { type: 'string', description: 'Post text (max 300 graphemes)' },
        account: { type: 'string', description: "Named account to post from (e.g. 'brand'). Omit to use the default account." },
      },
      required: ['text'],
    },
  },
  // ── Queue ─────────────────────────────────────────────────────────────────
  {
    name: 'queue_add',
    description: 'Add a post to the content queue. Optionally schedule it for a future ISO 8601 timestamp.',
    inputSchema: {
      type: 'object',
      properties: {
        platform:     { type: 'string', description: 'Target platform: x, instagram, tiktok, facebook, threads, bluesky', enum: ['x', 'instagram', 'tiktok', 'facebook', 'threads', 'bluesky'] },
        content:      { type: 'object', description: 'Platform-specific content fields (same as the direct posting tools)' },
        scheduled_at: { type: 'string', description: 'Optional ISO 8601 datetime to schedule publishing' },
        account:      { type: 'string', description: "Named account to post from (e.g. 'brand'). Omit to use the default account." },
      },
      required: ['platform', 'content'],
    },
  },
  {
    name: 'queue_list',
    description: 'List queued posts. Optionally filter by status or platform.',
    inputSchema: {
      type: 'object',
      properties: {
        status:   { type: 'string', description: 'Filter by status: pending, dispatched, published, failed', enum: ['pending', 'dispatched', 'published', 'failed'] },
        platform: { type: 'string', description: 'Filter by platform', enum: ['x', 'instagram', 'tiktok', 'facebook', 'threads', 'bluesky'] },
      },
    },
  },
  {
    name: 'queue_update',
    description: 'Update a queue item — change its content, scheduled_at, or status.',
    inputSchema: {
      type: 'object',
      properties: {
        id:      { type: 'string', description: 'Queue item ID' },
        updates: { type: 'object', description: 'Fields to update (content, scheduled_at, status)' },
      },
      required: ['id', 'updates'],
    },
  },
  {
    name: 'queue_remove',
    description: 'Remove a post from the queue.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Queue item ID' } },
      required: ['id'],
    },
  },
  {
    name: 'queue_dispatch',
    description: 'Immediately publish a queued post, regardless of its scheduled_at time.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Queue item ID' } },
      required: ['id'],
    },
  },
  // ── Media ─────────────────────────────────────────────────────────────────
  {
    name: 'media_compose',
    description: 'Render a branded image from a template using local sharp compositing (no external service). Returns a public URL after auto-uploading. Templates: square-dark (1080×1080), story-dark (1080×1920), banner-wide (1200×628).',
    inputSchema: {
      type: 'object',
      properties: {
        template:    { type: 'string', description: 'Template ID. One of: square-dark, story-dark, banner-wide.', enum: ['square-dark', 'story-dark', 'banner-wide'] },
        headline:    { type: 'string', description: 'Main headline text. Auto-wrapped to two lines.' },
        subtext:     { type: 'string', description: 'Secondary text line below the headline.' },
        bg_color:    { type: 'string', description: 'Background hex color. Default: #05091e' },
        accent:      { type: 'string', description: 'Accent hex color for bar and subtext. Default: #1df7ed' },
        bg_image_url:{ type: 'string', description: 'Optional public URL of a backdrop image. Composited behind the text panel.' },
        provider:    { type: 'string', description: 'CDN provider for the upload. Auto-selected if omitted.', enum: ['cloudinary', 'imgbb'] },
        account:     { type: 'string', description: "Named account for CDN credentials (e.g. 'brand')." },
      },
      required: ['template', 'headline'],
    },
  },
  {
    name: 'media_upload',
    description: 'Upload a local image or video file to a CDN and get back a public URL. Use this before posting to Instagram (requires image URL) or TikTok (requires video URL). Supported providers: cloudinary (images + videos), imgbb (images only). Provider is auto-selected from available credentials.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Absolute local path to the image or video file' },
        provider:  { type: 'string', description: 'CDN provider to use. Omit to auto-select from configured credentials.', enum: ['cloudinary', 'imgbb'] },
        account:   { type: 'string', description: "Named account (e.g. 'brand'). Resolves CLOUDINARY_*__BRAND or IMGBB_API_KEY__BRAND." },
      },
      required: ['file_path'],
    },
  },
];

// ─── Dispatcher ───────────────────────────────────────────────────────────

async function publish(platform, content, account = '') {
  switch (platform) {
    case 'x': {
      if (content.tweets) return queue_fmt_thread(await x.postThread(content.tweets, account));
      return `Tweet posted!\nURL: ${(await x.postSingleTweet(content.text, account)).url}`;
    }
    case 'instagram': {
      const r = await instagram.post(content.image_url, content.caption, account);
      return `Instagram post published! Media ID: ${r.id}`;
    }
    case 'tiktok': {
      const r = await tiktok.postVideo(content.video_url, content.caption, content.privacy_level, account);
      return `TikTok submitted! Publish ID: ${r.publish_id}\nUse tiktok_check_publish_status to confirm.`;
    }
    case 'facebook': {
      const r = await facebook.post(content.message, content.image_url, account);
      return `Facebook post published! ID: ${r.post_id || r.id}`;
    }
    case 'threads': {
      const r = await threads.post(content.text, content.image_url, account);
      return `Threads post published! ID: ${r.id}`;
    }
    case 'bluesky': {
      const r = await bluesky.post(content.text, account);
      const postId = r.uri.split('/').pop();
      return `Bluesky post published!\nURI: ${r.uri}\nView: https://bsky.app/profile/${r.identifier}/post/${postId}`;
    }
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

function queue_fmt_thread(r) {
  return `Thread posted! ${r.count} tweets.\nFirst: ${r.firstUrl}`;
}

function ok(text) {
  return { content: [{ type: 'text', text }] };
}

function err(e) {
  return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
}

// ─── Server ───────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'spmc', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      // ── Direct publishing ───────────────────────────────────────────────
      case 'x_post_tweet': {
        const r = await x.postSingleTweet(args.text, args.account ?? '');
        return ok(`Tweet posted!\nID: ${r.id}\nURL: ${r.url}`);
      }
      case 'x_post_thread': {
        const r = await x.postThread(args.tweets, args.account ?? '');
        return ok(`Thread posted! ${r.count} tweets.\nFirst: ${r.firstUrl}`);
      }
      case 'instagram_post': {
        const r = await instagram.post(args.image_url, args.caption, args.account ?? '');
        return ok(`Instagram post published! Media ID: ${r.id}`);
      }
      case 'tiktok_post_video': {
        const r = await tiktok.postVideo(args.video_url, args.caption, args.privacy_level, args.account ?? '');
        return ok(`TikTok submitted! Publish ID: ${r.publish_id}\nUse tiktok_check_publish_status to confirm.\nNote: unaudited apps post as private/self-only regardless of privacy_level.`);
      }
      case 'tiktok_check_publish_status': {
        const r = await tiktok.checkStatus(args.publish_id, args.account ?? '');
        return ok(`TikTok publish status: ${r.status}${r.fail_reason ? ` (reason: ${r.fail_reason})` : ''}`);
      }
      case 'facebook_post': {
        const r = await facebook.post(args.message, args.image_url, args.account ?? '');
        return ok(`Facebook post published! ID: ${r.post_id || r.id}`);
      }
      case 'threads_post': {
        const r = await threads.post(args.text, args.image_url, args.account ?? '');
        return ok(`Threads post published! ID: ${r.id}`);
      }
      case 'bluesky_post': {
        const r = await bluesky.post(args.text, args.account ?? '');
        const postId = r.uri.split('/').pop();
        return ok(`Bluesky post published!\nURI: ${r.uri}\nView: https://bsky.app/profile/${r.identifier}/post/${postId}`);
      }

      // ── Queue ────────────────────────────────────────────────────────────
      case 'queue_add': {
        const item = queue.add(args.platform, args.content, args.scheduled_at ?? null, args.account ?? '');
        return ok(`Queued! ID: ${item.id}\nPlatform: ${item.platform}\nStatus: ${item.status}${item.account ? `\nAccount: ${item.account}` : ''}${item.scheduled_at ? `\nScheduled: ${item.scheduled_at}` : ''}`);
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
        queue.update(args.id, { status: 'dispatched' });
        try {
          const msg = await publish(item.platform, item.content, item.account ?? '');
          queue.update(args.id, { status: 'published', published_at: new Date().toISOString(), result: msg });
          return ok(`Dispatched!\n${msg}`);
        } catch (e) {
          queue.update(args.id, { status: 'failed', error: e.message });
          throw e;
        }
      }

      // ── Media ──────────────────────────────────────────────────────────────
      case 'media_compose': {
        const result = await compose.compose(args.template, {
          headline:     args.headline,
          subtext:      args.subtext      ?? '',
          bg_color:     args.bg_color     ?? '',
          accent:       args.accent       ?? '',
          bg_image_url: args.bg_image_url ?? '',
        }, { provider: args.provider ?? null, account: args.account ?? '' });
        return ok(
          `Composed ${result.template} (${result.dimensions.width}×${result.dimensions.height})\n`
          + `Uploaded to ${result.provider}!\nPublic URL: ${result.url}`
          + (result.public_id ? `\nPublic ID: ${result.public_id}` : '')
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
