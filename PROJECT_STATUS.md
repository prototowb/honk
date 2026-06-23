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

**None in progress.** The Sprint Alpha-2 build-now spine + all credential-free
features shipped (ALPHA-008/009/010/011/012/013/020/021), and **ALPHA-019
best-time-to-post** shipped this session (see *Completed*). Remaining work is the
**needs-your-input** track (Mastodon/LinkedIn creds, alt-text/first-comment/delete
scope) and the BETA-011 UI stop-line — see *Next Up*. Per the user's direction
("everything but platform adapters"), the next non-adapter items (alt-text /
first-comment / delete) touch live publish paths — delete is destructive — and
stay gated on a scope confirmation before build.

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
| ALPHA-011 | Drafts — `queue_add(draft:true)` saves status `draft` (held for review, never auto-dispatched); `queue_list status:draft`; promote via `queue_update`→pending or `queue_dispatch`. `manage-queue` skill documents the flow. 2 smoke checks | ✅ Done |
| ALPHA-012 | Duplicate/repost guard — `lib/audit.js recentDuplicate` + `duplicate_check` tool (content hash vs successful publishes, default 7d window); wired into the Hermes pre-publish checklist + content-intelligence skill. Tools 26→27. 1 unit + 1 smoke | ✅ Done |
| ALPHA-020 | `media_compose` **`square-tall`** template (1080×1350) — Instagram's highest-reach 4:5 feed ratio. Templates 4→5. 1 unit | ✅ Done |
| ALPHA-021 | `media_compose` **`logo_url`** corner-stamp on any template (~12% width, bottom-right). `compose.js` split into `render()` (offline-testable PNG buffer) + `compose()` (render+upload). 2 unit (incl. data-URL logo composite) | ✅ Done |
| ALPHA-019 | **Best-time-to-post** — `lib/besttime.js` + `best_time` tool (ranked posting windows per platform, audience-local, with rationale). Research-backed baseline now, with an `observedWindows` seam for own-history refinement once analytics accrue; dispatcher captures `post_id` on the `published` audit entry so the future join needs no summary-parsing. Credential-free, touches no adapter. Tools 27→28. 5 unit + 2 smoke | ✅ Done |
| INDIV-001 | **Visual identity in the brand kit + media-design overhaul** — all 5 `media_compose` templates rebuilt on one editorial design system (layered surface, hero headline, accent chrome) driven by per-template `layout` metrics + luminance-derived legibility; protocode palette restored as defaults; story safe-zones. `visual` block on `emptyProfile()`; `media_compose` defaults every visual field from the kit (`resolveVisualVars` arg▸kit▸default; pure `resolvePalette` with the default-bg regression fixed). Tools required `template` → optional (kit `default_template`). 93 unit (+visual/palette) + smoke | ✅ Done (branch) |
| INDIV-002 | **`brand_schema` + guided `brand-setup`** — `lib/brand-schema.js` field spec (mirrors `brief_schema`) + `brand_schema` tool; `brand-setup` skill walks voice + visual identity one field at a time, skipping what's set; first-run offer wired into orchestrator/idea-input/output-manager. Kit is user-owned + portable (folder-copy). Tools 29→30, skills 13→14 | ✅ Done (branch) |
| INDIV-003 | **Per-platform voice tailoring** — `brand.resolveVoice(profile, platform)` + `PLATFORM_OVERRIDE_FIELDS` (single source) merge the kit's `platforms` deltas over the base voice (tone/register/emoji_policy/audience/hashtags/cta); **replace** semantics matching the deep-merge contract; null-safe + provenance (`overridden[]`). `brand_voice(action:"get", platform:…)` returns the effective voice; the 6 platform skills consult it when drafting; `content-intelligence`/`brand-setup` document the deltas. Tools stay 30 (overloaded `get`). 100 unit + 28-check smoke | ✅ Done (branch) |

## Next Up

### Needs your input before I build (scoped, paused)
| ID | Title | Why it needs your call |
|----|-------|------------------------|
| ALPHA-016 | **Delete / unpublish** a published post | Destructive — confirm scope + which platforms |
| INBOX-001 | **Comment-keyword → DM file/link** (ManyChat-style automation) | Plan drafted (`INBOX_FEATURE_PLAN.md`); gated on DM-API app-review + comment-ingestion decision |

