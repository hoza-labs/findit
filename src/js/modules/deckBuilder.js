import { calculateDeckSize, generateDeck } from './spotitMath.js';

export function buildDeckModel(symbolsPerCard) {
  const cards = generateDeck(symbolsPerCard);
  return {
    symbolsPerCard,
    deckSize: calculateDeckSize(symbolsPerCard),
    cards,
    generatedAt: new Date().toISOString()
  };
}
