# INBOX-001 — Comment-keyword → file/link to inbox (plan)

> Status: **plan only**, not built. "Comment `GUIDE` and I'll DM you the PDF" —
> when someone comments a configured keyword on a post, auto-deliver a file or link
> to them. The value of this plan is in the **gates**, not the tool sketch: two
> external dependencies decide whether (and how) this ships.

## The two gates (decide these first)

### Gate 1 — Comment ingestion: webhook vs polling
How do we learn a new comment arrived?
- **Webhooks (push, real-time):** Meta Graph API can push `comments` events for a
  Page / IG account. **Blocker:** webhooks need a **public HTTPS callback URL**.
  Honk is a **local stdio MCP server** — it has no hosted web endpoint. Webhooks
  are off the table until Honk gains a hosted component (ties to the BETA-011 UI /
  any server deployment).
- **Polling (pull, scheduler-driven):** periodically `GET /{media-id}/comments`
  (IG) / `GET /{post-id}/comments` (FB), track seen comment IDs, match keywords.
  **Fits the current architecture** — it's another scheduler job, like the
  analytics follow-up. Cost: latency = poll interval, and it spends rate-limit
  budget per active post. **Recommended path** until a hosted endpoint exists.

### Gate 2 — Delivery: DM is permission-gated; public reply is not
Sending a **DM** to the commenter (the "inbox") is the hard part:
- **IG/FB messaging** (`/me/messages`, comment-triggered "private replies") needs
  `instagram_manage_messages` / `pages_messaging`, a **Business account**, **Meta
  App Review**, business verification, and compliance with messaging policy (reply
  window, opt-in expectations, anti-spam). Comment→DM automation is *permitted*
  via private replies but **only within a limited window** and subject to policy —
  abuse risks account flags.
- **Public reply** to the comment with the link needs **none of that** — it reuses
  the comments edge we already shipped for first-comment (ALPHA-015). Less private,
  but feasible **today**.

**Consequence:** the feature splits cleanly into a *now* tier (public reply, no app
review) and a *gated* tier (DM, after app review). Don't block the whole feature on
Meta App Review.

## Phased plan

- **Phase 0 — keyword → public reply (feasible now).** Scheduler polls active
  rules' posts, matches keywords in new comments, and **replies publicly** with the
  link via the existing comments edge. Delivers the core loop with zero new
  permissions. Idempotent per (commenter, comment, rule).
- **Phase 1 — DM delivery (gated on App Review).** Same rule engine; swap the
  delivery step to an IG/FB **private reply** (`/{comment-id}/private_replies` or
  `/me/messages` with `recipient:{comment_id}`) once permissions land. Falls back to
  public reply when DM isn't available.
- **Phase 2 — files.** A "file" = a hosted link. Reuse the media pipeline
  (`media_upload` → Cloudinary/imgbb) to host the asset, then deliver its URL. True
  DM file *attachments* are separately gated — link-to-hosted-file first.
- **Phase 3 — webhooks.** If/when Honk has a hosted component, swap polling for
  webhooks for real-time + scale. Rule engine unchanged.

## Sketch (Phase 0)

**Data model** — file-backed store (`data/inbox.json`), mirroring the queue/brand pattern:
```
rule = {
  id, platform: "instagram"|"facebook", account,
  post_id | "any",              // a specific media/post, or all of the account's posts
  keywords: ["GUIDE", "PDF"],   // case-insensitive, word-boundary match
  response: { type: "link"|"file", payload: "<url>", message?: "<text>" },
  options: { once_per_user: true, also_public_reply: true },
  active: true, created_at, seen_comment_ids: [...]
}
delivery_log = { ts, rule_id, platform, comment_id, commenter_id, status, error? }
```

**Tools** — `inbox_rule_add` / `inbox_rule_list` / `inbox_rule_update` /
`inbox_rule_remove`, plus `inbox_log` (who got what). Credential-free config;
delivery uses the platform adapters.

**Scheduler** — a new job type alongside the analytics follow-up: for each active
rule, poll its post(s)' comments since the last seen ID, match keywords, deliver,
record. Back-off + rate-limit aware (reuse `lib/ratelimit.js`); errors logged, never
fatal — same best-effort discipline as the first-comment path.

**Adapters** — add `listComments(mediaOrPostId, since)` and (Phase 1)
`privateReply(commentId, message)` to the IG/FB adapters; Phase 0 reuses the
existing `comment()` (public reply).

## Constraints & risks
- **Threads/X/Bluesky:** no comparable comment-ingestion + DM story right now —
  IG/FB only for v1.
- **Rate limits:** polling N posts every interval consumes Graph API budget; cap
  active rules / widen the interval; surface usage via `rate_limits`.
- **Policy:** automated DMs must respect Meta's messaging policy (window, opt-in,
  no spam). Public replies are safer but visible to everyone.
- **Latency:** polling means delivery is delayed by up to one poll interval — fine
  for "comment for the link," not for real-time.

## Open decisions for the user
1. **Start at Phase 0 (public reply, ships now)** or hold for DM (Phase 1, needs
   Meta App Review)?
2. **Platforms:** IG only, or IG + FB?
3. **File handling:** link-to-hosted-file (reuse `media_upload`) acceptable, or is a
   true DM attachment required (separately gated)?
4. **Poll interval / max active rules** — the rate-limit budget.
