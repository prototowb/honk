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

## 23 MCP Tools

### Direct Publishing

Every publishing tool accepts **`dry_run` (bool)** — validates the payload and previews routing **without sending**, and records a `dry_run` audit entry. Use it to rehearse a post before going live.

| Tool | Required inputs | Optional inputs | Notes |
|------|----------------|----------------|-------|
| `x_post_tweet` | `text` (str) | `account` (str), `dry_run` (bool) | Max 280 chars; URLs = 23 chars; emoji > U+FFFF = 2 chars |
| `x_post_thread` | `tweets` (str[]) | `account`, `dry_run` | Ordered array; each item is one tweet in the chain |
| `instagram_post` | `image_url` (str), `caption` (str) | `account`, `dry_run` | `image_url` must be publicly accessible |
| `tiktok_post_video` | `video_url` (str), `caption` (str) | `privacy_level` (str), `account`, `dry_run` | Async — returns `publish_id`, not a URL; check status separately |
| `tiktok_check_publish_status` | `publish_id` (str) | `account` | Poll until `status` indicates completion or failure (adapter forwards TikTok's raw status string) |
| `facebook_post` | `message` (str) | `image_url` (str), `account`, `dry_run` | Posts to Page feed; `image_url` must be public |
| `threads_post` | `text` (str) | `image_url` (str), `account`, `dry_run` | Max 500 chars |
| `bluesky_post` | `text` (str) | `account`, `dry_run` | Max 300 graphemes; no OAuth — app password |

### Content Intelligence

Credential-free. Use these to prepare and check content before publishing.

| Tool | Required inputs | Optional inputs | Notes |
|------|----------------|----------------|-------|
| `content_validate` | `platform` (str), `content` (obj) | — | Checks length / required fields / media URL against the platform's rules. Returns blocking errors + warnings. Run before `queue_add` or publishing. |
| `content_adapt` | `text` (str) | `platforms` (str[]) | Fits one source text to each platform's hard limits: auto-splits a long post into an X thread, grapheme-truncates for Bluesky, etc. Returns ready-to-post `content` per platform + warnings. Deterministic fitting only — **you** still do tone/hashtag rewriting. Omit `platforms` for all six. |
| `config_doctor` | — | — | Reports which platforms/named accounts have credentials configured (env presence only — never reveals values) + media providers. Use to check setup before publishing. |
| `audit_log` | — | `platform`, `status` (`published`\|`failed`\|`dry_run`), `source` (`direct`\|`queue`\|`scheduler`), `limit` | Reads the append-only publish trail: ts, platform, account, content hash, result/error. |
| `schedule_check` | `scheduled_at` (str) | — | Normalizes a timestamp to UTC ISO 8601. A timezone-less value is read as **server-local** and flagged with a warning. Returns the normalized value + whether it's in the past. |

### Queue Management

| Tool | Required inputs | Optional inputs | Notes |
|------|----------------|----------------|-------|
| `queue_add` | `platform` (str), `content` (obj) | `scheduled_at` (ISO 8601), `account` (str) | `content` fields match the direct publishing tool. Content is validated (warnings returned, never blocks). Prefer a timezone offset on `scheduled_at`; a naive time is read as server-local and warned. |
| `queue_list` | — | `status` (str), `platform` (str) | Statuses: `pending` → `dispatched` → `published` \| `failed` |
| `queue_update` | `id` (str), `updates` (obj) | — | Can update `content`, `scheduled_at`, `status` |
| `queue_remove` | `id` (str) | — | Permanent |
| `queue_dispatch` | `id` (str) | `dry_run` (bool) | Publishes immediately; transitions status to `published` or `failed` automatically. `dry_run` validates & previews without sending. |

### Observability — UNVERIFIED against live APIs (pending credential testing)

| Tool | Required inputs | Optional inputs | Notes |
|------|----------------|----------------|-------|
| `rate_limits` | — | — | Tallies HTTP 429 responses observed per platform (from publish errors). Observational — does not gate sending. |
| `analytics_fetch` | `platform` (`instagram`\|`facebook`\|`threads`), `post_id` (str) | `account` | Fetches engagement metrics for a published post (Graph insights) and stores a timestamped snapshot. X/TikTok/Bluesky not supported yet. |
| `analytics_report` | — | `platform`, `post_id`, `limit` | Reads stored engagement snapshots, most recent first. |

Platform enum: `x` `instagram` `tiktok` `facebook` `threads` `bluesky`

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
