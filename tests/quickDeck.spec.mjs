import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_QUICK_DECK_SYMBOLS_PER_CARD,
  createQuickDeckLabel,
  createQuickDeckTempDeck,
  getQuickDeckImageCount,
  getQuickDeckOptions,
  getQuickDeckSymbolsPerCard,
  normalizeQuickDeckSymbolsPerCard,
  rememberQuickDeckSymbolsPerCard
} from '../src/js/modules/quickDeck.js';

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, value);
    }
  };
}

test('given no stored quick deck size, getQuickDeckSymbolsPerCard falls back to the default', () => {
  assert.equal(getQuickDeckSymbolsPerCard(createMemoryStorage()), DEFAULT_QUICK_DECK_SYMBOLS_PER_CARD);
});

test('given an invalid quick deck size, normalizeQuickDeckSymbolsPerCard falls back to the default', () => {
  assert.equal(normalizeQuickDeckSymbolsPerCard('5'), DEFAULT_QUICK_DECK_SYMBOLS_PER_CARD);
});

test('given a remembered quick deck size, getQuickDeckSymbolsPerCard returns it', () => {
  const storage = createMemoryStorage();

  const remembered = rememberQuickDeckSymbolsPerCard(storage, 8);

  assert.equal(remembered, 8);
  assert.equal(getQuickDeckSymbolsPerCard(storage), 8);
});

test('given allowed quick deck sizes, getQuickDeckOptions returns matching labels', () => {
  assert.deepEqual(getQuickDeckOptions([3, 4]), [
    { symbolsPerCard: 3, label: 'Quick 3-image deck...' },
    { symbolsPerCard: 4, label: 'Quick 4-image deck...' }
  ]);
  assert.equal(createQuickDeckLabel(12), 'Quick 12-image deck...');
});

test('given a quick deck size, getQuickDeckImageCount returns the required image count', () => {
  assert.equal(getQuickDeckImageCount(6), 31);
});

test('given enough standard image ids, createQuickDeckTempDeck creates a deck with unique standard refs', () => {
  const standardImageIds = Array.from({ length: 40 }, (_, index) => `image-${index + 1}.png`);
  const deck = createQuickDeckTempDeck({
    symbolsPerCard: 6,
    standardImageIds,
    random: () => 0.25
  });

  assert.equal(deck.symbolsPerCard, 6);
  assert.equal(deck.selectedImageRefs.length, 31);
  assert.equal(deck.dirty, false);
  assert.equal(deck.deckName, '');
  assert.ok(deck.selectedImageRefs.every((ref) => ref.source === 'standard'));
  assert.equal(new Set(deck.selectedImageRefs.map((ref) => ref.id)).size, 31);
});

test('given too few standard image ids, createQuickDeckTempDeck throws', () => {
  assert.throws(
    () => createQuickDeckTempDeck({ symbolsPerCard: 8, standardImageIds: ['a.png', 'b.png'] }),
    /Not enough standard images/
  );
});
