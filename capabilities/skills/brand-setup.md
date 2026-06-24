---
name: brand-setup
description: Guide a first-time user through setting up their brand kit (voice + visual identity) so every post and composed image is on-brand without re-specifying it each time. Populates the persistent brand kit the other skills read.
metadata:
  version: "0.3.0"
  mcp_server: spmc
---

# Brand Setup

The brand kit is the **persistent individuality layer** — set it once and every
draft (`brand_voice`) and every composed image (`media_compose`) inherits the
brand's voice and visual identity. This skill walks a first-time user through it.

## When to offer this

When the kit is empty or thin. Check with `brand_voice(action:"get")` — if it
returns "No brand profile set", **offer guided setup before** writing posts or
composing images: *"You don't have a brand kit yet — want me to set it up (2 min)
so everything comes out on-brand? Or I can just use sensible defaults for now."*
Never force it; a kit half-filled is still useful, and `media_compose` falls back
to tasteful template defaults when nothing is set.

## Guided walkthrough

Call `brand_schema` for the field list **with current values**. Then collect
**one field at a time, in group order**, skipping anything already set (confirm
those rather than re-asking). Lead with the **recommended** fields — they are
what make outputs feel on-brand — and offer to stop once those are done:

1. **Voice** — tone, audience (recommended); register, emoji policy, banned words.
2. **Visual identity** — accent + background colors and handle (recommended);
   surface/heading/body colors, logo URL, icon URL, default template. Colors are
   hex (e.g. `#1df7ed`). Leave heading/body blank to auto-derive legible colors
   from the background. If the user has a brand style guide, ask for its palette.
3. **Hashtags & CTA** — default hashtags, reusable calls-to-action.
4. **Content policy** — banned topics, required disclosures (always/sponsored),
   auto-publish. Optional but high-value; see below.
5. **Notes** — anything else to keep in mind.

`brand_schema` is the same field spec a future web-UI settings form renders —
collect against it, use the **dotted paths** it lists (e.g. `visual.accent`),
don't invent fields.

## Saving

Write with a single `brand_voice(action:"set", profile:{…})` using the dotted
paths (nested objects deep-merge, so you can save incrementally):

```
brand_voice(action:"set", profile:{
  voice:  { tone:"concise, direct", audience:"indie devs" },
  visual: { accent:"#1df7ed", bg_color:"#05091e", handle:"@yourbrand",
            default_template:"square-tall" }
})
```

For a non-default account, pass `account`. Show the saved kit back
(`brand_voice(action:"get")`) and confirm. Then a quick proof: compose a sample
with `media_compose(template:"square-tall", headline:"…")` — it should pick up
the brand colors and handle automatically (the result notes "brand kit applied").

## Per-platform deltas (optional, advanced)

Once the core kit is set, a brand can tune its voice per channel — punchier and
near-zero hashtags on X, more hashtags on Instagram. This is optional; skip it
unless the user asks or clearly varies by platform. Store deltas under the
`platforms` block (overridable: `tone`, `register`, `emoji_policy`, `audience`,
`hashtags`, `cta`); a set value **replaces** the base for that platform:

```
brand_voice(action:"set", profile:{ platforms:{
  x:         { tone:"punchier", hashtags:["#buildinpublic"] },
  instagram: { hashtags:["#startup","#indiehackers","#buildinpublic"] }
}})
```

Check the resolved result with `brand_voice(action:"get", platform:"x")`. The
platform skills read this automatically when drafting for a channel.

## Audience segments (optional, advanced)

A second tailoring axis: the same brand speaks differently to different audiences
("enterprise buyers" vs "indie devs"), independent of platform. Store named
segments under `audiences`; a segment can set `tone`, `register`, `emoji_policy`,
`hashtags`, `cta` (NOT `audience` — selecting the segment *is* the audience):

```
brand_voice(action:"set", profile:{ audiences:{
  enterprise: { tone:"measured, credible", hashtags:["#infosec","#compliance"] },
  indie:      { tone:"punchy, candid",     hashtags:["#buildinpublic"] }
}})
```

Resolve one with `brand_voice(action:"get", audience:"enterprise")`, or combine
with a platform — precedence is **base ▸ audience ▸ platform** (a per-platform
delta wins over an audience delta on the same field). Skip this unless the user
clearly addresses distinct audiences.

## Content policy / guardrails (optional, high-value)

The kit's `policy` block is the brand's safety layer — what it must not say, what
it must always say, and how freely it publishes. Worth setting for any brand that
runs ads or has off-limits topics:

- **Banned topics** (`policy.banned_topics`) — themes never to post about
  (agent-judged), e.g. "competitor comparisons". The drafting skills treat these
  as hard rules.
- **Always-on disclosures** (`policy.disclosures.always`) — strings every post
  must include; `content_validate` warns when one is missing.
- **Sponsored disclosures** (`policy.disclosures.sponsored`) — strings a paid post
  must include (e.g. `#ad`); publishing a post flagged `sponsored: true` without
  one is **blocked**.
- **Auto-publish** (`policy.auto_publish`) — leave `false` (default) to always
  confirm before publishing; set `true` only if the user wants the agent to
  publish without a per-post check.

```
brand_voice(action:"set", profile:{ policy:{
  banned_topics:["competitor comparisons"],
  disclosures:{ always:[], sponsored:["#ad"] },
  auto_publish:false
}})
```

## Portability

The kit is **user data**, stored outside the repo (the server's data directory),
not committed. To move it to another machine or back it up, copy that folder
(it holds `brand.json`); a UI export will wrap this later. Nothing here contains
secrets — credentials live separately in `~/.claude/spmc.env`.
