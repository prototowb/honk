// Asset registry v1 — the DAM seed (INIT-013, pulled forward from H2).
//
// Every media output (media_upload / media_compose) is recorded here so the
// brand's media library is queryable from day one: id, provider URL(s),
// content hash, dimensions, rights/expiry note, and USAGE PER POST — the
// research takeaway (ROADMAP_NOTES R2): retro-fitting usage tracking is what
// makes DAMs miserable, so it ships with the seed.
//
// Design:
// - Versioned tracking store (INIT-008 contract): assets.json as
//   { schema_version, items } via readVersioned/writeVersionedAtomic.
// - Dedupe by CONTENT HASH at register time (hash.ts pattern): re-uploading
//   identical bytes under a new URL extends the existing asset's url list
//   instead of minting a duplicate. URL is the fallback key when no hash is
//   available (e.g. brand-kit logo refs registered from a URL only).
// - Registration and usage recording are BEST-EFFORT at their call sites:
//   a registry failure must never fail an upload or a live publish.
// - Rights/expiry are plain fields + a deterministic WARN (content_check +
//   dispatch summary) — never a block; the agent/user decides (cheap, unique
//   vs the incumbents — Bynder-class gating without the ceremony).

import { createHash } from 'crypto';
import { dataFile } from './paths.js';
import { readVersioned, writeVersionedAtomic } from './jsonstore.js';

const STORE = () => dataFile('assets.json');

export interface AssetUsage {
  platform: string;
  post_id?: string;
  account?: string;
  at: string; // ISO timestamp
}

export interface AssetRights {
  note?: string;
  expires_at?: string; // ISO date/timestamp — after this, publishing warns
}

export interface Asset {
  id: string;                 // ast_<hash16> (or ast_u<urlhash16> when hash-less)
  hash?: string;              // sha256 (16-hex prefix) of the media bytes
  url: string;                // most recent public URL
  urls: string[];             // every URL this content has been uploaded to
  provider?: string;
  source: 'upload' | 'compose' | 'brand-kit' | 'manual';
  template?: string;          // compose template id (source: compose)
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  account?: string;           // brand account context at registration
  created_at: string;
  rights?: AssetRights;
  tags: string[];
  usage: AssetUsage[];
}

function load(): Asset[] {
  return readVersioned<Asset[]>(STORE(), []);
}

function save(items: Asset[]): void {
  writeVersionedAtomic(STORE(), items);
}

export function hashBuffer(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex').slice(0, 16);
}

function urlKey(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 16);
}

export interface RegisterInput {
  url: string;
  hash?: string;              // pass hashBuffer(buf) when the bytes are at hand
  provider?: string;
  source: Asset['source'];
  template?: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  account?: string;
  tags?: string[];
  rights?: AssetRights;
}

// Register (or dedupe onto) an asset. Dedupe key: content hash when given,
// exact URL otherwise. Returns the asset and whether it was deduped.
export function register(input: RegisterInput): { asset: Asset; deduped: boolean } {
  if (!input.url) throw new Error('asset register needs a url');
  const items = load();

  const existing = items.find(a =>
    (input.hash && a.hash === input.hash) || a.urls.includes(input.url));

  if (existing) {
    if (!existing.urls.includes(input.url)) existing.urls.push(input.url);
    existing.url = input.url;
    // Fill gaps only — never clobber recorded facts on a dedupe.
    if (!existing.hash && input.hash) existing.hash = input.hash;
    if (!existing.provider && input.provider) existing.provider = input.provider;
    if (!existing.width && input.width) existing.width = input.width;
    if (!existing.height && input.height) existing.height = input.height;
    if (!existing.bytes && input.bytes) existing.bytes = input.bytes;
    if (!existing.format && input.format) existing.format = input.format;
    if (!existing.template && input.template) existing.template = input.template;
    for (const t of input.tags ?? []) if (!existing.tags.includes(t)) existing.tags.push(t);
    save(items);
    return { asset: existing, deduped: true };
  }

  const asset: Asset = {
    id: input.hash ? `ast_${input.hash}` : `ast_u${urlKey(input.url)}`,
    ...(input.hash ? { hash: input.hash } : {}),
    url: input.url,
    urls: [input.url],
    ...(input.provider ? { provider: input.provider } : {}),
    source: input.source,
    ...(input.template ? { template: input.template } : {}),
    ...(input.width ? { width: input.width } : {}),
    ...(input.height ? { height: input.height } : {}),
    ...(input.bytes ? { bytes: input.bytes } : {}),
    ...(input.format ? { format: input.format } : {}),
    ...(input.account ? { account: input.account } : {}),
    created_at: new Date().toISOString(),
    ...(input.rights ? { rights: input.rights } : {}),
    tags: input.tags ?? [],
    usage: [],
  };
  items.push(asset);
  save(items);
  return { asset, deduped: false };
}

export interface ListFilter {
  source?: Asset['source'];
  tag?: string;
  account?: string;
  template?: string;
  expired?: boolean;   // true → only expired; false → only non-expired
  used?: boolean;      // true → only assets with recorded usage; false → unused
}

export function isExpired(a: Asset, now = Date.now()): boolean {
  if (!a.rights?.expires_at) return false;
  const t = Date.parse(a.rights.expires_at);
  return Number.isFinite(t) && t < now;
}

