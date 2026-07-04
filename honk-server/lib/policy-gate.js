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
//
// Account resolution (INIT-006, closes the INIT-005 boundary): when no explicit
// account is given, the POLICY (brand identity) falls back to the active brand
// account — the same precedent `media_compose` / `brand_voice get` set in
// INIT-004: brand identity resolves via the active pointer, while publish
// CREDENTIALS stay on the explicit account (the default/bare keys here). Before
// this, a post queued without `account:` was dispatched with the `_default`
// (empty) policy — i.e. no enforcement at all. The fallback is surfaced as a
// provenance note so previews/dry-runs show whose policy was applied.
export function validateWithPolicy(platform, content, account, { sponsored = false } = {}) {
    const v = validate(platform, content);
    const policyAccount = account || brand.getActive();
    const policy = (brand.getOrEmpty(policyAccount) || {}).policy || {};
    const pol = checkPolicy(platform, content, policy, { sponsored });
    const notes = [...(pol.notes || [])];
    if (!account && policyAccount) {
        notes.push(`Policy resolved from active brand account "${policyAccount}" (no explicit account given; publish credentials remain on the default account).`);
    }
    return {
        ...v,
        errors: [...v.errors, ...pol.errors],
        warnings: [...v.warnings, ...pol.warnings],
        notes,
        ok: v.ok && pol.errors.length === 0,
    };
}
