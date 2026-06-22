# SESSION_HANDOFF — SPMC

> Read this before anything else. Replace entirely at session end — this is current state, not a log.

## Where We Are

**`v0.3.0-alpha` is on `main`.** `development` is the default/integration branch.

**Merged into `development` (pushed, CI green):** the **PIPELINE-hardening** pass
(see `PIPELINE_REVIEW.md`, 10 findings) + **guided mode** + a one-line **audit
flake fix** (`recentDuplicate` window made exclusive — the new development CI gate
caught a same-millisecond race on its first run).

**Also merged this session:** **alt-text + first-comment** (ALPHA-014/015) —
live-tested on the brand, IG verified, FB caveats flagged (item 10). Plus
**`INBOX_FEATURE_PLAN.md`** drafted (INBOX-001, plan only, not built).

The pipeline-hardening details below are retained for reference (item 1–9); the
alt-text/first-comment work is item 10.

## What Shipped This Session (`feature/PIPELINE-hardening`)

1. **P0 — the npm tarball was dead on arrival.** `lib/` was missing from the
   `files` allowlist, but `index.js` imports 13 modules from it → the package
   crashed at load (`ERR_MODULE_NOT_FOUND`). Latent (the `spmc` name is
   unpublished) but it broke every npm/`npx` surface on first publish. Fixed.
2. **Pack-smoke gate** (`spmc-server/test/pack-smoke.mjs` · `npm run pack:smoke`)
   — packs → installs → boots the tarball; a `files`-array omission now fails CI
   and `prepublishOnly`. Proven both ways (passes healthy; fails when `lib/` pulled).
3. **CI now gates `development` + `feature/**`** (was `main`-only) — integration
   merges land by direct push (no PR), so they were previously ungated.
4. **`prepublishOnly`** = `test` + `build:check` + `pack:smoke` (can't publish a
   broken/stale/unrunnable package by hand).
