---
name: post-to-bluesky
description: >
  Use when the user says "post to Bluesky", "skeet this", or asks to publish text to
  Bluesky. No OAuth — just an app password. Simplest setup of any platform.
metadata:
  version: "0.2.0"
  mcp_server: spmc
---

## Posting to Bluesky

Use `bluesky_post` from the `spmc` MCP server.

### Setup — refreshingly simple

1. Go to https://bsky.app/settings/app-passwords and generate an app password.
2. **Use the app password, never your real account password.**
3. Set `BLUESKY_IDENTIFIER` (handle or email) and `BLUESKY_APP_PASSWORD` in env. Done.

No developer app, no OAuth, no review queue.

### Posting

```
bluesky_post(text: "<post text>")
```

Max 300 graphemes (not characters — emoji/multi-byte differ).

### After posting

Confirm: platform, post URI, direct link. Update queue status if applicable.

### Common errors

- `401` on auth — Wrong identifier format or revoked app password. Regenerate.
- Rate limiting — 5,000 points/hour (~3 points/post). Effectively a non-issue.
