---
name: content-intelligence
description: >
  Use when the user says "validate this post", "will this fit", "dry run",
  "preview without posting", "adapt this for all platforms", "make X/Bluesky
  versions", "check my SPMC setup", "which platforms are configured", "show the
  audit log", "what did we publish", "check this schedule time", "are we rate
  limited", or "fetch analytics". Credential-free content prep, validation, and
  introspection tools on the spmc MCP server — use them before and around
  publishing.
metadata:
  version: "0.1.0"
  mcp_server: spmc
---

## Content Intelligence & Introspection

Tools on the `spmc` MCP server. None of these publish; all but the analytics
fetch run without platform credentials. Use them to prepare and check content
before calling a publishing tool.

### Validate before publishing

```
content_validate(platform: "x" | "instagram" | "tiktok" | "facebook" | "threads" | "bluesky",
                 content: { /* same fields as the posting tool */ })
```

Returns blocking **errors** (over length, missing required field, bad media URL)
and non-blocking **warnings** (near the limit). Run this before `queue_add` or any
publish tool. Length checks are grapheme-aware for Bluesky.

### Dry run — rehearse a real post

Every publishing tool (and `queue_dispatch`) takes `dry_run: true`:

```
bluesky_post(text: "...", dry_run: true)      // validates + previews, sends nothing
queue_dispatch(id: "q_...", dry_run: true)    // previews a queued item
```

A dry run validates, previews routing, and records a `dry_run` audit entry — but
makes no network call. Prefer it as the final check before going live.

### Adapt one idea to many platforms

```
content_adapt(text: "<source text>", platforms?: ["x", "bluesky", ...])
```

Fits the source to each platform's hard limits: a long post auto-splits into an
in-limit X thread, Bluesky is grapheme-truncated, etc. Returns ready-to-post
`content` per platform plus warnings. **Deterministic length-fitting only** — you
still rewrite tone, hashtags, and per-channel voice. Omit `platforms` for all six.

Typical cross-post flow: `content_adapt` → rewrite per channel → `content_validate`
(or `dry_run`) → `queue_add` / publish.

### Check setup

```
config_doctor()
```

Reports which platforms and named accounts have credentials configured (by env
presence only — **never** prints values) and which media providers are set up.
Use it first when a publish fails or you're unsure a platform is ready.

### Read the audit trail

```
audit_log(platform?, status?: "published" | "failed" | "dry_run", source?: "direct" | "queue" | "scheduler", limit?)
```

Every publish, failure, and dry-run is recorded with timestamp, platform, account,
content hash, and result/error. This is the durable record of what was sent.

### Check a schedule time

```
schedule_check(scheduled_at: "2026-06-15T09:00:00-04:00")
```

Normalizes to UTC ISO 8601 and reports whether it's in the past. A timestamp with
**no timezone** is read as the server's local time and flagged with a warning —
include an explicit offset (`...Z` or `±HH:MM`) to be unambiguous.

### Observability (UNVERIFIED — pending live credential testing)

```
rate_limits()                                   // HTTP 429s observed per platform
analytics_fetch(platform: "instagram" | "facebook" | "threads", post_id: "...")
analytics_report(platform?, post_id?, limit?)   // stored engagement snapshots
```

`analytics_*` and `rate_limits` depend on live API behavior not yet exercised
against real credentials — the store and tools are real, live confirmation is
pending. X/TikTok/Bluesky analytics are not supported yet.
