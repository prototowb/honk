# Social Publishing Mission Control (SPMC)

> AI-native social publishing infrastructure. Built as a plugin system first, designed from the ground up for agent-driven workflows. No UI required to ship value.

---

## Vision

Competitors like Blotato bolt AI onto a traditional scheduling dashboard. SPMC inverts that: the agent _is_ the interface. Publishing flows through Claude, Hermes, and any MCP-compatible agent. A UI gets added on top of a working system, not before it.

Late-stage target: a multi-tenant SaaS that leaves Blotato, Buffer-AI, and Taplio behind by being the only tool that natively lives inside the agent's context rather than requiring the agent to call out to a separate product.

---

## Guiding Principles

1. **Agent-first, UI-optional** — Every feature ships as an MCP tool or skill first. UI is a rendering layer added later.
2. **One server, any agent** — The MCP server is the single source of truth. Claude Code, Claude Desktop, Cursor, Hermes, and any future agent all speak the same protocol.
3. **Platform adapters are plug-and-play** — Adding a new social platform means adding one adapter file and one skill file. Nothing else needs to change.
4. **Credentials never travel** — All secrets live in env vars. The server reads them; no agent ever touches a raw token.
5. **State is explicit** — Every post, queue item, and job has a persisted record. No fire-and-forget.

---

## Roadmap

### Phase 0 — MVP (current focus)
**Goal:** Working plugin for Claude Code + Claude Desktop App + Hermes. No UI.

- [ ] Consolidated MCP server (`spmc-server`) with all current platforms: X, Instagram, TikTok, Facebook, Threads, Bluesky
- [ ] Content queue: MCP tools to add, list, update, and clear queued posts
- [ ] Scheduling: queue items with `scheduled_at` timestamps; a poll-or-push dispatch mechanism
- [ ] Claude Code skills for each platform (ported from `_bkp`)
- [ ] Claude Desktop App `claude_desktop_config.json` entry
- [ ] AGENTS.md — canonical agent onboarding doc that any agent reads on first contact
- [ ] `.env.example` with all required vars documented
- [ ] Smoke test: publish one post to each platform end-to-end

**Deliverable:** Any agent that reads AGENTS.md can publish to all 6 platforms, queue content, and schedule posts — without any UI.

---

### Phase 1 — Alpha (private, us + Hermes)
**Goal:** Content intelligence layer. Start extracting signal from what we publish.

- [x] Multi-account support (multiple X accounts, multiple IG pages, etc.)
- [~] Post analytics ingestion: fetch engagement metrics, store locally — `analytics_fetch`/`analytics_report` + IG/FB/Threads adapter `getMetrics`. **Scaffold built; unverified against live APIs pending credential testing.**
- [x] AI content adaptation: `content_adapt` fits a source to each platform's hard limits (auto X thread-split, grapheme-aware truncation). The deterministic length-fitting is done in-server; per-channel tone/hashtag rewrite is left to the calling agent (agent-first by design).
- [x] Media pipeline: local image → Cloudinary/CDN → public URL
- [x] Hermes-specific skill pack: persona-aware publishing instructions for the Hermes agent
- [x] Scheduling correctness: `scheduled_at` is normalized to absolute UTC (`schedule_check` + `queue_add`). A timezone-less timestamp is accepted as **server-local** (correct on a local single-user server) but **flagged with a warning**, since it becomes ambiguous under hosted/multi-user deployment. Natural-language parsing is intentionally left to the agent, which already knows the current date/time.

---

### Phase 2 — Beta (closed, us + invited users)
**Goal:** Multi-user, hardened, instrumented.

- [ ] Auth layer: API key per user, scoped to their credential set _(deferred — pairs with multi-tenant/hosted, past the local-stdio stop line)_
- [ ] Per-user credential vault (encrypted at rest) _(deferred — same)_
- [ ] Analytics dashboard (first UI surface — read-only) **← UI stop line; planning not started**
- [ ] Content calendar view **← UI**
- [ ] Webhook ingest: receive platform webhooks (DMs, mentions) and surface them as MCP notifications _(deferred — needs a hosted listener)_
- [~] Rate-limit tracking across all platforms with automatic backoff queue — `rate_limits` tool tallies observed 429s today. **Observational only; automatic backoff queue not yet built.**
- [x] Audit log: every publish action recorded with timestamp, source, payload hash (`lib/audit.js` + `audit_log` tool)

> **Capability/UI boundary:** everything above the dashboard line is agent-first
> infrastructure and is largely in place. The dashboard, calendar, and the
> multi-tenant auth/vault/webhook items are the UI/hosted phase — intentionally
> not started.

---

### Phase 3 — SaaS (public)
**Goal:** Self-serve, monetized, competitive moat.

