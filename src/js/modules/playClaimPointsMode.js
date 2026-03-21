export const CLAIM_POINTS_MODE_STAR = 'star';
export const CLAIM_POINTS_MODE_TOMATO = 'tomato';

export function normalizeClaimPointsMode(mode) {
  return mode === CLAIM_POINTS_MODE_TOMATO ? CLAIM_POINTS_MODE_TOMATO : CLAIM_POINTS_MODE_STAR;
}

export function getClaimPointsModeRowAction(mode) {
  return normalizeClaimPointsMode(mode) === CLAIM_POINTS_MODE_TOMATO ? 'row-decrease' : 'row-increase';
}
