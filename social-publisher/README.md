# social-publisher

Post content directly to X (Twitter), Instagram, Facebook, Threads, TikTok, and Bluesky from Claude.

## What it does

- Post single tweets or full threads to X
- Post images with captions to Instagram
- Post text or photos to a Facebook Page (reuses the Instagram Page-linked setup — same token, just one extra scope)
- Post text or images to Threads
- Post videos to TikTok (Content Posting API)
- Post text to Bluesky (AT Protocol — free, no app review, no OAuth)
- Integrates with the content pipeline queue

## Components

| Component | Description |
|---|---|
| MCP Server | Node.js stdio server wrapping X API v2 + Meta Graph API (Instagram & Facebook) + Threads API + TikTok Content Posting API + Bluesky AT Protocol |
| Skill: post-to-x | Trigger: "post to X", "tweet this", "publish this thread" |
| Skill: post-to-instagram | Trigger: "post to Instagram", "publish this to IG" |
| Skill: post-to-facebook | Trigger: "post to Facebook", "publish this to my Page" |
| Skill: post-to-threads | Trigger: "post to Threads", "publish this thread post" |
| Skill: post-to-tiktok | Trigger: "post to TikTok", "publish this video to TikTok" |
| Skill: post-to-bluesky | Trigger: "post to Bluesky", "skeet this" |

## Setup

### 1. Install Node.js (v18+)

Download from https://nodejs.org if you don't have it.

### 2. Install server dependencies

```bash
cd /path/to/social-publisher/servers
npm install
```

### 3. Get your API credentials

#### X (Twitter)

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create a new App (or use an existing one)
3. Under "Keys and Tokens", generate:
   - API Key & Secret
   - Access Token & Secret (make sure it has **Read and Write** permissions)

#### Instagram

1. Go to https://developers.facebook.com
2. Create a Meta App → add **Instagram Graph API** product
3. Connect your Instagram Professional (Business or Creator) account
4. Get your **Instagram User ID** from the Graph API Explorer:
   ```
   GET https://graph.facebook.com/v19.0/me?fields=id,name&access_token=YOUR_TOKEN
   ```
5. Generate a **long-lived User Access Token** (valid 60 days — you'll need to refresh it periodically)

> ⚠️ **Read the gotchas section below before doing any of this.** Instagram's setup has several traps that produce identical, misleading error messages — we burned a long debugging session on these. The short version: this plugin needs the *classic* Instagram Graph API path (Page-linked, `EAA…` token), not the newer direct Instagram-login path (`IGAA…` token). Mixing them up is the #1 time sink.

### ⚠️ Instagram setup gotchas (learned the hard way)

Every error below presents as the **same generic message**:
```
Unsupported post request. Object with ID 'XXXXX' does not exist,
cannot be loaded due to missing permissions, or does not support
this operation. (code 100, subcode 33)
```
That message is a red herring — it fires for at least four unrelated root causes. Work through these in order before assuming it's a permissions problem:

**1. Two incompatible Instagram products exist — use the right one.**

| | Instagram API w/ Instagram Login | Instagram Graph API (via Facebook Login for Business) |
|---|---|---|
| **This plugin needs this one?** | ❌ No | ✅ Yes |
| Token prefix | `IGAA…` | `EAA…` |
| API base | `graph.instagram.com` | `graph.facebook.com` |
| Requires linked FB Page | No | **Yes — hard requirement** |
| Where it's set up | App → "Instagram Business Login" product, "Token generieren" button | Graph API Explorer / Business Settings → System Users |

If your token starts with `IGAA`, it was issued by the wrong product for this plugin — `graph.facebook.com` can't even parse it (you'll see a `code 190 "Cannot parse access token"` error). Get an `EAA…` token instead.

**2. The Instagram Business Account MUST be linked to a Facebook Page.**

This is a hard requirement of the classic Graph API path — no amount of correct token/permissions/IDs will work without it. If there's no linked Page, every publish call fails with the generic "object does not exist" error above, which looks exactly like a permissions problem but isn't. Link a Page to the IG account first (Meta Business Suite / IG settings → linked accounts), *then* generate your token.

**3. Use a System User token, not a personal-login token.**

