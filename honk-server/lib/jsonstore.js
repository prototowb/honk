// Durable JSON state writes (INIT-006).
//
// Every runtime store (~/.honk/*.json) used a bare writeFileSync — a crash or
// full disk mid-write leaves a truncated file, and the loaders' silent
// `catch { return [] }` would then treat the store as EMPTY, so the next save
// would wipe it (the queue holds user drafts — real data loss). Two fixes:
//
// 1. writeJsonAtomic — write to a sibling tmp file, then rename() over the
//    target. Rename is atomic on the same filesystem, so readers see either
//    the old state or the new state, never a torn write.
// 2. readJsonOr — on a parse failure, back the corrupt file up beside the
//    store (`<file>.corrupt-<ts>`) before falling back, so nothing is
//    silently destroyed and the evidence survives for recovery.
import { readFileSync, writeFileSync, renameSync, existsSync } from 'fs';
export function writeJsonAtomic(path, data) {
    const tmp = `${path}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(data, null, 2));
    renameSync(tmp, path);
}
export function readJsonOr(path, fallback) {
    if (!existsSync(path))
        return fallback;
    let raw;
    try {
        raw = readFileSync(path, 'utf8');
    }
    catch {
        return fallback;
    }
    try {
        return JSON.parse(raw);
    }
    catch {
        const backup = `${path}.corrupt-${Date.now()}`;
        try {
            writeFileSync(backup, raw);
            process.stderr.write(`[honk] ${path} is corrupt — backed up to ${backup}; starting from an empty store.\n`);
        }
        catch { /* the backup is best-effort; never take the caller down */ }
        return fallback;
    }
}
// ── Versioned stores (INIT-008, the H0 data-compatibility promise) ───────────
//
// Tracking stores are persisted as { schema_version, items } so a future format
// change is DETECTABLE instead of a silent misparse. Legacy bare shapes (the
// pre-versioning array/object written directly to the file) are read
// transparently and upgraded on the next save — no migration step for users.
//
// Deliberately NOT applied to brand.json / brand-active.json: their recorded
// contract (INDIV-006) is a flat, portable, user-owned map — flatness IS their
// compatibility promise, so wrapping them would break it.
export const STORE_SCHEMA_VERSION = 1;
function isVersioned(v) {
    return typeof v === 'object' && v !== null && !Array.isArray(v)
        && typeof v.schema_version === 'number'
        && 'items' in v;
}
// Read a versioned store; accepts the legacy bare shape. A file written by a
// NEWER version is forward-read best-effort with a warning (never destroyed —
// corrupt-backup semantics stay in readJsonOr).
export function readVersioned(path, fallback) {
    const raw = readJsonOr(path, null);
    if (raw === null)
        return fallback;
    if (isVersioned(raw)) {
        if (raw.schema_version > STORE_SCHEMA_VERSION) {
            process.stderr.write(`[honk] ${path} was written by a newer version (schema ${raw.schema_version} > ${STORE_SCHEMA_VERSION}) — reading best-effort.\n`);
        }
        return raw.items;
    }
    return raw; // legacy bare shape — upgraded on next save
}
export function writeVersionedAtomic(path, items) {
    writeJsonAtomic(path, { schema_version: STORE_SCHEMA_VERSION, items });
}
