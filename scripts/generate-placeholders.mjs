// Regenerates the numbered placeholder image set used when a deck slot has no selected image yet.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from 'canvas';

const IMAGE_SIZE = 96;
const MAX_NUMBER = 133;
const ROTATION_RADIANS = Math.PI / 4;
const PURPLE = '#b100ff';
const MARGIN = 4;

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = resolve(scriptDir, '../src/assets/placeholder-images');

await mkdir(outputDir, { recursive: true });

for (let number = 1; number <= MAX_NUMBER; number += 1) {
  const text = String(number);
  const canvas = createCanvas(IMAGE_SIZE, IMAGE_SIZE);
  const context = canvas.getContext('2d');

  context.clearRect(0, 0, IMAGE_SIZE, IMAGE_SIZE);
  const fontSize = getLargestFittingFontSize(context, text);

  context.save();
  context.translate(IMAGE_SIZE / 2, IMAGE_SIZE / 2);
  context.rotate(ROTATION_RADIANS);
  context.font = `700 ${fontSize}px Arial, Helvetica, sans-serif`;
  context.fillStyle = PURPLE;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 0, 0);
  context.restore();

  const pngBuffer = canvas.toBuffer('image/png');
  await writeFile(resolve(outputDir, `${number}.png`), pngBuffer);
}

console.log(`Generated ${MAX_NUMBER} placeholder images in ${outputDir}`);

function getLargestFittingFontSize(context, text) {
  const drawableSize = IMAGE_SIZE - MARGIN * 2;
  const cosine = Math.cos(ROTATION_RADIANS);
  const sine = Math.sin(ROTATION_RADIANS);

  for (let size = 140; size >= 8; size -= 1) {
    context.font = `700 ${size}px Arial, Helvetica, sans-serif`;
    const metrics = context.measureText(text);
    const width = metrics.width;
    const height = Math.max(
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
      size
    );

    const rotatedWidth = Math.abs(width * cosine) + Math.abs(height * sine);
    const rotatedHeight = Math.abs(width * sine) + Math.abs(height * cosine);

    if (rotatedWidth <= drawableSize && rotatedHeight <= drawableSize) {
      return size;
    }
  }

  return 8;
}
