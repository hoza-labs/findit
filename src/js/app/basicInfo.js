import { drawImagesOnSquareTarget } from '../modules/cardCanvasRenderer.js';
import { markDirty } from '../modules/deckSession.js';
import { loadTempDeckOrDefault, renderDeckHeaderAndTitle, renderDeckStatusLine, saveTempDeck } from '../modules/deckFlowCommon.js';
import { createRandomPattern, deriveRenderSeed, formatPatternBase36, parsePatternBase36 } from '../modules/patternSeed.js';
import { getAllowedSymbolsPerCard } from '../modules/stepOnePreview.js';

const symbolsSelect = document.querySelector('#symbols-select');
const cardShapeSelect = document.querySelector('#card-shape-select');
const imageRotationSelect = document.querySelector('#image-rotation-select');
const imageSizeSelect = document.querySelector('#image-size-select');
const sourceSamplingBiasSelect = document.querySelector('#source-sampling-bias-select');
const shuffleImagesButton = document.querySelector('#shuffle-images-button');
const patternInput = document.querySelector('#pattern-input');
const patternCurrentValue = document.querySelector('#pattern-current-value');
const patternMessage = document.querySelector('#pattern-message');
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
renderPatternControls();
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
  renderPatternControls();
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

shuffleImagesButton.addEventListener('click', () => {
  void updatePattern(createRandomPattern(), 'Images shuffled.');
});

patternInput.addEventListener('input', () => {
  const parsed = parsePatternBase36(patternInput.value);
  patternInput.classList.toggle('is-invalid', parsed === null);
  patternMessage.className = parsed === null ? 'small text-danger mb-0 mt-2' : 'small text-muted mb-0 mt-2';
  patternMessage.textContent = parsed === null
    ? 'Enter a valid base36 pattern using digits and lowercase letters.'
    : 'Pattern is ready to apply.';
});

patternInput.addEventListener('change', () => {
  void applyPatternInput();
});

patternInput.addEventListener('blur', () => {
  void applyPatternInput();
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
  renderPatternControls();
  await renderSampleCard();
}

async function updatePattern(nextPattern, successMessage) {
  tempDeck = markDirty({ ...tempDeck, pattern: nextPattern });
  await saveTempDeck(tempDeck);
  renderDeckStatusLine(deckStatusLine, tempDeck);
  renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'Basic Info', tempDeck });
  renderPatternControls(successMessage);
  await renderSampleCard();
}

async function applyPatternInput() {
  const parsed = parsePatternBase36(patternInput.value);
  if (parsed === null) {
    renderPatternControls('Enter a valid base36 pattern using digits and lowercase letters.', true);
    return;
  }

  if (parsed === tempDeck.pattern) {
    renderPatternControls('Pattern unchanged.');
    return;
  }

  await updatePattern(parsed, 'Pattern updated.');
}

function renderPatternControls(message = '', isError = false) {
  const formattedPattern = formatPatternBase36(tempDeck.pattern);
  patternInput.value = formattedPattern;
  patternCurrentValue.textContent = `Pattern: ${formattedPattern}`;
  patternInput.classList.toggle('is-invalid', isError);
  patternMessage.className = isError ? 'small text-danger mb-0 mt-2' : 'small text-muted mb-0 mt-2';
  patternMessage.textContent = message;
}

async function renderSampleCard() {
  const placeholderSources = [];
  for (let i = 1; i <= tempDeck.symbolsPerCard; i += 1) {
    placeholderSources.push(`./assets/placeholder-images/${i}.png`);
  }

  await drawImagesOnSquareTarget(sampleCardTarget, placeholderSources, tempDeck.generationOptions, {
    randomSeed: deriveRenderSeed(tempDeck.pattern, 0)
  });
}
