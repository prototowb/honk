# Honk — Project Architecture

> Extracted from PROJECT_SPECIFICATIONS.md. Authoritative architecture reference.

## System Overview

Honk is an MCP server + skills bundle. There is no UI at MVP. The agent is the interface.

```
honk-server/              ← stdio MCP server (Node.js ESM)
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

# ── single origin: hand-authored sources (edit here) ─────────────────────
build/generate.mjs        ← the generator (zero deps); emits every artifact below
capabilities/             ← hand-authored skill + agent prose — the ONLY place
  skills/<name>.md          humans edit skill copy; carries {{limit|unit|tool}}
  agent/SKILLS.md           tokens resolved against the machine facts at build
honk-server/lib/{tools,specs,config}.js + package.json  ← machine facts (see above)

# ── generated: DO NOT EDIT — run `npm run build` ─────────────────────────
TOOLS.md                  ← tool catalog
.claude-plugin/plugin.json ← plugin manifest (version ← honk-server/package.json)
skills/<name>/SKILL.md    ← 13 Claude Code skills (tokens resolved)
.mcp.json                 ← Claude Code plugin MCP declaration (${CLAUDE_PLUGIN_ROOT})
agent/CONTEXT.md          ← tool table injected between <!-- gen:tools --> markers
agent/SKILLS.md           ← agent skill triggers
agent/mcp-config.json     ← machine-local absolute path; built, NOT --check'd (see below)
claude_desktop_config.json ← Claude Desktop manual-fallback config (npx)
README.md                 ← tool tables injected between <!-- gen:tools --> markers

# ── hand-authored, build-checked for completeness ────────────────────────
.env.example              ← all credential env vars; build fails if one is missing

# ── docs (hand-authored) ─────────────────────────────────────────────────
AGENTS.md · PROJECT_SPECIFICATIONS.md · PROJECT_ARCHITECTURE.md (this file)
```

## Design Decisions

### Adapter pattern
Each platform lives in one file with named exports matching their semantic action (`post`, `postSingleTweet`, `postThread`, `postVideo`, `checkStatus`, and the additive `getMetrics`). Adding a new platform = add one adapter + one skill + one case in the dispatcher + one entry in `lib/specs.js`.

### Single dispatcher + hook point (Beta-Prep)
`lib/dispatch.js` is the one place that routes a `(platform, content, account)` to the right adapter. `index.js` and the scheduler both import it — previously each had its own copy and they had diverged (the scheduler dropped `account`, so scheduled multi-account posts published from the default account). `publishAudited()` wraps `publish()` with audit logging and rate-limit recording, so every publish path — direct tool, `queue_dispatch`, scheduler — produces one durable record. Summaries are formatted in the dispatcher, not per-caller.

### Validation as a verifiable substitute for live testing
`lib/specs.js` is the single source of truth for platform constraints; `lib/validate.js` checks payloads against it. `dry_run` runs validation and previews routing without calling any platform API. This exercises the full server path (validation → formatting → dispatch routing) with zero credentials — the safety net used while live credential testing is deferred.

### Agent-first content intelligence
`content_adapt` does only the deterministic residue (counting, grapheme-aware truncation, thread-splitting). The creative rewrite (tone, hashtags, per-channel voice) stays with the calling agent. Similarly, `scheduled_at` is normalized to absolute UTC rather than parsed from natural language — the agent already knows the current time. A timezone-less timestamp is accepted as server-local (correct for the local single-user server) but warned, since it would be ambiguous once hosted/multi-tenant.

### Unverified scaffolds, clearly marked
`lib/analytics.js` + adapter `getMetrics` and `lib/ratelimit.js` depend on live API behavior that has not been exercised. They are built (store, routing, tools) but labeled unverified in code and docs; the automatic backoff queue is intentionally not built yet.

### File-backed queue
`queue/store.js` uses a `queue.json` file in the same directory. Simple, portable, zero dependencies. Upgrade path: swap `store.js` for a SQLite-backed version in Phase 1; the interface is stable.

### Credentials
All secrets are env vars. The MCP server reads `process.env.*` at call time. Never stored in queue items or passed through tools. Claude Desktop injects them via the `env` block in `claude_desktop_config.json`.

### Tool surface
23 tools (Beta-Prep): 8 publishing/status + 5 content-intelligence (`content_validate`, `content_adapt`, `config_doctor`, `audit_log`, `schedule_check`) + 5 queue + 3 observability (`rate_limits`, `analytics_fetch`, `analytics_report`) + 2 media. The queue is intentionally decoupled from publishing — agents can queue and validate without credentials and dispatch when ready.

### Single origin + generated distribution (BUILD-001)
The runtime already had one origin (one dispatcher, one specs file). The *distribution surface* did not — the same tool names, limits, credential keys, and version were re-typed by hand into ~11 files and drifted (MCP configs in three divergent shapes, limit values copied not referenced, the version string disagreeing across three files). BUILD-001 gives every fact **one home** and *generates* everything downstream.

