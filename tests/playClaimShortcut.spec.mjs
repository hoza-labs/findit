import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CLAIM_DIALOG_ACTION_KEY_DELAY_MS,
  getClaimDialogShortcut,
  isClaimDialogActionKeyEnabled
} from '../src/js/modules/playClaimShortcut.js';

test('given Enter in the claim dialog, the shortcut advances to the next hand', () => {
  assert.deepEqual(getClaimDialogShortcut({ key: 'Enter' }), {
    type: 'next-hand'
  });
});

test('given number keys one through nine, the shortcut adds one point to the matching player', () => {
  assert.deepEqual(getClaimDialogShortcut({ key: '1', code: 'Digit1', shiftKey: false }, 9), {
    type: 'score',
    playerIndex: 0,
    scoreDelta: 1
  });
  assert.deepEqual(getClaimDialogShortcut({ key: '9', code: 'Digit9', shiftKey: false }, 9), {
    type: 'score',
    playerIndex: 8,
    scoreDelta: 1
  });
});

test('given Shift plus a number key, the shortcut removes one point from the matching player', () => {
  assert.deepEqual(getClaimDialogShortcut({ key: '!', code: 'Digit1', shiftKey: true }, 9), {
    type: 'score',
    playerIndex: 0,
    scoreDelta: -1
  });
});

test('given a number key beyond the configured player count, the shortcut is ignored', () => {
  assert.equal(getClaimDialogShortcut({ key: '4', code: 'Digit4', shiftKey: false }, 3), null);
});

test('given modifier keys other than Shift, the shortcut is ignored', () => {
  assert.equal(getClaimDialogShortcut({ key: '1', code: 'Digit1', ctrlKey: true }, 9), null);
  assert.equal(getClaimDialogShortcut({ key: 'Enter', metaKey: true }, 9), null);
});

test('given a freshly opened claim dialog, action keys stay disabled for one second', () => {
  assert.equal(isClaimDialogActionKeyEnabled(5000, 5000 + CLAIM_DIALOG_ACTION_KEY_DELAY_MS - 1), false);
  assert.equal(isClaimDialogActionKeyEnabled(5000, 5000 + CLAIM_DIALOG_ACTION_KEY_DELAY_MS), true);
});

test('given no valid open timestamp, claim dialog action keys are enabled', () => {
  assert.equal(isClaimDialogActionKeyEnabled(0, 1000), true);
});
