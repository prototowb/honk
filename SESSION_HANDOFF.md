# SESSION_HANDOFF — Honk

> Read this before anything else. Replace entirely at session end — this is current state, not a log.

## Where We Are

**`v0.3.0-alpha`** · `development` is default/integration (green) and **pushed —
`origin/development` is caught up** (was ~28 commits behind at session start; see
below). `main` still at v0.3.0-alpha via PR only.

**State:** **34 tools** · 15 skills · 5 templates · 2 runtime deps · **183 unit +
49-check smoke + build:check + pack:smoke** green at every commit.

## This Session (2026-07-27/28) — repo repair + push + INIT-014 + INIT-015

**Repo repair (first thing, before any other work):** this was the first session on the
real host since the prior sandboxed session (2026-07-06/07). `.git/index` was **entirely
missing** — the sandbox's off-mount-index workaround (see the retired Session
Infrastructure section below) never got written back — so `git status` showed all 250
tracked files as deleted, though the working tree content was intact. Fixed with `git
read-tree HEAD` (rebuilds the index from a commit; touches no files) after confirming via
`git write-tree` / tree-hash comparison that the working tree was byte-identical to
`development`'s tip. A stale 3-week-old `.git/HEAD.lock` (from the same sandbox session
half-failing a git operation — see old point 2 below) also had to be removed before `git
symbolic-ref HEAD refs/heads/development` would take. **If `git status` ever again shows
mass deletions with content still present on disk, suspect a missing/stale index before
anything else** — do NOT `git add -A`/commit over it without first diffing working-tree
content against the branch tip it should match.

**Pushed `development` → `origin/development`** (27 commits, including the INIT-012 +
INIT-013 work from the prior session that never left the sandbox).

**INIT-014 Account registry v1** (`feature/INIT-014-account-registry`, merged) — the H1
item ("grow `brand-active.json` into `accounts.json`"):
- `src/lib/accounts.ts` — new versioned store (`accounts.json`, INIT-008 contract: this
  file is machine-written-only, unlike the deliberately-flat `brand.json`/
  `brand-active.json`, so format drift should be detectable). Still owns the **active
  account pointer** — `brand.getActive`/`setActive` now delegate to it, with `getActive()`
  read-only-seeding from the legacy `brand-active.json` on first read (no explicit
  migration step; the first `setActive()` call creates `accounts.json` going forward).
  Now also **caches each account's channel handle** (id/handle/name/icon_url) fetched via
  `account_info`, recorded best-effort so a registry hiccup can never fail the profile
  read. `config.ts`'s `accountsOverview()` layers the cache onto `brand_voice list` output
  — no live API round trip needed to see it.
- **Scope held to exactly the H1 line** — credential identity (env) × brand identity
  (`brand.json`) × channel handles, nothing more. Credential presence and brand-profile
  existence stay live-computed (unchanged) in `config.ts`; the registry only owns what
  neither of those already own. No `display_name`/`notes`/new tool — those would be
  designing for the not-yet-started BETA-011 UI, not what H1 asked for.
- **Case handling (the part worth re-reading if you touch this later):** registry keys are
  lowercase-normalized (matches `accountsOverview()`'s existing join, which already
  lowercases both credential and brand-profile account names). The **active pointer stays
  raw-case** — `brand.get()`/`env(key, account)` key off the exact case the user set, so
  lowercasing `getActive()`'s return would desync the pointer from the accounts it
  resolves against (a live policy-fallback regression). Covered by a dedicated test.
- Tools stay **34** — no new tool; `brand_voice list` and `account_info` are unchanged
  call shapes with richer output. 180 unit (+9) + 49 smoke (unchanged — the handle-cache
  path needs live `account_info` creds smoke can't exercise; covered by the 9 unit tests
  instead, plus the full unchanged 49-check smoke suite passing as a regression check on
  the `brand.ts`/`config.ts` refactor).
- **Follow-up cleanup same session:** cut `accounts.ts`'s `list()` — exported but nothing
  in `src/` called it (no `account_list` tool; same designing-for-hypotheticals rule that
  kept `display_name`/`upsert` out). The two tests that used it were rewritten against
  `get()`; a real-upgrade-path test was added (`accounts.json` created while a stale
  populated `brand-active.json` still exists on disk — confirms the legacy file is only
  read before `accounts.json` exists, never after).

