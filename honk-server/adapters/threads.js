const BASE = 'https://graph.threads.net/v1.0';

function env(key, account = '') {
  return account ? process.env[`${key}__${account.toUpperCase()}`] : process.env[key];
}

export async function post(text, imageUrl = null, account = '', opts = {}) {
  const userId      = env('THREADS_USER_ID', account);
  const accessToken = env('THREADS_ACCESS_TOKEN', account);

  const containerParams = new URLSearchParams({
    access_token: accessToken,
    ...(imageUrl
      ? { media_type: 'IMAGE', image_url: imageUrl, text, ...(opts.alt_text ? { alt_text: opts.alt_text } : {}) }
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

// Engagement metrics for a published thread via the insights edge.
// Unverified against the live API (credential testing deferred).
export async function getMetrics(mediaId, account = '') {
  const accessToken = env('THREADS_ACCESS_TOKEN', account);
  const metrics = 'views,likes,replies,reposts,quotes';
  const res = await fetch(`${BASE}/${mediaId}/insights?metric=${metrics}&access_token=${accessToken}`);
  if (!res.ok) throw new Error(`Threads insights ${res.status}: ${await res.text()}`);

  const json = await res.json();
  const out = {};
  for (const d of json.data ?? []) out[d.name] = d.values?.[0]?.value ?? d.total_value?.value;
  return out;
}
