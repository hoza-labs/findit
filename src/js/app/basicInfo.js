import { drawImagesOnSquareTarget } from '../modules/cardCanvasRenderer.js';
import { markDirty } from '../modules/deckSession.js';
import { loadTempDeckOrDefault, renderDeckHeaderAndTitle, renderDeckStatusLine, saveTempDeck } from '../modules/deckFlowCommon.js';
import { getAllowedSymbolsPerCard } from '../modules/stepOnePreview.js';

const symbolsSelect = document.querySelector('#symbols-select');
const sampleCardTarget = document.querySelector('#sample-card-target');
const deckStatusLine = document.querySelector('#deck-status-line');
const pageHeading = document.querySelector('header h1');

let tempDeck = await loadTempDeckOrDefault();
let resizeTimeout = null;

symbolsSelect.value = String(tempDeck.symbolsPerCard);
renderDeckStatusLine(deckStatusLine, tempDeck);
renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'Basic Info', tempDeck });
await renderSampleCard(tempDeck.symbolsPerCard);

symbolsSelect.addEventListener('change', async () => {
  const nextValue = Number.parseInt(symbolsSelect.value, 10);
  if (!getAllowedSymbolsPerCard().includes(nextValue)) {
    return;
  }

  tempDeck = markDirty({ ...tempDeck, symbolsPerCard: nextValue });
  await saveTempDeck(tempDeck);
  renderDeckStatusLine(deckStatusLine, tempDeck);
  renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'Basic Info', tempDeck });
  await renderSampleCard(nextValue);
});

window.addEventListener('resize', () => {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }

  resizeTimeout = setTimeout(() => {
    void renderSampleCard(tempDeck.symbolsPerCard);
  }, 100);
});

async function renderSampleCard(symbolsPerCard) {
  const placeholderSources = [];
  for (let i = 1; i <= symbolsPerCard; i += 1) {
    placeholderSources.push(`./assets/placeholder-images/${i}.png`);
  }

  await drawImagesOnSquareTarget(sampleCardTarget, placeholderSources);
}
