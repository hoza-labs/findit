import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDefaultPrintOptions,
  formatMeasurement,
  getRecommendedLayoutId,
  normalizePrintOptions,
  planPrintLayout,
  resolveEffectiveDpi,
  resolvePageSize
} from '../src/js/modules/printOptions.js';

test('given default print options, letter portrait resolves to a 4-up layout near four inches wide', () => {
  const options = createDefaultPrintOptions();
  const pageSize = resolvePageSize(options);
  const layoutId = getRecommendedLayoutId(options);
  const planned = planPrintLayout(13, { ...options, layoutId });

  assert.equal(pageSize.widthIn, 8.5);
  assert.equal(pageSize.heightIn, 11);
  assert.equal(layoutId, '4-up');
  assert.equal(planned.isValid, true);
  assert.equal(planned.layoutId, '4-up');
  assert.ok(Math.abs(planned.expectedCardWidthIn - 3.9375) < 0.0001);
});

test('given custom page size in millimeters, resolvePageSize honors orientation and units', () => {
  const pageSize = resolvePageSize({
    pageSizeId: 'custom',
    orientation: 'landscape',
    units: 'mm',
    customPageWidth: '210',
    customPageHeight: '297'
  });

  assert.ok(Math.abs(pageSize.widthIn - 11.6929) < 0.001);
  assert.ok(Math.abs(pageSize.heightIn - 8.2677) < 0.001);
  assert.ok(Math.abs(pageSize.width - 297) < 0.001);
  assert.ok(Math.abs(pageSize.height - 210) < 0.001);
});

test('given print quality presets, resolveEffectiveDpi returns the expected dpi', () => {
  assert.equal(resolveEffectiveDpi({ qualityPreset: 'inkjet' }), 300);
  assert.equal(resolveEffectiveDpi({ qualityPreset: 'laser' }), 600);
  assert.equal(resolveEffectiveDpi({ qualityPreset: 'photo' }), 1200);
  assert.equal(resolveEffectiveDpi({ qualityPreset: 'professional' }), 300);
  assert.equal(resolveEffectiveDpi({ qualityPreset: 'custom', customDpi: '450' }), 450);
  assert.equal(resolveEffectiveDpi({ qualityPreset: 'custom', customDpi: '' }), null);
});

test('given invalid custom values, normalizePrintOptions falls back to safe defaults', () => {
  const normalized = normalizePrintOptions({
    pageSizeId: 'custom',
    units: 'cm',
    customPageWidth: '-1',
    customPageHeight: 'abc',
    marginTop: '-1',
    marginRight: 'x',
    marginBottom: '',
    marginLeft: null,
    layoutId: '15-up',
    qualityPreset: 'poster',
    customDpi: '0',
    showCardNumber: 1,
    cardNumberPosition: 'center',
    showCardOutline: 'yes',
    cardOutlineColor: 'blue',
    cardOutlineDashStyle: 'dot-dash'
  });

  assert.deepEqual(normalized, {
    pageSizeId: 'custom',
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
    showCardNumber: true,
    cardNumberPosition: 'bottom-right',
    showCardOutline: true,
    cardOutlineColor: '#000000',
    cardOutlineDashStyle: 'solid'
  });
});

test('given different layouts, 6-up yields a smaller expected card width than 4-up', () => {
  const fourUp = planPrintLayout(13, { ...createDefaultPrintOptions(), layoutId: '4-up' });
  const sixUp = planPrintLayout(13, { ...createDefaultPrintOptions(), layoutId: '6-up' });

  assert.equal(fourUp.isValid, true);
  assert.equal(sixUp.isValid, true);
  assert.ok(sixUp.expectedCardWidthIn < fourUp.expectedCardWidthIn);
});

test('given enough cards for multiple pages, planPrintLayout paginates them all in card order', () => {
  const planned = planPrintLayout(13, { ...createDefaultPrintOptions(), layoutId: '4-up' });

  assert.equal(planned.pageCount, 4);
  assert.deepEqual(planned.pages.map((page) => page.slots.length), [4, 4, 4, 1]);
  assert.equal(planned.pages[0].slots[0].cardNumber, 1);
  assert.equal(planned.pages[2].slots[3].cardNumber, 12);
  assert.equal(planned.pages[3].slots[0].cardNumber, 13);
});

test('given impossible margins, planPrintLayout returns a validation error instead of a broken layout', () => {
  const planned = planPrintLayout(13, {
    ...createDefaultPrintOptions(),
    marginLeft: '5',
    marginRight: '5',
    marginTop: '4',
    marginBottom: '4'
  });

  assert.equal(planned.isValid, false);
  assert.match(planned.validationMessage, /Margins leave no printable space/i);
});

test('formatMeasurement reports values in the active units', () => {
  assert.equal(formatMeasurement(4, 'in'), '4 in');
  assert.equal(formatMeasurement(1, 'mm'), '25.4 mm');
});
