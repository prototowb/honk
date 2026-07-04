# PROJECT STATUS — Honk

> Single source of truth for project state.

## Current State

```yaml
project_phase: "Beta-Prep"
project_name: "Honk"
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
| MVP-001 | MCP server (`honk-server`) with all 6 platforms + queue tools | ✅ Done |
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
| INDIV-001 | **Visual identity in the brand kit + media-design overhaul** — all 5 `media_compose` templates rebuilt on one editorial design system (layered surface, hero headline, accent chrome) driven by per-template `layout` metrics + luminance-derived legibility; protocode palette restored as defaults; story safe-zones. `visual` block on `emptyProfile()`; `media_compose` defaults every visual field from the kit (`resolveVisualVars` arg▸kit▸default; pure `resolvePalette` with the default-bg regression fixed). Tools required `template` → optional (kit `default_template`). 93 unit (+visual/palette) + smoke | ✅ Done |
| INDIV-002 | **`brand_schema` + guided `brand-setup`** — `lib/brand-schema.js` field spec (mirrors `brief_schema`) + `brand_schema` tool; `brand-setup` skill walks voice + visual identity one field at a time, skipping what's set; first-run offer wired into orchestrator/idea-input/output-manager. Kit is user-owned + portable (folder-copy). Tools 29→30, skills 13→14 | ✅ Done |
| INDIV-003 | **Per-platform voice tailoring** — `brand.resolveVoice(profile, platform)` + `PLATFORM_OVERRIDE_FIELDS` (single source) merge the kit's `platforms` deltas over the base voice (tone/register/emoji_policy/audience/hashtags/cta); **replace** semantics matching the deep-merge contract; null-safe + provenance (`overridden[]`). `brand_voice(action:"get", platform:…)` returns the effective voice; the 6 platform skills consult it when drafting; `content-intelligence`/`brand-setup` document the deltas. Tools stay 30 (overloaded `get`). 100 unit + 28-check smoke | ✅ Done |
| INDIV-004 | **Content policies / guardrails** — `policy` block (banned_topics, disclosures.always/sponsored, auto_publish) + pure `checkPolicy()` merged into the validate path (`validateWithPolicy` loads it via `brand.getOrEmpty`, validate stays disk-free). always→warn, sponsored→error (per-call `sponsored` flag on the 7 publish tools + `content_validate`), banned_topics→drafting note; disclosures matched on **word boundaries** (not substrings); echoed in dry-run/validate. auto_publish agent-guided (no dispatch gate). Direct publish hard-blocks; queue advisory (dispatch doesn't re-validate — deferred). Tools stay 30. 110 unit + 33-check smoke | ✅ Done |
| INDIV-005 | **Audience segments** — `audiences{}` second tailoring axis; override list generalized to `OVERRIDE_FIELDS` (`PLATFORM_OVERRIDE_FIELDS` alias + `SEGMENT_OVERRIDE_FIELDS` = minus `audience`). `resolveVoice(profile,{platform,audience})` layers **base ▸ audience ▸ platform** (platform wins; replace semantics; per-field `sources` provenance); selecting a segment sets the effective audience to its name; **unknown name flagged, not silently applied**. `brand_voice(get, platform?, audience?)`; `brief.js` `audience_delta`→single `audience` field. Tools stay 30. 117 unit + 36-check smoke | ✅ Done |
| INDIV-006 | **Multi-brand management** — `brand_voice` `action:"list"` (unions brand profiles + credentialed accounts via `config.accountsOverview()`, lowercase-normalized, active marked) / `"use"` (active pointer) / `"clone"` (+`to`, deep-copy, refuses clobber). **Active pointer** chosen over agent-carried (UI groundwork), stored in its own `brand-active.json` (registry seed, brand.json stays flat). Reads (get/brand_schema) default to active + echo; **writes/publishing/compose stay explicit** (pointer never redirects a post). Tools stay 30. 121 unit + 41-check smoke | ✅ Done |
| INIT-003 | **Content quality fundamentals** — new brand-agnostic `content-craft` skill (engagement philosophy, hook→context→payoff→CTA layered copy, accessible source attribution — distinct from primary-source *verification*, hashtag intent, carousel arc); auto-discovered + **explicitly invoked** by the 6 platform skills + `pipeline-orchestrator` + `output-manager` so it loads (not an orphan). Persona checklist gains two **non-skippable** gates (real structure + followable sourcing). Guided mode reframed buried-opt-in → **offered up front** (idea-input/research-trends). Prose-only; tools stay 30, skills **14→15**. 121 unit + 41-check smoke + build:check + pack:smoke green | ✅ Done |
| INIT-005 | **Dispatch-time policy gate** — closes the INDIV-004 deferral: `queue_dispatch` + the scheduler called `publishAudited` directly, so a sponsored post could dispatch without its required disclosure (hard block existed only on the direct path; the unattended scheduler has no agent to catch it). `validateWithPolicy` extracted to shared `lib/policy-gate.ts` and enforced **inside `publishAudited`** — the single chokepoint every publish path uses; a failure throws **before** `publish()` (no network call), the existing catch records a `failed` audit entry, and the caller marks the queue item failed (no silent publish, no silent drop). `sponsored` now **persisted on the queue item** (optional `QueueItem.sponsored`, threaded through `queue.add` + `queue_add` tool; pre-existing items = not sponsored, no migration). Tools stay 30. 127 unit (+6) + 43-check smoke (+2) + build:check + pack:smoke green. ⚠️ Known boundary (backlog): the gate loads policy via `brand.getOrEmpty(account)` with **no active-account fallback** — a post queued without an explicit `account:` gets no policy enforcement (consistent with the direct path + "publishing is always explicit about account", so not a regression) | ✅ Done |
| INIT-006 | **Production-release hardening** — (1) policy-gate active-account fallback closes the INIT-005 boundary: a post queued without `account:` now gets the ACTIVE brand account’s policy (INIT-004 media_compose precedent — brand identity follows the pointer, credentials stay explicit), surfaced as a provenance note; (2) `lib/http.ts` `fetchWithTimeout` aliased as `fetch` in all 6 adapters + media upload — no outbound call can hang a tool/scheduler tick (default 30s, `HONK_HTTP_TIMEOUT_MS`); (3) `redactSecrets` scrubs token-shaped material at the audit/throw boundary (Graph URLs carry `access_token=` in the query string; the audit log is durable); (4) `lib/jsonstore.ts` atomic writes (tmp+rename) for queue/brand/followups/ratelimit/analytics + corrupt-file backup for user-authored stores (a corrupt queue.json used to parse as empty and the next save wiped every draft); (5) LICENSE (MIT) + `repository`/`bugs`/`homepage` publish metadata; (6) env.example drift healed (root still documented the pre-flip suffix convention) + `HONK_HTTP_TIMEOUT_MS`/`HONK_DATA_DIR` documented; (7) `PROJECT_HISTORY.md` split. Tools stay 30. 143 unit (+15) + 43-check smoke + build:check + pack:smoke green | ✅ Done |
| INIT-007 | **Steering-layer hardening** — vision/concept/architecture/roadmap revision toward the platform ambition (publishing automation + assets & digital brand management). `PROJECT_SPECIFICATIONS.md` restructured: north star, **4 product pillars** (Publish · Brand OS · Intelligence & Engage · Delegation), non-goals, an explicit **1.0 production-release definition**, and a **horizon roadmap H0–H3 with entry criteria** folding existing + planned + newly proposed features (workflow library v1, account registry, store versioning, asset registry/DAM seed, blog/newsletter channels, campaigns, content recycling, remote MCP hosting, brand-portal export, `content_check` report). `PROJECT_ARCHITECTURE.md` gains **Target Architecture & Evolution**: layering rules, channel SPI (platforms→channels, capability flags), storage trigger (JSON→`node:sqlite`, engines≥22 decision recorded), transport milestone (hosted Streamable-HTTP MCP), **security doctrine** (deterministic vs agent-judged gates; untrusted-input stance), account-registry design. `ROADMAP_NOTES.md` +Research Round 2 (DAM patterns, Ghost/WordPress/Buttondown/Sanity channel shapes, evergreen recycling, CI-for-content guardian). Docs-only; no code, no tool changes | ✅ Done |

## Next Up

> Roadmap is now organized as **horizons H0–H3 with entry criteria** in
> `PROJECT_SPECIFICATIONS.md`. Tickets below map to H0 (production floor) / H1 (delegation + UI).


### Individualization backlog — planned (next session)
Full plans (shape · logic · surface · tests · open decisions) in
`PROJECT_SPECIFICATIONS.md` → *Individualization → Backlog — planned*.
**INDIV-004 + INDIV-005 + INDIV-006 shipped — see Completed.** Only INDIV-007 remains:
| ID | Title | Notes |
|----|-------|-------|
| INDIV-007 | **Learned / adaptive** — voice few-shot examples + observed best-times (`best_time` `observedWindows`) | **Data-gated** — needs accrued analytics history (still unverified). Likely defer until live analytics accrue |

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

---

## Rename: SPMC → Honk — COMPLETE

All phases done (2026-06-28 → 2026-07-02): data dir `~/.honk/` + `HONK_DATA_DIR`, MCP
server key `honk`, npm package `honk`, bins `honk`/`honk-start`, server dir
`honk-server/`, docs swept. Existing `SPMC_*` env var names inside `honk.env` stay
(platform creds, not product naming); `~/.claude/spmc.env` remains a read fallback.
Full phase tables in `PROJECT_HISTORY.md`.

## Project Metrics

| Metric | Value |
|--------|-------|
| Platforms supported | 6 (X, Instagram, TikTok, Facebook, Threads, Bluesky) |
| MCP tools | 30 (7 publishing + 1 tiktok-status + 8 content-intelligence + 1 brand_voice + 1 brand_schema + 1 link_tag + 5 queue + 3 observability + 1 account_info + 2 media) |
| Claude Code skills | 15 (9 publishing: 6 platform + manage-queue + upload-media + content-intelligence · 5 pipeline: idea-input + research-trends + pipeline-orchestrator + output-manager + brand-setup · 1 craft: content-craft) |
| Tests | 143 unit (`node:test`) + 43-check MCP smoke test |
| npm package | `honk` v0.3.0-alpha (unpublished) |
| Dependencies | 2 (`@modelcontextprotocol/sdk`, `sharp`) — unchanged |
| Agent surfaces | 5 (Claude Code, Claude Desktop, Hermes, OpenClaw/generic, CLI/npm) |

## Recent Updates

Narrative session history lives in **`PROJECT_HISTORY.md`** (newest first) — this
file stays a lean current-state snapshot. Add new entries there, not here.
