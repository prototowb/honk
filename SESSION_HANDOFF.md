# SESSION_HANDOFF — SPMC

> Read this before anything else. Replace entirely at session end — this is current state, not a log.

## Where We Are

**`feature/BUILD-001-single-origin` — single-origin build system + its wire-up + merge-back are ALL COMPLETE.** Every build slice shipped earlier (C, B1, A, B2); this session finished the enforcement + documentation layer. The branch is feature-complete. **The only thing left is the gated outward step: merge `feature/BUILD-001-single-origin` → `main` (+ optional `0.2.0-alpha` bump) — held for explicit user confirmation.** `main` holds BETA-001 (merged `--no-ff` 2026-06-15) and is **ahead of `origin/main`, not yet pushed**.

Design reference is now **`PROJECT_ARCHITECTURE.md`** (BUILD_CONCEPT.md was folded into it this session and reduced to a pointer + contributor TL;DR).

## What Shipped This Session — wire-up + merge-back

1. **CI gate (`.github/workflows/ci.yml`, new):** on push to `main` + every PR, runs `npm --prefix spmc-server ci` → `npm run build:check` → `npm test` → `test:smoke` on `ubuntu-latest`/node 20. Remote is `github.com/prototowb/honk` (GitHub Actions).
2. **Pre-commit hook (`.githooks/pre-commit`, new):** POSIX `sh`, runs `build:check`; mirrors the CI gate locally. **No husky** (keeps zero-build-deps). Opt-in per clone: `git config core.hooksPath .githooks` — **already set in this clone**. Pinned `eol=lf` in `.gitattributes` so the shebang survives Linux/macOS. Verified firing on both commits this session.
3. **`hermes/mcp-config.json` excluded from `--check` (`localOnly` in `ARTIFACTS`):** its only variable part is the machine's absolute install path = environment, not origin, so it can't be byte-stable across checkouts (this was the CI-drift blocker the prior handoff flagged). `npm run build` still regenerates it; its *shape* stays checked via the shared `mcpConfig()` template that `.mcp.json` / `claude_desktop_config.json` keep `--check`'d. **Chosen over the prior plan's `SPMC_HERMES_ROOT ?? ROOT`** — that only made CI green by baking a Windows path into a Linux workflow.
4. **`.env.example` single-origined as a completeness assertion (`checkEnvExample()`):** every `credentialEnvKeys()` entry must be documented in `.env.example` or the build throws (closes the 4th hand-maintained copy of the key list). Kept the file hand-authored — its where-to-get-each-token onboarding prose lives in no origin, so it's *asserted complete*, not generated.
5. **Merge-back:** `PROJECT_ARCHITECTURE.md` gained the generated/source directory split, the *Single origin + generated distribution* Design Decision, and the verified per-surface viability matrix (+ sources). `BUILD_CONCEPT.md` reduced to a pointer + an edit-the-source TL;DR table.

**Verified:** `build:check` green (**20 checked + 1 skipped**); `npm test` = **38/38**; `test:smoke` = **SMOKE PASS**. Both session commits passed through the live pre-commit hook.

## Commits this session
- `feat(build): wire build:check into CI + pre-commit hook` — CI workflow, hook, hermes `localOnly`, `checkEnvExample()`, `.gitattributes` LF rule.
- `docs: fold single-origin build system into PROJECT_ARCHITECTURE` — merge-back; BUILD_CONCEPT → pointer.

## NEXT — the gated merge (needs user confirmation)

> Nothing else is pending. These two are coupled and outward-facing — confirm before doing.

1. **Optional `0.2.0-alpha` version bump:** edit `spmc-server/package.json` `version` → `npm run build` (propagates to `plugin.json`, `TOOLS.md` provenance, and the runtime `Server({ version })`). Single source already — one edit, rebuild.
2. **Merge `feature/BUILD-001-single-origin` → `main`** (recommend `--no-ff`, suite + `build:check` green pre-merge), then decide on **pushing** `main` to `origin` (currently main is local-only ahead of `origin/main`, so a push publishes both BETA-001 and BUILD-001).

## Still Deferred / Stop-Lines (unchanged)
- **Live credential testing — deferred by user choice.** Nothing has published end-to-end; `analytics_*` / `getMetrics` / `rate_limits` UNVERIFIED against live APIs. Order: Bluesky → X → Meta.
- **UI implementation planning — intentionally NOT started** (the stop-line). Analytics dashboard + calendar = Phase 2/3.

## Flags / Known-but-out-of-scope
- **Pre-existing content truncations (since `e31dd68`, NOT this session):** `capabilities/skills/pipeline-orchestrator.md` ends on a dangling `2`; `output-manager`'s "Rules (non-negotiable)" lost rules 3+. **Creative-content gaps to fill by hand** in `capabilities/`, then `npm run build` — not build bugs.
- **SKILL.md header placement** still reasoned-safe, not load-tested (no skill loaded post-B2). Eyeball-load one if convenient.

## Conventions In Force
- **Build origin:** tool → `lib/tools.js`; limit → `lib/specs.js`; credential/media key → `lib/config.js` (+ document in `.env.example`); skill/Hermes prose → `capabilities/`; version/metadata → `spmc-server/package.json`. Then `npm run build`. **Never hand-edit generated artifacts** — `build:check` (CI + pre-commit) rejects it. Hand-editing **outside** the `gen:tools` markers in README/CONTEXT is fine.
- Server `spmc`; `run.js` = MCP only; `start.js` = MCP + scheduler. One dispatcher (`lib/dispatch.js`); every real publish goes through `publishAudited`.
- Credentials: `~/.claude/spmc.env` (self-loaded by `run.js`); multi-account `KEY__ACCOUNT`.
- Keep `npm test` + `build:check` green at every commit. Runtime deps 2; build tooling adds **zero**.
