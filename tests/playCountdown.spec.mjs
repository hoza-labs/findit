import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCountdownClock,
  pauseCountdownClock,
  readCountdownTick,
  resetCountdownClock,
  startCountdownClock
} from '../src/js/modules/playCountdown.js';

test('given a fresh countdown, startCountdownClock uses the full duration', () => {
  const clock = startCountdownClock(createCountdownClock(), 5000, 1000);

  assert.deepEqual(clock, {
    remainingMs: 5000,
    endsAtMs: 6000,
    runId: 1
  });
});

test('given a paused countdown, startCountdownClock resumes from the saved remaining time', () => {
  const started = startCountdownClock(createCountdownClock(), 5000, 1000);
  const paused = pauseCountdownClock(started, 2800);
  const resumed = startCountdownClock(paused, 5000, 4000);

  assert.equal(paused.remainingMs, 3200);
  assert.equal(resumed.remainingMs, 3200);
  assert.equal(resumed.endsAtMs, 7200);
  assert.equal(resumed.runId, 3);
});

test('given a new hand, resetCountdownClock clears remaining time and invalidates stale timers', () => {
  const started = startCountdownClock(createCountdownClock(), 5000, 1000);
  const reset = resetCountdownClock(started);

  assert.deepEqual(reset, {
    remainingMs: 0,
    endsAtMs: 0,
    runId: 2
  });
});

test('given a stale timer tick, readCountdownTick ignores it instead of expiring the new hand', () => {
  const started = startCountdownClock(createCountdownClock(), 5000, 1000);
  const reset = resetCountdownClock(started);
  const replacement = startCountdownClock(reset, 5000, 2000);
  const staleTick = readCountdownTick(replacement, 7000, started.runId);
  const activeTick = readCountdownTick(replacement, 7000, replacement.runId);

  assert.equal(staleTick.ignored, true);
  assert.equal(staleTick.expired, false);
  assert.equal(activeTick.ignored, false);
  assert.equal(activeTick.expired, true);
});
