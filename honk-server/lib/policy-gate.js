import { validate, checkPolicy } from './validate.js';
import * as brand from './brand.js';
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
export function validateWithPolicy(platform, content, account, { sponsored = false } = {}) {
    const v = validate(platform, content);
    const policy = (brand.getOrEmpty(account) || {}).policy || {};
    const pol = checkPolicy(platform, content, policy, { sponsored });
    return {
        ...v,
        errors: [...v.errors, ...pol.errors],
        warnings: [...v.warnings, ...pol.warnings],
        notes: pol.notes,
        ok: v.ok && pol.errors.length === 0,
    };
}
