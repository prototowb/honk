---
name: post-to-tiktok
description: >
  Use when the user says "post to TikTok", "publish this video to TikTok", or asks to
  publish video content to TikTok. Requires a publicly accessible video URL.
  Unaudited apps post as private/self-only regardless of privacy_level.
metadata:
  version: "0.3.0"
  mcp_server: spmc
---

## Posting to TikTok

Use `{{tool:tiktok_post_video}}` from the `spmc` MCP server. Follow up with `{{tool:tiktok_check_publish_status}}`.

### Craft a strong post (TikTok-native)

- **The caption is a hook, not a description.** First line should create curiosity or stakes — the video carries the rest.
- **3–5 specific hashtags** (one broad + a few niche) help categorization; skip generic #fyp spam.
- **The video's first 2 seconds decide retention.** If you're advising on the video itself, push the user to open on the payoff, not a slow intro.

> Weak caption: "Our app helps you save time ✨" → Strong: "POV: you automated the thing your boss still does by hand 👀"

Before drafting, pull the brand kit with `brand_voice(action:"get", platform:"tiktok")` — the voice resolved for TikTok, with any per-platform deltas already applied — and match its tone, audience, and hashtag sets. See the `content-intelligence` skill.

### Requirements

1. A **public video URL** (mp4/mov/webm, 3–600 seconds, max 4GB, 9:16 recommended).
2. A caption/title.
3. `TIKTOK_ACCESS_TOKEN` with `video.publish` scope.

If the user provides a local file or image-only: "TikTok needs a public video URL — no local files or images. Host it and share the direct URL."

### The audit caveat — tell them upfront

> "Until your TikTok app passes TikTok's content-posting audit, every post will be private/self-only. This is TikTok's policy for unaudited apps, not a config issue."

### Posting

```
tiktok_post_video(video_url: "<URL>", caption: "<caption>", privacy_level: "SELF_ONLY")
```

Then confirm it processed:

```
tiktok_check_publish_status(publish_id: "<id>")
```

### Preview before posting (optional)

- `tiktok_post_video(video_url, caption, dry_run: true)` — validate and preview without sending.
- `content_validate(platform: "tiktok", content: { video_url, caption })` — confirms a public video URL and caption before posting. See the `content-intelligence` skill.

### After posting

Confirm: platform, publish_id, current status, private/self-only caveat if unaudited.

### Common errors

- `401` — Token expired/wrong scope. Needs `video.publish` scope; refresh via OAuth.
- `spam_risk_too_many_posts` — Daily cap is 25 videos/account.
- `url_ownership_unverified` — Hosting domain needs verification in TikTok Developer settings.
