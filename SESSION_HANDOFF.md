# SESSION_HANDOFF — SPMC

> Read this before anything else. Replace entirely at session end — this is current state, not a log.

## Where We Are

**`v0.3.0-alpha` is on `main`.** **`development`** is the default/integration branch
and is **green on CI** with everything below merged + pushed. Branch off `development`,
merge into it (`--no-ff`, no PR), push; `main` only via PR.

## On `development` now (recently merged)

- **Individualization Phases 1 & 2 (INDIV-001/002)** — all 5 `media_compose`
  templates rebuilt on one editorial design system (brand row · hero headline on a
  layered surface · body · accent footer), driven by per-template `layout` metrics in
  `compose.js`; colors default to the **protocode palette** (DESIGN_GUIDE: bg `#05091e`,
  surface `#121b33`, accent `#1df7ed`, text `#8ac0dd`/`#f4f8ff`) with a
  background-luminance legibility fallback for other brands; story-dark respects
  safe-zones. **Phase 1:** `visual` block on the brand kit; `media_compose` defaults
  every visual field from it (`resolveVisualVars`/`resolvePalette`, pure + tested;
  identity set once, not per call; `template` now optional via `default_template`).
  **Phase 2:** `brand_schema` tool + `lib/brand-schema.js` + guided **`brand-setup`**
  skill; first-run offer wired into `pipeline-orchestrator`/`idea-input`/`output-manager`.
  Kit is user-owned + portable (folder-copy). **Live-tested** through the server:
  brand-kit visual round-trips, `brand_schema` reflects it, `media_compose` resolves
  from the kit + renders (upload boundary unchanged — needs CDN creds via the bin).
- **Build / install / distribution pipeline hardening** — fixed a dead-on-arrival npm
  package (`lib/` now ships), added a **pack-smoke gate** (pack→install→boot) in CI +
  `prepublishOnly`, CI gates `development` + `feature/**`, real npm workspace, engines
  split (runtime ≥20.9 / tooling ≥21), the `spmc-start` bin (scheduler), and
  CHANGELOG / RELEASING / `npm version`. Full critique: **`PIPELINE_REVIEW.md`**.
- **`hermes/` → `agent/`** — generic bring-your-own-agent surface. ⚠️ Any external
  agent config (incl. the user's running Hermes) pointing at `hermes/*` must move to
  `agent/*`.
- **Guided pipeline intake (interactivity Layer 1)** — `lib/brief.js` + the
  `brief_schema` tool; opt-in **guided mode** in `idea-input` / `research-trends` /
  `content-intelligence`.
- **Alt-text + first-comment (ALPHA-014/015)** — `alt_text` (+ `alt_texts[]` carousel)
  on IG/FB/Threads; `first_comment` on IG/FB, **best-effort after a confirmed publish**.
  **Live-tested on @protocode_ / protocode:** IG verified; **FB alt-text UNVERIFIED**;
  **FB first-comment needs the `pages_manage_engagement` scope.**
- **Plans (not built):** `INBOX_FEATURE_PLAN.md` (comment-keyword → file/link) and
  **Individualization** (`PROJECT_SPECIFICATIONS.md` → *Individualization*).

**State:** 30 tools · 5 templates · 2 runtime deps · **100 unit + 28-check smoke +
`build:check` + `pack:smoke`** all green. (`development` pushed to origin; INDIV-003
on a feature branch, not yet merged — see *Pending branch*.)

## Pending branch (not yet merged)

- **`feature/INDIV-per-platform-tailoring`** (off `development`) — INDIV-003
  per-platform voice tailoring. `brand.resolveVoice` + `PLATFORM_OVERRIDE_FIELDS`
  resolve the kit's `platforms` deltas over the base voice (replace semantics);
  exposed via `brand_voice(action:"get", platform:…)`; the 6 platform skills consult
  it. Tools stay 30; **100 unit + 28-check smoke + `build:check` + `pack:smoke` green.**
  Awaiting the merge decision (`--no-ff` into `development`).

## NEXT

1. **Individualization backlog** (`PROJECT_SPECIFICATIONS.md` → *Individualization →
   Backlog*) — per-platform voice tailoring **shipped (INDIV-003, on branch)**; what
   remains: optional **audience segments** (a second axis), content policies/guardrails
   (banned topics, required disclosures, per-brand auto-publish vs confirm),
   learned/adaptive voice few-shots + per-brand observed best-times, and multi-brand
   management (list/switch/clone). Plus the deferred UI **export** (folder-copy works
   today). Optional polish: a real live `media_compose` upload via the `spmc` bin to
   confirm the kit-driven image end-to-end on the CDN.
2. **FB re-verify** (user is providing a modified token): `pages_manage_engagement` for
   the FB first-comment; re-test FB alt-text — if `alt_text_custom` still doesn't read
   back, try the two-step set (create photo → POST `alt_text_custom` to the photo node).
3. **INBOX-001** — decide Phase 0 (public reply, ships on current architecture) vs
   Phase 1 (DM, needs Meta App Review). Plan in `INBOX_FEATURE_PLAN.md`.
4. **Deferred:** publish story (#4 — unclaimed `spmc` npm name); ALPHA-016 delete
   (destructive, scope-paused); Mastodon (017) / LinkedIn (018) creds; X 402;
   BETA-011 UI stop-line.

## Conventions In Force

- **Build origin:** tool → `lib/tools.js`; limit → `lib/specs.js`; credential/media key
  → `lib/config.js` (+ `.env.example`); skill/agent prose → `capabilities/`; template →
  `media/templates/<id>/`; version → `spmc-server/package.json`. Then `npm run build`.
  **Never hand-edit generated artifacts** (`build:check` rejects it).
- **Gates (green at every commit):** `npm test` · `npm run build:check` · `test:smoke`
  · `pack:smoke`. CI runs all on push to `main` / `development` / `feature/**` + PRs;
  `prepublishOnly` re-runs them before any publish.
- **Bins:** `spmc` = `run.js` (MCP only) · `spmc-start` = `start.js` (MCP + scheduler).
- **Document permission scopes:** every feature touching a platform documents the scope
  it needs for user setup (`.env.example` + the skill) — AGENTS.md rule #7.
- **Credentials** in `~/.claude/spmc.env`; multi-account `KEY__ACCOUNT`. **Always confirm
  post content with the user before publishing** (no un-publish; `duplicate_check`
  guards reposts).
- **Git flow:** branch off `development`, merge `--no-ff` (no PR), push; `main` via PR
  only. Releases: `RELEASING.md`.
