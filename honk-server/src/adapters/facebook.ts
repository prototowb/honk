import { env } from '../lib/env.js';

const BASE = 'https://graph.facebook.com/v19.0';

interface PostResult { post_id?: string; id?: string }
interface ProfileResult { platform: string; id: string; handle: string | null; name: string | null; icon_url: string | null }

export async function post(message: string, imageUrl: string | null = null, account = '', opts: { alt_text?: string } = {}): Promise<PostResult> {
  const pageId      = env('FACEBOOK_PAGE_ID', account)!;
  const accessToken = env('FACEBOOK_ACCESS_TOKEN', account)!;

  const endpoint = imageUrl ? `${BASE}/${pageId}/photos` : `${BASE}/${pageId}/feed`;
  // alt_text_custom is a photo field, so it only applies to the /photos path.
  const body = imageUrl
    ? { url: imageUrl, caption: message, ...(opts.alt_text ? { alt_text_custom: opts.alt_text } : {}), access_token: accessToken }
    : { message, access_token: accessToken };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Facebook post ${res.status}: ${await res.text()}`);
  return res.json() as Promise<PostResult>;
}

export async function comment(postId: string, message: string, account = ''): Promise<unknown> {
  const accessToken = env('FACEBOOK_ACCESS_TOKEN', account)!;
  const res = await fetch(`${BASE}/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, access_token: accessToken }),
  });
  if (!res.ok) throw new Error(`Facebook comment ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getProfile(account = ''): Promise<ProfileResult> {
  const pageId      = env('FACEBOOK_PAGE_ID', account)!;
  const accessToken = env('FACEBOOK_ACCESS_TOKEN', account)!;

  const res = await fetch(`${BASE}/${pageId}?fields=name,username,picture.type(large){url}&access_token=${accessToken}`);
  if (!res.ok) throw new Error(`Facebook profile ${res.status}: ${await res.text()}`);

  const j = await res.json() as { id?: string; name?: string; username?: string; picture?: { data?: { url?: string } } };
  return {
    platform: 'facebook',
    id:       j.id ?? pageId,
    handle:   j.username ? `@${j.username}` : null,
    name:     j.name ?? null,
    icon_url: j.picture?.data?.url ?? null,
  };
}

export async function getMetrics(postId: string, account = ''): Promise<Record<string, unknown>> {
  const accessToken = env('FACEBOOK_ACCESS_TOKEN', account)!;
  const metrics = 'post_engagements,post_clicks,post_reactions_like_total,post_reactions_by_type_total';
  const res = await fetch(`${BASE}/${postId}/insights?metric=${metrics}&access_token=${accessToken}`);
  if (!res.ok) throw new Error(`Facebook insights ${res.status}: ${await res.text()}`);

  const json = await res.json() as { data?: Array<{ name: string; values?: Array<{ value: unknown }>; total_value?: { value: unknown } }> };
  const out: Record<string, unknown> = {};
  for (const d of json.data ?? []) out[d.name] = d.values?.[0]?.value ?? d.total_value?.value;
  return out;
}
