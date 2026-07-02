import { randomBytes, createHmac } from 'crypto';
import { env } from '../lib/env.js';

function generateOAuthHeader(method: string, url: string, account = ''): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key:     env('X_API_KEY', account)!,
    oauth_nonce:            randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
    oauth_token:            env('X_ACCESS_TOKEN', account)!,
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
    `${encodeURIComponent(env('X_API_SECRET', account)!)}&${encodeURIComponent(env('X_ACCESS_TOKEN_SECRET', account)!)}`;

  oauthParams.oauth_signature = createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`);

  return `OAuth ${headerParts.join(', ')}`;
}

interface TweetBody {
  text: string;
  reply?: { in_reply_to_tweet_id: string };
}

interface TweetResponse {
  data: { id: string; [key: string]: unknown };
}

async function postTweet(text: string, replyToId: string | null = null, account = ''): Promise<TweetResponse> {
  const url = 'https://api.twitter.com/2/tweets';
  const body: TweetBody = { text };
  if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization:  generateOAuthHeader('POST', url, account),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`X API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<TweetResponse>;
}

export async function postSingleTweet(text: string, account = ''): Promise<{ id: string; url: string }> {
  const result = await postTweet(text, null, account);
  const id = result.data.id;
  return { id, url: `https://x.com/i/status/${id}` };
}

export async function postThread(tweets: string[], account = ''): Promise<{ count: number; firstUrl: string; tweets: unknown[] }> {
  let lastId: string | null = null;
  const posted: { id: string; [key: string]: unknown }[] = [];
  for (const text of tweets) {
    const result = await postTweet(text, lastId, account);
    lastId = result.data.id;
    posted.push(result.data);
  }
  const firstId = posted[0].id;
  return { count: posted.length, firstUrl: `https://x.com/i/status/${firstId}`, tweets: posted };
}
