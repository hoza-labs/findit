import test from 'node:test';
import assert from 'node:assert/strict';

import { stepClaimHandPoints } from '../src/js/modules/playClaimHandPoints.js';

test('given increase action, positive and zero scores step up while negative scores reset to zero first', () => {
  assert.equal(stepClaimHandPoints(0, 'increase'), 1);
  assert.equal(stepClaimHandPoints(2, 'increase'), 3);
  assert.equal(stepClaimHandPoints(-2, 'increase'), 1);
});

test('given decrease action, negative and zero scores step down while positive scores reset to zero first', () => {
  assert.equal(stepClaimHandPoints(0, 'decrease'), -1);
  assert.equal(stepClaimHandPoints(-2, 'decrease'), -3);
  assert.equal(stepClaimHandPoints(2, 'decrease'), -1);
});

test('given row action, nonnegative scores step up and negative scores step down', () => {
  assert.equal(stepClaimHandPoints(0, 'row'), 1);
  assert.equal(stepClaimHandPoints(2, 'row'), 3);
  assert.equal(stepClaimHandPoints(-2, 'row'), -3);
});

test('given reset action, claim hand points return to zero', () => {
  assert.equal(stepClaimHandPoints(4, 'reset'), 0);
  assert.equal(stepClaimHandPoints(-4, 'reset'), 0);
});