export function list(filter: ListFilter = {}): Asset[] {
  let items = load();
  if (filter.source)   items = items.filter(a => a.source === filter.source);
  if (filter.tag)      items = items.filter(a => a.tags.includes(filter.tag!));
  if (filter.account)  items = items.filter(a => (a.account ?? '') === filter.account);
  if (filter.template) items = items.filter(a => a.template === filter.template);
  if (filter.expired !== undefined) items = items.filter(a => isExpired(a) === filter.expired);
  if (filter.used !== undefined)    items = items.filter(a => (a.usage.length > 0) === filter.used);
  return items.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// Find one asset by id, content hash, or any of its URLs.
export function find(ref: string): Asset | null {
  const items = load();
  return items.find(a => a.id === ref || a.hash === ref || a.urls.includes(ref)) ?? null;
}

export interface UpdateInput {
  rights_note?: string;
  rights_expires_at?: string;
  add_tags?: string[];
  remove_tags?: string[];
}

export function update(ref: string, changes: UpdateInput): Asset {
  const items = load();
  const a = items.find(x => x.id === ref || x.hash === ref || x.urls.includes(ref));
  if (!a) throw new Error(`No asset matches '${ref}' (id, hash, or URL).`);
  if (changes.rights_note !== undefined || changes.rights_expires_at !== undefined) {
    a.rights = { ...(a.rights ?? {}) };
    if (changes.rights_note !== undefined)       a.rights.note = changes.rights_note;
    if (changes.rights_expires_at !== undefined) {
      if (changes.rights_expires_at && !Number.isFinite(Date.parse(changes.rights_expires_at)))
        throw new Error(`rights_expires_at '${changes.rights_expires_at}' is not a parseable date.`);
      a.rights.expires_at = changes.rights_expires_at;
    }
  }
  for (const t of changes.add_tags ?? [])    if (!a.tags.includes(t)) a.tags.push(t);
  for (const t of changes.remove_tags ?? []) a.tags = a.tags.filter(x => x !== t);
  save(items);
  return a;
}

// Media URLs a publish payload references (the shapes the posting tools take).
export function extractMediaUrls(content: Record<string, unknown>): string[] {
  const urls: string[] = [];
  if (typeof content.image_url === 'string' && content.image_url) urls.push(content.image_url);
  if (Array.isArray(content.image_urls)) for (const u of content.image_urls) if (typeof u === 'string' && u) urls.push(u);
  if (typeof content.video_url === 'string' && content.video_url) urls.push(content.video_url);
  return urls;
}

// Append a usage record to every registered asset the publish referenced.
// Returns how many assets matched (0 is fine — unregistered media is legal).
export function recordUsage(urls: string[], usage: AssetUsage): number {
  if (!urls.length) return 0;
  const items = load();
  let hits = 0;
  for (const a of items) {
    if (urls.some(u => a.urls.includes(u))) {
      a.usage.push(usage);
      hits++;
    }
  }
  if (hits) save(items);
  return hits;
}

// Deterministic expiry warnings for a publish payload (content_check + the
// dispatch summary). Warn, never block — rights judgment stays with the user.
export function expiryWarnings(urls: string[]): string[] {
  if (!urls.length) return [];
  const out: string[] = [];
  for (const a of list()) {
    if (isExpired(a) && urls.some(u => a.urls.includes(u))) {
      out.push(`Asset ${a.id} is past its rights expiry (${a.rights!.expires_at})${a.rights!.note ? ` — ${a.rights!.note}` : ''}. Confirm you may still publish it.`);
    }
  }
  return out;
}

// ── Formatting (tool surface) ────────────────────────────────────────────────

export function formatAsset(a: Asset): string {
  const dims = a.width && a.height ? ` ${a.width}×${a.height}` : '';
  const size = a.bytes ? ` ${(a.bytes / 1024).toFixed(1)}KB` : '';
  const lines = [
    `${a.id} [${a.source}${a.template ? `:${a.template}` : ''}]${dims}${size}${a.format ? ` ${a.format}` : ''}`,
    `  url: ${a.url}${a.urls.length > 1 ? ` (+${a.urls.length - 1} more)` : ''}`,
    `  created: ${a.created_at}${a.account ? ` · account: ${a.account}` : ''}${a.tags.length ? ` · tags: ${a.tags.join(', ')}` : ''}`,
  ];
  if (a.rights?.note || a.rights?.expires_at) {
    lines.push(`  rights: ${a.rights.note ?? ''}${a.rights.expires_at ? ` (expires ${a.rights.expires_at}${isExpired(a) ? ' — EXPIRED' : ''})` : ''}`);
  }
  lines.push(a.usage.length
    ? `  used ${a.usage.length}×: ${a.usage.slice(-3).map(u => `${u.platform}${u.post_id ? `#${u.post_id}` : ''} @ ${u.at}`).join(' · ')}${a.usage.length > 3 ? ' …' : ''}`
    : `  never published`);
  return lines.join('\n');
}

export function formatAssets(items: Asset[]): string {
  if (!items.length) return 'No assets registered yet. media_compose / media_upload outputs are registered automatically.';
  return [`${items.length} asset(s):`, '', ...items.map(formatAsset)].join('\n');
}
