// End-to-end smoke test: spawns the real MCP server (index.js) over stdio,
// lists tools, and calls the deterministic (credential-free) tools. Exercises
// the actual server dispatch path, not the modules in isolation.
//
// Run: node test/smoke.mjs

import { Client }              from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdtempSync }   from 'fs';
import { tmpdir }        from 'os';

const __dir      = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dir, '..', 'index.js');

let failures = 0;
const check = (label, cond) => {
  console.log(`${cond ? '✓' : '✗'} ${label}`);
  if (!cond) failures++;
};

const transport = new StdioClientTransport({
  command: process.execPath,
  args:    [serverPath],
  // Isolate audit/state writes to a throwaway dir.
  env:     { ...process.env, SPMC_DATA_DIR: mkdtempSync(join(tmpdir(), 'spmc-smoke-')) },
});

const client = new Client({ name: 'smoke', version: '0' }, { capabilities: {} });
await client.connect(transport);

const { tools } = await client.listTools();
const names = tools.map(t => t.name);
console.log(`\nServer exposes ${tools.length} tools:\n  ${names.join('\n  ')}\n`);

const text = (r) => r.content.map(c => c.text).join('\n');

// content_validate — pure, no credentials.
{
  const r = await client.callTool({ name: 'content_validate', arguments: { platform: 'x', content: { text: 'hello world' } } });
  check('content_validate accepts a short tweet', !r.isError && /valid|ok|pass/i.test(text(r)));

  const long = 'x'.repeat(400);
  const r2 = await client.callTool({ name: 'content_validate', arguments: { platform: 'x', content: { text: long } } });
  check('content_validate flags an over-limit tweet', /280|exceed|too long|invalid/i.test(text(r2)));
}

// content_adapt — pure.
{
  const r = await client.callTool({ name: 'content_adapt', arguments: { text: 'Launch day is here. '.repeat(40), platforms: ['x', 'bluesky'] } });
  check('content_adapt returns variants', !r.isError && /x|bluesky/i.test(text(r)));
}

// config_doctor — reads env presence only.
{
  const r = await client.callTool({ name: 'config_doctor', arguments: {} });
  check('config_doctor reports configuration', !r.isError && /platform|configured|missing/i.test(text(r)));
}

// dry_run publish — validates + routes without hitting an API.
{
  const r = await client.callTool({ name: 'bluesky_post', arguments: { text: 'dry run test', dry_run: true } });
  check('bluesky_post dry_run previews without publishing', !r.isError && /dry run/i.test(text(r)));
}

// audit_log — the dry-run above should be recorded.
{
  const r = await client.callTool({ name: 'audit_log', arguments: { status: 'dry_run' } });
  check('audit_log records the dry-run', !r.isError && /dry_run/.test(text(r)));
}

// schedule_check — normalizes a tz-aware timestamp, rejects a naive one.
{
  const good = await client.callTool({ name: 'schedule_check', arguments: { scheduled_at: '2026-06-15T09:00:00-04:00' } });
  check('schedule_check normalizes to UTC', !good.isError && /2026-06-15T13:00:00\.000Z/.test(text(good)));
  const bad = await client.callTool({ name: 'schedule_check', arguments: { scheduled_at: '2026-06-15T09:00:00' } });
  check('schedule_check rejects a naive timestamp', bad.isError && /timezone/i.test(text(bad)));
}

// observability tools respond cleanly with no data yet.
{
  const rl = await client.callTool({ name: 'rate_limits', arguments: {} });
  check('rate_limits responds', !rl.isError);
  const ar = await client.callTool({ name: 'analytics_report', arguments: {} });
  check('analytics_report responds', !ar.isError);
}

// queue add/list/remove round-trip.
{
  const add = await client.callTool({ name: 'queue_add', arguments: { platform: 'bluesky', content: { text: 'queued' } } });
  const id  = (text(add).match(/ID:\s*(\S+)/) || [])[1];
  check('queue_add returns an id', !!id);
  const list = await client.callTool({ name: 'queue_list', arguments: {} });
  check('queue_list shows the item', text(list).includes(id));
  if (id) await client.callTool({ name: 'queue_remove', arguments: { id } });
}

await client.close();
console.log(`\n${failures === 0 ? 'SMOKE PASS' : `SMOKE FAIL (${failures})`}`);
process.exit(failures === 0 ? 0 : 1);
