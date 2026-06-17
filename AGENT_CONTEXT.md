<!-- proto-gear:agent-context begin -->
<!-- proto-gear | role: agent-context | regenerate: pg sync-context -->

# Agent Context — _Plugins

> Auto-generated index every agent should read on session start.
> Regenerate with `pg sync-context`. **Do not hand-edit** between the BEGIN/END markers — your changes will be overwritten.

## 📋 Reference Index

| File | Purpose | Read When |
|------|---------|-----------|
| `AGENTS.md` | Agent orchestration, roles, pre-flight checklist | First session or unclear on process |
| `SESSION_HANDOFF.md` | Rolling session handoff — what just shipped, what's pending | Start of every session — before anything else |
| `PROJECT_STATUS.md` | Current sprint, active tickets, project state | Every session before starting work |
| `PROJECT_SPECIFICATIONS.md` | Project planning doc — source for architecture | Starting features or design work (if exists) |
| `PROJECT_ARCHITECTURE.md` *(not present)* | Project-specific architecture (agent-extracted) | Design decisions (if exists) |
| `BRANCHING.md` *(not present)* | Git workflow, branch naming, commit format | Before any git operations |
| `TESTING.md` *(not present)* | TDD patterns, test pyramid, coverage targets | When writing tests |
| `.proto-gear/INDEX.md` *(not present)* | Capability catalog (full reference) | When the skim below is insufficient |

## 🛠 Available Capabilities

_No capabilities installed. Run `pg init --with-capabilities` to add them, or check `.proto-gear/`._

## 🔑 Trigger → Capability

When the user's prose contains these keywords, load the matching capability before responding.

_No triggers — install capabilities to enable trigger routing._

## 🚨 Critical Rules

- NEVER commit directly to `main` or `development` — always branch from `development` (the default branch)
- NEVER push to `main` or merge feature branches into `main` directly — `development` → `main` via PR only
- Run `pg status` before starting work to see active tickets and current sprint
- Use `pg ticket create "title" --type feature` to register new work
- Use `pg ticket update ID --status IN_PROGRESS` when starting a ticket

## 🤖 CLI Commands

- `pg status` — Current project state — version, sprint, active tickets
- `pg context [--regenerate]` — Print this Agent Context to stdout (pipe-friendly)
- `pg suggest "<task prose>" [--json]` — Match a free-form task description to the best-fitting capabilities
- `pg ticket create/update/list` — Manage tickets in PROJECT_STATUS.md
- `pg capabilities list [--type ...] [--json]` — Browse capabilities (--json for agent consumption)
- `pg capabilities show <name>` — Show full details of a capability
- `pg capabilities tree <name>` — Show dependency tree of a capability
- `pg agent list` — List configured custom agents (if any)
- `pg sync-context` — Regenerate Agent Context in all host files
- `pg sync-indexes` — Regenerate .proto-gear/INDEX.md and per-type INDEX.md from metadata.yaml
- `pg doctor [--fix] [--json]` — Audit project for proto-gear sync drift (use --fix to repair)
- `pg help` — Full CLI help

## 🌐 Project

- **Project**: _Plugins
- **Tech / type**: None
- **Proto Gear version**: n/a
- **Last release**: n/a
- **Capabilities installed**: 0 skills, 0 workflows, 0 commands
- **Generated**: 2026-06-10 01:25

<!-- proto-gear:agent-context end -->
