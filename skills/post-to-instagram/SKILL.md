---
name: post-to-instagram
description: >
  Use when the user says "post to Instagram", "publish this to IG", "share this on
  Instagram", or asks to publish image content to Instagram. Requires a public image URL.
metadata:
  version: "0.2.0"
  mcp_server: spmc
---

## Posting to Instagram

Use `instagram_post` from the `spmc` MCP server.

### Requirements

1. A **publicly accessible image URL** — not a local file, not a private URL.
2. A **caption** (text + hashtags, max 2,200 chars).

If the user provides a local file or no image, tell them:
> "Instagram requires a public image URL. Upload to Imgur, Cloudinary, or your CDN and share the direct URL."

### Posting

```
instagram_post(image_url: "<public URL>", caption: "<caption>")
```

### Caption tips

- Keep the hook in the first 125 chars (truncated in feed preview).
- Hashtags at the end or in the first comment.

### Preview before posting (optional)

- `instagram_post(image_url, caption, dry_run: true)` — validate and preview without sending.
- `content_validate(platform: "instagram", content: { image_url, caption })` — confirms the image URL and caption length before posting. See the `content-intelligence` skill.

### After posting

Confirm: platform, media ID, note it'll appear in the feed. Update queue status if applicable.

### Common errors

- `190` — Invalid/expired token. User must refresh their Instagram access token.
- `368` — Account temporarily blocked. Wait and retry.
- `9007` — Daily limit reached (25 posts/day).
