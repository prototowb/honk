const BASE = 'https://bsky.social/xrpc';

function env(key, account = '') {
  return account ? process.env[`${key}__${account.toUpperCase()}`] : process.env[key];
}

export async function post(text, account = '') {
  const identifier = env('BLUESKY_IDENTIFIER', account);
  const password   = env('BLUESKY_APP_PASSWORD', account);

  const sessionRes = await fetch(`${BASE}/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  if (!sessionRes.ok)
    throw new Error(`Bluesky auth ${sessionRes.status}: ${await sessionRes.text()}`);

  const { accessJwt, did } = await sessionRes.json();

  const recordRes = await fetch(`${BASE}/com.atproto.repo.createRecord`, {
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

  return { ...(await recordRes.json()), identifier };
}
