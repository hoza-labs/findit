import { createEmptyTempDeck } from './deckSession.js';
import { createImageRef } from './imageRefs.js';
import { getAllowedSymbolsPerCard } from './stepOnePreview.js';

export const DEFAULT_QUICK_DECK_SYMBOLS_PER_CARD = 6;
export const QUICK_DECK_STORAGE_KEY = 'findit.quickDeck.symbolsPerCard';

export function createQuickDeckLabel(symbolsPerCard) {
  return `Quick ${symbolsPerCard}-image deck...`;
}

export function getQuickDeckImageCount(symbolsPerCard) {
  return symbolsPerCard * (symbolsPerCard - 1) + 1;
}

export function getQuickDeckOptions(allowedSymbolsPerCard = getAllowedSymbolsPerCard()) {
  return allowedSymbolsPerCard.map((symbolsPerCard) => ({
    symbolsPerCard,
    label: createQuickDeckLabel(symbolsPerCard)
  }));
}

export function normalizeQuickDeckSymbolsPerCard(value, allowedSymbolsPerCard = getAllowedSymbolsPerCard()) {
  const fallback = allowedSymbolsPerCard.includes(DEFAULT_QUICK_DECK_SYMBOLS_PER_CARD)
    ? DEFAULT_QUICK_DECK_SYMBOLS_PER_CARD
    : allowedSymbolsPerCard[0];

  const parsed = Number.parseInt(String(value ?? ''), 10);
  return allowedSymbolsPerCard.includes(parsed) ? parsed : fallback;
}

export function getQuickDeckSymbolsPerCard(storage = globalThis.localStorage, allowedSymbolsPerCard = getAllowedSymbolsPerCard()) {
  const storedValue = storage?.getItem?.(QUICK_DECK_STORAGE_KEY);
  return normalizeQuickDeckSymbolsPerCard(storedValue, allowedSymbolsPerCard);
}

export function rememberQuickDeckSymbolsPerCard(
  storage = globalThis.localStorage,
  symbolsPerCard,
  allowedSymbolsPerCard = getAllowedSymbolsPerCard()
) {
  const normalized = normalizeQuickDeckSymbolsPerCard(symbolsPerCard, allowedSymbolsPerCard);
  storage?.setItem?.(QUICK_DECK_STORAGE_KEY, String(normalized));
  return normalized;
}

export function createQuickDeckTempDeck({
  symbolsPerCard = DEFAULT_QUICK_DECK_SYMBOLS_PER_CARD,
  userImageIds = [],
  webImageIds = [],
  standardImageIds = [],
  printOptions = undefined,
  random = Math.random
} = {}) {
  const normalizedSymbolsPerCard = normalizeQuickDeckSymbolsPerCard(symbolsPerCard);
  const requiredImageCount = getQuickDeckImageCount(normalizedSymbolsPerCard);

  const userSelections = pickRandomSubset(userImageIds, requiredImageCount, random)
    .map((imageId) => createImageRef('user', imageId));
  const webSelections = pickRandomSubset(webImageIds, Math.max(0, requiredImageCount - userSelections.length), random)
    .map((imageId) => createImageRef('web', imageId));
  const standardSelections = pickRandomSubset(
    standardImageIds,
    Math.max(0, requiredImageCount - userSelections.length - webSelections.length),
    random
  ).map((imageId) => createImageRef('standard', imageId));

  const selectedImageRefs = [...userSelections, ...webSelections, ...standardSelections];
  return {
    tempDeck: {
      ...createEmptyTempDeck({ printOptions }),
      symbolsPerCard: normalizedSymbolsPerCard,
      selectedImageRefs
    },
    requiredImageCount,
    selectedImageCount: selectedImageRefs.length,
    isComplete: selectedImageRefs.length >= requiredImageCount
  };
}

export function pickRandomSubset(items, maxCount, random = Math.random) {
  if (!Array.isArray(items)) {
    throw new Error('items must be an array.');
  }

  if (!Number.isInteger(maxCount) || maxCount < 0) {
    throw new Error('maxCount must be a non-negative integer.');
  }

  const count = Math.min(maxCount, items.length);
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled.slice(0, count);
}
