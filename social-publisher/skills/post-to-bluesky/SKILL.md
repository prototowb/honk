---
name: post-to-bluesky
description: >
  This skill should be used when the user says "post to Bluesky", "publish
  this on Bluesky", "skeet this", or asks to publish text content to
  Bluesky. Uses the social-publisher MCP server and the AT Protocol —
  by far the simplest setup of any platform in this plugin: free, no app
  review, no OAuth flow, just an app password.
metadata:
  version: "0.1.0"
---

## Posting to Bluesky

Use `bluesky_post` from the `social-publisher` MCP server.

### Requirements

1. **Post text** (max 300 graphemes — shorter than X's 280 *characters* but graphemes count differently for emoji/multi-byte text, so don't assume parity).
2. `BLUESKY_IDENTIFIER` (your handle, e.g. `yourname.bsky.social`, or the account email) and `BLUESKY_APP_PASSWORD` set in the environment.

### Setup — refreshingly simple

Unlike every other platform in this plugin, there's no developer app, no OAuth dance, no review queue, no Page-linkage puzzle:

1. Go to https://bsky.app/settings/app-passwords and generate an **app password**.
2. **Use the app password, never your real account password** — it's scoped and revocable, and that's the whole point.
3. Set `BLUESKY_IDENTIFIER` (handle or email) and `BLUESKY_APP_PASSWORD` in the env. Done.

The server authenticates per-call via `com.atproto.server.createSession` (returns a short-lived `accessJwt` + your `did`), then writes the post directly with `com.atproto.repo.createRecord`. No persistent token to babysit or refresh — the app password is the long-lived credential.

### Posting

```
bluesky_post(text: "<post text>")
```

### After posting

Confirm to the user: platform, post URI, and the direct profile/post link. Update the content queue status if one exists.

### Common errors

- `401` on `createSession` — wrong identifier format, or an app password that was revoked/mistyped. Regenerate if unsure.
- `Authentication Required` on `createRecord` — the session JWT expires quickly (a few minutes); this shouldn't surface in normal use since the server re-authenticates each call, but if you're chaining many posts in a tight loop, expect occasional re-auth overhead.
- Rate limiting — generous (5,000 points/hour, ~3 points per post) — basically a non-issue at this pipeline's volume.