Personal-login tokens (generated via Graph API Explorer while logged in as yourself) only see Instagram accounts connected to *your personal* Facebook account. System User tokens (Business Settings → System Users → generate token) inherit whatever assets are explicitly assigned to that system user at the business level — that's the path that actually sees Business-owned IG accounts like a brand's `@handle`.

Required scopes for self-publishing to your own account: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`. You do **not** need `business_management`.

**4. Three different IDs look similar — don't mix them up.**

| ID type | Format | Where it shows up | Use it for `INSTAGRAM_USER_ID`? |
|---|---|---|---|
| Instagram Business Account ID | 17 digits, starts `1784…` | Business Settings → Instagram accounts | ✅ Yes — this is the one |
| Facebook Page ID | ~14-15 digits | Page settings / linked-account view | ❌ No |
| System User ID | varies | Business Settings → System Users | ❌ No (never used downstream at all) |

Pasting the wrong one produces — you guessed it — the exact same generic "object does not exist" error. Sanity-check the digit count and prefix before chasing anything else.

**5. Don't bother with App Roles ("Instagram-Tester").**

That role is scoped to the legacy **Instagram Basic Display API**, which is irrelevant to Graph API content publishing. If you find yourself adding your account as an "Instagram-Tester" to troubleshoot a publish error, you're in the wrong menu.

**6. Standard Access is enough — skip App Review.**

`instagram_content_publish` works at Standard Access for an app's own connected Business Portfolio assets. Advanced Access (which requires full App Review — screen recordings, use-case docs, the works) is only needed when your app serves *third-party* Instagram accounts outside your own portfolio. For self-publishing to your own brand account, cancel out of any App Review prompt — you don't need it.

**7. Double-check Business-asset permissions via "Zuweisungen verwalten" (Manage assignments), not the top-level badge.**

The top-level "Eingeschränkter Zugriff" (Restricted Access) badge can look insufficient at a glance, but click in — it's a granular per-capability toggle list (Content / Messages / Community / Ads / Insights). You only need **Content** ("Inhalte") on for publishing; Ads being off is fine and expected.

**8. Signed export/upload URLs expire fast — re-export immediately before each retry.**

Canva (and most signed-URL exports) expire in roughly an hour. If you're iterating on the post call while debugging auth, re-export a fresh image URL right before each retry rather than reusing one from a few attempts ago — an expired-URL failure will masquerade as yet another auth problem and cost you a debugging detour.

#### TikTok

1. Go to https://developers.tiktok.com and create a developer app, then add the **Content Posting API** product.
2. Complete TikTok's **OAuth user-authorization flow** to get a `TIKTOK_ACCESS_TOKEN` with `video.publish` scope. This is a manual, one-time step — there's no system-user shortcut like Meta's; the creator account itself has to authorize your app.
3. Host your video somewhere **publicly accessible** (own CDN, Cloudinary, etc.) — the server uses `PULL_FROM_URL`, so TikTok fetches it directly rather than receiving an upload.
4. Set `TIKTOK_ACCESS_TOKEN` in your env (see below). Tokens expire and need periodic refresh via TikTok's refresh-token flow — same "set a reminder" discipline as Instagram's 60-day tokens.

### ⚠️ TikTok setup gotchas

**1. Unaudited apps post privately — always, no exceptions.**

Until your TikTok Developer app passes their content-posting audit, every video lands as **private/self-only**, regardless of the `privacy_level` you request in the API call. This is TikTok's sandbox policy, not a misconfiguration — don't burn time debugging "why isn't my post public," and warn the user up front so they're not surprised when it doesn't show up in public feeds.

**2. It's fundamentally a video platform — no image-only posts via this flow.**

Unlike Instagram, you can't hand it a static graphic. You need an actual video file (mp4/mov/webm, 3–600 seconds, max 4GB, 9:16 recommended). If your content pipeline only generates static images for a TikTok concept, you'll need a video-generation step first (see "Generating video content for TikTok" below).

**3. `PULL_FROM_URL` may require domain verification.**

TikTok can be picky about fetching from arbitrary URLs — if you hit an ownership/verification error, you'll need to verify your hosting domain in the TikTok Developer app settings before `PULL_FROM_URL` will work against it.

**4. Tighter rate limits than X or Instagram.**

25 videos/day per account, ~6 requests/minute per access token. Build in delays if you're posting in batch.

**5. Posting is asynchronous.**

The publish call returns a `publish_id`, not a finished post — always follow up with the status-check endpoint (`tiktok_check_publish_status`) before telling the user it's live. A `publish_id` alone doesn't mean success; check `status` and `fail_reason`.

### Generating video content for TikTok

If your pipeline produces scripts/concepts but not finished video, here are options worth evaluating for the next iteration (free tiers as of mid-2026 — verify current limits before relying on them):

| Tool | What it offers | Free tier notes |
|---|---|---|
| [HeyGen](https://www.heygen.com/) | Text/image/audio → narrated avatar video, captions, animations | Small free API allowance — enough to validate an avatar/webhook flow, not for volume production |
| [Tavus](https://www.tavus.io/) | AI human / conversational avatars, video agents | Free developer plan: ~25 min AI conversational video + 5 min AI video generation, white-labeled API |
| [Magic Hour](https://magichour.ai/) | General generative-video API | One-time 400 credits + ~100 free credits/day — best "real API, no upfront cost" option found |
| [Adobe Firefly](https://www.adobe.com/products/firefly/features/ai-video-generator.html) / [Fotor](https://www.fotor.com/ai-video-generator/) | Browser-based text-to-video | Free tiers exist but are more manual/UI-driven than API-first — better for one-offs than pipeline automation |

For a pipeline like this one, **Magic Hour or Tavus** look like the most promising starting points for an API-first integration — HeyGen's avatar quality is the strongest if the content calls for a "talking head" format, but its free allowance is the thinnest of the bunch.

#### Facebook

**You've already done the hard part.** This plugin's Instagram setup requires the IG Business Account to be linked to a Facebook Page — and that same linkage means the *same* system-user `EAA…` token can post to the Page's feed too. Just:

1. Add the `pages_manage_posts` scope to your existing system-user token (alongside `pages_show_list`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`) — or generate a fresh token with it included.
2. Set `FACEBOOK_PAGE_ID` (the Facebook Page ID — the ~14-15 digit one from the three-IDs table below, the one you must NOT use for `INSTAGRAM_USER_ID`) and `FACEBOOK_ACCESS_TOKEN` (can be the same value as `INSTAGRAM_ACCESS_TOKEN` once it has the right scope).

