import { PLATFORM_SPECS, measure } from './specs.js';

// Checks a content payload against a platform's rules without sending anything.
// Returns { ok, errors[], warnings[] }. errors block publishing; warnings don't.
// This is the verifiable substitute for live testing — it exercises the same
// content shape the adapters consume.
export function validate(platform, content) {
  const spec = PLATFORM_SPECS[platform];
  if (!spec) {
    return { ok: false, platform, errors: [`Unknown platform: ${platform}`], warnings: [] };
  }

  const errors = [];
  const warnings = [];
  const c = content || {};
  const { field, max, unit, required } = spec.text;

  // A thread (X tweets[]) is validated per item; otherwise the single text field.
  if (spec.thread && Array.isArray(c[spec.thread.field])) {
    const tweets = c[spec.thread.field];
    if (tweets.length === 0) {
      errors.push('Thread has no tweets.');
    }
    tweets.forEach((t, i) => {
      if (typeof t !== 'string' || t.trim() === '') {
        errors.push(`Tweet ${i + 1} is empty.`);
        return;
      }
      const n = measure(t, unit);
      if (n > spec.thread.perItemMax) {
        errors.push(`Tweet ${i + 1} is ${n}/${spec.thread.perItemMax} ${unit} (over by ${n - spec.thread.perItemMax}).`);
      }
    });
  } else {
    const value = c[field];
    const empty = value === undefined || value === null || String(value).trim() === '';
    if (required && empty) {
      errors.push(`Missing required field "${field}".`);
    } else if (!empty) {
      const n = measure(String(value), unit);
      if (n > max) {
        errors.push(`"${field}" is ${n}/${max} ${unit} (over by ${n - max}).`);
      } else if (n > Math.floor(max * 0.95)) {
        warnings.push(`"${field}" is ${n}/${max} ${unit} — close to the limit.`);
      }
    }
  }

  // Media: required for some platforms, must be a public URL when present.
  if (spec.media) {
    const m = c[spec.media.field];
    const present = typeof m === 'string' && m.trim() !== '';
    if (spec.media.required && !present) {
      errors.push(`${spec.label} requires "${spec.media.field}" — a public ${spec.media.kind} URL.`);
    } else if (present && !/^https?:\/\//i.test(m.trim())) {
      errors.push(`"${spec.media.field}" must be a public http(s) URL.`);
    }
  }

  return { ok: errors.length === 0, platform, label: spec.label, errors, warnings };
}

// Human-readable one-tool summary.
export function formatValidation(v) {
  const head = v.ok
    ? `✓ Valid for ${v.label || v.platform}.`
    : `✗ Invalid for ${v.label || v.platform}.`;
  const parts = [head];
  if (v.errors.length)   parts.push('Errors:\n' + v.errors.map(e => `  - ${e}`).join('\n'));
  if (v.warnings.length) parts.push('Warnings:\n' + v.warnings.map(w => `  - ${w}`).join('\n'));
  return parts.join('\n');
}
