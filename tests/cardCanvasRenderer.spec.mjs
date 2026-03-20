import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateMaskedImagePlacement, planCardRender, planCardRenderItems } from '../src/js/modules/cardCanvasRenderer.js';

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
  const planned = planCardRender(
    ['a.png', 'b.png', 'c.png'],
    { cardShape: 'square', imageRotation: 'random', imageSize: 'uniform' },
    sequenceRandom([0.6, 0.2, 0.1, 0.4, 0.8, 0.3])
  );

  assert.deepEqual(
    planned.items.map((item) => item.sourceIndex),
    [2, 0, 1]
  );
  assert.equal(planned.cardRotation, 0);
  assert.ok(Math.abs(planned.items[0].layoutItem.rotation - (0.4 * Math.PI * 2)) < 0.0001);
  assert.ok(Math.abs(planned.items[1].layoutItem.rotation - (0.8 * Math.PI * 2)) < 0.0001);
  assert.ok(Math.abs(planned.items[2].layoutItem.rotation - (0.3 * Math.PI * 2)) < 0.0001);
});

test('given round cards with random rotation, the whole card gets an arbitrary angle', () => {
  const planned = planCardRender(
    ['a.png', 'b.png'],
    { cardShape: 'round', imageRotation: 'random', imageSize: 'uniform' },
    sequenceRandom([0.75, 0.25, 0.5, 0.125])
  );

  assert.ok(Math.abs(planned.cardRotation - (0.25 * Math.PI * 2)) < 0.0001);
});

test('given non-random rotation, the whole card is not rotated', () => {
  const planned = planCardRender(
    ['a.png', 'b.png'],
    { cardShape: 'square', imageRotation: 'none', imageSize: 'uniform' },
    sequenceRandom([0.75])
  );

  assert.equal(planned.cardRotation, 0);
});

function sequenceRandom(values) {
  let index = 0;
  return () => {
    const value = values[index];
    index += 1;
    return value ?? 0;
  };
}
