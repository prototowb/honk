# BRANCHING — SPMC

> Git workflow and commit conventions. Referenced by `AGENTS.md`.

## Branches

```
main                          production / shippable
  └── feature/TICKET-XXX-*     features
  └── bugfix/TICKET-XXX-*      fixes
  └── hotfix/TICKET-XXX-*      emergency fixes
```

- **Never commit directly to `main`.** Branch first.
- Branch name = `feature/TICKET-XXX-short-description` (e.g.
  `feature/BETA-001-capability-expansion`).
- Ticket IDs come from `PROJECT_STATUS.md` (current prefixes: `MVP`, `ALPHA`,
  `BETA`).

## Commits

Conventional Commits: `type(scope): subject`

- **type**: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`
- **scope**: usually `spmc` (the server), or a sub-area (`packaging`, `scheduler`)
- Subject: imperative, lower-case, no trailing period.
- Body: explain *why*, wrap ~72 cols. Note bug fixes and behavior changes.

Example:

```
feat(spmc): unify dispatcher + add content-intelligence tool surface
```

## Before committing

1. `cd spmc-server && npm test` — unit suite green.
2. `npm run test:smoke` — server still boots and lists tools.
3. Update `PROJECT_STATUS.md` (ticket status) and, at session end,
   replace `SESSION_HANDOFF.md` with current state.

## Pushing / releasing

- Push and `npm publish` are explicit, user-approved steps — not automatic.
- Keep `main` green; merge feature branches only when tests pass.
