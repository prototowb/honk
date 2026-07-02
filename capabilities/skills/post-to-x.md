---
name: post-to-x
description: >
  Use when the user says "post to X", "tweet this", "post this thread",
  "publish to Twitter", or asks to schedule or publish any content to X (Twitter).
  Handles single tweets and multi-tweet threads via the honk MCP server.
metadata:
  version: "0.3.0"
  mcp_server: honk
---

## Posting to X (Twitter)

Use tools from the `honk` MCP server.

### Craft a strong post (X-native)

- **Hook first.** The first ~7 words decide whether anyone stops scrolling — front-load the payoff, don't bury it behind setup.
- **One idea per tweet.** In a thread, tweet 1 is the hook + the promise of what follows; each reply lands one beat; the last tweet carries the CTA.
- **Links cost reach and 23 chars.** A first-tweet link suppresses distribution — put the key link in its own/last tweet, or quote the point as text/screenshot instead.
- **Hashtags: 0–2, at the end.** X isn't a hashtag platform; more reads as spam.

> Weak: "We're excited to announce our new feature is now live!" → Strong: "Your CI has been lying to you. Here's the 3-line fix 🧵"

Draft against the `content-craft` fundamentals first — engagement philosophy, the hook→context→payoff→CTA structure, and accessible sourcing apply to every post (on X, put any source link in a reply or the last tweet, not the first — first-tweet links suppress reach). Then pull the brand kit with `brand_voice(action:"get", platform:"x")` — the voice resolved for X, with any per-platform deltas already applied — and match its tone, audience, emoji policy, and banned words; draw hashtags from its sets. Honor its `policy` too — never write about banned topics, include required disclosures, and publish a paid post with `sponsored: true`. See the `content-intelligence` skill.

### Single tweet

Use `x_post_tweet` when content fits one tweet (≤{{limit:x.text.max}} {{unit:x.text}}).

Before calling:
- Count characters. URLs count as 23 chars regardless of length. Emojis > U+FFFF count as 2.
- If over {{limit:x.text.max}} {{unit:x.text}}, ask the user to trim or split into a thread. Never silently truncate.

```
x_post_tweet(text: "<tweet text>")
```

On success, report the tweet URL. On error, show the error message.

### Thread

Use `x_post_thread` when the content is a numbered thread or the user asks for one.

```
x_post_thread(tweets: ["Tweet 1 text", "Tweet 2 text", ...])
```

On success, report the first tweet URL. On error, show which tweet failed.

### Preview before posting (optional)

- `x_post_tweet(text, dry_run: true)` / `x_post_thread(tweets, dry_run: true)` — validate and preview without sending.
- `content_validate(platform: "x", content: { text })` (or `{ tweets }`) — check limits without posting.
- Long single post? `content_adapt(text, ["x"])` auto-splits it into an in-limit thread. See the `content-intelligence` skill.

### After posting

Confirm: platform, post type, URL, timestamp. Update queue item status if one exists.

### Common errors

- `401` / `403` — Bad or under-scoped OAuth 1.0a credentials. Re-check the four `X_*` keys; the app needs read+write.
- `187` — Duplicate status; X rejects identical text. Vary the wording.
- `429` — Rate limited. Back off; `rate_limits` tracks what was observed.
- `402` — Credits depleted on the API plan. Needs a paid tier.
