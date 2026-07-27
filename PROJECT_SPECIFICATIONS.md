# Honk — Product Specification

> **North star:** an AI-agent-powered **publishing automation and digital brand management
> platform**. The agent is the interface; every capability ships agent-first as MCP tools +
> skills, and the UI (when it arrives) renders what the agent already knows. Social publishing
> is the beachhead — the platform generalizes to every channel a brand publishes through, and
> to the assets and identity the brand publishes *with*.

> **Doc boundaries:** this file carries vision, pillars, roadmap, and feature inventory.
> Current + target architecture: [`PROJECT_ARCHITECTURE.md`](PROJECT_ARCHITECTURE.md).
> Delegation/steering model: [`PROJECT_PRINCIPLES.md`](PROJECT_PRINCIPLES.md).
> Mechanism research: [`ROADMAP_NOTES.md`](ROADMAP_NOTES.md). Cross-link, don't duplicate.

---

## Vision

Incumbents (Buffer, Hootsuite, Blotato, Taplio) bolt AI onto a dashboard-first product; brand
tools (Canva, Frontify) bolt publishing onto a design-first product. Honk inverts both: **the
agent initiates, drafts, brand-checks, schedules, publishes, measures, and learns** — through
one MCP spine any agent can drive. A UI is a rendering layer over agent state, added after the
system works, never required for value.

The end state is a platform where a solo creator or a small team delegates their entire
publishing operation: *"here's my brand, here's my cadence, here are my channels — run it,
check with me where my policy says so."*

**Why we win:** (1) MCP-native — lives inside Claude/Cursor/any agent rather than asking the
agent to drive a foreign dashboard; (2) the brand kit is *enforced at dispatch*, not a style
page humans forget; (3) one workflow spec runs supervised or autonomous, live or scheduled —
delegation is the product, not a feature.

## Product Pillars

1. **Publish** — channel adapters (today: X, Instagram, TikTok, Facebook, Threads, Bluesky),
   queue + scheduler, validation/adaptation to channel constraints, dispatch chokepoint with
   audit + policy gate, alt-text/first-comment/UTM mechanics.
2. **Brand OS** *(the assets & digital-brand-management identity of the platform)* — brand
   kits (voice, audiences, per-channel deltas, policy/guardrails, visual identity), branded
   media composition + templates, **asset registry v1 (shipped INIT-013 — the DAM seed)**, multi-brand
   management with an account registry, portable user-owned brand data.
3. **Intelligence & Engage** — analytics ingestion + auto-follow-up, best-time (baseline →
   observed), learned voice (few-shots from real results), duplicate/repost guard, rate-limit
   observation; inbox/comment automation (INBOX-001) and listening later.
4. **Delegation** — the two-axis mode model (guided/un-guided × supervised/autonomous),
   workflow library, schema symmetry (guided prompts = future UI forms = API params),
   non-skippable pre-publish gates. Defined in `PROJECT_PRINCIPLES.md`; this pillar is why
   the other three compose into automation rather than a toolbox.

## Non-Goals

- **Not a generic automation platform.** Zapier composes arbitrary apps; Honk is opinionated
  end-to-end publishing. A workflow entry is a publishing workflow, not a general DAG.
- **Not a CMS.** Honk publishes *to* CMSes/blogs (channel adapters); it does not host content.
- **Not an ad manager.** Organic publishing + brand management; paid campaign tooling is out.
- **Not UI-first, ever.** Any feature that only works through the UI is a design defect
  (schema-symmetry violation).
- **No unreviewed autonomy by default.** `auto_publish: false` is the eternal default; the
  deterministic policy gate runs on every dispatch path regardless of agent quality.

## What 1.0 Means (production-release definition)

`v1.0.0` ships when ALL of:

1. **Live-verified or honestly flagged** — every advertised channel capability either verified
   against the real API or marked experimental in the tool description itself. Threads /
   TikTok / Bluesky creds + X publish (402) are **descoped indefinitely** (2026-07-06,
   INIT-012 — see PROJECT_STATUS *Descoped*): those channels take the "honestly flagged"
   arm — live-unverified noted in the tool descriptions. Remaining verify item: FB
   alt-text read-back (minor).
