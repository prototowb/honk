# SESSION_HANDOFF — SPMC

> Read this before anything else. Replace entirely at session end — this is current state, not a log.

## What Just Shipped

**Media pipeline complete (ALPHA-003) + compositor (no 3rd-party services).**

- `spmc-server/media/upload.js` — accepts file path or in-memory buffer; Cloudinary + imgbb providers
- `spmc-server/media/compose.js` — sharp-based local compositor; SVG template → PNG → auto-upload
- `spmc-server/media/templates/` — 3 templates: `square-dark` (1080×1080), `story-dark` (1080×1920), `banner-wide` (1200×628). Brand palette from DESIGN_GUIDE.md (#05091e bg, #1df7ed accent, #8ac0dd text).
- Template format is UI-ready: each template has `template.json` (variables with labels/types/defaults for future form rendering) + `template.svg` (with `{{variable}}` placeholders)
- 15 MCP tools total (`media_compose` + `media_upload` added)



**Scheduling daemon added (ALPHA-002).**

- `spmc-server/scheduler/scheduler.js` — polls queue every 60s, auto-dispatches items where `scheduled_at <= now` and `status === 'pending'`
- `spmc-server/scheduler/index.js` — standalone launcher with same credential-loading pattern as `run.js`
- `spmc-server/start.js` — combined launcher: spawns scheduler child (logs to `~/.claude/spmc-scheduler.log`) then hands off to MCP server on stdio. Claude Desktop config now points at `start.js`.
- Verified: scheduler log written at `C:\Users\tobia\.claude\spmc-scheduler.log`

**MVP-1 (previous session).** Full MCP server + skills + configs.

- `spmc-server/` — stdio MCP server (Node.js ESM, 1 dependency: `@modelcontextprotocol/sdk`)
  - `adapters/` — 6 platform adapters (X, Instagram, TikTok, Facebook, Threads, Bluesky)
  - `queue/store.js` — file-backed JSON queue
  - `index.js` — 13 tools wired up and verified
- `skills/` — 7 Claude Code SKILL.md files (6 platform + manage-queue)
- `.env.example` — all credentials documented
- `claude_desktop_config.json` — drop-in Claude Desktop App config
- `PROJECT_ARCHITECTURE.md` — extracted from specs
- Proto-gear files initialized and filled in

**Verified:** server boots, responds to `tools/list` with all 13 tools, `queue_add` and `queue_list` work end-to-end.

## Pending / In Progress

- Credentials not yet in `.env` — no live platform posting has been tested (by design; requires user's credentials)
- Claude Desktop App config uses hardcoded Windows path — user should adjust if needed
- Queue `queue.json` is gitignored-by-convention but `.gitignore` not yet created (no git repo exists yet)

## Conventions In Force

- Server is `spmc` (not `social-publisher`) — all skills reference `mcp_server: spmc`
- Platform names in queue tool are lowercase: `x`, `instagram`, `tiktok`, `facebook`, `threads`, `bluesky`
- Queue item IDs format: `q_<timestamp>_<5-char-random>`
- No comments in code unless the WHY is non-obvious

## Open Questions

- Should the scheduling daemon be a separate process (cron) or built into the MCP server as a background timer?
- Hermes skill pack: does Hermes consume SKILL.md files the same way Claude Code does, or does it need a different format?
- `.gitignore` — when git init is done, `queue/queue.json`, `.env`, and `node_modules/` should be excluded.
