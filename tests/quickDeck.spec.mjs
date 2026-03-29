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

test('given enough images across sources, createQuickDeckTempDeck fills from user then web then standard and creates a pattern', () => {
  const result = createQuickDeckTempDeck({
    symbolsPerCard: 6,
    userImageIds: ['u1', 'u2'],
    webImageIds: ['w1', 'w2', 'w3'],
    standardImageIds: Array.from({ length: 40 }, (_, index) => `image-${index + 1}.png`),
    random: () => 0.25,
    patternRandom: () => 0.5
  });

  assert.equal(result.requiredImageCount, 31);
  assert.equal(result.selectedImageCount, 31);
  assert.equal(result.isComplete, true);
  assert.equal(result.tempDeck.symbolsPerCard, 6);
  assert.equal(result.tempDeck.pattern, 2147483648);
  assert.equal(result.tempDeck.selectedImageRefs.length, 31);
  assert.deepEqual(result.tempDeck.selectedImageRefs.slice(0, 2).map((ref) => ref.source), ['user', 'user']);
  assert.deepEqual(result.tempDeck.selectedImageRefs.slice(2, 5).map((ref) => ref.source), ['web', 'web', 'web']);
  assert.ok(result.tempDeck.selectedImageRefs.slice(5).every((ref) => ref.source === 'standard'));
});

test('given too few images overall, createQuickDeckTempDeck returns an incomplete deck instead of throwing', () => {
  const result = createQuickDeckTempDeck({
    symbolsPerCard: 8,
    userImageIds: ['u1'],
    webImageIds: ['w1', 'w2'],
    standardImageIds: ['s1', 's2']
  });

  assert.equal(result.requiredImageCount, 57);
  assert.equal(result.selectedImageCount, 5);
  assert.equal(result.isComplete, false);
  assert.equal(Number.isInteger(result.tempDeck.pattern), true);
  assert.deepEqual(result.tempDeck.selectedImageRefs.map((ref) => ref.source), ['user', 'web', 'web', 'standard', 'standard']);
});
