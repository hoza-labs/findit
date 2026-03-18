import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCircularMaskRadius,
  getMaxOpaquePixelDistance,
  getRequiredTransparentMargin
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
