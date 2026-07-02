# Pipeline Review — Install / Build / Dev / Distribution

> Critique + prioritized enhancements for the SPMC build & distribution pipeline.
> Written 2026-06-20. Status legend: ✅ done · 🔲 proposed (needs go-ahead).

## The through-line

The pipeline today verifies **two** things well:

1. **Source is correct** — `npm test` (65 unit) + `test:smoke` (22-check MCP).
2. **Generated artifacts match origin** — `build:check` (single-origin gate, in CI + opt-in pre-commit).

It verifies **nothing about the artifact we actually ship.** No step packs the
npm tarball, installs it, and confirms it runs. That gap is the root cause of the
P0 below and the spine of the recommendations: *automate the pack→install→load
check that, done by hand, just caught a dead-on-arrival package.*

---

## P0 — ship blockers

### 1. npm tarball omitted `lib/` → every npm/npx surface dead on arrival ✅ FIXED
`honk-server/package.json` `files` allowlist did not include `lib/`, but
`index.js` imports 13 modules from `./lib/` (dispatch, validate, adapt, config,
schedule, audit, hash, ratelimit, analytics, brand, links, besttime, tools).
Proven by packing + loading the tarball:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/package/lib/dispatch.js'
        imported from …/package/index.js
```

Latent, not live: `spmc` is currently **404 on npm** (unpublished), so nothing is
broken in users' hands *today* — but the generated `claude_desktop_config.json`
already instructs users to `npx -y spmc`, so this breaks the moment we publish.

**Fix applied:** added `"lib/"` to the `files` array. Re-verified — tarball now
ships 17 `lib/` files and the packaged entrypoint loads (`LOADED OK`). Import
graph reaches only `adapters/`, `queue/store.js`, `media/`, `lib/` — all now
allowlisted.

### 2. CI never runs on `development` ✅ DONE
`.github/workflows/ci.yml` triggered on `push: [main]` + `pull_request`. Our git
flow merges to `development` by **direct push, no PR**, so every per-ticket
integration merge was **ungated** — the only real gate was the eventual
`development → main` PR. Added `development` + `feature/**` to the `push` trigger,
so the integration branch (and feature work) now runs the full gate on every push.

---

## P1 — the missing gate (closes the P0 class permanently) ✅ DONE

### 3. No "does the shipped artifact run?" check ✅ DONE
Added `honk-server/test/pack-smoke.mjs` — a portable (Node, no bash) script that
packs the tarball exactly as `npm publish` would, installs it into a throwaway
project so its deps resolve like a real install, and boots the bin; a `files`-array
omission fails at module load (`ERR_MODULE_NOT_FOUND`) with a clear message.
Verified both ways: passes on the healthy package, and **fails when `lib/` is
removed** from `files`. Wired in two places:
- **CI** — a `Package smoke` step (runs on every push to main/development/feature/**).
- **`prepublishOnly`** — `npm test && build:check && pack:smoke`, so a broken,
  stale, or unrunnable package can't be published even by hand. Verified the whole
  chain green via `npm run prepublishOnly`.

---

## P2 — distribution correctness

### 4. `spmc` unpublished + `npx -y spmc` name-squat risk 🔲
The generated Claude Desktop config advertises `npx -y spmc`. The name is
unclaimed on npm — so post-publish it 404s until we publish, and `npx` would
happily fetch **whatever `spmc` exists** on the public registry (supply-chain
foot-gun). Decide: publish (consider a scoped `@towb/spmc` to remove the
squat ambiguity), or stop advertising the npm path until the surface is real.

### 5. `bin` exposes only `run.js` (MCP-only, no scheduler) ✅ DONE
`bin: { spmc: "./run.js" }` started the MCP server **without** the scheduler, so
npm-installed users never ran `start.js` — the auto-analytics follow-up (ALPHA-008)
and scheduled posts silently never fired. Added a second bin
**`spmc-start → ./start.js`** (gave `start.js` the missing `#!/usr/bin/env node`
shebang) and documented the `spmc` (MCP-only) vs `spmc-start` (MCP + scheduler)
split in the README.

---

## P3 — dev-environment friction

### 6. Not a real npm workspace ✅ DONE
Root `package.json` was named `spmc-workspace` but had **no `workspaces` field**.
Added `"workspaces": ["spmc-server"]` — verified root `npm install` now bootstraps
the server (`add spmc … 32 packages`). CI can later drop the `--prefix` dance.

### 7. `engines: >=18` vs test glob needs Node ≥21 ✅ DONE
`test` was `node --test test/*.test.mjs` — discovery depended on the **shell**
expanding the glob (bash does, Windows `cmd` doesn't). The real fix is the quoted
`"test/*.test.mjs"` so **Node's** built-in runner globs it identically on every
shell. Verified 65/65. **Two floors, on purpose** (don't narrow the install base
to fix test tooling): the *published* `honk-server` `engines` is **`>=20.9`** (the
true runtime floor — `sharp` 0.35 needs 20.9; the SDK only 18), so Node 20 LTS
users can still install; the **`>=21`** floor lives only at the private repo root
as the *dev-tooling* requirement (arg-glob landed in Node 21). `TESTING.md` spells
out the split: end users ≥20.9, contributors ≥21.

### 8. Pre-commit hook is opt-in and partial ✅ DONE (documented)
`.githooks/pre-commit` runs `build:check` only and needs a manual
`git config core.hooksPath .githooks` per clone. Documented enablement + the local
gate in `TESTING.md`. Once #2 lands, CI is the real gate and the hook is just fast
local feedback (optionally add `npm test` to it then).

## Build targets / surfaces (raised in review)

### 10. The `hermes/` dir is generic agent prose, mislabeled — not a per-agent need ✅ DONE (option B)
**Resolved via option B:** `hermes/` → `agent/` (and `capabilities/hermes/` →
`capabilities/agent/`), via `git mv` (history preserved). Build registry, function
names, `.gitattributes`, README (now a "Bring-Your-Own Agent" surface that points
OpenClaw/generic at the same briefing), architecture/build docs, and the
`tools.js` comment all updated; titles de-"Hermes"'d; the machine-specific path in
`CONTEXT.md` replaced with a placeholder so the briefing is drop-in for any agent.
`build:check` green against the new paths. The analysis below is kept for the record.

**Question raised:** OpenClaw has no dir; does Hermes need one?

Two real surface classes, by *how they consume SPMC*:
- **Raw-MCP** (Claude Desktop · OpenClaw · CLI/npm): the live `tools/list` is the
  whole contract — they need only a config block, no prose. Correctly have no dir.
- **Bring-your-own-agent** that can't filesystem-auto-load the `skills/` tree:
  needs the capability prose as *readable single files* (briefing + skill-triggers
  + persona). Today only Hermes is modeled this way → it gets a dir.

But the `hermes/` artifacts are **generic**, not Hermes-specific: `CONTEXT.md`
names "Hermes" once (its title), `SKILLS.md` twice, `persona.md` once — the bodies
are a generic MCP operating briefing, a generic trigger map, and a generic
pre-publish checklist. So the dir is *mislabeled*: it's really "the generic BYO-agent
briefing," with Hermes as its only consumer.

**Answer:** you don't need a per-agent dir — and you should **not** add an
`openclaw/` one (a second copy of generic prose reintroduces exactly the drift the
single-origin build exists to kill). The right model is **one generic agent-briefing
target** that any BYO agent reads, with `persona.md` as the single per-agent
override seam. Two ways to get there:
- **(A) Reframe in place (low churn, recommended):** keep the dir, document it as
  the generic agent-briefing reference, and point the README "OpenClaw/generic"
  section at `hermes/CONTEXT.md` + `SKILLS.md` (today it only says "point at
  run.js", so a BYO agent never gets the briefing that makes Hermes capable).
  Optionally de-"Hermes" the titles. No new dirs, no build changes.
- **(B) Rename to a neutral surface (higher churn):** `hermes/` → `agent/`,
  updating README + build registry + `capabilities/hermes/` + the mcp-config path
  + memory. Cleaner naming, pure churn for the same outcome.

**Latent distribution gap this exposes:** the generic/OpenClaw surface is
under-served not for lack of a dir but because the briefing that already exists is
filed under "Hermes" and the README tells generic clients only "point at run.js."

---

## P4 — release hygiene

### 9. No changelog / version-bump / tag automation ✅ DONE
Added `CHANGELOG.md` (Keep a Changelog) covering 0.1→0.3-alpha + an `[Unreleased]`
section, `RELEASING.md` documenting the flow, and an `npm version` lifecycle hook
that runs `npm run build` + stages the regenerated version-stamped artifacts
(`TOOLS.md`, `plugin.json`, `claude_desktop_config.json` all embed `pkg.version`),
so a bump can't leave them stale. A tag-triggered npm-publish job is left for when
the publish story (#4) is decided.

---

## Suggested order of operations

1. ✅ **#1** — `lib/` fix (done, verified).
2. ✅ **#6 / #7 / #8** — dev-onboarding polish (done, verified).
3. ✅ **#2 + #3** — gate `development` + the pack-smoke (CI + `prepublishOnly`); the
   class of bug #1 represents can no longer reach a branch or a publish.
4. ✅ **#10** — generic agent surface, via rename to `agent/` (option B).
5. ✅ **#5** — scheduler bin (`spmc-start`), so npm users get auto-dispatch.
6. ✅ **#9** — CHANGELOG + `npm version` artifact-regen flow.
7. 🔲 **#4** — publish story (still **deferred** per your call): settle the npm
   name, then the `prepublishOnly` gate + a tag-triggered publish job.
