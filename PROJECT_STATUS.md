# PROJECT STATUS — Social Publishing Mission Control (SPMC)

> Single source of truth for project state.

## Current State

```yaml
project_phase: "Beta-Prep"
project_name: "Social Publishing Mission Control (SPMC)"
framework: "MCP server + Claude skills"
project_type: "AI-native social publishing plugin"
initialization_date: "2026-06-10"
current_sprint: "Beta-Prep"
version: "0.2.0-alpha"
```

## Sprint Beta-Prep — Complete (non-UI capabilities)

Goal: Expand capabilities toward a versatile, near-beta state — content
intelligence, safety/observability, and a real test suite — without starting
any UI work. Branch: `feature/BETA-001-capability-expansion`.

Outcome: tool surface 15 → 23, all new tools credential-free and verified by
37 unit tests + a 12-check MCP smoke test. Live credential testing remains
deferred by decision; live-path adapters (publishing, analytics) are unchanged
or only additively extended.

## Active Tickets

*None.* Next phase is UI implementation **planning** (Beta) — not yet started.

## Completed Tickets

| ID | Title | Status |
|----|-------|--------|
| INIT-001 | ProtoGear Agent Framework integrated | ✅ Done |
| MVP-001 | MCP server (`spmc-server`) with all 6 platforms + queue tools | ✅ Done |
| MVP-002 | Platform adapters: X, Instagram, TikTok, Facebook, Threads, Bluesky | ✅ Done |
| MVP-003 | File-backed content queue (queue_add/list/update/remove/dispatch) | ✅ Done |
| MVP-004 | Claude Code skills for all platforms + queue management | ✅ Done |
| MVP-005 | `.env.example` with all credentials documented | ✅ Done |
| MVP-006 | `claude_desktop_config.json` — drop-in Claude Desktop App config | ✅ Done |
| MVP-007 | `PROJECT_ARCHITECTURE.md` extracted from specifications | ✅ Done |
| MVP-008 | Server smoke test: 15 tools listed, queue add/list verified | ✅ Done |
| ALPHA-001 | Multi-account support (`__ACCOUNTNAME` credential suffix) | ✅ Done |
| ALPHA-002 | Scheduling daemon (`scheduler/`) — polls queue every 60s | ✅ Done |
| ALPHA-002b | `start.js` — combined launcher: MCP server + scheduler child | ✅ Done |
| ALPHA-003 | Media pipeline: `media_compose` + `media_upload`, 3 templates, Cloudinary + imgbb | ✅ Done |
| ALPHA-004 | Hermes skill pack (`hermes/CONTEXT.md`, `SKILLS.md`, `persona.md`, `mcp-config.json`) | ✅ Done |
| ALPHA-005b | npm packaging: `bin: spmc`, shebang, `files` array, version `0.1.0-alpha.1` | ✅ Done |
| ALPHA-005c | Claude Code plugin: `.mcp.json` with `${CLAUDE_PLUGIN_ROOT}`, `.claude-plugin/plugin.json` updated | ✅ Done |
| ALPHA-005d | `claude_desktop_config.json` updated: `npx spmc`, removed broken `${VAR}` env block | ✅ Done |
| ALPHA-005e | `README.md` — full setup guide for all agent surfaces | ✅ Done |
| ALPHA-005f | `.gitignore` finalized | ✅ Done |
| BETA-001 | Unify publish dispatcher (`lib/dispatch.js`); fix scheduler dropping `account` on scheduled multi-account posts | ✅ Done |
| BETA-002 | `lib/specs.js` + `content_validate`: platform rules engine (limits, required fields, media, grapheme-aware) | ✅ Done |
| BETA-003 | `dry_run` on all publish tools + `queue_dispatch` — validate & preview without sending | ✅ Done |
| BETA-004 | Audit log (`lib/audit.js`) + `audit_log` tool — append-only record of every publish/failure/dry-run | ✅ Done |
| BETA-005 | `content_adapt` — deterministic cross-platform fitting (auto X thread-split, grapheme truncation) | ✅ Done |
| BETA-006 | `config_doctor` — report configured platforms/accounts by env presence (no secret values) | ✅ Done |
| BETA-007 | `scheduled_at` ISO normalization + `schedule_check` — naive timestamp accepted as server-local but warned (avoids wrong-instant bug under hosting) | ✅ Done |
| BETA-008 | Rate-limit tracking (`rate_limits`) + analytics ingestion scaffold (`analytics_fetch`/`analytics_report`, IG/FB/Threads) — **unverified pending live creds** | ✅ Done |
| BETA-009 | Test suite: 37 `node:test` unit tests + MCP smoke test; `npm test` / `npm run test:smoke` | ✅ Done |

