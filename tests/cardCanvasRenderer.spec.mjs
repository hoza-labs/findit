import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateMaskedImagePlacement, planCardRenderItems } from '../src/js/modules/cardCanvasRenderer.js';

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

test('given a card render, image placement order is shuffled every time the card is planned', () => {
  const plannedItems = planCardRenderItems(
    ['a.png', 'b.png', 'c.png'],
    { cardShape: 'round', imageRotation: 'none', imageSize: 'uniform' },
    sequenceRandom([0.9, 0.0])
  );

  assert.deepEqual(
    plannedItems.map((item) => item.sourceIndex),
    [1, 0, 2]
  );
  assert.ok(plannedItems.every((item) => item.layoutItem.rotation === 0));
});

test('given random image rotation, each planned image receives a fresh random angle', () => {
  const plannedItems = planCardRenderItems(
    ['a.png', 'b.png', 'c.png'],
    { cardShape: 'square', imageRotation: 'random', imageSize: 'uniform' },
    sequenceRandom([0.6, 0.2, 0.1, 0.4, 0.8])
  );

  assert.deepEqual(
    plannedItems.map((item) => item.sourceIndex),
    [2, 0, 1]
  );
  assert.ok(Math.abs(plannedItems[0].layoutItem.rotation - (0.1 * Math.PI * 2)) < 0.0001);
  assert.ok(Math.abs(plannedItems[1].layoutItem.rotation - (0.4 * Math.PI * 2)) < 0.0001);
  assert.ok(Math.abs(plannedItems[2].layoutItem.rotation - (0.8 * Math.PI * 2)) < 0.0001);
});

function sequenceRandom(values) {
  let index = 0;
  return () => {
    const value = values[index];
    index += 1;
    return value ?? 0;
  };
}
