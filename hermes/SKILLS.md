# SPMC Skill Triggers — Hermes

> Trigger → tool mapping. One section per platform. All tools are on the `spmc` MCP server.

---

## X (Twitter)

| Trigger phrase | Tool | Required inputs |
|---------------|------|----------------|
| "post to X", "tweet this", "publish to Twitter" | `x_post_tweet` | `text` ≤280 chars |
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
| "post to Threads", "publish on Threads" | `threads_post` | `text` ≤500 chars |
| "post photo to Threads" | `threads_post` | `text`, `image_url` (public) |
| "schedule for Threads", "queue Threads" | `queue_add` | `platform:"threads"`, `content:{text,image_url?}`, `scheduled_at?` |

---

## Bluesky

| Trigger phrase | Tool | Required inputs |
|---------------|------|----------------|
| "post to Bluesky", "publish on Bluesky" | `bluesky_post` | `text` ≤300 graphemes |
| "schedule for Bluesky", "queue Bluesky" | `queue_add` | `platform:"bluesky"`, `content:{text}`, `scheduled_at?` |

---

## Queue Management

| Trigger phrase | Tool | Key inputs |
|---------------|------|------------|
| "show my queue", "what's queued" | `queue_list` | `status?`, `platform?` |
| "add to queue" | `queue_add` | `platform`, `content`, `scheduled_at?` |
| "dispatch this post", "publish now from queue" | `queue_dispatch` | `id` |
| "update queue item", "reschedule" | `queue_update` | `id`, `updates` |
| "remove from queue", "cancel queued post" | `queue_remove` | `id` |

Queue item ID format: `q_<timestamp>_<5-char-random>`

Status lifecycle: `pending` → `dispatched` → `published` | `failed`

`queue_dispatch` handles status transitions automatically. Manual `queue_update` is only needed if you published via a direct tool and want to mark the corresponding queue item.

---

## Multi-Platform Campaign

Trigger: "post everywhere", "cross-post this", "publish to all platforms"

1. `queue_add` for each platform with same `scheduled_at` (or immediate)
2. Confirm all queue items with user before dispatching
3. `queue_dispatch` each in order: x → instagram → tiktok → facebook → threads → bluesky
4. Report results per platform (see CONTEXT.md for what each platform returns)
