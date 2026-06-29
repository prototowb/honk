import test   from 'node:test';
import assert from 'node:assert/strict';
import sharp  from 'sharp';
import { render, getTemplate, listTemplateIds, luminance, readableColors,
         resolvePalette, resolveVisualVars } from '../media/compose.js';

// 1×1 transparent PNG — exercises the logo composite path without the network.
const PNG_1x1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test('square-tall (4:5) template is registered at 1080×1350', () => {
  assert.ok(listTemplateIds().includes('square-tall'));
  assert.deepEqual(getTemplate('square-tall').meta.dimensions, { width: 1080, height: 1350 });
});

test('render produces a PNG at the template dimensions', async () => {
  const { pngBuf, width, height } = await render('square-tall', { headline: 'Ship faster' });
  assert.equal(width, 1080);
  assert.equal(height, 1350);
  const meta = await sharp(pngBuf).metadata();
  assert.equal(meta.format, 'png');
  assert.equal(meta.width, 1080);
  assert.equal(meta.height, 1350);
});

test('logo_url is composited without changing output dimensions', async () => {
  const { pngBuf } = await render('square-dark', { headline: 'Hi', logo_url: PNG_1x1 });
  const meta = await sharp(pngBuf).metadata();
  assert.equal(meta.width, 1080);
  assert.equal(meta.height, 1080);
});

test('luminance orders dark < light and tolerates bad input', () => {
  assert.ok(luminance('#000000') < luminance('#777777'));
  assert.ok(luminance('#777777') < luminance('#ffffff'));
  assert.equal(luminance('not-a-color'), 0); // unknown → dark (text defaults light)
  assert.ok(Math.abs(luminance('#fff') - luminance('#ffffff')) < 1e-9); // 3-digit hex
});

test('readableColors gives light text on dark bg and dark text on light bg', () => {
  assert.ok(luminance(readableColors('#05091e').text) > 0.5, 'dark bg → light heading');
  assert.ok(luminance(readableColors('#f3f0ea').text) < 0.5, 'light bg → dark heading');
});

test('all five templates expose the shared layout + palette system', () => {
  for (const id of ['square-dark', 'square-tall', 'story-dark', 'banner-wide', 'square-news']) {
    const meta = getTemplate(id).meta;
    assert.ok(meta.layout?.headline, `${id} declares a headline layout`);
    const ids = meta.variables.map(v => v.id);
    for (const k of ['surface', 'heading_color', 'body_color', 'accent', 'bg_color']) {
      assert.ok(ids.includes(k), `${id} declares the ${k} variable`);
    }
  }
});

test('a custom background derives legible heading without an explicit color', async () => {
  // Renders cleanly (the derivation path) at the right size on a light bg.
  const { width, height } = await render('square-tall', { headline: 'Hi', bg_color: '#ffffff' });
  assert.equal(width, 1080);
  assert.equal(height, 1350);
});

// ── resolvePalette: the color-precedence rules (the headline-feature core) ──
const tallMeta = getTemplate('square-tall').meta; // defaults: bg #05091e, heading #f4f8ff, body #8ac0dd

test('palette: no colors → the on-brand template defaults (no derivation)', () => {
  const p = resolvePalette({}, tallMeta);
  assert.equal(p.heading_color, '#f4f8ff');
  assert.equal(p.body_color, '#8ac0dd');
});

test('palette: a kit that restates the DEFAULT bg keeps the brand palette (the regression the advisor caught)', () => {
  const p = resolvePalette({ bg_color: '#05091e' }, tallMeta);
  assert.equal(p.heading_color, '#f4f8ff', 'default bg must not trigger derivation');
  assert.equal(p.body_color, '#8ac0dd', 'brand body #8ac0dd must survive');
});

test('palette: a genuinely custom bg derives legible text when colors are unset', () => {
  const p = resolvePalette({ bg_color: '#ffffff' }, tallMeta);
  assert.ok(luminance(p.heading_color) < 0.5, 'light bg → dark heading');
  assert.ok(luminance(p.body_color) < 0.5, 'light bg → dark body');
});

test('palette: an explicit text color always wins, custom bg or not', () => {
  const p = resolvePalette({ bg_color: '#ffffff', heading_color: '#123456' }, tallMeta);
  assert.equal(p.heading_color, '#123456');
  assert.ok(luminance(p.body_color) < 0.5); // body still derived for the light bg
});

// ── resolveVisualVars: arg ▸ kit.visual ▸ default merge (the kit→compose path) ──
test('visual vars: a brand kit supplies identity so the caller passes none', () => {
  const visual = { bg_color: '#05091e', accent: '#1df7ed', handle: '@brand', default_template: 'square-tall' };
  const { template, variables, appliedFromKit } = resolveVisualVars({ headline: 'Hi' }, visual);
  assert.equal(template, 'square-tall');           // from kit default_template
  assert.equal(variables.bg_color, '#05091e');     // from kit
  assert.equal(variables.handle, '@brand');        // from kit
  assert.equal(variables.accent, '#1df7ed');       // from kit
  assert.ok(appliedFromKit.includes('handle') && appliedFromKit.includes('default_template'));
  // end-to-end: those kit colors survive into the resolved palette (default bg)
  assert.equal(resolvePalette(variables, tallMeta).body_color, '#8ac0dd');
});

test('visual vars: explicit args override the kit', () => {
  const visual = { accent: '#1df7ed', handle: '@brand' };
  const { variables, appliedFromKit } = resolveVisualVars({ headline: 'Hi', accent: '#ff0000' }, visual);
  assert.equal(variables.accent, '#ff0000');       // arg wins
  assert.ok(!appliedFromKit.includes('accent'));   // not counted as kit-applied
  assert.ok(appliedFromKit.includes('handle'));    // handle still from kit
});
