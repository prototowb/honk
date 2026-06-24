# SESSION_HANDOFF — SPMC

> Read this before anything else. Replace entirely at session end — this is current state, not a log.

## Where We Are

**`v0.3.0-alpha` is on `main`.** **`development`** is the default/integration branch
and is **green on CI** with everything below merged + pushed. Branch off `development`,
merge into it (`--no-ff`, no PR), push; `main` only via PR.

## On `development` now (recently merged)

- **Audience segments (INDIV-005)** — a second voice-tailoring axis: the kit's new
  `audiences{}` map lets a brand speak differently to named audiences ("enterprise"
  vs "indie"), independent of platform. The override field list is now one canonical
  `OVERRIDE_FIELDS` (`PLATFORM_OVERRIDE_FIELDS` aliases it — all six;
  `SEGMENT_OVERRIDE_FIELDS` = it **minus `audience`**, since selecting a segment IS
  the audience). `resolveVoice(profile, {platform, audience})` (bare string still =
  platform) layers **base ▸ audience ▸ platform** — platform wins last, so a
  platform delta fully shadows an audience delta on the same field (replace
  semantics); returns per-field `sources` provenance and sets the effective
  `audience` to the segment name. ⚠️ **An unknown audience name does NOT silently
  apply** — values stay base and `unknownAudience` is flagged in the resolved view.
  Exposed via `brand_voice(action:"get", platform?, audience?)`. `brief.js`'s
  `audience_delta` → a single `audience` field. **Tools stay 30.** 117 unit +
  36-check smoke.
- **Content policies / guardrails (INDIV-004)** — the brand kit gains a `policy`
  block (`banned_topics`, `disclosures.always/sponsored`, `auto_publish`) that is
  now **enforced**. Pure `checkPolicy(platform, content, policy, {sponsored})` in
  `validate.js` (disk-free — the handler loads policy via `brand.getOrEmpty` and a
  `validateWithPolicy` helper merges it in, the link_tag pattern): a missing
  `disclosures.always` token **warns**; a missing `disclosures.sponsored` token on
  a post flagged `sponsored:true` is a blocking **error**; `banned_topics` surface
  as drafting-reminder notes; present disclosures echo ✓ in dry-run/validate.
  `sponsored` is a per-call flag on the 7 publish tools + `content_validate` (which
  also gained `account`). **Disclosure matching is word-boundary token containment,
  not plain substring** — "#ad" is NOT satisfied by "#advanced", "Ad" NOT by "had"
  (closes the fail-open on the blocking path). `auto_publish` is agent-guided
  (persona + skills), **no deterministic dispatch gate in v1.** ⚠️ **Enforcement
  boundary:** only **direct publish** hard-blocks; `queue_add` is advisory and the
  real **queue/scheduler dispatch path does not re-validate**, so a policy-violating
  queued post can still go out — the deterministic dispatch/auto_publish gate is the
  deferred follow-up. Documented in `content-intelligence`/`brand-setup`/6 platform
  skills/persona + `brand_schema`. **Tools stay 30.** 110 unit + 33-check smoke.
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
- **Per-platform voice tailoring (INDIV-003)** — the kit's `platforms` block now
  resolves: `brand.resolveVoice` + exported `PLATFORM_OVERRIDE_FIELDS` merge per-platform
  deltas (tone/register/emoji_policy/audience/hashtags/cta) over the base voice with
  **replace** semantics. Exposed via `brand_voice(action:"get", platform:…)` as a
  **superset** view (the six resolved fields + global banned_words/sets/do/dont, so a
  platform-scoped get carries everything a draft needs). The 6 platform skills consult
  it; `content-intelligence`/`brand-setup` document it. No new tool (overloaded `get`).
  **Live-tested** through the server (replace + provenance + null-safety confirmed).
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

**State:** 30 tools · 5 templates · 2 runtime deps · **117 unit + 36-check smoke +
`build:check` + `pack:smoke`** all green. (Pushed to `origin/development`.)

## NEXT

1. **Individualization backlog — INDIV-004 + INDIV-005 shipped; INDIV-006 is next.**
   Full plans (shape · logic · surface · tests · open decisions) in
   `PROJECT_SPECIFICATIONS.md` → *Individualization → Backlog — planned*; build order
   also in `PROJECT_STATUS.md` → *Next Up*. **Remaining order:**
   1. **INDIV-006 Multi-brand** (build next): `brand_voice` `action:"list"` (enumerate
      accounts with a one-line summary) + `action:"clone"` (`to` arg — copy a profile
      to a new account key). *Open: stored active-account pointer (`_active` in the
      store) vs purely agent-carried context — lean agent-carried for now, revisit
      with the UI.*
   2. **INDIV-007 Learned/adaptive**: few-shot examples + observed best-times —
      **data-gated** (needs accrued analytics; likely defer).
   Plus deferred UI **export** (folder-copy works today) and optional polish: a real
   live `media_compose` upload via the `spmc` bin to confirm the kit-driven image on the CDN.
   **INDIV-004 follow-up (deferred):** a deterministic dispatch/`auto_publish` gate so
   the queue/scheduler path enforces policy (today only direct publish hard-blocks).
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
