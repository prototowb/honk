const BASE = 'https://graph.threads.net/v1.0';

function env(key, account = '') {
  return account ? process.env[`${key}__${account.toUpperCase()}`] : process.env[key];
}

export async function post(text, imageUrl = null, account = '') {
  const userId      = env('THREADS_USER_ID', account);
  const accessToken = env('THREADS_ACCESS_TOKEN', account);

  const containerParams = new URLSearchParams({
    access_token: accessToken,
    ...(imageUrl
      ? { media_type: 'IMAGE', image_url: imageUrl, text }
      : { media_type: 'TEXT', text }),
  });

  const containerRes = await fetch(`${BASE}/${userId}/threads?${containerParams}`, {
    method: 'POST',
  });
  if (!containerRes.ok)
    throw new Error(`Threads container ${containerRes.status}: ${await containerRes.text()}`);

  const { id: creationId } = await containerRes.json();

  const publishParams = new URLSearchParams({ creation_id: creationId, access_token: accessToken });
  const publishRes = await fetch(`${BASE}/${userId}/threads_publish?${publishParams}`, {
    method: 'POST',
  });
  if (!publishRes.ok)
    throw new Error(`Threads publish ${publishRes.status}: ${await publishRes.text()}`);

  return publishRes.json();
}
