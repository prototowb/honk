# PROJECT_PRINCIPLES.md — Honk

> **Boundary:** [`PROJECT_SPECIFICATIONS.md`](PROJECT_SPECIFICATIONS.md) carries the product vision,
> architecture invariants, and feature roadmap. This file governs how work gets *initiated and
> steered* — the delegation layer: how agents know what to do, how users kick off workflows,
> and how the two modes of operation interact with each other and with the codebase.
>
> Cross-link, don't duplicate. If something belongs in SPECIFICATIONS, put it there.

---

## 1. The Two-Axis Mode Model

Every workflow runs on two independent axes.

**Input axis — who shapes the workflow:**

- **Un-guided:** The agent has full latitude. It chooses topic, platform, format, and draft
  direction from context (active brand, research, schedule). No per-run steering from the user.
  Default for scheduled/autonomous runs and open-ended sessions.
- **Guided:** The user provides direction at defined decision points — the *minimum required
  inputs* — and picks from a library of pre-configured workflow starters. The agent handles
  everything in between. Default for intentional, deliberate publishing sessions.

**Authority axis — who authorizes the output:**

- **Supervised:** A human reviews and approves the final draft before any publish tool fires.
  The project default. Anchored to `auto_publish: false` in the brand policy block — no new
  machinery needed.
- **Autonomous:** The workflow is pre-authorized. The agent drafts, runs all gates, and
  publishes without per-run human approval. Anchored to `auto_publish: true`. Required for
  scheduled/cron runs where no human is present.

These axes are independent. The four combinations:

|               | **Supervised**                          | **Autonomous**            |
|---------------|-----------------------------------------|---------------------------|
| **Un-guided** | Live creative session (default one-off) | Scheduled cron run        |
| **Guided**    | Deliberate campaign post (UI prototype) | Recurring guided campaign |

**A workflow library entry (§3) is a parameterized spec that runs in any quadrant.** It defines
what's required from the user when guided, and what it decides autonomously when un-guided.
The authority axis is set at call time, not baked into the entry. This means **a scheduled run
and a live session are the same workflow, different authority mode** — no separate machinery,
no separate prompts.

---

## 2. Guided Mode — Minimum Required Input Surface

Guided mode is the bridge between agent autonomy and the future UI. The design contract:

**Required inputs — the agent cannot decide these:**
- Topic or theme — *or* explicit "you pick" to fall back to un-guided
- Platform(s) — *or* explicit "you pick"
- Audience segment (if differing from brand default)

**Optional inputs — the agent picks if omitted:**
- Format (single image, carousel, thread, etc.)
- Tone delta from brand default
- Scheduling target

**Agent decides — never user's concern in guided mode:**
- Copy structure (hook / context / payoff / CTA — the `content-craft` layer)
- Source attribution mechanism (caption link / `first_comment` / on-image)
- Hashtag selection from brand kit sets
- Draft iterations before presenting to user

The rule: **guided mode minimizes *required* input, not optional input.** Every required input
should be reducible to a pick from the workflow library (§3) — not a write.

When presenting options to the user, guided mode should:
1. Surface the active brand, active platform(s), and suggested format with reasoning
2. Present all viable alternatives the user can pick from
3. Only then ask for any truly open-ended input (topic, if not pre-configured)

---

## 3. The Workflow Library

The "paste this to the agent" pattern is a hand-written system prompt per session — fragile,
non-reusable, and untestable. The workflow library replaces it with named, reusable workflow
starters.

**What a workflow entry is:**
- A named starting context: `weekly-insight`, `product-update`, `engagement-spark`
- Declares: required inputs (what the user picks/confirms), defaults (what the agent assumes),
  platform/format recommendations to surface, and which skills are activated
- Not a prompt — a *parameterized spec*. The agent loads it and drives the session from it.

**Where it lives (v1 shipped, INIT-008):** the machine spec lives in
`honk-server/src/lib/workflows.ts` (single origin, like `specs.ts`/`brief.ts`) and surfaces
through the `workflow_list` tool — an amendment to the original `capabilities/workflows/*.md`
location, made for schema symmetry (required inputs ARE brief-field keys, testable) and
because npm surfaces ship `lib/`, not `capabilities/`. Per-entry long-form prose can join
`capabilities/` later without moving the spec.

**Conceptual entry shape:**
```
name: weekly-insight
description: Research and draft a weekly fact-bearing insight post
required_inputs: [topic_or_theme, platform_or_pick]
default_platforms: [instagram, threads]
suggested_formats:
  instagram: carousel
  threads: thread
activates: [content-craft, best_time, first_comment sourcing]
```

