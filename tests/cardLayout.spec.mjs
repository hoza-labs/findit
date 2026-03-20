import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

import { createCardLayout, getImageSizeFactors } from '../src/js/modules/cardLayout.js';

test('given a round card layout, all images fit within the circular card without overlapping', () => {
  const layout = createCardLayout(12, {
    cardShape: 'round',
    imageRotation: 'random',
    imageSize: 'uniform'
  });

  assertLayoutFits(layout, 'round');
  assertNoOverlap(layout);
});

test('given a square card layout, all images fit within the square card without overlapping', () => {
  const layout = createCardLayout(12, {
    cardShape: 'square',
    imageRotation: 'random',
    imageSize: 'uniform'
  });

  assertLayoutFits(layout, 'square');
  assertNoOverlap(layout);
});

test('given various image sizes, radii span 0.5x to 1.5x of the uniform normal size and still fit', () => {
  const uniformLayout = createCardLayout(8, {
    cardShape: 'round',
    imageRotation: 'none',
    imageSize: 'uniform'
  });
  const variousLayout = createCardLayout(8, {
    cardShape: 'round',
    imageRotation: 'none',
    imageSize: 'various'
  });
  const factors = getImageSizeFactors(8, 'various');
  const sortedRadii = variousLayout.items.map((item) => item.radius).sort((left, right) => left - right);

  assert.ok(Math.abs(uniformLayout.normalRadius - uniformLayout.items[0].radius) < 1e-9);
  assert.ok(Math.abs(sortedRadii[0] - (uniformLayout.normalRadius * 0.5)) < 1e-6);
  assert.ok(Math.abs(sortedRadii[sortedRadii.length - 1] - (uniformLayout.normalRadius * 1.5)) < 1e-6);
  assert.equal(Math.min(...factors), 0.5);
  assert.equal(Math.max(...factors), 1.5);
  assertLayoutFits(variousLayout, 'round');
  assertNoOverlap(variousLayout);
});

test('given different rotation options, layout geometry stays the same because rotation is decided at render time', () => {
  const noRotationLayout = createCardLayout(6, {
    cardShape: 'square',
    imageRotation: 'none',
    imageSize: 'uniform'
  });
  const randomRotationLayout = createCardLayout(6, {
    cardShape: 'square',
    imageRotation: 'random',
    imageSize: 'uniform'
  });

  assert.deepEqual(noRotationLayout, randomRotationLayout);
});

test('given repeated layout generation, each card layout is produced well within one second', () => {
  createCardLayout(12, {
    cardShape: 'round',
    imageRotation: 'random',
    imageSize: 'various'
  });

  const startedAt = performance.now();
  for (let index = 0; index < 100; index += 1) {
    const cardShape = index % 2 === 0 ? 'round' : 'square';
    const imageSize = index % 3 === 0 ? 'various' : 'uniform';
    const imageRotation = index % 4 === 0 ? 'none' : 'random';
    createCardLayout(12, { cardShape, imageRotation, imageSize });
  }
  const elapsedMs = performance.now() - startedAt;

  assert.ok(elapsedMs < 1000, `expected 100 layouts in under 1000ms, received ${elapsedMs.toFixed(2)}ms`);
});

function assertLayoutFits(layout, cardShape) {
  for (const item of layout.items) {
    assert.ok(item.centerX - item.radius >= -1e-9);
    assert.ok(item.centerX + item.radius <= 1 + 1e-9);
    assert.ok(item.centerY - item.radius >= -1e-9);
    assert.ok(item.centerY + item.radius <= 1 + 1e-9);

    if (cardShape === 'round') {
      const distanceToCenter = Math.hypot(item.centerX - 0.5, item.centerY - 0.5);
      assert.ok(distanceToCenter + item.radius <= 0.5 + 1e-9);
    }
  }
}

function assertNoOverlap(layout) {
  for (let leftIndex = 0; leftIndex < layout.items.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < layout.items.length; rightIndex += 1) {
      const left = layout.items[leftIndex];
      const right = layout.items[rightIndex];
      const distance = Math.hypot(left.centerX - right.centerX, left.centerY - right.centerY);
      assert.ok(
        distance >= left.radius + right.radius,
        `items ${leftIndex} and ${rightIndex} overlap`
      );
    }
  }
}
