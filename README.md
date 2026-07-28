# Honk

AI-native MCP server for publishing to X, Instagram, TikTok, Facebook, Threads, and Bluesky.  
The agent is the interface — no UI required.

**MCP tools:** direct posting · content validation & cross-platform adaptation · dry-run previews · audit log · content queue · scheduler · media pipeline (compose + CDN upload) · brand voice/visual kit + multi-brand + account registry · asset registry (DAM) · workflow library · best-time-to-post · one-call pre-publish report · config + rate-limit + analytics introspection

---

## Credentials — do this first

All agent surfaces load credentials from the same file. Set it up once and every integration works:

```
Windows:     %USERPROFILE%\.claude\honk.env
macOS/Linux: ~/.claude/honk.env
```

Copy `.env.example` to that path and fill in your keys. This file survives reinstalls and is the primary location for all surfaces. (`~/.claude/spmc.env` — the pre-rename name — is still read as a transition fallback; a `honk-server/.env` fallback is also supported for local dev.)

---

## Claude App (Claude Code Plugin)

The project ships as a Claude Code plugin. When active, Claude Code:
- Loads the MCP server automatically via `.mcp.json`
- Discovers and activates the 15 skills in `skills/`

**Setup:**

1. Run `npm install` inside `honk-server/`
2. Add credentials to `~/.claude/honk.env`
3. Load the plugin in Claude Code (the `.claude-plugin/plugin.json` and `.mcp.json` are auto-read from the project root)

**How it works:**

`.mcp.json` declares the server connection using `${CLAUDE_PLUGIN_ROOT}` — Claude Code resolves this to wherever the plugin lives, so no path hardcoding is needed. Credentials flow in as `${VAR}` placeholders resolved from the running environment.

**Skills (`skills/`)** — three layers of one plugin:

*Publishing engine — route to tools on the `honk` MCP server:*

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
| `brand-setup` | "set up my brand kit", "configure my voice/visual identity" |

*Craft — a cross-cutting skill consulted by the platform + pipeline skills, not a pipeline stage of its own:*

| Skill | Purpose |
|-------|---------|
| `content-craft` | Platform-native engagement structure (hook → context → payoff → CTA), accessible source attribution, hashtag intent, carousel arc |

The pipeline produces platform-native content and hands it to the Honk queue; the publishing-engine skills then schedule and publish it. See **Content Pipeline** below for the end-to-end workflow.

---

## Content Pipeline (creative layer)

Honk is three layers of one plugin: the **publishing engine** (the `honk` MCP tools + their skills), the **content pipeline** — an agent-side creative workflow that turns an idea or a trend into platform-native content, then hands it to the queue — and the **brand kit** (`brand_voice`/`brand_schema`/`brand-setup`), a persistent profile the pipeline and platform skills read so drafts already match your voice, visual identity, and guardrails. The pipeline does creative work, not schema-driven work, so it lives entirely in skills (no server tools of its own, aside from `workflow_list` offering named starters).

**Path A — manual idea:**

```
/idea-input            describe the idea (topic, audience, tone, references) — or pick a workflow_list entry
  ↓
/pipeline-orchestrator concepts → editorial review (content-craft) → platform-native content
  ↓
/output-manager        generate platform visuals (+ logo overlay, brand-kit identity)
  ↓
/manage-queue           content_check → review, schedule, dispatch  →  publishing engine
```

**Path B — trend research (automated):** swap the first step for `/research-trends`, which surveys Google Trends, Reddit, news, and social hashtags, selects a promising angle, and emits a pipeline-ready brief — then continues through the same orchestrator → visuals → queue path.

**Scheduling:** both paths are schedulable — run trend research daily for a timely queue, mix in manual ideas for specific angles, and let the Honk scheduler auto-dispatch queued items when their `scheduled_at` arrives. All paths feed the same queue.

---

## Claude Desktop App

Merge the `mcpServers` block into your Claude Desktop config file:

| OS | Path |
|----|------|
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |

```json
{
  "mcpServers": {
    "honk": {
      "command": "node",
      "args": ["C:\\path\\to\\honk-server\\run.js"]
    }
  }
}
```

**With scheduler** (auto-dispatches scheduled queue items every 60s, plus the ~24h auto-analytics follow-up):  
Replace `run.js` with `start.js`. The scheduler runs as a background child process and logs to `~/.claude/honk-scheduler.log`.

