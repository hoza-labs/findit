export const CARD_SHAPES = Object.freeze(['round', 'square']);
export const IMAGE_ROTATION_MODES = Object.freeze(['random', 'none']);
export const IMAGE_SIZE_MODES = Object.freeze(['various', 'uniform']);
export const SOURCE_SAMPLING_BIAS_MODES = Object.freeze(['balanced', 'prefer-larger-source-sampling']);

const DEFAULT_GENERATION_OPTIONS = Object.freeze({
  cardShape: 'round',
  imageRotation: 'random',
  imageSize: 'various',
  sourceSamplingBias: 'balanced'
});

export const NEUTRAL_PREVIEW_GENERATION_OPTIONS = Object.freeze({
  cardShape: 'square',
  imageRotation: 'none',
  imageSize: 'uniform',
  sourceSamplingBias: 'balanced'
});

export function createDefaultGenerationOptions() {
  return { ...DEFAULT_GENERATION_OPTIONS };
}

export function normalizeGenerationOptions(options) {
  if (!options || typeof options !== 'object') {
    return createDefaultGenerationOptions();
  }

  return {
    cardShape: normalizeEnumValue(options.cardShape, CARD_SHAPES, DEFAULT_GENERATION_OPTIONS.cardShape),
    imageRotation: normalizeEnumValue(options.imageRotation, IMAGE_ROTATION_MODES, DEFAULT_GENERATION_OPTIONS.imageRotation),
    imageSize: normalizeEnumValue(options.imageSize, IMAGE_SIZE_MODES, DEFAULT_GENERATION_OPTIONS.imageSize),
    sourceSamplingBias: normalizeEnumValue(
      options.sourceSamplingBias,
      SOURCE_SAMPLING_BIAS_MODES,
      DEFAULT_GENERATION_OPTIONS.sourceSamplingBias
    )
  };
}

function normalizeEnumValue(value, allowedValues, fallback) {
  return allowedValues.includes(value) ? value : fallback;
}
