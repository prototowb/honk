import { PLATFORM_SPECS, measure, sliceUnits, splitIntoChunks } from './specs.js';

// Fit one source text to each target platform's hard constraints and return
// content payloads shaped exactly like the publish/queue tools expect.
//
// This deliberately does only the *deterministic* part — counting, truncating,
// thread-splitting. The creative rewrite (tone, hashtags, per-channel voice) is
// the calling agent's job; a length-fitter shouldn't pretend to do that.

function adaptOne(text, platform, spec, opts) {
  const { field, max, unit } = spec.text;
  const notes = [];
  const mediaNote = () => {
    if (spec.media?.required) {
      notes.push(`Supply "${spec.media.field}" (a public ${spec.media.kind} URL) before publishing.`);
    }
  };

  // X: single tweet if it fits, otherwise an auto-split thread.
  if (platform === 'x') {
    if (measure(text, unit) <= max) {
      return { format: 'single', content: { text }, units: measure(text, unit), limit: max, unit, fits: true, notes };
    }
    const tweets = splitIntoChunks(text, max, unit);
    notes.push(`Source exceeds ${max} ${unit}; auto-split into a ${tweets.length}-tweet thread. Review the breaks.`);
    return { format: 'thread', content: { tweets }, units: measure(text, unit), limit: max, unit, fits: true, notes };
  }

  // Everyone else: a single text field, truncated if necessary.
  const units = measure(text, unit);
  if (units <= max) {
    mediaNote();
    return { format: 'single', content: { [field]: text }, units, limit: max, unit, fits: true, notes };
  }

  const truncated = sliceUnits(text, Math.max(0, max - 1), unit).replace(/\s+\S*$/, '').trimEnd() + '…';
  notes.push(`Source is ${units}/${max} ${unit}; truncated to fit. Consider rewriting tighter rather than cutting.`);
  mediaNote();
  return {
    format: 'single',
    content: { [field]: truncated },
    units: measure(truncated, unit),
    limit: max,
    unit,
    fits: false,
    notes,
  };
}

export function adapt(text, platforms, opts = {}) {
  const src = String(text ?? '').trim();
  if (!src) throw new Error('content_adapt requires non-empty text.');

  const targets = (Array.isArray(platforms) && platforms.length)
    ? platforms
    : Object.keys(PLATFORM_SPECS);

  const variants = {};
  for (const p of targets) {
    const spec = PLATFORM_SPECS[p];
    if (!spec) { variants[p] = { error: `Unknown platform: ${p}` }; continue; }
    variants[p] = adaptOne(src, p, spec, opts);
  }
  return { source_units: measure(src), variants };
}

// Compact human-readable rendering for the content_adapt tool.
export function formatAdaptation(result) {
  const lines = [`Adapted ${result.source_units}-char source for ${Object.keys(result.variants).length} platform(s):`];
  for (const [platform, v] of Object.entries(result.variants)) {
    if (v.error) { lines.push(`\n■ ${platform}: ${v.error}`); continue; }
    const status = v.fits ? 'fits' : 'TRUNCATED';
    lines.push(`\n■ ${platform} — ${v.format}, ${v.units}/${v.limit} ${v.unit} (${status})`);
    if (v.format === 'thread') {
      v.content.tweets.forEach((t, i) => lines.push(`   ${i + 1}. ${t}`));
    } else {
      const field = Object.keys(v.content)[0];
      lines.push(`   ${field}: ${v.content[field]}`);
    }
    for (const n of v.notes) lines.push(`   • ${n}`);
  }
  return lines.join('\n');
}
