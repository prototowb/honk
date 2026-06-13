import { Server }               from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import * as tiktok    from './adapters/tiktok.js';
import * as queue     from './queue/store.js';
import * as media     from './media/upload.js';
import * as compose   from './media/compose.js';

import { publishAudited }                 from './lib/dispatch.js';
import { validate, formatValidation }     from './lib/validate.js';
import { adapt, formatAdaptation }        from './lib/adapt.js';
import { report as configReport, formatReport } from './lib/config.js';
import { normalizeScheduledAt, isPast }   from './lib/schedule.js';
import { read as auditRead, record as auditRecord } from './lib/audit.js';
import { hashContent }                    from './lib/hash.js';

// ─── Tool definitions ─────────────────────────────────────────────────────

const DRY_RUN_PROP = { type: 'boolean', description: 'If true, validate and preview the post without publishing. Records a dry_run audit entry.' };

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
        dry_run: DRY_RUN_PROP,
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
        dry_run: DRY_RUN_PROP,
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
        dry_run:   DRY_RUN_PROP,
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
        dry_run: DRY_RUN_PROP,
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
        dry_run:   DRY_RUN_PROP,
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
        dry_run:   DRY_RUN_PROP,
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
        dry_run: DRY_RUN_PROP,
      },
      required: ['text'],
    },
  },
  // ── Content intelligence ───────────────────────────────────────────────────
  {
    name: 'content_validate',
    description: 'Validate a post payload against a platform\'s rules (length, required fields, media) without publishing. Returns errors that would block publishing and warnings. Use before queuing or posting.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', description: 'Target platform', enum: ['x', 'instagram', 'tiktok', 'facebook', 'threads', 'bluesky'] },
        content:  { type: 'object', description: 'Platform-specific content fields (same shape as the posting tools)' },
      },
      required: ['platform', 'content'],
    },
  },
  {
    name: 'content_adapt',
    description: 'Fit one source text to multiple platforms\' hard limits: auto-splits a long post into an X thread, grapheme-truncates for Bluesky, etc. Returns ready-to-post content per platform plus warnings. This handles the deterministic length-fitting only — rewrite tone/hashtags yourself before posting.',
    inputSchema: {
      type: 'object',
      properties: {
        text:      { type: 'string', description: 'Source text to adapt' },
        platforms: { type: 'array', items: { type: 'string', enum: ['x', 'instagram', 'tiktok', 'facebook', 'threads', 'bluesky'] }, description: 'Target platforms. Omit for all six.' },
      },
      required: ['text'],
    },
  },
  {
    name: 'config_doctor',
    description: 'Report which platforms and named accounts have credentials configured (by env-var presence only — never reveals values), plus media providers. Use to check setup before publishing.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'audit_log',
    description: 'Read the publish audit trail: every publish, failure, and dry-run with timestamp, platform, account, content hash, and result. Filter by platform/status/source.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', description: 'Filter by platform' },
        status:   { type: 'string', description: 'Filter by status', enum: ['published', 'failed', 'dry_run'] },
        source:   { type: 'string', description: 'Filter by source', enum: ['direct', 'queue', 'scheduler'] },
        limit:    { type: 'number', description: 'Max entries to return (most recent first). Default 50.' },
      },
    },
  },
  {
    name: 'schedule_check',
    description: 'Validate and normalize a scheduled_at timestamp to canonical UTC ISO 8601. Rejects timestamps without an explicit timezone (which would fire at the wrong instant). Returns the normalized value and whether it is in the past.',
    inputSchema: {
      type: 'object',
      properties: {
        scheduled_at: { type: 'string', description: 'ISO 8601 datetime with explicit timezone, e.g. 2026-06-15T09:00:00-04:00 or 2026-06-15T13:00:00Z' },
      },
      required: ['scheduled_at'],
    },
  },
  // ── Queue ─────────────────────────────────────────────────────────────────
  {
    name: 'queue_add',
    description: 'Add a post to the content queue. Optionally schedule it with scheduled_at (ISO 8601 with an explicit timezone). Content is validated; warnings are returned but do not block queuing.',
    inputSchema: {
      type: 'object',
      properties: {
        platform:     { type: 'string', description: 'Target platform: x, instagram, tiktok, facebook, threads, bluesky', enum: ['x', 'instagram', 'tiktok', 'facebook', 'threads', 'bluesky'] },
        content:      { type: 'object', description: 'Platform-specific content fields (same as the direct posting tools)' },
        scheduled_at: { type: 'string', description: 'Optional ISO 8601 datetime with timezone (e.g. ...Z or -04:00) to schedule publishing' },
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
      properties: {
        id:      { type: 'string', description: 'Queue item ID' },
        dry_run: DRY_RUN_PROP,
      },
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

// ─── Helpers ──────────────────────────────────────────────────────────────

function ok(text) {
  return { content: [{ type: 'text', text }] };
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
    return `DRY RUN — ${v.label} payload is valid; nothing was published.${warn}`;
  }

  const { summary } = await publishAudited(platform, content, account, { source: 'direct' });
  return summary + warn;
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
      case 'x_post_tweet':
        return ok(await doPublish('x', { text: args.text }, args.account ?? '', args.dry_run));
      case 'x_post_thread':
        return ok(await doPublish('x', { tweets: args.tweets }, args.account ?? '', args.dry_run));
      case 'instagram_post':
        return ok(await doPublish('instagram', { image_url: args.image_url, caption: args.caption }, args.account ?? '', args.dry_run));
      case 'tiktok_post_video':
        return ok(await doPublish('tiktok', { video_url: args.video_url, caption: args.caption, privacy_level: args.privacy_level }, args.account ?? '', args.dry_run));
      case 'tiktok_check_publish_status': {
        const r = await tiktok.checkStatus(args.publish_id, args.account ?? '');
        return ok(`TikTok publish status: ${r.status}${r.fail_reason ? ` (reason: ${r.fail_reason})` : ''}`);
      }
      case 'facebook_post':
        return ok(await doPublish('facebook', { message: args.message, image_url: args.image_url }, args.account ?? '', args.dry_run));
      case 'threads_post':
        return ok(await doPublish('threads', { text: args.text, image_url: args.image_url }, args.account ?? '', args.dry_run));
      case 'bluesky_post':
        return ok(await doPublish('bluesky', { text: args.text }, args.account ?? '', args.dry_run));

      // ── Content intelligence ──────────────────────────────────────────────
      case 'content_validate':
        return ok(formatValidation(validate(args.platform, args.content)));
      case 'content_adapt':
        return ok(formatAdaptation(adapt(args.text, args.platforms)));
      case 'config_doctor':
        return ok(formatReport(configReport()));
      case 'audit_log': {
        const entries = auditRead({ platform: args.platform, status: args.status, source: args.source, limit: args.limit });
        if (entries.length === 0) return ok('No audit entries yet.');
        const lines = entries.map(e =>
          `${e.ts} | ${e.status.padEnd(9)} | ${e.platform}${e.account ? `/${e.account}` : ''} | ${e.source} | #${e.content_hash}`
          + (e.error ? `\n    error: ${e.error}` : '')
        );
        return ok(`${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} (most recent first):\n${lines.join('\n')}`);
      }
      case 'schedule_check': {
        const normalized = normalizeScheduledAt(args.scheduled_at);
        return ok(`Normalized: ${normalized}\nIn the past: ${isPast(normalized) ? 'yes — would dispatch on next scheduler tick' : 'no'}`);
      }

      // ── Queue ────────────────────────────────────────────────────────────
      case 'queue_add': {
        const scheduledAt = normalizeScheduledAt(args.scheduled_at ?? null);
        const v = validate(args.platform, args.content);
        const item = queue.add(args.platform, args.content, scheduledAt, args.account ?? '');
        const warn = v.ok
          ? (v.warnings.length ? `\n⚠ ${v.warnings.join('; ')}` : '')
          : `\n⚠ Content has validation errors (queued anyway):\n` + v.errors.map(e => `  - ${e}`).join('\n');
        const past = scheduledAt && isPast(scheduledAt) ? `\n⚠ scheduled_at is in the past — will dispatch on next scheduler tick.` : '';
        return ok(`Queued! ID: ${item.id}\nPlatform: ${item.platform}\nStatus: ${item.status}${item.account ? `\nAccount: ${item.account}` : ''}${item.scheduled_at ? `\nScheduled: ${item.scheduled_at}` : ''}${past}${warn}`);
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
