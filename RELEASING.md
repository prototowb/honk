# Releasing Honk

> **Note (2026-07-27):** npm registry publish is descoped indefinitely — no plan to
> distribute `honk` via `npm publish` (see PROJECT_STATUS.md *Descoped*). The
> version-bump / changelog mechanics below still apply to any release cut (tags,
> `main` merges); skip step 4 (`npm publish`) unless that decision changes.

The version lives once in `honk-server/package.json` and flows into every
generated artifact (`TOOLS.md`, `.claude-plugin/plugin.json`,
`claude_desktop_config.json`) through `npm run build`. **Never hand-edit the
version in a generated file** — `build:check` will reject it.

## Cut a release

On a clean working tree (`development` or `main`):

1. **Update the changelog.** Move the `## [Unreleased]` entries into a new
   `## [x.y.z] — YYYY-MM-DD` section, leave a fresh empty `[Unreleased]`,
   and update the compare links at the bottom of `CHANGELOG.md`.

2. **Bump the version** from the server package — the `version` lifecycle hook
   regenerates and stages the version-stamped artifacts for you:
   ```bash
   cd honk-server
   npm version patch          # 1.0.0 → 1.0.1   (or minor / major)
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

## Publishing to npm (descoped indefinitely)

See the note at the top of this file — there is no current plan to publish `honk` to
the npm registry. If that decision ever changes:

- `prepublishOnly` already gates it: `test` + `build:check` + `pack:smoke` must
  pass, so a broken or stale tarball can't go out.
- Check the `honk` name is still unclaimed (or use a scoped `@<owner>/honk`) — then
  `cd honk-server && npm publish`.
- Consider a tag-triggered GitHub Actions publish job once the name is settled.
