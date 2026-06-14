# SPMC — Build System Concept

> **Status: CONCEPT — not implemented (2026-06-14).** This documents the target
> architecture for a single-origin build system. When it ships, fold the
> **Single origin + generator** decision into `PROJECT_ARCHITECTURE.md` (Design
> Decisions + the directory tree), then reduce or retire this file. Nothing here
> is built yet — do not treat the directory layout below as present on disk.

## Why

SPMC's *runtime* already has a single origin: one dispatcher (`lib/dispatch.js`),
one source of truth for platform limits (`lib/specs.js`), one adapter per platform.
Adding a platform is one adapter + one specs entry + one dispatcher case.

SPMC's *distribution surface* does not. The same capabilities are re-described by
hand in many places, and they drift:

- **The 8-tools-→-11-files tax.** The Beta-Prep expansion (15 → 23 tools) forced
  hand-edits to `hermes/CONTEXT.md`, `hermes/SKILLS.md`, `hermes/persona.md`, and
  8 `skills/*/SKILL.md` files. None generated. (See `SESSION_HANDOFF.md`.)
- **Limit values copied, not referenced.** `lib/specs.js` says `300 graphemes` /
  `280 chars` / `500 chars`; those same numbers are re-typed into every `SKILL.md`
  and the Hermes tool table. Change one, the prose silently goes stale.
- **MCP configs have already diverged.** `.mcp.json` uses `${CLAUDE_PLUGIN_ROOT}`
  + a full env block; `hermes/mcp-config.json` has a hardcoded absolute path and
  **no env block**; `claude_desktop_config.json` uses `npx`. Same server, three
  shapes, one of them a live defect.
- **The version string lives in three places and *already disagrees*** — the
  tidiest instance of the problem: `spmc-server/package.json` says
  `0.1.0-alpha.1`, `.claude-plugin/plugin.json` says `0.1.0-alpha.1`, but
  `index.js` (the `Server({ version })` call, ~line 352) is hardcoded `0.1.0`.
  `SESSION_HANDOFF.md` already flags this as an open question.

The goal: **one home per fact.** Machine facts (tool schemas, limits) live in
runtime code; prose (when-to-use, setup, errors, persona) lives once in a source
tree; every downstream artifact is *generated* and hand-edit-forbidden.

## Platform reality (verified 2026-06-14)

The Claude plugin format has converged. A **plugin** bundles skills + connectors +
(optional) sub-agents + a local MCP server declaration, and a plugin installs across
**Claude Code, claude.ai web chat, the Claude Desktop chat tab, and Cowork**,
discoverable through one unified directory (`claude.com/plugins`). The consumer-app
docs cross-reference the Claude Code "Plugins reference," so the package **appears to
share / be compatible with** the `.claude-plugin` format (the support docs don't spell
out format-level differences — treat exact identity as an inference to confirm). Either
way, "one package, everything connects" is the right target.

The one boundary that still forces a second path:

| Surface | Skills | SPMC tools (local stdio MCP) |
|---|---|---|
| Claude Code (CLI + desktop) | ✅ | ✅ runs locally |
| Claude Desktop chat app | ✅ | ✅ runs locally |
| Cowork | ✅ (+ hooks/sub-agents) | ✅ runs locally |
| **claude.ai web** | ✅ (org-synced; personal installs may stay local) | ❌ **no local machine to run `node`** |
| Hermes (own agent) | n/a | ✅ via its own MCP config |

**Implication:** a local stdio MCP server runs only where there's a local machine.
On claude.ai web the plugin's *skills* appear, but SPMC's *publishing tools won't
fire* until SPMC is **hosted as a remote (HTTP) MCP connector**. That is the single
later milestone for full web support — not a packaging change.

