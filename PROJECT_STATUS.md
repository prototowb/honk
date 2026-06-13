# PROJECT STATUS — Social Publishing Mission Control (SPMC)

> Single source of truth for project state.

## Current State

```yaml
project_phase: "MVP"
project_name: "Social Publishing Mission Control (SPMC)"
framework: "MCP server + Claude skills"
project_type: "AI-native social publishing plugin"
initialization_date: "2026-06-10"
current_sprint: "MVP-1"
version: "0.1.0"
```

## Sprint MVP-1 — Active

Goal: Working MCP server + skills + configs. No UI. Works in all agent environments.

## Active Tickets

*None — MVP shipped in this session.*

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
| MVP-008 | Server smoke test: 13 tools listed, queue add/list verified | ✅ Done |
| ALPHA-002 | Scheduling daemon (`scheduler/`) — polls queue, auto-dispatches due items | ✅ Done |
| ALPHA-002b | `start.js` — combined launcher: MCP server + scheduler child (single Claude Desktop entry) | ✅ Done |

## Next Up (Phase 1 — Alpha)

| ID | Title | Priority |
|----|-------|----------|
| ~~ALPHA-001~~ | ~~Multi-account support~~ | ~~Done~~ |
| ~~ALPHA-002~~ | ~~Scheduling daemon~~ | ~~Done~~ |
| ~~ALPHA-003~~ | ~~Media pipeline~~ | ~~Done~~ |
| ~~ALPHA-004~~ | ~~Hermes skill pack~~ | ~~Done~~ |
| ALPHA-005 | Analytics ingestion: fetch post engagement 24h after publish | Low |

## Project Metrics

| Metric | Value |
|--------|-------|
| Platforms supported | 6 (X, Instagram, TikTok, Facebook, Threads, Bluesky) |
| MCP tools | 13 (8 publishing + 5 queue) |
| Claude Code skills | 7 (6 platform skills + manage-queue) |
| Lines of server code | ~280 (lean and readable) |
| Dependencies | 1 (`@modelcontextprotocol/sdk`) |

## Recent Updates

- 2026-06-10: MVP shipped — MCP server live, all tools verified, configs ready
