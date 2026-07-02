import { env } from '../lib/env.js';
const BASE = 'https://graph.facebook.com/v19.0';
export async function post(message, imageUrl = null, account = '', opts = {}) {
    const pageId = env('FACEBOOK_PAGE_ID', account);
    const accessToken = env('FACEBOOK_ACCESS_TOKEN', account);
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
    if (!res.ok)
        throw new Error(`Facebook post ${res.status}: ${await res.text()}`);
    return res.json();
}
export async function comment(postId, message, account = '') {
    const accessToken = env('FACEBOOK_ACCESS_TOKEN', account);
    const res = await fetch(`${BASE}/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, access_token: accessToken }),
    });
    if (!res.ok)
        throw new Error(`Facebook comment ${res.status}: ${await res.text()}`);
    return res.json();
}
export async function getProfile(account = '') {
    const pageId = env('FACEBOOK_PAGE_ID', account);
    const accessToken = env('FACEBOOK_ACCESS_TOKEN', account);
    const res = await fetch(`${BASE}/${pageId}?fields=name,username,picture.type(large){url}&access_token=${accessToken}`);
    if (!res.ok)
        throw new Error(`Facebook profile ${res.status}: ${await res.text()}`);
    const j = await res.json();
    return {
        platform: 'facebook',
        id: j.id ?? pageId,
        handle: j.username ? `@${j.username}` : null,
        name: j.name ?? null,
        icon_url: j.picture?.data?.url ?? null,
    };
}
export async function getMetrics(postId, account = '') {
    const accessToken = env('FACEBOOK_ACCESS_TOKEN', account);
    const metrics = 'post_engagements,post_clicks,post_reactions_like_total,post_reactions_by_type_total';
    const res = await fetch(`${BASE}/${postId}/insights?metric=${metrics}&access_token=${accessToken}`);
    if (!res.ok)
        throw new Error(`Facebook insights ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const out = {};
    for (const d of json.data ?? [])
        out[d.name] = d.values?.[0]?.value ?? d.total_value?.value;
    return out;
}
