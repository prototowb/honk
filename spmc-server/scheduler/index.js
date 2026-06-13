import { execSync }              from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { dirname, join }           from 'path';
import { homedir }                 from 'os';
import { fileURLToPath }           from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

if (!existsSync(join(__dir, '..', 'node_modules', '@modelcontextprotocol'))) {
  process.stderr.write('[spmc-scheduler] Installing dependencies...\n');
  execSync('npm install --silent', { cwd: join(__dir, '..'), stdio: 'pipe' });
}

// ─── Credential loading (same pattern as run.js) ──────────────────────────

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
        (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] = value;
    count++;
  }
  return count;
}

for (const loc of [join(homedir(), '.claude', 'spmc.env'), join(__dir, '..', '.env')]) {
  if (loadEnvFile(loc) > 0) break;
}

await import('./scheduler.js');
