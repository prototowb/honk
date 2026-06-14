# Social Publishing Mission Control (SPMC)

> AI-native social publishing infrastructure. Built as a plugin system first, designed from the ground up for agent-driven workflows. No UI required to ship value.

---

## Vision

Competitors like Blotato bolt AI onto a traditional scheduling dashboard. SPMC inverts that: the agent _is_ the interface. Publishing flows through Claude, Hermes, and any MCP-compatible agent. A UI gets added on top of a working system, not before it.

Late-stage target: a multi-tenant SaaS that leaves Blotato, Buffer-AI, and Taplio behind by being the only tool that natively lives inside the agent's context rather than requiring the agent to call out to a separate product.

---

## Guiding Principles

1. **Agent-first, UI-optional** — Every feature ships as an MCP tool or skill first. UI is a rendering layer added later.
2. **One server, any agent** — The MCP server is the single source of truth. Claude Code, Claude Desktop, Cursor, Hermes, and any future agent all speak the same protocol.
3. **Platform adapters are plug-and-play** — Adding a new social platform means adding one adapter file and one skill file. Nothing else needs to change.
4. **Credentials never travel** — All secrets live in env vars. The server reads them; no agent ever touches a raw token.
5. **State is explicit** — Every post, queue item, and job has a persisted record. No fire-and-forget.

---

## Roadmap

### Phase 0 — MVP (current focus)
**Goal:** Working plugin for Claude Code + Claude Desktop App + Hermes. No UI.

- [ ] Consolidated MCP server (`spmc-server`) with all current platforms: X, Instagram, TikTok, Facebook, Threads, Bluesky
- [ ] Content queue: MCP tools to add, list, update, and clear queued posts
- [ ] Scheduling: queue items with `scheduled_at` timestamps; a poll-or-push dispatch mechanism
- [ ] Claude Code skills for each platform (ported from `_bkp`)
- [ ] Claude Desktop App `claude_desktop_config.json` entry
- [ ] AGENTS.md — canonical agent onboarding doc that any agent reads on first contact
- [ ] `.env.example` with all required vars documented
- [ ] Smoke test: publish one post to each platform end-to-end

**Deliverable:** Any agent that reads AGENTS.md can publish to all 6 platforms, queue content, and schedule posts — without any UI.

---

### Phase 1 — Alpha (private, us + Hermes)
**Goal:** Content intelligence layer. Start extracting signal from what we publish.

- [x] Multi-account support (multiple X accounts, multiple IG pages, etc.)
- [~] Post analytics ingestion: fetch engagement metrics, store locally — `analytics_fetch`/`analytics_report` + IG/FB/Threads adapter `getMetrics`. **Scaffold built; unverified against live APIs pending credential testing.**
- [x] AI content adaptation: `content_adapt` fits a source to each platform's hard limits (auto X thread-split, grapheme-aware truncation). The deterministic length-fitting is done in-server; per-channel tone/hashtag rewrite is left to the calling agent (agent-first by design).
- [x] Media pipeline: local image → Cloudinary/CDN → public URL
- [x] Hermes-specific skill pack: persona-aware publishing instructions for the Hermes agent
- [x] Scheduling correctness: `scheduled_at` is normalized to absolute UTC (`schedule_check` + `queue_add`). A timezone-less timestamp is accepted as **server-local** (correct on a local single-user server) but **flagged with a warning**, since it becomes ambiguous under hosted/multi-user deployment. Natural-language parsing is intentionally left to the agent, which already knows the current date/time.

---

### Phase 2 — Beta (closed, us + invited users)
**Goal:** Multi-user, hardened, instrumented.

- [ ] Auth layer: API key per user, scoped to their credential set _(deferred — pairs with multi-tenant/hosted, past the local-stdio stop line)_
- [ ] Per-user credential vault (encrypted at rest) _(deferred — same)_
- [ ] Analytics dashboard (first UI surface — read-only) **← UI stop line; planning not started**
- [ ] Content calendar view **← UI**
- [ ] Webhook ingest: receive platform webhooks (DMs, mentions) and surface them as MCP notifications _(deferred — needs a hosted listener)_
- [~] Rate-limit tracking across all platforms with automatic backoff queue — `rate_limits` tool tallies observed 429s today. **Observational only; automatic backoff queue not yet built.**
- [x] Audit log: every publish action recorded with timestamp, source, payload hash (`lib/audit.js` + `audit_log` tool)

> **Capability/UI boundary:** everything above the dashboard line is agent-first
> infrastructure and is largely in place. The dashboard, calendar, and the
> multi-tenant auth/vault/webhook items are the UI/hosted phase — intentionally
> not started.

---

### Phase 3 — SaaS (public)
**Goal:** Self-serve, monetized, competitive moat.

