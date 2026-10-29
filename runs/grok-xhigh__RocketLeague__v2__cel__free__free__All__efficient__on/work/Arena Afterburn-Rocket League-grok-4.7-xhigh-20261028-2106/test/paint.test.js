import assert from 'node:assert/strict';
import test from 'node:test';
import { paintStats } from '../src/render.js';

test('a flat clear buffer is not counted as a painted scene', () => {
  const width = 64;
  const height = 36;
  const pixels = new Uint8Array(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 18;
    pixels[i + 1] = 22;
    pixels[i + 2] = 42;
    pixels[i + 3] = 255;
  }
  const stats = paintStats(pixels, width, height);
  assert.equal(stats.total, width * height);
  assert.equal(stats.painted, 0);
  assert.equal(stats.fraction, 0);
  assert.ok(stats.variance < 1);
});

test('a frame with a bright subject counts as painted', () => {
  const width = 64;
  const height = 36;
  const pixels = new Uint8Array(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 18;
    pixels[i + 1] = 22;
    pixels[i + 2] = 42;
    pixels[i + 3] = 255;
  }
  for (let y = 8; y < 28; y += 1) {
    for (let x = 16; x < 48; x += 1) {
      const i = (y * width + x) * 4;
      pixels[i] = 247;
      pixels[i + 1] = 244;
      pixels[i + 2] = 238;
    }
  }
  const stats = paintStats(pixels, width, height);
  assert.ok(stats.fraction > 0.08, `fraction ${stats.fraction}`);
  assert.ok(stats.variance > 20, `variance ${stats.variance}`);
});
