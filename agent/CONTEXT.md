# SPMC — Agent Operational Briefing

> Self-contained. Read once, then use tools. No external files required to get operational.

## What SPMC Is

Social Publishing Mission Control. An MCP server that publishes content to X, Instagram, TikTok, Facebook, Threads, and Bluesky. No UI — you are the interface. All publishing goes through MCP tools; never call platform APIs directly.

## How to Connect

Transport: **stdio MCP**

```
command: node
args:    ["/absolute/path/to/spmc-server/run.js"]
```

`run.js` = MCP server only. `start.js` = MCP server + scheduler daemon (polls queue every 60s, auto-dispatches items where `scheduled_at <= now` and `status === pending`). If you need scheduled posts to fire automatically, the host must launch `start.js` instead of `run.js`. If launched via `run.js`, queue items with `scheduled_at` will not auto-dispatch — use `queue_dispatch` manually.

## Credentials

Primary location (used by `run.js`, loaded at startup):
```
%USERPROFILE%\.claude\spmc.env
```
Format: `KEY=value`, one per line. Fallback: `.env` next to `run.js`. If neither is present, server inherits from environment. Scheduler logs to `%USERPROFILE%\.claude\spmc-scheduler.log`.

## MCP Tools

<!-- gen:tools:start -->
_30 tools — generated from `lib/tools.js` + `lib/specs.js`. Do not edit between these markers; run `npm run build`._

### Publishing & status

| Tool | Required | Optional | Platform limit | Description |
|------|----------|----------|----------------|-------------|
| `x_post_tweet` | `text` (string) | `account` (string), `dry_run` (boolean), `sponsored` (boolean) | 280 chars | Post a single tweet to X (Twitter). Max 280 characters. |
| `x_post_thread` | `tweets` (array) | `account` (string), `dry_run` (boolean), `sponsored` (boolean) | — | Post a thread of tweets to X. Each array item is one tweet, chained as replies. |
| `instagram_post` | `caption` (string) | `image_url` (string), `image_urls` (array), `alt_text` (string), `alt_texts` (array), `first_comment` (string), `account` (string), `dry_run` (boolean), `sponsored` (boolean) | 2200 chars | Post to Instagram. Provide image_url for a single image, OR image_urls (2–10 public URLs) for a carousel. Requires publicly accessible image URL(s). |
| `tiktok_post_video` | `video_url` (string), `caption` (string) | `privacy_level` (string), `account` (string), `dry_run` (boolean), `sponsored` (boolean) | 2200 chars | Post a video to TikTok (PULL_FROM_URL). Until your app passes audit, posts land as private/self-only regardless of privacy_level. |
| `tiktok_check_publish_status` | `publish_id` (string) | `account` (string) | — | Check the async publish status of a TikTok video post. |
| `facebook_post` | `message` (string) | `image_url` (string), `alt_text` (string), `first_comment` (string), `account` (string), `dry_run` (boolean), `sponsored` (boolean) | 63206 chars | Post to a Facebook Page feed. Optionally attach a public image URL to post as a photo. |
| `threads_post` | `text` (string) | `image_url` (string), `alt_text` (string), `account` (string), `dry_run` (boolean), `sponsored` (boolean) | 500 chars | Post text (optionally with an image) to Threads. |
| `bluesky_post` | `text` (string) | `account` (string), `dry_run` (boolean), `sponsored` (boolean) | 300 graphemes | Post text to Bluesky via the AT Protocol. No OAuth — just an app password. |

### Content intelligence

