# SPMC — Project Architecture

> Extracted from PROJECT_SPECIFICATIONS.md. Authoritative architecture reference.

## System Overview

SPMC is an MCP server + skills bundle. There is no UI at MVP. The agent is the interface.

```
spmc-server/              ← stdio MCP server (Node.js ESM)
├── index.js              ← server entry, tool dispatch
├── adapters/             ← one file per platform, no cross-dependencies
│   ├── x.js              ← X/Twitter OAuth 1.0a
│   ├── instagram.js      ← Meta Graph API v19
│   ├── tiktok.js         ← TikTok Content Posting API v2
│   ├── facebook.js       ← Meta Graph API v19 (Pages)
│   ├── threads.js        ← Threads API (graph.threads.net)
│   └── bluesky.js        ← AT Protocol (bsky.social)
└── queue/
    └── store.js          ← file-backed JSON queue (upgrades to SQLite in Phase 1)

skills/                   ← Claude Code SKILL.md files, one per platform + queue
AGENTS.md                 ← agent onboarding (proto-gear)
PROJECT_SPECIFICATIONS.md ← roadmap + vision
PROJECT_ARCHITECTURE.md   ← this file
.env.example              ← all required env vars
claude_desktop_config.json ← Claude Desktop App mcpServers entry
```

## Design Decisions

### Adapter pattern
Each platform lives in one file with named exports matching their semantic action (`post`, `postSingleTweet`, `postThread`, `postVideo`, `checkStatus`). The dispatcher in `index.js` calls the right adapter based on `platform` argument. Adding a new platform = add one adapter + one skill + one case in the dispatcher.

### File-backed queue
`queue/store.js` uses a `queue.json` file in the same directory. Simple, portable, zero dependencies. Upgrade path: swap `store.js` for a SQLite-backed version in Phase 1; the interface is stable.

### Credentials
All secrets are env vars. The MCP server reads `process.env.*` at call time. Never stored in queue items or passed through tools. Claude Desktop injects them via the `env` block in `claude_desktop_config.json`.

### Tool surface
13 tools total at MVP: 8 direct publishing tools + 5 queue management tools. The queue is intentionally decoupled from publishing — agents can queue without credentials and dispatch when ready.

## Agent Integration Points

| Agent environment | Integration method |
|-------------------|--------------------|
| Claude Code | Skills in `skills/` directory |
| Claude Desktop App | `claude_desktop_config.json` mcpServers entry |
| Cursor / Windsurf | Same MCP config, different host config file location |
| Hermes | Reads AGENTS.md + uses MCP tools directly |
| Any MCP-compatible agent | `node spmc-server/index.js` via stdio |

## Phase 1 additions (post-MVP, do not build yet)

- Multi-account support: namespace env vars per account (e.g. `X_API_KEY_PERSONAL`, `X_API_KEY_BRAND`)
- SQLite queue with scheduling daemon
- Media pipeline: local file → CDN → public URL
- Analytics ingestion tools
