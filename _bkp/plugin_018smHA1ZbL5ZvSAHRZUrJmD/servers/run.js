import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

if (!existsSync(join(__dir, 'node_modules', '@modelcontextprotocol'))) {
  process.stderr.write('[social-publisher] Installing dependencies...\n');
  execSync('npm install --silent', { cwd: __dir, stdio: 'pipe' });
  process.stderr.write('[social-publisher] Dependencies ready.\n');
}

// ─── Load credentials from a .env file ────────────────────────────────────
// Checked in priority order:
//   1. %USERPROFILE%\.claude\social-publisher.env  ← stable, survives reinstalls
//   2. .env next to run.js                          ← local dev convenience
//
// Values from the file always win over inherited/substituted env vars,
// bypassing OS-level env cache issues entirely.
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return 0;
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  let count = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
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
  join(homedir(), '.claude', 'social-publisher.env'), // stable, cross-reinstall
  join(__dir, '.env'),                                 // local dev fallback
];

let loaded = false;
for (const loc of envLocations) {
  const n = loadEnvFile(loc);
  if (n > 0) {
    process.stderr.write(`[social-publisher] Loaded ${n} credential(s) from: ${loc}\n`);
    loaded = true;
    break;
  }
}
if (!loaded) {
  process.stderr.write('[social-publisher] No .env file found — relying on inherited environment.\n');
}

await import('./index.js');
