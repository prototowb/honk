import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dir = dirname(fileURLToPath(import.meta.url));

// Runtime state (audit log, rate-limit + analytics stores) lives here. Not part
// of the npm package and gitignored — see package.json `files` and .gitignore.
export const DATA_DIR = join(__dir, '..', 'data');

// Tests point this at a temp dir via SPMC_DATA_DIR to avoid touching real state.
function resolveDir() {
  return process.env.SPMC_DATA_DIR || DATA_DIR;
}

export function dataFile(name) {
  const dir = resolveDir();
  mkdirSync(dir, { recursive: true });
  return join(dir, name);
}
