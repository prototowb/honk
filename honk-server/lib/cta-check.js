// Deterministic CTA-presence heuristic (INIT-016) — a content_check NOTE, not
// a warning: it flags only whether the text a viewer reads contains ANY
// CTA-shaped phrasing or a link, never whether the CTA is any good (that
// stays agent-judged — report.ts AGENT_GATES, "Structure" line). A regex is a
// proxy for "did they ask for something", not ground truth, so it must never
// flip the pass/warn/block verdict — same reasoning validate.ts already
// applies to banned_topics (not string-detectable, surfaced as a note).
//
// Reuses validate.ts's contentText() so platform field routing (caption vs
// message vs text, thread join) has exactly one source.
import { contentText } from './validate.js';
const CTA_PATTERNS = [
    /\b(comment|repl(y|ies)|share|repost|retweet|tag (a|someone)|save this|follow(?:\s+(?:us|me|@\w+))?|dm (?:us|me)|drop a|let (?:us|me) know|ask away|vote|rsvp)\b/i,
    /\b(sign up|subscribe|join|register|book|download|shop|grab|check out|learn more|read more|see more|swipe|tap|click|link in bio)\b/i,
    /https?:\/\//i, // a link is itself a call to action
];
export function hasCta(platform, content) {
    const text = contentText(platform, content);
    return !!text && CTA_PATTERNS.some(re => re.test(text));
}
// Informational only — always returned, never blocking. See file header.
export function ctaNote(platform, content) {
    return hasCta(platform, content)
        ? 'Call-to-action or link detected in the text (heuristic).'
        : 'No call-to-action or link detected (heuristic: CTA-shaped phrasing or a URL). If intentional, proceed — otherwise this post is likely missing its one next step.';
}
