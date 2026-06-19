# SESSION_HANDOFF — SPMC

> Read this before anything else. Replace entirely at session end — this is current state, not a log.

## Where We Are

**`v0.3.0-alpha` is on `main`** (PRs #1/#2 merged). `development` is the default/integration branch.

Sprint Alpha-2 (Content Foundations) shipped **8 tickets** across two feature branches (both merged into `development` `--no-ff` + pushed). **This session** then shipped **ALPHA-019 best-time-to-post** on `feature/ALPHA-019-best-time`, merged into `development` (`--no-ff`) and pushed. Per the git flow, merging into `development` needs no PR; PR is only for `development`→`main`. Direction from the user this session: **"everything but platform adapters"** — Mastodon (ALPHA-017) / LinkedIn (ALPHA-018) are paused. After ALPHA-019, the user chose to **stop here for now** — the rest of the backlog is paused pending direction.

**State:** all green — **65 unit tests + 22-check smoke + `build:check`**. Tools **27 → 28**; templates 5. Runtime deps still 2.

## What Shipped This Session

Branch 1 `feature/ALPHA-009-content-foundations` (merged):
1. **ALPHA-008** — auto-fetch analytics ~24h after publish. `lib/followups.js` + the `publishAudited` chokepoint schedule a deferred metrics job (captures `result.raw` id; covers direct/queue/scheduler; survives `run.js`). The **scheduler** drains due jobs (`start.js` required) with back-off/drop; errors swallowed.
2. **ALPHA-009** — `brand_voice` profile tool + `lib/brand.js` (per-account brand kit: tone, audience, hashtag sets, emoji/banned-words, CTA, UTM defaults; deep-merge).
3. **ALPHA-010** — foundational prompt revision. 6 platform skills deepened (Craft + weak→strong example + error→action + brand-voice ref). `output-manager` rebuilt generic + on-architecture (dropped the protocode Pillow logo / Canva → `media_compose` templates + design principles). `idea-input`/`research-trends`/`pipeline-orchestrator` rewritten generic + delegating. Persona + content-intelligence wired to the brand kit.
4. **ALPHA-013** — `link_tag` UTM tagging (`lib/links.js`; merges brand-kit defaults, substitutes `{platform}`, preserves query/fragment).

Branch 2 `feature/ALPHA-011-drafts-dedupe-media` (merged):
5. **ALPHA-011** — drafts. `queue_add(draft:true)` → status `draft` (held, never auto-dispatched); `queue_list status:draft`; promote via `queue_update`→pending or `queue_dispatch`. `manage-queue` documents it.
6. **ALPHA-012** — duplicate guard. `lib/audit.js recentDuplicate` + `duplicate_check` tool (content hash vs successful publishes, 7d default window); in the Hermes pre-publish checklist + content-intelligence skill.
7. **ALPHA-020** — `square-tall` template (1080×1350), Instagram's 4:5 max-reach feed ratio.
8. **ALPHA-021** — `logo_url` corner-stamp on any template. `media/compose.js` split into `render()` (offline-testable PNG buffer) + `compose()` (render + upload).

## This session shipped (merged into `development`)
- **ALPHA-019 best-time-to-post** — `lib/besttime.js` + `best_time` tool: ranked posting windows per platform, audience-local, with a rationale per window. v1 is a research-backed baseline (no live analytics history exists, so a data-driven algorithm can't run yet); an `observedWindows` seam + a new `post_id` field on the `published` audit entry set up the future own-history join with no summary-parsing. Timezone→ISO convenience deferred (DST risk / 2-dep rule) — schedule via `queue_add` with an explicit offset. `content-intelligence` skill documents it so the agent surfaces it. Credential-free, no adapter touched. 5 unit + 2 smoke.

## NEXT — open items
- **Per the user's "everything but platform adapters":** the remaining non-adapter feature work is **ALPHA-014 alt-text** · **ALPHA-015 first-comment** · **ALPHA-016 delete/unpublish** — but all three touch live publish adapters/payloads (delete is destructive), so they're gated on a **scope confirmation** before build.
- **Paused (platform adapters):** **ALPHA-017 Mastodon** / **ALPHA-018 LinkedIn** — need creds (instance+token / LinkedIn app + API tier). **X credits** — unblock the 402.
- **BETA-011 UI planning** — the stop-line (analytics dashboard + content calendar); not started.

## Conventions In Force
- **Build origin:** tool → `lib/tools.js`; limit → `lib/specs.js`; credential/media key → `lib/config.js` (+ `.env.example`); skill/Hermes prose → `capabilities/`; template → `media/templates/<id>/` (`template.json` + `template.svg`, packaged via `files: ["media/"]`); version → `spmc-server/package.json`. Then `npm run build`. **Never hand-edit generated artifacts** (`build:check` rejects it). `hermes/persona.md` is hand-authored (not generated).
- Server `spmc`; `run.js` = MCP only; `start.js` = MCP + scheduler. One dispatcher (`lib/dispatch.js`); every real publish goes through `publishAudited` (also the analytics-follow-up hook point).
- Credentials in `~/.claude/spmc.env`; multi-account `KEY__ACCOUNT`. Always confirm post content with the user before publishing (no un-publish — `duplicate_check` guards reposts).
- Keep `npm test` + `build:check` green at every commit (opt-in pre-commit hook runs `build:check`).
- **Git flow:** branch off `development`, merge into it (`--no-ff`, no PR needed), push it; `main` only via PR.
