import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateMaskedImagePlacement } from '../src/js/modules/cardCanvasRenderer.js';

test('given a masked image, placement centers the saved mask and scales it to the inscribed circle', () => {
  const placement = calculateMaskedImagePlacement({
    imageWidth: 200,
    imageHeight: 100,
    mask: { centerX: 0.25, centerY: 0.75, radius: 0.25 },
    cellSize: 120
  });

  assert.equal(placement.padding, 9);
  assert.equal(placement.availableRadius, 51);
  assert.ok(Math.abs(placement.scale - 1.02) < 0.0001);
  assert.ok(Math.abs(placement.drawWidth - 204) < 0.0001);
  assert.ok(Math.abs(placement.drawHeight - 102) < 0.0001);
  assert.ok(Math.abs(placement.offsetX + 51) < 0.0001);
  assert.ok(Math.abs(placement.offsetY + 76.5) < 0.0001);
});
