# SESSION_HANDOFF — Honk

> Read this before anything else. Replace entirely at session end — this is current state, not a log.

## Where We Are

**`v0.3.0-alpha`** · `development` is default/integration (green). **`development` is
~28 commits ahead of `origin/development` and UNPUSHED** — the sandbox has no GitHub
credentials. **First action: push** (`git -C G:\Projects\_Plugins\honk push origin development`
on the host). `main` still at v0.3.0-alpha via PR only.

**State:** **34 tools** · 15 skills · 5 templates · 2 runtime deps · **171 unit +
49-check smoke + build:check + pack:smoke** green at every commit.

## This Session (2026-07-06/07) — INIT-012 + INIT-013

**INIT-012 SDLC streamline + descope** (`feature/INIT-012-sdlc-streamline`, merged):
- **Descoped indefinitely (user decision):** Threads/TikTok/Bluesky live creds + X publish
  (402). New *Descoped* table in PROJECT_STATUS is their only home — they are NOT re-listed
  in handoffs (backlog-hygiene rule now in AGENTS.md → Session Model). Adapters stay
  shipped/tested; the six affected publish tools carry an explicit **[Experimental: never
  verified against the live API]** description flag — the 1.0 definition's "honestly
  flagged" arm (PROJECT_SPECIFICATIONS §1 updated; remaining verify item: FB alt-text
  read-back, minor).
- **AGENTS.md**: proto-gear template fiction (4 Core + 2 Flex agents, {{placeholder}}
  sprint/git-flow blocks) replaced with the real **Session Model** (one Lead AI per session;
  orient→contract→branch→build→gate→record→merge→hand off). Root **ARCHITECTURE.md**
  (never-filled pg template) reduced to a pointer at PROJECT_ARCHITECTURE.md
  (BUILD_CONCEPT.md convention). Net −780 lines. `agent/mcp-config.json` healed to the
  post-rename path. `.gitignore`: `*.tgz`, `.claude/`.

