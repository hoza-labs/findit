import { normalizeGenerationOptions } from './cardGenerationOptions.js';

const CARD_PADDING = 0.04;
const IMAGE_GAP = 0.012;

const layoutCache = new Map();
const normalRadiusCache = new Map();

export function getCardLayout(imageCount, options) {
  const normalizedOptions = normalizeGenerationOptions(options);
  const cacheKey = JSON.stringify({ imageCount, ...normalizedOptions });
  const cached = layoutCache.get(cacheKey);
  if (cached) {
    return cloneLayout(cached);
  }

  const layout = createCardLayout(imageCount, normalizedOptions);
  layoutCache.set(cacheKey, layout);
  return cloneLayout(layout);
}

export function createCardLayout(imageCount, options) {
  validateImageCount(imageCount);

  const normalizedOptions = normalizeGenerationOptions(options);
  const template = getTemplate(normalizedOptions.cardShape, imageCount);
  const normalRadius = getNormalImageRadius(imageCount, normalizedOptions.cardShape);
  const sizeFactors = getImageSizeFactors(imageCount, normalizedOptions.imageSize);
  const factorBySlot = assignFactorsToSlots(template, sizeFactors, normalizedOptions.cardShape);

  return {
    cardShape: normalizedOptions.cardShape,
    normalRadius,
    items: template.map((point, index) => ({
      centerX: point.x,
      centerY: point.y,
      radius: factorBySlot[index] * normalRadius
    }))
  };
}

export function getImageSizeFactors(imageCount, imageSizeMode) {
  validateImageCount(imageCount);

  if (imageSizeMode !== 'various') {
    return Array.from({ length: imageCount }, () => 1);
  }

  if (imageCount === 1) {
    return [1];
  }

  const sortedFactors = Array.from(
    { length: imageCount },
    (_, index) => 0.5 + (index / (imageCount - 1))
  );
  const permutation = getDeterministicPermutation(imageCount, `size:${imageCount}`);
  const factors = new Array(imageCount);

  for (let index = 0; index < imageCount; index += 1) {
    factors[permutation[index]] = sortedFactors[index];
  }

  return factors;
}

function getNormalImageRadius(imageCount, cardShape) {
  const cacheKey = `${cardShape}:${imageCount}`;
  const cached = normalRadiusCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const template = getTemplate(cardShape, imageCount);
  const factors = getImageSizeFactors(imageCount, 'various');
  const factorBySlot = assignFactorsToSlots(template, factors, cardShape);
  let normalRadius = Number.POSITIVE_INFINITY;

  for (let index = 0; index < template.length; index += 1) {
    normalRadius = Math.min(
      normalRadius,
      getBoundaryLimit(template[index], cardShape) / factorBySlot[index]
    );
  }

  for (let leftIndex = 0; leftIndex < template.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < template.length; rightIndex += 1) {
      const distance = getDistanceBetween(template[leftIndex], template[rightIndex]) - IMAGE_GAP;
      normalRadius = Math.min(
        normalRadius,
        distance / (factorBySlot[leftIndex] + factorBySlot[rightIndex])
      );
    }
  }

  const settledRadius = Math.max(0.001, normalRadius * 0.995);
  normalRadiusCache.set(cacheKey, settledRadius);
  return settledRadius;
}

function assignFactorsToSlots(template, factors, cardShape) {
  const sortedFactorIndices = factors
    .map((factor, index) => ({ factor, index }))
    .sort((left, right) => right.factor - left.factor || left.index - right.index);
  const slotOrder = getSlotPriority(template, cardShape);
  const factorBySlot = new Array(template.length);

  for (let index = 0; index < slotOrder.length; index += 1) {
    const slotIndex = slotOrder[index];
    factorBySlot[slotIndex] = sortedFactorIndices[index].factor;
  }

  return factorBySlot;
}

function getSlotPriority(template, cardShape) {
  const priorities = template.map((point, index) => {
    let minimumPairDistance = Number.POSITIVE_INFINITY;
    for (let otherIndex = 0; otherIndex < template.length; otherIndex += 1) {
      if (index === otherIndex) {
        continue;
      }
      minimumPairDistance = Math.min(minimumPairDistance, getDistanceBetween(point, template[otherIndex]));
    }

    const boundaryLimit = getBoundaryLimit(point, cardShape);
    const safety = Math.min(boundaryLimit, minimumPairDistance / 2);
    return {
      index,
      safety,
      distanceToCenter: getDistanceBetween(point, { x: 0.5, y: 0.5 })
    };
  });

  priorities.sort((left, right) => {
    if (left.safety !== right.safety) {
      return right.safety - left.safety;
    }
    if (left.distanceToCenter !== right.distanceToCenter) {
      return left.distanceToCenter - right.distanceToCenter;
    }
    return left.index - right.index;
  });

  return priorities.map((entry) => entry.index);
}

function getTemplate(cardShape, imageCount) {
  const template = cardShape === 'round'
    ? ROUND_TEMPLATES[imageCount]
    : SQUARE_TEMPLATES[imageCount];

  return template ? template.map((point) => ({ ...point })) : buildGenericTemplate(cardShape, imageCount);
}

