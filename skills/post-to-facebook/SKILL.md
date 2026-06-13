---
name: post-to-facebook
description: >
  Use when the user says "post to Facebook", "publish to my Facebook Page", or asks to
  publish content to a Facebook Page feed. Uses the same Meta Graph API token as Instagram.
metadata:
  version: "0.2.0"
  mcp_server: spmc
---

## Posting to Facebook

Use `facebook_post` from the `spmc` MCP server.

### Requirements

- `FACEBOOK_PAGE_ID` and `FACEBOOK_ACCESS_TOKEN` with `pages_manage_posts` scope.
- The same EAA token used for Instagram works here if it has `pages_manage_posts`.

### Posting

Text post:
```
facebook_post(message: "<post text>")
```

Photo post (image with caption):
```
facebook_post(message: "<caption>", image_url: "<public image URL>")
```

### After posting

Confirm: platform, post ID. Update queue status if applicable.

### Common errors

- `190` — Token expired. Regenerate via Meta Business Suite.
- `200` — Permissions missing. Token needs `pages_manage_posts`.
- `368` — Temporarily blocked. Wait and retry.
