import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CLAIM_POINTS_MODE_STAR,
  CLAIM_POINTS_MODE_TOMATO,
  getClaimPointsModeRowAction,
  normalizeClaimPointsMode
} from '../src/js/modules/playClaimPointsMode.js';

test('given no valid mode, normalizeClaimPointsMode falls back to star mode', () => {
  assert.equal(normalizeClaimPointsMode(), CLAIM_POINTS_MODE_STAR);
  assert.equal(normalizeClaimPointsMode('anything-else'), CLAIM_POINTS_MODE_STAR);
});

test('given tomato mode, normalizeClaimPointsMode preserves it', () => {
  assert.equal(normalizeClaimPointsMode(CLAIM_POINTS_MODE_TOMATO), CLAIM_POINTS_MODE_TOMATO);
});

test('given star mode, row clicks use clamped increase behavior', () => {
  assert.equal(getClaimPointsModeRowAction(CLAIM_POINTS_MODE_STAR), 'row-increase');
});

test('given tomato mode, row clicks use clamped decrease behavior', () => {
  assert.equal(getClaimPointsModeRowAction(CLAIM_POINTS_MODE_TOMATO), 'row-decrease');
});
