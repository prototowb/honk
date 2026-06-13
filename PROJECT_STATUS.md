# PROJECT STATUS — Social Publishing Mission Control (SPMC)

> Single source of truth for project state.

## Current State

```yaml
project_phase: "Alpha"
project_name: "Social Publishing Mission Control (SPMC)"
framework: "MCP server + Claude skills"
project_type: "AI-native social publishing plugin"
initialization_date: "2026-06-10"
current_sprint: "Alpha-1"
version: "0.1.0-alpha.1"
```

## Sprint Alpha-1 — Complete

Goal: Packaging, distribution, and documentation for first release.

## Active Tickets

*None.*

## Completed Tickets

| ID | Title | Status |
|----|-------|--------|
| INIT-001 | ProtoGear Agent Framework integrated | ✅ Done |
| MVP-001 | MCP server (`spmc-server`) with all 6 platforms + queue tools | ✅ Done |
| MVP-002 | Platform adapters: X, Instagram, TikTok, Facebook, Threads, Bluesky | ✅ Done |
| MVP-003 | File-backed content queue (queue_add/list/update/remove/dispatch) | ✅ Done |
| MVP-004 | Claude Code skills for all platforms + queue management | ✅ Done |
| MVP-005 | `.env.example` with all credentials documented | ✅ Done |
| MVP-006 | `claude_desktop_config.json` — drop-in Claude Desktop App config | ✅ Done |
| MVP-007 | `PROJECT_ARCHITECTURE.md` extracted from specifications | ✅ Done |
| MVP-008 | Server smoke test: 15 tools listed, queue add/list verified | ✅ Done |
| ALPHA-001 | Multi-account support (`__ACCOUNTNAME` credential suffix) | ✅ Done |
| ALPHA-002 | Scheduling daemon (`scheduler/`) — polls queue every 60s | ✅ Done |
| ALPHA-002b | `start.js` — combined launcher: MCP server + scheduler child | ✅ Done |
| ALPHA-003 | Media pipeline: `media_compose` + `media_upload`, 3 templates, Cloudinary + imgbb | ✅ Done |
| ALPHA-004 | Hermes skill pack (`hermes/CONTEXT.md`, `SKILLS.md`, `persona.md`, `mcp-config.json`) | ✅ Done |
| ALPHA-005b | npm packaging: `bin: spmc`, shebang, `files` array, version `0.1.0-alpha.1` | ✅ Done |
| ALPHA-005c | Claude Code plugin: `.mcp.json` with `${CLAUDE_PLUGIN_ROOT}`, `.claude-plugin/plugin.json` updated | ✅ Done |
| ALPHA-005d | `claude_desktop_config.json` updated: `npx spmc`, removed broken `${VAR}` env block | ✅ Done |
| ALPHA-005e | `README.md` — full setup guide for all agent surfaces | ✅ Done |
| ALPHA-005f | `.gitignore` finalized | ✅ Done |

## Next Up

| ID | Title | Priority |
|----|-------|----------|
| ALPHA-006 | `git init` + first commit + GitHub remote | 🔴 Now |
| ALPHA-007 | `npm pack` dry run — verify package structure | 🔴 Now |
| ALPHA-008 | Analytics ingestion: fetch post engagement 24h after publish | Low |

## Project Metrics

| Metric | Value |
|--------|-------|
| Platforms supported | 6 (X, Instagram, TikTok, Facebook, Threads, Bluesky) |
| MCP tools | 15 (8 publishing + 5 queue + 2 media) |
| Claude Code skills | 8 (6 platform + manage-queue + upload-media) |
| npm package | `spmc` v0.1.0-alpha.1 |
| Dependencies | 2 (`@modelcontextprotocol/sdk`, `sharp`) |
| Agent surfaces | 5 (Claude Code, Claude Desktop, Hermes, OpenClaw/generic, CLI/npm) |

## Recent Updates

- 2026-06-14: Alpha-1 packaged — npm package, Claude Code plugin, README, git init
- 2026-06-10: Media pipeline shipped (ALPHA-003)
- 2026-06-10: MVP shipped — MCP server live, all tools verified, configs ready
