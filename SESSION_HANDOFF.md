# SESSION_HANDOFF — SPMC (→ Honk)

> Read this before anything else. Replace entirely at session end — this is current state, not a log.

## Where We Are

**`v0.3.0-alpha` is on `main`.** **`development`** is the default/integration branch
and is **green on CI** with everything below merged + pushed. Branch off `development`,
merge into it (`--no-ff`, no PR), push; `main` only via PR.

## On `development` now (recently merged)

- **Brand layer fixes (2026-06-29) — INIT-004** — two bugs + one missing feature
  closed the "handle never rendered + logo missing" issue the Claude Desktop agent
  reported after a test run:
  1. **`media_compose` account-split fix** — `media_compose` was looking up the brand
     kit with `brand.get(args.account ?? '')`, hitting `_default` (no profile) when
     no explicit account is given. `brand_voice get` and `brand_schema` already use
     `brand.getActive()` as the fallback — `media_compose` was the one missed case.
     Fixed: `brandAccount = args.account ?? brand.getActive()`. Upload credentials
     remain on `args.account ?? ''` (brand identity and publishing identity can differ).
     Output now echoes which brand account was resolved via the active pointer.
  2. **`account_info` `seed_brand_kit` flag** — `account_info` already fetched
     `icon_url` (profile picture) + `handle` from IG/FB but had no write-back path
     to the brand kit. New `seed_brand_kit:true` merges the fetched `handle` +
     `icon_url` into the active brand account's `visual` block (same active-account
     fallback as the `media_compose` fix). Call `account_info(platform:"instagram",
     seed_brand_kit:true)` from Claude Desktop to populate `icon_url` in the brand kit.
  ⚠️ `logo_url` (the bottom-right corner stamp, a distinct designed mark) is still
  empty — IG profile picture goes into `icon_url` (template footer circle). If you
  want the corner stamp, a separate hosted logo URL is needed.
  All gates green (121 unit + 41-check smoke + build:check). **Pushed to `origin/development`.**

- **@protocode_ brand kit populated + data dir moved (2026-06-28)** — brand kit
  (`~/.honk/brand.json`, key `protocode_`) now fully populated: voice do/don't,
  emoji policy, 4-color visual palette, 5 personal CTAs, 4 named hashtag sets,
  per-platform deltas (IG: save-worthy CTAs + 6 hashtags; FB: conversational
  register + discussion CTAs), notes capturing niche/angle/alternating structure.
  `brand-active.json` created → `brand_voice(action:"get")` now resolves correctly
  from Claude Desktop. Data dir moved from `spmc-server/data/` to `~/.honk/`
  (`lib/paths.js` uses `os.homedir()`). `SPMC_DATA_DIR` → `HONK_DATA_DIR`
  (paths.js + test files + .env.example). `brand-setup` skill fixed: guided
  walkthrough now completes all 5 groups before offering to stop (was stopping
  after group 2), and platform deltas are proactively offered not skipped.
  **Rename SPMC → Honk** started: done items tracked in `PROJECT_STATUS.md` →
  *Rename* section; pending = MCP server name, npm package, bins, server dir, docs.
  ⚠️ Restart Claude Desktop for the new `~/.honk/` data path to take effect.

