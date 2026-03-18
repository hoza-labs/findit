export const DEFAULT_IMAGE_MASK = Object.freeze({
  centerX: 0.5,
  centerY: 0.5,
  radius: 0.5
});

export function getCircularMaskRadius(width, height) {
  validateDimension(width, 'width');
  validateDimension(height, 'height');
  return Math.max(width, height) / 2;
}

export function getMaxOpaquePixelDistance({ width, height, data, alphaThreshold = 1 }) {
  validateDimension(width, 'width');
  validateDimension(height, 'height');
  if (!(data instanceof Uint8ClampedArray)) {
    throw new Error('data must be a Uint8ClampedArray.');
  }
  if (data.length !== width * height * 4) {
    throw new Error('data length must equal width * height * 4.');
  }

  const centerX = width / 2;
  const centerY = height / 2;
  let maxDistance = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha < alphaThreshold) {
        continue;
      }

      const distance = Math.hypot((x + 0.5) - centerX, (y + 0.5) - centerY);
      if (distance > maxDistance) {
        maxDistance = distance;
      }
    }
  }

  return maxDistance;
}

export function getRequiredTransparentMargin({ width, height, maxOpaqueDistance }) {
  validateDimension(width, 'width');
  validateDimension(height, 'height');
  if (!Number.isFinite(maxOpaqueDistance) || maxOpaqueDistance < 0) {
    throw new Error('maxOpaqueDistance must be a non-negative finite number.');
  }

  return Math.ceil(Math.max(0, maxOpaqueDistance - getCircularMaskRadius(width, height)));
}

export function normalizeImageMask(mask) {
  return {
    centerX: normalizeUnitValue(mask?.centerX, DEFAULT_IMAGE_MASK.centerX),
    centerY: normalizeUnitValue(mask?.centerY, DEFAULT_IMAGE_MASK.centerY),
    radius: normalizePositiveValue(mask?.radius, DEFAULT_IMAGE_MASK.radius)
  };
}

export function getImageMaskMetrics(width, height, options = {}) {
  validateDimension(width, 'width');
  validateDimension(height, 'height');

  const maxDimension = Math.max(width, height);
  const maxRadius = Math.hypot(width, height) / 2;
  const requestedMinRadius = Number.isFinite(options.minRadius) ? options.minRadius : 0;
  return {
    width,
    height,
    imageCenterX: width / 2,
    imageCenterY: height / 2,
    maxDimension,
    minRadius: Math.min(maxRadius, Math.max(0, requestedMinRadius)),
    maxRadius
  };
}

export function imageMaskToPixels(mask, width, height) {
  const normalizedMask = normalizeImageMask(mask);
  const metrics = getImageMaskMetrics(width, height);
  return {
    centerX: normalizedMask.centerX * metrics.width,
    centerY: normalizedMask.centerY * metrics.height,
    radius: normalizedMask.radius * metrics.maxDimension
  };
}

export function imageMaskFromPixels(maskPixels, width, height) {
  const metrics = getImageMaskMetrics(width, height);
  return normalizeImageMask({
    centerX: maskPixels.centerX / metrics.width,
    centerY: maskPixels.centerY / metrics.height,
    radius: maskPixels.radius / metrics.maxDimension
  });
}

export function clampImageMask(mask, width, height, options = {}) {
  const metrics = getImageMaskMetrics(width, height, options);
  const maskPixels = imageMaskToPixels(mask, width, height);
  const clampedRadius = clamp(maskPixels.radius, metrics.minRadius, metrics.maxRadius);
  const allowedOffset = Math.max(0, metrics.maxRadius - clampedRadius);
  const clampedCenter = clampCenterToOffset({
    centerX: clamp(maskPixels.centerX, 0, metrics.width),
    centerY: clamp(maskPixels.centerY, 0, metrics.height),
    imageCenterX: metrics.imageCenterX,
    imageCenterY: metrics.imageCenterY,
    maxOffset: allowedOffset
  });

  return imageMaskFromPixels({
    centerX: clampedCenter.centerX,
    centerY: clampedCenter.centerY,
    radius: clampedRadius
  }, width, height);
}

export function getDefaultImageMask() {
  return normalizeImageMask(DEFAULT_IMAGE_MASK);
}

function clampCenterToOffset({ centerX, centerY, imageCenterX, imageCenterY, maxOffset }) {
  const deltaX = centerX - imageCenterX;
  const deltaY = centerY - imageCenterY;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance <= maxOffset || distance === 0) {
    return { centerX, centerY };
  }

  const scale = maxOffset / distance;
  return {
    centerX: imageCenterX + deltaX * scale,
    centerY: imageCenterY + deltaY * scale
  };
}

function normalizeUnitValue(value, fallback) {
  return Number.isFinite(value) ? clamp(value, 0, 1) : fallback;
}

function normalizePositiveValue(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function validateDimension(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}
