# SPMC — Project Architecture

> Extracted from PROJECT_SPECIFICATIONS.md. Authoritative architecture reference.

## System Overview

SPMC is an MCP server + skills bundle. There is no UI at MVP. The agent is the interface.

```
spmc-server/              ← stdio MCP server (Node.js ESM)
├── index.js              ← server entry, tool dispatch
├── adapters/             ← one file per platform, no cross-dependencies
│   ├── x.js              ← X/Twitter OAuth 1.0a
│   ├── instagram.js      ← Meta Graph API v19 (+ getMetrics)
│   ├── tiktok.js         ← TikTok Content Posting API v2
│   ├── facebook.js       ← Meta Graph API v19 (Pages) (+ getMetrics)
│   ├── threads.js        ← Threads API (graph.threads.net) (+ getMetrics)
│   └── bluesky.js        ← AT Protocol (bsky.social)
├── lib/                  ← shared capability modules (added Beta-Prep)
│   ├── dispatch.js       ← single publish dispatcher (index + scheduler); audit hook
│   ├── specs.js          ← per-platform limits/rules; grapheme measure/slice/split
│   ├── validate.js       ← validate(platform, content) → {ok, errors, warnings}
│   ├── adapt.js          ← deterministic cross-platform content fitting
│   ├── config.js         ← credential-presence report (never returns values)
│   ├── schedule.js       ← scheduled_at ISO normalization (timezone required)
│   ├── audit.js          ← append-only JSONL publish trail
│   ├── ratelimit.js      ← observed-429 tally (heuristic, unverified)
│   ├── analytics.js      ← metric snapshot store + fetch router (unverified)
│   └── env.js / hash.js / paths.js
├── queue/
│   └── store.js          ← file-backed JSON queue (upgrades to SQLite later)
├── data/                 ← runtime state (audit.log, ratelimit/analytics json); gitignored
└── test/                 ← node:test unit suites + smoke.mjs (real-server MCP test)

skills/                   ← Claude Code SKILL.md files, one per platform + queue
AGENTS.md                 ← agent onboarding (proto-gear)
PROJECT_SPECIFICATIONS.md ← roadmap + vision
PROJECT_ARCHITECTURE.md   ← this file
.env.example              ← all required env vars
claude_desktop_config.json ← Claude Desktop App mcpServers entry
```

## Design Decisions

### Adapter pattern
Each platform lives in one file with named exports matching their semantic action (`post`, `postSingleTweet`, `postThread`, `postVideo`, `checkStatus`, and the additive `getMetrics`). Adding a new platform = add one adapter + one skill + one case in the dispatcher + one entry in `lib/specs.js`.

### Single dispatcher + hook point (Beta-Prep)
`lib/dispatch.js` is the one place that routes a `(platform, content, account)` to the right adapter. `index.js` and the scheduler both import it — previously each had its own copy and they had diverged (the scheduler dropped `account`, so scheduled multi-account posts published from the default account). `publishAudited()` wraps `publish()` with audit logging and rate-limit recording, so every publish path — direct tool, `queue_dispatch`, scheduler — produces one durable record. Summaries are formatted in the dispatcher, not per-caller.

### Validation as a verifiable substitute for live testing
`lib/specs.js` is the single source of truth for platform constraints; `lib/validate.js` checks payloads against it. `dry_run` runs validation and previews routing without calling any platform API. This exercises the full server path (validation → formatting → dispatch routing) with zero credentials — the safety net used while live credential testing is deferred.

### Agent-first content intelligence
`content_adapt` does only the deterministic residue (counting, grapheme-aware truncation, thread-splitting). The creative rewrite (tone, hashtags, per-channel voice) stays with the calling agent. Similarly, `scheduled_at` is normalized (timezone required) rather than parsed from natural language — the agent already knows the current time and produces an absolute timestamp.

### Unverified scaffolds, clearly marked
`lib/analytics.js` + adapter `getMetrics` and `lib/ratelimit.js` depend on live API behavior that has not been exercised. They are built (store, routing, tools) but labeled unverified in code and docs; the automatic backoff queue is intentionally not built yet.

### File-backed queue
`queue/store.js` uses a `queue.json` file in the same directory. Simple, portable, zero dependencies. Upgrade path: swap `store.js` for a SQLite-backed version in Phase 1; the interface is stable.

### Credentials
All secrets are env vars. The MCP server reads `process.env.*` at call time. Never stored in queue items or passed through tools. Claude Desktop injects them via the `env` block in `claude_desktop_config.json`.

### Tool surface
23 tools (Beta-Prep): 8 publishing/status + 5 content-intelligence (`content_validate`, `content_adapt`, `config_doctor`, `audit_log`, `schedule_check`) + 5 queue + 3 observability (`rate_limits`, `analytics_fetch`, `analytics_report`) + 2 media. The queue is intentionally decoupled from publishing — agents can queue and validate without credentials and dispatch when ready.

## Agent Integration Points

| Agent environment | Integration method |
|-------------------|--------------------|
| Claude Code | Skills in `skills/` directory |
| Claude Desktop App | `claude_desktop_config.json` mcpServers entry |
| Cursor / Windsurf | Same MCP config, different host config file location |
| Hermes | Reads AGENTS.md + uses MCP tools directly |
| Any MCP-compatible agent | `node spmc-server/index.js` via stdio |

## Phase 1 additions (post-MVP, do not build yet)

- Multi-account support: namespace env vars per account (e.g. `X_API_KEY_PERSONAL`, `X_API_KEY_BRAND`)
- SQLite queue with scheduling daemon
- Media pipeline: local file → CDN → public URL
- Analytics ingestion tools
