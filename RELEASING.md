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
   This bumps `package.json` and runs the `version` script (`npm run build` +
   `git add -u`, staging the regenerated artifacts).

   ⚠️ **npm workspaces gotcha (found cutting v1.0.0):** because `honk-server` is an
   npm workspace member (declared in the root `package.json`), `npm version` run from
   inside it does **not** auto-commit or auto-tag — that's documented npm behavior for
   workspace packages, not a bug. It stops after staging. Finish it yourself:
   ```bash
   cd ..                       # repo root
   git add package-lock.json   # the root lockfile's workspace version entry too
   git commit -m "1.0.0"       # match the bumped version
   git tag -a v1.0.0 -m "v1.0.0"
   ```
   Verify before tagging: `git diff --cached agent/mcp-config.json` should be empty
   (it holds a machine-local path and is excluded from `build:check`, so a stray
   change here wouldn't be caught automatically).

3. **Push** the branch and tag:
   ```bash
   git push && git push --follow-tags
   ```
   CI runs the full gate on the push (`build:check` + unit + MCP smoke +
   pack-smoke). Re-run the gate suite locally on the tagged commit before pushing —
   `npm test && npm run test:smoke && npm --prefix .. run build:check && npm run pack:smoke`.

4. **`main` via PR only** (repo convention — see AGENTS.md). Open
   `development` → `main` with `gh pr create`, confirm it's mergeable, then
   `gh pr merge --merge` (standard merge, not squash — keeps ticket-level history).

## Publishing to npm (descoped indefinitely)

See the note at the top of this file — there is no current plan to publish `honk` to
the npm registry. If that decision ever changes:

- `prepublishOnly` already gates it: `test` + `build:check` + `pack:smoke` must
  pass, so a broken or stale tarball can't go out.
- Check the `honk` name is still unclaimed (or use a scoped `@<owner>/honk`) — then
  `cd honk-server && npm publish`.
- Consider a tag-triggered GitHub Actions publish job once the name is settled.
