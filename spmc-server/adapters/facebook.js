const BASE = 'https://graph.facebook.com/v19.0';

function env(key, account = '') {
  return account ? process.env[`${key}__${account.toUpperCase()}`] : process.env[key];
}

export async function post(message, imageUrl = null, account = '') {
  const pageId      = env('FACEBOOK_PAGE_ID', account);
  const accessToken = env('FACEBOOK_ACCESS_TOKEN', account);

  const endpoint = imageUrl ? `${BASE}/${pageId}/photos` : `${BASE}/${pageId}/feed`;
  const body     = imageUrl
    ? { url: imageUrl, caption: message, access_token: accessToken }
    : { message, access_token: accessToken };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Facebook post ${res.status}: ${await res.text()}`);
  return res.json();
}

// Post-level insights for a published Page post.
// Unverified against the live API (credential testing deferred).
export async function getMetrics(postId, account = '') {
  const accessToken = env('FACEBOOK_ACCESS_TOKEN', account);
  const metrics = 'post_impressions,post_impressions_unique,post_reactions_by_type_total';
  const res = await fetch(`${BASE}/${postId}/insights?metric=${metrics}&access_token=${accessToken}`);
  if (!res.ok) throw new Error(`Facebook insights ${res.status}: ${await res.text()}`);

  const json = await res.json();
  const out = {};
  for (const d of json.data ?? []) out[d.name] = d.values?.[0]?.value;
  return out;
}
