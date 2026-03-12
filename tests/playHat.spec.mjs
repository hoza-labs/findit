import test from 'node:test';
import assert from 'node:assert/strict';

import { createPlayHatState, drawNextHand } from '../src/js/modules/playHat.js';

function createDeterministicRandom() {
  return () => 0;
}

test('given 7 cards and hands of 3, starting hand 7 leaves exactly 3 cards in the hat', () => {
  const random = createDeterministicRandom();
  let result = { state: createPlayHatState(7, random) };

  for (let handNumber = 1; handNumber <= 6; handNumber += 1) {
    result = drawNextHand(result.state, 3, {}, random);
  }

  assert.equal(result.state.hatCardIndices.length, 3);
});

test('given refill limit of one deck, drawNextHand refuses a second refill and returns a partial hand', () => {
  const random = createDeterministicRandom();
  let result = { state: createPlayHatState(7, random) };

  for (let handNumber = 1; handNumber <= 5; handNumber += 1) {
    result = drawNextHand(result.state, 3, { maxRefills: 1 }, random);
  }

  assert.equal(result.refillLimitHit, true);
  assert.equal(result.state.displayedCardIndices.length, 2);
});
