# SESSION_HANDOFF — Honk

> Read this before anything else. Replace entirely at session end — this is current state, not a log.

## Where We Are

**`v0.3.0-alpha` is on `main`.** `development` is the default/integration branch (green on CI).
**`feature/INIT-006-release-hardening` is complete but UNMERGED and UNPUSHED** — this session ran
local-only by user choice. First action next session: review, then merge `--no-ff` into
`development` and push, per BRANCHING.md.

## On `feature/INIT-006-release-hardening` (this session — 5 commits)

**INIT-006 Production-release hardening** — the iteration toward a first production release.
User direction: "get it and its SDLC in shape for a first production release; optimize and
streamline." Focus confirmed: hardening over new features; UI phase (BETA-011) still the stop-line.

1. **Policy-gate active-account fallback** (`fix(policy)`) — closes the INIT-005 boundary flagged
   in three places: a post queued without an explicit `account:` was dispatched against the empty
   `_default` policy — no enforcement. `validateWithPolicy` now resolves the POLICY lookup via
   `account || brand.getActive()` (the INIT-004 `media_compose` precedent: brand identity follows
   the active pointer, publish CREDENTIALS stay explicit — the pointer never redirects a post).
   Fallback surfaced as a provenance note in previews/dry-runs. +3 unit tests, incl. "explicit
   account is never overridden by the pointer".
2. **HTTP timeouts + secret redaction + durable stores** (`feat(robustness)`) —
   - `lib/http.ts` `fetchWithTimeout`, imported **aliased as `fetch`** by all 6 adapters +
     `media/upload` (call sites untouched; new call sites in those files inherit it). Default 30s,
     `HONK_HTTP_TIMEOUT_MS` override. Before: no outbound call had ANY timeout — a hung Graph call
     hung the MCP tool response or a scheduler tick forever.
   - `redactSecrets` scrubs token-shaped material (query `access_token=`/`api_key=`/`signature=`,
     Bearer/OAuth headers, JSON-embedded creds) at the **audit/throw boundary** (`audit.record` +
     `publishAudited` catch) — scrub-at-boundary so a new adapter can't forget it. Graph request
     URLs carry tokens in the query string and error text is persisted to the durable audit log.
   - `lib/jsonstore.ts` — `writeJsonAtomic` (tmp+rename) for queue/brand/followups/ratelimit/
     analytics stores; `readJsonOr` backs corrupt user-authored stores (queue, brand kit, active
     pointer) up beside the store (`.corrupt-<ts>`) before falling back. Before: a torn
     `queue.json` parsed as empty and the next save wiped every draft.
   - +12 unit tests (redaction patterns; a REAL timeout against a hanging local HTTP server;
     atomic round-trip; corrupt-backup preserves original bytes).
3. **Release engineering** (`chore(release)`) — LICENSE (MIT) at root + in `honk-server/` (npm now
   ships it; `"license": "MIT"` was declared with NO file — publish blocker); `repository` (with
   monorepo `directory`), `bugs`, `homepage` in package.json; **env.example drift healed**: root
   `.env.example` still documented the pre-flip `KEY__ACCOUNT` suffix convention + SPMC header,
   while `honk-server/env.example` had the new prefix convention but stale scope/provider prose —
   reconciled into ONE canonical content in both places, plus a new *Operational settings* section
   documenting `HONK_DATA_DIR` + `HONK_HTTP_TIMEOUT_MS`.
4. **SDLC docs streamline** (`docs(sdlc)`) — `PROJECT_STATUS.md` 44KB → 19KB: narrative *Recent
   Updates* moved to **`PROJECT_HISTORY.md`** (newest first — new convention, wired into AGENTS.md
   reading list); the "Deferred stop-lines" section had the rename tables committed INSIDE it,
   orphaning the stop-lines table — untangled; completed rename compacted to a summary; INIT-006
   recorded in the Completed table; metrics refreshed.
5. **CHANGELOG** — Unreleased section updated with all of the above (in the final docs commit).

