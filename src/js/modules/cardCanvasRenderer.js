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
    const image = images[i];
    const cell = cells[i];
    drawImageInCell(context, image, cell, cellSize);
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
      (source) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error(`Failed to load image: ${source}`));
          image.src = source;
        })
    )
  );
}

function drawImageInCell(context, image, cell, cellSize) {
  const padding = Math.max(2, Math.floor(cellSize * 0.08));
  const availableSize = cellSize - padding * 2;
  const scale = Math.min(availableSize / image.width, availableSize / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;

  const x = cell.column * cellSize + (cellSize - drawWidth) / 2;
  const y = cell.row * cellSize + (cellSize - drawHeight) / 2;

  context.drawImage(image, x, y, drawWidth, drawHeight);
}
