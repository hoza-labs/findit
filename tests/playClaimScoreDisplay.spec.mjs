import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatClaimHandPoints,
  formatClaimHandPointsSummary
} from '../src/js/modules/playClaimScoreDisplay.js';

const star = String.fromCodePoint(0x2B50);
const tomato = String.fromCodePoint(0x1F345);

test('given zero points, claim hand display is empty', () => {
  assert.equal(formatClaimHandPoints(0), '');
});

test('given one to five positive points, claim hand display shows one star per point', () => {
  assert.equal(formatClaimHandPoints(1), star);
  assert.equal(formatClaimHandPoints(5), star.repeat(5));
});

test('given more than five positive points, claim hand display shows compact star count', () => {
  assert.equal(formatClaimHandPoints(6), star + 'x6');
});

test('given one to five negative points, claim hand display shows one tomato per point', () => {
  assert.equal(formatClaimHandPoints(-1), tomato);
  assert.equal(formatClaimHandPoints(-5), tomato.repeat(5));
});

test('given fewer than negative five points, claim hand display shows compact tomato count', () => {
  assert.equal(formatClaimHandPoints(-6), tomato + 'x6');
});

test('given a non-integer value, claim hand display is empty', () => {
  assert.equal(formatClaimHandPoints(1.5), '');
});

test('given positive points, claim hand summary explains points added to the player score', () => {
  assert.equal(formatClaimHandPointsSummary(3, 'Alex'), "(3 points will be added to Alex's score)");
});

test('given exactly one point, claim hand summary uses singular point', () => {
  assert.equal(formatClaimHandPointsSummary(1, 'Alex'), "(1 point will be added to Alex's score)");
  assert.equal(formatClaimHandPointsSummary(-1, 'Blair'), "(1 point will be subtracted from Blair's score)");
});

test('given negative points, claim hand summary explains points subtracted from the player score', () => {
  assert.equal(formatClaimHandPointsSummary(-2, 'Blair'), "(2 points will be subtracted from Blair's score)");
});

test('given zero points, claim hand summary is empty', () => {
  assert.equal(formatClaimHandPointsSummary(0, 'Casey'), '');
});
