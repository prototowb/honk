# ROADMAP_NOTES.md — Honk

> Living research file. Accretes over time — append new findings, update stale ones.
> Not a spec or a plan: a reference for why roadmap decisions were made and what
> comparable mechanisms we learned from. Normative principles live in
> [`PROJECT_PRINCIPLES.md`](PROJECT_PRINCIPLES.md).

---

## Comparable Mechanisms

### Template Galleries — Zapier / Make

**What they get right:**
- A template is a named, pre-configured workflow with a short description, required trigger
  fields, and optional steps. The user activates a template and fills in only what the system
  can't infer — never more.
- Discovery is through browse/search, not memorization. The gallery IS the initiation
  mechanism; users don't write workflows, they pick and parameterize them.
- The same template runs on a schedule (autonomous) or on-demand (supervised) without
  structural changes — only the trigger differs.

**Honk takeaway:** The workflow library (§3 of PRINCIPLES) maps directly to this model.
Template = workflow entry. Required trigger fields = required inputs. Gallery = future UI
workflow picker. The un-guided/autonomous difference is the trigger, not the template.

**Where they fall short:** Zapier templates are still primarily configuration UIs, not
agent-driven. The agent-first inversion is our moat — the agent *interprets* the workflow
spec rather than the user filling in a form.

---

### Scaffolding CLIs — `create-next-app`, `npm init`

**What they get right:**
- Interactive by default (guided): prompts for exactly the decisions the tool can't infer —
  never more, never less. `create-next-app` asks TypeScript yes/no, Tailwind yes/no, ESLint
  yes/no — all decisions with meaningful defaults and no free-form answer.
- Un-guided via flags: `--typescript --tailwind --no-eslint` produces the same output with
  zero prompts. The modes are implementation details of the same underlying spec.
- `--yes` (smart defaults / "I trust your judgment") = un-guided + supervised: the tool
  tells you what it picked before executing.

**Honk takeaway:** Guided vs. un-guided is not a different tool or a different prompt — it's
the same workflow entry executed with or without interactive prompts. The agent's equivalent
of `--yes` is un-guided mode: it picks and tells you what it chose before publishing.

**Key design principle:** The interactive questions should cover exactly the required inputs
(§2 of PRINCIPLES) — no more. Any question with an obvious default should be skipped unless
the user has configured to see it.

---

### Command Palettes — Raycast, Linear, Notion

**What they get right:**
- Every action has a searchable name. The palette is the workflow library made navigable.
  No system prompt, no memorization: type "create post" → pick the workflow → fill required
  inputs → execute.
- Actions surface as structured forms, not free-form chat. Required fields are marked;
  optional fields have defaults pre-filled.
- Discovery and initiation are the same gesture.

**Honk takeaway:** The future UI's primary navigation pattern should be a workflow/action
palette, not a menu hierarchy. A `brief.workflow` field populated by picking from a gallery
is the agent-layer equivalent. The guided mode prompt sequence IS the form.

---

### API → CLI → UI Parity — Stripe, GitHub CLI, Fly.io

**What they get right:**
- Every capability surfaces at three layers: API (programmatic), CLI (interactive terminal),
  UI (web form). The same underlying operation; different presentation layer.
- `gh pr create` interactive mode prompts for title, body, and base branch — exactly the
  same fields as the GitHub PR web UI form. If you design the CLI questions right, the UI
  form designs itself.
- Parity means no capability is locked to one surface. An agent calling the API, a user
  running the CLI, and a user clicking the UI all reach the same outcome.

**Honk takeaway:** This IS the schema-symmetry principle (§4 of PRINCIPLES) manifested.
The guided agent prompts are the CLI interactive mode. The schema fields are the API
parameters. The future UI controls render the same schema. Design them together.

**Key implication for BETA-011 (UI phase):** Don't design the UI separately from the guided
mode flows. Audit the guided prompts first — they're already the UI wireframe in prose form.

---

## Competitive Positioning Notes

*(Social tool comparisons live in [`PROJECT_SPECIFICATIONS.md`](PROJECT_SPECIFICATIONS.md).
New observations go here.)*

**The agent-native gap:** Buffer, Hootsuite, Taplio, and Blotato all layer AI onto a
dashboard-first product. The initiation model is always: user opens app → navigates UI →
creates content → AI assists. Honk inverts this: the agent initiates, optionally surfaces
a guided prompt sequence, and the UI (when it exists) renders what the agent already knows.
None of the existing tools have a workflow library concept at the agent layer — they have
template libraries at the UI layer, which is a fundamentally different thing.

