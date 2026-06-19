import test   from 'node:test';
import assert from 'node:assert/strict';
import sharp  from 'sharp';
import { render, getTemplate, listTemplateIds } from '../media/compose.js';

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
