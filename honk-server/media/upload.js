import { fetchWithTimeout as fetch } from '../lib/http.js';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { basename, extname } from 'path';
import * as assets from '../lib/assets.js';
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v']);
function resourceType(name) {
    return VIDEO_EXTS.has(extname(name).toLowerCase()) ? 'video' : 'image';
}
function resolveInput(filePathOrBuffer, filename) {
    if (Buffer.isBuffer(filePathOrBuffer)) {
        if (!filename)
            throw new Error('filename required when passing a Buffer');
        return { buf: filePathOrBuffer, name: filename };
    }
    return { buf: readFileSync(filePathOrBuffer), name: basename(filePathOrBuffer) };
}
export function cloudinaryCreds(account = '') {
    const pfx = account ? `${account.toUpperCase()}__` : '';
    let cloudName = process.env[`${pfx}CLOUDINARY_CLOUD_NAME`];
    let apiKey = process.env[`${pfx}CLOUDINARY_API_KEY`];
    let apiSecret = process.env[`${pfx}CLOUDINARY_API_SECRET`];
    const url = process.env[`${pfx}CLOUDINARY_URL`];
    if (url && (!cloudName || !apiKey || !apiSecret)) {
        const m = url.trim().match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
        if (m) {
            apiKey = apiKey || decodeURIComponent(m[1]);
            apiSecret = apiSecret || decodeURIComponent(m[2]);
            cloudName = cloudName || decodeURIComponent(m[3]);
        }
    }
    return (cloudName && apiKey && apiSecret) ? { cloudName, apiKey, apiSecret } : null;
}
export async function uploadCloudinary(filePathOrBuffer, account = '', filename) {
    const creds = cloudinaryCreds(account);
    if (!creds)
        throw new Error(`Cloudinary credentials missing${account ? ` for account "${account}"` : ''}. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET — or a single CLOUDINARY_URL.`);
    const { cloudName, apiKey, apiSecret } = creds;
    const { buf, name } = resolveInput(filePathOrBuffer, filename);
    const type = resourceType(name);
    const timestamp = Math.round(Date.now() / 1000);
    const signature = createHash('sha1')
        .update(`timestamp=${timestamp}${apiSecret}`)
        .digest('hex');
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)]), name);
    form.append('api_key', apiKey);
    form.append('timestamp', String(timestamp));
    form.append('signature', signature);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${type}/upload`, { method: 'POST', body: form });
    if (!res.ok)
        throw new Error(`Cloudinary ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { url: data.secure_url, provider: 'cloudinary', public_id: data.public_id, resource: type, format: data.format, bytes: data.bytes };
}
export async function uploadImgbb(filePathOrBuffer, account = '', filename) {
    const pfx = account ? `${account.toUpperCase()}__` : '';
    const apiKey = process.env[`${pfx}IMGBB_API_KEY`];
    if (!apiKey)
        throw new Error(`imgbb credentials missing${account ? ` for account "${account}"` : ''}. Set IMGBB_API_KEY.`);
    const { buf, name } = resolveInput(filePathOrBuffer, filename);
    if (resourceType(name) === 'video')
        throw new Error('imgbb does not support video. Use Cloudinary for video.');
    const form = new FormData();
    form.append('key', apiKey);
    form.append('image', buf.toString('base64'));
    const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
    if (!res.ok)
        throw new Error(`imgbb ${res.status}: ${await res.text()}`);
    const json = await res.json();
    if (!json.success)
        throw new Error(`imgbb error: ${json.error?.message ?? JSON.stringify(json)}`);
    return { url: json.data.url, provider: 'imgbb', resource: 'image' };
}
// Accepts (filePathOrBuffer, provider, account) for normal use, or
// (null, provider, account, buffer, filename) from compose.ts internally.
export async function upload(filePathOrBuffer, provider = null, account = '', _buf, _filename) {
    const input = filePathOrBuffer ?? _buf;
    const fname = _filename ?? (typeof filePathOrBuffer === 'string' ? basename(filePathOrBuffer) : undefined);
    const name = fname ?? 'upload';
    const pfx = account ? `${account.toUpperCase()}__` : '';
    const hasCloudinary = !!cloudinaryCreds(account);
    const hasImgbb = !!process.env[`${pfx}IMGBB_API_KEY`];
    let order;
    if (provider) {
        order = [provider];
    }
    else if (resourceType(name) === 'video') {
        order = hasCloudinary ? ['cloudinary'] : [];
    }
    else {
        order = [hasImgbb && 'imgbb', hasCloudinary && 'cloudinary'].filter(Boolean);
    }
    if (order.length === 0)
        throw new Error('No media provider configured. Set IMGBB_API_KEY or CLOUDINARY_URL / CLOUDINARY_* in your env.');
    let lastErr;
    for (const p of order) {
        try {
            let result;
            if (p === 'cloudinary')
                result = await uploadCloudinary(input, account, fname);
            else if (p === 'imgbb')
                result = await uploadImgbb(input, account, fname);
            else
                throw new Error(`Unknown provider: ${p}. Supported: cloudinary, imgbb`);
            // Asset registry (INIT-013): record the output — best-effort, a registry
            // failure must never fail the upload. Compose-internal calls (buffer via
            // _buf, filePathOrBuffer === null) are skipped: compose() registers its
            // own output with template/dimension metadata (source: 'compose').
            if (filePathOrBuffer !== null) {
                try {
                    const { buf } = resolveInput(input, name);
                    assets.register({
                        url: result.url,
                        hash: assets.hashBuffer(buf),
                        provider: result.provider,
                        source: 'upload',
                        ...(typeof result.bytes === 'number' ? { bytes: result.bytes } : {}),
                        ...(typeof result.format === 'string' ? { format: result.format } : {}),
                        ...(account ? { account } : {}),
                    });
                }
                catch { /* best-effort */ }
            }
            return result;
        }
        catch (e) {
            lastErr = e;
        }
    }
    throw lastErr;
}
