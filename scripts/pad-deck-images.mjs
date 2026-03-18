import { access, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createCanvas, loadImage } from 'canvas';

import {
  getMaxOpaquePixelDistance,
  getRequiredTransparentMargin
} from '../src/js/modules/imageMasking.js';

const rootDir = resolve(import.meta.dirname, '..');
const deckImagesDir = resolve(rootDir, 'src/assets/deck-images');
const manifestPath = resolve(deckImagesDir, 'manifest.json');
const aliasesModulePath = resolve(rootDir, 'src/js/modules/standardImageAliases.js');

const manifestEntries = JSON.parse((await readFile(manifestPath, 'utf8')).replace(/^\uFEFF/, ''));
const existingAliases = await loadExistingAliases();
const nextAliases = { ...existingAliases };
const nextManifestEntries = [];
const adjustedEntries = [];
const skippedEntries = [];

for (const entry of manifestEntries) {
  const resolvedEntry = nextAliases[entry] ?? entry;
  const sourcePath = resolve(deckImagesDir, resolvedEntry);

  try {
    const image = await loadImage(sourcePath);
    const imageData = getImageData(image);
    const maxOpaqueDistance = getMaxOpaquePixelDistance(imageData);
    const padding = getRequiredTransparentMargin({
      width: image.width,
      height: image.height,
      maxOpaqueDistance
    });

    if (padding === 0) {
      nextManifestEntries.push(resolvedEntry);
      continue;
    }

    const nextFileName = extname(resolvedEntry).toLowerCase() === '.png'
      ? resolvedEntry
      : `${basename(resolvedEntry, extname(resolvedEntry))}.png`;
    const targetPath = resolve(deckImagesDir, nextFileName);
    const paddedCanvas = createCanvas(image.width + padding * 2, image.height + padding * 2);
    const paddedContext = paddedCanvas.getContext('2d');
    paddedContext.clearRect(0, 0, paddedCanvas.width, paddedCanvas.height);
    paddedContext.drawImage(image, padding, padding);

    await writeFile(targetPath, paddedCanvas.toBuffer('image/png'));
    if (nextFileName !== resolvedEntry) {
      await rm(sourcePath, { force: true });
    }

    if (entry !== nextFileName) {
      nextAliases[entry] = nextFileName;
    }

    nextManifestEntries.push(nextFileName);
    adjustedEntries.push({ input: entry, output: nextFileName, padding });
  } catch (error) {
    skippedEntries.push({ entry, reason: error.message });
    nextManifestEntries.push(resolvedEntry);
  }
}

await writeFile(manifestPath, `${JSON.stringify(dedupe(nextManifestEntries), null, 2)}\n`);
await writeAliasesModule(nextAliases);

console.log(`Adjusted ${adjustedEntries.length} deck image(s).`);
for (const item of adjustedEntries) {
  console.log(`  ${item.input} -> ${item.output} (padding ${item.padding}px)`);
}

if (skippedEntries.length > 0) {
  console.log(`Skipped ${skippedEntries.length} image(s):`);
  for (const item of skippedEntries) {
    console.log(`  ${item.entry}: ${item.reason}`);
  }
}

function getImageData(image) {
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, image.width, image.height);
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, image.width, image.height);
}

async function loadExistingAliases() {
  try {
    await access(aliasesModulePath);
    const moduleUrl = `${pathToFileURL(aliasesModulePath).href}?t=${Date.now()}`;
    const module = await import(moduleUrl);
    return module.STANDARD_IMAGE_ALIASES ?? {};
  } catch {
    return {};
  }
}

async function writeAliasesModule(aliases) {
  const sortedEntries = Object.entries(aliases)
    .sort(([left], [right]) => left.localeCompare(right));
  const body = sortedEntries.length === 0
    ? 'export const STANDARD_IMAGE_ALIASES = Object.freeze({});\n'
    : [
      'export const STANDARD_IMAGE_ALIASES = Object.freeze({',
      ...sortedEntries.map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`),
      '});',
      ''
    ].join('\n');

  await writeFile(aliasesModulePath, body);
}

function dedupe(entries) {
  return [...new Set(entries)];
}
