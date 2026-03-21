import test from 'node:test';
import assert from 'node:assert/strict';

import { formatClaimHandPoints } from '../src/js/modules/playClaimScoreDisplay.js';

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
