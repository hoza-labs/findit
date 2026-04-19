const MAX_INLINE_ICONS = 5;

export const CLAIM_HAND_POINT_ICON_STAR = 'star';
export const CLAIM_HAND_POINT_ICON_TOMATO = 'tomato';

export function getClaimHandPointsDisplay(points) {
  if (!Number.isInteger(points) || points === 0) {
    return null;
  }

  const absolutePoints = Math.abs(points);
  const icon = points > 0 ? CLAIM_HAND_POINT_ICON_STAR : CLAIM_HAND_POINT_ICON_TOMATO;
  const compactCount = absolutePoints > MAX_INLINE_ICONS ? absolutePoints : null;

  return {
    icon,
    iconCount: compactCount === null ? absolutePoints : 1,
    countLabel: compactCount === null ? '' : 'x' + String(compactCount)
  };
}

export function formatClaimHandPoints(points) {
  const display = getClaimHandPointsDisplay(points);
  if (display === null) {
    return '';
  }

  const iconLabel = display.icon === CLAIM_HAND_POINT_ICON_STAR ? 'star' : 'tomato';
  if (display.countLabel) {
    return iconLabel + ' ' + display.countLabel;
  }

  return display.iconCount === 1 ? iconLabel : iconLabel + ' x' + String(display.iconCount);
}

export function formatClaimHandPointsSummary(points, playerName) {
  if (!Number.isInteger(points) || points === 0) {
    return '';
  }

  if (points > 0) {
    const pointLabel = points === 1 ? 'point' : 'points';
    return String(points) + ' ' + pointLabel + ' will be added to ' + String(playerName) + "'s score";
  }

  const absolutePoints = Math.abs(points);
  const pointLabel = absolutePoints === 1 ? 'point' : 'points';
  return String(absolutePoints) + ' ' + pointLabel + ' will be subtracted from ' + String(playerName) + "'s score";
}
