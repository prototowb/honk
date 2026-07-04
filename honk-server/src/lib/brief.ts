// The per-run content brief — the single source of truth for the fields a pipeline
// run needs *on top of* the persistent brand kit (lib/brand.js). One spec drives
// the surfaces so they can't drift: guided-mode chat intake (the idea-input /
// research-trends skills walk it field-by-field), a future web-UI form (renders
// these fields directly), and — optionally, later — MCP elicitation. Persistent
// voice / audience / hashtags live in the brand kit; this captures only the
// per-run delta. Credential-free; no adapter touched.

import type { BriefField, BrandProfile } from './types.js';
import { WORKFLOWS } from './workflows.js';

// Each field carries: a stable `key`, a human `label`, a `type`
// (text | enum | multiselect | datetime | list), `required`, `help`, optional
// `options` (enum/multiselect), and `brandKitPath` — the dotted path into a brand
// profile that pre-fills it, so guided mode and a UI can skip what the kit already
// answers. `requiredIf` is a conditional requirement that prose/UI enforces (a
// static schema can't express the condition itself).
export const BRIEF_FIELDS: BriefField[] = [
  {
    key: 'workflow', label: 'Workflow starter', type: 'enum', required: false,
    options: [...WORKFLOWS.map(w => w.name), 'none'],
    help: 'Pick a pre-configured workflow starter (see workflow_list) — it pre-answers goal/platforms/format so you only supply what it requires. "none" = free-form run.',
    brandKitPath: null,
  },
  {
    key: 'angle', label: 'Angle / message', type: 'text', required: true,
    help: 'The one thing this piece says — the specific claim or story, not a vague topic.',
    brandKitPath: null,
  },
  {
    key: 'goal', label: 'Goal', type: 'enum', required: true,
    options: ['awareness', 'signups', 'launch', 'engagement', 'thought-leadership'],
    help: 'What the piece is for. Shapes the call-to-action.',
    brandKitPath: null,
  },
  {
    key: 'platforms', label: 'Platforms', type: 'multiselect', required: true,
    options: ['x', 'instagram', 'tiktok', 'facebook', 'threads', 'bluesky', 'decide-for-me'],
    help: 'Where it publishes. "decide-for-me" lets the pipeline pick best-fit platforms.',
    brandKitPath: null,
  },
  {
    key: 'schedule', label: 'Schedule', type: 'datetime', required: false,
    help: 'When to publish (ISO 8601 with an explicit offset). Omit to save as a draft / publish now.',
    brandKitPath: null,
  },
  {
    key: 'references', label: 'References', type: 'list', required: false,
    requiredIf: 'the piece cites any statistic or figure',
    help: 'Links / source material. Mark the PRIMARY source for any statistic — the pipeline requires it.',
    brandKitPath: null,
  },
  {
    key: 'audience', label: 'Audience', type: 'text', required: false,
    help: "Who this piece targets. Name a defined audience segment (see brand_voice audiences) to tailor the voice to it, or free-text a one-off audience. Omit to use the brand kit's default.",
    brandKitPath: 'voice.audience',
  },
  {
    key: 'constraints', label: 'Constraints', type: 'text', required: false,
    help: 'Timing, campaign theme, must-include / must-avoid for THIS piece only.',
    brandKitPath: null,
  },
];

// Dotted-path getter used to resolve `brandKitPath` against a brand profile.
function at(obj: unknown, path: string): unknown {
  return path.split('.').reduce((o: unknown, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj);
}

// Annotate the spec with what the brand kit already answers for an account, so
// guided mode / a UI can pre-fill and skip those fields. Pure: profile in,
// annotated copy out (never mutates BRIEF_FIELDS). A non-empty resolved value is
// attached as `prefill`.
export function briefSchema(brandProfile: BrandProfile | null = null): BriefField[] {
  return BRIEF_FIELDS.map((f) => {
    if (!brandProfile || !f.brandKitPath) return { ...f };
    const v = at(brandProfile, f.brandKitPath);
    const has = Array.isArray(v) ? v.length > 0 : v != null && v !== '';
    return has ? { ...f, prefill: v } : { ...f };
  });
}

// Human-readable rendering for the brief_schema tool output: the guided-mode
// question list, marking required-ness, options, and brand-kit pre-fills.
export function formatBriefSchema(fields: BriefField[]): string {
  const lines = fields.map((f) => {
    const req  = f.required ? 'required' : f.requiredIf ? `required if ${f.requiredIf}` : 'optional';
    const opts = f.options ? ` — options: ${f.options.join(', ')}` : '';
    const pre  = 'prefill' in f
      ? `\n    ↳ brand kit: ${Array.isArray(f.prefill) ? (f.prefill as string[]).join(', ') : f.prefill} (confirm or override)`
      : '';
    return `• ${f.label} \`${f.key}\` (${f.type}, ${req})${opts}\n    ${f.help}${pre}`;
  });
  return 'Content brief — the per-run fields (the brand kit holds voice/hashtags):\n\n'
    + lines.join('\n');
}
