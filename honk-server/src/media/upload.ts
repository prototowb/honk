import { fetchWithTimeout as fetch } from '../lib/http.js';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { basename, extname } from 'path';
import type { UploadResult } from '../lib/types.js';

const VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v']);

function resourceType(name: string): 'video' | 'image' {
  return VIDEO_EXTS.has(extname(name).toLowerCase()) ? 'video' : 'image';
}

function resolveInput(filePathOrBuffer: string | Buffer, filename?: string): { buf: Buffer; name: string } {
  if (Buffer.isBuffer(filePathOrBuffer)) {
    if (!filename) throw new Error('filename required when passing a Buffer');
    return { buf: filePathOrBuffer, name: filename };
  }
  return { buf: readFileSync(filePathOrBuffer), name: basename(filePathOrBuffer) };
}

interface CloudinaryCreds { cloudName: string; apiKey: string; apiSecret: string }
interface CloudinaryResponse { secure_url: string; public_id: string; format: string; bytes: number }
interface ImgbbResponse { success: boolean; data: { url: string }; error?: { message: string } }

export function cloudinaryCreds(account = ''): CloudinaryCreds | null {
  const pfx = account ? `${account.toUpperCase()}__` : '';
  let cloudName = process.env[`${pfx}CLOUDINARY_CLOUD_NAME`];
  let apiKey    = process.env[`${pfx}CLOUDINARY_API_KEY`];
  let apiSecret = process.env[`${pfx}CLOUDINARY_API_SECRET`];

  const url = process.env[`${pfx}CLOUDINARY_URL`];
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

export async function uploadCloudinary(filePathOrBuffer: string | Buffer, account = '', filename?: string): Promise<UploadResult> {
  const creds = cloudinaryCreds(account);
  if (!creds)
    throw new Error(`Cloudinary credentials missing${account ? ` for account "${account}"` : ''}. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET — or a single CLOUDINARY_URL.`);
  const { cloudName, apiKey, apiSecret } = creds;

  const { buf, name } = resolveInput(filePathOrBuffer, filename);
  const type          = resourceType(name);
  const timestamp     = Math.round(Date.now() / 1000);
  const signature     = createHash('sha1')
    .update(`timestamp=${timestamp}${apiSecret}`)
    .digest('hex');

  const form = new FormData();
  form.append('file',      new Blob([new Uint8Array(buf.buffer as ArrayBuffer, buf.byteOffset, buf.byteLength)]), name);
  form.append('api_key',   apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${type}/upload`,
    { method: 'POST', body: form },
  );
  if (!res.ok) throw new Error(`Cloudinary ${res.status}: ${await res.text()}`);

  const data = await res.json() as CloudinaryResponse;
  return { url: data.secure_url, provider: 'cloudinary', public_id: data.public_id, resource: type, format: data.format, bytes: data.bytes };
}

export async function uploadImgbb(filePathOrBuffer: string | Buffer, account = '', filename?: string): Promise<UploadResult> {
  const pfx    = account ? `${account.toUpperCase()}__` : '';
  const apiKey = process.env[`${pfx}IMGBB_API_KEY`];

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

  const json = await res.json() as ImgbbResponse;
  if (!json.success) throw new Error(`imgbb error: ${json.error?.message ?? JSON.stringify(json)}`);

  return { url: json.data.url, provider: 'imgbb', resource: 'image' };
}

// Accepts (filePathOrBuffer, provider, account) for normal use, or
// (null, provider, account, buffer, filename) from compose.ts internally.
export async function upload(filePathOrBuffer: string | Buffer | null, provider: string | null = null, account = '', _buf?: Buffer, _filename?: string): Promise<UploadResult> {
  const input = filePathOrBuffer ?? _buf!;
  const fname = _filename ?? (typeof filePathOrBuffer === 'string' ? basename(filePathOrBuffer) : undefined);
  const name  = fname ?? 'upload';

  const pfx = account ? `${account.toUpperCase()}__` : '';
  const hasCloudinary = !!cloudinaryCreds(account);
  const hasImgbb      = !!process.env[`${pfx}IMGBB_API_KEY`];

  let order: string[];
  if (provider) {
    order = [provider];
  } else if (resourceType(name) === 'video') {
    order = hasCloudinary ? ['cloudinary'] : [];
  } else {
    order = ([hasImgbb && 'imgbb', hasCloudinary && 'cloudinary'] as (string | false)[]).filter(Boolean) as string[];
  }
  if (order.length === 0)
    throw new Error('No media provider configured. Set IMGBB_API_KEY or CLOUDINARY_URL / CLOUDINARY_* in your env.');

  let lastErr: unknown;
  for (const p of order) {
    try {
      if (p === 'cloudinary') return await uploadCloudinary(input, account, fname);
      if (p === 'imgbb')      return await uploadImgbb(input, account, fname);
      throw new Error(`Unknown provider: ${p}. Supported: cloudinary, imgbb`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}
