export function getCurrentDeckNumber(hatState) {
  const refillCount = Number.isInteger(hatState?.refillCount) && hatState.refillCount >= 0
    ? hatState.refillCount
    : 0;

  return refillCount + 1;
}

export function getCardsToDrawForHand(settings, hatState, getRandomIndex) {
  const allowedCardCounts = Array.isArray(settings.cardsToShowCounts) ? [...settings.cardsToShowCounts] : [];

  if (allowedCardCounts.length === 0) {
    return 0;
  }

  if (settings.lengthOfPlayUnits !== 'decks' || !settings.lengthOfPlay) {
    return allowedCardCounts[getRandomIndex(0, allowedCardCounts.length - 1)];
  }

  const currentDeckNumber = getCurrentDeckNumber(hatState);
  if (currentDeckNumber < settings.lengthOfPlay) {
    return allowedCardCounts[getRandomIndex(0, allowedCardCounts.length - 1)];
  }

  const cardsLeftInHat = Array.isArray(hatState?.hatCardIndices) ? hatState.hatCardIndices.length : 0;
  const allowedFinalDeckCounts = allowedCardCounts.filter((count) => count <= cardsLeftInHat);
  if (allowedFinalDeckCounts.length === 0) {
    return 0;
  }

  return allowedFinalDeckCounts[getRandomIndex(0, allowedFinalDeckCounts.length - 1)];
}

export function isFinalDeckExhausted(settings, hatState) {
  if (settings.lengthOfPlayUnits !== 'decks' || !settings.lengthOfPlay) {
    return false;
  }

  const currentDeckNumber = getCurrentDeckNumber(hatState);
  if (currentDeckNumber !== settings.lengthOfPlay) {
    return false;
  }

  const cardsLeftInHat = Array.isArray(hatState?.hatCardIndices) ? hatState.hatCardIndices.length : 0;
  return cardsLeftInHat === 0;
}

export function getDeckLimitedHandStatus(activeHandNumber, totalDecks, currentDeckNumber, cardsLeftInHat) {
  if (currentDeckNumber < totalDecks) {
    return `Hand ${activeHandNumber}. Deck ${currentDeckNumber} of ${totalDecks}.`;
  }

  return `Hand ${activeHandNumber}. ${cardsLeftInHat} cards left.`;
}
