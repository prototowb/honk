# Releasing SPMC

The version lives once in `spmc-server/package.json` and flows into every
generated artifact (`TOOLS.md`, `.claude-plugin/plugin.json`,
`claude_desktop_config.json`) through `npm run build`. **Never hand-edit the
version in a generated file** — `build:check` will reject it.

## Cut a release

On a clean working tree (`development` or `main`):

1. **Update the changelog.** Move the `## [Unreleased]` entries into a new
   `## [x.y.z-alpha] — YYYY-MM-DD` section, leave a fresh empty `[Unreleased]`,
   and update the compare links at the bottom of `CHANGELOG.md`.

2. **Bump the version** from the server package — the `version` lifecycle hook
   regenerates and stages the version-stamped artifacts for you:
   ```bash
   cd spmc-server
   npm version patch          # 0.3.0-alpha → 0.3.1-alpha   (or minor / major)
   # prerelease bumps:
   npm version prerelease --preid alpha
   ```
   This bumps `package.json`, runs `npm run build`, `git add -u`'s the regenerated
   artifacts, commits, and tags `v<version>` — one consistent commit.

3. **Push** the branch and tag:
   ```bash
   git push && git push --follow-tags
   ```
   CI runs the full gate on the push (`build:check` + unit + MCP smoke +
   pack-smoke).

## Publishing to npm (deferred)

The `spmc` name is unclaimed and the npm / `npx` surface is advertised but not yet
live — see `PIPELINE_REVIEW.md` #4. When you decide to publish:

- `prepublishOnly` already gates it: `test` + `build:check` + `pack:smoke` must
  pass, so a broken or stale tarball can't go out.
- Settle the name first — publish `spmc`, or a scoped `@<owner>/spmc` to remove the
  unclaimed-name squat risk — then `cd spmc-server && npm publish`.
- Consider a tag-triggered GitHub Actions publish job once the name is settled.
