# SESSION_HANDOFF — SPMC

> Read this before anything else. Replace entirely at session end — this is current state, not a log.

## What Just Shipped

**Two things this session: (1) BETA-001 merged to `main`; (2) the single-origin build system started on `feature/BUILD-001-single-origin`.**

### 1. BETA-001 merged into `main`
The Beta-Prep capability expansion (15 → 23 tools, the whole `spmc-server/lib/` layer, unified dispatcher, 38 unit tests + smoke) was merged into `main` with `--no-ff` (commit `a7369a9`) after the suite was confirmed green. **`main` is now ahead of `origin/main` and has NOT been pushed.**

### 2. Single-origin build system — Phase 1 underway (`feature/BUILD-001-single-origin`, branched off the merged `main`)
Goal (see **`BUILD_CONCEPT.md`**): generate every per-surface artifact (the one Claude plugin, skills, MCP configs, README/Hermes tables) from one origin instead of hand-maintaining parallel copies. Commits on the branch:

- **`BUILD_CONCEPT.md`** — the design. One home per fact: machine facts in runtime code (`lib/tools.js` + `lib/specs.js`), prose in a future `capabilities/` tree, everything else generated + hand-edit-forbidden. Folds into `PROJECT_ARCHITECTURE.md` when complete. Includes the verified platform reality (plugin format spans Claude Code/web/Desktop/Cowork; local stdio MCP can't run on claude.ai web → needs hosting), the *Two layers, one plugin* decision (`content-pipeline` is SPMC's creative layer, absorbed into the single plugin), and the decision to keep `claude_desktop_config.json` (generated, as a no-marketplace fallback).
- **`lib/tools.js` extraction** — `TOOLS` + `DRY_RUN_PROP` moved out of `index.js`, exported, imported back. Behavior identical (38 tests + smoke pass). This makes the tool surface importable by the generator (alongside the already-exported `PLATFORM_SPECS`).
- **Generator skeleton** — root `package.json` adds `build` / `build:check`; `build/generate.mjs` reads the origin and emits **`TOOLS.md`** (23-tool catalog with limits joined from specs). `--check` fails on drift; **verified it actually catches a perturbed origin (exit 1), not just the clean case.** Line-ending-independent (CRLF-safe) + `.gitattributes` pins generated files to LF.

## Pending / In Progress

- **Finish Phase 1** (per BUILD_CONCEPT, all hang off the `ARTIFACTS` registry in `build/generate.mjs`):
  - Single **version origin** — inject into `plugin.json`, `marketplace.json`, and the hardcoded `Server({ version })` in `index.js` (currently `0.1.0` there vs `0.1.0-alpha.1` in package.json).
  - **MCP configs** from one parameterized template (`.mcp.json`, `hermes/mcp-config.json`, `claude_desktop_config.json`) — note these legitimately differ (plugin-root / absolute path / npx); creds self-load via `run.js`, so the env block is optional, not a bug.
  - **Inject** generated tool/limit tables into `README.md` + `hermes/CONTEXT.md` (marker-based), and into `skills/*` so limits stop being hand-copied.
  - Hand-authored prose → `capabilities/` source tree.
- **Wire `build:check` into CI + a pre-commit hook** (Phase 2). The CRLF fix was the prerequisite for relying on it cross-platform.
- **Consolidate to one SPMC plugin** — absorb `content-pipeline/` skills; clean up dead trees (`_bkp/*`; confirm before removing `social-publisher/`).
- **Push `main`** (ahead, unpushed) and decide whether to push/PR `BUILD-001` — awaiting user direction.
- **Live credential testing — still deferred by user choice.** Nothing has published end-to-end; `analytics_*` / `getMetrics` / `rate_limits` remain UNVERIFIED against live APIs. Suggested order: Bluesky → X → Meta.
- **UI implementation planning — still intentionally NOT started** (the stop-line). Analytics dashboard + content calendar = Phase 2/3.

## Verified This Session

- BETA-001 suite: **38 unit tests + smoke PASS** (pre-merge).
- `lib/tools.js` extraction is behavior-preserving (same 38 + smoke after).
- `build` emits `TOOLS.md`; `build:check` passes clean, **flags a perturbed origin (exit 1)**, and clears after revert.

## Verified By Inspection Only (no live creds)

- The scheduler `account` fix and the real publish path through `publishAudited` — smoke only exercises the **dry-run** branch (returns before any adapter call). Confirm during live testing.
- Importing `scheduler/scheduler.js` starts it (top-level `tick()` + `setInterval`) — don't import it just to "check."

## Conventions In Force

- **Build origin**: change a tool → edit `spmc-server/lib/tools.js`; change a limit → `lib/specs.js`. Never hand-edit generated artifacts (they carry a DO-NOT-EDIT header); run `npm run build`.
- Server is `spmc`; npm bin `run.js` (MCP only); scheduler separate (`start.js` / `npm run scheduler`).
- **One dispatcher**: add a platform → adapter + `lib/specs.js` entry + skill + dispatcher case.
- Every real publish goes through `publishAudited` so it lands in the audit log.
- Runtime state lives in `spmc-server/data/` (gitignored); tests isolate it via `SPMC_DATA_DIR`.
- Credentials: `~/.claude/spmc.env` primary (self-loaded by `run.js`). Multi-account = `KEY__ACCOUNT` suffix.
- Keep the suite green at every commit; no new runtime deps (still 2). The build tooling adds **zero** runtime deps (root `package.json` has no dependencies).

## Open Questions

- Bump version for the expanded surface (e.g. `0.2.0-alpha`)? The build system will make it single-origin regardless.
- Keep `content-pipeline`'s `test-skill`, or drop it as a scaffold?
- Root `package.json` is now in place for build scripts — confirm that's the desired home (vs. under `spmc-server/`).
