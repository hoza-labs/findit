import { createEmptyTempDeck, createTempDeckFromSavedDeck, markDirty, markSaved } from '../modules/deckSession.js';
import { createImageTile, loadTempDeckOrDefault, renderDeckHeaderAndTitle, renderDeckStatusLine, repository, saveTempDeck } from '../modules/deckFlowCommon.js';
import { describeImageRef, removeImageRefAtIndex } from '../modules/imageRefs.js';

const deckPatternElement = document.querySelector('#deck-pattern');
const selectedImagesElement = document.querySelector('#selected-images');
const extraImagesSection = document.querySelector('#extra-images-section');
const deckSummary = document.querySelector('#deck-summary');
const saveButton = document.querySelector('#save-button');
const saveAsButton = document.querySelector('#save-as-button');
const deckStatusLine = document.querySelector('#deck-status-line');
const pageHeading = document.querySelector('header h1');

const saveAsDialog = document.querySelector('#save-as-dialog');
const saveAsForm = document.querySelector('#save-as-form');
const saveAsNameInput = document.querySelector('#save-as-name');
const saveAsCancelButton = document.querySelector('#save-as-cancel');
const existingDeckNamesElement = document.querySelector('#existing-deck-names');

const urlParams = new URLSearchParams(window.location.search);
const saveFirstMode = urlParams.get('saveFirst') === '1';
const afterAction = urlParams.get('after');
const afterName = urlParams.get('name') ?? '';

let tempDeck = await loadTempDeckOrDefault();
let objectUrls = [];
let userImages = [];
let webImages = [];

function clearObjectUrls() {
  for (const url of objectUrls) {
    URL.revokeObjectURL(url);
  }
  objectUrls = [];
}

function getRequiredImageCount() {
  return tempDeck.symbolsPerCard * (tempDeck.symbolsPerCard - 1) + 1;
}

function updateHeader() {
  const requiredCount = getRequiredImageCount();
  deckSummary.textContent = `n=${tempDeck.symbolsPerCard}, selected images=${tempDeck.selectedImageRefs.length}, required=${requiredCount}`;
  renderDeckStatusLine(deckStatusLine, tempDeck);
  renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'Preview', tempDeck });
  saveButton.disabled = !tempDeck.deckName;
}

function resolveImageSrc(ref, placeholderNumber) {
  if (ref.source === 'standard') {
    return `./assets/deck-images/${ref.id}`;
  }

  if (ref.source === 'user') {
    const userImage = userImages.find((item) => item.id === ref.id);
    if (!userImage) {
      return `./assets/placeholder-images/${placeholderNumber}.png`;
    }

    const url = URL.createObjectURL(userImage.blob);
    objectUrls.push(url);
    return url;
  }

  const webImage = webImages.find((item) => item.id === ref.id);
  return webImage ? webImage.url : `./assets/placeholder-images/${placeholderNumber}.png`;
}

function applyPatternScale() {
  const columns = tempDeck.symbolsPerCard;
  const gap = 8;
  const availableWidth = deckPatternElement.clientWidth || 960;
  const rawSize = Math.floor((availableWidth - (columns - 1) * gap) / columns);
  const imageSize = Math.max(24, Math.min(96, rawSize));

  deckPatternElement.style.setProperty('--pattern-item-size', `${imageSize}px`);
  deckPatternElement.style.setProperty('--pattern-gap', `${gap}px`);
}

function createPatternItem({ slotIndex, slotTitle = '', refIndex = null }) {
  const item = document.createElement('article');
  item.className = 'deck-pattern-item';

  const selectedRef = refIndex !== null ? tempDeck.selectedImageRefs[refIndex] : null;
  const fallbackNumber = slotIndex + 1;
  const src = selectedRef ? resolveImageSrc(selectedRef, fallbackNumber) : `./assets/placeholder-images/${fallbackNumber}.png`;
  const label = selectedRef ? describeImageRef(selectedRef, userImages, webImages) : `placeholder ${fallbackNumber}`;
  const tooltipText = slotTitle ? `${label} | slot ${slotTitle}` : label;

  const image = document.createElement('img');
  image.className = 'deck-pattern-image';
  image.src = src;
  image.alt = label;
  image.title = tooltipText;
  item.title = tooltipText;

  item.append(image);

  if (selectedRef) {
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'preview-remove-button';
    removeButton.textContent = '❌';
    removeButton.title = `Remove ${label}`;
    removeButton.setAttribute('aria-label', `Remove ${label}`);
    removeButton.addEventListener('click', async () => {
      tempDeck = markDirty(removeImageRefAtIndex(tempDeck, refIndex));
      await saveTempDeck(tempDeck);
      await renderSelectedImages();
    });
    item.appendChild(removeButton);
  }

  return item;
}

