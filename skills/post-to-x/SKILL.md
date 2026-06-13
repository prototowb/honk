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

Use `x_post_tweet` when content fits one tweet (≤280 chars).

Before calling:
- Count characters. URLs count as 23 chars regardless of length. Emojis > U+FFFF count as 2.
- If over 280 chars, ask the user to trim or split into a thread. Never silently truncate.

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

### After posting

Confirm: platform, post type, URL, timestamp. Update queue item status if one exists.
