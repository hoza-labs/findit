import { clampImageMask, imageMaskToPixels } from './imageMasking.js';

export async function drawImagesOnSquareTarget(targetElement, imageSources) {
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

  const r = Math.ceil(Math.sqrt(q));
  const sideLength = getTargetSideLength(targetElement);
  const canvas = document.createElement('canvas');
  canvas.width = sideLength;
  canvas.height = sideLength;
  canvas.style.width = '100%';
  canvas.style.height = '100%';

  const context = canvas.getContext('2d');
  context.clearRect(0, 0, sideLength, sideLength);

  const cells = buildShuffledCells(r);
  const images = await loadImages(imageSources);
  const cellSize = sideLength / r;

  for (let i = 0; i < q; i += 1) {
    const imageEntry = images[i];
    const cell = cells[i];
    drawImageInCell(context, imageEntry, cell, cellSize);
  }

  targetElement.appendChild(canvas);
}

function getTargetSideLength(targetElement) {
  const rect = targetElement.getBoundingClientRect();
  const side = Math.floor(Math.min(rect.width || 400, rect.height || 400));
  return Math.max(24, side);
}

function buildShuffledCells(r) {
  const cells = [];
  for (let row = 0; row < r; row += 1) {
    for (let column = 0; column < r; column += 1) {
      cells.push({ row, column });
    }
  }

  for (let i = cells.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  return cells;
}

async function loadImages(imageSources) {
  return Promise.all(
    imageSources.map(
      (candidate) => {
        const source = normalizeImageSource(candidate);
        return new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve({ image, mask: source.mask });
          image.onerror = () => reject(new Error(`Failed to load image: ${source.src}`));
          image.src = source.src;
        });
      }
    )
  );
}

function drawImageInCell(context, imageEntry, cell, cellSize) {
  const { image, mask } = imageEntry;
  const padding = Math.max(2, Math.floor(cellSize * 0.08));
  const availableSize = cellSize - padding * 2;
  const scale = Math.min(availableSize / image.width, availableSize / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const x = cell.column * cellSize + (cellSize - drawWidth) / 2;
  const y = cell.row * cellSize + (cellSize - drawHeight) / 2;

  const clampedMask = clampImageMask(mask, image.width, image.height);
  const maskPixels = imageMaskToPixels(clampedMask, image.width, image.height);

  context.save();
  context.beginPath();
  context.arc(
    x + maskPixels.centerX * scale,
    y + maskPixels.centerY * scale,
    maskPixels.radius * scale,
    0,
    Math.PI * 2
  );
  context.clip();
  context.drawImage(image, x, y, drawWidth, drawHeight);
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
