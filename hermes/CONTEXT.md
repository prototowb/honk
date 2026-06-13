# SPMC — Hermes Operational Briefing

> Self-contained. Read once, then use tools. No external files required to get operational.

## What SPMC Is

Social Publishing Mission Control. An MCP server that publishes content to X, Instagram, TikTok, Facebook, Threads, and Bluesky. No UI — you are the interface. All publishing goes through MCP tools; never call platform APIs directly.

## How to Connect

Transport: **stdio MCP**

```
command: node
args:    ["G:\\Projects\\_Plugins\\spmc-server\\run.js"]
```

`run.js` = MCP server only. `start.js` = MCP server + scheduler daemon (polls queue every 60s, auto-dispatches items where `scheduled_at <= now` and `status === pending`). If you need scheduled posts to fire automatically, the host must launch `start.js` instead of `run.js`. If launched via `run.js`, queue items with `scheduled_at` will not auto-dispatch — use `queue_dispatch` manually.

## Credentials

Primary location (used by `run.js`, loaded at startup):
```
%USERPROFILE%\.claude\spmc.env
```
Format: `KEY=value`, one per line. Fallback: `.env` next to `run.js`. If neither is present, server inherits from environment. Scheduler logs to `%USERPROFILE%\.claude\spmc-scheduler.log`.

## 13 MCP Tools

### Direct Publishing

| Tool | Required inputs | Optional inputs | Notes |
|------|----------------|----------------|-------|
| `x_post_tweet` | `text` (str) | — | Max 280 chars; URLs = 23 chars; emoji > U+FFFF = 2 chars |
| `x_post_thread` | `tweets` (str[]) | — | Ordered array; each item is one tweet in the chain |
| `instagram_post` | `image_url` (str), `caption` (str) | — | `image_url` must be publicly accessible |
| `tiktok_post_video` | `video_url` (str), `caption` (str) | `privacy_level` (str) | Async — returns `publish_id`, not a URL; check status separately |
| `tiktok_check_publish_status` | `publish_id` (str) | — | Poll until `status` indicates completion or failure (adapter forwards TikTok's raw status string) |
| `facebook_post` | `message` (str) | `image_url` (str) | Posts to Page feed; `image_url` must be public |
| `threads_post` | `text` (str) | `image_url` (str) | Max 500 chars |
| `bluesky_post` | `text` (str) | — | Max 300 graphemes; no OAuth — app password |

### Queue Management

| Tool | Required inputs | Optional inputs | Notes |
|------|----------------|----------------|-------|
| `queue_add` | `platform` (str), `content` (obj) | `scheduled_at` (ISO 8601) | `content` fields match the direct publishing tool for that platform |
| `queue_list` | — | `status` (str), `platform` (str) | Statuses: `pending` → `dispatched` → `published` \| `failed` |
| `queue_update` | `id` (str), `updates` (obj) | — | Can update `content`, `scheduled_at`, `status` |
| `queue_remove` | `id` (str) | — | Permanent |
| `queue_dispatch` | `id` (str) | — | Publishes immediately; transitions status to `published` or `failed` automatically |

Platform enum: `x` `instagram` `tiktok` `facebook` `threads` `bluesky`

## Agent Integration Contract

1. **Always confirm post content with the user before calling any publishing tool.** Show the exact text/URL/caption. Wait for approval.
2. **Never call platform APIs directly.** All publishing must go through SPMC MCP tools.
3. **After publishing, report back:** platform, post URL (where returned), returned ID, timestamp, and any caveats.
4. **Update queue item status after dispatch.** If you used `queue_dispatch`, the tool handles the status transition. If you used a direct publishing tool on a tracked queue item, call `queue_update` to mark it `published`.

## Platform-Specific Gotchas

| Platform | Key constraints |
|----------|----------------|
| **X** | 280 chars hard limit; URLs always 23 chars; threads chain as replies; no silent truncation |
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