- **★ Content-quality fundamentals (INIT-003)** — closes the user-set top priority: the
  2026-06-26 IG+FB post was **too basic** (1–3 flat facts, no copy structure, sources
  only in chat, guided mode never offered). The fix is **fundamental and brand-agnostic**,
  not brand polish. New **`content-craft`** skill (single-concern, auto-discovered) is the
  craft layer every draft starts from:
    - **Engagement philosophy** — one idea per post, specificity over vagueness, open a gap
      early, value density, design for saves/shares, native format, action-inviting CTA.
    - **Layered copy structure** — hook → context/tension → payoff/insight → CTA, mapped
      onto single post / caption / carousel / thread (**hook + payoff non-negotiable**).
    - **Accessible source attribution** — every fact-bearing post puts the source where the
      reader can follow it (caption link / `first_comment` / on-image). **Distinct from the
      pipeline's primary-source *verification*** (`pipeline-orchestrator`): verify it's true,
      *then* make it followable. Reuses existing mechanisms (`link_tag`, `first_comment`,
      `media_compose` subtext, `alt_text`) — **no new plumbing**.
    - **Hashtag intent** — fewer/intentional; **defers per-platform counts** to the platform
      skills + brand-kit sets (no contradiction).
    - **Carousel arc** — slide-1 promise → one beat per slide → CTA/source.
  ⚠️ **Anti-orphan design:** a consulted skill only earns its place if something loads it —
  so content-craft has **real trigger phrases AND is explicitly invoked** by the 6 platform
  skills' Craft sections + `pipeline-orchestrator` Phase 1/3 + `output-manager` (not a passive
  "see also"). The hard **accessible-sourcing + copy-structure checks live in the persona
  checklist** (the always-run, non-skippable pre-publish gate — prose alone is skippable).
  Guided mode reframed buried-opt-in → **offered up front** (idea-input/research-trends).
  **Deferred (advisor-confirmed):** a deterministic "stat-without-URL" `content_validate`
  nudge — false-positives on "3× faster"/"month 3", doesn't enforce; the real deterministic
  gap is the already-deferred INDIV-004 dispatch re-validation. **Prose-first** on the
  single-origin build (1 new capability + 10 edited; **no `lib/` change**). **Tools stay 30,
  skills 14→15.** All four gates green at every commit.
- **Instagram publish race fixed (INIT-002)** — `adapters/instagram.js` created the media
  container and called `media_publish` on the next line, **never polling `status_code`**;
  under real timing IG returns `9007`/`2207027` ("media can't be published yet") and **live
  IG posts fail**. Added `waitForContainer` — polls until `FINISHED` before publish, on both
  the single-image and carousel paths. Because `lib/dispatch.js` + `lib/analytics.js` import
  the same adapter, this **also closes the race on the queue/scheduler dispatch path**.
  **Live-confirmed** on @protocode_ (IG media `17874248277652862`, FB `…_1411992160954659`).
- **Multi-brand management (INDIV-006)** — `brand_voice` `list` / `use` (active-account
  pointer in its own `brand-active.json`, brand.json stays flat) / `clone`. Reads default to
  active + echo; **writes/publishing/compose stay explicit** (pointer never redirects a post).
- **Audience segments (INDIV-005)** — `audiences{}` second tailoring axis; `resolveVoice`
  layers **base ▸ audience ▸ platform** (platform wins; replace semantics; provenance);
  unknown audience flagged, not silently applied.
- **Content policies / guardrails (INDIV-004)** — `policy` block + pure `checkPolicy`; always→
  warn, sponsored→error (per-call `sponsored` flag), **word-boundary** disclosure matching.
  ⚠️ **Direct publish hard-blocks; queue/scheduler dispatch does NOT re-validate** (deferred).
- **Individualization P1–P3 (INDIV-001/002/003)** — visual brand kit + 5 rebuilt templates;
  `brand_schema` + guided `brand-setup`; per-platform voice tailoring (`resolveVoice`).
- **Build/install pipeline hardening** — `lib/` ships, **pack-smoke gate**, CI gates
  `development` + `feature/**`, npm workspace, engines split, `spmc-start` bin. Critique:
  `PIPELINE_REVIEW.md`. ⚠️ `hermes/` → `agent/` (any `hermes/*` config moves to `agent/*`).
- **Alt-text + first-comment (ALPHA-014/015)** — IG verified live; **FB alt-text UNVERIFIED**;
  **FB first-comment needs `pages_manage_engagement`**; IG first-comment needs
  `instagram_manage_comments`.

**State:** 30 tools · **15 skills** · 5 templates · 2 runtime deps · **121 unit + 41-check
smoke + `build:check` + `pack:smoke`** all green. (Pushed to `origin/development`.)

## NEXT

