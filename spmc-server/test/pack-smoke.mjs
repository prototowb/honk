// Pack-smoke — prove the *published tarball* installs and boots with every file
// it needs. Unit tests + build:check run against the source tree, so they cannot
// see a `files`-array omission (e.g. a missing lib/, which crashes the package at
// load with ERR_MODULE_NOT_FOUND). This packs the package exactly as `npm publish`
// would, installs the tarball into a throwaway project so its deps resolve like a
// real install, and boots the bin — turning that one-off failure into a gate.
//
// Run from the spmc-server package dir (npm sets cwd there):  node test/pack-smoke.mjs
// Used by CI and by the `prepublishOnly` publish gate.

import { execSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync }  from 'node:fs';
import { tmpdir }               from 'node:os';
import { join }                 from 'node:path';

function fail(msg, extra = '') {
  console.error(`\n✗ pack-smoke: ${msg}`);
  if (extra) console.error(extra);
  process.exit(1);
}

// npm is a `.cmd` shim on Windows, which Node won't spawn without a shell
// (EINVAL, since the CVE-2024-27980 fix). Drive it through the shell as a command
// string (execSync) — cross-platform, and avoids the shell-true-with-args
// deprecation. Double-quote path args so they survive a space in either shell.
const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'pipe', ...opts });

// 1. Pack the tarball from the current package (cwd = spmc-server).
const tgz = run('npm pack --silent', { encoding: 'utf8' }).trim().split(/\r?\n/).pop();
const tarball = join(process.cwd(), tgz);

// 2. Install it into a throwaway project so its dependencies resolve as on a real
//    `npm install spmc` — not from the source tree's node_modules.
const work = mkdtempSync(join(tmpdir(), 'spmc-pack-'));
try {
  run('npm init -y',              { cwd: work, stdio: 'ignore' });
  run(`npm install "${tarball}"`, { cwd: work, stdio: 'ignore' });

  // 3. Boot the installed bin over stdio with an immediate EOF. A missing shipped
  //    file fails at module load (ERR_MODULE_NOT_FOUND) *before* the server
  //    connects; a healthy boot prints run.js's `[spmc]` startup line to stderr.
  const entry = join(work, 'node_modules', 'spmc', 'run.js');
  const res   = spawnSync(process.execPath, [entry], {
    cwd: work, input: '', encoding: 'utf8', timeout: 15000,
  });
  const err = res.stderr || '';

  if (/ERR_MODULE_NOT_FOUND|Cannot find module/.test(err)) {
    fail('the packaged tarball is missing shipped files — server failed to load.\n' +
         'Check the `files` array in spmc-server/package.json.', err);
  }
  if (!err.includes('[spmc]')) {
    fail('the packaged server did not boot.',
         `--- stderr ---\n${err}\n--- stdout ---\n${res.stdout || ''}`);
  }
  console.log(`✓ pack-smoke: ${tgz} installed and the server booted from it`);
} finally {
  rmSync(work,    { recursive: true, force: true });
  rmSync(tarball, { force: true });
}
