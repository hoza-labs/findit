import { drawImagesOnSquareTarget } from '../modules/cardCanvasRenderer.js';
import { markDirty } from '../modules/deckSession.js';
import { loadTempDeckOrDefault, renderDeckHeaderAndTitle, renderDeckStatusLine, saveTempDeck } from '../modules/deckFlowCommon.js';
import { getAllowedSymbolsPerCard } from '../modules/stepOnePreview.js';

const symbolsSelect = document.querySelector('#symbols-select');
const cardShapeSelect = document.querySelector('#card-shape-select');
const imageRotationSelect = document.querySelector('#image-rotation-select');
const imageSizeSelect = document.querySelector('#image-size-select');
const sourceSamplingBiasSelect = document.querySelector('#source-sampling-bias-select');
const sampleCardTarget = document.querySelector('#sample-card-target');
const deckStatusLine = document.querySelector('#deck-status-line');
const pageHeading = document.querySelector('header h1');

let tempDeck = await loadTempDeckOrDefault();
let resizeTimeout = null;

symbolsSelect.value = String(tempDeck.symbolsPerCard);
cardShapeSelect.value = tempDeck.generationOptions.cardShape;
imageRotationSelect.value = tempDeck.generationOptions.imageRotation;
imageSizeSelect.value = tempDeck.generationOptions.imageSize;
sourceSamplingBiasSelect.value = tempDeck.generationOptions.sourceSamplingBias;
renderDeckStatusLine(deckStatusLine, tempDeck);
renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'Basic Info', tempDeck });
await renderSampleCard();

symbolsSelect.addEventListener('change', async () => {
  const nextValue = Number.parseInt(symbolsSelect.value, 10);
  if (!getAllowedSymbolsPerCard().includes(nextValue)) {
    return;
  }

  tempDeck = markDirty({ ...tempDeck, symbolsPerCard: nextValue });
  await saveTempDeck(tempDeck);
  renderDeckStatusLine(deckStatusLine, tempDeck);
  renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'Basic Info', tempDeck });
  await renderSampleCard();
});

cardShapeSelect.addEventListener('change', () => {
  void updateGenerationOptions({ cardShape: cardShapeSelect.value });
});

imageRotationSelect.addEventListener('change', () => {
  void updateGenerationOptions({ imageRotation: imageRotationSelect.value });
});

imageSizeSelect.addEventListener('change', () => {
  void updateGenerationOptions({ imageSize: imageSizeSelect.value });
});

sourceSamplingBiasSelect.addEventListener('change', () => {
  void updateGenerationOptions({ sourceSamplingBias: sourceSamplingBiasSelect.value });
});

window.addEventListener('resize', () => {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }

  resizeTimeout = setTimeout(() => {
    void renderSampleCard();
  }, 100);
});

async function updateGenerationOptions(nextOptions) {
  tempDeck = markDirty({
    ...tempDeck,
    generationOptions: {
      ...tempDeck.generationOptions,
      ...nextOptions
    }
  });
  await saveTempDeck(tempDeck);
  renderDeckStatusLine(deckStatusLine, tempDeck);
  renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'Basic Info', tempDeck });
  await renderSampleCard();
}

async function renderSampleCard() {
  const placeholderSources = [];
  for (let i = 1; i <= tempDeck.symbolsPerCard; i += 1) {
    placeholderSources.push(`./assets/placeholder-images/${i}.png`);
  }

  await drawImagesOnSquareTarget(sampleCardTarget, placeholderSources, tempDeck.generationOptions);
}
