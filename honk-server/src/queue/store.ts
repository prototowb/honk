import { readJsonOr, writeJsonAtomic } from '../lib/jsonstore.js';
import { dataFile } from '../lib/paths.js';
import type { QueueItem } from '../lib/types.js';

// Runtime state — lives in ~/.honk (via dataFile), consistent with the brand kit,
// analytics, followups, and audit log. Never inside the repo/install dir. Resolved
// lazily each call so tests can point HONK_DATA_DIR at a temp dir.
function file(): string { return dataFile('queue.json'); }

function load(): QueueItem[] {
  // readJsonOr backs a corrupt file up beside the store before falling back —
  // the queue holds user drafts, and a silent empty-on-corrupt would let the
  // next save() wipe them (INIT-006).
  return readJsonOr<QueueItem[]>(file(), []);
}

function save(items: QueueItem[]): void {
  writeJsonAtomic(file(), items);
}

function uid(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function add(platform: string, content: Record<string, unknown>, scheduledAt: string | null = null, account = '', status: QueueItem['status'] = 'pending', sponsored = false): QueueItem {
  const items = load();
  const item: QueueItem = {
    id:           uid(),
    platform,
    content,
    account,
    sponsored,
    status,
    scheduled_at: scheduledAt,
    created_at:   new Date().toISOString(),
    published_at: null,
    result:       null,
    error:        null,
  };
  items.push(item);
  save(items);
  return item;
}

export function list(filters: { status?: string; platform?: string } = {}): QueueItem[] {
  let items = load();
  if (filters.status)   items = items.filter(i => i.status   === filters.status);
  if (filters.platform) items = items.filter(i => i.platform === filters.platform);
  return items;
}

export function update(id: string, updates: Partial<QueueItem>): QueueItem {
  const items = load();
  const idx   = items.findIndex(i => i.id === id);
  if (idx === -1) throw new Error(`Queue item not found: ${id}`);
  items[idx] = { ...items[idx], ...updates };
  save(items);
  return items[idx];
}

export function remove(id: string): QueueItem {
  const items = load();
  const idx   = items.findIndex(i => i.id === id);
  if (idx === -1) throw new Error(`Queue item not found: ${id}`);
  const [removed] = items.splice(idx, 1);
  save(items);
  return removed;
}

export function get(id: string): QueueItem {
  const item = load().find(i => i.id === id);
  if (!item) throw new Error(`Queue item not found: ${id}`);
  return item;
}
