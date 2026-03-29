import { clampImageMask, imageMaskToPixels } from './imageMasking.js';
import { normalizeGenerationOptions } from './cardGenerationOptions.js';
import { getCardLayout } from './cardLayout.js';

const BALANCED_MAX_CANVAS_RENDER_SCALE = 3;
const LARGER_SOURCE_SAMPLING_MAX_CANVAS_RENDER_SCALE = 4;
const LARGER_SOURCE_SAMPLING_SCALE_MULTIPLIER = 1.5;
const DASH_PATTERNS = Object.freeze({
  solid: [],
  dashed: [10, 6],
  dotted: [2, 5]
});

export async function drawImagesOnSquareTarget(targetElement, imageSources, options = undefined, renderConfig = undefined) {
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
  const resolvedRenderConfig = normalizeRenderConfig(renderConfig);
  const sideLength = getTargetSideLength(targetElement, resolvedRenderConfig.sideLength);
  const renderScale = Number.isFinite(resolvedRenderConfig.renderScale) && resolvedRenderConfig.renderScale > 0
    ? resolvedRenderConfig.renderScale
    : getCanvasRenderScale(generationOptions.sourceSamplingBias);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sideLength * renderScale);
  canvas.height = Math.round(sideLength * renderScale);
  canvas.style.width = resolvedRenderConfig.cssSize ? `${resolvedRenderConfig.cssSize}px` : '100%';
  canvas.style.height = resolvedRenderConfig.cssSize ? `${resolvedRenderConfig.cssSize}px` : '100%';
  canvas.style.display = 'block';
  canvas.style.borderRadius = generationOptions.cardShape === 'round' ? '50%' : '0';
  canvas.style.imageRendering = 'auto';

  const context = canvas.getContext('2d');
  configureCanvasRenderingContext(context, sideLength, renderScale);
  const renderPlan = planCardRender(normalizedSources, generationOptions);
  const images = await loadImages(normalizedSources);
  applyCardShape(targetElement, generationOptions.cardShape);
  applyCardContainerStyles(targetElement);
  applyCardTransform(canvas, renderPlan.cardRotation, renderPlan.cardFlip);

  for (const plannedItem of renderPlan.items) {
    drawImageAtPlacement(
      context,
      images[plannedItem.sourceIndex],
      plannedItem.layoutItem,
      sideLength
    );
  }

  if (resolvedRenderConfig.showCardOutline) {
    drawCardOutline(context, sideLength, generationOptions.cardShape, resolvedRenderConfig.markupColor, resolvedRenderConfig.cardOutlineDashStyle);
  }

  targetElement.appendChild(canvas);

  if (resolvedRenderConfig.cardNumberText) {
    targetElement.appendChild(createCardNumberOverlay(sideLength, resolvedRenderConfig.cardNumberText, resolvedRenderConfig.markupColor));
  }
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

export function getCanvasRenderScale(sourceSamplingBias = 'balanced', devicePixelRatio = undefined) {
  const resolvedDevicePixelRatio = Number.isFinite(devicePixelRatio)
    ? devicePixelRatio
    : typeof window !== 'undefined' && Number.isFinite(window.devicePixelRatio)
      ? window.devicePixelRatio
      : 1;

  if (sourceSamplingBias === 'prefer-larger-source-sampling') {
    return Math.max(
      1,
      Math.min(
        LARGER_SOURCE_SAMPLING_MAX_CANVAS_RENDER_SCALE,
        resolvedDevicePixelRatio * LARGER_SOURCE_SAMPLING_SCALE_MULTIPLIER
      )
    );
  }

  return Math.max(1, Math.min(BALANCED_MAX_CANVAS_RENDER_SCALE, resolvedDevicePixelRatio));
}

function getTargetSideLength(targetElement, preferredSideLength = null) {
  if (Number.isFinite(preferredSideLength) && preferredSideLength > 0) {
    return preferredSideLength;
  }

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

function drawCardOutline(context, sideLength, cardShape, color, dashStyle) {
  const inset = Math.max(2, sideLength * 0.01);
  const size = sideLength - inset * 2;
  context.save();
  context.strokeStyle = color;
  context.lineWidth = Math.max(1.25, sideLength * 0.01);
  context.setLineDash((DASH_PATTERNS[dashStyle] ?? []).map((value) => value * Math.max(1, sideLength / 200)));
  if (cardShape === 'round') {
    context.beginPath();
    context.arc(sideLength / 2, sideLength / 2, size / 2, 0, Math.PI * 2);
    context.stroke();
  } else {
    context.strokeRect(inset, inset, size, size);
  }
  context.restore();
}

function createCardNumberOverlay(sideLength, cardNumberText, color) {
  const overlay = document.createElement('span');
  overlay.className = 'card-number-overlay';
  overlay.textContent = cardNumberText;
  overlay.style.position = 'absolute';
  overlay.style.left = '0';
  overlay.style.bottom = '0';
  overlay.style.margin = '0';
  overlay.style.padding = '0';
  overlay.style.lineHeight = '1';
  overlay.style.pointerEvents = 'none';
  overlay.style.color = color;
  overlay.style.fontFamily = 'Georgia, serif';
  overlay.style.fontWeight = '600';
  overlay.style.fontSize = `${Math.max(12, Math.round(sideLength * 0.07))}px`;
  overlay.style.zIndex = '2';
  overlay.style.transform = 'none';
  return overlay;
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

function applyCardContainerStyles(targetElement) {
  targetElement.style.position = 'relative';
  targetElement.style.overflow = 'visible';
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

function normalizeRenderConfig(renderConfig) {
  const config = renderConfig && typeof renderConfig === 'object' ? renderConfig : {};
  return {
    sideLength: Number.isFinite(config.sideLength) && config.sideLength > 0 ? config.sideLength : null,
    cssSize: Number.isFinite(config.cssSize) && config.cssSize > 0 ? config.cssSize : null,
    renderScale: Number.isFinite(config.renderScale) && config.renderScale > 0 ? config.renderScale : null,
    cardNumberText: typeof config.cardNumberText === 'string' && config.cardNumberText.trim() ? config.cardNumberText.trim() : '',
    showCardOutline: Boolean(config.showCardOutline),
    markupColor: typeof config.markupColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(config.markupColor)
      ? config.markupColor.toLowerCase()
      : '#000000',
    cardOutlineDashStyle: ['solid', 'dashed', 'dotted'].includes(config.cardOutlineDashStyle)
      ? config.cardOutlineDashStyle
      : 'solid'
  };
}
