export function getCurrentDeckNumber(hatState) {
  const refillCount = Number.isInteger(hatState?.refillCount) && hatState.refillCount >= 0
    ? hatState.refillCount
    : 0;

  return refillCount + 1;
}

export function getCardsToDrawForHand(settings, hatState, getRandomInteger) {
  const randomCardsToShow = getRandomInteger(settings.minCardsToShow, settings.maxCardsToShow);

  if (settings.lengthOfPlayUnits !== 'decks' || !settings.lengthOfPlay) {
    return randomCardsToShow;
  }

  const currentDeckNumber = getCurrentDeckNumber(hatState);
  if (currentDeckNumber < settings.lengthOfPlay) {
    return randomCardsToShow;
  }

  const cardsLeftInHat = Array.isArray(hatState?.hatCardIndices) ? hatState.hatCardIndices.length : 0;
  return Math.min(randomCardsToShow, cardsLeftInHat);
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
