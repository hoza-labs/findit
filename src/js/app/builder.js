import { buildDeckModel } from '../modules/deckBuilder.js';
import { createDeckStorage } from '../modules/storage.js';
import { getAllowedSymbolsPerCard, renderStepOnePreview } from '../modules/stepOnePreview.js';
import { renderDeck, updateSummary } from '../modules/ui.js';

const form = document.querySelector('#builder-form');
const symbolsSelect = document.querySelector('#symbols-select');
const stepOnePreview = document.querySelector('#step-one-preview');
const output = document.querySelector('#deck-output');
const summary = document.querySelector('#deck-summary');

const saveButton = document.querySelector('#save-button');
const loadButton = document.querySelector('#load-button');
const exportButton = document.querySelector('#export-button');
const printButton = document.querySelector('#print-button');

const deckStorage = createDeckStorage(window.localStorage);
let currentDeck = null;

function parseSymbolsInput() {
  const selectedValue = Number.parseInt(symbolsSelect.value, 10);
  if (!getAllowedSymbolsPerCard().includes(selectedValue)) {
    throw new Error('Please select a supported symbols-per-card value.');
  }
  return selectedValue;
}

function renderCurrentDeck() {
  if (!currentDeck) {
    updateSummary(summary, { deckSize: 0, symbolsPerCard: 0 });
    output.innerHTML = '';
    return;
  }

  updateSummary(summary, currentDeck);
  renderDeck(output, currentDeck);
}

function generateDeckFromInput() {
  const symbolsPerCard = parseSymbolsInput();
  currentDeck = buildDeckModel(symbolsPerCard);
  renderCurrentDeck();
}

function exportDeckAsJson(deck) {
  const blob = new Blob([JSON.stringify(deck, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'findit-deck.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  generateDeckFromInput();
});

saveButton.addEventListener('click', () => {
  if (!currentDeck) {
    generateDeckFromInput();
  }
  deckStorage.save(currentDeck);
});

loadButton.addEventListener('click', () => {
  const loadedDeck = deckStorage.load();
  if (!loadedDeck) {
    summary.textContent = 'No saved deck found in browser storage.';
    return;
  }

  currentDeck = loadedDeck;
  renderCurrentDeck();
});

exportButton.addEventListener('click', () => {
  if (!currentDeck) {
    generateDeckFromInput();
  }
  exportDeckAsJson(currentDeck);
});

printButton.addEventListener('click', () => {
  if (!currentDeck) {
    generateDeckFromInput();
  }
  window.print();
});

symbolsSelect.addEventListener('change', () => {
  renderStepOnePreview(stepOnePreview, parseSymbolsInput());
});

renderStepOnePreview(stepOnePreview, parseSymbolsInput());
