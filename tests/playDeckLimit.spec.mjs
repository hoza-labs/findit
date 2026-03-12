import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCardsToDrawForHand,
  getCurrentDeckNumber,
  getDeckLimitedHandStatus,
  isFinalDeckExhausted
} from '../src/js/modules/playDeckLimit.js';

test('given a hat with one refill, getCurrentDeckNumber returns deck two', () => {
  assert.equal(getCurrentDeckNumber({ refillCount: 1 }), 2);
});

test('given a non-final deck, deck-limited hand status shows hand and deck progress', () => {
  assert.equal(
    getDeckLimitedHandStatus(4, 3, 2, 5),
    'Hand 4. Deck 2 of 3.'
  );
});

test('given the final deck, deck-limited hand status shows remaining cards in the hat', () => {
  assert.equal(
    getDeckLimitedHandStatus(7, 3, 3, 2),
    'Hand 7. 2 cards left.'
  );
});

test('given the final deck, cards to draw never exceeds cards left in the hat', () => {
  const cardsToDraw = getCardsToDrawForHand(
    {
      minCardsToShow: 2,
      maxCardsToShow: 4,
      lengthOfPlay: 3,
      lengthOfPlayUnits: 'decks'
    },
    {
      hatCardIndices: [0],
      refillCount: 2
    },
    () => 4
  );

  assert.equal(cardsToDraw, 1);
});

test('given a non-final deck, cards to draw still uses the requested random size', () => {
  const cardsToDraw = getCardsToDrawForHand(
    {
      minCardsToShow: 2,
      maxCardsToShow: 4,
      lengthOfPlay: 3,
      lengthOfPlayUnits: 'decks'
    },
    {
      hatCardIndices: [0],
      refillCount: 1
    },
    () => 4
  );

  assert.equal(cardsToDraw, 4);
});

test('given the final deck with no cards left, isFinalDeckExhausted returns true', () => {
  assert.equal(
    isFinalDeckExhausted(
      {
        lengthOfPlay: 3,
        lengthOfPlayUnits: 'decks'
      },
      {
        hatCardIndices: [],
        refillCount: 2
      }
    ),
    true
  );
});

test('given cards left in the final deck, isFinalDeckExhausted returns false', () => {
  assert.equal(
    isFinalDeckExhausted(
      {
        lengthOfPlay: 3,
        lengthOfPlayUnits: 'decks'
      },
      {
        hatCardIndices: [0],
        refillCount: 2
      }
    ),
    false
  );
});
