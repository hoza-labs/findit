import { calculateDeckSize, validateSymbolsPerCard } from './spotitMath.js';

export function getDeckPlayerCardCount(symbolsPerCard) {
  return calculateDeckSize(symbolsPerCard);
}

export function getDeckPlayerSlopeComponents(slopeIndex, order) {
  if (!Number.isInteger(order) || order < 1) {
    throw new Error('order must be a positive integer.');
  }

  if (!Number.isInteger(slopeIndex) || slopeIndex < 0 || slopeIndex > order) {
    throw new Error('slopeIndex must reference a valid slope item.');
  }

  if (slopeIndex === order) {
    return { rise: 1, run: 0 };
  }

  if (slopeIndex % 2 === 0) {
    return { rise: slopeIndex === 0 ? 0 : slopeIndex / -2, run: 1 };
  }

  return { rise: (slopeIndex + 1) / 2, run: 1 };
}

export function getDeckPlayerStepAt(symbolsPerCard, cardIndex) {
  validateSymbolsPerCard(symbolsPerCard);

  if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= getDeckPlayerCardCount(symbolsPerCard)) {
    throw new Error('cardIndex must be a valid deck player card index.');
  }

  const order = symbolsPerCard - 1;
  if (cardIndex === order * symbolsPerCard) {
    return { s: Number.POSITIVE_INFINITY, r: Number.POSITIVE_INFINITY };
  }

  return {
    s: Math.floor(cardIndex / order),
    r: cardIndex % order
  };
}

export function getDeckPlayerCardItems(slopeItems, grid, s, r) {
  validateDeckPatternInputs(slopeItems, grid);

  const order = grid.length;

  if (s === Number.POSITIVE_INFINITY && r === Number.POSITIVE_INFINITY) {
    return [...slopeItems];
  }

  if (!Number.isInteger(s) || s < 0 || s >= slopeItems.length) {
    throw new Error('s must reference a valid slope item or be Infinity.');
  }

  if (!Number.isInteger(r) || r < 0 || r >= order) {
    throw new Error('r must reference a valid grid row or be Infinity.');
  }

  const selectedItems = [slopeItems[s]];

  if (s === order) {
    for (let row = 0; row < order; row += 1) {
      selectedItems.push(grid[row][r]);
    }
    return selectedItems;
  }

  const { rise } = getDeckPlayerSlopeComponents(s, order);
  for (let column = 0; column < order; column += 1) {
    const row = ((r + column * rise) % order + order) % order;
    selectedItems.push(grid[row][column]);
  }

  return selectedItems;
}

function validateDeckPatternInputs(slopeItems, grid) {
  if (!Array.isArray(slopeItems) || slopeItems.length === 0) {
    throw new Error('slopeItems must be a non-empty array.');
  }

  if (!Array.isArray(grid) || grid.length === 0) {
    throw new Error('grid must be a non-empty array.');
  }

  const order = grid.length;
  if (slopeItems.length !== order + 1) {
    throw new Error('slopeItems length must be exactly one more than the grid size.');
  }

  for (const row of grid) {
    if (!Array.isArray(row) || row.length !== order) {
      throw new Error('grid must be square.');
    }
  }
}

