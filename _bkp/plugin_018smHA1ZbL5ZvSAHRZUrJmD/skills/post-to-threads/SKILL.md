---
name: post-to-threads
description: >
  This skill should be used when the user says "post to Threads", "publish
  this thread post", "share this on Threads", or asks to publish text or
  image content to Threads. Uses the social-publisher MCP server and Meta's
  Threads API — structurally similar to Instagram's container/publish flow,
  but on a different host (graph.threads.net) with its own access token.
metadata:
  version: "0.1.0"
---

## Posting to Threads

Use `threads_post` from the `social-publisher` MCP server.

### Requirements

1. **Post text** (max ~500 characters).
2. Optionally, a **publicly accessible image URL** for an image post.
3. `THREADS_USER_ID` and `THREADS_ACCESS_TOKEN` (scopes: `threads_basic`, `threads_content_publish`) set in the environment — obtained via Meta's Threads API app setup, **separate** from the Instagram/Facebook app credentials. Short-lived tokens need exchanging for a 60-day long-lived token (same refresh discipline as Instagram).

### How this resembles (and differs from) Instagram

The publish flow is the same two-step shape we already debugged for Instagram — create a container, then publish it by ID — which is why `threadsPost()` will look familiar if you've read `instagramPost()`. The differences that matter:
- Different host: `graph.threads.net`, not `graph.facebook.com`.
- Different token/app: Threads has its own access-token flow and scopes — the Instagram `EAA…` token will NOT work here.
- No Facebook Page linkage requirement (a relief, given what that cost us on Instagram).

### Posting

```
threads_post(text: "<post text>")
threads_post(text: "<post text>", image_url: "<public image URL>")
```

### After posting

Confirm to the user: platform, post ID, and that it's live on their Threads profile. Update the content queue status if one exists.

### Common errors

- `190` — Invalid/expired/wrong-scope token. Threads tokens need their own refresh cycle — don't confuse them with Instagram's.
- Rate limiting — profiles are capped around 250 posts/24h; space out batch posting.
- Container creation failing on `image_url` — same signed-URL-expiry trap as Instagram/Canva exports; re-export immediately before posting.
