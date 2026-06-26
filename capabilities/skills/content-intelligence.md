---
name: content-intelligence
description: >
  Use when the user says "validate this post", "will this fit", "dry run",
  "preview without posting", "adapt this for all platforms", "make X/Bluesky
  versions", "check my SPMC setup", "which platforms are configured", "show the
  audit log", "what did we publish", "check this schedule time", "when should I
  post", "best time to post", "start a brief", "walk me through a post", "are we
  rate limited", or "fetch analytics".
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

For the **craft** of the post itself — engagement principles, the
hook→context→payoff→CTA structure, accessible sourcing, hashtag intent — see the
`content-craft` skill. This skill is the *tooling* around the writing; that one is
*how to write it*.

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

**Per-platform voice.** A brand often speaks a little differently per channel
(punchier on X, more hashtags on Instagram). Store those deltas in the kit's
`platforms` block and read the merged result for a channel with:

```
brand_voice(action: "get", platform: "x")
```

It returns the **effective voice** for that platform — base merged with the
overrides, marking which fields the platform layer changed. Overridable fields:
`tone`, `register`, `emoji_policy`, `audience`, `hashtags`, `cta`. A set override
**replaces** the base for that platform (a per-platform hashtag list replaces the
default list — it doesn't add to it). Set deltas with:

```
brand_voice(action: "set", profile: { platforms: { x: { tone: "punchier", hashtags: ["#dev"] } } })
```

When you're about to write for a specific platform, prefer the platform-resolved
get over the raw profile so per-channel deltas are already applied.

**Audience segments.** A brand also speaks differently to different *audiences* —
"enterprise buyers" vs "indie devs" — independent of platform. Store those as named
segments in the kit's `audiences` block and resolve one (optionally with a platform)
with:

```
brand_voice(action: "get", audience: "enterprise")          // audience layer only
brand_voice(action: "get", platform: "x", audience: "enterprise")  // both
```

Precedence is **base ▸ audience ▸ platform** — the platform is the hardest channel
constraint, so a per-platform delta wins over an audience delta on the same field
(set both `audiences.enterprise.hashtags` and `platforms.x.hashtags` and on X the
platform list wins). Selecting a segment sets the effective `audience` to the
segment name; a segment can set every field *except* `audience`. Set segments with:

```
brand_voice(action: "set", profile: { audiences: { enterprise: { tone: "measured", hashtags: ["#infosec"] } } })
```

If you pass an `audience` name that isn't a defined segment, the resolver falls back
to the base voice **and flags it** (so a typo never silently un-tailors a post) —
check the names it lists and fix the call.

**Content policy / guardrails.** The kit also carries a `policy` block — the
brand's safety layer. Honor it on every draft:

- `policy.banned_topics` — themes the brand will **not** post about (agent-judged,
  e.g. "competitor comparisons", "politics"). Treat these as hard "do not write
  about" rules; if a request lands on one, flag it and stop rather than draft it.
- `policy.disclosures.always` — strings every post must contain (e.g. `Ad`).
  Include them; `content_validate` warns if one is missing.
- `policy.disclosures.sponsored` — strings a **sponsored/paid** post must contain
  (e.g. `#ad`). When a post is sponsored, include them and publish with
  `sponsored: true` — a missing sponsored disclosure then **blocks** publishing.
- `policy.auto_publish` — `false` (the default) means **always confirm with the
  user before publishing**. Only when it is explicitly `true` may you publish
  without a per-post confirmation.

Set them once:

```
brand_voice(action: "set", profile: { policy: {
  banned_topics: ["competitor comparisons"],
  disclosures: { always: [], sponsored: ["#ad"] },
  auto_publish: false,
} })
```

**Multiple brands.** One install can run several brand accounts. Manage them through
`brand_voice`:

```
brand_voice(action: "list")                 // accounts (brand kits + credentialed), active marked
brand_voice(action: "use", account: "acme") // set the active account
brand_voice(action: "clone", account: "acme", to: "acme-eu")  // copy a kit as a starting point
```

`use` sets the **active account** that read tools default to (`brand_voice get`,
`brand_schema` with no `account`), so you don't restate it while working on one
brand. **Only those read tools follow the active pointer.** Everything that
produces brand-specific output stays explicit: when a non-default account is
active, pass `account:` to **`media_compose`** and **`link_tag`** too (they read
the *default* account otherwise — you'd get default-brand visuals/UTMs), and to
every **publish** call — and confirm the brand with the user (there is no
un-publish). Credentials are per account via `KEY__ACCOUNT` env vars (see
`config_doctor`); `list` unions brand kits with credentialed accounts so you see
the whole picture.

### Start a brief (optional guided intake)

```
brief_schema(account?)
```

Returns the per-run **content brief** field spec — angle, goal, platforms,
schedule, references, constraints — with each field's type, whether it's required,
its options, and which fields the brand kit already pre-fills. It's the per-run
delta on top of `brand_voice`. Use it to **walk the user through a pipeline one
field at a time** instead of asking for everything in one command (the
`idea-input` / `research-trends` skills do this in "guided mode"); it's the same
schema a future web UI renders as a form. Opt-in — skip it for a quick one-shot brief.

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
                 content: { /* same fields as the posting tool */ }, account?, sponsored?)
```

Returns blocking **errors** (over length, missing required field, bad media URL),
non-blocking **warnings** (near the limit), and **policy** notes from the brand
kit. Run this before `queue_add` or any publish tool. Length checks are
grapheme-aware for Bluesky. Pass `account` to check against that account's policy,
and `sponsored: true` to enforce its sponsored disclosures (a missing one becomes
an error). Publish tools accept the same `sponsored` flag.

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
