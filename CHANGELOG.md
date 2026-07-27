# Changelog

All notable changes to Honk are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the
project uses [Semantic Versioning](https://semver.org/) (pre-1.0, `-alpha` while
the surface stabilizes: minor = features, patch = fixes). The version lives once
in `honk-server/package.json` and flows into every generated artifact via
`npm run build` — see [RELEASING.md](RELEASING.md).

## [Unreleased]

### Added
- **Account registry v1** (INIT-014) — `brand-active.json`'s active-account
  pointer grows into a versioned `accounts.json` registry (own comment called
  it "the seed of a future account registry"; this is that registry). Still
  owns the active pointer (`brand.getActive`/`setActive` now delegate to it,
  with an automatic read-only seed from the legacy `brand-active.json` file so
  existing active selections carry over with no migration step), and now also
  caches each account's channel handle (id/handle/name/icon_url) fetched via
  `account_info`, so `brand_voice list` shows it without a live API round trip.
  Scope stays exactly what H1 called for — credential identity (env) × brand
  identity (`brand.json`) × channel handles — nothing else is duplicated into
  the registry. Registry keys are lowercase-normalized (matches the existing
  `accountsOverview()` join) while the active pointer preserves the exact case
  the user set, since `brand.json` and `env()` key off raw case. Tools stay 34
  (no new tool surface — `brand_voice list` and `account_info` are unchanged
  call shapes, richer output). 8 unit tests.

- **Asset registry v1 — the DAM seed** (INIT-013, tools 32→34). Every
  `media_compose` / `media_upload` output is recorded automatically in a
  versioned `assets.json` store: provider URL(s), content hash (identical bytes
  re-uploaded under a new URL dedupe onto one asset), dimensions, tags,
  rights/expiry note, and **usage per post** captured at the dispatch
  chokepoint. New tools: `asset_list` (filter by source/tag/account/template/
  expired/used, or query one asset by id/hash/URL) and `asset_update` (rights +
  tags). A rights-expired asset produces a deterministic **warning** in
  `content_check` and on the publish summary — never a block. The brand kit's
  logo/icon are registered as `brand-kit` assets when composing. All hooks are
  best-effort: the registry can never fail an upload or a live post.

