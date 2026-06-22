# Changelog

All notable changes to SPMC are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the
project uses [Semantic Versioning](https://semver.org/) (pre-1.0, `-alpha` while
the surface stabilizes: minor = features, patch = fixes). The version lives once
in `spmc-server/package.json` and flows into every generated artifact via
`npm run build` — see [RELEASING.md](RELEASING.md).

## [Unreleased]

### Fixed
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
- **Package-smoke gate** (`spmc-server/test/pack-smoke.mjs`, `npm run pack:smoke`)
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
