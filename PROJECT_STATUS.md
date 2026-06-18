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
version: "0.3.0-alpha"
```

## Sprint Beta-Prep — Complete (non-UI capabilities)

Goal: Expand capabilities toward a versatile, near-beta state — content
intelligence, safety/observability, and a real test suite — without starting
any UI work. Branch: `feature/BETA-001-capability-expansion`.

Outcome: tool surface 15 → 23, all new tools credential-free and verified by
37 unit tests + a 12-check MCP smoke test. Live credential testing remains
deferred by decision; live-path adapters (publishing, analytics) are unchanged
or only additively extended.

## Sprint Alpha-2 — Content Foundations (in progress)

Goal: close out the remaining Phase-1/Alpha capability work and add the
content-intelligence foundations a versatile, pre-Beta tool needs — **before**
any UI/Beta work. Research-driven (competitor scan: Buffer / Hootsuite / Publer /
Jasper, June 2026): **brand-voice profiles** are the top AI differentiator, with
**first-comment**, **best-time-to-post**, **alt-text**, and **link/UTM**
attribution as table-stakes pro features. A parallel pass **strengthens the
agent prompts** (skills + persona), which are still PoC-thin.
Branch: `feature/ALPHA-009-content-foundations`.

## Active Tickets

| ID | Title | Status |
|----|-------|--------|
| ALPHA-011 | Drafts — first-class `draft` queue state + skill flow | 🔵 Next (credential-free) |
| ALPHA-012 | Duplicate/repost guard — warn on matching recent content hash | 🔵 Next (credential-free) |

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
| BUILD-001 | Single-origin build system: `build/generate.mjs` emits 21 artifacts from one origin (`lib/{tools,specs,config}.js` + `capabilities/` prose) via a `{{limit\|unit\|tool}}` resolver; `build:check` enforced by CI + pre-commit hook; merged to `main`, `v0.2.0-alpha` | ✅ Done |
| BETA-010 | Live credential testing (Meta): published a real 6-slide Instagram carousel + a Facebook Page post end-to-end through the spine. Verified live: IG publish, FB publish, IG analytics, audit log, rate-limit tracking, `account_info` read. Surfaced + resolved: expired FB token, invalid imgbb key, unparsed Cloudinary one-liner. Bluesky/Threads/TikTok creds still empty; X is credit-blocked (402) | ✅ Done |
| BETA-012 | IG carousel publishing (`image_urls[]`, multi-container Graph flow) · `account_info` read tool (IG/FB profile) · `square-news` branded template (handle + circular-icon footer, body word-wrap) · `compose` empty-value→default fix · FB analytics metric set corrected to live-valid (`post_impressions*` deprecated) · imgbb-primary/Cloudinary-fallback selection + `CLOUDINARY_URL` one-liner parsing | ✅ Done |
| ALPHA-008 | Auto-fetch analytics ~24h after publish — `lib/followups.js` store + `publishAudited` chokepoint schedules a deferred metrics job (captures `result.raw` id; covers direct/queue/scheduler uniformly; survives the short-lived `run.js` process), drained by the scheduler tick with back-off/drop on failure. 5 unit tests | ✅ Done |
| ALPHA-009 | Brand voice profile + `brand_voice` get/set/clear tool — `lib/brand.js` per-account store (deep-merge); persistent brand kit (tone, audience, hashtag sets, emoji/banned-words policy, CTA library, UTM defaults). Credential-free. Tools 24→25. 6 unit + 3 smoke checks | ✅ Done |
| ALPHA-010 | Foundational prompt revision — all 6 platform skills deepened (platform-native "Craft" + weak→strong example + error→action + brand-voice ref); `content-intelligence` documents `brand_voice` + auto-analytics; Hermes `persona.md` consults the brand kit; `output-manager` **rebuilt** generic + on-architecture (drops the protocode Pillow logo / Canva refs → `media_compose` templates + graphic-design principles); `idea-input`/`research-trends`/`pipeline-orchestrator` rewritten generic + delegating (orchestrator points to platform skills instead of restating specs; alt-text refs dropped, primary-source citation kept). Identity deferred to the brand kit | ✅ Done |
| ALPHA-013 | Link/UTM tagging — `lib/links.js` `tagUrl` (URL-based, preserves query+fragment) + `link_tag` tool; merges brand-kit `links.utm_defaults` under overrides, substitutes `{platform}`. Tools 25→26. 4 unit + 1 smoke check | ✅ Done |

## Next Up

### Build-if-momentum — credential-free, low-risk (this sprint, after the spine)
| ID | Title | Priority |
|----|-------|----------|
| ALPHA-011 | Drafts — first-class `draft` queue state + skill flow (draft → review → schedule/publish); foundation for idea-/RSS-sourced content | Medium |
| ALPHA-012 | Duplicate/repost guard — warn when a post's content hash matches a recent publish (reuses `lib/audit.js`); opt-in `force` to override | Medium |
| ALPHA-013 | Link/UTM tagging helper (`link_tag`) — deterministic UTM/campaign tagging for click attribution; brand-voice supplies defaults | Medium |
| ALPHA-020 | `media_compose` **4:5 template** (1080×1350) — IG's highest-reach feed ratio; no template renders it today (surfaced by the prompt rewrite) | Low |
| ALPHA-021 | `media_compose` **corner-logo stamp** onto an arbitrary finished photo — capability the old `output-manager` Pillow code had; dropped in the generic rewrite (identity now flows from `brand_voice` + `square-news` footer) | Low |

### Needs your input before I build (scoped, paused)
| ID | Title | Why it needs your call |
|----|-------|------------------------|
| ALPHA-014 | Image **alt-text** on posts (IG / X / Bluesky / FB / Threads) — accessibility + reach | Touches live publish adapters + payload shape |
| ALPHA-015 | **First-comment** posting (IG hashtags / link in first comment) | Touches live IG adapter; confirm desired behavior |
| ALPHA-016 | **Delete / unpublish** a published post | Destructive — confirm scope + which platforms |
| ALPHA-017 | **Mastodon** adapter (new platform — easy AT-style API) | Needs your instance + app token |
| ALPHA-018 | **LinkedIn** adapter (new platform — strategic, the Taplio space) | Needs creds + API access-tier decision |
| ALPHA-019 | **Best-time-to-post** suggestions (25–40% engagement lift per research) | Needs analytics history + algorithm choice |

### Deferred stop-lines (unchanged)
| ID | Title | Priority |
|----|-------|----------|
| BETA-011 | UI implementation **planning** — analytics dashboard + content calendar (Phase 2/3). NOT started | ⚪ Next phase (stop line) |
| BETA-013 | Remaining live creds: refresh/verify Bluesky (`BLUESKY_APP_PASSWORD` empty), Threads (both empty), TikTok (token empty); add X credits to unblock 402 | Medium |

## Project Metrics

| Metric | Value |
|--------|-------|
| Platforms supported | 6 (X, Instagram, TikTok, Facebook, Threads, Bluesky) |
| MCP tools | 26 (7 publishing + 1 tiktok-status + 5 content-intelligence + 1 brand_voice + 1 link_tag + 5 queue + 3 observability + 1 account_info + 2 media) |
| Claude Code skills | 13 (9 publishing: 6 platform + manage-queue + upload-media + content-intelligence · 4 pipeline: idea-input + research-trends + pipeline-orchestrator + output-manager) |
| Tests | 56 unit (`node:test`) + 17-check MCP smoke test |
| npm package | `spmc` v0.3.0-alpha |
| Dependencies | 2 (`@modelcontextprotocol/sdk`, `sharp`) — unchanged |
| Agent surfaces | 5 (Claude Code, Claude Desktop, Hermes, OpenClaw/generic, CLI/npm) |

## Recent Updates

- 2026-06-18: **Sprint Alpha-2 (Content Foundations) opened; shipped on `feature/ALPHA-009-content-foundations`.** PRs #1 (`development`→`main`) and #2 merged — `v0.3.0-alpha` is on `main`. Research-driven ticket set written (ALPHA-008..021; competitor scan: brand-voice profiles are the top AI differentiator). Shipped: **ALPHA-008** (auto-fetch analytics ~24h after publish — `lib/followups.js` + `publishAudited` chokepoint, drained by the scheduler), **ALPHA-009** (`brand_voice` profile + `lib/brand.js`), **ALPHA-010** (foundational prompt revision — 6 platform skills deepened with Craft + weak→strong example + error→action + brand-voice; `output-manager` rebuilt generic/on-architecture off the protocode Pillow logo → `media_compose` templates + graphic-design principles; `idea-input`/`research-trends`/`pipeline-orchestrator` rewritten generic + delegating; persona consults the brand kit), and **ALPHA-013** (`link_tag` UTM tagging, brand-kit defaults). Tools 24→26. 56 unit tests + 17-check smoke + `build:check` green. Two decisions surfaced as tickets: **ALPHA-020** (IG 4:5 1080×1350 template gap) and **ALPHA-021** (corner-logo stamp dropped from the generic rewrite). **Not committed yet** (awaiting go-ahead). **Paused for input** on next batch: remaining credential-free features (ALPHA-011 drafts, ALPHA-012 dup-guard) vs the cred/strategic tickets (Mastodon/LinkedIn/X) vs alt-text/first-comment/delete.
- 2026-06-17: **BETA-010 live test executed + BETA-012 features shipped (`v0.3.0-alpha`).** Published a real, researched 6-slide Instagram carousel (US gov pulling Anthropic's Fable 5 / Mythos 5) to `@protocode_` + a Facebook Page post, end-to-end through the spine. New product surface: IG carousel publishing (`instagram_post` `image_urls[]`), `account_info` read tool, `square-news` branded slide template (handle + circular-icon footer, body word-wrap), imgbb-primary/Cloudinary-fallback selection with `CLOUDINARY_URL` one-liner parsing. Live testing surfaced + fixed real issues: **FB analytics metrics were all-deprecated** (`post_impressions*` → engagement metrics, verified valid live), a `compose` empty-value bug that blanked the accent/handle, an expired FB token, an invalid imgbb key, and the unparsed Cloudinary one-liner (last three resolved by user-supplied creds). Verified live: IG+FB publish, IG analytics, audit, rate-limits, profile reads. 41 unit tests + smoke + `build:check` green. **Merged into `development` + pushed; PR #1 (`development` → `main`) open.** Git flow formalized this session: `development` is now the default/integration branch (branch off it, merge into it, push it; `main` only via PR) — `BRANCHING.md`/`AGENTS.md`/`AGENT_CONTEXT.md` reconciled.
- 2026-06-16: BUILD-001 single-origin — **SHIPPED + MERGED to `main` (v0.2.0-alpha), pushed, CI green.** Wire-up + merge-back closed it out: CI workflow (`.github/workflows/ci.yml`) + opt-in pre-commit hook (`.githooks/pre-commit`, no husky) both run `build:check`; `hermes/mcp-config.json` excluded from `--check` (machine-local absolute path = environment, shape still template-checked); `.env.example` single-origined as a `credentialEnvKeys()` completeness assertion; design folded into `PROJECT_ARCHITECTURE.md`, `BUILD_CONCEPT.md` reduced to a pointer; version single-sourced + bumped to `0.2.0-alpha`. Merged `--no-ff` (`f401b44`) and pushed `main` to `origin/honk`. First CI run caught a latent test-glob bug (quoted `node --test` glob needs Node ≥21; CI's Node 20 couldn't expand it) — unquoted so the shell expands it; next run green (`build:check` 20 checked + 1 skipped, 38 tests, smoke). **No active tickets; next = the deferred stop-lines (live cred testing / UI planning), awaiting user go-ahead.**
- 2026-06-16: BUILD-001 single-origin — **slice B2** (the final slice): `skills/*` (13) + `hermes/SKILLS.md` are now generated from a hand-authored `capabilities/` prose tree. New token resolver (`{{limit:…}}` / `{{unit:…}}` / `{{tool:…}}`, 1:1 specs object-path, build-failing on any bad token) single-sources platform limits + tool names into prose. `output-manager` body reconciled (dropped queue/scheduling overlap with `manage-queue`). Generator now emits **21 artifacts**; `build:check` green, 38 tests + smoke pass. The single-origin build system is complete — remaining work is CI/pre-commit wire-up + merge-back (no slices left).
- 2026-06-16: BUILD-001 single-origin — slice C (one SPMC plugin: content-pipeline absorbed, 13 skills, dead trees removed) + slice B1 (tool tables injected into README + Hermes CONTEXT) + slice A (all 3 MCP configs rendered from one template; 17 credential keys single-sourced via `lib/config.js`). Generator emits **7 artifacts**; `build:check` green, 38 tests + smoke pass. Remaining: B2 (skills ← capabilities), then CI wire-up + merge-back.
- 2026-06-14: Beta-Prep sprint — tool surface 15 → 23, content intelligence + audit + observability + tests; dispatcher unified (scheduler account bug fixed). UI work intentionally not started.
- 2026-06-14: Alpha-1 packaged — npm package, Claude Code plugin, README, git init
- 2026-06-10: Media pipeline shipped (ALPHA-003)
- 2026-06-10: MVP shipped — MCP server live, all tools verified, configs ready
