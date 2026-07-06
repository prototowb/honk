<!-- proto-gear:header
purpose: Pointer — architecture lives in PROJECT_ARCHITECTURE.md
read-when: Never — go to PROJECT_ARCHITECTURE.md
priority: optional
links:
  - PROJECT_ARCHITECTURE.md
  - PROJECT_SPECIFICATIONS.md
-->
# Architecture — Honk

> **This file is a pointer.** The authoritative architecture reference for Honk is
> **[`PROJECT_ARCHITECTURE.md`](PROJECT_ARCHITECTURE.md)** (agent-extracted from
> `PROJECT_SPECIFICATIONS.md`, per AGENTS.md → *Architecture Extraction Task*).
>
> This generic `pg init` template was never filled (doc rot flagged in the 2026-07-05
> handoff) and was reduced to a pointer on 2026-07-06 (INIT-012) — the same convention as
> `BUILD_CONCEPT.md`. If a future `pg sync-context` regenerates a template here, point it
> back at `PROJECT_ARCHITECTURE.md` instead of filling it: one home per fact.

What you're probably looking for:

| Topic | Where |
|---|---|
| System overview, layering law, directory tree | `PROJECT_ARCHITECTURE.md` |
| Target architecture (channel SPI, storage, transport) | `PROJECT_ARCHITECTURE.md` → *Target Architecture & Evolution* |
| Security doctrine (deterministic vs agent-judged gates) | `PROJECT_ARCHITECTURE.md` → security model |
| Single-origin build system | `PROJECT_ARCHITECTURE.md` → *Design Decisions*; TL;DR in `BUILD_CONCEPT.md` |
| Vision, pillars, horizon roadmap | `PROJECT_SPECIFICATIONS.md` |
