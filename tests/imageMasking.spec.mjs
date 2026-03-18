import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clampImageMask,
  getCircularMaskRadius,
  getDefaultImageMask,
  getImageMaskMetrics,
  getMaxOpaquePixelDistance,
  getRequiredTransparentMargin,
  imageMaskToPixels,
  normalizeImageMask
} from '../src/js/modules/imageMasking.js';

test('given rectangular bounds, circular mask radius uses the wider dimension', () => {
  assert.equal(getCircularMaskRadius(200, 120), 100);
  assert.equal(getCircularMaskRadius(120, 200), 100);
});

test('given opaque pixels near the corner, max distance measures from center', () => {
  const data = new Uint8ClampedArray(4 * 4 * 4);
  const alphaIndex = ((0 * 4) + 0) * 4 + 3;
  data[alphaIndex] = 255;

  const distance = getMaxOpaquePixelDistance({ width: 4, height: 4, data });
  assert.equal(distance, Math.hypot(1.5, 1.5));
});

test('given opaque pixels outside the circular mask, transparent margin is rounded up', () => {
  const margin = getRequiredTransparentMargin({
    width: 4,
    height: 4,
    maxOpaqueDistance: Math.hypot(1.5, 1.5)
  });

  assert.equal(margin, 1);
});

test('given invalid stored values, normalizeImageMask falls back to defaults', () => {
  assert.deepEqual(normalizeImageMask({ centerX: 2, centerY: -1, radius: 0 }), {
    centerX: 1,
    centerY: 0,
    radius: 0.5
  });
});

test('given image bounds, default image mask centers the circle with default radius', () => {
  const mask = getDefaultImageMask();
  const pixels = imageMaskToPixels(mask, 200, 100);

  assert.equal(pixels.centerX, 100);
  assert.equal(pixels.centerY, 50);
  assert.equal(pixels.radius, 100);
});

test('given a shifted center beyond the allowed offset, clampImageMask pulls it back', () => {
  const metrics = getImageMaskMetrics(200, 100);
  const mask = clampImageMask({ centerX: 1, centerY: 1, radius: 0.6 }, 200, 100);
  const pixels = imageMaskToPixels(mask, 200, 100);
  const offset = Math.hypot(pixels.centerX - metrics.imageCenterX, pixels.centerY - metrics.imageCenterY);

  assert.ok(offset <= metrics.maxRadius - pixels.radius + 0.0001);
});

test('given a too-small radius, clampImageMask enforces the minimum editor radius', () => {
  const metrics = getImageMaskMetrics(200, 100, { minRadius: 10 });
  const mask = clampImageMask({ centerX: 0.5, centerY: 0.5, radius: 0.001 }, 200, 100, { minRadius: 10 });
  const pixels = imageMaskToPixels(mask, 200, 100);

  assert.equal(pixels.radius, metrics.minRadius);
});
