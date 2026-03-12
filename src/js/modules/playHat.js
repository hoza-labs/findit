export function createPlayHatState(cardCount, random = Math.random) {
  validateCardCount(cardCount);

  return {
    cardCount,
    hatCardIndices: createShuffledCardIndices(cardCount, random),
    displayedCardIndices: [],
    refillCount: 0
  };
}

export function drawNextHand(previousState, cardsToShow, options = {}, random = Math.random) {
  const state = cloneState(previousState);
  validateCardsToShow(state.cardCount, cardsToShow);
  const maxRefills = Number.isFinite(options.maxRefills) ? options.maxRefills : Number.POSITIVE_INFINITY;

  state.displayedCardIndices = [];
  let refillLimitHit = false;

  while (state.displayedCardIndices.length < cardsToShow) {
    if (state.hatCardIndices.length === 0) {
      if (state.refillCount >= maxRefills) {
        refillLimitHit = true;
        break;
      }
      state.hatCardIndices = createShuffledCardIndices(state.cardCount, random);
      state.refillCount += 1;
    }

    const cardIndex = popNextEligibleCard(state.hatCardIndices, new Set(state.displayedCardIndices));
    if (cardIndex === null) {
      if (state.refillCount >= maxRefills) {
        refillLimitHit = true;
        break;
      }
      state.hatCardIndices = createShuffledCardIndices(state.cardCount, random);
      state.refillCount += 1;
      continue;
    }

    state.displayedCardIndices.push(cardIndex);
  }

  return {
    state,
    refillLimitHit,
    completedRequestedDraw: state.displayedCardIndices.length === cardsToShow
  };
}

function popNextEligibleCard(hatCardIndices, excludedSet) {
  const skipped = [];

  while (hatCardIndices.length > 0) {
    const candidate = hatCardIndices.pop();
    if (!excludedSet.has(candidate)) {
      while (skipped.length > 0) {
        hatCardIndices.push(skipped.pop());
      }
      return candidate;
    }

    skipped.push(candidate);
  }

  while (skipped.length > 0) {
    hatCardIndices.push(skipped.pop());
  }

  return null;
}

function createShuffledCardIndices(cardCount, random) {
  return shuffleCardIndices(
    Array.from({ length: cardCount }, (_, index) => index),
    random
  );
}

function shuffleCardIndices(indices, random) {
  const shuffled = [...indices];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function cloneState(state) {
  if (!state || !Number.isInteger(state.cardCount) || state.cardCount <= 0) {
    throw new Error('state must contain a positive integer cardCount.');
  }

  return {
    cardCount: state.cardCount,
    hatCardIndices: Array.isArray(state.hatCardIndices) ? [...state.hatCardIndices] : [],
    displayedCardIndices: Array.isArray(state.displayedCardIndices) ? [...state.displayedCardIndices] : [],
    refillCount: Number.isInteger(state.refillCount) && state.refillCount >= 0 ? state.refillCount : 0
  };
}

function validateCardCount(cardCount) {
  if (!Number.isInteger(cardCount) || cardCount <= 0) {
    throw new Error('cardCount must be a positive integer.');
  }
}

function validateCardsToShow(cardCount, cardsToShow) {
  if (!Number.isInteger(cardsToShow) || cardsToShow <= 0 || cardsToShow > cardCount) {
    throw new Error('cardsToShow must be a positive integer up to cardCount.');
  }
}
