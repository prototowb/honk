import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir  = dirname(fileURLToPath(import.meta.url));
const DATA   = join(__dir, 'queue.json');

function load() {
  if (!existsSync(DATA)) return [];
  try { return JSON.parse(readFileSync(DATA, 'utf8')); }
  catch { return []; }
}

function save(items) {
  mkdirSync(dirname(DATA), { recursive: true });
  writeFileSync(DATA, JSON.stringify(items, null, 2));
}

function uid() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function add(platform, content, scheduledAt = null, account = '') {
  const items = load();
  const item = {
    id:           uid(),
    platform,
    content,
    account,
    status:       'pending',
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

export function list(filters = {}) {
  let items = load();
  if (filters.status)   items = items.filter(i => i.status   === filters.status);
  if (filters.platform) items = items.filter(i => i.platform === filters.platform);
  return items;
}

export function update(id, updates) {
  const items = load();
  const idx   = items.findIndex(i => i.id === id);
  if (idx === -1) throw new Error(`Queue item not found: ${id}`);
  items[idx] = { ...items[idx], ...updates };
  save(items);
  return items[idx];
}

export function remove(id) {
  const items = load();
  const idx   = items.findIndex(i => i.id === id);
  if (idx === -1) throw new Error(`Queue item not found: ${id}`);
  const [removed] = items.splice(idx, 1);
  save(items);
  return removed;
}

export function get(id) {
  const item = load().find(i => i.id === id);
  if (!item) throw new Error(`Queue item not found: ${id}`);
  return item;
}
