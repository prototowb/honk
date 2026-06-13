# Social Publishing Mission Control (SPMC)

AI-native social publishing infrastructure. MCP server + skills + scheduler. No UI required — the agent is the interface.

**Platforms:** X · Instagram · TikTok · Facebook · Threads · Bluesky  
**Status:** MVP + Alpha (Phase 0–1)

---

## Quick start

### 1. Put your credentials in `~/.claude/spmc.env`

```bash
# Windows: %USERPROFILE%\.claude\spmc.env
# macOS/Linux: ~/.claude/spmc.env
```

Copy `.env.example` and fill in your keys. This file is auto-loaded by the server on startup and survives reinstalls.

### 2. Register with Claude Desktop

Merge the `mcpServers` block from `claude_desktop_config.json` into  
`%APPDATA%\Claude\claude_desktop_config.json` (Windows) or  
`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS).

It points at `spmc-server/start.js`, which launches both the MCP server and the scheduler in one process.

### 3. Restart Claude Desktop

The `spmc` server appears in the MCP connections list. All 13 tools are immediately available.

---

## Structure

```
spmc-server/
├── index.js          MCP server — 13 tools
├── run.js            Launcher: load creds → start MCP server
├── start.js          Launcher: spawn scheduler child → start MCP server (use this for Claude Desktop)
├── adapters/         One file per platform
│   ├── x.js
│   ├── instagram.js
│   ├── tiktok.js
│   ├── facebook.js
│   ├── threads.js
│   └── bluesky.js
├── queue/
│   └── store.js      File-backed JSON queue
└── scheduler/
    ├── index.js      Scheduler launcher (load creds → start scheduler)
    └── scheduler.js  Polls queue every 60s, dispatches due items

skills/               Claude Code SKILL.md files (trigger detection)
hermes/               Hermes agent integration (CONTEXT.md, SKILLS.md, mcp-config.json)
.claude-plugin/       Claude Desktop plugin manifest
claude_desktop_config.json   Drop-in MCP config
.env.example          All required env vars + multi-account examples
```

---

## MCP tools

### Media

| Tool | What it does |
|------|-------------|
| `media_compose` | Render a branded image from a template locally (sharp, no external service) → auto-upload → public URL |
| `media_upload` | Upload an existing local file → public URL |

**Templates** (all based on brand palette from `DESIGN_GUIDE.md`):

| ID | Dimensions | Platforms |
|----|-----------|-----------|
| `square-dark` | 1080×1080 | Instagram, Threads, Facebook |
| `story-dark` | 1080×1920 | Instagram Stories, TikTok |
| `banner-wide` | 1200×628 | X card, Facebook share |

All templates accept: `headline`, `subtext`, `bg_color`, `accent`, `bg_image_url` (optional backdrop).

CDN provider is auto-selected: Cloudinary (images + video) → imgbb fallback (images only). Set `CLOUDINARY_*` or `IMGBB_API_KEY` in your env.

### Publishing

| Tool | Platform | Required inputs |
|------|----------|-----------------|
| `x_post_tweet` | X | `text` |
| `x_post_thread` | X | `tweets[]` |
| `instagram_post` | Instagram | `image_url`, `caption` |
| `tiktok_post_video` | TikTok | `video_url`, `caption` |
| `tiktok_check_publish_status` | TikTok | `publish_id` |
| `facebook_post` | Facebook | `message` |
| `threads_post` | Threads | `text` |
| `bluesky_post` | Bluesky | `text` |

All publishing tools accept an optional `account` field — see [Multi-account](#multi-account) below.

### Queue

| Tool | What it does |
|------|-------------|
| `queue_add` | Add a post (optionally scheduled) |
| `queue_list` | List items, filter by `status` or `platform` |
| `queue_update` | Edit content, scheduled_at, or status |
| `queue_remove` | Delete an item |
| `queue_dispatch` | Publish immediately regardless of scheduled_at |

Queue item lifecycle: `pending` → `dispatched` → `published` \| `failed`

---

## Scheduling

Add an item with a future `scheduled_at` and the scheduler handles dispatch automatically:

```
queue_add(
  platform: "bluesky",
  content: { text: "good morning" },
  scheduled_at: "2026-06-11T09:00:00Z"
)
```

The scheduler polls every 60 seconds. Logs go to `~/.claude/spmc-scheduler.log`.

To run the scheduler standalone (without the MCP server):
```bash
node spmc-server/scheduler/index.js
```

---

## Multi-account

Any number of named accounts per platform, using double-underscore suffixes in your `.env`:

```bash
# Default account (no suffix) — always the fallback
X_API_KEY=...

