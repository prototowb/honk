# BRANCHING — SPMC

> Git workflow and commit conventions. Referenced by `AGENTS.md`.

## Branches

```
main                              production / shippable — protected
  └── development                 default / integration branch
        ├── feature/TICKET-XXX-*  features
        ├── bugfix/TICKET-XXX-*   fixes
        └── hotfix/TICKET-XXX-*   emergency fixes
```

- **`development` is the default branch** — we branch off it, merge into it, and push it to remote.
- **Never commit directly to `main` or `development`.** Always work on a `feature/`, `bugfix/`, or `hotfix/` branch cut from `development`.
- **Never push to `main` directly, and never merge feature branches into `main`.** Feature branches merge into `development`.
- **`development` → `main` only via pull request**, when the integration branch is shippable and green.
- Branch name = `feature/TICKET-XXX-short-description` (e.g.
  `feature/BETA-010-carousel-live`). Ticket IDs come from `PROJECT_STATUS.md`
  (current prefixes: `MVP`, `ALPHA`, `BETA`, `BUILD`).

## Flow

1. `git checkout development && git pull`
2. `git checkout -b feature/TICKET-XXX-desc`
3. Commit work (Conventional Commits; keep tests + `build:check` green).
4. Push the branch and open a PR into **`development`**.
5. When `development` is shippable, open a PR **`development` → `main`** — the only path to `main`.

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
3. `npm run build:check` (repo root) — generated artifacts in sync with origin.
4. Update `PROJECT_STATUS.md` (ticket status) and, at session end, replace
   `SESSION_HANDOFF.md` with current state.

## Pushing / releasing

- Push, PR merges, and `npm publish` are explicit, user-approved steps — not automatic.
- Keep `main` green; promote `development` → `main` via PR only when tests pass.
