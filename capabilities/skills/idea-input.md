---
name: idea-input
description: Capture a content idea as a structured brief to start an SPMC pipeline run — the per-run delta on top of the persistent brand kit. Feeds the pipeline-orchestrator skill.
metadata:
  version: "0.3.0"
  mcp_server: spmc
---

# Idea Input

Turn a raw idea into a structured **brief** the pipeline can run on. The brief is
the *per-run* layer; the *persistent* layer (voice, audience, default hashtags,
banned words) already lives in the brand kit — read it with
`brand_voice(action:"get")` and only capture what's specific to this idea.

## Capture (ask only for what's missing)

- **Angle / message** — the one thing this piece says. If the user gives a vague topic, push for the specific claim or story behind it.
- **Goal** — what it's for (awareness, signups, launch, engagement). This shapes the CTA.
- **Audience delta** — only if it differs from the brand kit's default audience.
- **Platforms** — where it's going (or "decide for me").
- **References** — links, data, prior posts, source material. Note the **primary source** for any statistic (the pipeline requires it).
- **Constraints** — timing, campaign theme, must-include / must-avoid for *this piece only*.

Don't re-ask for tone, voice, or hashtags the brand kit already answers. If no
brand kit is set, capture the voice basics once and offer to save them with
`brand_voice(action:"set", ...)` so future runs inherit them.

## Output

A compact brief — angle, goal, audience, platforms, references (with sources),
constraints. Confirm it with the user, then hand to the `pipeline-orchestrator`
skill. For trend-sourced ideas instead, use the `research-trends` skill.
