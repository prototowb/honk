# SESSION_HANDOFF — Honk

> Read this before anything else. Replace entirely at session end — this is current state, not a log.

## Where We Are

**`v1.0.0` is cut, live, and now has a GitHub Release.** Tagged (`v1.0.0`, this
project's **first real git tag**), gates green, merged to `main` via PR #4
(2026-07-28); Release object published 2026-07-29 (`gh release create v1.0.0` —
the tag existed but no Release page had ever been created).

**State:** **35 tools** · 15 skills · 5 templates · 2 runtime deps · **199 unit +
51-check smoke + build:check + pack:smoke** green at every commit. npm registry
publish is **descoped indefinitely** (user decision) — install is git-clone +
`npm install -g .`, no `npx honk`.

## This Session (2026-07-29) — v1.0.0 GitHub Release, INIT-016 output-performance foundations

Picked up post-1.0 with H1 (delegation + first UI) open but every concrete H1
item gated on a scope call the user needed to make (BETA-011 UI is an explicit
stop-line; INDIV-007/INBOX-001/ALPHA-016-018 all need a user decision or creds).
Asked; user chose (1) publish the missing GitHub Release for v1.0.0, then (2)
research what closes the gap between "v1.0.0 shipped" and "the output actually
converts."

**1. GitHub Release.** `gh release create v1.0.0` with notes drawn from
CHANGELOG's `[1.0.0]` section. https://github.com/prototowb/honk/releases/tag/v1.0.0

**2. Research, before writing any code.** Surveyed CTA mechanics, UTM tagging,
`best_time`'s `observedWindows` seam, analytics ingestion, `content_check`, and
media/template tracking. Finding: every adaptive/learning mechanism the roadmap
already imagines (INDIV-007, A/B captions, content recycling) is correctly
gated on accrued analytics history — but the deeper issue is that **even the
live posts already published couldn't answer "what's working"**, because
nothing joined the stores that already existed: `analytics.ts` snapshots and
`assets.ts` template-usage records share a `platform+post_id` key (the asset
registry has recorded it since INIT-013) but no code had ever read both. That's
buildable now, independent of the data-gate — user agreed, scoped as INIT-016.

**3. INIT-016 — output performance foundations.** (1) `lib/performance.ts`
(new, read-only join, no new store): `postPerformance`/`templatePerformance`
rank posts/templates by an engagement score (numeric metrics only, **excluding
exposure metrics** — reach/views/impressions measure exposure, not response).
**Grouped by platform+template, never averaged across platforms** — caught in
review before merge: Facebook and Instagram's metric sets are different shapes
(`post_engagements` already double-counts clicks+reactions; IG has no
equivalent field at all), so an early draft that grouped by template name alone
would have silently averaged incomparable units the moment one template got
used on two platforms (confirmed via a real fixture — see
`test/performance.test.mjs`, "templates are grouped by platform+template").
A carousel whose images disagree on template is flagged `ambiguousTemplates`
rather than picking one arbitrarily. New tool `analytics_performance`
(**tools 34→35**). (2) `lib/cta-check.ts` (new) — a regex CTA/link-presence
heuristic, wired into `content_check` as a **note**, deliberately never a
warning: a regex can't judge whether a CTA is any good, only flag likely
absence, and treating it as a warning would have flipped the verdict on every
existing "clean pass" test in the suite for the wrong reason (a proxy signal
overriding a real one). Reused `validate.ts`'s existing (now exported)
`contentText()` for platform field routing instead of re-deriving it.
(3) **Verified against real data, not just fixtures** (the INIT-015 lesson —
a formatter bug that only shows up against real store contents): ran the new
join read-only against the live `~/.honk` store. Result: `templatePerformance`
returns empty today — the asset registry only started recording template usage
2026-07-07 (INIT-013), while stored analytics snapshots are all from before
2026-07-06, so there's currently zero overlap. Expected, not a bug; the
formatter's "no template comparison yet" diagnostic path is what actually
fires, confirmed live rather than assumed. content-intelligence skill doc also
corrected in passing: its observability section was still labeled "UNVERIFIED
— pending live credential testing" for all of `analytics_*`, though IG/FB were
live-verified back in INIT-010/011 — only Threads is genuinely unresolved, and
it's descoped (no creds), not "pending." 199 unit (+16) + 51-check smoke (+2)
+ build:check + pack:smoke green.

**Found, not fixed — worth knowing:** `~/.honk/followups.json` currently holds
**10 undrained auto-analytics jobs**, `attempts: 0` on all of them, several
weeks overdue — including both of INIT-015's 2026-07-28 live posts (due
2026-07-29). This is *why* the performance join is empty for the one post that
does have a template: the scheduler (`start.js`) needs to be running
continuously to drain the ~24h-deferred fetch queue, and it evidently hasn't
been since around 2026-07-06. Diagnosed read-only — did not call
`analytics_fetch`/drain the queue myself, since that's a live Graph API call
outside this session's scope. Next session: ask the user whether to run
`start.js` (or manually drain) to backfill real data into the now-working join.