**INIT-007 Steering-layer hardening (same branch, after INIT-006)** — user directive: also
harden concept/vision/architecture/approach for existing, planned and unplanned features.
- `PROJECT_SPECIFICATIONS.md` restructured: north star (publishing automation + assets &
  digital brand management platform), 4 pillars (Publish · Brand OS · Intelligence & Engage ·
  Delegation), non-goals, an explicit **1.0 definition**, and a **horizon roadmap H0–H3 with
  entry criteria** placing every existing/planned/proposed feature (workflow library v1,
  account registry, store `schema_version`, asset registry/DAM seed, blog + newsletter
  channels, campaigns, evergreen recycling, hosted HTTP MCP, brand-portal export,
  `content_check` report). Stale MVP tables removed (cross-link, don't duplicate);
  Individualization record + agent contract preserved.
- `PROJECT_ARCHITECTURE.md` + **Target Architecture & Evolution**: layering law, channel SPI
  (platforms→channels with capability flags — absorbs the hard-coded IG/FB first-comment
  list), storage trigger JSON→`node:sqlite` (engines≥22 cost recorded, adopt at H1),
  transport milestone (hosted Streamable-HTTP MCP at H2), **security doctrine** (deterministic
  vs agent-judged gates; fetched web content is data, never instructions), account registry.
- `ROADMAP_NOTES.md` + Research Round 2: DAM patterns (Frontify portal, Bynder rights/expiry),
  Ghost/WordPress/Buttondown/Sanity → one `long_form` content shape, MeetEdgar-class
  recycling as query+suggestion, guardian = CI-for-content.
- ⚠️ Root `ARCHITECTURE.md` is an unfilled proto-gear template ({{FRAMEWORK}} placeholders) —
  doc rot; either fill via `pg` or point it at PROJECT_ARCHITECTURE.md next `pg` session.

**State:** 30 tools · 15 skills · 5 templates · 2 runtime deps · **143 unit (+15) + 43-check
smoke + build:check + pack:smoke** all green at every commit.

⚠️ Session notes:
- Sandbox test-run artifact: `@img/sharp-linux-x64` + `@img/sharp-libvips-linux-x64` were copied
  into `honk-server/node_modules/@img/` so the Linux sandbox could run the compose tests
  (Windows-installed sharp binaries don't load there). **No lockfile change**; harmless on
  Windows; a fresh `npm install` normalizes it.
- An untracked `.claude/` dir exists at repo root (Cowork session artifact) — ignore or gitignore.

## NEXT

0. **Merge + push INIT-006** (review first). Then the npm **publish story** is nearly unblocked:
   LICENSE + metadata done; remaining = check `honk` name availability on the registry (was
   deliberately out of scope for this local-only session), then RELEASING.md flow.
1. **Content quality — live-prove INIT-003.** Draft the next fact-bearing post through
   `content-craft` + persona gates; confirm hook→payoff→CTA + a followable source lands
   materially better. A before/after draft exists; a live publish doesn't.
2. **INDIV-007 Learned/adaptive** — data-gated on accrued analytics; natural pause point to start
   the **UI phase (BETA-011)**. Carry-forward for the UI phase: full account registry
   (brand-active.json is its seed), INDIV-005 segment enumeration in guided mode.
3. **Live verification (needs valid creds — read scopes).** `ANALYTICS_VERIFICATION.md` runbook;
   FB re-verify (`pages_manage_engagement` first-comment, FB alt-text read-back); Threads never
   had creds.
4. **INBOX-001** — Phase 0 (public reply) vs Phase 1 (DM, Meta App Review) decision;
   plan in `INBOX_FEATURE_PLAN.md`.
5. **Deferred:** ALPHA-016 delete (destructive, scope-paused); Mastodon (017) / LinkedIn (018)
   creds; X 402; BETA-011 UI (stop-line).

## Conventions In Force

- **TypeScript default** — new source in `honk-server/src/*.ts`; compiled JS at existing paths is
  GENERATED (never hand-edit; `npm run build:ts`, `pretest` compiles automatically).
- **Outbound HTTP** — never call bare `fetch` in adapters/media: import
  `{ fetchWithTimeout as fetch } from '../lib/http.js'`. Secrets are scrubbed at the audit
  boundary, but don't put tokens in error text anyway.
- **JSON state writes** — use `lib/jsonstore.ts` (`writeJsonAtomic` / `readJsonOr`), not bare
  `writeFileSync`, for anything under `~/.honk/`.
- **Build origin:** tool → `src/lib/tools.ts`; limit → `src/lib/specs.ts`; credential/media key →
  `src/lib/config.ts` (+ `.env.example` — root and `honk-server/env.example` are ONE canonical
  content, keep both in sync); skill/agent prose → `capabilities/`; template →
  `media/templates/<id>/`; version → `honk-server/package.json`. Then `npm run build:ts && npm run
  build`. **Never hand-edit generated artifacts** (`build:check` rejects it).
- **Gates (green at every commit):** `npm test` · `npm run build:check` · (in `honk-server`)
  `npm run test:smoke` · `npm run pack:smoke`. CI gates `main`/`development`/`feature/**` + PRs.
- **Narrative history → `PROJECT_HISTORY.md`** (newest first); `PROJECT_STATUS.md` stays a lean
  snapshot (tables + current state only).
- **Bins:** `honk` = `run.js` (MCP only) · `honk-start` = `start.js` (MCP + scheduler).
- **Credentials** in `~/.claude/honk.env` (`spmc.env` read as transition fallback); named accounts
  are **`ACCOUNT__KEY`** prefix; default account = bare keys, NOT a fallback. **Always confirm
  post content with the user before publishing.**
- **Git flow:** branch off `development`, merge `--no-ff` (no PR), push; `main` via PR only.
  Commit via `git commit -F <msgfile>` (git-bash quoting). `pg`'s ticket counter is out of sync
  with git — confirm next free ID against git history (INIT-006 was this session's).
- **Document permission scopes** for every platform-touching feature (`.env.example` + skill).