**INIT-013 Asset registry v1 — the DAM seed** (`feature/INIT-013-asset-registry`, merged;
H2 item pulled forward as the first Brand OS platform brick, user's pick):
- `src/lib/assets.ts` — versioned tracking store `~/.honk/assets.json` ({schema_version,
  items}, INIT-008 contract). Asset: id (`ast_<hash16>`), content hash, provider URL(s),
  dims/bytes/format, source (upload|compose|brand-kit|manual), template, tags,
  **rights{note,expires_at}**, **usage[] per post**.
- **Dedupe at register** by content hash (URL fallback when hash-less): identical bytes
  re-uploaded under a new URL extend ONE asset's url list (latest wins as primary).
- **Auto-registration:** `media/upload.ts` registers external uploads (compose-internal
  buffer calls skipped — compose registers richer); `media/compose.ts` registers with
  template+dims; `index.ts media_compose` registers the kit's logo/icon as `brand-kit`
  assets (URL-dedupe). ALL hooks best-effort: registry failure can never fail an upload
  or a live post.
- **Usage-per-post from day one** (the R2 anti-retrofit takeaway): `publishAudited`
  chokepoint records {platform, post_id, account, at} onto every registered asset the
  publish referenced (matches ANY known URL of a deduped asset).
- **Rights/expiry = deterministic WARN, never block:** in `content_check` (report.ts) and
  appended to the dispatch summary. Judgment stays with the user (security doctrine:
  deterministic vs agent-judged).
- **Tools 32→34:** `asset_list` (filters source/tag/account/template/expired/used; `query`
  by id/hash/URL for one record) + `asset_update` (rights_note, rights_expires_at,
  add/remove_tags). Skills prose: output-manager (reuse-before-re-render),
  content-intelligence (registry section). 171 unit (+11) + 49 smoke (+2).

## ⚠ Session Infrastructure (READ before touching files/git in a sandboxed session)

The desktop mount misbehaves under the sandbox — all mitigations verified this session:
1. **Desktop file tools (Write/Edit) TRUNCATE/NULL-PAD files to their previous byte length
   on this mount.** Corrupted 6 files this session (caught by tsc + byte-size diff vs git).
   **Write files ONLY via bash** (python/heredoc through the Linux mount path). Verify with
   `wc -c` vs `git show HEAD:<file> | wc -c` after any suspicious write.
2. `.git/HEAD` and `ORIG_HEAD` are intermittently **un-writable** → `git switch`/`merge`
   can fail or half-fail. Use **plumbing**: `git write-tree` → `git commit-tree` →
   `git update-ref refs/heads/<branch>`. Merges: `commit-tree TREE -p dev -p feature`.
3. Off-mount index in force: `export GIT_INDEX_FILE=/sessions/<sandbox>/honk.index`
   (rebuild with `git read-tree HEAD` if stale). `unable to unlink tmp_obj_*` warnings are
   cosmetic. **None of this applies on the user's machine.**
4. No GitHub creds in the sandbox → the USER pushes.
5. `pack:smoke` PASSES but its tgz cleanup hits EPERM on the mount — tarball is gitignored.
6. HEAD may still point at a stale feature branch after a failed switch — branch refs are
   correct; trust `git log <branch>` over `git branch --show-current`.

## NEXT

0. **Push `development`** (user, on host). Then npm **publish story**: check `honk` name
   availability on the registry → RELEASING.md flow (LICENSE/metadata done since INIT-006).
1. **Content quality — live-prove INIT-003** (H0): one real fact-bearing post through
   content-craft + persona gates, confirm hook→payoff→CTA + followable source lands better.
2. **Account registry (H1)** — grow `brand-active.json` into `accounts.json` (credential ×
   brand × handles); asset registry + policy fallback both want it.
3. **BETA-011 UI phase** (stop-line; entry after 1.0 cut per horizons) — read-only first:
   queue/calendar/analytics/**assets** views rendering the same schemas guided mode uses.
4. **INBOX-001** Phase 0 vs 1 decision (plan in INBOX_FEATURE_PLAN.md).
5. **INDIV-007 learned/adaptive** — data-gated on accrued analytics.
6. Deferred: ALPHA-016 delete (destructive, scope-paused) · ALPHA-017 Mastodon /
   ALPHA-018 LinkedIn (need creds/decisions). Descoped items live ONLY in PROJECT_STATUS.

## Conventions In Force

- **TypeScript default** — new source in `honk-server/src/*.ts`; compiled JS is GENERATED
  (`npm run build:ts`; `pretest` compiles). Never hand-edit generated artifacts.
- **Outbound HTTP** — `import { fetchWithTimeout as fetch } from '../lib/http.js'` in
  adapters/media. Secrets scrubbed at the audit boundary.
- **JSON state** — `lib/jsonstore.ts` (`writeVersionedAtomic`/`readVersioned` for tracking
  stores; brand stores stay flat per INDIV-006). Asset store follows the versioned contract.
- **Registry hooks are best-effort** — never let assets.ts throw into an upload/publish path.
- **Build origin:** tool → `src/lib/tools.ts` · limit → `src/lib/specs.ts` · cred/media key →
  `src/lib/config.ts` (+ both env.examples in sync) · skill prose → `capabilities/` ·
  template → `media/templates/<id>/` · version → `honk-server/package.json`. Then
  `npm run build:ts && npm run build`. ⚠ `npm run build` rewrites `agent/mcp-config.json`
  with the LOCAL absolute path — in a sandbox session, restore the user's Windows path
  (`G:\Projects\_Plugins\honk\honk-server\run.js`) before committing.
- **Gates green at every commit:** `npm test` · `npm run build:check` · `test:smoke` ·
  `pack:smoke`. CI gates `main`/`development`/`feature/**` + PRs.
- **Narrative history → PROJECT_HISTORY.md** (newest first); PROJECT_STATUS stays a lean
  snapshot; **descoped items live only in the STATUS Descoped table** (AGENTS.md rule).
- **Bins:** `honk` = run.js (MCP only) · `honk-start` = start.js (MCP + scheduler).
- **Credentials** in `~/.claude/honk.env` (`ACCOUNT__KEY` prefix; default = bare keys, not a
  fallback). Meta slots hold a **non-expiring PAGE token** (minted 2026-07-05, INIT-010b).
  **Always confirm post content with the user before publishing.**
- **Git flow:** branch off `development`, merge `--no-ff`, push; `main` via PR only. Commit
  via `git commit -F <msgfile>`. Ticket IDs: confirm next free INIT-xxx against git history
  (INIT-013 was this session's last; `pg`'s counter drifts).
- **Document permission scopes** for platform-touching features (`.env.example` + skill).
