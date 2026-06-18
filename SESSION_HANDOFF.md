# SESSION_HANDOFF — SPMC

> Read this before anything else. Replace entirely at session end — this is current state, not a log.

## Where We Are

**`v0.3.0-alpha` is on `main`** — PR [#1](https://github.com/prototowb/honk/pull/1) (`development`→`main`) and PR #2 (`docs/branching-development-flow`) are both **merged**. `development` is the default/integration branch.

This session opened **Sprint Alpha-2 (Content Foundations)** and shipped its spine on branch **`feature/ALPHA-009-content-foundations`** (⚠️ **work is in the working tree, NOT committed yet** — awaiting go-ahead to commit). Direction came from the user: do the remaining ALPHA features, add more pre-Beta features, and **strengthen the still-PoC agent prompts up to copywriting + platform graphic-design quality** — keeping the pipeline prompts **generic** (brand specifics live in the brand kit, not the prompts) until a UI exists for per-user tuning.

## What Shipped This Session (uncommitted on the feature branch)

All green: **56 unit tests + 17-check smoke + `build:check`**. Tools **24 → 26**. Single-origin respected (edit `lib/*` / `capabilities/*`, then `npm run build`).

1. **ALPHA-008 — auto-fetch analytics ~24h after publish.** New `lib/followups.js` store; the `publishAudited` chokepoint captures the post id (`result.raw`) and schedules a deferred job (covers direct/queue/scheduler; survives the short-lived `run.js`). The **scheduler** drains due jobs (`start.js` required) with back-off/drop on failure; errors swallowed so a tick never dies. 5 unit tests.
2. **ALPHA-009 — `brand_voice` profile tool + `lib/brand.js`.** Per-account brand kit (tone, audience, hashtag sets, emoji/banned-words, CTA library, UTM defaults), deep-merge get/set/clear. Credential-free. 6 unit + 3 smoke.
3. **ALPHA-010 — foundational prompt revision (the headline ask).** All 6 platform skills deepened: platform-native **Craft** section + one **weak→strong** example + **error→action** + a `brand_voice` reference. `content-intelligence` documents `brand_voice`, `link_tag`, and the auto-analytics follow-up. Hermes `persona.md` checklist consults the brand kit. **`output-manager` rebuilt** generic + on-architecture — dropped the hardcoded **protocode Pillow logo / Canva** refs in favor of `media_compose` templates + graphic-design principles. `idea-input` / `research-trends` / `pipeline-orchestrator` rewritten generic + **delegating** (orchestrator points to the platform skills instead of restating their specs — fixed the stale "15–30 hashtags / alt-text" contradiction). `manage-queue` + `upload-media` were already on-architecture; left as-is.
4. **ALPHA-013 — `link_tag` UTM tagging.** `lib/links.js` `tagUrl` (URL-based, preserves existing query + fragment) + tool; merges brand-kit `links.utm_defaults` under overrides, substitutes `{platform}`. 4 unit + 1 smoke.

## Decisions surfaced (filed as tickets, flagged to user)
- **ALPHA-021** — the generic `output-manager` rewrite **dropped** the corner-logo-on-arbitrary-photo capability the old Pillow code had. Identity now flows from `brand_voice` + the `square-news` handle/icon footer. Re-adding a corner-logo stamp is a `media_compose` enhancement.
- **ALPHA-020** — Instagram's highest-reach feed ratio is **4:5 (1080×1350)**; no `media_compose` template renders it (templates are 1:1, 9:16, 1.91:1). Design guidance was constrained to existing templates.

## NEXT — open items
- **Commit** the spine to `feature/ALPHA-009-content-foundations` (not done yet — was holding for go-ahead), then PR into `development`.
- **Remaining credential-free features:** ALPHA-011 (drafts — `draft` queue state) · ALPHA-012 (duplicate/repost guard, reuses the audit hash).
- **Needs user input/creds:** ALPHA-014 alt-text · ALPHA-015 first-comment · ALPHA-016 delete/unpublish · ALPHA-017 Mastodon · ALPHA-018 LinkedIn · ALPHA-019 best-time-to-post · X credits (402).
- **BETA-011** UI planning remains the stop-line.

## Conventions In Force
- **Build origin:** tool → `lib/tools.js`; limit → `lib/specs.js`; credential/media key → `lib/config.js` (+ `.env.example`); skill/Hermes prose → `capabilities/`; template → `media/templates/`; version → `spmc-server/package.json`. Then `npm run build`. **Never hand-edit generated artifacts** (`build:check` rejects it). `hermes/persona.md` is hand-authored (not generated).
- Server `spmc`; `run.js` = MCP only; `start.js` = MCP + scheduler. One dispatcher (`lib/dispatch.js`); every real publish goes through `publishAudited` (now also the analytics-follow-up hook point).
- Credentials in `~/.claude/spmc.env`; multi-account `KEY__ACCOUNT`. Always confirm post content with the user before publishing (no un-publish).
- Keep `npm test` + `build:check` green at every commit. Runtime deps still 2.
- **Git flow:** branch off `development`, merge into it, push it; `main` only via PR.
