---
name: post-to-instagram
description: >
  This skill should be used when the user says "post to Instagram", "publish
  this to IG", "share this on Instagram", or asks to publish image content
  to Instagram. Uses the social-publisher MCP server and the Instagram Graph API.
  Note: Instagram requires a publicly accessible image URL — text-only posts
  are not supported by the API.
metadata:
  version: "0.1.0"
---

## Posting to Instagram

Use `instagram_post` from the `social-publisher` MCP server.

### Requirements

Instagram's Graph API requires:
1. A **publicly accessible image URL** (not a local file path, not a private URL).
2. A **caption** (text + hashtags).

If the user provides a local image file or no image at all, tell them clearly:
> "Instagram posting requires a public image URL. Please upload your image to an image host (e.g. Imgur, Cloudinary, or your own CDN) and share the direct URL."

Do not attempt to post without a valid public image URL.

### Posting

```
instagram_post(image_url: "<public image URL>", caption: "<caption with hashtags>")
```

The server handles the two-step Graph API flow (create container → publish) automatically.

### Caption formatting

- Max 2,200 characters.
- Hashtags go at the end of the caption or in the first comment (user preference).
- Keep the main message in the first 125 chars (truncated in feed preview).
- Emojis are supported and encouraged.

### After posting

Confirm to the user: platform, media ID, and note that the post will appear in their Instagram feed. Update the content queue status if one exists.

### Common errors

- `190` — Invalid or expired access token. User needs to refresh their Instagram access token.
- `368` — Account temporarily blocked from posting. Wait and retry later.
- `9007` — Daily post limit reached (25 posts/day for the Content Publishing API).