Credentials load automatically from `~/.claude/honk.env` at startup — do not put raw secrets in the Desktop config.

Restart Claude Desktop after editing the config. The `honk` server appears in the MCP connections panel and all Honk tools are immediately available.

---

## Bring-Your-Own Agent (Hermes, OpenClaw, CLI agents)

Any LLM agent outside the Claude plugin ecosystem gets a self-contained,
**generic** integration pack in `agent/` — an operating briefing, a skill-trigger
map, and a default persona. Hermes is the reference instance; the same pack drives
any BYO agent (point your own at these files).

| File | Purpose |
|------|---------|
| `agent/mcp-config.json` | Drop-in MCP server connection block |
| `agent/CONTEXT.md` | Full operational briefing: the full tool catalog (publishing, content-intelligence, brand kit, assets, queue, observability, media — generator-injected), return values, platform gotchas, credential loading |
| `agent/SKILLS.md` | Trigger → tool reference for every platform + brand/asset management + queue management + multi-platform campaigns |
| `agent/persona.md` | Pre-publish checklist, voice/tone defaults, confirmation vs. autonomous behavior rules (the default persona; override per agent) |

**Connect:**

Drop this into your agent's MCP config (update the path to match your clone):

```json
{
  "mcpServers": {
    "honk": {
      "command": "node",
      "args": ["C:\\path\\to\\honk-server\\run.js"]
    }
  }
}
```

Or reference `agent/mcp-config.json` directly if your agent supports file-based MCP configs.

**Onboarding:**  
On first contact, point the agent at `agent/CONTEXT.md`. It's written to be read once and then operated from — no external files required during a session. `agent/SKILLS.md` gives the agent its trigger mappings; `agent/persona.md` defines the publishing persona and what requires user confirmation.

