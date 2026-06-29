---
name: research-trends
description: Research trending topics and turn the most promising one into a pipeline-ready brief. Agent-driven — you bring the research ability; output feeds pipeline-orchestrator. The automated alternative to idea-input.
metadata:
  version: "0.3.0"
  mcp_server: honk
---

# Trend Research → Brief

Find what's worth posting about now and convert it into a brief. Honk has no
trends API — you do the research with the tools you have (web search, the user's
sources) and bring back a *brief*, not raw links.

## Process

1. **Scan** 3–5 candidate trends in the brand's space — news, releases, discourse the audience actually follows. Region / category / platform / timeframe are optional; default to the brand's niche.
2. **Score** each on: relevance to the audience, freshness (is it *now*?), saturation (is everyone already posting it?), and brand fit (can this brand say something credible?). A sharp angle on a fresh, under-covered trend beats a generic take on a saturated one.
3. **Pick one** and find the **primary source** for any statistic it rests on — follow secondary articles back to the original study (the pipeline requires it).
4. **Write the brief**: angle, why-now, audience, goal, references (with sources), suggested platforms. Pull voice/audience defaults from `brand_voice(action:"get")` — note deltas, don't restate them.

## Output

A pipeline-ready brief (same shape as `idea-input`'s) plus a one-line "why now."
Confirm with the user, then hand to the `pipeline-orchestrator` skill.

**Guided mode — offer it after picking a trend:** once you've chosen the angle,
**proactively offer to walk the brief** rather than handing over a single draft. If
the user takes it, call `brief_schema` and fill the remaining per-run fields **one at
a time** — pre-seed `angle`/`references` from your research, skip what the brand kit
pre-fills, confirm the rest. Same field spec as `idea-input` and the future web UI
form. Declining is fine; but make the offer rather than defaulting to a bare draft.

## Principles

- Relevance over volume — one strong angle beats five weak ones.
- Find the "why now" — the reason it's interesting *today*.
- Under-covered beats saturated; a fresh angle on a tired trend is still tired.
- Credible sources only; trace every stat to its origin.
