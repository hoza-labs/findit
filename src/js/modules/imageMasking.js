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

function validateDimension(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}
