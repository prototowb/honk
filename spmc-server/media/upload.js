import crypto          from 'crypto';
import { readFileSync } from 'fs';
import { basename, extname } from 'path';

const VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v']);

function resourceType(name) {
  return VIDEO_EXTS.has(extname(name).toLowerCase()) ? 'video' : 'image';
}

// Accepts a file path (string) or an in-memory Buffer + explicit filename.
function resolveInput(filePathOrBuffer, filename) {
  if (Buffer.isBuffer(filePathOrBuffer)) {
    if (!filename) throw new Error('filename required when passing a Buffer');
    return { buf: filePathOrBuffer, name: filename };
  }
  return { buf: readFileSync(filePathOrBuffer), name: basename(filePathOrBuffer) };
}

// ─── Cloudinary ───────────────────────────────────────────────────────────

// Resolves Cloudinary creds from either the three discrete vars or the standard
// CLOUDINARY_URL one-liner (cloudinary://api_key:api_secret@cloud_name). The
// discrete vars win where set; the URL fills any gaps. Returns null if neither
// path yields a complete credential. (Single var supported for __ACCOUNT too.)
export function cloudinaryCreds(account = '') {
  const sfx = account ? `__${account.toUpperCase()}` : '';
  let cloudName = process.env[`CLOUDINARY_CLOUD_NAME${sfx}`];
  let apiKey    = process.env[`CLOUDINARY_API_KEY${sfx}`];
  let apiSecret = process.env[`CLOUDINARY_API_SECRET${sfx}`];

  const url = process.env[`CLOUDINARY_URL${sfx}`];
  if (url && (!cloudName || !apiKey || !apiSecret)) {
    const m = url.trim().match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (m) {
      apiKey    = apiKey    || decodeURIComponent(m[1]);
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
  const type          = resourceType(name);
  const timestamp     = Math.round(Date.now() / 1000);
  const signature     = crypto.createHash('sha1')
    .update(`timestamp=${timestamp}${apiSecret}`)
    .digest('hex');

  const form = new FormData();
  form.append('file',      new Blob([buf]), name);
  form.append('api_key',   apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${type}/upload`,
    { method: 'POST', body: form },
  );
  if (!res.ok) throw new Error(`Cloudinary ${res.status}: ${await res.text()}`);

  const data = await res.json();
  return { url: data.secure_url, provider: 'cloudinary', public_id: data.public_id, resource: type, format: data.format, bytes: data.bytes };
}

// ─── imgbb (images only) ──────────────────────────────────────────────────

export async function uploadImgbb(filePathOrBuffer, account = '', filename) {
  const sfx    = account ? `__${account.toUpperCase()}` : '';
  const apiKey = process.env[`IMGBB_API_KEY${sfx}`];

  if (!apiKey)
    throw new Error(`imgbb credentials missing${account ? ` for account "${account}"` : ''}. Set IMGBB_API_KEY.`);

  const { buf, name } = resolveInput(filePathOrBuffer, filename);

  if (resourceType(name) === 'video')
    throw new Error('imgbb does not support video. Use Cloudinary for video.');

  const form = new FormData();
  form.append('key',   apiKey);
  form.append('image', buf.toString('base64'));

  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
  if (!res.ok) throw new Error(`imgbb ${res.status}: ${await res.text()}`);

  const json = await res.json();
  if (!json.success) throw new Error(`imgbb error: ${json.error?.message ?? JSON.stringify(json)}`);

  return { url: json.data.url, provider: 'imgbb', resource: 'image' };
}

// ─── Auto-select provider ─────────────────────────────────────────────────

export async function upload(filePathOrBuffer, provider = null, account = '', _buf, _filename) {
  // Internal: compose.js passes (null, provider, account, buffer, filename)
  const input = filePathOrBuffer ?? _buf;
  const fname = _filename ?? (typeof filePathOrBuffer === 'string' ? basename(filePathOrBuffer) : undefined);
  const name  = fname ?? 'upload';

  const sfx = account ? `__${account.toUpperCase()}` : '';
  const hasCloudinary = !!cloudinaryCreds(account);
  const hasImgbb      = !!process.env[`IMGBB_API_KEY${sfx}`];

  // Selection order. Images: imgbb is primary (more generous free tier),
  // Cloudinary the fallback. Video: Cloudinary only (imgbb can't do video).
  // An explicit provider bypasses auto-select (and its fallback).
  let order;
  if (provider) {
    order = [provider];
  } else if (resourceType(name) === 'video') {
    order = hasCloudinary ? ['cloudinary'] : [];
  } else {
    order = [hasImgbb && 'imgbb', hasCloudinary && 'cloudinary'].filter(Boolean);
  }
  if (order.length === 0)
    throw new Error('No media provider configured. Set IMGBB_API_KEY or CLOUDINARY_URL / CLOUDINARY_* in your env.');

  let lastErr;
  for (const p of order) {
    try {
      if (p === 'cloudinary') return await uploadCloudinary(input, account, fname);
      if (p === 'imgbb')      return await uploadImgbb(input, account, fname);
      throw new Error(`Unknown provider: ${p}. Supported: cloudinary, imgbb`);
    } catch (e) {
      lastErr = e;            // try the next configured provider (fallback)
    }
  }
  throw lastErr;
}
