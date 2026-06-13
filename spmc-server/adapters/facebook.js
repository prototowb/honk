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
