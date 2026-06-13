---
name: post-to-x
description: >
  This skill should be used when the user says "post to X", "tweet this",
  "post this thread", "publish to Twitter", "send this to X", or asks to
  schedule or publish any content to X (Twitter). Handles both single tweets
  and multi-tweet threads using the social-publisher MCP server.
metadata:
  version: "0.1.0"
---

## Posting to X (Twitter)

Use the `social-publisher` MCP tools to publish content. Choose the right tool based on what the user wants to post.

### Single tweet

Use `x_post_tweet` when the content is one tweet (≤280 chars).

Before calling the tool:
- Count characters. If over 280, ask the user to trim or split into a thread.
- Never silently truncate content.

```
x_post_tweet(text: "<tweet text>")
```

On success, report the tweet URL. On error, show the error message clearly.

### Thread

Use `x_post_thread` when content is a numbered thread (e.g. "1/5 ... 2/5 ...") or the user explicitly asks for a thread.

Pass tweets as an ordered array. Each item is one tweet. The server chains them automatically as replies.

```
x_post_thread(tweets: ["Tweet 1 text", "Tweet 2 text", ...])
```

On success, report the thread URL (first tweet). On error, show which tweet failed.

### Character counting rules

- Plain text: count as-is.
- URLs: Twitter counts every URL as 23 chars regardless of length.
- Emojis: most count as 1 char; some Unicode > U+FFFF count as 2.

### After posting

Confirm to the user: platform, post type (tweet / thread), URL, and timestamp. Update the content queue status if one exists.
