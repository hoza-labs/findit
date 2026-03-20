export function createCountdownClock() {
  return {
    remainingMs: 0,
    endsAtMs: 0,
    runId: 0
  };
}

export function resetCountdownClock(clock) {
  return {
    remainingMs: 0,
    endsAtMs: 0,
    runId: clock.runId + 1
  };
}

export function pauseCountdownClock(clock, nowMs) {
  if (clock.endsAtMs === 0) {
    return clock;
  }

  return {
    remainingMs: Math.max(0, clock.endsAtMs - nowMs),
    endsAtMs: 0,
    runId: clock.runId + 1
  };
}

export function startCountdownClock(clock, durationMs, nowMs) {
  const remainingMs = clock.remainingMs > 0 ? clock.remainingMs : durationMs;
  return {
    remainingMs,
    endsAtMs: nowMs + remainingMs,
    runId: clock.runId + 1
  };
}

export function readCountdownTick(clock, nowMs, runId) {
  if (clock.endsAtMs === 0 || runId !== clock.runId) {
    return {
      ignored: true,
      remainingMs: clock.remainingMs,
      expired: false
    };
  }

  const remainingMs = Math.max(0, clock.endsAtMs - nowMs);
  return {
    ignored: false,
    remainingMs,
    expired: remainingMs <= 0
  };
}