function buildGenericTemplate(cardShape, imageCount) {
  if (imageCount === 1) {
    return [{ x: 0.5, y: 0.5 }];
  }

  const points = [{ x: 0.5, y: 0.5 }];
  const ringRadius = cardShape === 'round' ? 0.3 : 0.28;
  for (let index = 1; index < imageCount; index += 1) {
    const angle = (-Math.PI / 2) + (((index - 1) / (imageCount - 1)) * Math.PI * 2);
    points.push({
      x: 0.5 + Math.cos(angle) * ringRadius,
      y: 0.5 + Math.sin(angle) * ringRadius
    });
  }
  return points;
}

function getDeterministicPermutation(length, seedPrefix) {
  const entries = Array.from({ length }, (_, index) => ({
    index,
    rank: getSeededUnitValue(`${seedPrefix}:${index}`)
  }));
  entries.sort((left, right) => left.rank - right.rank || left.index - right.index);
  return entries.map((entry) => entry.index);
}

function getSeededUnitValue(seed) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

function getBoundaryLimit(point, cardShape) {
  if (cardShape === 'round') {
    return (0.5 - CARD_PADDING) - getDistanceBetween(point, { x: 0.5, y: 0.5 });
  }

  return Math.min(
    point.x - CARD_PADDING,
    1 - CARD_PADDING - point.x,
    point.y - CARD_PADDING,
    1 - CARD_PADDING - point.y
  );
}

function getDistanceBetween(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function validateImageCount(imageCount) {
  if (!Number.isInteger(imageCount) || imageCount <= 0) {
    throw new Error('imageCount must be a positive integer.');
  }
}

function cloneLayout(layout) {
  return {
    cardShape: layout.cardShape,
    normalRadius: layout.normalRadius,
    items: layout.items.map((item) => ({ ...item }))
  };
}

const ROUND_TEMPLATES = Object.freeze({
  1: [{ x: 0.5, y: 0.5 }],
  2: [
    { x: 0.32, y: 0.5 },
    { x: 0.68, y: 0.5 }
  ],
  3: [
    { x: 0.5, y: 0.24 },
    { x: 0.73, y: 0.64 },
    { x: 0.27, y: 0.64 }
  ],
  4: [
    { x: 0.68, y: 0.32 },
    { x: 0.68, y: 0.68 },
    { x: 0.32, y: 0.68 },
    { x: 0.32, y: 0.32 }
  ],
  6: [
    { x: 0.5, y: 0.5 },
    { x: 0.5, y: 0.22 },
    { x: 0.77, y: 0.42 },
    { x: 0.67, y: 0.74 },
    { x: 0.33, y: 0.74 },
    { x: 0.23, y: 0.42 }
  ],
  8: [
    { x: 0.5, y: 0.5 },
    { x: 0.5, y: 0.19 },
    { x: 0.74, y: 0.31 },
    { x: 0.8, y: 0.57 },
    { x: 0.64, y: 0.79 },
    { x: 0.36, y: 0.79 },
    { x: 0.2, y: 0.57 },
    { x: 0.26, y: 0.31 }
  ],
  12: [
    { x: 0.5, y: 0.32 },
    { x: 0.68, y: 0.5 },
    { x: 0.5, y: 0.68 },
    { x: 0.32, y: 0.5 },
    { x: 0.5, y: 0.12 },
    { x: 0.77, y: 0.23 },
    { x: 0.88, y: 0.5 },
    { x: 0.77, y: 0.77 },
    { x: 0.5, y: 0.88 },
    { x: 0.23, y: 0.77 },
    { x: 0.12, y: 0.5 },
    { x: 0.23, y: 0.23 }
  ]
});

const SQUARE_TEMPLATES = Object.freeze({
  1: [{ x: 0.5, y: 0.5 }],
  2: [
    { x: 0.32, y: 0.5 },
    { x: 0.68, y: 0.5 }
  ],
  3: [
    { x: 0.5, y: 0.24 },
    { x: 0.26, y: 0.7 },
    { x: 0.74, y: 0.7 }
  ],
  4: [
    { x: 0.3, y: 0.3 },
    { x: 0.7, y: 0.3 },
    { x: 0.3, y: 0.7 },
    { x: 0.7, y: 0.7 }
  ],
  6: [
    { x: 0.2, y: 0.32 },
    { x: 0.5, y: 0.32 },
    { x: 0.8, y: 0.32 },
    { x: 0.2, y: 0.68 },
    { x: 0.5, y: 0.68 },
    { x: 0.8, y: 0.68 }
  ],
  8: [
    { x: 0.2, y: 0.2 },
    { x: 0.5, y: 0.2 },
    { x: 0.8, y: 0.2 },
    { x: 0.28, y: 0.5 },
    { x: 0.72, y: 0.5 },
    { x: 0.2, y: 0.8 },
    { x: 0.5, y: 0.8 },
    { x: 0.8, y: 0.8 }
  ],
  12: [
    { x: 0.14, y: 0.2 },
    { x: 0.38, y: 0.2 },
    { x: 0.62, y: 0.2 },
    { x: 0.86, y: 0.2 },
    { x: 0.14, y: 0.5 },
    { x: 0.38, y: 0.5 },
    { x: 0.62, y: 0.5 },
    { x: 0.86, y: 0.5 },
    { x: 0.14, y: 0.8 },
    { x: 0.38, y: 0.8 },
    { x: 0.62, y: 0.8 },
    { x: 0.86, y: 0.8 }
  ]
});
