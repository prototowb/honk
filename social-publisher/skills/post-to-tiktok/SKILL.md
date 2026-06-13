---
name: post-to-tiktok
description: >
  This skill should be used when the user says "post to TikTok", "publish
  this video to TikTok", "share this on TikTok", or asks to publish video
  content to TikTok. Uses the social-publisher MCP server and the TikTok
  Content Posting API. Note: TikTok requires a publicly accessible video URL
  — local files and image-only posts are not supported by this flow — and
  unaudited apps can only publish privately (self-only viewing).
metadata:
  version: "0.1.0"
---

## Posting to TikTok

Use `tiktok_post_video` (and `tiktok_check_publish_status` to follow up) from the `social-publisher` MCP server.

### Requirements

The TikTok Content Posting API requires:
1. A **publicly accessible video URL** (mp4/mov/webm, 3–600 seconds, max 4GB, 9:16 recommended). The server pulls it directly via `PULL_FROM_URL` — no local file upload support in this flow.
2. A **caption/title** (text + hashtags).
3. A `TIKTOK_ACCESS_TOKEN` with the `video.publish` scope, obtained through TikTok's OAuth user-authorization flow (this is a one-time setup step the user has to complete themselves — see the plugin README's TikTok setup section).

If the user provides a local video file, no video at all, or only an image, tell them clearly:
> "TikTok posting needs a public video URL — images alone won't work here (that's an Instagram thing). Host the video somewhere public (your own CDN, Cloudinary, etc.) and share the direct URL."

### Posting

```
tiktok_post_video(video_url: "<public video URL>", caption: "<caption with hashtags>", privacy_level: "SELF_ONLY")
```

Posting is asynchronous — the call returns a `publish_id`, not a final confirmation. Follow up with:

```
tiktok_check_publish_status(publish_id: "<id from the post call>")
```

to confirm it actually processed and went live (or to surface a `fail_reason` if it didn't).

### The audit gotcha — set expectations up front

**Until the user's TikTok Developer app passes TikTok's content-posting audit, every post lands as private/self-only — no matter what `privacy_level` is requested.** This isn't a bug in the call; it's TikTok's sandboxing for unaudited clients. Tell the user this *before* they're surprised their post isn't publicly visible:
> "Heads up — until your TikTok app is audited, this'll post as private/visible-only-to-you. That's TikTok's policy for unaudited apps, not something we can configure around. Once the audit's done, public posting opens up."

### Caption formatting

- Title/caption length limits are shorter and stricter than Instagram's — keep it tight, hashtags included.
- Front-load the hook; TikTok captions truncate aggressively in-feed.

### After posting

Confirm to the user: platform, `publish_id`, current status (check it!), and the private/self-only caveat if the app is unaudited. Update the content queue status if one exists.

### Common errors

- `401` — Token missing/expired/wrong scope. The user's `TIKTOK_ACCESS_TOKEN` needs `video.publish` scope; tokens also expire and need refreshing via the OAuth refresh-token flow.
- `spam_risk_too_many_posts` / rate-limit errors — Daily cap is 25 videos/account; each access token is also limited to ~6 requests/minute.
- `url_ownership_unverified` (or similar PULL_FROM_URL errors) — TikTok may require the video's hosting domain to be verified for your app before it'll fetch from it. If this comes up, the user needs to add/verify that domain in their TikTok Developer app settings.
