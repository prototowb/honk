import { validate, checkPolicy } from './validate.js';
import * as brand from './brand.js';
import type { ValidationResult, PolicyConfig } from './types.js';

// The validation result plus the policy `notes[]` (agent reminders) the callers
// render in previews. `checkPolicy`'s errors/warnings are already merged into
// `errors`/`warnings`; `notes` is carried alongside.
export type WithNotes = ValidationResult & { notes?: string[] };

// Single source of truth for "is this content publishable for this account?" —
// base platform validation (limits, required fields) PLUS the brand kit's policy
// layer (required/sponsored disclosures, banned-topic reminders). `validate`
// stays disk-free; this loads the account's `policy` block via
// `brand.getOrEmpty` and folds `checkPolicy` in (the link_tag pattern).
//
// Used by the direct publish path (index.ts), the advisory add-time check, and —
// crucially — the dispatch chokepoint in dispatch.publishAudited, so a queued or
// scheduled post is re-validated against policy at send time, not only at add
// time. See INIT-005 (closes the INDIV-004 dispatch re-validation gap).
export function validateWithPolicy(
  platform: string,
  content: Record<string, unknown>,
  account: string,
  { sponsored = false }: { sponsored?: boolean } = {},
): WithNotes {
  const v = validate(platform, content);
  const policy = (brand.getOrEmpty(account) || {}).policy || {} as Partial<PolicyConfig>;
  const pol = checkPolicy(platform, content, policy, { sponsored });
  return {
    ...v,
    errors:   [...v.errors, ...pol.errors],
    warnings: [...v.warnings, ...pol.warnings],
    notes:    pol.notes,
    ok:       v.ok && pol.errors.length === 0,
  };
}