**The MCP moat is not just technical.** Being MCP-native means any future agent (not just
Claude) can consume the same workflow library entries. Zapier templates are locked to Zapier;
Honk workflow entries are consumable by any MCP-compatible agent. The standard makes the
library portable.

---

## Open Research Questions

- **Workflow library discovery at the agent layer:** How does an agent know which workflow
  entries exist without a UI? A `workflow_list` MCP tool (parallel to `brand_voice list`)
  is the natural answer. Deferred to the workflows/ build phase.
- **Guided mode initiation without a system prompt:** What's the minimal phrase a user types
  to enter guided mode? "Start a post" → agent surfaces active brand + workflow library picks?
  Needs a defined trigger that doesn't require the user to know workflow names.
- **Scheduled workflow entry format:** A cron entry needs a workflow name + authority setting
  + optional topic. How does `pg schedule` or CronCreate reference a workflow entry? Deferred
  to scheduling integration phase.
- **Bluesky / Mastodon / LinkedIn completeness:** None of these have been live-verified.
  Holding for creds + scope verification before adding to workflow library defaults.

---

## Research Round 2 (INIT-007) — Brand OS, channels, recycling, guardian

### Brand kits & DAM-lite — Canva Brand Kit, Frontify, Bynder

**What they get right:** a brand kit is *assets + rules together* — logos/colors/fonts live
beside usage rules (clear space, don'ts, tone). Frontify's insight: the shareable **brand
portal** is the adoption driver — a URL you hand a collaborator beats a folder. Bynder's:
assets carry **metadata that gates usage** (rights, expiry, approved-for-channels).

**Where they fall short for us:** all three are libraries humans *consult*; none can stop an
off-brand post from shipping. Honk's brand kit is already *enforced at dispatch* (policy
gate) — the differentiator to protect as the DAM layer grows.

**Honk takeaways:** (1) the asset registry (H2) should record usage-per-post from day one —
retro-fitting usage tracking is what makes DAMs miserable; (2) rights/expiry as plain fields
+ a deterministic dispatch warn when publishing an expired asset — cheap, unique; (3) brand
portal export (H3) = the brand kit rendered as one shareable page — trivially generatable
from `brand_schema`, disproportionate perceived value.

### Publishing channels beyond social — Ghost / WordPress / Buttondown / Sanity

Ghost Admin API: single JWT-auth POST to publish (draft/published states, tags, feature
image) — an afternoon adapter, and its content shape (title + HTML/lexical body) is the
long-form `content{}` template for the whole blog class. WordPress REST + Application
Passwords is the same shape (huge install base, gnarlier auth matrix). Buttondown is the
newsletter analog (Markdown body, subject, send/schedule). Sanity is *storage* with
publish-on-mutate — fits the SPI as a channel whose `publish` is a document mutation.
**Takeaway:** one `long_form` content shape in `PLATFORM_SPECS` (title/body/tags/feature
image/canonical URL) covers Ghost + WordPress + Buttondown + Medium-class channels; the
pipeline (validate → policy → dispatch → audit → follow-up) needs zero new machinery.

### Evergreen recycling — MeetEdgar / SocialBee / RecurPost

The mechanic that retains solo creators: content organized into **categories with recycling
schedules**; the tool re-queues evergreen items when the queue runs dry, with variations.
**Honk mapping:** the audit log + analytics already know what was posted when and how it
performed — recycling is a *query + guided suggestion* ("these 3 performed well and are >90
days old — refresh and re-queue?"), not new storage. `duplicate_check`'s window must become
category-aware (evergreen opt-in per queue item or brand-kit content pillar), and re-drafts
go through content-craft (variation, not verbatim repost — verbatim is what got the
incumbents' users flagged).

### Guardian/review pattern — CI-for-content

Incumbent "AI review" is a suggestion layer. The stronger pattern is CI: **checks with
severities, a report, and a merge gate**. Honk already has the gate (policy at dispatch) and
the checklist (persona gates); what's missing is the *report* — a single pre-publish
`content_check` surface aggregating validate + policy + duplicate + craft-structure signals
into one pass/warn/block summary the agent (or H1 UI) renders. Deterministic checks stay
in-server; agent-judged checks stay prose (security doctrine §1 in PROJECT_ARCHITECTURE) —
the report just makes the whole gate legible. Candidate: H1, after the workflow library.

### Open questions (added)

- **Long-form + media_compose:** does the blog class reuse branded templates for feature
  images (likely yes — same `media_compose`, new aspect presets)?
- **Asset registry dedupe:** content-hash assets at register time (the `hash.ts` pattern) to
  stop re-uploading identical media under new URLs?
- **Recycling autonomy:** is re-queueing ever autonomous, or permanently guided? Leaning:
  suggestion-only until INDIV-007 data proves variation quality.
