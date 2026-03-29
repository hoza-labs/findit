import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_PRINT_OPTIONS_STORAGE_KEY,
  getDefaultPrintOptions,
  saveDefaultPrintOptions
} from '../src/js/modules/printDefaults.js';
import { createEmptyTempDeck } from '../src/js/modules/deckSession.js';

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

test('given no saved default print options, getDefaultPrintOptions returns the built-in defaults', () => {
  const defaults = getDefaultPrintOptions(createMemoryStorage());

  assert.equal(defaults.pageSizeId, 'letter');
  assert.equal(defaults.layoutId, '6-up');
  assert.equal(defaults.qualityPreset, 'inkjet');
});

test('given saved default print options, saveDefaultPrintOptions normalizes and stores them', () => {
  const storage = createMemoryStorage();
  const saved = saveDefaultPrintOptions({
    pageSizeId: 'a4',
    orientation: 'landscape',
    units: 'mm',
    desiredCardSize: '90',
    customPageWidth: '',
    customPageHeight: '',
    marginTop: '6',
    marginRight: '6',
    marginBottom: '6',
    marginLeft: '6',
    layoutId: '6-up',
    qualityPreset: 'laser',
    customDpi: '',
    showCardNumber: true,
    cardNumberPosition: 'top-left',
    showCardOutline: true,
    markupColor: '#abcdef',
    cardOutlineDashStyle: 'dashed'
  }, storage);

  assert.equal(saved.pageSizeId, 'a4');
  assert.equal(saved.layoutId, '6-up');
  assert.equal(saved.markupColor, '#abcdef');
  assert.ok(storage.getItem(DEFAULT_PRINT_OPTIONS_STORAGE_KEY));

  const loaded = getDefaultPrintOptions(storage);
  assert.deepEqual(loaded, saved);
});



test('given saved default margins, a new empty deck uses those margins instead of the built-in defaults', () => {
  const storage = createMemoryStorage();

  saveDefaultPrintOptions({
    marginTop: '0.5',
    marginRight: '0.75',
    marginBottom: '1',
    marginLeft: '1.25'
  }, storage);

  const deck = createEmptyTempDeck({
    printOptions: getDefaultPrintOptions(storage),
    random: () => 0.25
  });

  assert.equal(deck.printOptions.marginTop, '0.5');
  assert.equal(deck.printOptions.marginRight, '0.75');
  assert.equal(deck.printOptions.marginBottom, '1');
  assert.equal(deck.printOptions.marginLeft, '1.25');
});

test('given partial print defaults, saveDefaultPrintOptions preserves existing non-form values while updating margins', () => {
  const storage = createMemoryStorage();

  saveDefaultPrintOptions({
    showCardNumber: true,
    showCardOutline: true,
    cardNumberPosition: 'top-left',
    marginTop: '0.25',
    marginRight: '0.25',
    marginBottom: '0.25',
    marginLeft: '0.25'
  }, storage);

  const saved = saveDefaultPrintOptions({
    marginTop: '0.5',
    marginRight: '0.75',
    marginBottom: '1',
    marginLeft: '1.25'
  }, storage);

  assert.equal(saved.showCardNumber, true);
  assert.equal(saved.showCardOutline, true);
  assert.equal(saved.cardNumberPosition, 'top-left');
  assert.equal(saved.marginTop, '0.5');
  assert.equal(saved.marginRight, '0.75');
  assert.equal(saved.marginBottom, '1');
  assert.equal(saved.marginLeft, '1.25');
});
