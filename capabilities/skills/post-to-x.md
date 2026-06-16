---
name: post-to-x
description: >
  Use when the user says "post to X", "tweet this", "post this thread",
  "publish to Twitter", or asks to schedule or publish any content to X (Twitter).
  Handles single tweets and multi-tweet threads via the spmc MCP server.
metadata:
  version: "0.2.0"
  mcp_server: spmc
---

## Posting to X (Twitter)

Use tools from the `spmc` MCP server.

### Single tweet

Use `x_post_tweet` when content fits one tweet (≤{{limit:x.text.max}} {{unit:x.text}}).

Before calling:
- Count characters. URLs count as 23 chars regardless of length. Emojis > U+FFFF count as 2.
- If over {{limit:x.text.max}} {{unit:x.text}}, ask the user to trim or split into a thread. Never silently truncate.

```
x_post_tweet(text: "<tweet text>")
```

On success, report the tweet URL. On error, show the error message.

### Thread

Use `x_post_thread` when the content is a numbered thread or the user asks for one.

```
x_post_thread(tweets: ["Tweet 1 text", "Tweet 2 text", ...])
```

On success, report the first tweet URL. On error, show which tweet failed.

### Preview before posting (optional)

- `x_post_tweet(text, dry_run: true)` / `x_post_thread(tweets, dry_run: true)` — validate and preview without sending.
- `content_validate(platform: "x", content: { text })` (or `{ tweets }`) — check limits without posting.
- Long single post? `content_adapt(text, ["x"])` auto-splits it into an in-limit thread. See the `content-intelligence` skill.

### After posting

Confirm: platform, post type, URL, timestamp. Update queue item status if one exists.
