#!/usr/bin/env node
import { existsSync, readFileSync } from 'fs';
import { dirname, join }            from 'path';
import { homedir }                  from 'os';
import { fileURLToPath }            from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

// ─── Load credentials from a .env file ────────────────────────────────────
// Priority order:
//   1. %USERPROFILE%\.claude\honk.env  ← stable, survives plugin reinstalls
//   2. %USERPROFILE%\.claude\spmc.env  ← legacy name (rename to honk.env)
//   3. .env next to run.js             ← local dev fallback
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return 0;
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  let count = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key   = trimmed.slice(0, eq).trim();
    let   value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
    count++;
  }
  return count;
}

const envLocations = [
  join(homedir(), '.claude', 'honk.env'), // stable cross-reinstall location
  join(homedir(), '.claude', 'spmc.env'), // legacy name — rename to honk.env
  join(__dir, '.env'),                    // local dev fallback
];

let loaded = false;
for (const loc of envLocations) {
  const n = loadEnvFile(loc);
  if (n > 0) {
    process.stderr.write(`[honk] Loaded ${n} credential(s) from: ${loc}\n`);
    loaded = true;
    break;
  }
}
if (!loaded) {
  process.stderr.write('[honk] No .env file found — relying on inherited environment.\n');
}

await import('./index.js');