- [ ] Web app: full publishing UI (Next.js, shadcn/ui)
- [ ] Team workspaces: shared accounts, role-based access
- [ ] Subscription tiers (free: 1 user / 2 platforms; pro: unlimited; agency: multi-brand)
- [ ] Public API for third-party agent integrations
- [ ] AI content brief → full cross-platform campaign, one command
- [ ] Native integrations: Notion, Linear, Ghost, YouTube

---

## Architecture (MVP)

```
G:\Projects\_Plugins\
├── spmc-server/              ← MCP server (Node.js ESM)
│   ├── index.js              ← server entrypoint + tool dispatcher
│   ├── adapters/             ← one file per platform
│   │   ├── x.js
│   │   ├── instagram.js
│   │   ├── tiktok.js
│   │   ├── facebook.js
│   │   ├── threads.js
│   │   └── bluesky.js
│   ├── queue/
│   │   └── store.js          ← file-backed queue (JSON, upgrades to SQLite in Phase 1)
│   ├── scheduler/
│   │   └── index.js          ← polls queue, dispatches due posts
│   └── package.json
│
├── skills/                   ← Claude Code skill files (SKILL.md per platform)
│   ├── post-to-x/SKILL.md
│   ├── post-to-instagram/SKILL.md
│   ├── post-to-tiktok/SKILL.md
│   ├── post-to-facebook/SKILL.md
│   ├── post-to-threads/SKILL.md
│   ├── post-to-bluesky/SKILL.md
│   └── manage-queue/SKILL.md
│
├── AGENTS.md                 ← Single doc any agent reads to get fully operational
├── PROJECT_SPECIFICATIONS.md ← This file
├── .env.example              ← All required environment variables documented
└── claude_desktop_config.json ← Drop-in Claude Desktop App MCP config
```

---

## MCP Tools (MVP surface)

### Publishing tools (existing, ported)
| Tool | Platform | Input |
|------|----------|-------|
| `x_post_tweet` | X | `text` |
| `x_post_thread` | X | `tweets[]` |
| `instagram_post` | Instagram | `image_url`, `caption` |
| `tiktok_post_video` | TikTok | `video_url`, `caption`, `privacy_level?` |
| `tiktok_check_publish_status` | TikTok | `publish_id` |
| `facebook_post` | Facebook | `message`, `image_url?` |
| `threads_post` | Threads | `text`, `image_url?` |
| `bluesky_post` | Bluesky | `text` |

### Queue tools (new in MVP)
| Tool | Description | Input |
|------|-------------|-------|
| `queue_add` | Add a post to the content queue | `platform`, `content{}`, `scheduled_at?` |
| `queue_list` | List queued posts, optionally filtered | `status?`, `platform?` |
| `queue_update` | Update queue item status or content | `id`, `updates{}` |
| `queue_remove` | Remove an item from the queue | `id` |
| `queue_dispatch` | Immediately publish a queued item | `id` |

---

## Environment Variables

```
# X (Twitter) — OAuth 1.0a
X_API_KEY=
X_API_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_TOKEN_SECRET=

# Instagram / Facebook — Meta Graph API (shared EAA token)
INSTAGRAM_USER_ID=
INSTAGRAM_ACCESS_TOKEN=
FACEBOOK_PAGE_ID=
FACEBOOK_ACCESS_TOKEN=

# TikTok — Content Posting API
TIKTOK_ACCESS_TOKEN=

# Threads — Threads API
THREADS_USER_ID=
THREADS_ACCESS_TOKEN=

# Bluesky — AT Protocol app password (not account password)
BLUESKY_IDENTIFIER=
BLUESKY_APP_PASSWORD=
```

---

## Agent Integration Contract

Any agent (Claude, Hermes, future) MUST:
1. Read `AGENTS.md` before attempting any SPMC action
2. Use the MCP server tools exclusively — never call platform APIs directly
3. Confirm post content with the user before calling any publishing tool (unless explicitly operating in autonomous mode)
4. Report post URL + timestamp after every successful publish
5. Update queue item status after dispatching a queued post

---

## Competitive Positioning

| Feature | SPMC | Blotato | Buffer AI | Taplio |
|---------|------|---------|-----------|--------|
| MCP-native | ✅ | ❌ | ❌ | ❌ |
| Agent-first (no UI required) | ✅ | ❌ | ❌ | ❌ |
| Works inside Claude/Cursor | ✅ | ❌ | ❌ | ❌ |
| Open plugin architecture | ✅ | ❌ | ❌ | ❌ |
| Self-hosted option | ✅ | ❌ | ❌ | ❌ |
| AI content adaptation | Phase 1 | ✅ | Partial | ✅ |
| Analytics | Phase 2 | ✅ | ✅ | ✅ |
| Team workspaces | Phase 3 | ✅ | ✅ | Partial |

The moat is the MCP layer + agent-native workflow. Blotato can add AI to a dashboard; they cannot become an agent plugin without a rewrite.

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

#### INDIV-006 — Multi-brand management  ▸ build third (small; UI-convergent)

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