### Changed
- **Descoped indefinitely (INIT-012, user decision):** Threads / TikTok / Bluesky
  live credentials and X publish verification (API tier 402). Adapters stay
  shipped and tested; the affected publish tools now carry an explicit
  **[Experimental: never verified against the live API]** flag in their
  descriptions (the 1.0 definition's "honestly flagged" arm). The items moved
  to a *Descoped* table in PROJECT_STATUS.md and no longer appear in handoffs.
- **SDLC streamline (INIT-012):** AGENTS.md's unfilled proto-gear scaffolding
  (fictional "4 Core + 2 Flex agents", placeholder git-flow/sprint blocks)
  replaced with the real **Session Model** (one Lead AI per session, the
  orient→contract→branch→build→gate→record→merge→hand-off loop, backlog-hygiene
  rule); root ARCHITECTURE.md (never-filled template) reduced to a pointer at
  PROJECT_ARCHITECTURE.md, the BUILD_CONCEPT.md convention.

### Fixed
- **Queued posts without an explicit `account:` bypassed brand policy** (INIT-006,
  closing the boundary flagged in INIT-005). The dispatch policy gate now falls
  back to the **active brand account** for the policy lookup — the same precedent
  `media_compose` set: brand identity follows the active pointer, publish
  credentials stay explicit. The fallback is surfaced as a provenance note in
  previews/dry-runs.
- **A corrupt store file could silently wipe user data.** A torn `queue.json`
  parsed as an empty queue and the next save destroyed every draft. Store writes
  are now atomic (write-tmp + rename), and corrupt user-authored stores (queue,
  brand kit) are backed up beside the store (`.corrupt-<ts>`) before falling back.
- **env.example drift healed** — the repo-root `.env.example` still documented the
  pre-flip `KEY__ACCOUNT` suffix convention and the SPMC-era header while the
  shipped `honk-server/env.example` had stale scope/provider prose. One canonical
  content in both places now.

### Added
- **`content_check` — one-call pre-publish report** (INIT-009). Runs every
  deterministic gate at once (platform rules, brand policy/disclosures, duplicate
  guard, schedule sanity) and returns a single pass/warn/block verdict plus the
  agent-judged checklist the server cannot verify. The final review step before
  queueing or publishing; the dispatch gate still enforces blocks independently.
- **Workflow library v1** (INIT-008) — named, reusable workflow starters
  (`weekly-insight`, `product-update`, `engagement-spark`) via the new
  `workflow_list` tool; each declares required inputs (brief-schema field keys),
  un-guided defaults, format suggestions, and activated capabilities. The brief
  gains a `workflow` field; guided mode leads with the pick-list. Replaces
  hand-written per-session prompts.
- **Store schema versioning** (INIT-008) — tracking stores (queue, followups,
  analytics, rate-limits) persist as `{schema_version, items}`; legacy files are
  read transparently and upgraded on next save; files from a newer version are
  read best-effort and never destroyed.
- **Outbound HTTP timeouts** (INIT-006) — every platform/API call goes through
  `fetchWithTimeout` (default 30s, `HONK_HTTP_TIMEOUT_MS` override), so a hung
  Graph call can no longer hang an MCP tool response or a scheduler tick.
- **Credential redaction at the audit boundary** — `redactSecrets` scrubs
  token-shaped material (query-string tokens, bearer/OAuth headers, JSON-embedded
  credentials) from error text before it is persisted to the audit log or surfaced
  to the agent.
- **LICENSE (MIT) + publish metadata** — `repository` / `bugs` / `homepage` in
  `package.json`; the tarball now ships a license file (previously declared MIT
  with no file — a publish blocker).
- **`PROJECT_HISTORY.md`** — narrative session history moved out of
  `PROJECT_STATUS.md`, which returns to being a lean current-state snapshot.
- **Published package was dead on arrival.** `lib/` was missing from the npm
  `files` allowlist, but `index.js` imports 13 modules from it — the tarball
  crashed at load with `ERR_MODULE_NOT_FOUND`. Latent (the name was unpublished)
  but it broke every npm/`npx` surface on first publish. Now shipped and guarded.

### Added
- **Image alt text** (ALPHA-014) on posts that carry an image — `alt_text` on
  `instagram_post` / `facebook_post` / `threads_post`, and `alt_texts[]` (one per
  slide) on Instagram carousels. Validated, previewed in `dry_run`, and flows
  through the queue. **IG verified live** (`/media` `alt_text`). **FB
  (`alt_text_custom`) and Threads (container `alt_text`) are UNVERIFIED** — FB did
  not read back off the photo in live testing; Threads has no credentials yet.
- **First comment** (ALPHA-015) on Instagram and Facebook — `first_comment` posts a
  comment (e.g. hashtags or a link kept out of the caption) right after publishing.
  **Best-effort by design** — and **verified live:** it runs *after* the publish is
  confirmed and audited, so a comment failure never marks the live post failed or
  blinds `duplicate_check` (the outcome is folded into the summary). IG verified
  end-to-end; the FB path is correct but needs the **`pages_manage_engagement`**
  scope (IG needs **`instagram_manage_comments`**). See `.env.example` for scopes.
- **Optional guided pipeline intake.** A `brief_schema` tool exposes the per-run
  content-brief field spec (angle, goal, platforms, schedule, references,
  constraints) — the single source for chat-guided intake and a future web-UI form
  — annotating which fields the brand kit pre-fills. `idea-input` / `research-trends`
  gain an opt-in "guided mode" that walks it one field at a time instead of asking
  for everything in one command; the default one-shot flow is unchanged. Tools 28 → 29.
- **`spmc-start` bin** — launches the MCP server **and** the scheduler daemon, so
  npm-installed users get scheduled-post auto-dispatch and the ~24h auto-analytics
  follow-up. The `spmc` bin stays MCP-only.
- **Package-smoke gate** (`honk-server/test/pack-smoke.mjs`, `npm run pack:smoke`)
  — packs, installs, and boots the tarball; a `files`-array omission now fails CI
  and `prepublishOnly` instead of reaching a user's install.
- **`prepublishOnly` publish guard** — `test` + `build:check` + `pack:smoke` must
  pass before `npm publish`.
- **CHANGELOG + `npm version` flow** — bumping the version regenerates and stages
  every version-stamped artifact.

### Changed
- **`hermes/` → `agent/`.** The bring-your-own-agent integration pack is now a
  generic surface (Hermes is the reference instance); OpenClaw/generic clients are
  pointed at the same briefing. **Action:** update any external agent config that
  references `hermes/*` to `agent/*`.
- **CI gates `development` + `feature/**`** (was `main`-only), so integration-branch
  merges — which land by direct push, no PR — run the full gate.
- **Dev environment.** Repo is a real npm workspace (root `npm install` bootstraps
  the server); test discovery is shell-independent (Node globs the pattern);
  runtime floor set honestly to Node ≥20.9 (`sharp`), with Node ≥21 required only
  for the test toolchain.

## [0.3.0-alpha] — 2026-06-19

### Added
- Content-intelligence foundations (Sprint Alpha-2): `brand_voice` profiles,
  `link_tag` UTM tagging, drafts (`queue_add(draft:true)`), `duplicate_check`
  repost guard, `best_time` posting windows, and auto-fetch analytics ~24h after
  publish.
- Media: `square-tall` (4:5) template + `logo_url` corner stamp; IG carousel
  publishing; `account_info`; `square-news` template.
- Foundational prompt overhaul across the 6 platform skills + pipeline skills.

### Changed
- FB analytics metric set corrected to live-valid; imgbb-primary/Cloudinary-fallback
  media selection with `CLOUDINARY_URL` one-liner parsing.
- First live end-to-end publish verified (IG carousel + FB page post).

## [0.2.0-alpha] — 2026-06-16

### Added
- **Single-origin build system** (`build/generate.mjs`): every distribution
  artifact (skills, MCP configs, tool tables, plugin manifest) is generated from
  one origin and verified by `build:check` in CI + an opt-in pre-commit hook.

## [0.1.0-alpha] — 2026-06-14

### Added
- MVP MCP server: 6 platform adapters (X, Instagram, TikTok, Facebook, Threads,
  Bluesky), file-backed content queue, scheduling daemon, media pipeline.
- Packaging across surfaces: npm package, Claude Code plugin, Claude Desktop
  config, and the agent (then "Hermes") briefing pack.

[Unreleased]: https://github.com/prototowb/spmc/compare/v0.3.0-alpha...HEAD
[0.3.0-alpha]: https://github.com/prototowb/spmc/releases/tag/v0.3.0-alpha
[0.2.0-alpha]: https://github.com/prototowb/spmc/releases/tag/v0.2.0-alpha
[0.1.0-alpha]: https://github.com/prototowb/spmc/releases/tag/v0.1.0-alpha
