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

export async function compose(templateId, variables = {}, uploadOpts = {}) {
  const { meta, svg } = getTemplate(templateId);
  const { width, height } = meta.dimensions;

  // Merge variable defaults from template.json
  const resolved = {};
  for (const v of meta.variables)
    resolved[v.id] = variables[v.id] ?? v.default ?? '';

  // Auto-split headline into two lines for the SVG template
  const maxLen = templateId === 'banner-wide' ? 16 : 18;
  [resolved.headline_line1, resolved.headline_line2] = splitHeadline(resolved.headline, maxLen);

  const svgBuf = Buffer.from(renderSvg(svg, resolved));

  let image;
  if (resolved.bg_image_url) {
    const imgRes = await fetch(resolved.bg_image_url);
    if (!imgRes.ok) throw new Error(`Backdrop fetch failed: ${imgRes.status}`);
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    image = sharp(imgBuf)
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .composite([{ input: svgBuf, top: 0, left: 0 }]);
  } else {
    image = sharp({ create: { width, height, channels: 4, background: resolved.bg_color || '#05091e' } })
      .composite([{ input: svgBuf, top: 0, left: 0 }]);
  }

  const pngBuf = await image.png({ compressionLevel: 8 }).toBuffer();

  const filename = `${templateId}-${Date.now()}.png`;
  const result   = await upload(null, uploadOpts.provider ?? null, uploadOpts.account ?? '', pngBuf, filename);

  return { ...result, template: templateId, dimensions: { width, height } };
}
