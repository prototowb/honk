---
name: post-to-threads
description: >
  Use when the user says "post to Threads", "publish on Threads", or asks to share
  content on Threads. Uses the Threads API (graph.threads.net) with its own token.
metadata:
  version: "0.2.0"
  mcp_server: spmc
---

## Posting to Threads

Use `threads_post` from the `spmc` MCP server.

### Requirements

- `THREADS_USER_ID` and `THREADS_ACCESS_TOKEN` with `threads_basic` + `threads_content_publish` scopes.
- Threads API uses `graph.threads.net` — separate from Instagram even though it shares Meta infrastructure.

### Posting

Text post:
```
threads_post(text: "<post text>")
```

Image post:
```
threads_post(text: "<post text>", image_url: "<public image URL>")
```

Max 500 characters for text.

### Preview before posting (optional)

- `threads_post(text, image_url?, dry_run: true)` — validate and preview without sending.
- `content_validate(platform: "threads", content: { text, image_url? })` — checks the 500-char limit before posting. See the `content-intelligence` skill.

### After posting

Confirm: platform, post ID. Update queue status if applicable.

### Common errors

- `190` — Token expired. Re-authorize via Threads OAuth flow.
- Container creation may fail if the image URL is not publicly accessible.
