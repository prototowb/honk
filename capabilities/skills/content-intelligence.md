---
name: content-intelligence
description: >
  Use when the user says "validate this post", "will this fit", "dry run",
  "preview without posting", "adapt this for all platforms", "make X/Bluesky
  versions", "check my SPMC setup", "which platforms are configured", "show the
  audit log", "what did we publish", "check this schedule time", "when should I
  post", "best time to post", "are we rate limited", or "fetch analytics".
  Credential-free content prep, validation, and introspection tools on the spmc
  MCP server — use them before and around publishing.
metadata:
  version: "0.2.0"
  mcp_server: spmc
---

## Content Intelligence & Introspection

Tools on the `spmc` MCP server. None of these publish; all but the analytics
fetch run without platform credentials. Use them to prepare and check content
before calling a publishing tool.

### Brand voice — consult first

Before drafting anything, read the brand kit:

```
brand_voice(action: "get", account?)
```

It returns a persistent profile — tone, audience, register, emoji policy,
**banned words**, hashtag sets, a CTA library, and default UTM/link rules — so
every draft matches the user's voice without re-asking. Apply it: match the
tone/register, honor the emoji policy, avoid banned words, and pull hashtags
from the named sets. Per-account (`account: "brand"` vs the default).

Capture or update it as you learn the voice (deep-merges; arrays replace):

```
brand_voice(action: "set", profile: { voice: { tone: "concise, dry", banned_words: ["synergy"] },
                                       hashtags: { default: ["#buildinpublic"] } })
```

This is content config, not secrets — it never holds tokens. If no profile is
set, `get` returns the empty shape so you know which fields to fill.

### Tag links for attribution

```
link_tag(url, params?, platform?, account?)
```

Adds UTM/campaign params to a URL so clicks are attributable. It merges the brand
kit's `links.utm_defaults` **under** your `params`, and substitutes `{platform}`
in any value (e.g. a default `utm_source: "{platform}"` becomes `utm_source=x`).
Existing query params and the fragment are preserved. Set the defaults once via
`brand_voice(action:"set", profile:{ links:{ utm_defaults:{...} } })`.

### Validate before publishing

```
content_validate(platform: "x" | "instagram" | "tiktok" | "facebook" | "threads" | "bluesky",
                 content: { /* same fields as the posting tool */ })
```

Returns blocking **errors** (over length, missing required field, bad media URL)
and non-blocking **warnings** (near the limit). Run this before `queue_add` or any
publish tool. Length checks are grapheme-aware for Bluesky.

### Guard against accidental reposts

```
duplicate_check(platform, content, within_hours?)
```

Matches the content hash against the audit log of **successful** publishes and
reports any identical recent post (default lookback 168h / 7 days). There is no
un-publish — run this before publishing, and if it flags a match, confirm with
the user that a repost is intended.

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

### Suggest when to post

```
best_time(platform, count?, account?)
```

Returns ranked posting windows for a platform — day + audience-local time, each
with a short rationale. Use it when the user asks when to post or hands you a
draft without a time. It's a research-backed baseline today (it will fold in the
account's own analytics once enough history accrues), so present it as guidance,
not gospel. To act on a suggestion, schedule it with `queue_add(scheduled_at:
...)` using an **explicit timezone offset** (then `schedule_check` to confirm the
instant).

### Observability (UNVERIFIED — pending live credential testing)

```
rate_limits()                                   // HTTP 429s observed per platform
analytics_fetch(platform: "instagram" | "facebook" | "threads", post_id: "...")
analytics_report(platform?, post_id?, limit?)   // stored engagement snapshots
```

`analytics_*` and `rate_limits` depend on live API behavior not yet exercised
against real credentials — the store and tools are real, live confirmation is
pending. X/TikTok/Bluesky analytics are not supported yet.

**Auto-follow-up:** after any real publish to IG/FB/Threads, the server queues a
metrics fetch ~24h later (so a post has time to accumulate engagement). The
**scheduler** must be running (`start.js`) to drain it — `run.js` alone schedules
the job but won't fetch. Read the results later with `analytics_report`.
