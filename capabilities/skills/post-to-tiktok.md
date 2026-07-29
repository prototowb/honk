---
name: post-to-tiktok
description: >
  Use when the user says "post to TikTok", "publish this video to TikTok", or asks to
  publish video content to TikTok. Requires a publicly accessible video URL.
  Unaudited apps post as private/self-only regardless of privacy_level.
metadata:
  version: "0.3.0"
  mcp_server: honk
---

## Posting to TikTok

Use `{{tool:tiktok_post_video}}` from the `honk` MCP server. Follow up with `{{tool:tiktok_check_publish_status}}`.

### Craft a strong post (TikTok-native)

- **The caption is a hook, not a description.** First line should create curiosity or stakes — the video carries the rest.
- **3–5 specific hashtags** (one broad + a few niche) help categorization; skip generic #fyp spam.
- **The video's first 2 seconds decide retention.** If you're advising on the video itself, push the user to open on the payoff, not a slow intro.

> Weak caption: "Our app helps you save time ✨" → Strong: "POV: you automated the thing your boss still does by hand 👀"

Draft against the `content-craft` fundamentals first — engagement philosophy, the hook→context→payoff→CTA structure, and accessible sourcing apply to every post (TikTok captions can't carry clickable links — name the source in the caption or on-screen and point to bio). Then pull the brand kit with `brand_voice(action:"get", platform:"tiktok")` — the voice resolved for TikTok, with any per-platform deltas already applied — and match its tone, audience, and hashtag sets. Honor its `policy` too — never write about banned topics, include required disclosures, and publish a paid post with `sponsored: true`. See the `content-intelligence` skill.

### What the algorithm rewards

*(Platform mechanics as of 2026-07, not copy — durable, widely-observed
patterns, not live-verified against TikTok's current ranking system. Treat as
a strong prior, not a guarantee; revisit if TikTok publicly changes course.)*

- **The opening 1–3 seconds dominate distribution** — average watch time and
  completion rate drive reach far more than the caption does. A slow intro
  loses the video before the caption is ever read.
- **A rewatch is a strong positive signal** — content that rewards a second
  look (a twist, a detail easy to miss) tends to outperform content that's
  fully understood in one pass.
- **Honk publishes the raw video only.** Trending-sound selection and
  burned-in on-screen captions happen before upload, outside this tool — if
  the source video already carries a trending sound, that's preserved as-is,
  but Honk can't add or change one.

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
