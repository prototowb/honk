// Tool schemas — single source of truth for the MCP tool surface.
//
// Consumed by index.js (served over ListTools at runtime) AND by the build
// generator (build/generate.mjs) to emit skill docs, README tables, and the
// agent pack. Adding or changing a tool here is the one edit; downstream docs
// are generated from this array + lib/specs.js — never hand-maintained.

const DRY_RUN_PROP = { type: 'boolean', description: 'If true, validate and preview the post without publishing. Records a dry_run audit entry.' };

export const TOOLS = [
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
    description: 'Post to Instagram. Provide image_url for a single image, OR image_urls (2–10 public URLs) for a carousel. Requires publicly accessible image URL(s).',
    inputSchema: {
      type: 'object',
      properties: {
        image_url:  { type: 'string', description: 'Public image URL (single-image post)' },
        image_urls: { type: 'array', items: { type: 'string' }, description: 'Ordered 2–10 public image URLs (carousel post). Use instead of image_url.' },
        caption:    { type: 'string', description: 'Caption text including hashtags' },
        account:    { type: 'string', description: "Named account to post from (e.g. 'brand'). Omit to use the default account." },
        dry_run:    DRY_RUN_PROP,
      },
      required: ['caption'],
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
    name: 'account_info',
    description: 'Fetch the connected account profile (handle, display name, avatar URL) for a platform. Read-only — confirms which account is wired up and supplies branding assets. Supported: instagram, facebook (Graph API).',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', description: 'Platform to query', enum: ['instagram', 'facebook'] },
        account:  { type: 'string', description: "Named account (e.g. 'brand'). Omit for the default account." },
      },
      required: ['platform'],
    },
  },
  {
    name: 'brand_voice',
    description: 'Get or set the brand voice profile — a persistent brand kit (tone, audience, hashtag sets, emoji/banned-word policy, CTA library, default UTM rules) that the content skills read so drafts match your voice without re-specifying it each time. Per account (omit account for the default). Content config, not secrets. Call with action:"get" first to see the current profile and its shape.',
    inputSchema: {
      type: 'object',
      properties: {
        action:  { type: 'string', description: 'get (default) reads the profile; set writes one; clear removes it.', enum: ['get', 'set', 'clear'] },
        profile: { type: 'object', description: 'For action:set — the fields to write, deep-merged into the stored profile (nested objects merge; arrays/scalars replace). Shape: { voice:{tone,audience,register,emoji_policy,banned_words[],do[],dont[]}, hashtags:{default[],sets{}}, cta[], links:{utm_defaults{},shortener}, platforms{}, notes }.' },
        replace: { type: 'boolean', description: 'For action:set — overwrite the whole profile instead of deep-merging.' },
        account: { type: 'string', description: "Named account (e.g. 'brand'). Omit for the default profile." },
      },
    },
  },
  {
    name: 'link_tag',
    description: 'Add UTM/campaign query params to a URL for click attribution. Merges the brand kit\'s links.utm_defaults under your overrides; a value containing {platform} is substituted with the given platform. Returns the tagged URL. Deterministic, credential-free.',
    inputSchema: {
      type: 'object',
      properties: {
        url:      { type: 'string', description: 'The URL to tag.' },
        params:   { type: 'object', description: 'Query params to add/override, e.g. { utm_campaign: "launch", utm_medium: "social" }. Merged over the brand kit defaults.' },
        platform: { type: 'string', description: 'Optional — substituted wherever a param value contains the literal {platform} (e.g. a utm_source default of "{platform}").' },
        account:  { type: 'string', description: "Named account whose brand-kit UTM defaults to use (e.g. 'brand'). Omit for the default." },
      },
      required: ['url'],
    },
  },
  {
    name: 'duplicate_check',
    description: 'Check whether identical content was already published to a platform recently — matches the content hash against the audit log of successful publishes. Returns the prior publish if found. Run before publishing to avoid an accidental repost (there is no un-publish).',
    inputSchema: {
      type: 'object',
      properties: {
        platform:     { type: 'string', description: 'Target platform', enum: ['x', 'instagram', 'tiktok', 'facebook', 'threads', 'bluesky'] },
        content:      { type: 'object', description: 'Platform-specific content fields (same shape as the posting tool)' },
        within_hours: { type: 'number', description: 'Lookback window in hours. Default 168 (7 days).' },
      },
      required: ['platform', 'content'],
    },
  },
  {
    name: 'best_time',
    description: 'Suggest the best times to post on a platform, ranked, in audience-local time with a short rationale per window. Credential-free. Uses research-backed engagement windows as a baseline and will blend in the account\'s own analytics history once enough accrues. Schedule a suggestion via queue_add with an explicit timezone offset.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', description: 'Target platform', enum: ['x', 'instagram', 'tiktok', 'facebook', 'threads', 'bluesky'] },
        count:    { type: 'number', description: 'How many ranked windows to return. Default 3.' },
        account:  { type: 'string', description: "Named account (e.g. 'brand'). Omit for the default. Reserved for own-history refinement; does not change the baseline yet." },
      },
      required: ['platform'],
    },
  },
  {
    name: 'brief_schema',
    description: 'Return the per-run content-brief field schema — the single source for guided-mode intake and the future web-UI form. The brief is the per-run delta on top of the persistent brand kit (voice/audience/hashtags); this lists only what a run needs (angle, goal, platforms, schedule, references, constraints) with each field\'s type, required-ness, options, and which fields the brand kit pre-fills. Pass an account to annotate its brand-kit pre-fills. Use it to drive an optional guided intake instead of asking for everything at once.',
    inputSchema: {
      type: 'object',
      properties: {
        account: { type: 'string', description: 'Brand-kit account to resolve pre-filled defaults from (optional; omit for the default account).' },
      },
    },
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
    description: 'Validate and normalize a scheduled_at timestamp to canonical UTC ISO 8601. A timestamp without an explicit timezone is interpreted as the server\'s local time and flagged with a warning (it becomes ambiguous under hosted/multi-user deployment). Returns the normalized value and whether it is in the past.',
    inputSchema: {
      type: 'object',
      properties: {
        scheduled_at: { type: 'string', description: 'ISO 8601 datetime with explicit timezone, e.g. 2026-06-15T09:00:00-04:00 or 2026-06-15T13:00:00Z' },
      },
      required: ['scheduled_at'],
    },
  },
  // ── Observability ──────────────────────────────────────────────────────────
  {
    name: 'rate_limits',
    description: 'Show rate-limit responses (HTTP 429) observed per platform, tallied from publish errors. Observational only — does not yet gate sending.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'analytics_fetch',
    description: 'Fetch engagement metrics for a published post and store a timestamped snapshot. Supported: instagram, facebook, threads (Graph insights). Requires the platform post/media ID. NOTE: unverified against live APIs pending credential testing.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', description: 'Platform the post was published to', enum: ['instagram', 'facebook', 'threads'] },
        post_id:  { type: 'string', description: 'Platform post/media ID returned at publish time' },
        account:  { type: 'string', description: "Named account (e.g. 'brand'). Must match the publishing account." },
      },
      required: ['platform', 'post_id'],
    },
  },
  {
    name: 'analytics_report',
    description: 'Read stored engagement snapshots, most recent first. Filter by platform or post_id.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', description: 'Filter by platform' },
        post_id:  { type: 'string', description: 'Filter by post/media ID' },
        limit:    { type: 'number', description: 'Max snapshots to return. Default 50.' },
      },
    },
  },
  // ── Queue ─────────────────────────────────────────────────────────────────
  {
    name: 'queue_add',
    description: 'Add a post to the content queue. Optionally schedule it with scheduled_at (ISO 8601; include a timezone offset to be unambiguous — a naive time is read as server-local and warned). Content is validated; warnings are returned but do not block queuing.',
    inputSchema: {
      type: 'object',
      properties: {
        platform:     { type: 'string', description: 'Target platform: x, instagram, tiktok, facebook, threads, bluesky', enum: ['x', 'instagram', 'tiktok', 'facebook', 'threads', 'bluesky'] },
        content:      { type: 'object', description: 'Platform-specific content fields (same as the direct posting tools)' },
        scheduled_at: { type: 'string', description: 'Optional ISO 8601 datetime to schedule publishing. Prefer an explicit timezone (e.g. ...Z or -04:00); a naive time is interpreted as server-local.' },
        account:      { type: 'string', description: "Named account to post from (e.g. 'brand'). Omit to use the default account." },
        draft:        { type: 'boolean', description: 'Save as a draft (status "draft") — held for review and never auto-dispatched by the scheduler. Promote later with queue_update(status:"pending") or publish directly with queue_dispatch.' },
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
        status:   { type: 'string', description: 'Filter by status: draft, pending, dispatched, published, failed', enum: ['draft', 'pending', 'dispatched', 'published', 'failed'] },
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
    description: 'Render a branded image from a template using local sharp compositing (no external service). Returns a public URL after auto-uploading. Templates: square-dark (1080×1080), square-tall (1080×1350, IG 4:5 feed), story-dark (1080×1920), banner-wide (1200×628), square-news (1080×1080 branded carousel slide with wrapped body + handle/icon footer).',
    inputSchema: {
      type: 'object',
      properties: {
        template:    { type: 'string', description: 'Template ID. One of: square-dark, square-tall, story-dark, banner-wide, square-news.', enum: ['square-dark', 'square-tall', 'story-dark', 'banner-wide', 'square-news'] },
        headline:    { type: 'string', description: 'Main headline text. Auto-wrapped to two lines.' },
        subtext:     { type: 'string', description: 'Secondary/body text below the headline. Word-wrapped to multiple lines on square-news.' },
        bg_color:    { type: 'string', description: 'Background hex color. Default: #05091e' },
        accent:      { type: 'string', description: 'Accent hex color for bar and subtext. Default: #1df7ed' },
        bg_image_url:{ type: 'string', description: 'Optional public URL of a backdrop image. Composited behind the text panel.' },
        handle:      { type: 'string', description: 'Account handle for the footer (e.g. @brand). square-news only.' },
        icon_url:    { type: 'string', description: 'Public URL of an avatar/logo image rendered as a circular footer icon. square-news only.' },
        logo_url:    { type: 'string', description: 'Optional public URL of a logo stamped in the bottom-right corner of any template (scaled to ~12% width). Works across all templates — use the brand kit logo.' },
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