# Named account "brand"
X_API_KEY__BRAND=...
X_API_SECRET__BRAND=...
X_ACCESS_TOKEN__BRAND=...
X_ACCESS_TOKEN_SECRET__BRAND=...
```

Pass `account: "brand"` to any publishing or queue tool to use it:

```
x_post_tweet(text: "hello from brand", account: "brand")
queue_add(platform: "x", content: { text: "..." }, account: "brand")
```

Account names are case-insensitive — `"brand"` and `"BRAND"` resolve to the same credentials. See `.env.example` for all platform examples.

---

## Agent integration

### Claude Code
Skills in `skills/` are auto-discovered. Natural language triggers route to the right tool — "post to Instagram", "schedule a tweet", "show my queue", etc.

### Claude Desktop App
`start.js` is registered in `claude_desktop_config.json`. Tools appear automatically.

### Hermes / custom agents
See `hermes/` — contains `CONTEXT.md` (full briefing), `SKILLS.md` (trigger → tool reference), and `mcp-config.json` (drop-in server config).

### Any MCP-compatible agent
```bash
node spmc-server/run.js   # MCP server only
node spmc-server/start.js # MCP server + scheduler
```

---

## Credentials reference

| Platform | Required vars | Notes |
|----------|--------------|-------|
| X | `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET` | OAuth 1.0a. Pay-per-use since early 2026 (~$0.015/post). |
| Instagram | `INSTAGRAM_USER_ID`, `INSTAGRAM_ACCESS_TOKEN` | Must be `EAA…` token from Facebook Login for Business — not `IGAA…`. Linked FB Page required. |
| Facebook | `FACEBOOK_PAGE_ID`, `FACEBOOK_ACCESS_TOKEN` | Reuse Instagram `EAA…` token with `pages_manage_posts` scope added. |
| TikTok | `TIKTOK_ACCESS_TOKEN` | `video.publish` scope. Posts are private/self-only until app passes audit. |
| Threads | `THREADS_USER_ID`, `THREADS_ACCESS_TOKEN` | Separate from Instagram — own app registration and token. |
| Bluesky | `BLUESKY_IDENTIFIER`, `BLUESKY_APP_PASSWORD` | App password only, no OAuth. Generate at bsky.app/settings/app-passwords. |

---

## Platform gotchas

**X** — Tokens need Read+Write permissions; regenerate after changing the permission level. No free tier for posting as of 2026.

**Instagram** — Use the classic Graph API path (`graph.facebook.com`, `EAA…` token), not Instagram Business Login (`IGAA…` token). Link the IG Business Account to a Facebook Page before generating credentials. Use a System User token, not a personal-login token.

**TikTok** — Posting is async: `tiktok_post_video` returns a `publish_id`; always follow up with `tiktok_check_publish_status`. Domain verification may be required for `PULL_FROM_URL`.

**Threads** — Not the same credentials as Instagram/Facebook despite being Meta. Separate app, separate token, separate API host (`graph.threads.net`).

**Bluesky** — 300 graphemes (not characters). Emoji-heavy text can exceed the limit before the character count suggests it. Auth is per-call; there's no token to refresh.

---

## Roadmap

| Phase | Status |
|-------|--------|
| 0 — MVP: MCP server, all platforms, queue, skills, configs | ✅ Done |
| 1 — Alpha: scheduler, multi-account, Hermes pack | ✅ Done |
| 1 — Alpha: media pipeline (local → CDN → public URL) | ✅ Done |
| 1 — Alpha: analytics ingestion (engagement 24h post-publish) | Pending |
| 2 — Beta: multi-user auth, analytics dashboard, webhooks | Planned |
| 3 — SaaS: web UI, teams, public API, subscriptions | Planned |

Full specification: `PROJECT_SPECIFICATIONS.md`