- [ ] Web app: full publishing UI (Next.js, shadcn/ui)
- [ ] Team workspaces: shared accounts, role-based access
- [ ] Subscription tiers (free: 1 user / 2 platforms; pro: unlimited; agency: multi-brand)
- [ ] Public API for third-party agent integrations
- [ ] AI content brief → full cross-platform campaign, one command
- [ ] Native integrations: Notion, Linear, Ghost, YouTube

---

## Architecture (MVP)

```
G:\Projects\_Plugins\
├── spmc-server/              ← MCP server (Node.js ESM)
│   ├── index.js              ← server entrypoint + tool dispatcher
│   ├── adapters/             ← one file per platform
│   │   ├── x.js
│   │   ├── instagram.js
│   │   ├── tiktok.js
│   │   ├── facebook.js
│   │   ├── threads.js
│   │   └── bluesky.js
│   ├── queue/
│   │   └── store.js          ← file-backed queue (JSON, upgrades to SQLite in Phase 1)
│   ├── scheduler/
│   │   └── index.js          ← polls queue, dispatches due posts
│   └── package.json
│
├── skills/                   ← Claude Code skill files (SKILL.md per platform)
│   ├── post-to-x/SKILL.md
│   ├── post-to-instagram/SKILL.md
│   ├── post-to-tiktok/SKILL.md
│   ├── post-to-facebook/SKILL.md
│   ├── post-to-threads/SKILL.md
│   ├── post-to-bluesky/SKILL.md
│   └── manage-queue/SKILL.md
│
├── AGENTS.md                 ← Single doc any agent reads to get fully operational
├── PROJECT_SPECIFICATIONS.md ← This file
├── .env.example              ← All required environment variables documented
└── claude_desktop_config.json ← Drop-in Claude Desktop App MCP config
```

---

## MCP Tools (MVP surface)

### Publishing tools (existing, ported)
| Tool | Platform | Input |
|------|----------|-------|
| `x_post_tweet` | X | `text` |
| `x_post_thread` | X | `tweets[]` |
| `instagram_post` | Instagram | `image_url`, `caption` |
| `tiktok_post_video` | TikTok | `video_url`, `caption`, `privacy_level?` |
| `tiktok_check_publish_status` | TikTok | `publish_id` |
| `facebook_post` | Facebook | `message`, `image_url?` |
| `threads_post` | Threads | `text`, `image_url?` |
| `bluesky_post` | Bluesky | `text` |

### Queue tools (new in MVP)
| Tool | Description | Input |
|------|-------------|-------|
| `queue_add` | Add a post to the content queue | `platform`, `content{}`, `scheduled_at?` |
| `queue_list` | List queued posts, optionally filtered | `status?`, `platform?` |
| `queue_update` | Update queue item status or content | `id`, `updates{}` |
| `queue_remove` | Remove an item from the queue | `id` |
| `queue_dispatch` | Immediately publish a queued item | `id` |

---

## Environment Variables

```
# X (Twitter) — OAuth 1.0a
X_API_KEY=
X_API_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_TOKEN_SECRET=

# Instagram / Facebook — Meta Graph API (shared EAA token)
INSTAGRAM_USER_ID=
INSTAGRAM_ACCESS_TOKEN=
FACEBOOK_PAGE_ID=
FACEBOOK_ACCESS_TOKEN=

# TikTok — Content Posting API
TIKTOK_ACCESS_TOKEN=

# Threads — Threads API
THREADS_USER_ID=
THREADS_ACCESS_TOKEN=

# Bluesky — AT Protocol app password (not account password)
BLUESKY_IDENTIFIER=
BLUESKY_APP_PASSWORD=
```

---

## Agent Integration Contract

Any agent (Claude, Hermes, future) MUST:
1. Read `AGENTS.md` before attempting any SPMC action
2. Use the MCP server tools exclusively — never call platform APIs directly
3. Confirm post content with the user before calling any publishing tool (unless explicitly operating in autonomous mode)
4. Report post URL + timestamp after every successful publish
5. Update queue item status after dispatching a queued post

---

## Competitive Positioning

| Feature | SPMC | Blotato | Buffer AI | Taplio |
|---------|------|---------|-----------|--------|
| MCP-native | ✅ | ❌ | ❌ | ❌ |
| Agent-first (no UI required) | ✅ | ❌ | ❌ | ❌ |
| Works inside Claude/Cursor | ✅ | ❌ | ❌ | ❌ |
| Open plugin architecture | ✅ | ❌ | ❌ | ❌ |
| Self-hosted option | ✅ | ❌ | ❌ | ❌ |
| AI content adaptation | Phase 1 | ✅ | Partial | ✅ |
| Analytics | Phase 2 | ✅ | ✅ | ✅ |
| Team workspaces | Phase 3 | ✅ | ✅ | Partial |

The moat is the MCP layer + agent-native workflow. Blotato can add AI to a dashboard; they cannot become an agent plugin without a rewrite.
