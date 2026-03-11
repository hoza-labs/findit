import test from 'node:test';
import assert from 'node:assert/strict';

import { createEmptyTempDeck, createTempDeckFromSavedDeck, normalizeTempDeck } from '../src/js/modules/deckSession.js';

test('given empty temp deck, play options are initialized with blank values', () => {
  const deck = createEmptyTempDeck();

  assert.deepEqual(deck.playOptions, {
    cardsToShowMin: '',
    cardsToShowMax: '',
    countdownSeconds: '',
    handsToPlay: '',
    playerNames: ''
  });
});

test('given saved deck with play options, temp deck preserves normalized play options', () => {
  const tempDeck = createTempDeckFromSavedDeck({
    name: 'Demo',
    symbolsPerCard: 4,
    imageRefs: [{ source: 'standard', id: '1.png' }],
    playOptions: {
      cardsToShowMin: ' 2 ',
      cardsToShowMax: 4,
      countdownSeconds: '05',
      handsToPlay: '',
      playerNames: ' Alice, Bob , , Carol '
    }
  });

  assert.deepEqual(tempDeck.playOptions, {
    cardsToShowMin: '2',
    cardsToShowMax: '4',
    countdownSeconds: '5',
    handsToPlay: '',
    playerNames: 'Alice, Bob, Carol'
  });
});

test('given legacy temp deck without play options, normalizeTempDeck adds defaults', () => {
  const normalized = normalizeTempDeck({
    deckName: 'Legacy',
    symbolsPerCard: 4,
    selectedImageRefs: [],
    dirty: true
  });

  assert.deepEqual(normalized.playOptions, {
    cardsToShowMin: '',
    cardsToShowMax: '',
    countdownSeconds: '',
    handsToPlay: '',
    playerNames: ''
  });
});
