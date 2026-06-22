# SESSION_HANDOFF — SPMC

> Read this before anything else. Replace entirely at session end — this is current state, not a log.

## Where We Are

**`v0.3.0-alpha` is on `main`.** **`development`** is the default/integration branch
and is **green on CI** with everything below merged + pushed. Branch off `development`,
merge into it (`--no-ff`, no PR), push; `main` only via PR.

## On `development` now (recently merged)

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

**State:** 29 tools · 5 templates · 2 runtime deps · **77 unit + 25-check smoke +
`build:check` + `pack:smoke`** all green.

## NEXT

1. **Individualization — Phase 1: visual identity in the brand kit** (the headline next
   build). Add a `visual` block (`accent` / `bg_color` / `logo_url` / `default_template`)
   to `lib/brand.js` `emptyProfile()`; have `media_compose` + the output skills default
   from it (removes the "pass colors every call" friction). Then Phase 2: `brand_schema`
   + guided brand setup (the adoption gate). See `PROJECT_SPECIFICATIONS.md` →
   *Individualization* for the seed + backlog.
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
