import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getPlayRevealTotalDurationMs,
  readPlayRevealStep
} from '../src/js/modules/playRevealCountdown.js';

test('given the default play reveal sequence, the total duration is three seconds', () => {
  assert.equal(getPlayRevealTotalDurationMs(), 3000);
});

test('given reveal time within each second, readPlayRevealStep returns the matching countdown number', () => {
  assert.deepEqual(readPlayRevealStep(3000), {
    complete: false,
    label: '3',
    stepIndex: 0
  });
  assert.deepEqual(readPlayRevealStep(2000), {
    complete: false,
    label: '2',
    stepIndex: 1
  });
  assert.deepEqual(readPlayRevealStep(1000), {
    complete: false,
    label: '1',
    stepIndex: 2
  });
});

test('given elapsed time inside a second, readPlayRevealStep keeps the current number until the next boundary', () => {
  assert.equal(readPlayRevealStep(2501).label, '3');
  assert.equal(readPlayRevealStep(1501).label, '2');
  assert.equal(readPlayRevealStep(1).label, '1');
});

test('given no remaining reveal time, readPlayRevealStep reports completion', () => {
  assert.deepEqual(readPlayRevealStep(0), {
    complete: true,
    label: '',
    stepIndex: 3
  });
});
