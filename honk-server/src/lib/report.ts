// content_check — the aggregated pre-publish report (INIT-009): one call that
// runs every DETERMINISTIC gate (platform validation + brand policy via the
// policy gate, duplicate guard, schedule sanity) and returns a single
// pass / warn / block verdict, plus the AGENT-JUDGED gates rendered as an
// explicit checklist. "CI for content": checks with severities, one report,
// and the merge gate stays where it always was — publishAudited enforces the
// blocking layer on every dispatch path whether or not this report was run.
//
// Security doctrine (PROJECT_ARCHITECTURE): deterministic checks live here in
// the server; agent-judged checks (structure, sourcing, brand fit) bind the
// agent and are listed, never auto-passed — this report makes the whole gate
// legible without pretending prose checks are machine-checkable.

import { validateWithPolicy } from './policy-gate.js';
import { hashContent } from './hash.js';
import { recentDuplicate } from './audit.js';
import { normalizeScheduledAt, timezoneWarning, isPast } from './schedule.js';
import { extractMediaUrls, expiryWarnings } from './assets.js';

export type Verdict = 'pass' | 'warn' | 'block';

export interface ContentCheckResult {
  verdict: Verdict;
  platform: string;
  errors: string[];
  warnings: string[];
  notes: string[];
  duplicate: { hit: boolean; detail?: string };
  agentGates: string[];
}

// The persona's non-skippable pre-publish gates, surfaced so the report is the
// one place an agent (or a future UI) sees the whole gate — machine + judgment.
export const AGENT_GATES: string[] = [
  'Structure: real hook → payoff (→ CTA) — not flat facts (content-craft)',
  'Sourcing: every fact-bearing claim has a FOLLOWABLE source (caption link / first_comment / on-image)',
  'Right account: brand confirmed, account: passed explicitly on publish',
  'Brand fit: no banned topics; voice matches the (platform/audience-resolved) kit',
  'Authority: user confirmed the final draft — unless policy auto_publish is true',
];

export function contentCheck(
  platform: string,
  content: Record<string, unknown>,
  account = '',
  { sponsored = false, scheduled_at = null as string | null, duplicateWindowHours = 168 } = {},
): ContentCheckResult {
  const gate = validateWithPolicy(platform, content, account, { sponsored });
  const warnings = [...gate.warnings];
  const notes = [...(gate.notes || [])];

  // Duplicate guard (same check duplicate_check runs, folded into the report).
  const dup = recentDuplicate({ platform, content_hash: hashContent(content), withinMs: duplicateWindowHours * 3600 * 1000 });
  const duplicate = dup
    ? { hit: true, detail: `identical content published to ${dup.platform}${dup.account ? `/${dup.account}` : ''} at ${dup.ts}` }
    : { hit: false };
  if (dup) warnings.push(`Possible duplicate — ${duplicate.detail} (window ${duplicateWindowHours}h). Intentional repost? Vary the copy (content-craft) or proceed deliberately.`);

  // Schedule sanity (only when a target time is supplied).
  if (scheduled_at) {
    const tz = timezoneWarning(scheduled_at);
    if (tz) warnings.push(tz);
    const norm = normalizeScheduledAt(scheduled_at);
    if (norm && isPast(norm)) warnings.push(`scheduled_at ${scheduled_at} is in the past — it would dispatch immediately on the next scheduler tick.`);
  }

  // Asset rights/expiry (INIT-013) — deterministic warn, never a block.
  warnings.push(...expiryWarnings(extractMediaUrls(content)));

  const verdict: Verdict = gate.errors.length ? 'block' : warnings.length ? 'warn' : 'pass';
  return { verdict, platform, errors: gate.errors, warnings, notes, duplicate, agentGates: AGENT_GATES };
}

const MARK: Record<Verdict, string> = { pass: '✅ PASS', warn: '⚠ WARN', block: '✘ BLOCK' };

export function formatContentCheck(r: ContentCheckResult): string {
  const out = [`content_check — ${r.platform}: ${MARK[r.verdict]}`];
  if (r.errors.length)   out.push('', 'Blocking errors (publish will refuse these):', ...r.errors.map(e => `  ✘ ${e}`));
  if (r.warnings.length) out.push('', 'Warnings:', ...r.warnings.map(w => `  ⚠ ${w}`));
  if (r.notes.length)    out.push('', 'Notes:', ...r.notes.map(n => `  · ${n}`));
  out.push('', 'Agent-judged gates (confirm each — the server cannot check these):',
    ...r.agentGates.map(g => `  ☐ ${g}`));
  if (r.verdict === 'pass') out.push('', 'All deterministic checks passed. Work the checklist, then publish.');
  if (r.verdict === 'block') out.push('', 'Fix the errors first — the dispatch gate enforces them on every publish path.');
  return out.join('\n');
}
