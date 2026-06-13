---
name: manage-queue
description: >
  Use when the user says "add to queue", "schedule a post", "show my queue",
  "what's queued", "dispatch this post", "publish queued item", or asks to manage
  the SPMC content queue. The queue is file-backed and persists between sessions.
  The scheduler (spmc-server/scheduler/index.js) auto-dispatches items when their
  scheduled_at time arrives — run it as a background process alongside the MCP server.
metadata:
  version: "0.2.0"
  mcp_server: spmc
---

## Managing the Content Queue

Use queue tools from the `spmc` MCP server. All tools work without platform credentials
(only `queue_dispatch` requires them, at publish time).

### Adding to queue

```
queue_add(
  platform: "x" | "instagram" | "tiktok" | "facebook" | "threads" | "bluesky",
  content: { /* same fields as the direct posting tool */ },
  scheduled_at: "2026-06-11T09:00:00Z",  // optional ISO 8601
  account: "brand"                        // optional — omit for default account
)
```

Examples by platform:
- X tweet: `content: { text: "hello world" }`
- X thread: `content: { tweets: ["1/2 first", "2/2 second"] }`
- Instagram: `content: { image_url: "https://...", caption: "caption #tag" }`
- Facebook: `content: { message: "text", image_url?: "..." }`
- Threads: `content: { text: "text", image_url?: "..." }`
- Bluesky: `content: { text: "text" }`
- TikTok: `content: { video_url: "https://...", caption: "caption", privacy_level?: "SELF_ONLY" }`

### Viewing the queue

```
queue_list()                            // all items
queue_list(status: "pending")           // filter by status
queue_list(platform: "x")              // filter by platform
```

Statuses: `pending` → `dispatched` → `published` | `failed`

### Updating a queued item

```
queue_update(id: "q_...", updates: { content: { text: "updated text" } })
queue_update(id: "q_...", updates: { scheduled_at: "2026-06-12T10:00:00Z" })
```

### Removing from queue

```
queue_remove(id: "q_...")
```

### Publishing immediately

```
queue_dispatch(id: "q_...")
```

Dispatches now regardless of `scheduled_at`. Updates status to `published` on success, `failed` on error.
