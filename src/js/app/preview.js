import { markDirty, markSaved } from '../modules/deckSession.js';
import { addUnsavedChangesPrompt, createImageTile, loadTempDeckOrDefault, repository, saveTempDeck } from '../modules/deckFlowCommon.js';
import { describeImageRef, removeImageRefAtIndex } from '../modules/imageRefs.js';

const selectedImagesElement = document.querySelector('#selected-images');
const deckSummary = document.querySelector('#deck-summary');
const deckNameDisplay = document.querySelector('#deck-name-display');
const saveButton = document.querySelector('#save-button');
const saveAsButton = document.querySelector('#save-as-button');

const saveAsDialog = document.querySelector('#save-as-dialog');
const saveAsForm = document.querySelector('#save-as-form');
const saveAsNameInput = document.querySelector('#save-as-name');
const saveAsCancelButton = document.querySelector('#save-as-cancel');
const existingDeckNamesElement = document.querySelector('#existing-deck-names');

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

function updateHeader() {
  deckSummary.textContent = `n=${tempDeck.symbolsPerCard}, selected images=${tempDeck.selectedImageRefs.length}`;
  deckNameDisplay.textContent = `Current deck name: ${tempDeck.deckName || '(unsaved)'}${tempDeck.dirty ? ' (unsaved changes)' : ''}`;
  saveButton.disabled = !tempDeck.deckName;
}

function resolveImageSrc(ref) {
  if (ref.source === 'standard') {
    return `./assets/deck-images/${ref.id}`;
  }

  if (ref.source === 'user') {
    const userImage = userImages.find((item) => item.id === ref.id);
    if (!userImage) {
      return '';
    }

    const url = URL.createObjectURL(userImage.blob);
    objectUrls.push(url);
    return url;
  }

  const webImage = webImages.find((item) => item.id === ref.id);
  return webImage ? webImage.url : '';
}

async function renderSelectedImages() {
  clearObjectUrls();
  selectedImagesElement.innerHTML = '';

  if (tempDeck.selectedImageRefs.length === 0) {
    selectedImagesElement.textContent = 'No images selected yet.';
    updateHeader();
    return;
  }

  for (let i = 0; i < tempDeck.selectedImageRefs.length; i += 1) {
    const ref = tempDeck.selectedImageRefs[i];
    const label = describeImageRef(ref, userImages, webImages);
    const src = resolveImageSrc(ref);

    selectedImagesElement.appendChild(
      createImageTile({
        src,
        label,
        buttonText: 'Remove',
        onClick: async () => {
          tempDeck = markDirty(removeImageRefAtIndex(tempDeck, i));
          await saveTempDeck(tempDeck);
          await renderSelectedImages();
        }
      })
    );
  }

  updateHeader();
}

function normalizeDeckName(name) {
  return name.trim();
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
  }
});

saveButton.addEventListener('click', async () => {
  if (!tempDeck.deckName) {
    await openSaveAsDialog();
    return;
  }

  await saveDeckWithName(tempDeck.deckName, false);
});

userImages = await repository.listUserImages();
webImages = await repository.listWebImages();
await renderSelectedImages();
addUnsavedChangesPrompt(() => tempDeck.dirty);