- **Two source halves.** Machine facts live in runtime code — `honk-server/lib/tools.js` (tool schemas), `lib/specs.js` (`PLATFORM_SPECS` limits), `lib/config.js` (`MEDIA_PROVIDERS`), and `package.json` (name/version/metadata). Prose lives once in `capabilities/` (skill copy + agent triggers). `build/generate.mjs` imports the runtime modules directly, so generated docs **cannot drift from what the server actually serves over MCP**.
- **Tokens bind prose to facts.** `capabilities/*.md` carry `{{limit:bluesky.text.max}}` → `300`, `{{unit:bluesky.text}}` → `graphemes`, `{{tool:bluesky_post}}` → validated tool name. Resolution is a 1:1 `PLATFORM_SPECS` object-path lookup with no aliases; any bad path / unknown tool / stray `{{` **fails the build**.
- **The generator is the choke point**, so it enforces invariants for free: Agent-Skills name rules (≤64 chars, lowercase/digits/hyphens, no `claude`/`anthropic`), one version origin (`package.json` → `plugin.json` + the runtime `Server({ version })`, retiring the old `0.1.0` vs `0.1.0-alpha.1` split), and MCP-config uniformity (all three render from one `mcpConfig()` template, so the "same server, three shapes" defect can't recur).
- **`build:check` is the authority.** It regenerates in memory and **fails on any difference** — a hand-edited generated file, or a tool/limit/credential added without rebuilding. Wired into CI (`.github/workflows/ci.yml`) and an opt-in pre-commit hook (`.githooks/pre-commit`, enable with `git config core.hooksPath .githooks`). Generated artifacts are committed (a fresh clone works without building) and pinned `eol=lf` via `.gitattributes` so CRLF conversion never reports spurious drift. The build adds **zero** dependencies.
- **Two deliberate exceptions.** (1) `agent/mcp-config.json` is built but **not** `--check`'d (`localOnly`): its only variable part is the machine's absolute install path — environment, not origin — so it can't be byte-stable across checkouts; its *shape* is still verified through the shared `mcpConfig()` template. (2) `.env.example` is hand-authored (its where-to-get-each-token onboarding prose lives in no origin) but build-checked for **completeness** — every key the server reads must be documented, else the build fails.

Net effect on "adding a platform": one adapter + one `lib/specs.js` entry + one dispatcher case + one `capabilities/skills/<name>.md` — then `npm run build` regenerates the skill, tool tables, configs, and `.env.example` completeness check; nothing is hand-copied.

## Agent Integration Points

| Agent environment | Integration method |
|-------------------|--------------------|
| Claude Code | Skills in `skills/` directory |
| Claude Desktop App | `claude_desktop_config.json` mcpServers entry |
| Cursor / Windsurf | Same MCP config, different host config file location |
| Hermes | Reads AGENTS.md + uses MCP tools directly |
| Any MCP-compatible agent | `node honk-server/index.js` via stdio |

### Surface viability (verified 2026-06-14)
The Claude plugin format has converged: one plugin bundles skills + a local MCP server declaration and installs across **Claude Code, claude.ai web, the Claude Desktop chat tab, and Cowork**, discoverable through one unified directory (`claude.com/plugins`). The one boundary that still forces a second path is that a **local stdio MCP server runs only where there is a local machine**:

| Surface | Skills | Honk tools (local stdio MCP) |
|---|---|---|
| Claude Code (CLI + desktop) | ✅ | ✅ runs locally |
| Claude Desktop chat app | ✅ | ✅ runs locally |
| Cowork | ✅ (+ hooks/sub-agents) | ✅ runs locally |
| **claude.ai web** | ✅ (org-synced) | ❌ no local machine to run `node` |
| Hermes (own agent) | n/a | ✅ via its own MCP config |

**Implication:** on claude.ai web the plugin's *skills* appear but SPMC's *publishing tools won't fire* until SPMC is **hosted as a remote (HTTP) MCP connector** — the single later milestone for full web support, a transport/hosting change, not a packaging one.

Sources: [Use plugins in Claude](https://support.claude.com/en/articles/13837440-use-plugins-in-claude) · [Unified directory](https://support.claude.com/en/articles/14328846-browse-skills-connectors-and-plugins-in-one-directory) · [Claude Code plugins](https://code.claude.com/docs/en/plugins) · [Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)

## Phase 1 additions (post-MVP, do not build yet)

- Multi-account support: namespace env vars per account (e.g. `X_API_KEY_PERSONAL`, `X_API_KEY_BRAND`)
- SQLite queue with scheduling daemon
- Media pipeline: local file → CDN → public URL
- Analytics ingestion tools
