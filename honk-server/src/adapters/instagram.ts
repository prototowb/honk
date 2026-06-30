import { env } from '../lib/env.js';

const BASE = 'https://graph.facebook.com/v19.0';

interface WaitOptions { tries?: number; delayMs?: number }

// A freshly-created image container isn't immediately publishable — Instagram
// fetches and processes the image asynchronously. Calling media_publish too
// early returns code 9007 / subcode 2207027 ("media can't be published yet").
// Poll status_code until FINISHED before publishing (Meta-recommended flow).
async function waitForContainer(creationId: string, accessToken: string, { tries = 12, delayMs = 3000 }: WaitOptions = {}): Promise<void> {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(
      `${BASE}/${creationId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (res.ok) {
      const { status_code: code } = await res.json() as { status_code: string };
      if (code === 'FINISHED') return;
      if (code === 'ERROR' || code === 'EXPIRED')
        throw new Error(`IG container processing ${code}`);
    }
    if (i < tries - 1) await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error(`IG container still processing after ${tries} checks — try again shortly`);
}

export async function post(imageUrl: string, caption: string, account = '', opts: { alt_text?: string } = {}): Promise<{ id: string }> {
  const igUserId    = env('INSTAGRAM_USER_ID', account)!;
  const accessToken = env('INSTAGRAM_ACCESS_TOKEN', account)!;

  const containerRes = await fetch(`${BASE}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      ...(opts.alt_text ? { alt_text: opts.alt_text } : {}),
      access_token: accessToken,
    }),
  });
  if (!containerRes.ok)
    throw new Error(`IG container ${containerRes.status}: ${await containerRes.text()}`);

  const { id: creationId } = await containerRes.json() as { id: string };

  await waitForContainer(creationId, accessToken);

  const publishRes = await fetch(`${BASE}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
  });
  if (!publishRes.ok)
    throw new Error(`IG publish ${publishRes.status}: ${await publishRes.text()}`);

  return publishRes.json() as Promise<{ id: string }>;
}

export async function postCarousel(imageUrls: string[], caption: string, account = '', opts: { alt_texts?: string[] } = {}): Promise<{ id: string; children: number }> {
  const igUserId    = env('INSTAGRAM_USER_ID', account)!;
  const accessToken = env('INSTAGRAM_ACCESS_TOKEN', account)!;
  const altTexts    = Array.isArray(opts.alt_texts) ? opts.alt_texts : [];

  const children: string[] = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    const childRes = await fetch(`${BASE}/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        is_carousel_item: true,
        ...(altTexts[i] ? { alt_text: altTexts[i] } : {}),
        access_token: accessToken,
      }),
    });
    if (!childRes.ok)
      throw new Error(`IG carousel child ${childRes.status}: ${await childRes.text()}`);
    children.push(((await childRes.json()) as { id: string }).id);
  }

  const parentRes = await fetch(`${BASE}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_type: 'CAROUSEL', children: children.join(','), caption, access_token: accessToken }),
  });
  if (!parentRes.ok)
    throw new Error(`IG carousel container ${parentRes.status}: ${await parentRes.text()}`);

  const { id: creationId } = await parentRes.json() as { id: string };

  await waitForContainer(creationId, accessToken);

  const publishRes = await fetch(`${BASE}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
  });
  if (!publishRes.ok)
    throw new Error(`IG carousel publish ${publishRes.status}: ${await publishRes.text()}`);

  return { ...(await publishRes.json() as { id: string }), children: children.length };
}

export async function comment(mediaId: string, message: string, account = ''): Promise<unknown> {
  const accessToken = env('INSTAGRAM_ACCESS_TOKEN', account)!;
  const res = await fetch(`${BASE}/${mediaId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, access_token: accessToken }),
  });
  if (!res.ok) throw new Error(`IG comment ${res.status}: ${await res.text()}`);
  return res.json();
}

interface ProfileResult { platform: string; id: string; handle: string | null; name: string | null; icon_url: string | null }

export async function getProfile(account = ''): Promise<ProfileResult> {
  const igUserId    = env('INSTAGRAM_USER_ID', account)!;
  const accessToken = env('INSTAGRAM_ACCESS_TOKEN', account)!;

  const res = await fetch(`${BASE}/${igUserId}?fields=username,name,profile_picture_url&access_token=${accessToken}`);
  if (!res.ok) throw new Error(`IG profile ${res.status}: ${await res.text()}`);

  const j = await res.json() as { id?: string; username?: string; name?: string; profile_picture_url?: string };
  return {
    platform: 'instagram',
    id:       j.id ?? igUserId,
    handle:   j.username ? `@${j.username}` : null,
    name:     j.name ?? null,
    icon_url: j.profile_picture_url ?? null,
  };
}

export async function getMetrics(mediaId: string, account = ''): Promise<Record<string, unknown>> {
  const accessToken = env('INSTAGRAM_ACCESS_TOKEN', account)!;
  const metrics = 'reach,likes,comments,saved,shares';
  const res = await fetch(`${BASE}/${mediaId}/insights?metric=${metrics}&access_token=${accessToken}`);
  if (!res.ok) throw new Error(`IG insights ${res.status}: ${await res.text()}`);

  const json = await res.json() as { data?: Array<{ name: string; values?: Array<{ value: unknown }>; total_value?: { value: unknown } }> };
  const out: Record<string, unknown> = {};
  for (const d of json.data ?? []) out[d.name] = d.values?.[0]?.value ?? d.total_value?.value;
  return out;
}