**ALPHA-014 alt-text + ALPHA-015 first-comment — shipped + merged** to `development` (live-tested on @protocode_ / protocode). IG alt-text + first-comment **verified**; best-effort design **proven** (FB comment-permission failure left the post live). **FB alt-text UNVERIFIED** (no read-back — flagged like Threads); **FB first-comment needs `pages_manage_engagement`** (IG needs `instagram_manage_comments`) — re-verify pending a user-supplied modified token. Scope: X/Bluesky alt-text deferred (text-only adapters). New convention: features document permission scopes (AGENTS.md rule #7 + `.env.example`).
| ALPHA-017 | **Mastodon** adapter (new platform — easy AT-style API) | Needs your instance + app token |
| ALPHA-018 | **LinkedIn** adapter (new platform — strategic, the Taplio space) | Needs creds + API access-tier decision |

### Deferred stop-lines (unchanged)
| ID | Title | Priority |
|----|-------|----------|
| BETA-011 | UI implementation **planning** — analytics dashboard + content calendar (Phase 2/3). NOT started | ⚪ Next phase (stop line) |
| BETA-013 | Remaining live creds: refresh/verify Bluesky (`BLUESKY_APP_PASSWORD` empty), Threads (both empty), TikTok (token empty); add X credits to unblock 402 | Medium |

## Project Metrics

| Metric | Value |
|--------|-------|
| Platforms supported | 6 (X, Instagram, TikTok, Facebook, Threads, Bluesky) |
| MCP tools | 30 (7 publishing + 1 tiktok-status + 8 content-intelligence + 1 brand_voice + 1 brand_schema + 1 link_tag + 5 queue + 3 observability + 1 account_info + 2 media) |
| Claude Code skills | 14 (9 publishing: 6 platform + manage-queue + upload-media + content-intelligence · 5 pipeline: idea-input + research-trends + pipeline-orchestrator + output-manager + brand-setup) |
| Tests | 100 unit (`node:test`) + 28-check MCP smoke test |
| npm package | `spmc` v0.3.0-alpha |
| Dependencies | 2 (`@modelcontextprotocol/sdk`, `sharp`) — unchanged |
| Agent surfaces | 5 (Claude Code, Claude Desktop, Hermes, OpenClaw/generic, CLI/npm) |

## Recent Updates

- 2026-06-23: **Individualization Backlog — per-platform voice tailoring built** (`feature/INDIV-per-platform-tailoring`, off `development`, not yet merged). The brand kit's `platforms` block goes from inert storage to a resolved layer: new pure `brand.resolveVoice(profile, platform)` merges a platform's deltas over the base voice for six overridable fields (tone, register, emoji_policy, audience, hashtags, cta), single-sourced via an exported `PLATFORM_OVERRIDE_FIELDS` (the seed for a future per-platform UI panel — schema symmetry). **Replace** semantics throughout — a set per-platform value wins wholesale, arrays included (a per-platform hashtag list replaces the default, doesn't extend it) — matching the kit's deep-merge contract (advisor-confirmed over extend+dedupe: X wants 1–2 tags, IG wants 10–15, so extend would silently inherit). Null-safe; returns `overridden[]` provenance like media's `appliedFromKit`. Exposed by **overloading `brand_voice(action:"get", platform:…)`** (no new tool — matches `link_tag`/`best_time`'s platform arg) with its own resolved-view formatter; the raw `get` now also renders the `platforms` block readably. The **6 platform skills** consult the platform-resolved get when drafting; `content-intelligence` + `brand-setup` document the deltas (per-platform as an optional advanced step). **Tools stay 30, 100 unit (+7 resolver) + 28-check smoke + `build:check` + `pack:smoke` green.**
- 2026-06-23: **Individualization Phases 1 & 2 built** (`feature/INDIV-visual-brand-kit`, off `development`, not yet merged). **Design-quality overhaul:** baselined the 5 `media_compose` templates by rendering to PNG and inspecting them — found a flat-void layout, content crammed into the bottom 25%, a hardcoded headline color that ignored the brand, accent-colored (low-legibility) body text, and edge-clipping. Rebuilt all 5 on **one editorial design system** (brand row · hero headline on a layered surface · body · accent footer), driven by per-template `layout` metrics in `compose.js` (multi-line headline/body wrap with overflow ellipsis; body y flows from the headline's line count). Colors now derive from the **protocode palette** (`DESIGN_GUIDE`: bg `#05091e` · surface `#121b33` · accent `#1df7ed` · text `#8ac0dd`/`#f4f8ff`) with a **background-luminance legibility fallback** so any brand bg stays readable; story-dark respects the platform safe-zones. **Phase 1:** `visual` block on the brand kit (`emptyProfile()`) — accent/bg/surface/heading/body colors + logo/icon/handle/default-template — and `media_compose` defaults every visual field from it (`resolveVisualVars`: arg ▸ kit ▸ template default; identity set once, not per call). Fixed an advisor-caught regression: a kit restating the default bg used to discard the brand body color — derivation now only fires when bg genuinely differs from the template default (pure `resolvePalette`, unit-tested). **Phase 2:** `brand_schema` tool + `lib/brand-schema.js` (the kit's field spec, mirrors `brief_schema`) + a guided **`brand-setup`** skill; first-run offer wired into `pipeline-orchestrator` / `idea-input` / `output-manager`. Kit data is user-owned + portable (folder-copy; UI export later). **Tools 29→30, skills 13→14, templates rebuilt, 93 unit + 26-check smoke + `build:check` + `pack:smoke` green.**
- 2026-06-23: **Session finalized; Individualization planned (next-session seed).** Added an *Individualization* section to `PROJECT_SPECIFICATIONS.md` — the brand kit (`brand_voice`) is v1 (voice); **Phase 1 = visual identity in the kit** (a `visual` block — accent/bg/logo/default-template — that `media_compose` + output skills default from; removes the "pass colors every call" friction the live test surfaced), **Phase 2 = `brand_schema` + guided brand setup** (the adoption gate; mirrors `brief_schema`), with per-platform/audience, content-policy, learned/adaptive, and multi-brand on the backlog. `SESSION_HANDOFF.md` collapsed to a clean current-state snapshot per its own rule.
- 2026-06-22: **ALPHA-014 alt-text + ALPHA-015 first-comment built** (`feature/ALPHA-014-015-alt-text-first-comment`). API fields confirmed against the Meta/Threads docs before building. **Alt text** (`alt_text`; `alt_texts[]` per carousel slide) on IG (`/media` `alt_text`), FB (`/photos` `alt_text_custom`), Threads (container `alt_text`, unverified live) — threaded into the publish payload, validated, previewed in `dry_run`. **First comment** (`first_comment`) on IG/FB — posted **best-effort AFTER** the publish is confirmed + audited, so a comment failure never marks the live post failed or blinds `duplicate_check` (the advisor's key correctness point). X/Bluesky alt-text deferred: their adapters are text-only (no media upload) — a separate, bigger lift. New `instagram.comment`/`facebook.comment` adapter fns; validation + dry-run + queue all flow the new fields. **77 unit + 25-check smoke + `build:check` + `pack:smoke` green.** Live-unverified pending a user-approved IG/FB test. Also fixed a timing-flaky `recentDuplicate` test the new development CI gate caught on first run (boundary made exclusive). Then **planned INBOX-001** (comment-keyword → DM file/link) in `INBOX_FEATURE_PLAN.md`.
- 2026-06-21: **Optional guided pipeline intake (interactivity Layer 1)** on `feature/PIPELINE-hardening`. New `lib/brief.js` defines the per-run content-brief field schema (angle, goal, platforms, schedule, references, constraints) as a single source, exposed via a `brief_schema` tool that annotates which fields the brand kit pre-fills. `idea-input` / `research-trends` gained an **opt-in "guided mode"** that walks the schema one field at a time (skipping brand-kit pre-fills) instead of demanding everything in one command — the same spec a future web UI renders as a form; the default one-shot flow is unchanged. Tools **28 → 29**, **70 unit + 23-check smoke + `build:check` + `pack:smoke`** green. Layers 2 (persist in-progress briefs) + 3 (web form / MCP elicitation) deferred to the BETA-011 UI phase.
- 2026-06-20: **Build / install / distribution pipeline hardening** (`feature/PIPELINE-hardening`, off `development`, not yet merged; critique + 10 findings in `PIPELINE_REVIEW.md`). Fixed a **dead-on-arrival npm package** (`lib/` missing from `files` → `ERR_MODULE_NOT_FOUND` on every npm/`npx` surface); added a **pack-smoke gate** (pack→install→boot) wired into CI + `prepublishOnly` so the bug class can't recur; **CI now gates `development` + `feature/**`** (was `main`-only); made the repo a real **npm workspace** with shell-independent test discovery and an honest engines split (runtime ≥20.9 / dev tooling ≥21); renamed **`hermes/` → `agent/`** into a generic bring-your-own-agent surface (history preserved; OpenClaw/generic pointed at the same briefing); added the **`spmc-start` bin** (MCP + scheduler) so npm users get auto-dispatch + the auto-analytics follow-up; and added **CHANGELOG + RELEASING + an `npm version` artifact-regen hook**. All green (65 unit + smoke + `build:check` + `pack:smoke`). ⚠️ Any external agent config pointing at `hermes/*` must move to `agent/*`. Next: interactivity for pipeline start; publish story (#4) still deferred.
- 2026-06-19: **ALPHA-019 best-time-to-post shipped** (`feature/ALPHA-019-best-time`). New `lib/besttime.js` + `best_time` tool returns ranked posting windows per platform in audience-local time with a short rationale each. Per the advisor + the no-live-history reality, v1 is a **research-backed baseline** (the only thing that can ship with effectively zero analytics history — not a product call over a data-driven design); an `observedWindows` seam is in place for own-history refinement later, and the dispatcher now records `post_id` on the `published` audit entry so that future join needs no summary-string parsing. The DST-risky timezone→ISO convenience was deliberately deferred (vanilla JS, 2-dep rule) — the tool tells you to schedule via `queue_add` with an explicit offset. Credential-free, touches no adapter. **Tools 27→28, 65 unit + 22-check smoke + `build:check` green.** Direction from the user: "everything but platform adapters" — Mastodon/LinkedIn paused; the remaining non-adapter items (alt-text / first-comment / delete) touch live publish paths (delete is destructive) and stay gated on a scope confirmation.
- 2026-06-18: **Sprint Alpha-2 (Content Foundations) opened; shipped on `feature/ALPHA-009-content-foundations`.** PRs #1 (`development`→`main`) and #2 merged — `v0.3.0-alpha` is on `main`. Research-driven ticket set written (ALPHA-008..021; competitor scan: brand-voice profiles are the top AI differentiator). Shipped: **ALPHA-008** (auto-fetch analytics ~24h after publish — `lib/followups.js` + `publishAudited` chokepoint, drained by the scheduler), **ALPHA-009** (`brand_voice` profile + `lib/brand.js`), **ALPHA-010** (foundational prompt revision — 6 platform skills deepened with Craft + weak→strong example + error→action + brand-voice; `output-manager` rebuilt generic/on-architecture off the protocode Pillow logo → `media_compose` templates + graphic-design principles; `idea-input`/`research-trends`/`pipeline-orchestrator` rewritten generic + delegating; persona consults the brand kit), and **ALPHA-013** (`link_tag` UTM tagging, brand-kit defaults). Then the credential-free + media batch: **ALPHA-011** (drafts), **ALPHA-012** (`duplicate_check` guard), **ALPHA-020** (`square-tall` 4:5 template), **ALPHA-021** (`logo_url` corner stamp; `compose.js` split into `render()`+`compose()`). **Tools 24→27, templates 4→5, 60 unit + 19-check smoke + `build:check` green.** Committed in logical per-ticket commits; the spine merged into `development` (`--no-ff`) and pushed (PR only dev→main, per the git flow). **Paused for input** on the needs-input track: Mastodon (ALPHA-017) / LinkedIn (ALPHA-018) creds, alt-text (014) / first-comment (015) / delete (016) scope, best-time (019), X credits.
- 2026-06-17: **BETA-010 live test executed + BETA-012 features shipped (`v0.3.0-alpha`).** Published a real, researched 6-slide Instagram carousel (US gov pulling Anthropic's Fable 5 / Mythos 5) to `@protocode_` + a Facebook Page post, end-to-end through the spine. New product surface: IG carousel publishing (`instagram_post` `image_urls[]`), `account_info` read tool, `square-news` branded slide template (handle + circular-icon footer, body word-wrap), imgbb-primary/Cloudinary-fallback selection with `CLOUDINARY_URL` one-liner parsing. Live testing surfaced + fixed real issues: **FB analytics metrics were all-deprecated** (`post_impressions*` → engagement metrics, verified valid live), a `compose` empty-value bug that blanked the accent/handle, an expired FB token, an invalid imgbb key, and the unparsed Cloudinary one-liner (last three resolved by user-supplied creds). Verified live: IG+FB publish, IG analytics, audit, rate-limits, profile reads. 41 unit tests + smoke + `build:check` green. **Merged into `development` + pushed; PR #1 (`development` → `main`) open.** Git flow formalized this session: `development` is now the default/integration branch (branch off it, merge into it, push it; `main` only via PR) — `BRANCHING.md`/`AGENTS.md`/`AGENT_CONTEXT.md` reconciled.
- 2026-06-16: BUILD-001 single-origin — **SHIPPED + MERGED to `main` (v0.2.0-alpha), pushed, CI green.** Wire-up + merge-back closed it out: CI workflow (`.github/workflows/ci.yml`) + opt-in pre-commit hook (`.githooks/pre-commit`, no husky) both run `build:check`; `hermes/mcp-config.json` excluded from `--check` (machine-local absolute path = environment, shape still template-checked); `.env.example` single-origined as a `credentialEnvKeys()` completeness assertion; design folded into `PROJECT_ARCHITECTURE.md`, `BUILD_CONCEPT.md` reduced to a pointer; version single-sourced + bumped to `0.2.0-alpha`. Merged `--no-ff` (`f401b44`) and pushed `main` to `origin/honk`. First CI run caught a latent test-glob bug (quoted `node --test` glob needs Node ≥21; CI's Node 20 couldn't expand it) — unquoted so the shell expands it; next run green (`build:check` 20 checked + 1 skipped, 38 tests, smoke). **No active tickets; next = the deferred stop-lines (live cred testing / UI planning), awaiting user go-ahead.**
- 2026-06-16: BUILD-001 single-origin — **slice B2** (the final slice): `skills/*` (13) + `hermes/SKILLS.md` are now generated from a hand-authored `capabilities/` prose tree. New token resolver (`{{limit:…}}` / `{{unit:…}}` / `{{tool:…}}`, 1:1 specs object-path, build-failing on any bad token) single-sources platform limits + tool names into prose. `output-manager` body reconciled (dropped queue/scheduling overlap with `manage-queue`). Generator now emits **21 artifacts**; `build:check` green, 38 tests + smoke pass. The single-origin build system is complete — remaining work is CI/pre-commit wire-up + merge-back (no slices left).
- 2026-06-16: BUILD-001 single-origin — slice C (one SPMC plugin: content-pipeline absorbed, 13 skills, dead trees removed) + slice B1 (tool tables injected into README + Hermes CONTEXT) + slice A (all 3 MCP configs rendered from one template; 17 credential keys single-sourced via `lib/config.js`). Generator emits **7 artifacts**; `build:check` green, 38 tests + smoke pass. Remaining: B2 (skills ← capabilities), then CI wire-up + merge-back.
- 2026-06-14: Beta-Prep sprint — tool surface 15 → 23, content intelligence + audit + observability + tests; dispatcher unified (scheduler account bug fixed). UI work intentionally not started.
- 2026-06-14: Alpha-1 packaged — npm package, Claude Code plugin, README, git init
- 2026-06-10: Media pipeline shipped (ALPHA-003)
- 2026-06-10: MVP shipped — MCP server live, all tools verified, configs ready