Sources: [Use plugins in Claude](https://support.claude.com/en/articles/13837440-use-plugins-in-claude) ·
[Unified directory](https://support.claude.com/en/articles/14328846-browse-skills-connectors-and-plugins-in-one-directory) ·
[Claude Code plugins](https://code.claude.com/docs/en/plugins) ·
[Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)

## The single origin

Two of the three inputs already exist in runtime code; one is new.

| Input | State | Role |
|---|---|---|
| `spmc-server/lib/specs.js` | **exists, exported** (`PLATFORM_SPECS`) | per-platform limits/rules — already importable |
| `spmc-server/lib/tools.js` | **to extract** (see refactor below) | the 23 tool schemas (name, description, inputSchema) |
| `capabilities/*.md` | **new** | hand-authored prose: when-to-use, setup, common errors, Hermes persona; carries injection tokens |

The generator imports the two runtime modules directly, so generated docs **cannot
drift from what the server actually does** — they read the same modules the server
serves over MCP.

Prose is the genuinely human part and stays hand-authored. It embeds tokens the
generator resolves against the runtime origin, e.g.:

```
Max {{limit:bluesky.text.max}} {{unit:bluesky.text}}.        → "Max 300 graphemes."
Call {{tool:bluesky_post}} from the `spmc` MCP server.       → injects the live signature
```

## Outputs (generated, checked in)

One canonical plugin + the Hermes wrapper + doc tables. Everything generated carries
a `DO NOT EDIT — regenerate with npm run build` header and is committed (so a fresh
clone works without running the build).

```
build/
  generate.mjs            ← the generator (Node, zero new deps)
  templates/              ← per-output templates (plugin.json, mcp config, doc tables)
capabilities/             ← hand-authored prose source (the only place humans edit)

# ── generated ──────────────────────────────────────────────────────────────
.claude-plugin/
  plugin.json             ← name/description/version (version ← package.json)
  marketplace.json        ← NEW: required for marketplace distribution (none exists today)
skills/<name>/SKILL.md     ← Claude Code + portable; limits/signatures injected
.mcp.json                  ← stdio, ${CLAUDE_PLUGIN_ROOT}; the plugin's MCP declaration
hermes/
  CONTEXT.md               ← tool table injected between markers; prose preserved
  mcp-config.json          ← rendered from the SAME template as .mcp.json (kills the drift)
README.md                  ← tool tables injected between <!-- gen:tools --> markers
```

Notes:
- The plugin's bundled `.mcp.json` is what the Claude Code/Desktop/Cowork surfaces
  read.
- **Decision: keep `claude_desktop_config.json`, generated from the shared template.**
  It's the only no-marketplace way to wire SPMC's local stdio server into the Claude
  Desktop chat app — i.e. during development, self-host, or before the plugin is
  published to a directory. Because it renders from the same template as `.mcp.json`
  and `hermes/mcp-config.json`, it can't drift and costs nothing to keep; dropping it
  would strand a surface the user uses. It carries a "manual fallback" header.
- **Hermes is the one true outlier** (it's outside the Claude plugin ecosystem), so
  it keeps its own config — but rendered from the shared template, not by hand.

### Two layers, one plugin

SPMC is two layers of one product, and they package into the **single SPMC plugin**:

1. **Publishing engine** — `spmc-server` (the MCP tools): deterministic publish,
   queue, scheduling, validation, analytics. Skills: `post-to-*`, `manage-queue`,
   `content-intelligence`, `upload-media`.
2. **Creative pipeline** (`content-pipeline/`) — the agent-side workflow SPMC
   deliberately keeps *out* of the server: ideation → trend research → concept →
   editorial review → platform-native content → hand-off to the queue. Skills:
   `idea-input`, `research-trends`, `pipeline-orchestrator`, `output-manager`.

The pipeline layer is almost entirely **hand-authored prose** (it does creative
work, not schema-driven work), so its skills live in `capabilities/` and the
generator emits them into the one plugin's `skills/`, injecting only the queue/tool
signatures they reference. The separate `content-pipeline/.claude-plugin/plugin.json`
(a second plugin identity, versioned independently — `1.1.0` in the manifest vs
"v1.2" in its README, itself a drift) is **absorbed** into the single SPMC plugin.
Drop `test-skill` (a scaffold) unless it has a purpose.

> Alternative, if you ever want publishing-only installs: ship an SPMC *marketplace*
> with two plugins (engine + pipeline) instead of one. Default to one plugin until
> that need is real — it matches the "one package" goal.

## The generator

```
INPUTS                          GENERATE                    OUTPUTS
lib/tools.js  ─┐                                            .claude-plugin/{plugin,marketplace}.json
lib/specs.js  ─┼─→  build/generate.mjs  ─→  resolve tokens  skills/*/SKILL.md
capabilities/ ─┘    (import + render)        + inject        .mcp.json, hermes/*, README tables
```

Because the generator is the single choke point, it enforces invariants for free:

- **Skill-name rules** (from the Agent Skills spec): `name` ≤ 64 chars, lowercase +
  hyphens only, and **must not contain "claude" or "anthropic"** (reserved words).
  Validate at generate time — fail the build on violation.
- **Limit values** stop being hand-copied; they're injected from `specs.js`.
- **MCP config drift** is impossible — all configs render from one template.
- **One version origin.** The generator injects the version into `plugin.json`,
  `marketplace.json`, and the hardcoded `Server({ version })` in `index.js` from a
  single source (recommend `spmc-server/package.json` remains canonical and the root
  build reads it), retiring the current `0.1.0` vs `0.1.0-alpha.1` disagreement.

### Required refactor (one mechanical change)

`PLATFORM_SPECS` is already exported from `lib/specs.js` — ready to import. The tool
array is **not**: `index.js` defines `const TOOLS = [ … ]` module-locally. Extract it:

```js
// spmc-server/lib/tools.js  (new — pure data)
export const TOOLS = [ /* the 23 tool defs moved verbatim from index.js */ ];
```
```js
// spmc-server/index.js
import { TOOLS } from './lib/tools.js';   // server still serves the same array
```

Low risk: `test/smoke.mjs` already drives `ListTools` over stdio, so it covers that
the extracted array still loads and serves identically.

## npm / CI wiring

Generated artifacts live at the **repo root** (above `spmc-server/`), so the build
entry belongs at the root — add a minimal root `package.json` (today there is none;
scripts live only in `spmc-server/`):

```json
{
  "scripts": {
    "build":       "node build/generate.mjs",
    "build:check": "node build/generate.mjs --check"
  }
}
```

- `build` regenerates all artifacts in place.
- `build:check` regenerates to a temp dir, diffs against the committed files, and
  **fails on any difference** — run it in CI and as a pre-commit hook. This is what
  actually keeps the origin authoritative: it catches both a hand-edited generated
  file and a new tool added without rebuilding.

## Phasing

- **Phase 1 — kill the duplication that bit us.** Extract `lib/tools.js`; build the
  generator; unify the three MCP configs from one template; inject tool/limit tables
  into `README.md`, `hermes/CONTEXT.md`, and `skills/*`. This alone retires the
  "8 tools → 11 files" tax.
- **Phase 2 — packaging & distribution.** Generate `marketplace.json`; wire
  `build:check` into CI; consolidate the plugin into a single SPMC plugin.
- **Later — web tools.** Host SPMC as a remote (HTTP) MCP connector so the published
  plugin's tools work on claude.ai web, not just its skills. Packaging is unchanged;
  this is a transport/hosting milestone.

## Cleanup (not pipeline work, but in scope)

These are parallel/dead copies that the single-origin model makes obviously
unnecessary — plain `git rm`, not generation:

- `_bkp/plugin_*`, `_bkp/social-publisher/` — backup plugin trees committed to the repo.
- `social-publisher/` — the predecessor SPMC replaced. **Confirm before removing** —
  the user has referenced these folders positively as plugin-library references, so
  keep if wanted as a format example rather than assuming dead.

(`content-pipeline/` is **not** cleanup — it's the SPMC creative layer, absorbed into
the single plugin; see *Two layers, one plugin* above.)

## Merge-back (when implemented)

On ship, move into `PROJECT_ARCHITECTURE.md`:
1. A **"Single origin + generated distribution"** entry under *Design Decisions*.
2. The generated/source split in the top-of-file directory tree (`build/`,
   `capabilities/` as sources; `.claude-plugin/`, `skills/`, `.mcp.json`, `hermes/*`
   marked *generated*).
3. The surface-viability matrix into *Agent Integration Points*.

Then reduce this file to a one-line pointer, or delete it.

## Resolved

- **`content-pipeline` is part of SPMC** — the creative layer; folds into the single
  plugin as a skill group (see *Two layers, one plugin*).
- **`claude_desktop_config.json` stays** — generated from the shared MCP template as
  the no-marketplace manual fallback (see *Outputs*).

## Open questions

- Root `package.json` vs. keeping everything under `spmc-server/` with `../` output
  paths — recommend the root `package.json` since outputs are repo-root.
- Keep `content-pipeline`'s `test-skill`, or drop it as a scaffold?