5. **Dev env** — real npm workspace (root `npm install` bootstraps the server);
   shell-independent test discovery (quoted glob → Node globs it); engines split:
   **server runtime ≥20.9** (sharp's floor — keeps Node 20 LTS installable), **dev
   tooling ≥21** (root). Local-gate + pre-commit-hook enablement documented in
   `TESTING.md`.
6. **`hermes/` → `agent/`** (`git mv`, history preserved) — the BYO-agent pack is
   now a generic surface; OpenClaw/generic clients are pointed at the same
   briefing; titles de-"Hermes"'d; the machine-specific path in `CONTEXT.md` is a
   placeholder. ⚠️ **ACTION:** any external agent config (incl. the user's running
   Hermes) pointing at `hermes/*` must move to `agent/*`.
7. **`spmc-start` bin** — MCP server **+** scheduler, so npm-installed users get
   scheduled-post auto-dispatch + the ~24h auto-analytics follow-up (`start.js`
   got its missing shebang). The `spmc` bin stays MCP-only.
8. **Release hygiene** — `CHANGELOG.md` (Keep a Changelog, 0.1→0.3-alpha +
   `[Unreleased]`), `RELEASING.md`, and an `npm version` hook that regenerates the
   version-stamped artifacts (`TOOLS.md`, `plugin.json`, `claude_desktop_config.json`).
9. **Optional guided pipeline intake (interactivity Layer 1)** — `lib/brief.js`
   defines the per-run content-brief field schema (angle, goal, platforms, schedule,
   references, constraints) as a single source, exposed via a `brief_schema` tool
   that annotates which fields the brand kit pre-fills. `idea-input` /
   `research-trends` gained an opt-in **guided mode** that walks the schema one field
   at a time (skipping brand-kit pre-fills) instead of one big command — the same
   spec a future web-UI form renders. Default one-shot flow unchanged. 5 unit + 1 smoke.

10. **Image alt-text (ALPHA-014) + first-comment (ALPHA-015)** — *current branch,
    not merged.* API fields confirmed against the Meta/Threads docs first.
    **alt_text** (+ `alt_texts[]` per carousel slide) on IG (`/media`), FB
    (`alt_text_custom`), Threads (container param, unverified live) — threaded into
    the publish payload, validated, previewed in `dry_run`. **first_comment** on
    IG/FB via new `instagram.comment`/`facebook.comment` — **best-effort AFTER** a
    confirmed+audited publish, so a comment failure never marks the live post
    failed or blinds `duplicate_check`. X/Bluesky alt-text deferred (text-only
    adapters — no media path). **Live-tested on @protocode_ / protocode:** IG
    alt-text + first-comment **verified**; the **best-effort design proven** (an FB
    comment-permission failure left the post live). **FB alt-text UNVERIFIED**
    (didn't read back — flagged like Threads); **FB first-comment needs the
    `pages_manage_engagement` scope** (IG needs `instagram_manage_comments`). New
    convention: features document their permission scopes (AGENTS.md rule #7 +
    `.env.example`).

**State:** all green — **77 unit + 25-check smoke + `build:check` + `pack:smoke` +
the `prepublishOnly` chain**. Tools **29**; templates 5; runtime deps 2.

## NEXT — open items

- **FB re-verify pending a modified token (user will provide):** the current Page
  token lacks `pages_manage_engagement` (first comment failed soft) and FB alt-text
  (`alt_text_custom`) didn't read back. With a fuller-scoped token, re-test FB
  first-comment + alt-text; if alt-text still doesn't persist, try a two-step set
  (create photo → POST `alt_text_custom` to the photo node).
- **INBOX-001 (comment-keyword → file/link)** — **plan drafted**
  (`INBOX_FEATURE_PLAN.md`), not built. Decide: start at **Phase 0** (public reply,
  ships on current architecture, no Meta App Review) vs hold for **DM** (Phase 1,
  needs App Review + `*_manage_messages`); IG-only or IG+FB; file = hosted link
  (reuse `media_upload`) vs true attachment.
- **Interactivity — Layer 1 SHIPPED (guided mode, see #9 above).** Deferred:
  **Layer 2** (persist in-progress briefs by extending the drafts/queue store so a
  guided session resumes and a UI can load/save partial briefs) and **Layer 3**
  (web-UI form / MCP elicitation — both render the same `brief_schema` spec). Both
  belong with the BETA-011 UI phase; elicitation's client support needs verifying.
- **#4 publish story (deferred by the user):** `spmc` npm name is unclaimed and the
  `npx` surface is advertised but not live. Settle the name (publish `spmc` vs a
  scoped `@owner/spmc`), then publish — already gated by `prepublishOnly`; consider
  a tag-triggered publish job.
- **Pre-existing paused tracks:** ALPHA-016 delete/unpublish (destructive — gated
  on scope confirm); Mastodon (017) / LinkedIn (018) creds; X 402 credits;
  BETA-011 UI-planning stop-line.

## Conventions In Force

- **Build origin:** tool → `lib/tools.js`; limit → `lib/specs.js`; credential/media
  key → `lib/config.js` (+ `.env.example`); skill/agent prose → `capabilities/`;
  template → `media/templates/<id>/`; version → `spmc-server/package.json`. Then
  `npm run build`. **Never hand-edit generated artifacts** (`build:check` rejects
  it). `agent/persona.md` is hand-authored (not generated).
- **Gates (keep green at every commit):** `npm test` (root) · `npm run build:check`
  (root) · `npm --prefix spmc-server run test:smoke` · `npm --prefix spmc-server run
  pack:smoke`. CI runs all of them on push to `main`/`development`/`feature/**` + PRs.
  `prepublishOnly` re-runs test + build:check + pack-smoke before any publish.
- **Bins:** `spmc` = `run.js` (MCP only) · `spmc-start` = `start.js` (MCP +
  scheduler). One dispatcher (`lib/dispatch.js`); every real publish goes through
  `publishAudited` (also the analytics-follow-up hook point).
- **Credentials** in `~/.claude/spmc.env`; multi-account `KEY__ACCOUNT`. Always
  confirm post content with the user before publishing (no un-publish;
  `duplicate_check` guards reposts).
- **Git flow:** branch off `development`, merge into it (`--no-ff`, no PR), push it;
  `main` only via PR. Releases: see `RELEASING.md`.
