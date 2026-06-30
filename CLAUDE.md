This project uses Proto Gear for AI agent coordination.

| File | Purpose | Read When |
|------|---------|-----------|
| `SESSION_HANDOFF.md` | Rolling session handoff — what just shipped, what's pending | Start of every session — before anything else |
| `AGENTS.md` | Agent orchestration, roles, pre-flight checklist | First session or unclear on process |
| `PROJECT_STATUS.md` | Current sprint, active tickets, project state | Every session before starting work |
| `PROJECT_SPECIFICATIONS.md` | Project planning doc — source for architecture decisions | When starting features or design work |
| `PROJECT_ARCHITECTURE.md` | Extracted architecture reference — adapters, queue, integration points | Design decisions |
| `.proto-gear/INDEX.md` | Capabilities: commands, skills, workflows | When starting a task (if exists) |

Rules: run `pg status` before starting work · MCP server is the spine — never call platform APIs directly · always confirm post content with user before publishing · update queue status after every dispatch

## TypeScript — default from here on

All new source files in `honk-server/` must be `.ts` under `honk-server/src/`. The `tsconfig.json` compiles `src/` → the existing output paths (rootDir: `src`, outDir: `.`), so tests and the build generator import paths are unchanged. **Never edit the compiled `.js` files directly — edit the `.ts` sources in `src/` instead.** Key commands:

- `npm run build:ts` — compile TypeScript
- `npm run type-check` — type-check without emit
- `npm test` — runs `tsc` first (via `pretest`), then the full test suite
