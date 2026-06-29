import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { homedir } from 'os';

const __dir = dirname(fileURLToPath(import.meta.url));

// Runtime state (brand kit, audit log, analytics, rate-limit stores) lives in
// ~/.honk by default — user-specific, outside the repo. Override with
// HONK_DATA_DIR for local dev or tests (test suite points at a temp dir).
export const DATA_DIR = join(homedir(), '.honk');

// Tests point this at a temp dir via HONK_DATA_DIR to avoid touching real state.
function resolveDir() {
  return process.env.HONK_DATA_DIR || DATA_DIR;
}

export function dataFile(name) {
  const dir = resolveDir();
  mkdirSync(dir, { recursive: true });
  return join(dir, name);
}
