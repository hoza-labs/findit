import test from 'node:test';
import assert from 'node:assert/strict';

import { createPlayHatState, drawNextHand } from '../src/js/modules/playHat.js';

function createDeterministicRandom() {
  return () => 0;
}

test('given 7 cards and hands of 3, starting hand 7 leaves exactly 3 cards in the hat', () => {
  const random = createDeterministicRandom();
  let state = createPlayHatState(7, random);

  for (let handNumber = 1; handNumber <= 6; handNumber += 1) {
    state = drawNextHand(state, 3, random);
  }

  assert.equal(state.hatCardIndices.length, 3);
});
