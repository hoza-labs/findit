import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_PRINT_OPTIONS_STORAGE_KEY,
  getDefaultPrintOptions,
  saveDefaultPrintOptions
} from '../src/js/modules/printDefaults.js';

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