2. **Installable, quickstart ≤ 10 minutes cold** — git clone → `npm install` →
   `npm install -g .` (or wired directly into Claude Code/Desktop/a BYO agent) with a
   correct, current README walking every surface. **Public npm registry publish is
   descoped indefinitely** (user decision, 2026-07-27 — no distribution plan; see
   PROJECT_STATUS *Descoped*) and is explicitly NOT a 1.0 gate. `RELEASING.md`'s
   version-bump/changelog discipline still applies to tagged releases regardless.
3. **Safety floor** (INIT-006 ✅) — outbound timeouts, secret redaction at the audit boundary,
   atomic stores + corrupt-file backup, dispatch-time policy gate with active-account fallback.
4. **Data compatibility promise** — `~/.honk/` store formats versioned; migrations (or
   documented non-breakage) between releases; semver discipline (breaking = major) +
   deprecation policy in RELEASING.md.
5. **Gates green in CI** on every commit (already enforced) + `npm audit` clean at release cut.

Everything else (UI, more channels, DAM depth, hosting) is post-1.0 growth, not 1.0 gate.

## Horizon Roadmap

> Supersedes the old Phase 0–3 list (record preserved in `PROJECT_HISTORY.md` via the ticket
> tables). Horizons have **entry criteria** — a horizon opens when its criteria are met, not
> on a date. Tickets stay the unit of work; `PROJECT_STATUS.md` tracks them.

### H0 — Production floor (current)
**Goal: cut `v1.0.0` per the definition above.**
- INIT-006 hardening ✅ · merged to `development`. npm publish is **descoped indefinitely**
  (user decision, 2026-07-27) — no plan to distribute via the npm registry; RELEASING.md
  stays as reference but is not an active NEXT item. See PROJECT_STATUS *Descoped*.
- Live verification pass ✅ (INIT-010/011: IG+FB read/write/first-comment/follow-up loop);
  Bluesky/Threads/TikTok creds + X 402 **descoped** (INIT-012) → "honestly flagged" arm
- Store format versioning ✅ (INIT-008 — `schema_version` field in each `~/.honk/` store;
  the account registry (INIT-014) and asset registry (INIT-013) both follow the contract)
- Live-prove content-craft ✅ (INIT-011 — the AI-security post: hook→payoff structure +
  followable source, confirmed live on IG+FB)
- README quickstart ✅ (this session — corrected throughout for the SPMC→Honk rename,
  which had left the file almost entirely un-swept: title, paths, bin names, credential
  file, skill list/count, test counts all pre-rename; point 2 of the 1.0 definition above
  also redefined to drop the public-registry requirement)

**Every H0 bullet and every "1.0 Means" criterion now checks out**, including point 5's
`npm audit` clause: the 5 vulnerabilities found 2026-07-27 (1 high, 3 moderate, 1 low, in
transitive deps `fast-uri`/`hono` via `@modelcontextprotocol/sdk`) were resolved same-day
via `npm audit fix` (lockfile-only bump, `@modelcontextprotocol/sdk` stays within its
existing `^1.12.0` range) — `npm audit` now reports **0 vulnerabilities**, verified against
the full gate suite (type-check, 180 unit, 49-check smoke, build:check, pack:smoke, all
green). **Whether/when to cut `v1.0.0` is a decision for the user to make explicitly** —
nothing in this definition is blocking it anymore.

### H1 — Delegation + first UI (entry: 1.0 cut)
**Goal: initiation stops being hand-written prompts; reading state stops requiring an agent.**
- **Workflow library v1** — `capabilities/workflows/<name>.md` + `workflow_list` tool +
  3 seed entries (`weekly-insight`, `product-update`, `engagement-spark`); guided mode picks
  from it (PRINCIPLES §3 — the concept is ready, build is small)
- **Account registry — shipped INIT-014.** `brand-active.json` grew into `accounts.json`
  (credential identity × brand identity × channel handles); active pointer + channel-handle
  cache from `account_info`; closes the INIT-005 fallback note (registry-resolved)
- **BETA-011 UI (read-only first):** analytics dashboard + content calendar + queue view,
  rendering the same schemas guided mode uses (schema symmetry is the wireframe)
- INDIV-007 learned/adaptive — once analytics history accrues (data-gated)
- Storage: **SQLite via `node:sqlite`** when the UI/analytics joins need queries
  (zero new runtime deps; requires engines ≥ 22 — decision recorded in PROJECT_ARCHITECTURE)

