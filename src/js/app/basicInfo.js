import { markDirty } from '../modules/deckSession.js';
import { loadTempDeckOrDefault, renderDeckStatusLine, saveTempDeck } from '../modules/deckFlowCommon.js';
import { getAllowedSymbolsPerCard, renderStepOnePreview } from '../modules/stepOnePreview.js';

const symbolsSelect = document.querySelector('#symbols-select');
const preview = document.querySelector('#step-one-preview');
const deckStatusLine = document.querySelector('#deck-status-line');

let tempDeck = await loadTempDeckOrDefault();

symbolsSelect.value = String(tempDeck.symbolsPerCard);
renderStepOnePreview(preview, tempDeck.symbolsPerCard);
renderDeckStatusLine(deckStatusLine, tempDeck);

symbolsSelect.addEventListener('change', async () => {
  const nextValue = Number.parseInt(symbolsSelect.value, 10);
  if (!getAllowedSymbolsPerCard().includes(nextValue)) {
    return;
  }

  tempDeck = markDirty({ ...tempDeck, symbolsPerCard: nextValue });
  await saveTempDeck(tempDeck);
  renderStepOnePreview(preview, nextValue);
  renderDeckStatusLine(deckStatusLine, tempDeck);
});