0. **Content quality — fundamentals SHIPPED (INIT-003); now prove + extend.** The
   brand-agnostic craft layer is in place. Remaining content-quality work:
   - **Live-prove it.** The real test is a real post going out **materially better** — draft
     the next fact-bearing post through `content-craft` + the persona gates and confirm
     hook→payoff→CTA + a **followable** source (caption link / `first_comment`), not flat
     facts. A before/after draft was produced this session; a live publish wasn't.
   - **Brand layer (SECONDARY — suggest INIT-004).** Logo on-image (`logo_url`/`icon_url`),
     palette, visual identity → brand kit (`brand-setup`/`brand_schema`). Complements the
     fundamentals; does **not** gate them. There's no `brand.json` for @protocode_ yet —
     setting one up is the natural next concrete step before the next real post.
   - **Templates beyond the floor (optional).** The carousel *structure* is now documented;
     new multi-slide *templates* (vs. the current 5) are a possible follow-up, not required.
   See memory `post-quality-standards`.
1. **INDIV-007 Learned/adaptive** — voice few-shot examples + observed best-times
   (`best_time` `observedWindows`). **Data-gated** — needs accrued analytics history (still
   unverified). Plan it, expect to defer; natural point to pause Individualization and start
   the **UI phase (BETA-011)**. Carry-forward follow-ups (deferred, for the UI phase):
   INDIV-006 account registry; INDIV-005 segment enumeration in guided mode; INDIV-004
   deterministic dispatch/`auto_publish` gate.
2. **Live verification (needs valid creds — read scopes).** Turnkey steps in
   `ANALYTICS_VERIFICATION.md`. Analytics path de-risked 2026-06-25 (metric sets re-verified,
   no drift); remaining = the live end-to-end run + Threads (never had creds). **FB re-verify**
   (`pages_manage_engagement` first-comment; re-test FB alt-text two-step set).
3. **INBOX-001** — decide Phase 0 (public reply) vs Phase 1 (DM, needs Meta App Review). Plan
   in `INBOX_FEATURE_PLAN.md`.
4. **Deferred:** publish story (#4 — unclaimed `spmc` npm name); ALPHA-016 delete
   (destructive, scope-paused); Mastodon (017) / LinkedIn (018) creds; X 402; BETA-011 UI.

## Conventions In Force

- **Build origin:** tool → `lib/tools.js`; limit → `lib/specs.js`; credential/media key →
  `lib/config.js` (+ `.env.example`); skill/agent prose → `capabilities/`; template →
  `media/templates/<id>/`; version → `spmc-server/package.json`. Then `npm run build`.
  Adding `capabilities/skills/<x>.md` auto-registers `skills/<x>/SKILL.md` (build discovers
  the tree). **Never hand-edit generated artifacts** (`build:check` rejects it).
- **Gates (green at every commit):** `npm test` · `npm run build:check` · (in `spmc-server`)
  `npm run test:smoke` · `npm run pack:smoke`. CI runs all on push to `main` / `development` /
  `feature/**` + PRs; `prepublishOnly` re-runs them; the opt-in pre-commit hook runs
  `build:check`. ⚠️ The Bash tool here is git-bash (not PowerShell); commit via `git commit -F
  <msgfile>` to dodge here-string/apostrophe breakage.
- **Bins:** `spmc` = `run.js` (MCP only) · `spmc-start` = `start.js` (MCP + scheduler).
- **Document permission scopes:** every feature touching a platform documents the scope it
  needs (`.env.example` + the skill) — AGENTS.md rule #7.
- **Credentials** in `~/.claude/spmc.env`; multi-account `KEY__ACCOUNT`. **Always confirm post
  content with the user before publishing** (no un-publish; `duplicate_check` guards reposts).
- **Git flow:** branch off `development`, merge `--no-ff` (no PR), push; `main` via PR only.
  ⚠️ `pg`'s ticket counter is out of sync with git's ticket IDs — confirm the next free ID
  against git history (it re-echoed INIT-002, already used by the IG fix → this work is INIT-003).
- **Rename in progress — SPMC → Honk:** data dir already `~/.honk/`. Remaining phases
  (package name, bin, server dir, env var, docs) tracked in `PROJECT_STATUS.md` → *Rename* section.
  New features use Honk naming; existing `SPMC_*` identifiers stay until their phase.
