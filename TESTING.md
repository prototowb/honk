# TESTING — Honk

> How this project verifies itself. Zero test dependencies — Node's built-in
> `node:test` runner only.

## Run

```bash
npm install         # at the repo root — bootstraps the spmc-server workspace
npm test            # 65 unit tests (node:test) — routes into spmc-server

cd spmc-server
npm run test:smoke  # end-to-end MCP smoke test against the real server
```

**Node floors (two, on purpose):** the *published server* runs on **Node ≥20.9**
(`honk-server` `engines`, driven by `sharp`). *Running the test suite* needs
**Node ≥21** (the repo-root dev-tooling floor): `npm test` globs `test/*.test.mjs`
via Node's built-in runner so discovery is identical on every shell (bash, cmd,
PowerShell) instead of depending on the shell to expand the glob — and arg-glob
landed in Node 21. So end users aren't forced past Node 20 LTS; contributors use ≥21.

## Local gates (run before every commit)

```bash
npm run build:check   # at root — every generated artifact must match the origin
npm test              # unit suite green
```

`build:check` is enforced in CI and by an **opt-in** pre-commit hook that mirrors
the CI gate. Enable it once per clone:

```bash
git config core.hooksPath .githooks   # runs build:check on every commit
git commit --no-verify                # bypass for a single commit
```

If the hook blocks a commit, a generated artifact has drifted (or `.env.example`
is missing a credential key): run `npm run build`, stage the result, and retry.

## Two layers

### 1. Unit tests — `honk-server/test/*.test.mjs`
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

### 2. Smoke test — `honk-server/test/smoke.mjs`
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
