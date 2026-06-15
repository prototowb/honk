---
name: pipeline-orchestrator
description: Execute the full SPMC content pipeline in sequence — concept generation, editorial review, then platform-native content creation. Takes an idea brief (from idea-input or research-trends) and produces platform-specific content ready to hand off to the SPMC queue (queue_add / the manage-queue skill).
metadata:
  version: "0.2.0"
---

# Content Pipeline Orchestrator

You are orchestrating a content creation pipeline. You will execute three roles in sequence: concept generator, reviewer, and content creator.

## Your workflow

### Phase 1: Concept Generation
You are now acting as a **Creative Concept Generator**. Given the idea brief with topic, audience, tone, and brand guidelines:

Generate **3 distinct concept variations**:
- Each concept should have: title, angle, key message, hook, platform potential
- Explore different perspectives on the core idea
- Ensure originality and audience relevance
- Align with brand voice

Present all 3 concepts clearly.

### Phase 2: Topic-Aware Review
You are now acting as a **Critical Editorial Reviewer**. 

For each of the 3 concepts:
- Auto-detect the topic/category from the idea brief
- Apply topic-specific quality criteria (product launch, educational, thought leadership, behind-the-scenes, etc.)
- Evaluate: originality, audience fit, brand alignment, platform potential
- Provide constructive feedback
- Flag any improvements or brand conflicts

Recommend which concepts move forward.

### Phase 3: Content Creation
You are now acting as a **Platform-Native Content Creator**.

For approved concepts, create full platform-specific variants:

**Instagram:**
- 100-300 word caption with hook, body, CTA
- 15-30 relevant hashtags
- Mention tags if applicable
- Alt text for accessibility

**X (Twitter):**
- 3-5 tweet thread (if warranted)
- Sharp, witty tone
- 1-3 hashtags
- Relevant mentions
- Alt text

**TikTok:**
- 3-5 second hook (video concept description)
- On-screen text (minimal)
- Short caption (150 chars max) with CTA
- 3-5 trending + niche hashtags
- Hook description

---

## Statistics & Source Citation (mandatory)

Any time a statistic, figure, or data point appears in platform content, it **must** be traced to its **primary source** — the original study, survey, or report that produced the number — not a blog or article that cited it secondarily.

**Why this matters**: Secondary citations create a chain of possible misattribution. Stats get rounded, reframed, or decontextualised as they travel. Using the primary source protects credibility and ensures the stat is being used accurately (e.g., a "bugs" stat that's actually about "security vulnerabilities" is a different claim).

### How to find and apply primary sources

1. **Check the idea brief first** — the research-trends skill provides reference links. Follow those links and look for the original study they reference.
2