## Previous Session (2026-07-27/28) — repo repair, INIT-014, INIT-015, cut v1.0.0

**0. Repo repair (first thing, before any other work).** First session on the real
host since the prior sandboxed session (2026-07-06/07). `.git/index` was **entirely
missing** — the sandbox's off-mount-index workaround never got written back — so
`git status` showed all 250 tracked files as deleted, though the working tree content
was intact. Fixed with `git read-tree HEAD` (rebuilds the index from a commit, touches
no files) after confirming via `git write-tree` / tree-hash comparison that the
working tree was byte-identical to `development`'s tip. A stale 3-week-old
`.git/HEAD.lock` also had to be removed before `git symbolic-ref` would take. **If
`git status` ever again shows mass deletions with content still present on disk,
suspect a missing/stale index before anything else** — do not `git add -A`/commit
over it without first diffing working-tree content against the branch tip it should
match. Pushed `development` → `origin/development` (27 commits, including INIT-012 +
INIT-013 that never left the sandbox).

**1. INIT-014 — Account registry v1.** `brand-active.json`'s active-account pointer
grew into a versioned `accounts.json` registry (`lib/accounts.ts`, INIT-008 contract —
machine-written cache, unlike the deliberately-flat `brand.json`/`brand-active.json`).
Still owns the active pointer (`brand.getActive`/`setActive` delegate to it, read-only
seeded from the legacy file on first read, no migration step); now also caches each
account's channel handle (id/handle/name/icon_url) from `account_info`, so
`brand_voice list` shows it without a live API round trip. Scope held to exactly the
H1 line — credential presence and brand-profile existence stay live-computed in
`config.ts`, not duplicated. Registry keys lowercase-normalized (matches
`accountsOverview()`'s existing join); the active pointer itself stays raw-case
(`brand.get()`/`env()` key off it). No new tool, no `display_name`/`notes`/`upsert`
(would be designing for the not-yet-started BETA-011 UI). Cut `list()` in a same-day
follow-up too — exported but nothing called it.

**2. npm publish descoped indefinitely** (user decision) — no plan to distribute
`honk` via the npm registry. Moved to PROJECT_STATUS *Descoped*. This directly
conflicted with the 1.0 release definition's point 2 ("npm package public") —
**user call: drop the public-registry requirement.** 1.0's install bar became
git-clone → `npm install` → `npm install -g .` + a correct README, ≤10 min cold.

**3. Doc rot found and healed, resolving that conflict.** `README.md` was almost
entirely un-swept from the SPMC→Honk rename despite PROJECT_STATUS claiming that
rename "complete" weeks ago — title, every path, bin names, credential file, skill
list/count, test counts were all pre-rename; only the generator-injected tool table
was current. Rewritten wholesale. Two H0 goals in PROJECT_SPECIFICATIONS.md
("store format versioning," "live-prove content-craft") had shipped weeks earlier
(INIT-008, INIT-011) but sat unchecked. **If another doc claims a sweep/rename is
"complete," spot-check it before trusting it** — this was the second time this session
a "complete" claim didn't hold up.

**4. `npm audit` — found and fixed.** 5 vulnerabilities (1 high, 3 moderate, 1 low) in
transitive deps (`fast-uri` via `ajv`, `hono` via `@modelcontextprotocol/sdk`).
`npm audit fix` bumped the (root, workspace-hoisted) lockfile only —
`@modelcontextprotocol/sdk` moved to 1.30.0, staying inside its existing `^1.12.0`
range in `package.json`. `npm audit` → 0 vulnerabilities; full gate suite reverified.

**5. INIT-015 — live re-verification, and it immediately found a real bug.** Prepped a
live pipeline re-run to confirm the SDK bump + INIT-014 didn't break anything real.
Wrote a throwaway MCP client script — **used `run.js` as the entry point, not
`index.js` directly**, since the latter skips credential loading entirely (a mistake
on the first pass produced a false "everything's unconfigured" reading — worth
remembering). Called `config_doctor` + `account_info` against real IG/FB creds on
`protocode`: both live-valid. That `account_info` call was the **first live exercise
of INIT-014's `account_info`→`recordHandle` path**, and it broke immediately —
`brand_voice list` rendered `instagram=@@protocode_` (double `@`). Root cause: the
adapters (`instagram.ts`/`facebook.ts` `getProfile()`) already prefix `@` onto the
handle before it reaches the registry; `formatAccounts()` prepended a second one. No
unit or smoke test could have caught this — the path only executes with a real
credential in hand. Fixed, 3 new unit tests, reconfirmed live. Then drafted and
published a real build-in-public post about exactly this (content-craft
hook→payoff→CTA, on-brand for `protocode`'s dev/AI-tools niche) —
`media_compose` → `content_check` **PASS** both platforms → explicit user approval →
published live: **IG `17891013474664651`**, **FB `105275157663337_1439990154821526`**.

**6. Cut `v1.0.0`.** With every H0 goal and every "1.0 Means" criterion checked, user
confirmed the cut. Prep (separate commit, before the version bump): fixed
`RELEASING.md`'s stale `cd spmc-server` path, `CHANGELOG.md`'s `prototowb/spmc`
compare-link domain, and the now-false "pre-1.0, `-alpha`" premise sentence; moved
`[Unreleased]` into a dated `[1.0.0]` section (via markdown header nesting — `##
[1.0.0]` between `## [Unreleased]` and the next `##`, not physically relocating ~140
lines) and added the three entries from this session that hadn't been logged yet
(the audit fix, the `@@` bugfix, the npm-publish descope). **Discovered while writing
the compare links: no git tags exist anywhere in this repo** — `CHANGELOG.md`
referenced `v0.1.0-alpha`/`v0.2.0-alpha`/`v0.3.0-alpha` as if tagged, but those were
hand-edited version-string commits, never run through `npm version`. Not lost data —
confirmed by finding the 0.2.0-alpha bump commit and checking it wasn't the auto-tag
shape. **`v1.0.0` is genuinely this project's first real tag.**

Then the bump itself: `npm run build` once on the clean tree first (confirmed zero
diff, including `agent/mcp-config.json`, before letting the version lifecycle run the
same build automatically). `npm version major` from `honk-server` → `1.0.0`
(verified via a throwaway `npm version major --no-git-tag-version` in a scratch dir
that `0.3.0-alpha` bumps to exactly `1.0.0`, not `1.0.0-alpha`).

⚠️ **npm workspaces gotcha, now documented in RELEASING.md:** `npm version` run
inside a workspace member (`honk-server`) does **not** auto-commit or auto-tag — that's
documented npm behavior for workspaces, not a bug. It bumps `package.json`, runs the
`version` script (build + `git add -u`), and stops. Had to finish the commit (`git
commit -m "1.0.0"`) and tag (`git tag -a v1.0.0 -m "v1.0.0"`) by hand — including
staging the root `package-lock.json`'s workspace version entry, which `git -C .. add
-u` ran too early to catch. Full gate suite green on the tagged commit (`pack:smoke`
installed `honk-1.0.0.tgz` and booted it). Pushed + `--follow-tags`. Opened
`development` → `main` PR #4 (53 commits — `main` hadn't been touched since PR #1,
2026-06-17), reviewed, merged (standard merge, not squash — keeps ticket-level
history).

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
   and merged directly (`gh` authenticated).
5. `pack:smoke`'s tgz cleanup hit EPERM on the mount (tarball is gitignored regardless).
6. HEAD could point at a stale feature branch after a failed switch — trust `git log
   <branch>` over `git branch --show-current`. (This happened this session — see repair
   note above.)

## NEXT

**H1 (delegation + first UI) is still open** — INIT-016 was plumbing pulled forward
from underneath it, not an H1 item itself. Nothing here is urgent; pick based on
what you want next.

0. **Drain the follow-up backlog** (cheap, makes INIT-016 actually show data) —
   `~/.honk/followups.json` has 10 undrained jobs back to 2026-07-06, including
   both INIT-015 live posts. Ask the user whether to start `start.js` (scheduler)
   or manually drain; then re-run `analytics_performance` against real data — it's
   never been observed with an actual template↔analytics match yet.
1. **BETA-011 UI phase** (stop-line — deliberately not started; crossing it is a real
   scope decision, not a default) — read-only first: queue/calendar/analytics/assets
   views rendering the same schemas guided mode uses. The account registry's handle
   cache (INIT-014) is there for the account switcher.
2. **INBOX-001** Phase 0 vs 1 decision (plan in INBOX_FEATURE_PLAN.md).
3. **INDIV-007 learned/adaptive** — data-gated on accrued analytics. INIT-016 built
   the join this needs (`lib/performance.ts`) but did not wire it into `best_time`'s
   `observedWindows` seam — that wiring is still the actual INDIV-007 work, still
   blocked on real history (item 0 above unblocks that history).
4. Deferred: ALPHA-016 delete (destructive, scope-paused) · ALPHA-017 Mastodon /
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
- **Releasing:** see `RELEASING.md` — now includes the npm-workspaces auto-tag gotcha
  found cutting v1.0.0. `main` via PR only (`gh pr create` + `gh pr merge --merge`).
- **Narrative history → PROJECT_HISTORY.md** (newest first); PROJECT_STATUS stays a lean
  snapshot; **descoped items live only in the STATUS Descoped table** (AGENTS.md rule).
- **Bins:** `honk` = run.js (MCP only) · `honk-start` = start.js (MCP + scheduler).
- **Credentials** in `~/.claude/honk.env` (`ACCOUNT__KEY` prefix; default = bare keys, not a
  fallback). Meta slots hold a **non-expiring PAGE token** (minted 2026-07-05, INIT-010b).
  **Always confirm post content with the user before publishing** — every live publish
  this project has ever done went through an explicit approval step; keep it that way.
- **Testing credentials live: use `run.js`, not `index.js`, as the client entry point** —
  `index.js` is the bare MCP server with no `.env` loading. A throwaway MCP-client script
  pointed at `index.js` will report every platform as unconfigured even when
  `~/.claude/honk.env` is fully populated (learned the hard way this session).
- **Git flow:** branch off `development`, merge `--no-ff`, push; `main` via PR only. Commit
  via `git commit -F <msgfile>`. Ticket IDs: confirm next free INIT-xxx against git history
  (INIT-015 was this session's last; `pg`'s counter drifts).
- **Document permission scopes** for platform-touching features (`.env.example` + skill).
