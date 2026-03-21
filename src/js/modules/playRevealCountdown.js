export const PLAY_REVEAL_SEQUENCE = Object.freeze(['3', '2', '1']);
export const PLAY_REVEAL_STEP_MS = 1000;

export function getPlayRevealTotalDurationMs(
  sequence = PLAY_REVEAL_SEQUENCE,
  stepDurationMs = PLAY_REVEAL_STEP_MS
) {
  return sequence.length * stepDurationMs;
}

export function readPlayRevealStep(
  remainingMs,
  sequence = PLAY_REVEAL_SEQUENCE,
  stepDurationMs = PLAY_REVEAL_STEP_MS
) {
  const totalDurationMs = getPlayRevealTotalDurationMs(sequence, stepDurationMs);
  const clampedRemainingMs = Math.max(0, remainingMs);
  if (clampedRemainingMs <= 0) {
    return {
      complete: true,
      label: '',
      stepIndex: sequence.length
    };
  }

  const elapsedMs = Math.max(0, totalDurationMs - clampedRemainingMs);
  const rawStepIndex = Math.floor(elapsedMs / stepDurationMs);
  const stepIndex = Math.max(0, Math.min(sequence.length - 1, rawStepIndex));

  return {
    complete: false,
    label: sequence[stepIndex] ?? '',
    stepIndex
  };
}
