const MAX_UINT32 = 0xFFFFFFFF;
const UINT32_MODULUS = 0x100000000;

export function createRandomPattern(random = Math.random) {
  if (typeof random !== 'function') {
    throw new Error('random must be a function.');
  }

  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    return Math.floor(Math.random() * UINT32_MODULUS) >>> 0;
  }

  return Math.floor(value * UINT32_MODULUS) >>> 0;
}

export function normalizePattern(value, fallback = null) {
  const parsed = parsePatternNumber(value);
  if (parsed !== null) {
    return parsed;
  }

  return fallback === null ? null : normalizePattern(fallback, null);
}

export function formatPatternBase36(pattern) {
  const normalized = normalizePattern(pattern);
  if (normalized === null) {
    throw new Error('pattern must be a valid uint32.');
  }

  return normalized.toString(36);
}

export function parsePatternBase36(text) {
  if (typeof text !== 'string') {
    return null;
  }

  const normalizedText = text.trim().toLowerCase();
  if (!normalizedText || !/^[0-9a-z]+$/u.test(normalizedText)) {
    return null;
  }

  const parsed = Number.parseInt(normalizedText, 36);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX_UINT32
    ? parsed >>> 0
    : null;
}

export function deriveRenderSeed(pattern, seedIndex) {
  const normalizedPattern = normalizePattern(pattern);
  if (normalizedPattern === null) {
    throw new Error('pattern must be a valid uint32.');
  }

  const normalizedSeedIndex = normalizeSeedIndex(seedIndex);
  let mixed = (normalizedPattern + Math.imul(normalizedSeedIndex + 1, 0x9E3779B1)) >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x21F0AAAD);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x735A2D97);
  mixed ^= mixed >>> 15;
  return mixed >>> 0;
}

export function createSeededRandom(seed) {
  let state = normalizePattern(seed);
  if (state === null) {
    throw new Error('seed must be a valid uint32.');
  }

  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_MODULUS;
  };
}

function parsePatternNumber(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 && value <= MAX_UINT32
      ? value >>> 0
      : null;
  }

  if (typeof value === 'string' && /^\d+$/u.test(value.trim())) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX_UINT32
      ? parsed >>> 0
      : null;
  }

  return null;
}

function normalizeSeedIndex(seedIndex) {
  if (!Number.isInteger(seedIndex) || seedIndex < 0 || seedIndex > MAX_UINT32) {
    throw new Error('seedIndex must be a non-negative integer.');
  }

  return seedIndex >>> 0;
}
