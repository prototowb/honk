import sharp                        from 'sharp';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname }            from 'path';
import { fileURLToPath }            from 'url';
import { upload }                   from './upload.js';

const TEMPLATES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'templates');

// ─── Template resolution ──────────────────────────────────────────────────

export function getTemplate(id) {
  const dir      = join(TEMPLATES_DIR, id);
  const metaPath = join(dir, 'template.json');
  const svgPath  = join(dir, 'template.svg');
  if (!existsSync(metaPath)) throw new Error(`Template not found: "${id}". Available: ${listTemplateIds().join(', ')}`);
  return {
    meta: JSON.parse(readFileSync(metaPath, 'utf8')),
    svg:  readFileSync(svgPath, 'utf8'),
  };
}

export function listTemplateIds() {
  return readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);
}

// ─── Text word-wrap ───────────────────────────────────────────────────────

// Greedy word-wrap into lines no wider than maxLen characters. A single word
// longer than maxLen is left on its own line (no hard split — body copy).
// Char-count based, so it is font-width-blind — a known ceiling. The per-template
// `wrap` widths are tuned conservatively and `maxLines` ellipsizes any overflow,
// so a long string degrades gracefully rather than spilling off the canvas.
function wrapLines(text, maxLen) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLen && current) { lines.push(current); current = word; }
    else current = candidate;
  }
  if (current) lines.push(current);
  return lines;
}

// Word-wrap + clamp to `maxLines`, ellipsizing the last line so an over-long
// headline/body never overflows the layout. Returns the (clamped) array of lines.
function clampLines(text, wrap, maxLines) {
  let lines = wrapLines(text, wrap);
  if (maxLines && lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[lines.length - 1] = lines[lines.length - 1].replace(/[\s.,;:!?]+\S*$/, '').trimEnd() + '…';
  }
  return lines;
}

