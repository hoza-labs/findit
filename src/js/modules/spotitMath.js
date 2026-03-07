const MIN_SYMBOLS = 3;

export function calculateDeckSize(symbolsPerCard) {
  validateSymbolsPerCard(symbolsPerCard);
  return symbolsPerCard ** 2 - symbolsPerCard + 1;
}

export function validateSymbolsPerCard(symbolsPerCard) {
  if (!Number.isInteger(symbolsPerCard) || symbolsPerCard < MIN_SYMBOLS) {
    throw new Error('symbolsPerCard must be an integer greater than or equal to 3.');
  }
}

export function generateDeck(symbolsPerCard) {
  validateSymbolsPerCard(symbolsPerCard);

  const order = symbolsPerCard - 1;
  const totalCards = calculateDeckSize(symbolsPerCard);
  const cards = [];

  const firstCard = [];
  for (let i = 0; i <= order; i += 1) {
    firstCard.push(i);
  }
  cards.push(firstCard);

  for (let j = 0; j < order; j += 1) {
    const card = [0];
    for (let k = 0; k < order; k += 1) {
      card.push(order + 1 + order * j + k);
    }
    cards.push(card);
  }

  for (let i = 0; i < order; i += 1) {
    for (let j = 0; j < order; j += 1) {
      const card = [i + 1];
      for (let k = 0; k < order; k += 1) {
        const value = order + 1 + order * k + ((i * k + j) % order);
        card.push(value);
      }
      cards.push(card);
    }
  }

  if (cards.length !== totalCards) {
    throw new Error('Deck generation failed to produce expected card count.');
  }

  return cards;
}

export function countSharedSymbols(cardA, cardB) {
  const set = new Set(cardA);
  let shared = 0;
  for (const symbol of cardB) {
    if (set.has(symbol)) {
      shared += 1;
    }
  }
  return shared;
}
