# SESSION_HANDOFF — SPMC

> Read this before anything else. Replace entirely at session end — this is current state, not a log.

## Where We Are

**BETA-010 (live credential testing) is DONE, and the BETA-012 feature bundle that made it possible shipped with it — `v0.3.0-alpha`.** A real, researched 6-slide Instagram **carousel** (US government pulling Anthropic's Fable 5 / Mythos 5, three days after launch) was published to **`@protocode_`**, plus a **Facebook Page** post, end-to-end through the spine (tool → dispatch → adapter → live API), with audit + analytics verified. Both posts are **live and public** (no un-publish tool — manual delete only).

**This work is committed on branch `feature/BETA-010-carousel-live`, NOT merged to `main` and NOT pushed.** `main` is unchanged. Deciding whether to push / open a PR / merge is the first open item.

## What Shipped This Session

New product surface (all single-origin: edit `lib/*` / `capabilities/` / templates, then `npm run build`):
1. **IG carousel publishing** — `instagram_post` accepts `image_urls[]` (2–10); `adapters/instagram.js#postCarousel` does the multi-child → `CAROUSEL` parent → publish Graph flow; validated in `lib/specs.js`/`validate.js` (carousel rules) + routed in `lib/dispatch.js`.
2. **`account_info` tool** (read-only) — IG/FB profile (handle, name, avatar URL) via `getProfile()` adapters. Confirms the connected account + supplies branding assets. **Tools 23 → 24.**
3. **`square-news` template** — 1080×1080 branded news/carousel slide: headline, **word-wrapped body**, footer with **circular account icon + @handle**. `media/compose.js` gained body-wrap + icon embedding (data-URI in SVG). **Templates 3 → 4.**
4. **`compose` empty-value fix** — `''`/missing variables now fall back to template defaults (the bug that rendered the accent bar + handle in black-on-black on the first slide pass).
5. **FB analytics fixed** — the entire `post_impressions*` family is **deprecated** (live `(#100)`); `facebook.getMetrics` now uses live-valid engagement metrics (`post_engagements`, `post_clicks`, `post_reactions_like_total`, `post_reactions_by_type_total`) + a `total_value` fallback.
6. **Media host = imgbb primary / Cloudinary fallback** — `upload.js` auto-selects imgbb first for images (more generous free tier), Cloudinary as fallback, Cloudinary-only for video; added **`CLOUDINARY_URL` one-liner parsing** (`config_doctor` + `.env.example` updated). Both providers verified live.
7. **Version → `0.3.0-alpha`** (single-sourced; build propagated to plugin.json/TOOLS.md/desktop config).

**State:** working tree clean on the feature branch; `build:check` green (20 checked + 1 skipped); **41 unit tests + smoke pass**. Scratch harnesses used during the run were removed.

## Live-cred reality (verified this session)
- ✅ **Instagram** — token valid; publish (carousel) + analytics + profile all work.
- ✅ **Facebook** — token refreshed mid-session (old one expired Jun 9); publish + profile work; analytics now returns (empty on a fresh post, valid metric names).
- ✅ **Media** — imgbb key fixed to valid 32-char; Cloudinary works via the `CLOUDINARY_URL` one-liner.
- ⛔ **X** — credit-blocked (`402 CreditsDepleted`); needs paid credits.
- ⛔ **Bluesky** (`BLUESKY_APP_PASSWORD` empty), **Threads** (both empty), **TikTok** (token empty) — not configured.
- Note: `config_doctor` reports presence, not validity — it green-lit the expired FB token and the invalid imgbb key. `account_info` is now the live read-path check.

## NEXT — open items
- **Push / PR / merge decision** for `feature/BETA-010-carousel-live` (currently local-only). Project pattern is `--no-ff` merge to `main` + push, but that's a user call.
- **BETA-013** — refresh/verify the remaining creds (Bluesky/Threads/TikTok) and add X credits, if those platforms are wanted.
- **BETA-011** — UI implementation **planning** (analytics dashboard + content calendar) remains the intentional stop-line; not started.

## Conventions In Force
- **Build origin:** tool → `lib/tools.js`; limit → `lib/specs.js`; credential/media key → `lib/config.js` (+ document in `.env.example`); skill/Hermes prose → `capabilities/`; template → `media/templates/`; version/metadata → `spmc-server/package.json`. Then `npm run build`. **Never hand-edit generated artifacts** — `build:check` (CI + pre-commit) rejects it.
- Server `spmc`; `run.js` = MCP only (loads `~/.claude/spmc.env`); `start.js` = MCP + scheduler. One dispatcher (`lib/dispatch.js`); every real publish goes through `publishAudited`.
- Credentials: `~/.claude/spmc.env`; multi-account `KEY__ACCOUNT`. Always confirm post content with the user before publishing (there is no un-publish).
- Keep `npm test` + `build:check` green at every commit. Runtime deps still 2; build tooling adds zero.