## Next Up

| ID | Title | Priority |
|----|-------|----------|
| BETA-010 | Live credential testing (deferred): Bluesky → X → Meta. Confirms publish + analytics paths | 🔴 Now (deferred by request) |
| BETA-011 | UI implementation **planning** — analytics dashboard + content calendar (Phase 2/3). NOT started | ⚪ Next phase (stop line) |
| ALPHA-008 | Auto-fetch analytics 24h after publish (scheduler hook) | Low |

## Project Metrics

| Metric | Value |
|--------|-------|
| Platforms supported | 6 (X, Instagram, TikTok, Facebook, Threads, Bluesky) |
| MCP tools | 23 (7 publishing + 1 tiktok-status + 5 content-intelligence + 5 queue + 3 observability + 2 media) |
| Claude Code skills | 13 (9 publishing: 6 platform + manage-queue + upload-media + content-intelligence · 4 pipeline: idea-input + research-trends + pipeline-orchestrator + output-manager) |
| Tests | 37 unit (`node:test`) + 12-check MCP smoke test |
| npm package | `spmc` v0.2.0-alpha |
| Dependencies | 2 (`@modelcontextprotocol/sdk`, `sharp`) — unchanged |
| Agent surfaces | 5 (Claude Code, Claude Desktop, Hermes, OpenClaw/generic, CLI/npm) |

## Recent Updates

- 2026-06-16: BUILD-001 single-origin — **SHIPPED + MERGED to `main` (v0.2.0-alpha), pushed, CI green.** Wire-up + merge-back closed it out: CI workflow (`.github/workflows/ci.yml`) + opt-in pre-commit hook (`.githooks/pre-commit`, no husky) both run `build:check`; `hermes/mcp-config.json` excluded from `--check` (machine-local absolute path = environment, shape still template-checked); `.env.example` single-origined as a `credentialEnvKeys()` completeness assertion; design folded into `PROJECT_ARCHITECTURE.md`, `BUILD_CONCEPT.md` reduced to a pointer; version single-sourced + bumped to `0.2.0-alpha`. Merged `--no-ff` (`f401b44`) and pushed `main` to `origin/honk`. First CI run caught a latent test-glob bug (quoted `node --test` glob needs Node ≥21; CI's Node 20 couldn't expand it) — unquoted so the shell expands it; next run green (`build:check` 20 checked + 1 skipped, 38 tests, smoke). **No active tickets; next = the deferred stop-lines (live cred testing / UI planning), awaiting user go-ahead.**
- 2026-06-16: BUILD-001 single-origin — **slice B2** (the final slice): `skills/*` (13) + `hermes/SKILLS.md` are now generated from a hand-authored `capabilities/` prose tree. New token resolver (`{{limit:…}}` / `{{unit:…}}` / `{{tool:…}}`, 1:1 specs object-path, build-failing on any bad token) single-sources platform limits + tool names into prose. `output-manager` body reconciled (dropped queue/scheduling overlap with `manage-queue`). Generator now emits **21 artifacts**; `build:check` green, 38 tests + smoke pass. The single-origin build system is complete — remaining work is CI/pre-commit wire-up + merge-back (no slices left).
- 2026-06-16: BUILD-001 single-origin — slice C (one SPMC plugin: content-pipeline absorbed, 13 skills, dead trees removed) + slice B1 (tool tables injected into README + Hermes CONTEXT) + slice A (all 3 MCP configs rendered from one template; 17 credential keys single-sourced via `lib/config.js`). Generator emits **7 artifacts**; `build:check` green, 38 tests + smoke pass. Remaining: B2 (skills ← capabilities), then CI wire-up + merge-back.
- 2026-06-14: Beta-Prep sprint — tool surface 15 → 23, content intelligence + audit + observability + tests; dispatcher unified (scheduler account bug fixed). UI work intentionally not started.
- 2026-06-14: Alpha-1 packaged — npm package, Claude Code plugin, README, git init
- 2026-06-10: Media pipeline shipped (ALPHA-003)
- 2026-06-10: MVP shipped — MCP server live, all tools verified, configs ready