No new app, no new review, no new linkage puzzle — just one more scope on a token you already have.

#### Threads

Threads runs on its own API and app registration — it is **not** the same credentials as Instagram/Facebook, despite living in the same Meta family:

1. Set up a Threads API app at https://developers.facebook.com/docs/threads (separate product from Instagram Graph API / Facebook Login for Business).
2. Authorize with `threads_basic` and `threads_content_publish` scopes to get `THREADS_USER_ID` and a short-lived access token.
3. Exchange it for a long-lived token (60-day validity, refreshable) — same "set a reminder" discipline as Instagram.
4. Set `THREADS_USER_ID` and `THREADS_ACCESS_TOKEN` in your env.

The publish flow is structurally identical to Instagram's (create container → publish by ID), just on `graph.threads.net` with its own token — recognizing that pattern should make this one of the faster integrations to get working.

#### Bluesky

By far the simplest setup in this entire plugin — free, no developer app, no OAuth flow, no review queue:

1. Go to https://bsky.app/settings/app-passwords and generate an **app password** (never use your real account password here — the app password is scoped and revocable).
2. Set `BLUESKY_IDENTIFIER` (your handle, e.g. `yourname.bsky.social`, or account email) and `BLUESKY_APP_PASSWORD` in your env.

That's it. The server authenticates per-call via `com.atproto.server.createSession` and writes posts directly with `com.atproto.repo.createRecord` — no persistent token to refresh.

### ⚠️ Facebook / Threads / Bluesky gotchas

**1. Facebook Page ID vs Instagram Business Account ID — same trap, opposite direction.**

