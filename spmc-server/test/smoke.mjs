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

// alt_text + first_comment surface in the dry-run preview (no network).
{
  const r = await client.callTool({ name: 'instagram_post', arguments: {
    caption: 'hi', image_url: 'https://example.com/p.jpg',
    alt_text: 'a labrador on a beach', first_comment: '#dogs #beach', dry_run: true,
  } });
  check('instagram_post dry_run shows alt_text + first_comment',
    !r.isError && /alt text/i.test(text(r)) && /first comment/i.test(text(r)));
}

// first_comment is rejected on a platform with no comments edge (via content_validate,
// which takes an arbitrary content object — the direct tools don't expose the field).
{
  const r = await client.callTool({ name: 'content_validate', arguments: { platform: 'bluesky', content: { text: 'hi', first_comment: 'x' } } });
  check('content_validate rejects first_comment on bluesky', !r.isError && /does not support a first comment/i.test(text(r)));
}

// audit_log — the dry-run above should be recorded.
{
  const r = await client.callTool({ name: 'audit_log', arguments: { status: 'dry_run' } });
  check('audit_log records the dry-run', !r.isError && /dry_run/.test(text(r)));
}

// schedule_check — normalizes a tz-aware timestamp, warns on a naive one.
{
  const good = await client.callTool({ name: 'schedule_check', arguments: { scheduled_at: '2026-06-15T09:00:00-04:00' } });
  check('schedule_check normalizes to UTC', !good.isError && /2026-06-15T13:00:00\.000Z/.test(text(good)));
  const naive = await client.callTool({ name: 'schedule_check', arguments: { scheduled_at: '2026-06-15T09:00:00' } });
  check('schedule_check warns (not errors) on a naive timestamp', !naive.isError && /timezone|local time/i.test(text(naive)));
  const bad = await client.callTool({ name: 'schedule_check', arguments: { scheduled_at: 'not-a-real-date' } });
  check('schedule_check rejects an invalid timestamp', bad.isError && /valid/i.test(text(bad)));
}

// observability tools respond cleanly with no data yet.
{
  const rl = await client.callTool({ name: 'rate_limits', arguments: {} });
  check('rate_limits responds', !rl.isError);
  const ar = await client.callTool({ name: 'analytics_report', arguments: {} });
  check('analytics_report responds', !ar.isError);
}

// brand_voice get/set round-trip — pure, no credentials.
{
  const empty = await client.callTool({ name: 'brand_voice', arguments: { action: 'get' } });
  check('brand_voice get reports no profile initially', !empty.isError && /no brand profile/i.test(text(empty)));
  const set = await client.callTool({ name: 'brand_voice', arguments: { action: 'set', profile: { voice: { tone: 'concise' } } } });
  check('brand_voice set stores and renders the profile', !set.isError && /voice\.tone:\s*concise/i.test(text(set)));
  const got = await client.callTool({ name: 'brand_voice', arguments: { action: 'get' } });
  check('brand_voice get reads it back', !got.isError && /concise/.test(text(got)));
}

// brand_voice per-platform resolution — base merged with a platform delta, and
// the resolved view is a superset that still carries the global voice fields.
{
  await client.callTool({ name: 'brand_voice', arguments: { action: 'set', profile: { voice: { tone: 'concise', banned_words: ['synergy'] }, hashtags: { sets: { launch: ['#go'] } }, platforms: { x: { tone: 'punchier' } } } } });
  const r = await client.callTool({ name: 'brand_voice', arguments: { action: 'get', platform: 'x' } });
  const t = text(r);
  check('brand_voice get platform:x resolves the per-platform override',
    !r.isError && /Effective voice for x/i.test(t) && /punchier/.test(t) && /platform override/i.test(t));
  check('brand_voice get platform:x still surfaces global banned words + hashtag sets',
    /synergy/.test(t) && /launch/.test(t));
}

// link_tag — deterministic, no credentials.
{
  const r = await client.callTool({ name: 'link_tag', arguments: { url: 'https://example.com/p?ref=home', params: { utm_campaign: 'launch' }, platform: 'x' } });
  check('link_tag returns a tagged URL preserving existing query', !r.isError && /utm_campaign=launch/.test(text(r)) && /ref=home/.test(text(r)));
}

// best_time — deterministic research baseline, no credentials.
{
  const r = await client.callTool({ name: 'best_time', arguments: { platform: 'instagram', count: 3 } });
  check('best_time returns ranked windows for a platform', !r.isError && /Best times to post on Instagram/i.test(text(r)) && /\[research\]/.test(text(r)));
  const bad = await client.callTool({ name: 'best_time', arguments: { platform: 'nope' } });
  check('best_time rejects an unknown platform', bad.isError && /unknown platform/i.test(text(bad)));
}

// brief_schema — the guided-mode / web-UI field spec, no credentials.
{
  const r = await client.callTool({ name: 'brief_schema', arguments: {} });
  check('brief_schema returns the per-run brief fields', !r.isError && /`angle`/.test(text(r)) && /`platforms`/.test(text(r)));
}

// brand_schema — the guided brand-setup / settings field spec, no credentials.
{
  const r = await client.callTool({ name: 'brand_schema', arguments: {} });
  check('brand_schema returns the brand-kit fields with paths', !r.isError && /`visual\.accent`/.test(text(r)) && /Visual identity/.test(text(r)));
}

// duplicate_check — reads the audit log; fresh content has no match.
{
  const r = await client.callTool({ name: 'duplicate_check', arguments: { platform: 'x', content: { text: `unique ${Date.now()}` } } });
  check('duplicate_check reports no duplicate for fresh content', !r.isError && /no duplicate/i.test(text(r)));
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

// drafts — held with status "draft", not auto-dispatched.
{
  const add = await client.callTool({ name: 'queue_add', arguments: { platform: 'bluesky', content: { text: 'draft post' }, draft: true } });
  const id  = (text(add).match(/ID:\s*(\S+)/) || [])[1];
  check('queue_add draft saves with draft status', !add.isError && /draft/i.test(text(add)) && !!id);
  const list = await client.callTool({ name: 'queue_list', arguments: { status: 'draft' } });
  check('queue_list status:draft shows the draft', !!id && text(list).includes(id));
  if (id) await client.callTool({ name: 'queue_remove', arguments: { id } });
}

await client.close();
console.log(`\n${failures === 0 ? 'SMOKE PASS' : `SMOKE FAIL (${failures})`}`);
process.exit(failures === 0 ? 0 : 1);
