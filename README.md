# SPMC — Social Publishing Mission Control

AI-native MCP server for publishing to X, Instagram, TikTok, Facebook, Threads, and Bluesky.  
The agent is the interface — no UI required.

**23 MCP tools:** direct posting · content validation & cross-platform adaptation · dry-run previews · audit log · content queue · scheduler · media pipeline (compose + CDN upload) · config + rate-limit + analytics introspection

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
- Discovers and activates the 8 skills in `skills/`

**Setup:**

1. Run `npm install` inside `spmc-server/`
2. Add credentials to `~/.claude/spmc.env`
3. Load the plugin in Claude Code (the `.claude-plugin/plugin.json` and `.mcp.json` are auto-read from the project root)

**How it works:**

`.mcp.json` declares the server connection using `${CLAUDE_PLUGIN_ROOT}` — Claude Code resolves this to wherever the plugin lives, so no path hardcoding is needed. Credentials flow in as `${VAR}` placeholders resolved from the running environment.

**Skills (`skills/`):**

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

All skills route to tools on the `spmc` MCP server.

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

Restart Claude Desktop after editing the config. The `spmc` server appears in the MCP connections panel and all 23 tools are immediately available.

---

## Hermes

Hermes has its own self-contained integration pack in `hermes/`:

| File | Purpose |
|------|---------|
| `hermes/mcp-config.json` | Drop-in MCP server connection block |
| `hermes/CONTEXT.md` | Full operational briefing: the publishing/queue/media tools, return values, platform gotchas, credential loading (predates the Beta-Prep content-intelligence tools — see SESSION_HANDOFF) |
| `hermes/SKILLS.md` | Trigger → tool reference for every platform + queue management + multi-platform campaigns |
| `hermes/persona.md` | Pre-publish checklist, voice/tone defaults, confirmation vs. autonomous behavior rules |

**Connect:**

Drop this into your Hermes MCP config (update the path to match your clone):

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

Or reference `hermes/mcp-config.json` directly if your Hermes setup supports file-based MCP configs.

**Onboarding:**  
On first contact, point Hermes at `hermes/CONTEXT.md`. It's written to be read once and then operated from — no external files required during a session. `hermes/SKILLS.md` gives Hermes its trigger mappings; `hermes/persona.md` defines the publishing persona and what requires user confirmation.

**What Hermes operates autonomously (no confirmation needed):**
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

Server name: `spmc`. All 23 tools are listed on `tools/list` with full JSON Schema definitions.

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

**Run:**
```bash
spmc                       # MCP server (stdio)
npx -y spmc                # without global install
```

**Config block (any client):**
```json
{
  "command": "npx",
  "args": ["-y", "spmc"]
}
```

Credentials load from `~/.claude/spmc.env` automatically. No path hardcoding needed.

**Scheduler** is not started by the npm bin (`run.js`). Run it separately if needed:
```bash
node $(npm root -g)/spmc/scheduler/index.js
```
Or use `start.js` as the entry point:
```json
{
  "command": "node",
  "args": ["$(npm root -g)/spmc/start.js"]
}
```

---

## Quick Reference

| Surface | Entry point | Skills | Credentials |
|---------|------------|--------|-------------|
| Claude Code plugin | `.mcp.json` → `run.js` | `skills/` (auto-loaded) | `.mcp.json` `${VAR}` → env |
| Claude Desktop | `claude_desktop_config.json` | — | `~/.claude/spmc.env` |
| Hermes | `hermes/mcp-config.json` | `hermes/SKILLS.md` | `~/.claude/spmc.env` or env |
| OpenClaw / other | stdio `node run.js` | — | `~/.claude/spmc.env` or env |
| CLI / npm | `npx spmc` | — | `~/.claude/spmc.env` or env |

**`run.js`** — MCP server only  
**`start.js`** — MCP server + scheduler daemon (use this for always-on surfaces like Claude Desktop)

---

## MCP Tools

### Publishing

