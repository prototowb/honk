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

// Carousel (2–10 images) via the Graph API three-step flow: create one child
// container per image (is_carousel_item), then a CAROUSEL parent container
// holding the children + caption, then publish the parent.
export async function postCarousel(imageUrls, caption, account = '') {
  const igUserId    = env('INSTAGRAM_USER_ID', account);
  const accessToken = env('INSTAGRAM_ACCESS_TOKEN', account);

  const children = [];
  for (const imageUrl of imageUrls) {
    const childRes = await fetch(`${BASE}/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, is_carousel_item: true, access_token: accessToken }),
    });
    if (!childRes.ok)
      throw new Error(`IG carousel child ${childRes.status}: ${await childRes.text()}`);
    children.push((await childRes.json()).id);
  }

  const parentRes = await fetch(`${BASE}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_type: 'CAROUSEL', children: children.join(','), caption, access_token: accessToken }),
  });
  if (!parentRes.ok)
    throw new Error(`IG carousel container ${parentRes.status}: ${await parentRes.text()}`);

  const { id: creationId } = await parentRes.json();

  const publishRes = await fetch(`${BASE}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
  });
  if (!publishRes.ok)
    throw new Error(`IG carousel publish ${publishRes.status}: ${await publishRes.text()}`);

  return { ...(await publishRes.json()), children: children.length };
}

// Account profile: handle + display name + avatar URL. Read-only; used for
// branding (slide footers) and to confirm which account is connected.
export async function getProfile(account = '') {
  const igUserId    = env('INSTAGRAM_USER_ID', account);
  const accessToken = env('INSTAGRAM_ACCESS_TOKEN', account);

  const res = await fetch(`${BASE}/${igUserId}?fields=username,name,profile_picture_url&access_token=${accessToken}`);
  if (!res.ok) throw new Error(`IG profile ${res.status}: ${await res.text()}`);

  const j = await res.json();
  return {
    platform: 'instagram',
    id:       j.id ?? igUserId,
    handle:   j.username ? `@${j.username}` : null,
    name:     j.name ?? null,
    icon_url: j.profile_picture_url ?? null,
  };
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