### H2 — Channel expansion + reach (entry: workflow library shipped; creds available)
**Goal: "social publishing tool" → "publishes everywhere the brand publishes."**
- Channel SPI generalization (adapters declare capabilities; see PROJECT_ARCHITECTURE) —
  then: **Mastodon** (ALPHA-017), **LinkedIn** (ALPHA-018), **blog/CMS channels** (Ghost,
  WordPress, headless e.g. Sanity), **newsletter** (Buttondown/Mailchimp-class)
- **Asset registry v1** (DAM seed) — **✅ shipped early (INIT-013, 2026-07-06)**: every
  `media_upload`/`media_compose` output recorded (id, provider URL(s), hash-deduped,
  dimensions, usage per post, rights/expiry with deterministic dispatch warn);
  `asset_list`/`asset_update`; kit logo/icon registered. Remaining H2 depth: bulk import,
  provider-side deletion, approved-for-channel gating
- **Campaigns:** brief → cross-channel bundle (`campaign_id` on queue items, grouped
  dispatch/reporting)
- **Content recycling:** evergreen re-queue suggestions from the audit log + analytics
  (duplicate_check-aware, opt-in)
- **Remote MCP milestone:** hosted Streamable-HTTP MCP + bearer auth — unlocks claude.ai
  web + always-on scheduling (transport change, same codebase)
- INBOX-001 Phase 0 (public comment replies; DM phase gated on Meta App Review)

### H3 — Platform (entry: remote MCP live + paying-user intent validated)
**Goal: multi-tenant product, not a power tool.**
- Team workspaces, roles, per-user credential vault (encrypted at rest), approval workflows
- Subscription tiers; public API; brand-portal export (shareable brand one-pager — the
  Frontify-lite move); template/workflow marketplace
- A/B caption variants with analytics join; listening/alerts

## Feature Inventory (by pillar)

**Existing (30 tools · 15 skills · 5 templates)** — Publish: 7 publish + tiktok-status, 5
queue (drafts, sponsored persistence), scheduler + dispatch chokepoint (audit, policy gate,
follow-up scheduling), content_validate/adapt, schedule_check, best_time, duplicate_check,
link_tag, alt-text + first-comment, dry_run everywhere. Brand OS: brand_voice
(get/set/list/use/clone + platform/audience resolution), brand_schema + guided brand-setup,
policy block, visual kit + media_compose/media_upload, account_info (seed_brand_kit).
Intelligence: analytics_fetch/report + auto-follow-ups, rate_limits, audit_log, config_doctor.
Delegation: 15 skills incl. content-craft, pipeline-orchestrator, guided mode + brief_schema.

**Planned (ticketed):** INDIV-007 · BETA-011 · ALPHA-016 delete (scope-gated) ·
ALPHA-017/018 · INBOX-001. (BETA-013 **descoped** 2026-07-06; npm publish **descoped**
2026-07-27 — see PROJECT_STATUS *Descoped*.)

**Proposed (this revision — newly placed above):** workflow library v1 (H1) · account
registry (H1) · store versioning (H0) · SQLite-via-node:sqlite decision (H1) · asset
registry / DAM seed (**shipped INIT-013**) · blog + newsletter channels (H2) · campaigns (H2) · content
recycling (H2) · remote MCP hosting (H2) · brand-portal export (H3) · approval workflows +
vault + teams (H3) · A/B variants (H3) · guardian review posture — doctrine in
PROJECT_ARCHITECTURE security model; its `content_check` report surface **shipped (INIT-009)**.

## Agent Integration Contract

Any agent (Claude, Hermes, future) MUST:
1. Read `AGENTS.md` before attempting any SPMC action
2. Use the MCP server tools exclusively — never call platform APIs directly
3. Confirm post content with the user before calling any publishing tool (unless explicitly operating in autonomous mode)
4. Report post URL + timestamp after every successful publish
5. Update queue item status after dispatching a queued post

---

## Competitive Positioning

