# SPMC — Build System

> **Shipped (BUILD-001, 2026-06-16).** This concept doc has been folded into the
> authoritative reference. See **`PROJECT_ARCHITECTURE.md`**:
>
> - *Design Decisions → Single origin + generated distribution* — the model, the
>   token resolver, the `build:check` gate (CI + pre-commit), and the two
>   deliberate exceptions (`hermes/mcp-config.json` machine-local; `.env.example`
>   completeness-checked).
> - *System Overview* directory tree — the generated/source split.
> - *Agent Integration Points → Surface viability* — the per-surface matrix and
>   the remote-MCP web milestone.

## TL;DR for contributors

One home per fact. **Edit the source, never the generated artifact:**

| To change… | Edit | Then |
|---|---|---|
| a tool (name/schema) | `spmc-server/lib/tools.js` | `npm run build` |
| a platform limit | `spmc-server/lib/specs.js` | `npm run build` |
| a credential / media-provider key | `lib/config.js` or `lib/specs.js` + document it in `.env.example` | `npm run build` |
| skill / Hermes prose | `capabilities/skills/<name>.md` · `capabilities/hermes/SKILLS.md` | `npm run build` |
| version / metadata | `spmc-server/package.json` | `npm run build` |

```
npm run build         # regenerate every artifact in place
npm run build:check   # fail if any generated artifact drifted (CI + pre-commit gate)
```

Enable the local gate once per clone: `git config core.hooksPath .githooks`.

**Never hand-edit** `TOOLS.md`, `.claude-plugin/plugin.json`, `skills/*/SKILL.md`,
`hermes/SKILLS.md`, the three MCP configs, or the `gen:tools` regions of `README.md`
/ `hermes/CONTEXT.md`. `build:check` will reject it.
