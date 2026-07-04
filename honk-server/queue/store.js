import { readVersioned, writeVersionedAtomic } from '../lib/jsonstore.js';
import { dataFile } from '../lib/paths.js';
// Runtime state — lives in ~/.honk (via dataFile), consistent with the brand kit,
// analytics, followups, and audit log. Never inside the repo/install dir. Resolved
// lazily each call so tests can point HONK_DATA_DIR at a temp dir.
function file() { return dataFile('queue.json'); }
function load() {
    // Corrupt files are backed up beside the store before falling back (INIT-006);
    // the store is { schema_version, items } with legacy bare arrays read
    // transparently and upgraded on next save (INIT-008).
    return readVersioned(file(), []);
}
function save(items) {
    writeVersionedAtomic(file(), items);
}
function uid() {
    return `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
export function add(platform, content, scheduledAt = null, account = '', status = 'pending', sponsored = false) {
    const items = load();
    const item = {
        id: uid(),
        platform,
        content,
        account,
        sponsored,
        status,
        scheduled_at: scheduledAt,
        created_at: new Date().toISOString(),
        published_at: null,
        result: null,
        error: null,
    };
    items.push(item);
    save(items);
    return item;
}
export function list(filters = {}) {
    let items = load();
    if (filters.status)
        items = items.filter(i => i.status === filters.status);
    if (filters.platform)
        items = items.filter(i => i.platform === filters.platform);
    return items;
}
export function update(id, updates) {
    const items = load();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1)
        throw new Error(`Queue item not found: ${id}`);
    items[idx] = { ...items[idx], ...updates };
    save(items);
    return items[idx];
}
export function remove(id) {
    const items = load();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1)
        throw new Error(`Queue item not found: ${id}`);
    const [removed] = items.splice(idx, 1);
    save(items);
    return removed;
}
export function get(id) {
    const item = load().find(i => i.id === id);
    if (!item)
        throw new Error(`Queue item not found: ${id}`);
    return item;
}
