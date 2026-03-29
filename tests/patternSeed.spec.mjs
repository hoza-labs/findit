import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRandomPattern,
  createSeededRandom,
  deriveRenderSeed,
  formatPatternBase36,
  normalizePattern,
  parsePatternBase36
} from '../src/js/modules/patternSeed.js';

test('createRandomPattern returns a valid uint32', () => {
  const pattern = createRandomPattern(() => 0.5);

  assert.equal(pattern, 2147483648);
  assert.equal(Number.isInteger(pattern), true);
  assert.ok(pattern >= 0);
  assert.ok(pattern <= 0xFFFFFFFF);
});

test('formatPatternBase36 and parsePatternBase36 round-trip a pattern', () => {
  const pattern = 17358415;
  const formatted = formatPatternBase36(pattern);

  assert.equal(formatted, 'ac1u7');
  assert.equal(parsePatternBase36(formatted), pattern);
  assert.equal(parsePatternBase36(formatted.toUpperCase()), pattern);
});

test('parsePatternBase36 rejects invalid input', () => {
  assert.equal(parsePatternBase36(''), null);
  assert.equal(parsePatternBase36('***'), null);
  assert.equal(parsePatternBase36('100000000'), null);
});

test('normalizePattern accepts valid uint32 values and rejects others', () => {
  assert.equal(normalizePattern(42), 42);
  assert.equal(normalizePattern('42'), 42);
  assert.equal(normalizePattern(-1), null);
  assert.equal(normalizePattern(0x1FFFFFFFF), null);
  assert.equal(normalizePattern(undefined, 77), 77);
});

test('deriveRenderSeed is stable and depends on seed index', () => {
  const first = deriveRenderSeed(1234, 1);
  const second = deriveRenderSeed(1234, 1);
  const third = deriveRenderSeed(1234, 2);

  assert.equal(second, first);
  assert.notEqual(third, first);
});

test('createSeededRandom returns repeatable sequences for the same seed', () => {
  const left = createSeededRandom(987654321);
  const right = createSeededRandom(987654321);
  const leftValues = [left(), left(), left(), left()];
  const rightValues = [right(), right(), right(), right()];

  assert.deepEqual(rightValues, leftValues);
});