| Tool | Required | Optional | Platform limit | Description |
|------|----------|----------|----------------|-------------|
| `content_validate` | `platform` (string), `content` (object) | `account` (string), `sponsored` (boolean) | — | Validate a post payload against a platform's rules (length, required fields, media) AND the brand kit's content policy (required disclosures, banned-topic reminders) without publishing. Returns blocking errors, warnings, and policy notes. Use before queuing or posting. |
| `content_adapt` | `text` (string) | `platforms` (array) | — | Fit one source text to multiple platforms' hard limits: auto-splits a long post into an X thread, grapheme-truncates for Bluesky, etc. Returns ready-to-post content per platform plus warnings. This handles the deterministic length-fitting only — rewrite tone/hashtags yourself before posting. |
| `config_doctor` | — | — | — | Report which platforms and named accounts have credentials configured (by env-var presence only — never reveals values), plus media providers. Use to check setup before publishing. |
| `account_info` | `platform` (string) | `account` (string), `seed_brand_kit` (boolean) | — | Fetch the connected account profile (handle, display name, avatar URL) for a platform. Read-only — confirms which account is wired up and supplies branding assets. Supported: instagram, facebook (Graph API). Pass seed_brand_kit:true to merge the fetched handle + avatar URL into the active brand account's visual block. |
| `brand_voice` | — | `action` (string), `profile` (object), `replace` (boolean), `account` (string), `to` (string), `platform` (string), `audience` (string) | — | Get or set the brand kit, and manage multiple brand accounts — a persistent profile (voice: tone, audience, hashtag sets, emoji/banned-word policy, CTA library, UTM rules; plus a visual identity block: accent/bg/surface/heading/body colors, logo, icon, handle, default template; plus per-platform voice deltas; plus named audience segments; plus a content policy: banned topics, required disclosures, auto-publish) that the content skills read so drafts match your voice, composed images match your look, and posts respect your guardrails without re-specifying it each time. Per account (omit account for the default). Content config, not secrets. Call with action:"get" first to see the current profile; if it is empty, offer guided setup (see brand_schema / the brand-setup skill). Pass a platform and/or audience with action:"get" to see the effective voice resolved for it (base merged with audience-segment, then per-platform, overrides — precedence base ▸ audience ▸ platform). Multi-brand: action:"list" enumerates accounts (brand profiles + credentialed accounts) and marks the active one; action:"use" sets the active account (reads default to it — get/brand_schema — but publishing stays explicit, so always confirm the brand before posting); action:"clone" copies a profile to a new account key (to:) as a starting point. |
| `link_tag` | `url` (string) | `params` (object), `platform` (string), `account` (string) | — | Add UTM/campaign query params to a URL for click attribution. Merges the brand kit's links.utm_defaults under your overrides; a value containing {platform} is substituted with the given platform. Returns the tagged URL. Deterministic, credential-free. |
| `duplicate_check` | `platform` (string), `content` (object) | `within_hours` (number) | — | Check whether identical content was already published to a platform recently — matches the content hash against the audit log of successful publishes. Returns the prior publish if found. Run before publishing to avoid an accidental repost (there is no un-publish). |
| `best_time` | `platform` (string) | `count` (number), `account` (string) | — | Suggest the best times to post on a platform, ranked, in audience-local time with a short rationale per window. Credential-free. Uses research-backed engagement windows as a baseline and will blend in the account's own analytics history once enough accrues. Schedule a suggestion via queue_add with an explicit timezone offset. |
| `brief_schema` | — | `account` (string) | — | Return the per-run content-brief field schema — the single source for guided-mode intake and the future web-UI form. The brief is the per-run delta on top of the persistent brand kit (voice/audience/hashtags); this lists only what a run needs (angle, goal, platforms, schedule, references, constraints) with each field's type, required-ness, options, and which fields the brand kit pre-fills. Pass an account to annotate its brand-kit pre-fills. Use it to drive an optional guided intake instead of asking for everything at once. |
| `brand_schema` | — | `account` (string) | — | Return the brand-kit field schema with the current values for an account — the single source for guided brand setup (the brand-setup skill) and the future web-UI settings form. Lists the persistent fields a brand kit holds (voice tone/audience, visual identity: accent/bg/surface/heading/body colors + logo/icon/handle/default-template, hashtags, CTAs, notes) grouped, with type/options/help, which are recommended, and what is already set. Call it to drive guided setup (collect the empty recommended fields one at a time) or to show a brand-settings overview. Writes go through brand_voice(action:"set"). The companion to brief_schema (per-run) — this is the persistent layer. |
| `audit_log` | — | `platform` (string), `status` (string), `source` (string), `limit` (number) | — | Read the publish audit trail: every publish, failure, and dry-run with timestamp, platform, account, content hash, and result. Filter by platform/status/source. |
| `schedule_check` | `scheduled_at` (string) | — | — | Validate and normalize a scheduled_at timestamp to canonical UTC ISO 8601. A timestamp without an explicit timezone is interpreted as the server's local time and flagged with a warning (it becomes ambiguous under hosted/multi-user deployment). Returns the normalized value and whether it is in the past. |

