import { clampImageMask, imageMaskToPixels } from './imageMasking.js';
import { normalizeGenerationOptions } from './cardGenerationOptions.js';
import { getCardLayout } from './cardLayout.js';

const MAX_CANVAS_RENDER_SCALE = 3;

export async function drawImagesOnSquareTarget(targetElement, imageSources, options = undefined) {
  if (!targetElement) {
    throw new Error('targetElement is required.');
  }
  if (!Array.isArray(imageSources)) {
    throw new Error('imageSources must be an array.');
  }

  const q = imageSources.length;
  targetElement.innerHTML = '';
  if (q === 0) {
    return;
  }

  const generationOptions = normalizeGenerationOptions(options);
  const normalizedSources = imageSources.map(normalizeImageSource);
  const sideLength = getTargetSideLength(targetElement);
  const renderScale = getCanvasRenderScale();
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sideLength * renderScale);
  canvas.height = Math.round(sideLength * renderScale);
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.borderRadius = generationOptions.cardShape === 'round' ? '50%' : '0';
  canvas.style.imageRendering = 'auto';

  const context = canvas.getContext('2d');
  configureCanvasRenderingContext(context, sideLength, renderScale);
  const renderPlan = planCardRender(normalizedSources, generationOptions);
  const images = await loadImages(normalizedSources);
  applyCardShape(targetElement, generationOptions.cardShape);
  applyCardTransform(targetElement, renderPlan.cardRotation, renderPlan.cardFlip);

  for (const plannedItem of renderPlan.items) {
    drawImageAtPlacement(
      context,
      images[plannedItem.sourceIndex],
      plannedItem.layoutItem,
      sideLength
    );
  }

  targetElement.appendChild(canvas);
}

export function planCardRender(imageSources, options = undefined, random = Math.random) {
  if (!Array.isArray(imageSources)) {
    throw new Error('imageSources must be an array.');
  }
  if (typeof random !== 'function') {
    throw new Error('random must be a function.');
  }

  const generationOptions = normalizeGenerationOptions(options);
  const layout = getCardLayout(imageSources.length, generationOptions);
  const sourceOrder = buildShuffledIndices(imageSources.length, random);

  return {
    cardRotation: getCardRotation(generationOptions, random),
    cardFlip: getRandomFlip(generationOptions, random),
    items: layout.items.map((layoutItem, index) => ({
      sourceIndex: sourceOrder[index],
      layoutItem: {
        ...layoutItem,
        rotation: generationOptions.imageRotation === 'random'
          ? random() * Math.PI * 2
          : 0,
        flipX: getRandomFlip(generationOptions, random)
      }
    }))
  };
}

export function planCardRenderItems(imageSources, options = undefined, random = Math.random) {
  return planCardRender(imageSources, options, random).items;
}

export function calculateMaskedImagePlacement({ imageWidth, imageHeight, mask, cellSize, targetRadius }) {
  if (!Number.isFinite(imageWidth) || imageWidth <= 0) {
    throw new Error('imageWidth must be a positive number.');
  }
  if (!Number.isFinite(imageHeight) || imageHeight <= 0) {
    throw new Error('imageHeight must be a positive number.');
  }
  if (
    (!Number.isFinite(cellSize) || cellSize <= 0)
    && (!Number.isFinite(targetRadius) || targetRadius <= 0)
  ) {
    throw new Error('cellSize or targetRadius must be a positive number.');
  }

  const hasExplicitRadius = Number.isFinite(targetRadius) && targetRadius > 0;
  const padding = hasExplicitRadius ? 0 : Math.max(2, Math.floor(cellSize * 0.08));
  const availableSize = hasExplicitRadius ? targetRadius * 2 : cellSize - padding * 2;
  const availableRadius = hasExplicitRadius ? targetRadius : availableSize / 2;
  const clampedMask = clampImageMask(mask, Math.round(imageWidth), Math.round(imageHeight));
  const maskPixels = imageMaskToPixels(clampedMask, Math.round(imageWidth), Math.round(imageHeight));
  const scale = availableRadius / maskPixels.radius;

  return {
    padding,
    availableSize,
    availableRadius,
    scale,
    drawWidth: imageWidth * scale,
    drawHeight: imageHeight * scale,
    offsetX: -maskPixels.centerX * scale,
    offsetY: -maskPixels.centerY * scale
  };
}

