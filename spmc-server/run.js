import { execSync }                        from 'child_process';
import { existsSync, readFileSync }         from 'fs';
import { dirname, join }                    from 'path';
import { homedir }                          from 'os';
import { fileURLToPath }                    from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

if (!existsSync(join(__dir, 'node_modules', '@modelcontextprotocol'))) {
  process.stderr.write('[spmc] Installing dependencies...\n');
  execSync('npm install --silent', { cwd: __dir, stdio: 'pipe' });
  process.stderr.write('[spmc] Dependencies ready.\n');
}

// ─── Load credentials from a .env file ────────────────────────────────────
// Priority order:
//   1. %USERPROFILE%\.claude\spmc.env  ← stable, survives plugin reinstalls
//   2. .env next to run.js             ← local dev fallback
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
  join(homedir(), '.claude', 'spmc.env'), // stable cross-reinstall location
  join(__dir, '.env'),                    // local dev fallback
];

let loaded = false;
for (const loc of envLocations) {
  const n = loadEnvFile(loc);
  if (n > 0) {
    process.stderr.write(`[spmc] Loaded ${n} credential(s) from: ${loc}\n`);
    loaded = true;
    break;
  }
}
if (!loaded) {
  process.stderr.write('[spmc] No .env file found — relying on inherited environment.\n');
}

await import('./index.js');
