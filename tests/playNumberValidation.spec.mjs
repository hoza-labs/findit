import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isValidPositiveNumberInput,
  isValidPositiveWholeNumberInput,
  parsePositiveNumberInput,
  parsePositiveWholeNumberInput
} from '../src/js/modules/playNumberValidation.js';

test('given valid numeric entries, play number validation accepts them', () => {
  const validEntries = ['3', '3.4', '0.5', '.7', '92'];

  for (const entry of validEntries) {
    assert.equal(isValidPositiveNumberInput(entry), true, entry);
    assert.notEqual(parsePositiveNumberInput(entry), null, entry);
  }
});

test('given invalid numeric entries, play number validation rejects them', () => {
  const invalidEntries = ['0', '-1', '5.2.1', '1w2', '6x', 'xyz', 'x2'];

  for (const entry of invalidEntries) {
    assert.equal(isValidPositiveNumberInput(entry), false, entry);
    assert.equal(parsePositiveNumberInput(entry), null, entry);
  }
});

test('given valid whole-number entries, countdown validation accepts them', () => {
  const validEntries = ['3', '92', '0007'];

  for (const entry of validEntries) {
    assert.equal(isValidPositiveWholeNumberInput(entry), true, entry);
    assert.notEqual(parsePositiveWholeNumberInput(entry), null, entry);
  }
});

test('given non-digit countdown entries, countdown validation rejects them', () => {
  const invalidEntries = ['3.4', '0.5', '.7', '0', '-1', '5.2.1', '1w2', '6x', 'xyz', 'x2'];

  for (const entry of invalidEntries) {
    assert.equal(isValidPositiveWholeNumberInput(entry), false, entry);
    assert.equal(parsePositiveWholeNumberInput(entry), null, entry);
  }
});
