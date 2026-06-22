---
name: post-to-threads
description: >
  Use when the user says "post to Threads", "publish on Threads", or asks to share
  content on Threads. Uses the Threads API (graph.threads.net) with its own token.
metadata:
  version: "0.3.0"
  mcp_server: spmc
---

## Posting to Threads

Use `{{tool:threads_post}}` from the `spmc` MCP server.

### Craft a strong post (Threads-native)

- **Replies drive distribution.** End with a genuine question or an opening that invites a response — Threads surfaces posts that spark conversation.
- **Front-load the hook.** The {{limit:threads.text.max}}-char cap rewards tightness; say the interesting thing first.
- **Conversational register** — closer to Bluesky than to a brand feed. 1–3 topic hashtags max.
- **Attach an image when it adds** — image posts earn more dwell time.

> Weak: "New episode is out now, go listen!" → Strong: "Most 'productivity' advice is procrastination with extra steps. What actually moved the needle for you?"

Before drafting, pull the brand kit with `brand_voice(action:"get")` and match its tone, audience, emoji policy, and banned words. See the `content-intelligence` skill.

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

Max {{limit:threads.text.max}} characters for text. On image posts, add **`alt_text`** — an accessibility description of the image — by default.

```
threads_post(text, image_url, alt_text: "<description>")
```

### Preview before posting (optional)

- `threads_post(text, image_url?, dry_run: true)` — validate and preview without sending.
- `content_validate(platform: "threads", content: { text, image_url? })` — checks the {{limit:threads.text.max}}-char limit before posting. See the `content-intelligence` skill.

### After posting

Confirm: platform, post ID. Update queue status if applicable.

### Common errors

- `190` — Token expired. Re-authorize via Threads OAuth flow.
- Container creation may fail if the image URL is not publicly accessible.