| Tool | Platform | Required | Notes |
|------|----------|----------|-------|
| `x_post_tweet` | X | `text` | Max 280 chars; URLs = 23 chars regardless of length |
| `x_post_thread` | X | `tweets[]` | Ordered array; each item = one chained tweet |
| `instagram_post` | Instagram | `image_url`, `caption` | Image URL must be publicly accessible |
| `tiktok_post_video` | TikTok | `video_url`, `caption` | Async — returns `publish_id`, not a final URL |
| `tiktok_check_publish_status` | TikTok | `publish_id` | Poll after `tiktok_post_video` to confirm |
| `facebook_post` | Facebook | `message` | Optional `image_url`; posts to Page feed |
| `threads_post` | Threads | `text` | Max 500 chars; optional `image_url` |
| `bluesky_post` | Bluesky | `text` | Max 300 graphemes; app password auth |

Every publishing tool (and `queue_dispatch`) accepts **`dry_run: true`** — it validates the payload and previews routing without sending, and records a `dry_run` audit entry. Use it to rehearse a post before going live.

### Content intelligence & safety

| Tool | What it does |
|------|-------------|
| `content_validate` | Check a payload against a platform's rules (length, required fields, media URL) without publishing. Returns blocking errors + warnings. |
| `content_adapt` | Fit one source text to multiple platforms' hard limits — auto-splits a long post into an X thread, grapheme-truncates for Bluesky, etc. Deterministic fitting only; you do the tone/hashtag rewrite. |
| `config_doctor` | Report which platforms and named accounts have credentials configured (by env presence — never reveals values), plus media providers. |
| `audit_log` | Read the append-only publish trail: every publish, failure, and dry-run with timestamp, platform, account, content hash, result. Filter by platform/status/source. |
| `schedule_check` | Validate + normalize a `scheduled_at` to canonical UTC ISO 8601. A timestamp without a timezone is read as server-local and flagged with a warning (ambiguous under hosted deployment). |

### Queue

| Tool | What it does |
|------|-------------|
| `queue_add` | Add a post; optionally set `scheduled_at` (ISO 8601) |
| `queue_list` | List items; filter by `status` or `platform` |
| `queue_update` | Edit `content`, `scheduled_at`, or `status` |
| `queue_remove` | Delete an item permanently |
| `queue_dispatch` | Publish immediately regardless of scheduled time |

Status lifecycle: `pending` → `dispatched` → `published` | `failed`

### Media

| Tool | What it does |
|------|-------------|
| `media_compose` | Render a branded image from a template (local sharp, no external service) → auto-upload → public URL |
| `media_upload` | Upload a local file to a CDN → public URL |

Templates: `square-dark` (1080×1080) · `story-dark` (1080×1920) · `banner-wide` (1200×628)  
CDN: Cloudinary (images + video) auto-selected; imgbb fallback (images only).

### Observability

| Tool | What it does |
|------|-------------|
| `rate_limits` | Show HTTP 429 responses observed per platform (tallied from publish errors). Observational — does not yet gate sending. |
| `analytics_fetch` | Fetch engagement metrics for a published post and store a timestamped snapshot. Supported: Instagram, Facebook, Threads (Graph insights). |
| `analytics_report` | Read stored engagement snapshots, most recent first; filter by platform/post. |

> **Unverified:** `analytics_*` and `rate_limits` depend on live API behavior that
> has not yet been exercised against real credentials. The store, routing, and
> tools are real; live confirmation is pending credential testing.

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

**X** — Tokens need Read+Write permissions set in the developer portal. Regenerate after changing permission level; the existing token won't gain the new scope.

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

skills/                   Claude Code SKILL.md files (8 total)
hermes/                   Hermes integration pack
  mcp-config.json
  CONTEXT.md
  SKILLS.md
  persona.md

spmc-server/
  run.js                  Entry point: load creds → start MCP server
  start.js                Entry point: spawn scheduler → start MCP server
  index.js                MCP server — 23 tools
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
