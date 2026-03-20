import { createDefaultGenerationOptions, normalizeGenerationOptions } from './cardGenerationOptions.js';

const DEFAULT_SYMBOLS_PER_CARD = 4;
const DEFAULT_PLAY_OPTIONS = Object.freeze({
  cardsToShowCounts: '2',
  countdownSeconds: '',
  lengthOfPlay: '',
  lengthOfPlayUnits: 'hands',
  playerNames: 'one, two'
});

export function createEmptyTempDeck() {
  return {
    deckName: '',
    symbolsPerCard: DEFAULT_SYMBOLS_PER_CARD,
    selectedImageRefs: [],
    generationOptions: createDefaultGenerationOptions(),
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
    generationOptions: normalizeGenerationOptions(deck.generationOptions),
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
    generationOptions: normalizeGenerationOptions(tempDeck.generationOptions),
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
    cardsToShowCounts: normalizeCardCountList(
      playOptions.cardsToShowCounts
      ?? playOptions.cardsToDisplayAtOnce
      ?? createLegacyCardCountList(playOptions.cardsToShowMin, playOptions.cardsToShowMax)
    ),
    countdownSeconds: normalizeOptionalPositiveInteger(playOptions.countdownSeconds),
    lengthOfPlay: normalizeOptionalPositiveNumber(playOptions.lengthOfPlay ?? playOptions.handsToPlay),
    lengthOfPlayUnits: normalizeLengthOfPlayUnits(playOptions.lengthOfPlayUnits),
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

function normalizeCardCountList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeOptionalPositiveInteger(String(item)))
      .filter(Boolean)
      .join(', ');
  }

  if (typeof value !== 'string') {
    return '';
  }

  return value
    .split(',')
    .map((item) => normalizeOptionalPositiveInteger(item))
    .filter(Boolean)
    .join(', ');
}

function createLegacyCardCountList(minValue, maxValue) {
  const min = normalizeOptionalPositiveInteger(minValue);
  const max = normalizeOptionalPositiveInteger(maxValue);

  if (!min && !max) {
    return '';
  }

  const minNumber = min ? Number.parseInt(min, 10) : null;
  const maxNumber = max ? Number.parseInt(max, 10) : null;

  if (minNumber !== null && maxNumber !== null) {
    if (minNumber > maxNumber) {
      return '';
    }

    return Array.from({ length: maxNumber - minNumber + 1 }, (_, index) => String(minNumber + index)).join(', ');
  }

  return min || max || '';
}

function normalizeOptionalPositiveNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return normalizePositiveNumberString(String(value));
  }

  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
    return '';
  }

  return normalizePositiveNumberString(trimmed);
}

function normalizePositiveNumberString(value) {
  const numericValue = Number.parseFloat(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return '';
  }

  return String(numericValue);
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

function normalizeLengthOfPlayUnits(value) {
  return value === 'decks' || value === 'minutes' ? value : 'hands';
}
