import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import crypto from 'crypto';

// ─── X (Twitter) OAuth 1.0a ───────────────────────────────────────────────

function generateOAuthHeader(method, url) {
  const oauthParams = {
    oauth_consumer_key:     process.env.X_API_KEY,
    oauth_nonce:            crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
    oauth_token:            process.env.X_ACCESS_TOKEN,
    oauth_version:          '1.0',
  };

  const sortedParams = Object.keys(oauthParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
    .join('&');

  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join('&');

  const signingKey =
    `${encodeURIComponent(process.env.X_API_SECRET)}&${encodeURIComponent(process.env.X_ACCESS_TOKEN_SECRET)}`;

  oauthParams.oauth_signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`);

  return `OAuth ${headerParts.join(', ')}`;
}

async function postTweet(text, replyToId = null) {
  const url = 'https://api.twitter.com/2/tweets';
  const body = { text };
  if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization:  generateOAuthHeader('POST', url),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`X API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function postThread(tweets) {
  let lastId = null;
  const posted = [];
  for (const text of tweets) {
    const result = await postTweet(text, lastId);
    lastId = result.data.id;
    posted.push(result.data);
  }
  return posted;
}

// ─── Instagram Graph API ─────────────────────────────────────────────────

async function instagramPost(imageUrl, caption) {
  const igUserId     = process.env.INSTAGRAM_USER_ID;
  const accessToken  = process.env.INSTAGRAM_ACCESS_TOKEN;
  const base         = `https://graph.facebook.com/v19.0`;

  // Step 1: create media container
  const containerRes = await fetch(`${base}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
  });
  if (!containerRes.ok)
    throw new Error(`IG container ${containerRes.status}: ${await containerRes.text()}`);

  const { id: creationId } = await containerRes.json();

  // Step 2: publish container
  const publishRes = await fetch(`${base}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
  });
  if (!publishRes.ok)
    throw new Error(`IG publish ${publishRes.status}: ${await publishRes.text()}`);

  return publishRes.json();
}

// ─── TikTok Content Posting API ──────────────────────────────────────────

async function tiktokPostVideo(videoUrl, caption, privacyLevel = 'SELF_ONLY') {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  const base        = 'https://open.tiktokapis.com/v2';

  // Step 1: initialize the post (PULL_FROM_URL — TikTok fetches the video itself,
  // mirrors the Instagram image_url pattern so it slots into the existing pipeline)
  const initRes = await fetch(`${base}/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title:                   caption,
        privacy_level:           privacyLevel,
        disable_duet:            false,
        disable_comment:         false,
        disable_stitch:          false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source:    'PULL_FROM_URL',
        video_url: videoUrl,
      },
    }),
  });

  if (!initRes.ok)
    throw new Error(`TikTok init ${initRes.status}: ${await initRes.text()}`);

  const initJson = await initRes.json();
  if (initJson.error && initJson.error.code !== 'ok')
    throw new Error(`TikTok API error ${initJson.error.code}: ${initJson.error.message}`);

  return initJson.data; // { publish_id, ... }
}

async function tiktokCheckPublishStatus(publishId) {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  const base        = 'https://open.tiktokapis.com/v2';

  const res = await fetch(`${base}/post/publish/status/fetch/`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({ publish_id: publishId }),
  });

  if (!res.ok) throw new Error(`TikTok status ${res.status}: ${await res.text()}`);

  const json = await res.json();
  if (json.error && json.error.code !== 'ok')
    throw new Error(`TikTok API error ${json.error.code}: ${json.error.message}`);

  return json.data; // { status, fail_reason, publicaly_available_post_id, ... }
}

// ─── Facebook Graph API (Page feed) ──────────────────────────────────────
// Uses the SAME Page-linked Meta setup as Instagram — a system-user EAA
// token with `pages_manage_posts` can post to both. See README gotchas.

async function facebookPost(message, imageUrl = null) {
  const pageId      = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const base        = 'https://graph.facebook.com/v19.0';

  // With an image: post as a photo (caption = message). Without: plain feed post.
  const endpoint = imageUrl ? `${base}/${pageId}/photos` : `${base}/${pageId}/feed`;
  const body     = imageUrl
    ? { url: imageUrl, caption: message, access_token: accessToken }
    : { message, access_token: accessToken };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Facebook post ${res.status}: ${await res.text()}`);
  return res.json(); // { id } or { id, post_id }
}

// ─── Threads API ─────────────────────────────────────────────────────────
// Same two-step container/publish shape as Instagram, different host
// (graph.threads.net) and its own token (threads_basic, threads_content_publish).

async function threadsPost(text, imageUrl = null) {
  const userId      = process.env.THREADS_USER_ID;
  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  const base        = 'https://graph.threads.net/v1.0';

  // Step 1: create container
  const containerParams = new URLSearchParams({
    access_token: accessToken,
    ...(imageUrl
      ? { media_type: 'IMAGE', image_url: imageUrl, text }
      : { media_type: 'TEXT', text }),
  });

  const containerRes = await fetch(`${base}/${userId}/threads?${containerParams.toString()}`, {
    method: 'POST',
  });
  if (!containerRes.ok)
    throw new Error(`Threads container ${containerRes.status}: ${await containerRes.text()}`);

  const { id: creationId } = await containerRes.json();

  // Step 2: publish container
  const publishParams = new URLSearchParams({ creation_id: creationId, access_token: accessToken });
  const publishRes = await fetch(`${base}/${userId}/threads_publish?${publishParams.toString()}`, {
    method: 'POST',
  });
  if (!publishRes.ok)
    throw new Error(`Threads publish ${publishRes.status}: ${await publishRes.text()}`);

  return publishRes.json(); // { id }
}

// ─── Bluesky (AT Protocol) ───────────────────────────────────────────────
// No OAuth dance — authenticates with an app password (NOT your real
// account password), then writes a post record directly to the repo.

async function blueskyPost(text) {
  const identifier = process.env.BLUESKY_IDENTIFIER;     // handle or email
  const password   = process.env.BLUESKY_APP_PASSWORD;   // app password, not account password
  const base       = 'https://bsky.social/xrpc';

  // Step 1: create a session
  const sessionRes = await fetch(`${base}/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  if (!sessionRes.ok)
    throw new Error(`Bluesky auth ${sessionRes.status}: ${await sessionRes.text()}`);

  const { accessJwt, did } = await sessionRes.json();

  // Step 2: write the post record
  const recordRes = await fetch(`${base}/com.atproto.repo.createRecord`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${accessJwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      repo:       did,
      collection: 'app.bsky.feed.post',
      record: {
        $type:     'app.bsky.feed.post',
        text,
        createdAt: new Date().toISOString(),
      },
    }),
  });
  if (!recordRes.ok)
    throw new Error(`Bluesky post ${recordRes.status}: ${await recordRes.text()}`);

  return { ...(await recordRes.json()), identifier }; // { uri, cid, identifier }
}

// ─── MCP Server ──────────────────────────────────────────────────────────

const server = new Server(
  { name: 'social-publisher', version: '0.2.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'x_post_tweet',
      description: 'Post a single tweet to X (Twitter). Max 280 characters.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Tweet text (max 280 chars)' },
        },
        required: ['text'],
      },
    },
    {
      name: 'x_post_thread',
      description: 'Post a thread of tweets to X (Twitter). Each item is one tweet in sequence.',
      inputSchema: {
        type: 'object',
        properties: {
          tweets: {
            type: 'array',
            items: { type: 'string' },
            description: 'Ordered array of tweet texts',
          },
        },
        required: ['tweets'],
      },
    },
    {
      name: 'instagram_post',
      description: 'Post an image with caption to Instagram. Requires a publicly accessible image URL.',
      inputSchema: {
        type: 'object',
        properties: {
          image_url: { type: 'string', description: 'Publicly accessible URL of the image' },
          caption:   { type: 'string', description: 'Caption text including hashtags' },
        },
        required: ['image_url', 'caption'],
      },
    },
    {
      name: 'tiktok_post_video',
      description: 'Post a video to TikTok via the Content Posting API. Requires a publicly accessible video URL (TikTok pulls it directly — PULL_FROM_URL). Note: until your TikTok app passes audit, posts are restricted to private/self-only viewing regardless of the privacy_level you request.',
      inputSchema: {
        type: 'object',
        properties: {
          video_url:     { type: 'string', description: 'Publicly accessible URL of the video (mp4/mov/webm, 3–600s, max 4GB)' },
          caption:       { type: 'string', description: 'Caption/title text including hashtags' },
          privacy_level: {
            type: 'string',
            description: 'Who can view the post. One of PUBLIC_TO_EVERYONE, MUTUAL_FOLLOW_FRIENDS, FOLLOWER_OF_CREATOR, SELF_ONLY. Defaults to SELF_ONLY (required anyway for unaudited apps).',
            enum: ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'],
          },
        },
        required: ['video_url', 'caption'],
      },
    },
    {
      name: 'tiktok_check_publish_status',
      description: 'Check the processing/publish status of a previously-submitted TikTok video post.',
      inputSchema: {
        type: 'object',
        properties: {
          publish_id: { type: 'string', description: 'The publish_id returned by tiktok_post_video' },
        },
        required: ['publish_id'],
      },
    },
    {
      name: 'facebook_post',
      description: 'Post to a Facebook Page feed. Provide an image_url to post as a photo with caption instead of a plain text feed post. Uses the same Page-linked Meta Graph API setup as Instagram — one EAA token (with pages_manage_posts) covers both.',
      inputSchema: {
        type: 'object',
        properties: {
          message:   { type: 'string', description: 'Post text / caption' },
          image_url: { type: 'string', description: 'Optional publicly accessible image URL — posts as a photo with this text as the caption' },
        },
        required: ['message'],
      },
    },
    {
      name: 'threads_post',
      description: 'Post text (optionally with an image) to Threads via the Threads API. Two-step container/publish flow, mirrors Instagram but uses graph.threads.net and its own access token.',
      inputSchema: {
        type: 'object',
        properties: {
          text:      { type: 'string', description: 'Post text (max 500 chars)' },
          image_url: { type: 'string', description: 'Optional publicly accessible image URL for an image post' },
        },
        required: ['text'],
      },
    },
    {
      name: 'bluesky_post',
      description: 'Post text to Bluesky via the AT Protocol. Authenticates with an app password (not your account password) and writes the post directly — no OAuth flow, no review process, free.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Post text (max 300 graphemes)' },
        },
        required: ['text'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    if (name === 'x_post_tweet') {
      const result = await postTweet(args.text);
      const id = result.data.id;
      return {
        content: [{ type: 'text', text: `Tweet posted!\nID: ${id}\nURL: https://x.com/i/status/${id}` }],
      };
    }

    if (name === 'x_post_thread') {
      const results = await postThread(args.tweets);
      const firstId = results[0].id;
      return {
        content: [{
          type: 'text',
          text: `Thread posted! ${results.length} tweets.\nFirst: https://x.com/i/status/${firstId}`,
        }],
      };
    }

    if (name === 'instagram_post') {
      const result = await instagramPost(args.image_url, args.caption);
      return {
        content: [{ type: 'text', text: `Instagram post published! Media ID: ${result.id}` }],
      };
    }

    if (name === 'tiktok_post_video') {
      const result = await tiktokPostVideo(args.video_url, args.caption, args.privacy_level);
      return {
        content: [{
          type: 'text',
          text: `TikTok video submitted! Publish ID: ${result.publish_id}\n`
              + `Note: processing happens async — use tiktok_check_publish_status to confirm it went through. `
              + `Until your app is audited, it'll land as private/self-only regardless of the privacy_level requested.`,
        }],
      };
    }

    if (name === 'tiktok_check_publish_status') {
      const result = await tiktokCheckPublishStatus(args.publish_id);
      return {
        content: [{ type: 'text', text: `TikTok publish status: ${result.status}${result.fail_reason ? ` (reason: ${result.fail_reason})` : ''}` }],
      };
    }

    if (name === 'facebook_post') {
      const result = await facebookPost(args.message, args.image_url);
      return {
        content: [{ type: 'text', text: `Facebook post published! ID: ${result.post_id || result.id}` }],
      };
    }

    if (name === 'threads_post') {
      const result = await threadsPost(args.text, args.image_url);
      return {
        content: [{ type: 'text', text: `Threads post published! ID: ${result.id}` }],
      };
    }

    if (name === 'bluesky_post') {
      const result = await blueskyPost(args.text);
      const postId = result.uri.split('/').pop();
      return {
        content: [{
          type: 'text',
          text: `Bluesky post published!\nURI: ${result.uri}\nView: https://bsky.app/profile/${result.identifier}/post/${postId}`,
        }],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err) {
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