async function renderSelectedImages() {
  clearObjectUrls();
  deckPatternElement.innerHTML = '';
  selectedImagesElement.innerHTML = '';
  extraImagesSection.hidden = true;

  const n = tempDeck.symbolsPerCard;
  const p = n - 1;
  const requiredCount = getRequiredImageCount();

  applyPatternScale();

  const canvas = document.createElement('div');
  canvas.className = 'deck-pattern-canvas';

  const slopeLabel = document.createElement('h3');
  slopeLabel.className = 'h6 mb-2';
  slopeLabel.textContent = 'Slope Items';
  canvas.appendChild(slopeLabel);

  const slopeRow = document.createElement('div');
  slopeRow.className = 'deck-pattern-row';
  for (let slot = 0; slot < n; slot += 1) {
    const slotTitle = slot < p ? String(slot) : 'infinity';
    const hasSelected = slot < tempDeck.selectedImageRefs.length;
    slopeRow.appendChild(
      createPatternItem({
        slotIndex: slot,
        slotTitle,
        refIndex: hasSelected ? slot : null
      })
    );
  }
  canvas.appendChild(slopeRow);

  canvas.appendChild(document.createElement('hr'));

  for (let row = 0; row < p; row += 1) {
    const rowElement = document.createElement('div');
    rowElement.className = 'deck-pattern-row';
    for (let col = 0; col < p; col += 1) {
      const slotIndex = n + row * p + col;
      const hasSelected = slotIndex < tempDeck.selectedImageRefs.length;
      rowElement.appendChild(
        createPatternItem({
          slotIndex,
          refIndex: hasSelected ? slotIndex : null
        })
      );
    }
    canvas.appendChild(rowElement);
  }

  deckPatternElement.appendChild(canvas);

  const extraRefs = tempDeck.selectedImageRefs.slice(requiredCount);
  if (extraRefs.length > 0) {
    extraImagesSection.hidden = false;

    for (let index = 0; index < extraRefs.length; index += 1) {
      const refIndex = requiredCount + index;
      const ref = extraRefs[index];
      const label = describeImageRef(ref, userImages, webImages);
      const src = resolveImageSrc(ref, ((refIndex % 133) + 1));
      selectedImagesElement.appendChild(
        createImageTile({
          src,
          label: '',
          tooltipText: label,
          buttonText: 'Remove',
          buttonVariant: 'outline-danger',
          onClick: async () => {
            tempDeck = markDirty(removeImageRefAtIndex(tempDeck, refIndex));
            await saveTempDeck(tempDeck);
            await renderSelectedImages();
          }
        })
      );
    }
  }

  updateHeader();
}

function normalizeDeckName(name) {
  return name.trim();
}

async function continueAfterSaveIntent() {
  if (!saveFirstMode) {
    return;
  }

  if (afterAction === 'new') {
    await repository.saveTempDeck(createEmptyTempDeck());
    window.location.href = './basic-info.html';
    return;
  }

  if (afterAction === 'open' && afterName) {
    const deck = await repository.getDeck(afterName);
    if (deck) {
      await repository.saveTempDeck(createTempDeckFromSavedDeck(deck));
      window.location.href = './basic-info.html';
      return;
    }
  }

  window.location.href = './index.html';
}

async function saveDeckWithName(name, confirmReplace) {
  const existing = await repository.getDeck(name);
  if (confirmReplace && existing) {
    const ok = window.confirm('Are you sure you want to replace the existing deck?');
    if (!ok) {
      return false;
    }
  }

  await repository.saveDeck({
    name,
    symbolsPerCard: tempDeck.symbolsPerCard,
    imageRefs: [...tempDeck.selectedImageRefs],
    updatedAt: new Date().toISOString()
  });

  tempDeck = markSaved({ ...tempDeck, deckName: name });
  await saveTempDeck(tempDeck);
  updateHeader();
  return true;
}

async function openSaveAsDialog() {
  const decks = await repository.listDecks();
  existingDeckNamesElement.innerHTML = '';

  if (decks.length === 0) {
    existingDeckNamesElement.textContent = 'No saved decks yet.';
  } else {
    for (const deck of decks.sort((a, b) => a.name.localeCompare(b.name))) {
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

  saveAsNameInput.value = tempDeck.deckName;
  saveAsDialog.showModal();
}

saveAsButton.addEventListener('click', () => {
  void openSaveAsDialog();
});

saveAsCancelButton.addEventListener('click', () => {
  saveAsDialog.close();
});

saveAsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = normalizeDeckName(saveAsNameInput.value);
  if (!name) {
    return;
  }

  const saved = await saveDeckWithName(name, true);
  if (saved) {
    saveAsDialog.close();
    await continueAfterSaveIntent();
  }
});

saveButton.addEventListener('click', async () => {
  if (!tempDeck.deckName) {
    await openSaveAsDialog();
    return;
  }

  const saved = await saveDeckWithName(tempDeck.deckName, false);
  if (saved) {
    await continueAfterSaveIntent();
  }
});

window.addEventListener('resize', () => {
  applyPatternScale();
});

userImages = await repository.listUserImages();
webImages = await repository.listWebImages();
await renderSelectedImages();

if (saveFirstMode) {
  if (tempDeck.deckName) {
    const saved = await saveDeckWithName(tempDeck.deckName, false);
    if (saved) {
      await continueAfterSaveIntent();
    }
  } else {
    await openSaveAsDialog();
  }
}
