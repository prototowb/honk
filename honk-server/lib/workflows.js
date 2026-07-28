// The workflow library (INIT-008) — named, reusable workflow starters that
// replace hand-written per-session system prompts (PROJECT_PRINCIPLES.md §3).
//
// An entry is a parameterized SPEC, not a prompt: what the user must supply when
// guided (required_inputs — brief_schema field keys, schema symmetry §4), what
// the agent assumes when un-guided (defaults), what to surface (suggested
// formats), and which capabilities it activates. The same entry runs in any
// quadrant of the two-axis model: guided/un-guided is who fills the inputs;
// supervised/autonomous is the brand policy's auto_publish at call time.
//
// Single origin: machine facts live HERE (code, like specs.ts/brief.ts) so the
// tool, tests, and generated docs cannot drift — an amendment to PRINCIPLES §3's
// original capabilities/workflows/*.md location, made for schema symmetry and
// because npm surfaces ship lib/, not capabilities/. Per-entry long-form prose
// (if an entry ever needs it) can join capabilities/ later without moving the spec.
export const WORKFLOWS = [
    {
        name: 'weekly-insight',
        description: 'Research and draft a fact-bearing insight post — one specific, sourced idea delivered in the layered hook→payoff structure.',
        required_inputs: ['angle'],
        defaults: { goal: 'thought-leadership', platforms: ['instagram', 'threads'] },
        suggested_formats: { instagram: 'carousel', threads: 'thread' },
        activates: ['content-craft', 'research-trends', 'best_time', 'accessible sourcing (first_comment / caption link)'],
    },
    {
        name: 'product-update',
        description: 'Announce a release, feature, or change — concrete what-changed and why-it-matters, linked to the source of truth (changelog, release notes).',
        required_inputs: ['angle', 'references'],
        defaults: { goal: 'launch', platforms: ['x', 'bluesky'] },
        suggested_formats: { x: 'thread', bluesky: 'single post' },
        activates: ['content-craft', 'link_tag (UTM)', 'duplicate_check'],
    },
    {
        name: 'engagement-spark',
        description: 'Open a discussion — a sharp question or contrarian-but-defensible take designed for replies, not reach.',
        required_inputs: [],
        defaults: { goal: 'engagement', platforms: ['threads', 'facebook'] },
        suggested_formats: { threads: 'single text post', facebook: 'text post (no link)' },
        activates: ['content-craft', 'brand_voice (audience segments)', 'best_time'],
    },
];
export function listWorkflows() { return WORKFLOWS; }
export function getWorkflow(name) {
    return WORKFLOWS.find(w => w.name === name.toLowerCase().trim()) || null;
}
function fmtVal(v) { return Array.isArray(v) ? v.join(', ') : v; }
export function formatWorkflow(w) {
    const req = w.required_inputs.length
        ? w.required_inputs.map(k => `\`${k}\``).join(', ') + ' (each may be delegated: "you pick")'
        : 'none — fully delegable';
    return [
        `## ${w.name}`,
        w.description,
        `- required inputs (brief fields): ${req}`,
        `- defaults when un-guided: ${Object.entries(w.defaults).map(([k, v]) => `${k}=${fmtVal(v)}`).join(' · ')}`,
        `- suggested formats: ${Object.entries(w.suggested_formats).map(([k, v]) => `${k}: ${v}`).join(' · ')}`,
        `- activates: ${w.activates.join(', ')}`,
    ].join('\n');
}
export function formatWorkflows(entries) {
    return [
        `Workflow library — ${entries.length} entries. Pick one to start a run (guided: collect its required inputs via brief_schema; un-guided: apply its defaults and say what you chose). Authority (supervised vs autonomous) comes from the brand policy's auto_publish at call time, never from the entry.`,
        '',
        ...entries.map(formatWorkflow),
    ].join('\n');
}
