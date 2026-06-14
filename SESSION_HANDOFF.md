# SESSION_HANDOFF — SPMC

> Read this before anything else. Replace entirely at session end — this is current state, not a log.

## What Just Shipped

**Beta-Prep capability expansion — branch `feature/BETA-001-capability-expansion` (NOT merged, NOT pushed).**

Tool surface **15 → 23**. All new tools are credential-free and verified by **37 unit tests + a 12-check MCP smoke test**. Two commits on the branch.

- **Unified dispatcher** (`spmc-server/lib/dispatch.js`): the publish switch was duplicated in `index.js` and `scheduler/scheduler.js` and had diverged — the scheduler dropped `account`, so **scheduled multi-account posts published from the default account**. Both now route through one dispatcher. `publishAudited()` is the single hook point for audit + rate-limit recording (direct, queue, scheduler all record).
- **Content intelligence (5 tools):** `content_validate`, `content_adapt` (auto X thread-split, grapheme-aware Bluesky truncation), `config_doctor` (credential presence, no secret values), `audit_log`, `schedule_check`.
- **`dry_run`** on every publish tool + `queue_dispatch` — validate & preview without sending. This is the interim substitute for live testing.
- **Audit log** (`lib/audit.js`): append-only JSONL in `spmc-server/data/audit.log` (gitignored); content hashed, not stored raw.
- **`scheduled_at` normalization** (`lib/schedule.js`): canonicalizes to absolute UTC. A timezone-less timestamp is accepted as **server-local** (correct on a local single-user server) but **flagged with a warning** — it only becomes a wrong-instant risk under hosted/multi-tenant. Wired into `queue_add` + `schedule_check`. (Softened from an initial hard-reject after review — hard-reject was friction for the local case with no present-day benefit.)
- **Observability (3 tools, UNVERIFIED):** `rate_limits` (tallies observed 429s), `analytics_fetch` / `analytics_report` (+ `getMetrics` on IG/FB/Threads adapters). Store + routing are real; **not exercised against live APIs**.
- **Tests:** `spmc-server/test/*.test.mjs` (node:test, zero deps) + `test/smoke.mjs` (drives the real server over stdio). `npm test`, `npm run test:smoke`.
- **Docs updated:** PROJECT_STATUS, PROJECT_SPECIFICATIONS (roadmap checkboxes), PROJECT_ARCHITECTURE (lib/ layer + design decisions), README (new tool tables, counts 15→23), new TESTING.md + BRANCHING.md.

## Pending / In Progress

- **Merge + push** `feature/BETA-001-capability-expansion` — awaiting user review. Nothing pushed to GitHub yet.
- **Live credential testing (still deferred by request)** — no platform tested end-to-end. Suggested order: Bluesky → X → Meta. This also confirms the unverified `analytics_*` / `getMetrics` paths.
- **UI implementation planning — intentionally NOT started** (this was the stop line). Next phase: analytics dashboard + content calendar (Phase 2/3).
- **Hermes pack + `skills/` now cover the new tools** (done this session). `hermes/CONTEXT.md` (23 tools, Content Intelligence + Observability sections, `dry_run`, pre-publish flow), `hermes/SKILLS.md` + `persona.md` updated; new `skills/content-intelligence/SKILL.md`; `manage-queue` + all 6 platform skills note `dry_run`/`content_validate`. Skill count 8 → 9.

## Verified By Inspection Only (no live creds)

The test suite cannot reach these without real credentials — they're correct by
reading, not by execution. Confirm during BETA-010 live testing:

- **The scheduler `account` fix** — the bug that started this work. The smoke test
  only exercises the **dry-run** branch, which returns *before* any adapter call,
  so no test drives a real publish through `publishAudited`.
- **The real publish path** through the unified dispatcher (direct + queue + scheduler).
- **Scheduler post-refactor:** `node --check`'d only. It will load (same `dispatch.js`
  the smoke test already imports), but **importing `scheduler/scheduler.js` starts it**
  (top-level `tick()` + `setInterval`) — don't import it just to "check"; trust the
  shared module graph or add an entry guard if you want it importable in a test.

## Conventions In Force

- Server is `spmc`; npm bin `run.js` (MCP only); scheduler separate (`start.js` / `npm run scheduler`).
- **One dispatcher**: add a platform → adapter + `lib/specs.js` entry + skill + dispatcher case. `lib/specs.js` is the single source of truth for limits/rules.
- Every real publish goes through `publishAudited` so it lands in the audit log.
- Runtime state lives in `spmc-server/data/` (gitignored); tests isolate it via `SPMC_DATA_DIR`.
- Credentials: `~/.claude/spmc.env` primary. Multi-account = `KEY__ACCOUNT` suffix.
- `node --test` needs a glob on Node 24: `npm test` runs `node --test "test/*.test.mjs"`.
- Keep the suite green at every commit; no new runtime deps (still 2).

## Open Questions

- Bump version for the expanded surface (e.g. `0.2.0-alpha`)? Currently still `0.1.0-alpha.1` in `package.json` and `0.1.0` hardcoded in `index.js`'s `Server({version})`.
- Should `analytics_*` auto-run 24h after publish via a scheduler hook (ALPHA-008), or stay manual?
- `rate_limits` is observational — do we want the automatic backoff queue (Phase 2) before beta, or is observation enough?
