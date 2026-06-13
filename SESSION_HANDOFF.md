# SESSION_HANDOFF — SPMC

> Read this before anything else. Replace entirely at session end — this is current state, not a log.

## What Just Shipped

**Alpha-1 packaged and pushed to GitHub (prototowb/honk).**

- `spmc-server/package.json` — renamed to `spmc`, v0.1.0-alpha.1, `bin: spmc → run.js`, `files` array, keywords, license
- `spmc-server/run.js` — shebang added, self-bootstrap `npm install` block removed
- `spmc-server/env.example` — copied into package (npm skips dotfiles; renamed from `.env.example`)
- `.mcp.json` — Claude Code plugin MCP config using `${CLAUDE_PLUGIN_ROOT}/spmc-server/run.js`, all credentials as `${VAR}`
- `.claude-plugin/plugin.json` — version bumped to `0.1.0-alpha.1`, license added
- `claude_desktop_config.json` — switched to `npx spmc`; removed broken `${VAR}` env block (Desktop doesn't expand vars — credentials load from `spmc.env`)
- `README.md` — full setup guide: Claude App, Claude Desktop, Hermes, OpenClaw/generic, CLI/npm
- `PROJECT_STATUS.md` — updated to Alpha phase, all tickets reflected, correct metrics (15 tools, 2 deps, 5 surfaces)
- `.gitignore` — finalized (`!.env.example`, `*.log`, `.DS_Store`)
- 3 commits on `main`, pushed to `https://github.com/prototowb/honk.git`

**npm pack verified:** 22 files, 12.6 kB packed — all adapters, server, media, queue, scheduler included. No node_modules or queue data.

## Pending / In Progress

- **Live credential testing** — next session priority. No platform has been tested end-to-end with real credentials. Suggested order: Bluesky first (simplest auth — just identifier + app password), then X, then Meta platforms.
- **npm publish** — package is ready; hold until after live testing confirms everything works.

## Conventions In Force

- Server is `spmc` (npm package name matches MCP server name)
- npm bin entry: `run.js` (MCP server only — no scheduler)
- Scheduler is a separate process: `start.js` (spawns scheduler child) or `npm run scheduler`
- Credentials: `~/.claude/spmc.env` is the primary location for all surfaces
- Platform names in queue tool are lowercase: `x`, `instagram`, `tiktok`, `facebook`, `threads`, `bluesky`
- Queue item IDs format: `q_<timestamp>_<5-char-random>`
- No comments in code unless the WHY is non-obvious

## Open Questions

- Should `run.js` in `hermes/CONTEXT.md` and `hermes/mcp-config.json` be updated to reflect the npm package (`npx spmc`) option?
- `.gitignore` excludes `*.env` but `!.env.example` only covers the root — verify `spmc-server/env.example` (no dot) is tracked correctly.