| Capability | Honk | Blotato | Buffer AI | Taplio | Canva/Frontify |
|---|---|---|---|---|---|
| MCP-native / agent-first | ✅ | ❌ | ❌ | ❌ | ❌ |
| Works inside Claude/Cursor | ✅ | ❌ | ❌ | ❌ | ❌ |
| Brand kit **enforced at dispatch** | ✅ | ❌ | ❌ | ❌ | ❌ (style guide only) |
| Workflow spec runs supervised OR autonomous | ✅ | ❌ | ❌ | ❌ | ❌ |
| Open plugin architecture / self-hosted | ✅ | ❌ | ❌ | ❌ | ❌ |
| Asset/brand management | H2–H3 | ❌ | ❌ | ❌ | ✅ |
| Analytics | scaffold (live-verify pending) | ✅ | ✅ | ✅ | ❌ |
| Team workspaces | H3 | ✅ | ✅ | Partial | ✅ |

The moat is the MCP layer + delegation model: a dashboard company can add AI, but becoming an
agent plugin — with brand policy enforced deterministically on every dispatch path — is a
rewrite. The Brand-OS pillar attacks the design-tool flank the social tools ignore.

---

## Individualization (Phases 1 & 2 shipped — backlog remains)

> **Status (2026-06-23):** Phase 1 (visual identity in the kit) and Phase 2
> (`brand_schema` + guided `brand-setup`) are **built + merged-ready** on
> `feature/INDIV-visual-brand-kit`. The five `media_compose` templates were
> rebuilt on one editorial design system (brand row · hero headline on a layered
> surface · body · accent footer), colors derived from the brand palette with a
> background-luminance legibility fallback, and now default every visual field
> from the kit's `visual` block. The **Backlog** below is what's left.


**Goal:** every output reflects the specific brand/account *without re-specifying it
each time.* The brand kit (`brand_voice` / `lib/brand.js`) is individualization v1 —
the **voice** layer (tone, audience, hashtags, banned words, CTA, UTM). Extend it to
the other dimensions an output varies on.

**Architecture through-line — schema symmetry.** Mirror the guided-mode work:
`brief_schema` is the *per-run delta*; a new **`brand_schema`** is the *persistent
layer*. The kit's `emptyProfile()` already *is* the schema — expose its shape as a
field spec so **one source** drives both a guided "set up your brand" flow (reusing
guided mode) and the future web-UI settings form (BETA-011).

