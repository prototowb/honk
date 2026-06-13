---
name: Manage content queue & schedule
description: Manage the content dashboard, review queued content, generate platform-specific visuals, schedule posts, and publish to Instagram, Facebook, X, and TikTok. ALWAYS use this skill when the user wants to publish, post, schedule, queue, or review social media content — even if they don't say "output manager" or "queue." Also triggers when the user says "post this," "publish concept X," "schedule for Tuesday," or "what's in my queue."
---

# Output Manager Skill

This skill manages the full end-to-end publishing workflow: queue dashboard, image generation, scheduling, and platform publishing.

## What to do

### Dashboard & Queue Management
- Display all pipeline outputs in a structured queue/dashboard format
- Show status for each piece of content:
  - **Draft**: Ready for review
  - **Approved**: Ready to schedule
  - **Scheduled**: Queued for posting
  - **Published**: Live on platforms
- Allow the user to review, approve, or request changes on any content

### Scheduling
- Accept scheduling preferences:
  - Post immediately
  - Schedule for a specific date/time
  - Save as draft for later
- Support variable frequencies (1-2x weekly to multiple daily)
- Track posting schedule across all platforms

---

## Visual Content Generation (Mandatory Pre-Publish Step)

**Always generate platform-specific images before publishing to any visual platform (Instagram, Facebook, TikTok) — unless the user explicitly provides an image URL or says to skip.**

This step runs at publish time, after the user has selected which concept(s) to post.

---

### Step 1: Write copy for the visual

Before touching Canva, extract and rewrite the content for visual use. Think like a conversion copywriter and creative director — visuals have zero tolerance for filler.

**Rules (non-negotiable):**

1. **No clichés.** Never write "Unlock," "Revolutionize," "Tapestry," "Elevate," "Delve," "Discover," "Transform," or anything that sounds like a template. They signal low effort and kill engagement.
2. **Short and punchy.** Headlines ≤ 6 words. Subheadlines ≤ 12 words. If a word doesn't pull its weight, cut it.
3. **Lead with a verb.** Open headlines and CTAs with strong action words that speak directly to the reader.
4. **Benefit-first.** Don't describe what the content *is* — tell the reader what they *gain* or what *pain* they *avoid*.
5. **Match the tone.** Pull the tone from the content brief (bold, casual, urgent, educational). The visual voice should feel continuous with the caption.

From the caption and content brief, extract:
- **Headline**: The sharpest hook, rewritten for visual impact (≤ 6 words)
- **Subheadline**: Supporting stat or key tension (≤ 12 words)
- **Body text**: One or two lines — the single most important takeaway

Example extraction:
> Caption hook: "AI-generated code has 2.74x more bugs than human-written code."
> → Headline: `"2.74x More Bugs."`
> → Subheadline: `"AI writes it. You own the risk."`
> → Body: `"Review every line. TypeScript catches what vibes can't."`

---

### Step 2: Infer the visual style

Don't apply a generic template. Read the topic, audience, and tone from the content brief, then decide:

- **Color palette**: Dark backgrounds for tech/dev content (navy, charcoal + electric blue/purple accents); warm palettes for lifestyle; clean whites for thought leadership
- **Typography mood**: Bold condensed sans-serif for punchy/provocative content; clean geometric for educational; editorial serif for premium/long-form
- **Visual motif**: Match the subject — code/circuit textures for dev content, abstract gradients for AI/future topics, photography for human-interest angles
- **Platform feel**: The design should look native to that platform, not like a resize from another

---

### Step 3: Generate platform-specific Canva designs

Use `mcp__ee632fc1-c488-4956-84e9-7b3a603e7ece__generate-design` for each platform being published to.

**Platform specs:**

| Platform  | `design_type`    | Format                    |
|-----------|-----------------|---------------------------|
| Instagram | `instagram_post` | Portrait 4:5 (1080×1350)  |
| Facebook  | `facebook_post`  | Landscape/square          |
| TikTok    | `your_story`     | Vertical 9:16 (1080×1920) |

**Build the Canva query using this structure:**
```
[Platform]-native post. [Visual style: background, palette, typography mood, motif].
Headline: "[headline]". Subheadline: "[subheadline]". Body: "[body text]".
[Any additional visual direction — e.g., "include a subtle code texture", "bold stat treatment", "minimalist layout with strong negative space"].
```

- Present the generated candidates to the user (show thumbnails inline)
- Ask the user to pick one
- Use `mcp__ee632fc1-c488-4956-84e9-7b3a603e7ece__create-design-from-candidate` to save the chosen design to Canva

---

### Step 4: Export to get the public image URL

Use `mcp__ee632fc1-c488-4956-84e9-7b3a603e7ece__export-design` with:
- `format.type`: `"jpg"`
- `format.quality`: `90`

The returned URL is used as `image_url` when calling the social publishing MCP.

---

## Publishing Workflow

With the exported image URL in hand, publish to each platform using the social publisher MCP:

- **Instagram**: requires `image_url` + `caption`
- **Facebook**: `image_url` optional but always include if generated
- **X**: no image required; use tweet or thread tool as appropriate
- **TikTok**: requires video URL; skip image gen for TikTok if only video posting is supported by the MCP

Log each publish action with platform, timestamp, and post ID.

---

## Analytics Integration
- After posting, flag content for analytics tracking
- Supported connections:
  - Platform-native analytics (Instagram Insights, X Analytics, TikTok Creator Studio)
  - Plausible Analytics (unified GDPR-compliant tracking)
- Provide performance summaries and comparison views

---

## When to trigger

- User wants to view the queue: "show me my dashboard" / "what's queued?"
- User wants to publish: "post this now" / "publish concept 2" / "post to Instagram and Facebook"
- User wants to schedule: "schedule this for Tuesday at 9am"
- User wants analytics: "show me analytics" / "which posts performed best?"
- Called by the pipeline after concept generation to manage post-pipeline operations
