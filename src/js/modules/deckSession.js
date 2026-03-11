const DEFAULT_SYMBOLS_PER_CARD = 4;
const DEFAULT_PLAY_OPTIONS = Object.freeze({
  cardsToShowMin: '',
  cardsToShowMax: '',
  countdownSeconds: '',
  handsToPlay: '',
  playerNames: ''
});

export function createEmptyTempDeck() {
  return {
    deckName: '',
    symbolsPerCard: DEFAULT_SYMBOLS_PER_CARD,
    selectedImageRefs: [],
    playOptions: createDefaultPlayOptions(),
    dirty: false,
    updatedAt: new Date().toISOString()
  };
}

export function createTempDeckFromSavedDeck(deck) {
  return {
    deckName: deck.name,
    symbolsPerCard: deck.symbolsPerCard,
    selectedImageRefs: Array.isArray(deck.imageRefs) ? [...deck.imageRefs] : [],
    playOptions: normalizePlayOptions(deck.playOptions),
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
    playOptions: normalizePlayOptions(tempDeck.playOptions),
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

export function normalizePlayOptions(playOptions) {
  if (!playOptions || typeof playOptions !== 'object') {
    return createDefaultPlayOptions();
  }

  return {
    cardsToShowMin: normalizeOptionalPositiveInteger(playOptions.cardsToShowMin),
    cardsToShowMax: normalizeOptionalPositiveInteger(playOptions.cardsToShowMax),
    countdownSeconds: normalizeOptionalPositiveInteger(playOptions.countdownSeconds),
    handsToPlay: normalizeOptionalPositiveInteger(playOptions.handsToPlay),
    playerNames: normalizePlayerNames(playOptions.playerNames)
  };
}

function createDefaultPlayOptions() {
  return { ...DEFAULT_PLAY_OPTIONS };
}

function normalizeOptionalPositiveInteger(value) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return String(value);
  }

  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (!/^\d+$/.test(trimmed)) {
    return '';
  }

  const parsed = Number.parseInt(trimmed, 10);
  return parsed > 0 ? String(parsed) : '';
}

function normalizePlayerNames(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(', ');
  }

  if (typeof value !== 'string') {
    return '';
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .join(', ');
}
