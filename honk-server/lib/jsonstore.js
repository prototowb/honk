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
