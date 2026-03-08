import { markDirty } from '../modules/deckSession.js';
import { loadTempDeckOrDefault, renderDeckHeaderAndTitle, renderDeckStatusLine, saveTempDeck } from '../modules/deckFlowCommon.js';
import { getAllowedSymbolsPerCard, renderStepOnePreview } from '../modules/stepOnePreview.js';

const symbolsSelect = document.querySelector('#symbols-select');
const preview = document.querySelector('#step-one-preview');
const deckStatusLine = document.querySelector('#deck-status-line');
const pageHeading = document.querySelector('header h1');

let tempDeck = await loadTempDeckOrDefault();

symbolsSelect.value = String(tempDeck.symbolsPerCard);
renderStepOnePreview(preview, tempDeck.symbolsPerCard);
renderDeckStatusLine(deckStatusLine, tempDeck);
renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'Basic Info', tempDeck });

symbolsSelect.addEventListener('change', async () => {
  const nextValue = Number.parseInt(symbolsSelect.value, 10);
  if (!getAllowedSymbolsPerCard().includes(nextValue)) {
    return;
  }

  tempDeck = markDirty({ ...tempDeck, symbolsPerCard: nextValue });
  await saveTempDeck(tempDeck);
  renderStepOnePreview(preview, nextValue);
  renderDeckStatusLine(deckStatusLine, tempDeck);
  renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'Basic Info', tempDeck });
});
