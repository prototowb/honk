# SPMC — Social Publishing Mission Control

AI-native MCP server for publishing to X, Instagram, TikTok, Facebook, Threads, and Bluesky.  
The agent is the interface — no UI required.

**MCP tools:** direct posting · content validation & cross-platform adaptation · dry-run previews · audit log · content queue · scheduler · media pipeline (compose + CDN upload) · config + rate-limit + analytics introspection

---

## Credentials — do this first

All agent surfaces load credentials from the same file. Set it up once and every integration works:

```
Windows:     %USERPROFILE%\.claude\spmc.env
macOS/Linux: ~/.claude/spmc.env
```

Copy `.env.example` to that path and fill in your keys. This file survives reinstalls and is the primary location for all surfaces. A `spmc-server/.env` fallback is also supported for local dev.

---

## Claude App (Claude Code Plugin)

The project ships as a Claude Code plugin. When active, Claude Code:
- Loads the MCP server automatically via `.mcp.json`
- Discovers and activates the 13 skills in `skills/`

**Setup:**

1. Run `npm install` inside `spmc-server/`
2. Add credentials to `~/.claude/spmc.env`
3. Load the plugin in Claude Code (the `.claude-plugin/plugin.json` and `.mcp.json` are auto-read from the project root)

**How it works:**

`.mcp.json` declares the server connection using `${CLAUDE_PLUGIN_ROOT}` — Claude Code resolves this to wherever the plugin lives, so no path hardcoding is needed. Credentials flow in as `${VAR}` placeholders resolved from the running environment.

**Skills (`skills/`)** — two layers of one plugin:

*Publishing engine — route to tools on the `spmc` MCP server:*

| Skill | Trigger examples |
|-------|-----------------|
| `post-to-x` | "post to X", "tweet this", "post a thread" |
| `post-to-instagram` | "post to Instagram", "post this photo" |
| `post-to-tiktok` | "upload to TikTok", "post this video" |
| `post-to-facebook` | "post to Facebook", "publish to my page" |
| `post-to-threads` | "post to Threads", "share on Threads" |
| `post-to-bluesky` | "post to Bluesky", "publish on Bluesky" |
| `manage-queue` | "show my queue", "schedule this for tomorrow", "dispatch queued post" |
| `upload-media` | "upload this image", "get a public URL for this file" |
| `content-intelligence` | "validate this post", "dry run", "adapt for all platforms", "check my setup", "show the audit log" |

*Content pipeline — the creative layer (ideation → research → concept → review → content → hand-off to the queue):*

| Skill | Trigger examples |
|-------|-----------------|
| `idea-input` | "I have a content idea", "submit a new idea" |
| `research-trends` | "what's trending", "research topics for content" |
| `pipeline-orchestrator` | "run the content pipeline", "generate concepts from this brief" |
| `output-manager` | "make the visuals for this post", "add the logo overlay" |

The pipeline produces platform-native content and hands it to the SPMC queue; the publishing-engine skills then schedule and publish it. See **Content Pipeline** below for the end-to-end workflow.

---

## Content Pipeline (creative layer)

SPMC is two layers of one plugin: the **publishing engine** (the `spmc` MCP tools + their skills) and the **content pipeline** — an agent-side creative workflow that turns an idea or a trend into platform-native content, then hands it to the queue. The pipeline does creative work, not schema-driven work, so it lives entirely in skills (no server tools of its own).

**Path A — manual idea:**

```
/idea-input            describe the idea (topic, audience, tone, references)
  ↓
/pipeline-orchestrator concepts → editorial review → platform-native content
  ↓
/output-manager        generate platform visuals (+ logo overlay)
  ↓
/manage-queue          review, schedule, dispatch  →  publishing engine
```

**Path B — trend research (automated):** swap the first step for `/research-trends`, which surveys Google Trends, Reddit, news, and social hashtags, selects a promising angle, and emits a pipeline-ready brief — then continues through the same orchestrator → visuals → queue path.