### Phase 1 — Visual identity in the kit ✅ shipped
The kit holds **zero** visual identity today, so `media_compose` needs colors/logo
passed on every call (observed friction — today's live test had no kit at all). Add a
`visual` block to `emptyProfile()` — `accent`, `bg_color`, `logo_url`, `default_template`
— and have `media_compose` + the `output-manager`/platform skills **default from it**.
Self-contained; wires the kit ↔ media pipeline; highest concrete value.

### Phase 2 — `brand_schema` + guided brand setup (the adoption gate) ✅ shipped
Individualization is worthless if the kit stays empty — so onboarding is the **gate,
not a nice-to-have.** Add `brand_schema` (the kit's field spec) + a guided intake that
populates the kit; the web UI later renders the same spec as a settings form.

### Backlog — planned (2026-06-24)

Per-platform voice tailoring shipped as **INDIV-003** (`brand.resolveVoice` +
`PLATFORM_OVERRIDE_FIELDS`, replace semantics, superset platform-scoped get —
merged to `development`). The four items below are planned for next-session
implementation, in **recommended build order**. Each is credential-free and
self-contained unless noted. The conventions in force (build origin → `npm run
build`; gates `npm test` · `build:check` · `test:smoke` · `pack:smoke` green at
every commit; branch off `development`, merge `--no-ff`) apply throughout.

---

#### INDIV-004 — Content policies / guardrails  ✅ shipped (2026-06-24, on `development`)

**Shipped as built:** `policy` block on the kit (`banned_topics`,
`disclosures.always/sponsored`, `auto_publish`); pure `checkPolicy(platform,
content, policy, {sponsored})` in `validate.js` merged into the validate path via
a `validateWithPolicy` handler helper (loads policy via `brand.getOrEmpty` — the
link_tag pattern, validate stays disk-free). `always`→warn, `sponsored`→error
(escalated by a per-call `sponsored` flag on the 7 publish tools + `content_validate`);
`banned_topics`→drafting-reminder note; disclosures echoed ✓ in dry-run/validate.
Disclosure matching is **word-boundary token containment** (not plain substring —
"#ad" is not satisfied by "#advanced", "Ad" not by "had"). `auto_publish` is
agent-guided (documented in persona/skills), no deterministic dispatch gate.
**Enforcement boundary:** direct publish hard-blocks; `queue_add` is advisory and
the real dispatch/scheduler path does not re-validate (deferred follow-up). Tools
stay 30 (folds into validate). 110 unit + 33-check smoke. *Original plan below.*

**Intent:** let a brand encode what it must *not* say and what it must *always*
say, and how freely it may publish — the safety layer a publishing tool needs.

**Data shape** — add a `policy` block to `emptyProfile()`:
```
policy: {
  banned_topics: [],                 // semantic no-go themes (agent-judged), e.g. "competitor comparisons"
  disclosures:   { always: [], sponsored: [] },  // strings appended/required, e.g. sponsored:["#ad"]
  auto_publish:  false,              // false = always confirm before publishing (the project default)
}
```

**Logic / surface** (mix of deterministic + agent-guided):
- **Required disclosures (deterministic).** **Warns** when a configured
  `disclosures.always` token is absent from the text; a publish tool gains a
  `sponsored:true` flag that escalates the `disclosures.sponsored` tokens from
  warn → **error** (you may not ship a sponsored post missing `#ad`). **Keep
  `validate(platform, content)` pure** — do *not* have it read the kit from disk
  (that would break its no-data-dir unit tests). Mirror the `link_tag` pattern:
  the **handler** (`index.js`) loads `policy` via `brand.getOrEmpty(account)` and
  passes it in as data. *Real open question:* whether the check is
  `validate(platform, content, policy)` (extra pure arg) or a sibling pure
  `checkPolicy(content, policy)` whose result the handler merges into the validation
  output — lean to the latter to keep `validate`'s signature stable. Echo the
  applied/missing disclosures in the dry-run preview.
- **Banned topics (agent-guided).** Not regex-detectable; surface them in the
  brand-kit view and the drafting prose (content-intelligence + platform skills +
  persona) as hard "do not write about" guidance, and list them in the dry-run
  preview as a reminder. `banned_words` stays the deterministic string check.
- **auto_publish (agent-guided, with a deterministic seam).** Default `false`
  keeps the "always confirm" rule. Document it in the persona/skills so a brand
  that opts in (`true`) can let the agent publish without a per-post confirm.
  *Deterministic enforcement (dispatch refuses un-confirmed direct publishes when
  `false`) is a stretch — note as a follow-up, don't block v1 on it.*

**Tests:** validate warns on missing `always` disclosure; `sponsored:true` errors
on missing sponsored disclosure; passes when present; banned_topics surfaced in
preview. **Open decisions:** warn-vs-error thresholds; exactly how `sponsored` is
signaled (per-call flag — leaning yes); whether `auto_publish` gets the
deterministic dispatch gate now or later. *No new tool (folds into kit +
validate); if a standalone `policy_check` reads cleaner, add it — but validate is
the natural home.*

#### INDIV-005 — Audience segments  ✅ shipped (2026-06-24, on `development`)

**Shipped as built:** `audiences{}` on the kit; the override field list generalized
to one `OVERRIDE_FIELDS` (`PLATFORM_OVERRIDE_FIELDS` aliases it — all six; a new
`SEGMENT_OVERRIDE_FIELDS` is it **minus `audience`**). `resolveVoice(profile,
{platform, audience})` (bare-string platform still accepted) layers
**base ▸ audience ▸ platform** — platform wins last, so a platform delta fully
shadows an audience delta on the same field (replace semantics). Selecting a known
segment sets the effective `audience` to its name; per-field `sources` provenance.
**Unknown audience name does NOT silently apply** — values stay base and
`unknownAudience` is set + surfaced (the advisor-caught correctness property).
Exposed via `brand_voice(action:"get", platform?, audience?)` (resolves when either
is given). `brief.js`'s `audience_delta` became a single `audience` field (segment
name or ad-hoc). `audiences` stays out of `BRAND_FIELDS` (advanced step, symmetric
with `platforms`). Tools stay 30. 117 unit + 36-check smoke. *Original plan below.*

**Intent:** a second tailoring axis — the same brand speaks differently to
"enterprise buyers" vs "indie devs," independent of platform.

**Data shape** — `audiences: { <name>: { …overridable fields } }` on the kit.
**Heads-up — the field sets are NOT identical:** `audience` is *already* one of the
INDIV-003 override fields (`basePath: voice.audience`), and a named segment can't
carry `audience` as one of its own fields (circular). So generalize
`PLATFORM_OVERRIDE_FIELDS` into a shared base, but the **segment** field set is
that base **minus `audience`** (segment fields = tone/register/emoji_policy/
hashtags/cta; platform fields keep all six). Decide how a segment relates to
`voice.audience`: cleanest is **selecting a segment sets the effective
`audience`** to the segment name/descriptor, with `voice.audience` as the fallback
when no segment is chosen.

**Logic / surface:** extend the resolver to `resolveVoice(profile, { platform,
audience })`. **Precedence (decide + pin with a test):** base ▸ audience ▸
platform — platform is the hardest channel constraint so it wins last; provenance
(`overridden[]`) gains a per-field source tag (`platform` | `audience`). Expose
via `brand_voice(action:"get", platform, audience)`. Audience selection is also a
**per-run** choice → add an `audience` field to `lib/brief.js` (`brief_schema`),
closing the schema-symmetry loop.

**Tests:** audience-only override; platform-over-audience precedence; both unset =
base; provenance source tags. **Open decision:** the precedence order above
(platform-wins) vs audience-wins — confirm before building.

#### INDIV-006 — Multi-brand management  ✅ shipped (2026-06-24, on `development`)

**Shipped as built:** `brand_voice` gains `action:"list"` (joins brand profiles +
credentialed accounts via `config.accountsOverview()`, lowercase-normalized union,
active marked), `action:"use"` (sets an **active pointer**), `action:"clone"` (+`to`
— deep-copy a profile to a new key; refuses to clobber). **Decision: active pointer,
not agent-carried** (chosen for UI groundwork — a UI needs persisted selection state;
the pointer subsumes agent-carried since an explicit `account:` always overrides).
Stored in its **own file** (`brand-active.json`), NOT in `brand.json` — the flat
brand map stays single-concern and the pointer file is the **seed of a future
account registry** (no migration). **Reads** (`brand_voice get` / `brand_schema`
with no account) default to the active account and **echo** it; **writes + publishing
+ `media_compose` stay explicit** — the active pointer never silently redirects a
post (the hidden-global-state footgun applies to brand-dependent output). `brand.json`
stays flat. Tools stay 30. 121 unit + 41-check smoke. *Architecture note below: keep
`brand.json` flat; evolve toward a separate account registry (seeded by this pointer),
not a nested mega-account object. Original plan follows.*

**Intent:** run several brands/accounts from one install without hand-editing
`brand.json`. `brand.list()` and per-account isolation already exist.

**Logic / surface:** add `brand_voice(action:"list")` (enumerate accounts with a
one-line summary each) and `action:"clone"` (+ a `to` arg — copy a profile to a
new account key as a starting point). **"Switch"** = decide whether there's a
stored *active account* pointer (e.g. `_active` in the store, used when no
`account` is passed) or it stays purely agent-carried context (the agent says
"using the 'brand' account"). Leaning: keep it agent-carried for now, revisit
with the UI. Update `brand-setup` / a short manage-brands note.

**Tests:** list reports all accounts; clone copies then diverges independently.
**Open decision:** stored active-account pointer vs agent-context only.

#### INDIV-007 — Learned / adaptive  ▸ build last (data-gated; likely premature)

**Intent:** the kit improves itself from real results.

**Two parts, both dependent on accrued history:**
- **Voice few-shots** — `voice.examples: [{ text, platform, why }]`; the agent
  uses them as style exemplars. Capture is the open question: a manual "mark this
  post as exemplar" tool vs auto-promote from high-engagement analytics.
- **Observed best-times** — wire `best_time`'s existing `observedWindows` seam to
  read the account's `analytics_report` history and blend with the research
  baseline once enough snapshots exist.

**Gate:** both need analytics history that **has not accrued** (live analytics is
still unverified pending creds). Plan it, but expect to defer until there's data.
**Open decisions:** example-capture mechanism; the history threshold before
`best_time` blends observed over baseline.

---

#### Deferred — UI export/import (BETA-011 phase)
Folder-copy works today (the kit is portable user data). A `brand_export` /
`brand_import` pair (or a CLI bundle) belongs with the UI work, not before it.