// Render pre-wrapped lines as a stack of <tspan>s for an SVG <text> block. Each
// line resets x (SVG tspans otherwise continue horizontally) and steps down by
// `lineHeight`. Text content is XML-escaped; the tspan markup is not.
function buildTspans(lines, { x, lineHeight }) {
  return lines
    .map((ln, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(ln)}</tspan>`)
    .join('');
}

// Relative luminance (0 = black … 1 = white) of a #rgb / #rrggbb color. Unknown
// inputs are treated as dark so text defaults to light — the safe failure.
export function luminance(hex) {
  const h = String(hex || '').trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (full.length !== 6 || Number.isNaN(n)) return 0;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// Derive a legible headline / body / muted color for a given background so text
// has real contrast whatever bg_color the brand picks — this replaces the old
// hardcoded blue headline that ignored the brand entirely. The brand accent is
// kept for structural chrome (rules, kicker, marks), never for body copy.
export function readableColors(bg) {
  return luminance(bg) < 0.5
    ? { text: '#ffffff', body: '#cdd8ec', muted: '#8b98b4' }  // dark bg → light text
    : { text: '#0b1020', body: '#36425c', muted: '#5d6a86' }; // light bg → dark text
}

// Resolve a template's final text colors. Precedence per color: an explicit value
// (call arg or brand kit) wins; otherwise the template's own palette default is
// used — EXCEPT when the background is genuinely custom (differs from the
// template's default bg), in which case a legible color is derived from that
// background so any brand background stays readable. The subtlety this guards:
// a brand kit that merely restates the default bg must NOT trigger derivation and
// throw away the on-brand default heading/body. Pure + exported for test.
export function resolvePalette(variables, meta) {
  const defOf = (id) => (meta.variables.find(v => v.id === id) || {}).default ?? '';
  const has   = (k)  => variables[k] != null && variables[k] !== '';
  const bg       = has('bg_color') ? variables.bg_color : defOf('bg_color');
  const bgCustom = has('bg_color') && variables.bg_color !== defOf('bg_color');
  const derived  = readableColors(bg);
  const text = (k, dk) => has(k) ? variables[k] : (bgCustom ? derived[dk] : (defOf(k) || derived[dk]));
  return {
    heading_color: text('heading_color', 'text'),
    body_color:    text('body_color', 'body'),
    muted_color:   derived.muted,
  };
}

// Merge explicit media_compose args over a brand kit's visual block —
// arg ▸ kit.visual ▸ '' (the template default is then applied in render). This is
// the individualization seam: identity (colors, logo, icon, handle, default
// template) is set once in the kit instead of on every call. Pure; returns the
// variables object compose()/render() consume, the resolved template id, and
// which fields actually came from the kit (for the agent-facing note).
export function resolveVisualVars(args = {}, visual = {}) {
  const pick = (k) => (args[k] != null ? args[k] : (visual[k] || ''));
  const IDENTITY = ['handle', 'bg_color', 'surface', 'accent', 'heading_color', 'body_color', 'icon_url', 'logo_url'];
  const template = args.template || visual.default_template || '';
  const variables = {
    headline:     args.headline,
    subtext:      args.subtext ?? '',
    kicker:       args.kicker ?? '',
    bg_image_url: args.bg_image_url ?? '',
  };
  for (const k of IDENTITY) variables[k] = pick(k);
  const appliedFromKit = IDENTITY.filter(k => visual[k] && args[k] == null);
  if (!args.template && visual.default_template) appliedFromKit.push('default_template');
  return { template, variables, appliedFromKit };
}

// ─── SVG rendering ───────────────────────────────────────────────────────

function escapeXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderSvg(template, vars) {
  let out = template;
  for (const [k, v] of Object.entries(vars))
    out = out.replaceAll(`{{${k}}}`, escapeXml(v));
  return out.replace(/\{\{[^}]+\}\}/g, ''); // clear unreplaced placeholders
}

// ─── Compose ─────────────────────────────────────────────────────────────

// Render the composed PNG to a buffer (no upload). Split out from compose() so
// the render path is testable offline — only bg_image_url / icon_url / logo_url
// need the network, and those are optional.
export async function render(templateId, variables = {}) {
  const { meta, svg } = getTemplate(templateId);
  const { width, height } = meta.dimensions;

  // Merge variable defaults from template.json. An omitted OR empty-string
  // value falls back to the template default — callers commonly pass '' for
  // optional fields (e.g. accent/bg_color), which must not blank out a styled
  // default and render text/shapes in SVG's default black.
  const resolved = {};
  for (const v of meta.variables) {
    const passed = variables[v.id];
    resolved[v.id] = (passed === undefined || passed === null || passed === '')
      ? (v.default ?? '')
      : passed;
  }

  // Color resolution (pure, shared with the unit tests). Templates default to the
  // full brand palette (heading_color / body_color / surface); the accent is
  // reserved for chrome, never large fills — per the brand design guide. A custom
  // background derives legible text; a default background keeps the on-brand
  // palette defaults. See resolvePalette.
  const palette = resolvePalette(variables, meta);
  resolved.heading_color = palette.heading_color;
  resolved.body_color    = palette.body_color;
  resolved.muted_color   = palette.muted_color;

  // Layout-system templates (meta.layout present) get word-wrapped, overflow-safe
  // headline + body tspan stacks driven by per-template metrics. The SVG owns the
  // visual chrome; the layout owns the type metrics — one rendering engine, all
  // templates consistent. The body's y is computed from the headline's actual
  // line count so it flows directly beneath the headline (no fixed gap that goes
  // slack on a short headline).
  const L = meta.layout || {};
  const headLines = L.headline ? clampLines(resolved.headline, L.headline.wrap, L.headline.maxLines) : [];
  const bodyLines = L.body     ? clampLines(resolved.subtext,  L.body.wrap,     L.body.maxLines)     : [];
  resolved.headline_tspans = L.headline ? buildTspans(headLines, L.headline) : '';
  resolved.body_tspans     = L.body     ? buildTspans(bodyLines, L.body)     : '';
  if (L.headline) resolved.headline_y = L.headline.y ?? 0;
  if (L.body) {
    resolved.body_y = (L.headline?.y ?? 0)
      + headLines.length * (L.headline?.lineHeight ?? 0)
      + (L.body.gap ?? 0);
  }

  let iconImage = '';
  if (resolved.icon_url) {
    try {
      const iconRes = await fetch(resolved.icon_url);
      if (iconRes.ok) {
        const iconPng = await sharp(Buffer.from(await iconRes.arrayBuffer()))
          .resize(72, 72, { fit: 'cover', position: 'centre' })
          .png()
          .toBuffer();
        iconImage = `<image href="data:image/png;base64,${iconPng.toString('base64')}" x="80" y="975" width="72" height="72" clip-path="url(#iconClip)" preserveAspectRatio="xMidYMid slice" />`;
      }
    } catch { /* footer icon is decorative — skip on fetch/decode failure */ }
  }

  const svgStr = svg
    .replaceAll('{{headline_tspans}}', resolved.headline_tspans)
    .replaceAll('{{body_tspans}}', resolved.body_tspans)
    .replaceAll('{{icon_image}}', iconImage);

  const svgBuf = Buffer.from(renderSvg(svgStr, resolved));

  // Composite layers: the SVG, then an optional corner-logo stamp. logo_url is a
  // cross-template option (not a per-template variable) — stamped bottom-right
  // with padding, scaled to ~12% of canvas width. Decorative: skip on failure.
  const layers = [{ input: svgBuf, top: 0, left: 0 }];
  if (variables.logo_url) {
    try {
      const logoRes = await fetch(variables.logo_url);
      if (logoRes.ok) {
        const { data, info } = await sharp(Buffer.from(await logoRes.arrayBuffer()))
          .resize({ width: Math.round(width * 0.12), withoutEnlargement: true })
          .png()
          .toBuffer({ resolveWithObject: true });
        const pad = Math.round(width * 0.04);
        layers.push({ input: data, top: height - info.height - pad, left: width - info.width - pad });
      }
    } catch { /* corner logo is decorative — skip on fetch/decode failure */ }
  }

  let image;
  if (resolved.bg_image_url) {
    const imgRes = await fetch(resolved.bg_image_url);
    if (!imgRes.ok) throw new Error(`Backdrop fetch failed: ${imgRes.status}`);
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    image = sharp(imgBuf)
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .composite(layers);
  } else {
    image = sharp({ create: { width, height, channels: 4, background: resolved.bg_color || '#05091e' } })
      .composite(layers);
  }

  const pngBuf = await image.png({ compressionLevel: 8 }).toBuffer();
  return { pngBuf, width, height, template: templateId };
}

export async function compose(templateId, variables = {}, uploadOpts = {}) {
  const { pngBuf, width, height } = await render(templateId, variables);
  const filename = `${templateId}-${Date.now()}.png`;
  const result   = await upload(null, uploadOpts.provider ?? null, uploadOpts.account ?? '', pngBuf, filename);
  return { ...result, template: templateId, dimensions: { width, height } };
}
