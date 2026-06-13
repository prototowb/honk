---
name: post-to-facebook
description: >
  This skill should be used when the user says "post to Facebook", "publish
  this to my Page", "share this on Facebook", or asks to publish text or
  image content to a Facebook Page. Uses the social-publisher MCP server and
  the Meta Graph API — the same Page-linked setup that powers Instagram
  posting in this plugin, so no separate app/account dance is required.
metadata:
  version: "0.1.0"
---

## Posting to Facebook

Use `facebook_post` from the `social-publisher` MCP server.

### Requirements

1. A **message/caption** (text).
2. Optionally, a **publicly accessible image URL** — when provided, the post goes out as a photo with this text as its caption; without one, it's a plain text feed post.
3. `FACEBOOK_PAGE_ID` and `FACEBOOK_ACCESS_TOKEN` set in the environment.

### The good news — you've already done the hard part

This plugin's Instagram setup requires the IG Business Account to be linked to a Facebook Page (see the README's Instagram gotchas). That same linkage means **the same system-user EAA token already covers Facebook Page posting** — just add the `pages_manage_posts` scope alongside the existing `pages_show_list` / `pages_read_engagement` / `instagram_*` scopes, and you can reuse it (or generate a fresh one with that scope added) as `FACEBOOK_ACCESS_TOKEN`. `FACEBOOK_PAGE_ID` is the Facebook Page ID — the ~14-15 digit one that you specifically must NOT use for `INSTAGRAM_USER_ID` (see the three-IDs gotcha table). Here, finally, is where that ID belongs.

### Posting

```
facebook_post(message: "<post text>")
facebook_post(message: "<caption>", image_url: "<public image URL>")
```

### After posting

Confirm to the user: platform, post ID, and that it's now live on the Page. Update the content queue status if one exists.

### Common errors

- `190` — Invalid/expired access token, or token lacks `pages_manage_posts`. Regenerate with the right scope.
- `200` / permissions errors — Check "Zuweisungen verwalten" (Manage assignments) for the Page asset, same as the Instagram permission check in the README.
- Posting as a photo (`image_url` set) but getting an "object does not exist" style error — double check `FACEBOOK_PAGE_ID` isn't accidentally the Instagram Business Account ID (the inverse of the IG gotcha).
