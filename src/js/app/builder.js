import { buildDeckModel } from '../modules/deckBuilder.js';
import { createIndexedDbRepository } from '../modules/indexedDbRepository.js';
import { getAllowedSymbolsPerCard, renderStepOnePreview } from '../modules/stepOnePreview.js';
import { renderDeck, updateSummary } from '../modules/ui.js';

const form = document.querySelector('#builder-form');
const symbolsSelect = document.querySelector('#symbols-select');
const stepOnePreview = document.querySelector('#step-one-preview');
const output = document.querySelector('#deck-output');
const summary = document.querySelector('#deck-summary');

const standardImagesElement = document.querySelector('#standard-images');
const userImagesElement = document.querySelector('#user-images');
const webImagesElement = document.querySelector('#web-images');
const selectedImagesElement = document.querySelector('#selected-images');
const deckNameDisplay = document.querySelector('#deck-name-display');

const uploadImagesForm = document.querySelector('#upload-images-form');
const imageUploadInput = document.querySelector('#image-upload-input');
const webImageForm = document.querySelector('#web-image-form');
const webImageUrlInput = document.querySelector('#web-image-url');

const saveButton = document.querySelector('#save-button');
const saveAsButton = document.querySelector('#save-as-button');
const exportButton = document.querySelector('#export-button');
const printButton = document.querySelector('#print-button');

const saveAsDialog = document.querySelector('#save-as-dialog');
const saveAsForm = document.querySelector('#save-as-form');
const saveAsNameInput = document.querySelector('#save-as-name');
const saveAsCancelButton = document.querySelector('#save-as-cancel');
const existingDeckNamesElement = document.querySelector('#existing-deck-names');

const repository = createIndexedDbRepository();

const state = {
  deckName: '',
  selectedImageRefs: [],
  currentDeck: null,
  dirty: false,
  standardImageNames: [],
  userImages: [],
  webImages: []
};

let userImageObjectUrls = [];

function parseSymbolsInput() {
  const selectedValue = Number.parseInt(symbolsSelect.value, 10);
  if (!getAllowedSymbolsPerCard().includes(selectedValue)) {
    throw new Error('Please select a supported symbols-per-card value.');
  }
  return selectedValue;
}

function renderCurrentDeck() {
  if (!state.currentDeck) {
    updateSummary(summary, { deckSize: 0, symbolsPerCard: 0 });
    output.innerHTML = '';
    return;
  }

  updateSummary(summary, state.currentDeck);
  renderDeck(output, state.currentDeck);
}

function renderDeckName() {
  const name = state.deckName || '(unsaved)';
  const unsavedLabel = state.dirty ? ' (unsaved changes)' : '';
  deckNameDisplay.textContent = `Current deck name: ${name}${unsavedLabel}`;
}

function updateSaveButtons() {
  saveButton.disabled = !state.deckName;
}

function markDirty() {
  state.dirty = true;
  renderDeckName();
}

function markSaved() {
  state.dirty = false;
  renderDeckName();
}

function generateDeckFromInput() {
  const symbolsPerCard = parseSymbolsInput();
  state.currentDeck = buildDeckModel(symbolsPerCard);
  renderCurrentDeck();
}

function getDraftDeckRecord(name) {
  return {
    name,
    symbolsPerCard: parseSymbolsInput(),
    imageRefs: [...state.selectedImageRefs],
    updatedAt: new Date().toISOString()
  };
}

async function saveDeckWithName(name, options = { confirmReplace: false }) {
  const existingDeck = await repository.getDeck(name);
  if (options.confirmReplace && existingDeck) {
    const replaceConfirmed = window.confirm('Are you sure you want to replace the existing deck?');
    if (!replaceConfirmed) {
      return false;
    }
  }

  await repository.saveDeck(getDraftDeckRecord(name));
  state.deckName = name;
  updateSaveButtons();
  markSaved();
  return true;
}

function addImageRef(ref) {
  state.selectedImageRefs.push(ref);
  renderSelectedImages();
  markDirty();
}

function removeImageRef(index) {
  state.selectedImageRefs.splice(index, 1);
  renderSelectedImages();
  markDirty();
}

function describeImageRef(ref) {
  if (ref.source === 'standard') {
    return ref.id;
  }
  if (ref.source === 'user') {
    const match = state.userImages.find((image) => image.id === ref.id);
    return match ? `user:${match.fileName}` : `user:${ref.id}`;
  }
  const webMatch = state.webImages.find((image) => image.id === ref.id);
  return webMatch ? `web:${webMatch.url}` : `web:${ref.id}`;
}

function renderSelectedImages() {
  selectedImagesElement.innerHTML = '';

  if (state.selectedImageRefs.length === 0) {
    selectedImagesElement.textContent = 'No images selected yet.';
    return;
  }

  for (let index = 0; index < state.selectedImageRefs.length; index += 1) {
    const ref = state.selectedImageRefs[index];
    const row = document.createElement('div');
    row.className = 'selected-ref';

    const text = document.createElement('span');
    text.textContent = describeImageRef(ref);

    const removeButton = document.createElement('button');
    removeButton.className = 'btn btn-sm btn-outline-danger';
    removeButton.type = 'button';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => removeImageRef(index));

    row.append(text, removeButton);
    selectedImagesElement.appendChild(row);
  }
}

