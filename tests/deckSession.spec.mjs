import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createEmptyTempDeck,
  createSavedDeckRecord,
  createTempDeckFromSavedDeck,
  normalizeTempDeck
} from '../src/js/modules/deckSession.js';

test('given empty temp deck, play and print options are initialized with defaults', () => {
  const deck = createEmptyTempDeck();

  assert.deepEqual(deck.generationOptions, {
    cardShape: 'round',
    imageRotation: 'random',
    imageSize: 'various',
    sourceSamplingBias: 'balanced'
  });
  assert.deepEqual(deck.playOptions, {
    cardsToShowCounts: '2',
    countdownSeconds: '',
    lengthOfPlay: '',
    lengthOfPlayUnits: 'hands',
    playerNames: 'one, two'
  });
  assert.deepEqual(deck.printOptions, {
    pageSizeId: 'letter',
    orientation: 'portrait',
    units: 'in',
    customPageWidth: '',
    customPageHeight: '',
    marginTop: '0.25',
    marginRight: '0.25',
    marginBottom: '0.25',
    marginLeft: '0.25',
    layoutId: '4-up',
    qualityPreset: 'inkjet',
    customDpi: '',
    showCardNumber: false,
    cardNumberPosition: 'bottom-right',
    showCardOutline: false,
    markupColor: '#000000',
    cardOutlineDashStyle: 'solid'
  });
});

test('given saved deck with play and print options, temp deck preserves normalized options', () => {
  const tempDeck = createTempDeckFromSavedDeck({
    name: 'Demo',
    symbolsPerCard: 4,
    imageRefs: [{ source: 'standard', id: '1.png' }],
    generationOptions: {
      cardShape: 'square',
      imageRotation: 'none',
      imageSize: 'uniform',
      sourceSamplingBias: 'prefer-larger-source-sampling'
    },
    playOptions: {
      cardsToShowCounts: ' 2, 4, 3 ',
      countdownSeconds: '05',
      lengthOfPlay: '1.5',
      lengthOfPlayUnits: 'minutes',
      playerNames: ' Alice, Bob , , Carol '
    },
    printOptions: {
      pageSizeId: 'custom',
      orientation: 'landscape',
      units: 'mm',
      customPageWidth: ' 210 ',
      customPageHeight: '297.0',
      marginTop: ' 6.5 ',
      marginRight: '7',
      marginBottom: '8.0',
      marginLeft: ' 9 ',
      layoutId: '6-up',
      qualityPreset: 'custom',
      customDpi: '0600',
      showCardNumber: true,
      cardNumberPosition: 'top-left',
      showCardOutline: true,
      markupColor: '#FF00AA',
      cardOutlineDashStyle: 'dashed'
    }
  });

  assert.deepEqual(tempDeck.generationOptions, {
    cardShape: 'square',
    imageRotation: 'none',
    imageSize: 'uniform',
    sourceSamplingBias: 'prefer-larger-source-sampling'
  });
  assert.deepEqual(tempDeck.playOptions, {
    cardsToShowCounts: '2, 4, 3',
    countdownSeconds: '5',
    lengthOfPlay: '1.5',
    lengthOfPlayUnits: 'minutes',
    playerNames: 'Alice, Bob, Carol'
  });
  assert.deepEqual(tempDeck.printOptions, {
    pageSizeId: 'custom',
    orientation: 'landscape',
    units: 'mm',
    customPageWidth: '210',
    customPageHeight: '297',
    marginTop: '6.5',
    marginRight: '7',
    marginBottom: '8',
    marginLeft: '9',
    layoutId: '6-up',
    qualityPreset: 'custom',
    customDpi: '600',
    showCardNumber: true,
    cardNumberPosition: 'top-left',
    showCardOutline: true,
    markupColor: '#ff00aa',
    cardOutlineDashStyle: 'dashed'
  });
});

test('given legacy handsToPlay option, normalize maps it to lengthOfPlay in hands and adds default print options', () => {
  const normalized = normalizeTempDeck({
    symbolsPerCard: 4,
    selectedImageRefs: [],
    generationOptions: {
      cardShape: 'triangle',
      imageRotation: 'sometimes',
      imageSize: 'mixed',
      sourceSamplingBias: 'extra'
    },
    playOptions: {
      cardsToShowMin: '',
      cardsToShowMax: '',
      countdownSeconds: '',
      handsToPlay: '3',
      playerNames: ''
    }
  });

  assert.deepEqual(normalized.generationOptions, {
    cardShape: 'round',
    imageRotation: 'random',
    imageSize: 'various',
    sourceSamplingBias: 'balanced'
  });
  assert.deepEqual(normalized.playOptions, {
    cardsToShowCounts: '',
    countdownSeconds: '',
    lengthOfPlay: '3',
    lengthOfPlayUnits: 'hands',
    playerNames: ''
  });
  assert.equal(normalized.printOptions.pageSizeId, 'letter');
  assert.equal(normalized.printOptions.layoutId, '4-up');
});

test('given legacy temp deck without play or print options, normalizeTempDeck adds defaults', () => {
  const normalized = normalizeTempDeck({
    deckName: 'Legacy',
    symbolsPerCard: 4,
    selectedImageRefs: [],
    dirty: true
  });

  assert.deepEqual(normalized.generationOptions, {
    cardShape: 'round',
    imageRotation: 'random',
    imageSize: 'various',
    sourceSamplingBias: 'balanced'
  });
  assert.deepEqual(normalized.playOptions, {
    cardsToShowCounts: '2',
    countdownSeconds: '',
    lengthOfPlay: '',
    lengthOfPlayUnits: 'hands',
    playerNames: 'one, two'
  });
  assert.equal(normalized.printOptions.pageSizeId, 'letter');
  assert.equal(normalized.printOptions.qualityPreset, 'inkjet');
});

test('given a temp deck, createSavedDeckRecord includes normalized print options', () => {
  const savedDeck = createSavedDeckRecord({
    ...createEmptyTempDeck(),
    deckName: 'Demo',
    printOptions: {
      pageSizeId: 'a4',
      orientation: 'portrait',
      units: 'mm',
      customPageWidth: '',
      customPageHeight: '',
      marginTop: '5',
      marginRight: '5',
      marginBottom: '5',
      marginLeft: '5',
      layoutId: '6-up',
      qualityPreset: 'laser',
      customDpi: '',
      showCardNumber: true,
      cardNumberPosition: 'top-right',
      showCardOutline: true,
      markupColor: '#123456',
      cardOutlineDashStyle: 'dotted'
    }
  });

  assert.equal(savedDeck.name, 'Demo');
  assert.deepEqual(savedDeck.printOptions, {
    pageSizeId: 'a4',
    orientation: 'portrait',
    units: 'mm',
    customPageWidth: '',
    customPageHeight: '',
    marginTop: '5',
    marginRight: '5',
    marginBottom: '5',
    marginLeft: '5',
    layoutId: '6-up',
    qualityPreset: 'laser',
    customDpi: '',
    showCardNumber: true,
    cardNumberPosition: 'top-right',
    showCardOutline: true,
    markupColor: '#123456',
    cardOutlineDashStyle: 'dotted'
  });
});
