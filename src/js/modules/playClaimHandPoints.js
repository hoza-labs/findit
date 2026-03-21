export function stepClaimHandPoints(currentPoints, action) {
  if (!Number.isInteger(currentPoints)) {
    return 0;
  }

  if (action === 'reset') {
    return 0;
  }

  if (action === 'decrease') {
    return Math.min(currentPoints, 0) - 1;
  }

  if (action === 'increase') {
    return Math.max(currentPoints, 0) + 1;
  }

  if (action === 'row-increase') {
    return Math.max(currentPoints + 1, 0);
  }

  if (action === 'row-decrease') {
    return Math.min(currentPoints - 1, 0);
  }

  if (action === 'row') {
    return currentPoints < 0 ? currentPoints - 1 : currentPoints + 1;
  }

  return currentPoints;
}