**npm publish descoped indefinitely (user decision):** there is no plan to distribute
`honk` via the npm registry. Moved to PROJECT_STATUS *Descoped* (backlog-hygiene rule —
AGENTS.md) and dropped from the H0 goal list in PROJECT_SPECIFICATIONS.md. `RELEASING.md`
and the `package.json` publish metadata (LICENSE, repository/bugs/homepage) stay as
harmless reference, not an active target. `prepublishOnly`/`pack:smoke` keep running —
they validate the tarball installs cleanly (`npm install -g .` from a local clone, per
README), which matters independent of ever pushing to the registry.

**Doc-rot found and healed, same decision pass:**
- The 1.0 definition's point 2 hard-required "npm package public" — directly conflicting
  with the descope above. **User call: drop the public-registry requirement.** 1.0's
  install bar is now git-clone → `npm install` → `npm install -g .` (or wired directly
  into an agent surface) + a correct README, ≤ 10 min cold. Rewritten in
  PROJECT_SPECIFICATIONS.md.
- **`README.md` was almost entirely un-swept from the SPMC→Honk rename** despite
  PROJECT_STATUS.md claiming that rename "COMPLETE" weeks ago: title, every path
  (`spmc-server/`), bin names (`spmc`/`spmc-start`), credential file (`spmc.env`), skill
  count (13, missing `brand-setup` + `content-craft` entirely), test counts (37) — all
  pre-rename. Only the generator-injected tool table (between the `<!-- gen:tools -->`
  markers) was actually current. Rewritten wholesale this session; `build:check` confirms
  the generated section still matches. **If another doc claims a sweep/rename is
  "complete," spot-check it — don't trust the claim.**
- `PROJECT_SPECIFICATIONS.md`'s H0 goal list had two items sitting unchecked for weeks
  after they'd shipped: "Store format versioning" (done — INIT-008) and "Live-prove
  content-craft" (done — INIT-011's AI-security post). Both now marked ✅.
- **`npm audit` clause (point 5) — found AND fixed same session.** 5 vulnerabilities
  (1 high, 3 moderate, 1 low) in transitive deps (`fast-uri` via `ajv`, `hono` via
  `@modelcontextprotocol/sdk`); `npm audit fix` bumped the (root, npm-workspace-hoisted)
  lockfile only — `@modelcontextprotocol/sdk` moved to 1.30.0, still inside its existing
  `^1.12.0` range in `package.json`, which is untouched. `npm audit` now reports **0
  vulnerabilities**; type-check + 180 unit + 49 smoke + build:check + pack:smoke all
  reverified green after the bump.

**INIT-015 — live re-verification, and it immediately found a real bug.** With every
H0/1.0 criterion checked, prepped a live pipeline re-run to confirm the SDK bump +
INIT-014 didn't break anything real:
- Wrote a throwaway MCP client script (`run.js` as the entry point — NOT `index.js`
  directly, which skips credential loading entirely; that mistake produced a false
  "everything's unconfigured" reading on the first pass, worth remembering) and called
  `config_doctor` + `account_info` against real IG/FB creds on the `protocode` account.
  Both tokens are genuinely live-valid, not just present.
- **That `account_info` call was the first live exercise of INIT-014's
  `account_info`→`recordHandle` path — and it broke immediately.** `brand_voice list`
  rendered `instagram=@@protocode_` (double `@`). Root cause: `instagram.ts`/`facebook.ts`
  `getProfile()` already prefix `@` onto the handle before it reaches the registry;
  `formatAccounts()` in `config.ts` prepended a second one. No unit or smoke test could
  have caught this — the whole point of that code path is that it only runs with a real
  credential in hand. Fixed (`config.ts` renders `h.handle` verbatim), 3 new unit tests
  (`config.test.mjs` — enrichment, the `@@` regression, and the name-fallback case),
  reconfirmed against the live server. **183 unit total now.**
- Drafted a build-in-public post about exactly this (content-craft hook→payoff→CTA
  structure, on-brand for `protocode`'s dev/AI-tools niche) — `media_compose` (square-tall,
  kit identity) → `content_check` **PASS** both platforms → explicit user approval →
  published live: **IG `17891013474664651`**, **FB `105275157663337_1439990154821526`**.
  Confirms the whole chain — SDK bump, account registry, the handle fix — holds up under
  a real publish.

**Every H0 bullet and every "1.0 Means" criterion now checks out — nothing in the
definition is blocking `v1.0.0` anymore. Whether/when to cut it is the user's call.**

## Session Infrastructure — sandbox-only, retired here but keep for reference