export function getCanvasRenderScale(devicePixelRatio = undefined) {
  const resolvedDevicePixelRatio = Number.isFinite(devicePixelRatio)
    ? devicePixelRatio
    : typeof window !== 'undefined' && Number.isFinite(window.devicePixelRatio)
      ? window.devicePixelRatio
      : 1;

  return Math.max(1, Math.min(MAX_CANVAS_RENDER_SCALE, resolvedDevicePixelRatio));
}

function getTargetSideLength(targetElement) {
  const rect = targetElement.getBoundingClientRect();
  const side = Math.floor(Math.min(rect.width || 400, rect.height || 400));
  return Math.max(24, side);
}

async function loadImages(imageSources) {
  return Promise.all(
    imageSources.map(
      (candidate) => {
        const source = normalizeImageSource(candidate);
        return new Promise((resolve, reject) => {
          const image = new Image();
          image.decoding = 'async';
          image.onload = () => resolve({ image, mask: source.mask });
          image.onerror = () => reject(new Error(`Failed to load image: ${source.src}`));
          image.src = source.src;
        });
      }
    )
  );
}

function configureCanvasRenderingContext(context, sideLength, renderScale) {
  context.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.clearRect(0, 0, sideLength, sideLength);
}

function buildShuffledIndices(length, random) {
  const indices = Array.from({ length }, (_, index) => index);
  for (let index = length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]];
  }
  return indices;
}

function getCardRotation(generationOptions, random) {
  if (generationOptions.imageRotation !== 'random') {
    return 0;
  }

  if (generationOptions.cardShape === 'square') {
    return Math.floor(random() * 4) * (Math.PI / 2);
  }

  return random() * Math.PI * 2;
}

function getRandomFlip(generationOptions, random) {
  if (generationOptions.imageRotation !== 'random') {
    return false;
  }

  return random() >= 0.5;
}

function drawImageAtPlacement(context, imageEntry, layoutItem, sideLength) {
  const centerX = layoutItem.centerX * sideLength;
  const centerY = layoutItem.centerY * sideLength;
  const radius = layoutItem.radius * sideLength;
  const imagePlacement = calculateMaskedImagePlacement({
    imageWidth: imageEntry.image.width,
    imageHeight: imageEntry.image.height,
    mask: imageEntry.mask,
    targetRadius: radius
  });

  context.save();
  context.translate(centerX, centerY);
  context.rotate(layoutItem.rotation);
  if (layoutItem.flipX) {
    context.scale(-1, 1);
  }
  context.beginPath();
  context.arc(0, 0, imagePlacement.availableRadius, 0, Math.PI * 2);
  context.clip();
  context.drawImage(
    imageEntry.image,
    imagePlacement.offsetX,
    imagePlacement.offsetY,
    imagePlacement.drawWidth,
    imagePlacement.drawHeight
  );
  context.restore();
}

function normalizeImageSource(candidate) {
  if (typeof candidate === 'string') {
    return { src: candidate, mask: undefined };
  }

  if (!candidate || typeof candidate.src !== 'string') {
    throw new Error('image source must be a string or an object with a src string.');
  }

  return candidate;
}

function applyCardShape(targetElement, cardShape) {
  targetElement.classList.remove('is-round-card', 'is-square-card');
  targetElement.classList.add(cardShape === 'round' ? 'is-round-card' : 'is-square-card');
}

function applyCardTransform(targetElement, rotation, flipX) {
  targetElement.style.transformOrigin = 'center';
  const transforms = [];
  if (rotation) {
    transforms.push(`rotate(${rotation}rad)`);
  }
  if (flipX) {
    transforms.push('scaleX(-1)');
  }
  targetElement.style.transform = transforms.join(' ');
}
