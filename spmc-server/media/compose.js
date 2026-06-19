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

// ─── Headline word-wrap ───────────────────────────────────────────────────

function splitHeadline(text, maxLen = 18) {
  if (!text || text.length <= maxLen) return [text ?? '', ''];
  const words = text.split(' ');
  let line1   = '';
  for (const word of words) {
    if ((line1 + ' ' + word).trim().length > maxLen) break;
    line1 = (line1 + ' ' + word).trim();
  }
  return [line1, text.slice(line1.length).trim()];
}

// Greedy word-wrap into lines no wider than maxLen characters. A single word
// longer than maxLen is left on its own line (no hard split — body copy).
function wrapBody(text, maxLen) {
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

  // Auto-split headline into two lines for the SVG template
  const maxLen = templateId === 'banner-wide' ? 16 : 18;
  [resolved.headline_line1, resolved.headline_line2] = splitHeadline(resolved.headline, maxLen);

  // Raw (unescaped) SVG fragments for templates that use them. Built here and
  // injected before renderSvg so their markup is not XML-escaped; the text
  // content inside is escaped individually.
  const bodyLines = wrapBody(resolved.subtext, 34);
  const subtextTspans = bodyLines
    .map((ln, i) => `<tspan x="110" dy="${i === 0 ? 0 : 58}">${escapeXml(ln)}</tspan>`)
    .join('');

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
    .replaceAll('{{subtext_tspans}}', subtextTspans)
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