### Observability

| Tool | Required | Optional | Platform limit | Description |
|------|----------|----------|----------------|-------------|
| `rate_limits` | — | — | — | Show rate-limit responses (HTTP 429) observed per platform, tallied from publish errors. Observational only — does not yet gate sending. |
| `analytics_fetch` | `platform` (string), `post_id` (string) | `account` (string) | — | Fetch engagement metrics for a published post and store a timestamped snapshot. Supported: instagram, facebook, threads (Graph insights). Requires the platform post/media ID. NOTE: unverified against live APIs pending credential testing. |
| `analytics_report` | — | `platform` (string), `post_id` (string), `limit` (number) | — | Read stored engagement snapshots, most recent first. Filter by platform or post_id. |

### Queue

| Tool | Required | Optional | Platform limit | Description |
|------|----------|----------|----------------|-------------|
| `queue_add` | `platform` (string), `content` (object) | `scheduled_at` (string), `account` (string), `draft` (boolean) | — | Add a post to the content queue. Optionally schedule it with scheduled_at (ISO 8601; include a timezone offset to be unambiguous — a naive time is read as server-local and warned). Content is validated; warnings are returned but do not block queuing. |
| `queue_list` | — | `status` (string), `platform` (string) | — | List queued posts. Optionally filter by status or platform. |
| `queue_update` | `id` (string), `updates` (object) | — | — | Update a queue item — change its content, scheduled_at, or status. |
| `queue_remove` | `id` (string) | — | — | Remove a post from the queue. |
| `queue_dispatch` | `id` (string) | `dry_run` (boolean) | — | Immediately publish a queued post, regardless of its scheduled_at time. |

### Media

| Tool | Required | Optional | Platform limit | Description |
|------|----------|----------|----------------|-------------|
| `media_compose` | `headline` (string) | `template` (string), `subtext` (string), `kicker` (string), `bg_color` (string), `surface` (string), `accent` (string), `heading_color` (string), `body_color` (string), `bg_image_url` (string), `handle` (string), `icon_url` (string), `logo_url` (string), `provider` (string), `account` (string) | — | Render a branded image from a template using local sharp compositing (no external service). Returns a public URL after auto-uploading. All five templates share one editorial design system (brand row, hero headline on a layered surface, body, accent footer). Templates: square-dark (1080×1080 feed), square-tall (1080×1350, IG 4:5 feed — highest reach), story-dark (1080×1920 story, safe-zone aware), banner-wide (1200×628 link/OG card), square-news (1080×1080 carousel slide with circular icon footer). Identity + colors (accent/bg/surface/heading/body colors, logo, icon, handle, default template) default from the brand kit's visual block (brand_voice) — set them once instead of per call; explicit args override. Heading/body colors not set anywhere are derived from the background for legibility. |
| `media_upload` | `file_path` (string) | `provider` (string), `account` (string) | — | Upload a local image or video file to a CDN and get back a public URL. Use this before posting to Instagram (requires image URL) or TikTok (requires video URL). Supported providers: cloudinary (images + videos), imgbb (images only). Provider is auto-selected from available credentials. |

<!-- gen:tools:end -->

