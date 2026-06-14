# TESTING — SPMC

> How this project verifies itself. Zero test dependencies — Node's built-in
> `node:test` runner only.

## Run

```bash
cd spmc-server
npm test            # 37 unit tests (node:test)
npm run test:smoke  # end-to-end MCP smoke test against the real server
```

## Two layers

### 1. Unit tests — `spmc-server/test/*.test.mjs`
Fast, pure, no network, no credentials. One file per module:

| File | Covers |
|------|--------|
| `specs.test.mjs` | grapheme measuring, slicing, word-packing thread split |
| `validate.test.mjs` | per-platform limits, required fields, media URL rules |
| `adapt.test.mjs` | single vs. thread, truncation, media notes, defaults |
| `schedule.test.mjs` | ISO normalization, timezone requirement, `isPast` |
| `config.test.mjs` | credential-presence report, account discovery, no secret leakage |
| `audit.test.mjs` | record/read/filter (isolated `SPMC_DATA_DIR`) |
| `ratelimit.test.mjs` | 429 detection + tally |
| `hash.test.mjs` | stable content hash |

State-writing modules (audit, ratelimit, analytics) read `SPMC_DATA_DIR` at call
time — tests point it at a temp dir so they never touch real runtime state.

### 2. Smoke test — `spmc-server/test/smoke.mjs`
Spawns the **actual** MCP server (`index.js`) over stdio via the MCP SDK client,
lists tools, and calls the credential-free tools (validate, adapt, config_doctor,
dry-run publish, audit_log, schedule_check, queue round-trip, observability). This
catches wiring/schema regressions the unit tests can't see. Not auto-discovered by
`npm test` (its filename has no `.test.`), so run it explicitly.

## What is NOT covered (by decision)
Live publishing and live analytics/insights require real platform credentials.
Credential testing is **deferred** — see `SESSION_HANDOFF.md`. `dry_run` +
`content_validate` exercise the whole path up to the network call as the interim
substitute. The `analytics_*` and `rate_limits` paths are built but unverified
against live APIs.

## Adding tests
- New deterministic module → add `test/<module>.test.mjs` using `node:test` +
  `node:assert/strict`.
- New tool → add a check to `smoke.mjs` if it's credential-free.
- Keep the suite green at every commit.