**Scheduling:** both paths are schedulable (e.g. via Cowork's scheduler) — run trend research daily for a timely queue, mix in manual ideas for specific angles, and let the SPMC scheduler auto-dispatch queued items when their `scheduled_at` arrives. All paths feed the same queue.

---

## Claude Desktop App

Merge the `mcpServers` block into your Claude Desktop config file:

| OS | Path |
|----|------|
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |

**Option A — npm (after `npm install -g spmc` or once published):**

```json
{
  "mcpServers": {
    "spmc": {
      "command": "npx",
      "args": ["-y", "spmc"]
    }
  }
}
```

**Option B — local clone:**

```json
{
  "mcpServers": {
    "spmc": {
      "command": "node",
      "args": ["C:\\path\\to\\spmc-server\\run.js"]
    }
  }
}
```

**With scheduler** (auto-dispatches scheduled queue items every 60s):  
Replace `run.js` with `start.js`. The scheduler runs as a background child process and logs to `~/.claude/spmc-scheduler.log`.

Credentials load automatically from `~/.claude/spmc.env` at startup — do not put raw secrets in the Desktop config.

Restart Claude Desktop after editing the config. The `spmc` server appears in the MCP connections panel and all SPMC tools are immediately available.

---

## Bring-Your-Own Agent (Hermes, OpenClaw, CLI agents)

Any LLM agent outside the Claude plugin ecosystem gets a self-contained,
**generic** integration pack in `agent/` — an operating briefing, a skill-trigger
map, and a default persona. Hermes is the reference instance; the same pack drives
any BYO agent (point your own at these files).

| File | Purpose |
|------|---------|
| `agent/mcp-config.json` | Drop-in MCP server connection block |
| `agent/CONTEXT.md` | Full operational briefing: the full tool catalog (publishing, content-intelligence, queue, observability, media — generator-injected), return values, platform gotchas, credential loading |
| `agent/SKILLS.md` | Trigger → tool reference for every platform + queue management + multi-platform campaigns |
| `agent/persona.md` | Pre-publish checklist, voice/tone defaults, confirmation vs. autonomous behavior rules (the default persona; override per agent) |

**Connect:**

Drop this into your agent's MCP config (update the path to match your clone):

```json
{
  "mcpServers": {
    "spmc": {
      "command": "node",
      "args": ["C:\\path\\to\\spmc-server\\run.js"]
    }
  }
}
```

Or reference `agent/mcp-config.json` directly if your agent supports file-based MCP configs.

**Onboarding:**  
On first contact, point the agent at `agent/CONTEXT.md`. It's written to be read once and then operated from — no external files required during a session. `agent/SKILLS.md` gives the agent its trigger mappings; `agent/persona.md` defines the publishing persona and what requires user confirmation.

**What the agent operates autonomously (no confirmation needed):**
- Reading the queue (`queue_list`)
- Checking TikTok publish status
- Adding to queue without dispatching

**What always requires explicit user approval:**
- Any publishing action (direct or `queue_dispatch`)
- Deleting a queue item
- Rescheduling to a different time than requested

---

## OpenClaw / Generic MCP Clients

Any MCP client supporting stdio transport connects with a standard config block:

```json
{
  "mcpServers": {
    "spmc": {
      "command": "node",
      "args": ["/absolute/path/to/spmc-server/run.js"]
    }
  }
}
```

Server name: `spmc`. All SPMC tools are listed on `tools/list` with full JSON Schema definitions.

If your client is itself an **agent** (not just a raw tool caller), give it the same briefing as any BYO agent — `agent/CONTEXT.md` + `agent/SKILLS.md` — so it knows the platform gotchas, return shapes, and trigger phrases, not just the raw tool list.

**Credentials:** three options in priority order:
1. `~/.claude/spmc.env` — file-based, auto-loaded on startup
2. `spmc-server/.env` — local dev fallback
3. Inherited from environment — if neither file exists, the server uses `process.env` directly

**With scheduler:**  
Use `start.js` instead of `run.js`. The scheduler spawns as a background process and logs to `~/.claude/spmc-scheduler.log` — this directory must exist. If running outside a Claude environment, change the log path in `spmc-server/start.js` or run the scheduler separately:

```bash
node spmc-server/scheduler/index.js
```

---

## Global / CLI Agents (npm)

The `spmc-server` package is structured for npm distribution. Install once and any config can reference it without a local clone.

**Install globally:**
```bash
cd spmc-server
npm install -g .           # install from local clone

# or after npm publish:
npm install -g spmc
```

**Run** (two bins):
```bash
spmc                       # MCP server only (stdio)
spmc-start                 # MCP server + scheduler daemon (auto-dispatch + auto-analytics)
npx -y spmc                # MCP server, without a global install
```

**Config block (any client):**
```json
{
  "command": "npx",
  "args": ["-y", "spmc"]
}
```

Credentials load from `~/.claude/spmc.env` automatically. No path hardcoding needed.

**Scheduler:** the `spmc` bin runs the MCP server only. For auto-dispatch of
scheduled posts **and** the ~24h auto-analytics follow-up to fire, use the
**`spmc-start`** bin (MCP server + scheduler daemon) as the entry point instead:
```json
{ "command": "spmc-start" }
```
Without a global install: `{ "command": "npx", "args": ["-y", "-p", "spmc", "spmc-start"] }`.
The scheduler logs to `~/.claude/spmc-scheduler.log` (that directory must exist).

---

## Quick Reference

| Surface | Entry point | Skills | Credentials |
|---------|------------|--------|-------------|
| Claude Code plugin | `.mcp.json` → `run.js` | `skills/` (auto-loaded) | `.mcp.json` `${VAR}` → env |
| Claude Desktop | `claude_desktop_config.json` | — | `~/.claude/spmc.env` |
| BYO agent (Hermes, etc.) | `agent/mcp-config.json` | `agent/SKILLS.md` | `~/.claude/spmc.env` or env |
| OpenClaw / other | stdio `node run.js` | `agent/SKILLS.md` (if agent) | `~/.claude/spmc.env` or env |
| CLI / npm | `npx spmc` | — | `~/.claude/spmc.env` or env |

**`run.js`** (bin: `spmc`) — MCP server only  
**`start.js`** (bin: `spmc-start`) — MCP server + scheduler daemon (use this for always-on surfaces like Claude Desktop)

---

## MCP Tools

<!-- gen:tools:start -->
_29 tools — generated from `lib/tools.js` + `lib/specs.js`. Do not edit between these markers; run `npm run build`._

### Publishing & status

| Tool | Required | Optional | Platform limit | Description |
|------|----------|----------|----------------|-------------|
| `x_post_tweet` | `text` (string) | `account` (string), `dry_run` (boolean) | 280 chars | Post a single tweet to X (Twitter). Max 280 characters. |
| `x_post_thread` | `tweets` (array) | `account` (string), `dry_run` (boolean) | — | Post a thread of tweets to X. Each array item is one tweet, chained as replies. |
| `instagram_post` | `caption` (string) | `image_url` (string), `image_urls` (array), `alt_text` (string), `alt_texts` (array), `first_comment` (string), `account` (string), `dry_run` (boolean) | 2200 chars | Post to Instagram. Provide image_url for a single image, OR image_urls (2–10 public URLs) for a carousel. Requires publicly accessible image URL(s). |
| `tiktok_post_video` | `video_url` (string), `caption` (string) | `privacy_level` (string), `account` (string), `dry_run` (boolean) | 2200 chars | Post a video to TikTok (PULL_FROM_URL). Until your app passes audit, posts land as private/self-only regardless of privacy_level. |
| `tiktok_check_publish_status` | `publish_id` (string) | `account` (string) | — | Check the async publish status of a TikTok video post. |
| `facebook_post` | `message` (string) | `image_url` (string), `alt_text` (string), `first_comment` (string), `account` (string), `dry_run` (boolean) | 63206 chars | Post to a Facebook Page feed. Optionally attach a public image URL to post as a photo. |
| `threads_post` | `text` (string) | `image_url` (string), `alt_text` (string), `account` (string), `dry_run` (boolean) | 500 chars | Post text (optionally with an image) to Threads. |
| `bluesky_post` | `text` (string) | `account` (string), `dry_run` (boolean) | 300 graphemes | Post text to Bluesky via the AT Protocol. No OAuth — just an app password. |

### Content intelligence

| Tool | Required | Optional | Platform limit | Description |
|------|----------|----------|----------------|-------------|
| `content_validate` | `platform` (string), `content` (object) | — | — | Validate a post payload against a platform's rules (length, required fields, media) without publishing. Returns errors that would block publishing and warnings. Use before queuing or posting. |
| `content_adapt` | `text` (string) | `platforms` (array) | — | Fit one source text to multiple platforms' hard limits: auto-splits a long post into an X thread, grapheme-truncates for Bluesky, etc. Returns ready-to-post content per platform plus warnings. This handles the deterministic length-fitting only — rewrite tone/hashtags yourself before posting. |
| `config_doctor` | — | — | — | Report which platforms and named accounts have credentials configured (by env-var presence only — never reveals values), plus media providers. Use to check setup before publishing. |
| `account_info` | `platform` (string) | `account` (string) | — | Fetch the connected account profile (handle, display name, avatar URL) for a platform. Read-only — confirms which account is wired up and supplies branding assets. Supported: instagram, facebook (Graph API). |
| `brand_voice` | — | `action` (string), `profile` (object), `replace` (boolean), `account` (string) | — | Get or set the brand voice profile — a persistent brand kit (tone, audience, hashtag sets, emoji/banned-word policy, CTA library, default UTM rules) that the content skills read so drafts match your voice without re-specifying it each time. Per account (omit account for the default). Content config, not secrets. Call with action:"get" first to see the current profile and its shape. |
| `link_tag` | `url` (string) | `params` (object), `platform` (string), `account` (string) | — | Add UTM/campaign query params to a URL for click attribution. Merges the brand kit's links.utm_defaults under your overrides; a value containing {platform} is substituted with the given platform. Returns the tagged URL. Deterministic, credential-free. |
| `duplicate_check` | `platform` (string), `content` (object) | `within_hours` (number) | — | Check whether identical content was already published to a platform recently — matches the content hash against the audit log of successful publishes. Returns the prior publish if found. Run before publishing to avoid an accidental repost (there is no un-publish). |
| `best_time` | `platform` (string) | `count` (number), `account` (string) | — | Suggest the best times to post on a platform, ranked, in audience-local time with a short rationale per window. Credential-free. Uses research-backed engagement windows as a baseline and will blend in the account's own analytics history once enough accrues. Schedule a suggestion via queue_add with an explicit timezone offset. |
| `brief_schema` | — | `account` (string) | — | Return the per-run content-brief field schema — the single source for guided-mode intake and the future web-UI form. The brief is the per-run delta on top of the persistent brand kit (voice/audience/hashtags); this lists only what a run needs (angle, goal, platforms, schedule, references, constraints) with each field's type, required-ness, options, and which fields the brand kit pre-fills. Pass an account to annotate its brand-kit pre-fills. Use it to drive an optional guided intake instead of asking for everything at once. |
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
| `media_compose` | `template` (string), `headline` (string) | `subtext` (string), `bg_color` (string), `accent` (string), `bg_image_url` (string), `handle` (string), `icon_url` (string), `logo_url` (string), `provider` (string), `account` (string) | — | Render a branded image from a template using local sharp compositing (no external service). Returns a public URL after auto-uploading. Templates: square-dark (1080×1080), square-tall (1080×1350, IG 4:5 feed), story-dark (1080×1920), banner-wide (1200×628), square-news (1080×1080 branded carousel slide with wrapped body + handle/icon footer). |
| `media_upload` | `file_path` (string) | `provider` (string), `account` (string) | — | Upload a local image or video file to a CDN and get back a public URL. Use this before posting to Instagram (requires image URL) or TikTok (requires video URL). Supported providers: cloudinary (images + videos), imgbb (images only). Provider is auto-selected from available credentials. |

<!-- gen:tools:end -->

**Notes:**

- Every publishing tool (and `queue_dispatch`) accepts **`dry_run: true`** — it validates the payload and previews routing without sending, and records a `dry_run` audit entry. Use it to rehearse a post before going live.
- Queue status lifecycle: `pending` → `dispatched` → `published` | `failed`.
- Media templates: `square-dark` (1080×1080) · `story-dark` (1080×1920) · `banner-wide` (1200×628). CDN: Cloudinary (images + video) auto-selected; imgbb fallback (images only).
- **Unverified:** `analytics_*` and `rate_limits` depend on live API behavior not yet exercised against real credentials. The store, routing, and tools are real; live confirmation is pending credential testing.

---

## Credentials Reference

| Platform | Required vars | Notes |
|----------|--------------|-------|
| X | `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET` | OAuth 1.0a. Regenerate tokens after changing app permissions. |
| Instagram | `INSTAGRAM_USER_ID`, `INSTAGRAM_ACCESS_TOKEN` | `EAA…` token (Facebook Login for Business), not `IGAA…`. Requires linked FB Page. |
| Facebook | `FACEBOOK_PAGE_ID`, `FACEBOOK_ACCESS_TOKEN` | Same `EAA…` token as Instagram with `pages_manage_posts` scope. |
| TikTok | `TIKTOK_ACCESS_TOKEN` | `video.publish` scope. Posts are `SELF_ONLY` until app passes TikTok audit. |
| Threads | `THREADS_USER_ID`, `THREADS_ACCESS_TOKEN` | Separate app from Instagram — own token via `graph.threads.net`. |
| Bluesky | `BLUESKY_IDENTIFIER`, `BLUESKY_APP_PASSWORD` | No OAuth. Generate at bsky.app/settings/app-passwords. |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Used by `media_compose` and `media_upload`. |
| imgbb | `IMGBB_API_KEY` | Fallback CDN for images only. |

**Multi-account:** suffix any credential key with `__ACCOUNTNAME` and pass `account: "name"` to any tool. See `.env.example` for examples.

---

## Platform Gotchas

**X** — Tokens need Read+Write permissions set in the developer portal. Regenerate after changing permission level; the existing token won't gain the new scope. Counting: URLs always count as 23 characters regardless of length, and emoji above U+FFFF count as 2.

**Instagram** — Use the classic Graph API path (`graph.facebook.com`, `EAA…` token). The newer Instagram Business Login issues `IGAA…` tokens that don't work for this API. Link the IG Business Account to a Facebook Page before generating credentials. System User tokens are more stable than personal-login tokens.

**TikTok** — Posts are async. `tiktok_post_video` returns `publish_id`, not a URL. Always follow up with `tiktok_check_publish_status`. Domain verification may be required for `PULL_FROM_URL`. All posts land as private until the app passes TikTok's API audit.

**Threads** — Completely separate from Instagram/Facebook despite being Meta. Different app registration, different API host (`graph.threads.net`), different token.

**Bluesky** — 300 graphemes, not characters. Emoji-heavy text can exceed the limit before the character count suggests it. Auth is per-call; no token refresh needed.

---

## Structure

```
.claude-plugin/
  plugin.json             Claude Code plugin manifest
.mcp.json                 Claude Code MCP server connection (${CLAUDE_PLUGIN_ROOT})
claude_desktop_config.json  Drop-in Claude Desktop config
.env.example              All credential keys + multi-account examples

skills/                   Claude Code SKILL.md files (13 total: 9 publishing + 4 pipeline)
agent/                    Bring-your-own-agent integration pack (Hermes, OpenClaw, …)
  mcp-config.json
  CONTEXT.md
  SKILLS.md
  persona.md

spmc-server/
  run.js                  Entry point: load creds → start MCP server
  start.js                Entry point: spawn scheduler → start MCP server
  index.js                MCP server (all tool definitions)
  adapters/               One file per platform (6 total) + getMetrics (IG/FB/Threads)
  lib/                    Dispatcher, specs, validate, adapt, config, schedule, audit, analytics
  queue/store.js          File-backed JSON queue
  scheduler/              Scheduler daemon (polls every 60s)
  media/                  Compose + upload pipeline
  data/                   Runtime state (audit log etc.) — gitignored
  test/                   node:test unit suites + smoke.mjs
  package.json            npm package (bin: spmc → run.js)
```

**Tests:** `cd spmc-server && npm test` (37 unit) · `npm run test:smoke` (drives the real server over MCP).

Full specification: `PROJECT_SPECIFICATIONS.md`
