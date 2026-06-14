const BASE = 'https://graph.facebook.com/v19.0';

function env(key, account = '') {
  return account ? process.env[`${key}__${account.toUpperCase()}`] : process.env[key];
}

export async function post(imageUrl, caption, account = '') {
  const igUserId    = env('INSTAGRAM_USER_ID', account);
  const accessToken = env('INSTAGRAM_ACCESS_TOKEN', account);

  const containerRes = await fetch(`${BASE}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
  });
  if (!containerRes.ok)
    throw new Error(`IG container ${containerRes.status}: ${await containerRes.text()}`);

  const { id: creationId } = await containerRes.json();

  const publishRes = await fetch(`${BASE}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
  });
  if (!publishRes.ok)
    throw new Error(`IG publish ${publishRes.status}: ${await publishRes.text()}`);

  return publishRes.json();
}

// Engagement metrics for a published media item via the Graph insights edge.
// Unverified against the live API (credential testing deferred).
export async function getMetrics(mediaId, account = '') {
  const accessToken = env('INSTAGRAM_ACCESS_TOKEN', account);
  const metrics = 'reach,likes,comments,saved,shares';
  const res = await fetch(`${BASE}/${mediaId}/insights?metric=${metrics}&access_token=${accessToken}`);
  if (!res.ok) throw new Error(`IG insights ${res.status}: ${await res.text()}`);

  const json = await res.json();
  const out = {};
  for (const d of json.data ?? []) out[d.name] = d.values?.[0]?.value ?? d.total_value?.value;
  return out;
}