**Guided vs. un-guided use of the same entry:**
- Guided: user picks a workflow from the library → agent prompts for required inputs → executes
- Un-guided: agent selects the entry autonomously from context/schedule → executes with no
  human prompts

**Corollary:** Any time a workflow is initiated with an ad-hoc system prompt, ask whether a
library entry would have served — and create one if the pattern is reusable.

---

## 4. Schema Symmetry — Guided Mode as the UI Prototype

The `brief_schema` / `brand_schema` through-line in the Individualization section of
[`PROJECT_SPECIFICATIONS.md`](PROJECT_SPECIFICATIONS.md) generalizes to a governing principle:

**Every guided decision point maps to a schema field. The schema drives both the guided agent
prompt and the eventual UI control.**

| Decision point     | Schema field                             | Status  | Future UI control        |
|--------------------|------------------------------------------|---------|--------------------------|
| Active brand       | `brand-active.json` / `brand_voice use`  | shipped | Brand switcher           |
| Platform selection | `brief.platforms`                        | shipped | Platform toggle group    |
| Audience segment   | `brief.audience`                         | shipped | Segment selector         |
| Draft approval     | `policy.auto_publish` gate (not a field) | shipped | Preview + approve screen |
| Format selection   | `brief.format`                           | planned | Format card picker       |
| Workflow starter   | `brief.workflow` + `workflow_list`       | shipped | Workflow gallery         |

> **Status** = whether the schema field exists today. `brief.workflow` shipped with the
> workflow library v1 (INIT-008). `brief.format` remains **planned, not yet built** — flagged
> so guided flows don't reference it as if shipped.

**Corollary:** Don't design guided flows that skip this mapping. A guided decision that's hard
to map to a schema field signals either a missing field or an underspecified decision.

**Corollary:** Don't write system prompts to carry decisions that belong in the schema. Every
time a system prompt carries a decision (e.g., "use the @protocode_ brand"), that decision
should become a schema field with a default.

---

## 5. Autonomous Mode Self-Direction

A scheduled or background run with no human present needs an explicit self-direction spec.
The agent decides, in order:

1. **Workflow selection** — from schedule context, configured default workflow, or day-of-week
   content calendar (future: `voice.examples` + observed analytics from INDIV-007)
2. **Topic / theme** — from a configured topic queue, trending research, or content pillars
   in the brand kit
3. **Platform + format** — from the workflow entry's defaults, overridden by `best_time` research
4. **Authority check** — publish only if `auto_publish: true` in the active brand's policy block;
   if false, queue the draft for human review on next supervised session

**Self-direction checklist (non-negotiable before any autonomous publish):**
- [ ] Load active brand kit + policy block
- [ ] Confirm `auto_publish: true` — if false, queue draft and stop
- [ ] Run `duplicate_check` (no reposts)
- [ ] Run persona checklist gates (accessible sourcing + copy structure)
- [ ] Run `content_validate` (policy compliance)
- [ ] Publish → record audit log → echo result

---

## 6. Preventing Ad-Hoc System Prompts — The Delegation Rule

Agent behavior that was written ad-hoc in chat should be extracted into the brand kit, a
workflow entry, or a skill — not left in chat history.

| User action                    | Anti-pattern (today)             | Target                                        |
|--------------------------------|----------------------------------|-----------------------------------------------|
| Start a live session           | Write a system prompt            | Pick a workflow from the library              |
| Schedule a recurring run       | Configure cron + write prompt    | `Schedule workflow: weekly-insight, autonomous` |
| Correct agent behavior         | Correct in chat each time        | Save to `brand_voice` or workflow entry       |
| Choose a topic                 | Describe in open natural language| Pick from agent-suggested options or one word |

**See also:** [`ROADMAP_NOTES.md`](ROADMAP_NOTES.md) — research on template gallery, CLI,
and command palette patterns that inform this design.

---

## Cross-References

- [`PROJECT_SPECIFICATIONS.md`](PROJECT_SPECIFICATIONS.md) — product vision, architecture
  invariants, feature roadmap, competitive positioning
- [`ROADMAP_NOTES.md`](ROADMAP_NOTES.md) — research on comparable mechanisms; living notes
  for roadmap context
- [`AGENTS.md`](AGENTS.md) — agent orchestration, pre-flight checklist, critical rules
- [`SESSION_HANDOFF.md`](SESSION_HANDOFF.md) — current session state
