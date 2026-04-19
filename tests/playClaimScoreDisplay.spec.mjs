import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CLAIM_HAND_POINT_ICON_STAR,
  CLAIM_HAND_POINT_ICON_TOMATO,
  formatClaimHandPoints,
  getClaimHandPointsDisplay,
  formatClaimHandPointsSummary
} from '../src/js/modules/playClaimScoreDisplay.js';

test('given zero points, claim hand display is empty', () => {
  assert.equal(getClaimHandPointsDisplay(0), null);
});

test('given one to five positive points, claim hand display shows one star icon per point', () => {
  assert.deepEqual(getClaimHandPointsDisplay(1), {
    icon: CLAIM_HAND_POINT_ICON_STAR,
    iconCount: 1,
    countLabel: ''
  });
  assert.deepEqual(getClaimHandPointsDisplay(5), {
    icon: CLAIM_HAND_POINT_ICON_STAR,
    iconCount: 5,
    countLabel: ''
  });
});

test('given more than five positive points, claim hand display shows compact star count', () => {
  assert.deepEqual(getClaimHandPointsDisplay(6), {
    icon: CLAIM_HAND_POINT_ICON_STAR,
    iconCount: 1,
    countLabel: 'x6'
  });
});

test('given one to five negative points, claim hand display shows one tomato icon per point', () => {
  assert.deepEqual(getClaimHandPointsDisplay(-1), {
    icon: CLAIM_HAND_POINT_ICON_TOMATO,
    iconCount: 1,
    countLabel: ''
  });
  assert.deepEqual(getClaimHandPointsDisplay(-5), {
    icon: CLAIM_HAND_POINT_ICON_TOMATO,
    iconCount: 5,
    countLabel: ''
  });
});

test('given fewer than negative five points, claim hand display shows compact tomato count', () => {
  assert.deepEqual(getClaimHandPointsDisplay(-6), {
    icon: CLAIM_HAND_POINT_ICON_TOMATO,
    iconCount: 1,
    countLabel: 'x6'
  });
});

test('given a non-integer value, claim hand display is empty', () => {
  assert.equal(getClaimHandPointsDisplay(1.5), null);
});

test('given points, claim hand text fallback does not require emoji glyphs', () => {
  assert.equal(formatClaimHandPoints(2), 'star x2');
  assert.equal(formatClaimHandPoints(-6), 'tomato x6');
});

test('given positive points, claim hand summary explains points added to the player score', () => {
  assert.equal(formatClaimHandPointsSummary(3, 'Alex'), "3 points will be added to Alex's score");
});

test('given exactly one point, claim hand summary uses singular point', () => {
  assert.equal(formatClaimHandPointsSummary(1, 'Alex'), "1 point will be added to Alex's score");
  assert.equal(formatClaimHandPointsSummary(-1, 'Blair'), "1 point will be subtracted from Blair's score");
});

test('given negative points, claim hand summary explains points subtracted from the player score', () => {
  assert.equal(formatClaimHandPointsSummary(-2, 'Blair'), "2 points will be subtracted from Blair's score");
});

test('given zero points, claim hand summary is empty', () => {
  assert.equal(formatClaimHandPointsSummary(0, 'Casey'), '');
});
