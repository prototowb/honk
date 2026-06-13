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

// ─── MCP Server ──────────────────────────────────────────────────────────

const server = new Server(
  { name: 'social-publisher', version: '0.1.0' },
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

    throw new Error(`Unknown tool: ${name}`);
  } catch (err) {
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
