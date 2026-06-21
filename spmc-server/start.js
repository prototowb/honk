#!/usr/bin/env node
/**
 * Starts the SPMC scheduler in a detached child process, then
 * hands off to run.js (MCP server via stdio). Claude Desktop only
 * gets the stdio pipe from this process — the scheduler logs to a
 * side-file so it doesn't corrupt the MCP stream.
 */
import { spawn }               from 'child_process';
import { openSync }             from 'fs';
import { dirname, join }        from 'path';
import { fileURLToPath }        from 'url';
import { homedir }              from 'os';

const __dir = dirname(fileURLToPath(import.meta.url));

// ─── Start scheduler as detached child ────────────────────────────────────

const logPath = join(homedir(), '.claude', 'spmc-scheduler.log');
const logFd   = openSync(logPath, 'a');  // open file → real fd, safe to pass to spawn

const scheduler = spawn(process.execPath, [join(__dir, 'scheduler', 'index.js')], {
  detached: false,
  stdio: ['ignore', logFd, logFd],
});

scheduler.on('error', err => {
  process.stderr.write(`[spmc] scheduler failed to start: ${err.message}\n`);
});

// ─── Start MCP server (takes over stdio) ──────────────────────────────────

await import('./run.js');
