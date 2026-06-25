# Live Analytics Verification Runbook

> Turnkey steps to verify the engagement-analytics path against the real
> platform APIs. Written for the next live session (needs valid creds). The
> creds-free de-risk (metric-name re-verification, scheduler cred-loading, the
> no-wait drain seam) is already done — see *Status* below.

## What this verifies

1. **One-shot fetch** — `analytics_fetch(platform, post_id)` calls the platform's
   insights API, returns metrics, and stores a snapshot (`analytics_report`).
2. **Auto-follow-up loop** — after a real publish, `publishAudited` schedules a
   deferred metrics fetch (~24h) that the **scheduler** drains. This runbook
   collapses the 24h to seconds with `SPMC_ANALYTICS_DELAY_MS=0`.

## Status (2026-06-25)

| Platform | Metric set (`adapters/*.js`) | Metric names | Live fetch |
|----------|------------------------------|--------------|------------|
| Instagram | `reach,likes,comments,saved,shares` | ✅ current | ✅ verified 2026-06-17 (BETA-010) |
| Facebook  | `post_engagements,post_clicks,post_reactions_like_total,post_reactions_by_type_total` | ✅ current — June-2026 cull is reach/impression-only; these are unaffected | ◻ names validated; full fetch re-confirm pending |
| Threads   | `views,likes,replies,reposts,quotes` | ✅ current | ◻ no creds yet |
| X · TikTok · Bluesky | — | no `getMetrics` (tier/exposure) | n/a |

The **auto-follow-up loop has never run end-to-end live** — that's the main thing
to confirm here. The scheduler (`scheduler/index.js`) loads its own creds, so it
can fetch; the store/routing/backoff are unit-tested.

## Prerequisites — credentials & scopes (AGENTS.md rule #7)

Creds live in `~/.claude/spmc.env` (`KEY` for the default account, `KEY__ACCOUNT`
for a named one). Insights need **read scopes** beyond publishing:

| Platform | Token | Scopes needed for insights |
|----------|-------|----------------------------|
| Instagram | `INSTAGRAM_ACCESS_TOKEN` (IG Business/Creator via the Graph API) | `instagram_basic`, `instagram_manage_insights` |
| Facebook  | `FACEBOOK_ACCESS_TOKEN` (Page token) | `read_insights` (plus the Page being admin'd) |
| Threads   | `THREADS_ACCESS_TOKEN` | `threads_basic`, `threads_manage_insights` |

`config_doctor` reports credential **presence**, not validity/scopes — use the
steps below to confirm the token actually works for insights.

## Part A — one-shot fetch (fastest, read-only, no new post)

1. Find a real published post id from the audit log:
   ```
   audit_log(status: "published")        # the post_id column is the id to use
   ```
   (IG/FB posts from the BETA-010 live test are in there.)
2. Fetch metrics:
   ```
   analytics_fetch(platform: "instagram", post_id: "<id>")     # or facebook / threads
   ```
   Expect a metrics object back (e.g. `reach`, `likes`, …).
3. Confirm the snapshot was stored:
   ```
   analytics_report(platform: "instagram")
   ```

## Part B — auto-follow-up loop without the 24h wait

The follow-up delay is read at **publish time** from `SPMC_ANALYTICS_DELAY_MS`
(`followups.js`); `0` makes the job immediately due. The scheduler ticks on
startup and every 60s.

1. Launch the server **+ scheduler** with the delay zeroed (so both the
   publishing process and the spawned scheduler inherit it):
   ```
   # PowerShell
   $env:SPMC_ANALYTICS_DELAY_MS = "0"; spmc-start
   ```
2. Publish a real post to an analytics-capable platform (IG/FB/Threads) through
   the server — **confirm content with the user first** (no un-publish).
3. Within ~60s the scheduler drains the now-due follow-up. Watch:
   ```
   ~/.claude/spmc-scheduler.log     # → "analytics follow-ups: 1 fetched, ..."
   ```
4. Confirm the snapshot landed:
   ```
   analytics_report(post_id: "<the published id>")
   ```
5. Unset the override afterwards so normal runs keep the real 24h delay.

## Troubleshooting

- **`... insights NNN: (#100) ... invalid metric ...`** — a metric name drifted.
  The error text names the offending metric; edit that platform's set in
  `adapters/{instagram,facebook,threads}.js` (`getMetrics`, the `metrics`
  string), then re-run. Metric names are centralized there, one line per platform.
- **`400 / OAuth ... token`** — expired/under-scoped token. Refresh it in
  `~/.claude/spmc.env` and confirm the scope table above.
- **Empty / partial metrics object** — some metrics don't apply to every media
  type (e.g. video-only metrics on an image). The fetch still succeeds; the
  snapshot just omits the inapplicable keys.
- **Follow-up never drains** — confirm `spmc-start` (not plain `spmc`) is running;
  only `start.js` launches the scheduler. `run.js`/`spmc` schedules the job but
  won't drain it.

## After verification

Update `adapters/*.js` if any metric drifted, flip the table above to ✅, refresh
the status block in `lib/analytics.js`, and record it in `PROJECT_STATUS.md`.
Accrued multi-snapshot history (for INDIV-007 `observedWindows`) still needs real
posts measured over real time — it can't be shortcut here.
