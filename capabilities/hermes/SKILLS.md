# SPMC Skill Triggers — Hermes

> Trigger → tool mapping. One section per platform. All tools are on the `spmc` MCP server.

---

## X (Twitter)

| Trigger phrase | Tool | Required inputs |
|---------------|------|----------------|
| "post to X", "tweet this", "publish to Twitter" | `x_post_tweet` | `text` ≤{{limit:x.text.max}} {{unit:x.text}} |
| "post a thread", "tweet thread" | `x_post_thread` | `tweets: [...]` ordered array |
| "schedule a tweet", "queue for X" | `queue_add` | `platform:"x"`, `content:{text}`, `scheduled_at?` |

Pre-call: count chars (URLs = 23, emoji > U+FFFF = 2). Do not truncate silently.

---

## Instagram

| Trigger phrase | Tool | Required inputs |
|---------------|------|----------------|
| "post to Instagram", "post this photo" | `instagram_post` | `image_url` (public), `caption` |
| "schedule for Instagram", "queue Instagram" | `queue_add` | `platform:"instagram"`, `content:{image_url,caption}`, `scheduled_at?` |

Pre-call: confirm `image_url` is publicly accessible.

---

## TikTok

| Trigger phrase | Tool | Required inputs |
|---------------|------|----------------|
| "post to TikTok", "upload this video" | `tiktok_post_video` | `video_url` (public), `caption` |
| "check TikTok status" | `tiktok_check_publish_status` | `publish_id` |
| "schedule for TikTok", "queue TikTok" | `queue_add` | `platform:"tiktok"`, `content:{video_url,caption,privacy_level?}`, `scheduled_at?` |

Post-call: `tiktok_post_video` is async — always follow up with `tiktok_check_publish_status`. Unaudited apps = `SELF_ONLY` regardless of `privacy_level`.

---

## Facebook

| Trigger phrase | Tool | Required inputs |
|---------------|------|----------------|
| "post to Facebook", "publish to my page" | `facebook_post` | `message` |
| "post photo to Facebook" | `facebook_post` | `message`, `image_url` (public) |
| "schedule for Facebook", "queue Facebook" | `queue_add` | `platform:"facebook"`, `content:{message,image_url?}`, `scheduled_at?` |

---

## Threads

| Trigger phrase | Tool | Required inputs |
|---------------|------|----------------|
| "post to Threads", "publish on Threads" | `threads_post` | `text` ≤{{limit:threads.text.max}} {{unit:threads.text}} |
| "post photo to Threads" | `threads_post` | `text`, `image_url` (public) |
| "schedule for Threads", "queue Threads" | `queue_add` | `platform:"threads"`, `content:{text,image_url?}`, `scheduled_at?` |

---

## Bluesky

| Trigger phrase | Tool | Required inputs |
|---------------|------|----------------|
| "post to Bluesky", "publish on Bluesky" | `bluesky_post` | `text` ≤{{limit:bluesky.text.max}} {{unit:bluesky.text}} |
| "schedule for Bluesky", "queue Bluesky" | `queue_add` | `platform:"bluesky"`, `content:{text}`, `scheduled_at?` |

---

## Content Intelligence (credential-free)

| Trigger phrase | Tool | Key inputs |
|---------------|------|------------|
| "validate this post", "will this pass", "check it fits" | `content_validate` | `platform`, `content` |
| "preview without posting", "dry run", "rehearse the post" | any publish tool **or** `queue_dispatch` with `dry_run: true` | + `dry_run: true` |
| "adapt this for all platforms", "fit this everywhere", "make X/Bluesky versions" | `content_adapt` | `text`, `platforms?` |
| "is my setup ready", "which platforms are configured", "check credentials" | `config_doctor` | — |
| "show the audit log", "what did we publish", "what failed" | `audit_log` | `platform?`, `status?`, `source?`, `limit?` |
| "check this schedule time", "normalize this timestamp" | `schedule_check` | `scheduled_at` |

`content_adapt` returns ready-to-post `content` per platform but does only length-fitting (thread-split, grapheme truncation). Rewrite tone/hashtags yourself, then `content_validate` or `dry_run` before publishing.

---

## Observability (UNVERIFIED — pending live credential testing)

| Trigger phrase | Tool | Key inputs |
|---------------|------|------------|
| "are we rate limited", "show 429s" | `rate_limits` | — |
| "fetch analytics", "how did this post do" | `analytics_fetch` | `platform` (ig/fb/threads), `post_id` |
| "show engagement", "analytics report" | `analytics_report` | `platform?`, `post_id?`, `limit?` |

---

## Queue Management

| Trigger phrase | Tool | Key inputs |
|---------------|------|------------|
| "show my queue", "what's queued" | `queue_list` | `status?`, `platform?` |
| "add to queue" | `queue_add` | `platform`, `content`, `scheduled_at?` |
| "dispatch this post", "publish now from queue" | `queue_dispatch` | `id`, `dry_run?` |
| "preview a queued item" | `queue_dispatch` | `id`, `dry_run: true` |
| "update queue item", "reschedule" | `queue_update` | `id`, `updates` |
| "remove from queue", "cancel queued post" | `queue_remove` | `id` |

Queue item ID format: `q_<timestamp>_<5-char-random>`

Status lifecycle: `pending` → `dispatched` → `published` | `failed`

`queue_dispatch` handles status transitions automatically. Manual `queue_update` is only needed if you published via a direct tool and want to mark the corresponding queue item.

---

## Multi-Platform Campaign

Trigger: "post everywhere", "cross-post this", "publish to all platforms"

1. `content_adapt(text, platforms)` to get a per-platform draft fitted to each limit (auto X thread-split, Bluesky truncation). Rewrite tone/hashtags per channel.
2. `queue_add` for each platform with same `scheduled_at` (or immediate). Each is content-validated on add.
3. Confirm all queue items with user before dispatching. Optionally `queue_dispatch(id, dry_run: true)` to preview each.
4. `queue_dispatch` each in order: x → instagram → tiktok → facebook → threads → bluesky
5. Report results per platform (see CONTEXT.md for what each platform returns). `audit_log` is the durable record.
