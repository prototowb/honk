#!/usr/bin/env node
import { spawn } from 'child_process';
import { openSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
const __dir = dirname(fileURLToPath(import.meta.url));
const logPath = join(homedir(), '.claude', 'honk-scheduler.log');
const logFd = openSync(logPath, 'a');
const scheduler = spawn(process.execPath, [join(__dir, 'scheduler', 'index.js')], {
    detached: false,
    stdio: ['ignore', logFd, logFd],
});
scheduler.on('error', (err) => {
    process.stderr.write(`[honk] scheduler failed to start: ${err.message}\n`);
});
await import('./run.js');
