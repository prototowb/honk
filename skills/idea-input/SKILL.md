---
name: idea-input
description: Capture a new content idea with metadata (topic, audience, tone, brand guidelines, references) to start an SPMC content-pipeline run. First step of the creative pipeline — the structured brief feeds the pipeline-orchestrator skill.
metadata:
  version: "0.2.0"
---

# Idea Input Skill

Collect the idea details that will feed into the content pipeline. This skill captures structured metadata that guides the concept generation, review, and content creation agents.

## What to do

When a user submits a content idea, extract and organize the following metadata:

- **Topic/Category**: What is this content about? (e.g., product launch, tutorial, thought leadership, behind-the-scenes)
- **Target Audience**: Who is this for? (e.g., developers, small business owners, gen z, tech enthusiasts)
- **Tone**: What's the vibe? (e.g., professional, casual, humorous, inspirational, educational)
- **Brand Guidelines**: Any specific brand rules, voice notes, or do's/don'ts? (e.g., always include CTAs, avoid jargon, emphasize sustainability)
- **Reference Links**: Any relevant articles, previous posts, or inspiration the user wants to reference?
- **Additional Context**: Anything else that will help the agents understand the brief? (e.g., current campaign theme, hashtag focus, timeline)

Structure this as a **pipeline brief** object that will be passed to the concept generator agent. Format it clearly so the agents can parse it easily.

## When to trigger

- User says "I have a content idea" or "submit a new idea"
- User wants to start a new pipeline run
- User provides details about a social media concept they want to develop

## Output

Return a structured brief ready for the concept generation agent. Include all captured metadata and confirm the details with the user before moving forward.