The Instagram setup gotchas above warn against using the Facebook Page ID where the IG Business Account ID belongs. Here it's the inverse: `FACEBOOK_PAGE_ID` *should* be that ~14-15 digit Page ID. Don't paste the 17-digit `1784…` IG Business Account ID into it by reflex.

**2. Threads credentials are NOT interchangeable with Instagram/Facebook ones.**

Same parent company, completely separate app registration, scopes, and tokens. An `EAA…` Instagram/Facebook token will not authenticate against `graph.threads.net` — don't lose time assuming Meta's ecosystem shares credentials across all its products. (It doesn't, as we learned the hard way with the `IGAA` vs `EAA` split — Threads is yet another island.)

**3. Bluesky's "300 graphemes" isn't the same as "300 characters."**

Emoji and multi-byte characters count differently under grapheme counting than raw character length. If you're porting an X thread (280-char limit) over, don't assume it'll fit Bluesky's 300-grapheme cap unchanged — emoji-heavy text can blow past it sooner than the character count suggests.

**4. Bluesky has no persistent access token to manage — that's a feature, not a gap.**

Unlike every other platform here, there's nothing to refresh. The app password is the long-lived credential; the server re-authenticates fresh on each call. If you see an auth error, the app password itself (not a stale token) is almost always the cause — check it hasn't been revoked or mistyped.

### 4. Set environment variables

Add these to your system environment (or a `.env` file if your setup supports it):

```bash
# X (Twitter)
X_API_KEY=your_api_key
X_API_SECRET=your_api_secret
X_ACCESS_TOKEN=your_access_token
X_ACCESS_TOKEN_SECRET=your_access_token_secret

# Instagram
INSTAGRAM_USER_ID=your_ig_user_id
INSTAGRAM_ACCESS_TOKEN=your_long_lived_access_token

# Facebook (can reuse the Instagram token if it has pages_manage_posts scope)
FACEBOOK_PAGE_ID=your_facebook_page_id
FACEBOOK_ACCESS_TOKEN=your_page_capable_access_token

# Threads (separate app/credentials from Instagram & Facebook)
THREADS_USER_ID=your_threads_user_id
THREADS_ACCESS_TOKEN=your_long_lived_threads_token

# TikTok
TIKTOK_ACCESS_TOKEN=your_oauth_user_access_token

# Bluesky (app password — not your account password)
BLUESKY_IDENTIFIER=yourname.bsky.social
BLUESKY_APP_PASSWORD=your_app_password
```

### 5. Install the plugin in Cowork

Drop the `social-publisher.plugin` file into Cowork and click Install.

## Usage

Once installed and credentials are set, just talk to Claude naturally:

- "Post this tweet: ..."
- "Publish this thread to X"
- "Post to Instagram with this caption: ..."
- "Post this to my Facebook Page: ..."
- "Post this to Threads: ..."
- "Post this video to TikTok: ..."
- "Post this to Bluesky: ..."

## Notes

- Instagram posts require a **publicly accessible image URL** — local files won't work. Use Imgur, Cloudinary, or your own CDN.
- Instagram access tokens expire after 60 days. Refresh them at https://developers.facebook.com/tools/explorer
- Facebook Page posting reuses the Instagram Page-linked token (just add `pages_manage_posts`) — see the Facebook setup section above. No separate app needed.
- Threads requires its **own** app registration and tokens — don't assume Meta credentials are shared across Instagram/Facebook/Threads; they aren't.
- X moved to **pay-per-use pricing** in early 2026 — there's no free tier for posting anymore (roughly $0.015/post for text/media, $0.20/post if it contains a URL). You need a positive credit balance or write calls return `402 CreditsDepleted`. Check your balance and the App-permissions level (must be "Read and write," and tokens must be regenerated *after* changing it) at https://developer.twitter.com
- TikTok posts require a **publicly accessible video URL** (not images, not local files) and currently land as **private/self-only until your app passes TikTok's audit** — see the gotchas section above before you go looking for your "public" post.
- TikTok access tokens also expire and need refreshing via TikTok's OAuth refresh-token flow.
- Bluesky is currently the **only platform here with zero cost, zero review process, and zero token-refresh maintenance** — worth leaning on if you want the lowest-friction platform to post to first when validating new content.
