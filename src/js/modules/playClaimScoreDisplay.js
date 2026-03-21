const MAX_INLINE_ICONS = 5;
const GOLD_STAR = String.fromCodePoint(0x2B50);
const TOMATO = String.fromCodePoint(0x1F345);

export function formatClaimHandPoints(points) {
  if (!Number.isInteger(points) || points === 0) {
    return '';
  }

  if (points > 0) {
    return points <= MAX_INLINE_ICONS ? GOLD_STAR.repeat(points) : GOLD_STAR + 'x' + String(points);
  }

  const absolutePoints = Math.abs(points);
  return absolutePoints <= MAX_INLINE_ICONS ? TOMATO.repeat(absolutePoints) : TOMATO + 'x' + String(absolutePoints);
}

export function formatClaimHandPointsSummary(points, playerName) {
  if (!Number.isInteger(points) || points === 0) {
    return '';
  }

  const absolutePoints = Math.abs(points);
  const pointLabel = absolutePoints === 1 ? 'point' : 'points';
  const verb = points > 0 ? 'added to' : 'subtracted from';
  return '(' + String(absolutePoints) + ' ' + pointLabel + ' will be ' + verb + ' ' + String(playerName) + "'s score)";
}
