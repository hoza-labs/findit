const DEFAULT_SYMBOLS_PER_CARD = 4;

export function createEmptyTempDeck() {
  return {
    deckName: '',
    symbolsPerCard: DEFAULT_SYMBOLS_PER_CARD,
    selectedImageRefs: [],
    dirty: false,
    updatedAt: new Date().toISOString()
  };
}

export function createTempDeckFromSavedDeck(deck) {
  return {
    deckName: deck.name,
    symbolsPerCard: deck.symbolsPerCard,
    selectedImageRefs: Array.isArray(deck.imageRefs) ? [...deck.imageRefs] : [],
    dirty: false,
    updatedAt: new Date().toISOString()
  };
}

export function normalizeTempDeck(tempDeck) {
  if (!tempDeck) {
    return createEmptyTempDeck();
  }

  return {
    deckName: tempDeck.deckName ?? '',
    symbolsPerCard: Number.isInteger(tempDeck.symbolsPerCard) ? tempDeck.symbolsPerCard : DEFAULT_SYMBOLS_PER_CARD,
    selectedImageRefs: Array.isArray(tempDeck.selectedImageRefs) ? [...tempDeck.selectedImageRefs] : [],
    dirty: Boolean(tempDeck.dirty),
    updatedAt: tempDeck.updatedAt ?? new Date().toISOString()
  };
}

export function markDirty(tempDeck) {
  return {
    ...tempDeck,
    dirty: true,
    updatedAt: new Date().toISOString()
  };
}

export function markSaved(tempDeck) {
  return {
    ...tempDeck,
    dirty: false,
    updatedAt: new Date().toISOString()
  };
}