**Operating notes:**

- Every publishing tool (and `queue_dispatch`) accepts **`dry_run` (bool)** — validates the payload and previews routing **without sending**, and records a `dry_run` audit entry. Use it to rehearse a post before going live.
- Content-intelligence tools are **credential-free** — use them to prepare and check content before publishing.
- Observability tools (`rate_limits`, `analytics_*`) are **UNVERIFIED against live APIs** pending credential testing. `analytics_fetch` / `analytics_report` cover Instagram, Facebook, Threads only (X/TikTok/Bluesky not supported yet).
- Queue status lifecycle: `pending` → `dispatched` → `published` | `failed`. `queue_dispatch` transitions status automatically.
- Platform enum: `x` `instagram` `tiktok` `facebook` `threads` `bluesky`

See **Platform-Specific Gotchas**, **Return Values by Platform**, and **Queue Content Format by Platform** below for the per-platform detail that isn't in the tool schemas.

## Agent Integration Contract

1. **Always confirm post content with the user before calling any publishing tool.** Show the exact text/URL/caption. Wait for approval.
2. **Never call platform APIs directly.** All publishing must go through SPMC MCP tools.
3. **After publishing, report back:** platform, post URL (where returned), returned ID, timestamp, and any caveats.
4. **Update queue item status after dispatch.** If you used `queue_dispatch`, the tool handles the status transition. If you used a direct publishing tool on a tracked queue item, call `queue_update` to mark it `published`.

### Recommended pre-publish flow

1. Cross-posting one idea? `content_adapt(text, platforms)` to get per-platform drafts fitted to limits — then rewrite tone/hashtags per channel.
2. `content_validate(platform, content)` (or call the publish tool with `dry_run: true`) to confirm the payload passes before going live.
3. Unsure credentials are set? `config_doctor` first — it tells you which platforms are publish-ready without revealing secrets.
4. Publish (after user approval), then `audit_log` is the record of what was sent.

## Platform-Specific Gotchas

| Platform | Key constraints |
|----------|----------------|
| **X** | 280 chars hard limit; URLs always 23 chars; emoji above U+FFFF count as 2; threads chain as replies; no silent truncation |
| **Instagram** | Image URL must be publicly reachable (no localhost, no signed URLs); returns Media ID, not a public URL |
| **TikTok** | Post is async — `tiktok_post_video` returns `publish_id`, not a final status; call `tiktok_check_publish_status` to confirm. Until app passes TikTok audit, `privacy_level` is forced to `SELF_ONLY` regardless of what you pass |
| **Facebook** | Posts to a Page (not personal profile); requires Page access token in env |
| **Threads** | 500 chars; image optional; returns ID only (no direct post URL from API) |
| **Bluesky** | 300 graphemes (not bytes); no OAuth — uses `BLUESKY_IDENTIFIER` + `BLUESKY_APP_PASSWORD`; returns URI + constructable URL `https://bsky.app/profile/<identifier>/post/<id>` |

## Return Values by Platform

| Platform | Publish result | URL available? |
|----------|---------------|----------------|
| X (tweet) | post URL | Yes — `https://x.com/...` |
| X (thread) | first tweet URL | Yes |
| Instagram | Media ID | No direct post URL |
| TikTok | `publish_id` | No — check status separately |
| Facebook | post ID | No direct post URL |
| Threads | post ID | No direct post URL |
| Bluesky | URI + constructable URL | Yes |

## Queue Content Format by Platform

```
x tweet:     content: { text: "..." }
x thread:    content: { tweets: ["1/n ...", "2/n ..."] }
instagram:   content: { image_url: "https://...", caption: "..." }
tiktok:      content: { video_url: "https://...", caption: "...", privacy_level?: "SELF_ONLY" }
facebook:    content: { message: "...", image_url?: "https://..." }
threads:     content: { text: "...", image_url?: "https://..." }
bluesky:     content: { text: "..." }
```