function createImageTile({ src, label, onAdd }) {
  const tile = document.createElement('article');
  tile.className = 'image-tile';

  const image = document.createElement('img');
  image.className = 'image-preview';
  image.src = src;
  image.alt = label;

  const meta = document.createElement('div');
  meta.className = 'image-meta';
  meta.textContent = label;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-sm btn-outline-primary w-100';
  button.textContent = 'Add to deck';
  button.addEventListener('click', onAdd);

  tile.append(image, meta, button);
  return tile;
}

function renderStandardImages() {
  standardImagesElement.innerHTML = '';

  for (const fileName of state.standardImageNames) {
    const src = `./assets/deck-images/${fileName}`;
    standardImagesElement.appendChild(
      createImageTile({
        src,
        label: fileName,
        onAdd: () => addImageRef({ source: 'standard', id: fileName })
      })
    );
  }
}

function clearUserImageObjectUrls() {
  for (const objectUrl of userImageObjectUrls) {
    URL.revokeObjectURL(objectUrl);
  }
  userImageObjectUrls = [];
}

function renderUserImages() {
  clearUserImageObjectUrls();
  userImagesElement.innerHTML = '';

  for (const record of state.userImages) {
    const objectUrl = URL.createObjectURL(record.blob);
    userImageObjectUrls.push(objectUrl);

    userImagesElement.appendChild(
      createImageTile({
        src: objectUrl,
        label: record.fileName,
        onAdd: () => addImageRef({ source: 'user', id: record.id })
      })
    );
  }
}

function renderWebImages() {
  webImagesElement.innerHTML = '';

  for (const record of state.webImages) {
    webImagesElement.appendChild(
      createImageTile({
        src: record.url,
        label: record.url,
        onAdd: () => addImageRef({ source: 'web', id: record.id })
      })
    );
  }
}

async function refreshIndexedDbImages() {
  state.userImages = await repository.listUserImages();
  state.webImages = await repository.listWebImages();
  renderUserImages();
  renderWebImages();
}

async function loadStandardImages() {
  const response = await fetch('./assets/deck-images/manifest.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Unable to load standard image manifest.');
  }
  state.standardImageNames = await response.json();
  renderStandardImages();
}

async function openSaveAsDialog() {
  const decks = await repository.listDecks();
  existingDeckNamesElement.innerHTML = '';

  if (decks.length === 0) {
    const note = document.createElement('span');
    note.className = 'text-muted';
    note.textContent = 'No saved decks yet.';
    existingDeckNamesElement.appendChild(note);
  } else {
    for (const deck of decks) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-sm btn-outline-secondary';
      button.textContent = deck.name;
      button.addEventListener('click', () => {
        saveAsNameInput.value = deck.name;
      });
      existingDeckNamesElement.appendChild(button);
    }
  }

  saveAsNameInput.value = state.deckName;
  if (typeof saveAsDialog.showModal === 'function') {
    saveAsDialog.showModal();
    saveAsNameInput.focus();
    return;
  }

  const promptName = window.prompt('Enter deck name', state.deckName);
  if (promptName) {
    const normalized = promptName.trim();
    if (normalized) {
      await saveDeckWithName(normalized, { confirmReplace: true });
    }
  }
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

symbolsSelect.addEventListener('change', () => {
  renderStepOnePreview(stepOnePreview, parseSymbolsInput());
  markDirty();
});

uploadImagesForm.addEventListener('submit', (event) => {
  event.preventDefault();
});

imageUploadInput.addEventListener('change', async () => {
  const files = [...(imageUploadInput.files ?? [])];
  for (const file of files) {
    const saved = await repository.addUserImage(file);
    addImageRef({ source: 'user', id: saved.id });
  }

  imageUploadInput.value = '';
  await refreshIndexedDbImages();
});

webImageForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const url = webImageUrlInput.value.trim();
  if (!url) {
    return;
  }

  try {
    new URL(url);
  } catch {
    summary.textContent = 'Please enter a valid URL for a web image.';
    return;
  }

  const saved = await repository.addWebImage(url);
  addImageRef({ source: 'web', id: saved.id });
  webImageUrlInput.value = '';
  await refreshIndexedDbImages();
});

saveAsButton.addEventListener('click', async () => {
  await openSaveAsDialog();
});

saveAsCancelButton.addEventListener('click', () => {
  saveAsDialog.close();
});

saveAsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = saveAsNameInput.value.trim();
  if (!name) {
    return;
  }

  const saved = await saveDeckWithName(name, { confirmReplace: true });
  if (saved) {
    saveAsDialog.close();
  }
});

saveButton.addEventListener('click', async () => {
  if (!state.deckName) {
    await openSaveAsDialog();
    return;
  }

  await saveDeckWithName(state.deckName, { confirmReplace: false });
});

exportButton.addEventListener('click', () => {
  if (!state.currentDeck) {
    generateDeckFromInput();
  }

  exportDeckAsJson({
    ...state.currentDeck,
    deckName: state.deckName,
    selectedImageRefs: state.selectedImageRefs
  });
});

printButton.addEventListener('click', () => {
  if (!state.currentDeck) {
    generateDeckFromInput();
  }
  window.print();
});

window.addEventListener('beforeunload', (event) => {
  if (!state.dirty) {
    return;
  }

  event.preventDefault();
  event.returnValue = 'You have unsaved changes. Are you sure you want to leave this page?';
});

async function init() {
  try {
    await loadStandardImages();
    await refreshIndexedDbImages();
  } catch {
    summary.textContent = 'Could not initialize image libraries. Check browser storage permissions.';
  }

  renderStepOnePreview(stepOnePreview, parseSymbolsInput());
  renderSelectedImages();
  renderDeckName();
  updateSaveButtons();
}

await init();
