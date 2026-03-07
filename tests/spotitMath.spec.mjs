import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateDeckSize,
  countSharedSymbols,
  generateDeck,
  validateSymbolsPerCard
} from '../src/js/modules/spotitMath.js';

test('given valid symbols per card, calculateDeckSize returns n^2 - n + 1', () => {
  assert.equal(calculateDeckSize(4), 13);
});

test('given invalid symbols per card, validateSymbolsPerCard throws', () => {
  assert.throws(() => validateSymbolsPerCard(2), /greater than or equal to 3/);
});

test('given n=4, generateDeck returns expected card and symbol counts', () => {
  const deck = generateDeck(4);
  assert.equal(deck.length, 13);
  assert.ok(deck.every((card) => card.length === 4));
});

test('given generated deck, any two cards share exactly one symbol', () => {
  const deck = generateDeck(4);

  for (let i = 0; i < deck.length; i += 1) {
    for (let j = i + 1; j < deck.length; j += 1) {
      assert.equal(countSharedSymbols(deck[i], deck[j]), 1);
    }
  }
});
