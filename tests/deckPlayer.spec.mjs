import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getDeckPlayerCardCount,
  getDeckPlayerCardItems,
  getDeckPlayerStepAt
} from '../src/js/modules/deckPlayer.js';

test('given valid symbols per card, getDeckPlayerCardCount returns n^2 - n + 1', () => {
  assert.equal(getDeckPlayerCardCount(4), 13);
});

test('given a card index before the last card, getDeckPlayerStepAt returns the matching slope and row', () => {
  assert.deepEqual(getDeckPlayerStepAt(4, 0), { s: 0, r: 0 });
  assert.deepEqual(getDeckPlayerStepAt(4, 5), { s: 1, r: 2 });
  assert.deepEqual(getDeckPlayerStepAt(4, 11), { s: 3, r: 2 });
});

test('given the last card index, getDeckPlayerStepAt returns Infinity for both coordinates', () => {
  assert.deepEqual(getDeckPlayerStepAt(4, 12), {
    s: Number.POSITIVE_INFINITY,
    r: Number.POSITIVE_INFINITY
  });
});

test('given a finite slope, getDeckPlayerCardItems returns the slope item and wrapped grid path', () => {
  const slopeItems = ['S0', 'S1', 'S2', 'SV'];
  const grid = [
    ['A0', 'A1', 'A2'],
    ['B0', 'B1', 'B2'],
    ['C0', 'C1', 'C2']
  ];

  assert.deepEqual(getDeckPlayerCardItems(slopeItems, grid, 2, 1), ['S2', 'B0', 'A1', 'C2']);
});

test('given the vertical slope item, getDeckPlayerCardItems returns the matching grid column', () => {
  const slopeItems = ['S0', 'S1', 'S2', 'SV'];
  const grid = [
    ['A0', 'A1', 'A2'],
    ['B0', 'B1', 'B2'],
    ['C0', 'C1', 'C2']
  ];

  assert.deepEqual(getDeckPlayerCardItems(slopeItems, grid, 3, 1), ['SV', 'A1', 'B1', 'C1']);
});

test('given Infinity for both coordinates, getDeckPlayerCardItems returns the last card from all slope items', () => {
  const slopeItems = ['S0', 'S1', 'S2', 'SV'];
  const grid = [
    ['A0', 'A1', 'A2'],
    ['B0', 'B1', 'B2'],
    ['C0', 'C1', 'C2']
  ];

  assert.deepEqual(getDeckPlayerCardItems(slopeItems, grid, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY), slopeItems);
});