**What the agent operates autonomously (no confirmation needed):**
- Reading the queue (`queue_list`), audit log, brand kit, and asset registry
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
    "honk": {
      "command": "node",
      "args": ["/absolute/path/to/honk-server/run.js"]
    }
  }
}
```

Server name: `honk`. All Honk tools are listed on `tools/list` with full JSON Schema definitions.

If your client is itself an **agent** (not just a raw tool caller), give it the same briefing as any BYO agent — `agent/CONTEXT.md` + `agent/SKILLS.md` — so it knows the platform gotchas, return shapes, and trigger phrases, not just the raw tool list.

**Credentials:** three options in priority order:
1. `~/.claude/honk.env` — file-based, auto-loaded on startup (`~/.claude/spmc.env` read as a legacy-name fallback)
2. `honk-server/.env` — local dev fallback
3. Inherited from environment — if none of the above exist, the server uses `process.env` directly

**With scheduler:**  
Use `start.js` instead of `run.js`. The scheduler spawns as a background process and logs to `~/.claude/honk-scheduler.log` — this directory must exist. If running outside a Claude environment, change the log path in `honk-server/start.js` or run the scheduler separately:

```bash
node honk-server/scheduler/index.js
```

---

## Global / CLI install (from a local clone)

There's no plan to publish `honk` to the public npm registry (see `PROJECT_STATUS.md` → *Descoped*). The package is still fully npm-structured — install it globally from your own clone and any config can reference it without a repo path.

**Install globally:**
```bash
git clone https://github.com/prototowb/honk.git
cd honk/honk-server
npm install
npm install -g .
```

**Run** (two bins):
```bash
honk                       # MCP server only (stdio)
honk-start                 # MCP server + scheduler daemon (auto-dispatch + auto-analytics)
```

**Config block (any client), after a global install:**
```json
{
  "command": "honk-start"
}
```

Credentials load from `~/.claude/honk.env` automatically. No path hardcoding needed once installed globally.

**Scheduler:** the `honk` bin runs the MCP server only. For auto-dispatch of
scheduled posts **and** the ~24h auto-analytics follow-up to fire, use the
**`honk-start`** bin (MCP server + scheduler daemon) as the entry point instead.
The scheduler logs to `~/.claude/honk-scheduler.log` (that directory must exist).

---

## Quick Reference

| Surface | Entry point | Skills | Credentials |
|---------|------------|--------|-------------|
| Claude Code plugin | `.mcp.json` → `run.js` | `skills/` (auto-loaded) | `.mcp.json` `${VAR}` → env |
| Claude Desktop | `claude_desktop_config.json` | — | `~/.claude/honk.env` |
| BYO agent (Hermes, etc.) | `agent/mcp-config.json` | `agent/SKILLS.md` | `~/.claude/honk.env` or env |
| OpenClaw / other | stdio `node run.js` | `agent/SKILLS.md` (if agent) | `~/.claude/honk.env` or env |
| CLI / global install | `honk` / `honk-start` | — | `~/.claude/honk.env` or env |

**`run.js`** (bin: `honk`) — MCP server only  
**`start.js`** (bin: `honk-start`) — MCP server + scheduler daemon (use this for always-on surfaces like Claude Desktop)

---

## MCP Tools

<!-- gen:tools:start -->
_35 tools — generated from `lib/tools.js` + `lib/specs.js`. Do not edit between these markers; run `npm run build`._

### Publishing & status

| Tool | Required | Optional | Platform limit | Description |
|------|----------|----------|----------------|-------------|
| `x_post_tweet` | `text` (string) | `account` (string), `dry_run` (boolean), `sponsored` (boolean) | 280 chars | Post a single tweet to X (Twitter). Max 280 characters. [Experimental: never verified against the live API — no credentials available. Adapter is unit/smoke-tested only.] |
| `x_post_thread` | `tweets` (array) | `account` (string), `dry_run` (boolean), `sponsored` (boolean) | — | Post a thread of tweets to X. Each array item is one tweet, chained as replies. [Experimental: never verified against the live API — no credentials available. Adapter is unit/smoke-tested only.] |
| `instagram_post` | `caption` (string) | `image_url` (string), `image_urls` (array), `alt_text` (string), `alt_texts` (array), `first_comment` (string), `account` (string), `dry_run` (boolean), `sponsored` (boolean) | 2200 chars | Post to Instagram. Provide image_url for a single image, OR image_urls (2–10 public URLs) for a carousel. Requires publicly accessible image URL(s). |
| `tiktok_post_video` | `video_url` (string), `caption` (string) | `privacy_level` (string), `account` (string), `dry_run` (boolean), `sponsored` (boolean) | 2200 chars | Post a video to TikTok (PULL_FROM_URL). Until your app passes audit, posts land as private/self-only regardless of privacy_level. [Experimental: never verified against the live API — no credentials available. Adapter is unit/smoke-tested only.] |
| `tiktok_check_publish_status` | `publish_id` (string) | `account` (string) | — | Check the async publish status of a TikTok video post. [Experimental: never verified against the live API — no credentials available. Adapter is unit/smoke-tested only.] |
| `facebook_post` | `message` (string) | `image_url` (string), `alt_text` (string), `first_comment` (string), `account` (string), `dry_run` (boolean), `sponsored` (boolean) | 63206 chars | Post to a Facebook Page feed. Optionally attach a public image URL to post as a photo. |
| `threads_post` | `text` (string) | `image_url` (string), `alt_text` (string), `account` (string), `dry_run` (boolean), `sponsored` (boolean) | 500 chars | Post text (optionally with an image) to Threads. [Experimental: never verified against the live API — no credentials available. Adapter is unit/smoke-tested only.] |
| `bluesky_post` | `text` (string) | `account` (string), `dry_run` (boolean), `sponsored` (boolean) | 300 graphemes | Post text to Bluesky via the AT Protocol. No OAuth — just an app password. [Experimental: never verified against the live API — no credentials available. Adapter is unit/smoke-tested only.] |

### Content intelligence

| Tool | Required | Optional | Platform limit | Description |
|------|----------|----------|----------------|-------------|
| `content_validate` | `platform` (string), `content` (object) | `account` (string), `sponsored` (boolean) | — | Validate a post payload against a platform's rules (length, required fields, media) AND the brand kit's content policy (required disclosures, banned-topic reminders) without publishing. Returns blocking errors, warnings, and policy notes. Use before queuing or posting. |
| `content_check` | `platform` (string), `content` (object) | `account` (string), `sponsored` (boolean), `scheduled_at` (string), `within_hours` (number) | — | One-call pre-publish report — runs every deterministic gate at once (platform rules + brand policy/disclosures, duplicate guard vs recent publishes, schedule sanity if scheduled_at is given) and returns a single pass/warn/block verdict, followed by the agent-judged checklist (structure, followable sourcing, right account, brand fit, user confirmation) the server cannot verify. Use it as the final review before queue_add or publishing instead of calling content_validate + duplicate_check + schedule_check separately. A block here WILL be enforced by the dispatch gate; warnings are yours to resolve or accept deliberately. |
| `content_adapt` | `text` (string) | `platforms` (array) | — | Fit one source text to multiple platforms' hard limits: auto-splits a long post into an X thread, grapheme-truncates for Bluesky, etc. Returns ready-to-post content per platform plus warnings. This handles the deterministic length-fitting only — rewrite tone/hashtags yourself before posting. |
| `config_doctor` | — | — | — | Report which platforms and named accounts have credentials configured (by env-var presence only — never reveals values), plus media providers. Use to check setup before publishing. |
| `account_info` | `platform` (string) | `account` (string), `seed_brand_kit` (boolean) | — | Fetch the connected account profile (handle, display name, avatar URL) for a platform. Read-only — confirms which account is wired up and supplies branding assets. Supported: instagram, facebook (Graph API). Pass seed_brand_kit:true to merge the fetched handle + avatar URL into the active brand account's visual block. |
| `brand_voice` | — | `action` (string), `profile` (object), `replace` (boolean), `account` (string), `to` (string), `platform` (string), `audience` (string) | — | Get or set the brand kit, and manage multiple brand accounts — a persistent profile (voice: tone, audience, hashtag sets, emoji/banned-word policy, CTA library, UTM rules; plus a visual identity block: accent/bg/surface/heading/body colors, logo, icon, handle, default template; plus per-platform voice deltas; plus named audience segments; plus a content policy: banned topics, required disclosures, auto-publish) that the content skills read so drafts match your voice, composed images match your look, and posts respect your guardrails without re-specifying it each time. Per account (omit account for the default). Content config, not secrets. Call with action:"get" first to see the current profile; if it is empty, offer guided setup (see brand_schema / the brand-setup skill). Pass a platform and/or audience with action:"get" to see the effective voice resolved for it (base merged with audience-segment, then per-platform, overrides — precedence base ▸ audience ▸ platform). Multi-brand: action:"list" enumerates accounts (brand profiles + credentialed accounts) and marks the active one; action:"use" sets the active account (reads default to it — get/brand_schema — but publishing stays explicit, so always confirm the brand before posting); action:"clone" copies a profile to a new account key (to:) as a starting point. |
| `link_tag` | `url` (string) | `params` (object), `platform` (string), `account` (string) | — | Add UTM/campaign query params to a URL for click attribution. Merges the brand kit's links.utm_defaults under your overrides; a value containing {platform} is substituted with the given platform. Returns the tagged URL. Deterministic, credential-free. |
| `duplicate_check` | `platform` (string), `content` (object) | `within_hours` (number) | — | Check whether identical content was already published to a platform recently — matches the content hash against the audit log of successful publishes. Returns the prior publish if found. Run before publishing to avoid an accidental repost (there is no un-publish). |
| `best_time` | `platform` (string) | `count` (number), `account` (string) | — | Suggest the best times to post on a platform, ranked, in audience-local time with a short rationale per window. Credential-free. Uses research-backed engagement windows as a baseline and will blend in the account's own analytics history once enough accrues. Schedule a suggestion via queue_add with an explicit timezone offset. |
| `brief_schema` | — | `account` (string) | — | Return the per-run content-brief field schema — the single source for guided-mode intake and the future web-UI form. The brief is the per-run delta on top of the persistent brand kit (voice/audience/hashtags); this lists only what a run needs (angle, goal, platforms, schedule, references, constraints) with each field's type, required-ness, options, and which fields the brand kit pre-fills. Pass an account to annotate its brand-kit pre-fills. Use it to drive an optional guided intake instead of asking for everything at once. |
| `workflow_list` | — | `name` (string) | — | List the workflow library — named, reusable workflow starters (weekly-insight, product-update, engagement-spark) that replace hand-written per-session prompts. Each entry declares its required inputs (brief_schema field keys the user supplies in guided mode, each delegable with "you pick"), the defaults it assumes when un-guided, per-platform format suggestions, and which skills/tools it activates. Pass name to see one entry in full. Use it to offer the user a pick-list at session start (guided mode) or to select an entry yourself from context (un-guided) — say which entry and which defaults you chose. Supervised vs autonomous comes from the brand policy auto_publish at call time, never from the entry. |
| `brand_schema` | — | `account` (string) | — | Return the brand-kit field schema with the current values for an account — the single source for guided brand setup (the brand-setup skill) and the future web-UI settings form. Lists the persistent fields a brand kit holds (voice tone/audience, visual identity: accent/bg/surface/heading/body colors + logo/icon/handle/default-template, hashtags, CTAs, notes) grouped, with type/options/help, which are recommended, and what is already set. Call it to drive guided setup (collect the empty recommended fields one at a time) or to show a brand-settings overview. Writes go through brand_voice(action:"set"). The companion to brief_schema (per-run) — this is the persistent layer. |
| `audit_log` | — | `platform` (string), `status` (string), `source` (string), `limit` (number) | — | Read the publish audit trail: every publish, failure, and dry-run with timestamp, platform, account, content hash, and result. Filter by platform/status/source. |
| `schedule_check` | `scheduled_at` (string) | — | — | Validate and normalize a scheduled_at timestamp to canonical UTC ISO 8601. A timestamp without an explicit timezone is interpreted as the server's local time and flagged with a warning (it becomes ambiguous under hosted/multi-user deployment). Returns the normalized value and whether it is in the past. |
| `asset_list` | — | `query` (string), `source` (string), `tag` (string), `account` (string), `template` (string), `expired` (boolean), `used` (boolean), `limit` (number) | — | List/inspect the asset registry — every media_compose / media_upload output is recorded automatically (URL, content hash, dimensions, rights/expiry, usage per post). Filter by source/tag/account/template/expired/used, or pass query (id, hash, or URL) for one asset's full record. Reuse a registered URL in drafts instead of re-uploading identical media. |
| `asset_update` | `id` (string) | `rights_note` (string), `rights_expires_at` (string), `add_tags` (array), `remove_tags` (array) | — | Set rights/expiry and tags on a registered asset (addressed by id, hash, or URL). A past rights expiry produces a deterministic WARNING in content_check and on the dispatch summary — publishing is never blocked; the judgment stays with you. |

### Observability

| Tool | Required | Optional | Platform limit | Description |
|------|----------|----------|----------------|-------------|
| `rate_limits` | — | — | — | Show rate-limit responses (HTTP 429) observed per platform, tallied from publish errors. Observational only — does not yet gate sending. |
| `analytics_fetch` | `platform` (string), `post_id` (string) | `account` (string) | — | Fetch engagement metrics for a published post and store a timestamped snapshot. Supported: instagram, facebook, threads (Graph insights). Requires the platform post/media ID. NOTE: unverified against live APIs pending credential testing. |
| `analytics_report` | — | `platform` (string), `post_id` (string), `limit` (number) | — | Read stored engagement snapshots, most recent first. Filter by platform or post_id. |
| `analytics_performance` | — | `platform` (string), `account` (string), `limit` (number) | — | Aggregate stored analytics snapshots into a performance rollup: ranks posts by an engagement score (sum of non-exposure metrics — reach/views/impressions excluded since they measure exposure, not response) and joins each post to its media_compose template via the asset registry (post_id), so you can see which template tends to perform better. Answers "which post/template converts" without hand-cross-referencing analytics_report and asset_list. Directional only while sample size is small — treat as a signal, not a verdict. Filter by platform/account. |

### Queue

| Tool | Required | Optional | Platform limit | Description |
|------|----------|----------|----------------|-------------|
| `queue_add` | `platform` (string), `content` (object) | `scheduled_at` (string), `account` (string), `sponsored` (boolean), `draft` (boolean) | — | Add a post to the content queue. Optionally schedule it with scheduled_at (ISO 8601; include a timezone offset to be unambiguous — a naive time is read as server-local and warned). Content is validated; warnings are returned but do not block queuing. A sponsored post stores its flag and is re-checked against the brand policy at dispatch — a missing sponsored disclosure blocks the dispatch (queue_dispatch and the scheduler), not just the direct tools. |
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

**Notes:**

- Every publishing tool (and `queue_dispatch`) accepts **`dry_run: true`** — it validates the payload and previews routing without sending, and records a `dry_run` audit entry. Use it to rehearse a post before going live.
- Queue status lifecycle: `draft` → `pending` → `dispatched` → `published` | `failed`.
- Media templates: `square-dark` (1080×1080) · `square-tall` (1080×1350) · `story-dark` (1080×1920) · `banner-wide` (1200×628) · `square-news` (1080×1080, carousel slide). CDN: Cloudinary (images + video) auto-selected; imgbb fallback (images only).
- **Unverified:** `analytics_*` and `rate_limits` depend on live API behavior; IG/FB are live-verified (INIT-010/011), Threads/TikTok/Bluesky are descoped indefinitely (no credentials — see `PROJECT_STATUS.md` *Descoped*) and their publish tools carry an explicit experimental flag in their descriptions.

---

## Credentials Reference

| Platform | Required vars | Notes |
|----------|--------------|-------|
| X | `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET` | OAuth 1.0a. Regenerate tokens after changing app permissions. Publish path is descoped (API tier credit-blocked, 402) — adapter is unit/smoke-tested only. |
| Instagram | `INSTAGRAM_USER_ID`, `INSTAGRAM_ACCESS_TOKEN` | `EAA…` token (Facebook Login for Business), not `IGAA…`. Requires linked FB Page. Live-verified. |
| Facebook | `FACEBOOK_PAGE_ID`, `FACEBOOK_ACCESS_TOKEN` | Same `EAA…` token as Instagram with `pages_manage_posts` scope. Live-verified. |
| TikTok | `TIKTOK_ACCESS_TOKEN` | `video.publish` scope. Posts are `SELF_ONLY` until app passes TikTok audit. Descoped — no credentials. |
| Threads | `THREADS_USER_ID`, `THREADS_ACCESS_TOKEN` | Separate app from Instagram — own token via `graph.threads.net`. Descoped — no credentials. |
| Bluesky | `BLUESKY_IDENTIFIER`, `BLUESKY_APP_PASSWORD` | No OAuth. Generate at bsky.app/settings/app-passwords. Descoped — no credentials. |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Used by `media_compose` and `media_upload`. |
| imgbb | `IMGBB_API_KEY` | Fallback CDN for images only. |

**Multi-account:** suffix any credential key with `__ACCOUNTNAME` and pass `account: "name"` to any tool. See `.env.example` for examples.

---

## Platform Gotchas

**X** — Tokens need Read+Write permissions set in the developer portal. Regenerate after changing permission level; the existing token won't gain the new scope. Counting: URLs always count as 23 characters regardless of length, and emoji above U+FFFF count as 2. Publish path is currently descoped (see above).

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

skills/                   Claude Code SKILL.md files (15 total: 9 publishing + 5 pipeline + 1 craft)
agent/                    Bring-your-own-agent integration pack (Hermes, OpenClaw, …)
  mcp-config.json
  CONTEXT.md
  SKILLS.md
  persona.md

honk-server/
  run.js                  Entry point: load creds → start MCP server
  start.js                Entry point: spawn scheduler → start MCP server
  index.js                MCP server (all tool definitions)
  src/                    TypeScript source (compiles to the paths below via `npm run build:ts`)
  adapters/               One file per platform (6 total) + getMetrics (IG/FB/Threads)
  lib/                    Dispatcher, specs, validate, adapt, config, schedule, audit, analytics,
                          brand kit, account registry, asset registry, workflows, policy gate, …
  queue/store.js          File-backed JSON queue
  scheduler/              Scheduler daemon (polls every 60s)
  media/                  Compose + upload pipeline
  data/                   Runtime state (audit log, brand kit, registries, …) — gitignored
  test/                   node:test unit suites + smoke.mjs + pack-smoke.mjs
  package.json            npm package (bin: honk → run.js, honk-start → start.js)
```

**Tests:** `cd honk-server && npm test` (180 unit) · `npm run test:smoke` (49-check, drives the real server over MCP) · `npm run pack:smoke` (packs + installs + boots the tarball).

Full specification: `PROJECT_SPECIFICATIONS.md`
