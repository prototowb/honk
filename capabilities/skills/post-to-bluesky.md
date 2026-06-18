---
name: post-to-bluesky
description: >
  Use when the user says "post to Bluesky", "skeet this", or asks to publish text to
  Bluesky. No OAuth — just an app password. Simplest setup of any platform.
metadata:
  version: "0.3.0"
  mcp_server: spmc
---

## Posting to Bluesky

Use `{{tool:bluesky_post}}` from the `spmc` MCP server.

### Craft a strong post (Bluesky-native)

- **Conversational, low-polish.** Bluesky rewards authentic voice over marketing copy — there's no engagement-bait boost, so lead with substance.
- **Links count toward the {{limit:bluesky.text.max}}-grapheme budget** (not auto-shortened). A URL with OpenGraph tags renders a rich card, so the bare link can carry the visual weight.
- **Hashtags are clickable but optional** — 1–3 max; topic tags, not decoration.

> Weak: "Check out our latest blog post about productivity [link]" → Strong: "I deleted 40% of my standups and output went up. What I do instead:"

Before drafting, pull the brand kit with `brand_voice(action:"get")` and match its tone, audience, emoji policy, and banned words. See the `content-intelligence` skill.

### Setup — refreshingly simple

1. Go to https://bsky.app/settings/app-passwords and generate an app password.
2. **Use the app password, never your real account password.**
3. Set `BLUESKY_IDENTIFIER` (handle or email) and `BLUESKY_APP_PASSWORD` in env. Done.

No developer app, no OAuth, no review queue.

### Posting

```
bluesky_post(text: "<post text>")
```

Max {{limit:bluesky.text.max}} {{unit:bluesky.text}} (not characters — emoji/multi-byte differ).

### Preview before posting (optional)

- `bluesky_post(text, dry_run: true)` — validate and preview without sending.
- `content_validate(platform: "bluesky", content: { text })` — checks the {{limit:bluesky.text.max}}-**grapheme** limit (emoji-aware) before posting. See the `content-intelligence` skill.

### After posting

Confirm: platform, post URI, direct link. Update queue status if applicable.

### Common errors

- `401` on auth — Wrong identifier format or revoked app password. Regenerate.
- Rate limiting — 5,000 points/hour (~3 points/post). Effectively a non-issue.