The prior session ran in a sandbox with a mounted drive that misbehaved; **none of this
applies on the user's own machine** (confirmed again this session — real host, no mount
issues beyond the one-time missing-index repair above, which was a leftover *from* the
sandbox, not a live sandbox problem).
1. Desktop file tools (Write/Edit) could truncate/null-pad files on the mount — write via
   bash instead, verify with `wc -c` vs `git show HEAD:<file> | wc -c`.
2. `.git/HEAD`/`ORIG_HEAD` were intermittently un-writable → `git switch`/`merge` could
   fail or half-fail; use plumbing (`git write-tree` → `git commit-tree` → `git update-ref`).
3. Off-mount index (`GIT_INDEX_FILE=/sessions/<sandbox>/honk.index`) was in force; this
   session's repair (above) was the cleanup this note anticipated.
4. No GitHub creds in the sandbox → the user pushed. Not needed here — this session pushed
   directly.
5. `pack:smoke`'s tgz cleanup hit EPERM on the mount (tarball is gitignored regardless).
6. HEAD could point at a stale feature branch after a failed switch — trust `git log
   <branch>` over `git branch --show-current`. (This is in fact what happened — see repair
   note above.)

## NEXT

1. **Decide on cutting `v1.0.0`.** Every H0 bullet + every "1.0 Means" criterion now
   checks out (see above — the `npm audit` item is also resolved). This is a decision for
   the user, not a coding task: if yes, follow `RELEASING.md`'s changelog-move +
   version-bump flow, tag, PR `development` → `main`.
2. **BETA-011 UI phase** (stop-line; entry after 1.0 cut per horizons) — read-only first:
   queue/calendar/analytics/assets views rendering the same schemas guided mode uses. The
   account registry's handle cache (INIT-014) is now there for the account switcher.
3. **INBOX-001** Phase 0 vs 1 decision (plan in INBOX_FEATURE_PLAN.md).
4. **INDIV-007 learned/adaptive** — data-gated on accrued analytics.
5. Deferred: ALPHA-016 delete (destructive, scope-paused) · ALPHA-017 Mastodon /
   ALPHA-018 LinkedIn (need creds/decisions). Descoped items live ONLY in PROJECT_STATUS.

## Conventions In Force

- **TypeScript default** — new source in `honk-server/src/*.ts`; compiled JS is GENERATED
  (`npm run build:ts`; `pretest` compiles). Never hand-edit generated artifacts.
- **Outbound HTTP** — `import { fetchWithTimeout as fetch } from '../lib/http.js'` in
  adapters/media. Secrets scrubbed at the audit boundary.
- **JSON state** — `lib/jsonstore.ts` (`writeVersionedAtomic`/`readVersioned` for tracking
  stores; brand stores stay flat per INDIV-006). Asset store and account registry both
  follow the versioned contract.
- **Registry hooks are best-effort** — never let assets.ts/accounts.ts throw into an
  upload/publish/read path.
- **Build origin:** tool → `src/lib/tools.ts` · limit → `src/lib/specs.ts` · cred/media key →
  `src/lib/config.ts` (+ both env.examples in sync) · skill prose → `capabilities/` ·
  template → `media/templates/<id>/` · version → `honk-server/package.json`. Then
  `npm run build:ts && npm run build`. `npm run build` rewrites `agent/mcp-config.json`
  with the local absolute path — check `git diff agent/mcp-config.json` after, don't assume.
- **Gates green at every commit:** `npm test` · `npm run build:check` · `test:smoke` ·
  `pack:smoke`. CI gates `main`/`development`/`feature/**` + PRs.
- **Narrative history → PROJECT_HISTORY.md** (newest first); PROJECT_STATUS stays a lean
  snapshot; **descoped items live only in the STATUS Descoped table** (AGENTS.md rule).
- **Bins:** `honk` = run.js (MCP only) · `honk-start` = start.js (MCP + scheduler).
- **Credentials** in `~/.claude/honk.env` (`ACCOUNT__KEY` prefix; default = bare keys, not a
  fallback). Meta slots hold a **non-expiring PAGE token** (minted 2026-07-05, INIT-010b).
  **Always confirm post content with the user before publishing.**
- **Git flow:** branch off `development`, merge `--no-ff`, push; `main` via PR only. Commit
  via `git commit -F <msgfile>`. Ticket IDs: confirm next free INIT-xxx against git history
  (INIT-015 was this session's last; `pg`'s counter drifts).
- **Document permission scopes** for platform-touching features (`.env.example` + skill).
