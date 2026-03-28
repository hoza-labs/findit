import { getLastBuildPageHref } from '../modules/buildPageNavigation.js';
import { createEmptyTempDeck, createTempDeckFromSavedDeck, markSaved } from '../modules/deckSession.js';
import { loadTempDeckOrDefault, renderDeckHeaderAndTitle, renderDeckStatusLine, repository, saveTempDeck } from '../modules/deckFlowCommon.js';
import { createDeckCardGalleryRenderer } from '../modules/deckCardGallery.js';
import { getDeckPlayerCardCount } from '../modules/deckPlayer.js';
import { createQuickDeckTempDeck } from '../modules/quickDeck.js';
import { loadStandardImageNames } from '../modules/standardImageManifest.js';

const pageHeading = document.querySelector('header h1');
const deckStatusLine = document.querySelector('#deck-status-line');
const deckSummary = document.querySelector('#deck-summary');
const saveButton = document.querySelector('#save-button');
const saveAsButton = document.querySelector('#save-as-button');
const deckCardsElement = document.querySelector('#deck-cards');
const savePageEmpty = document.querySelector('#save-page-empty');

const saveAsDialog = document.querySelector('#save-as-dialog');
const saveAsForm = document.querySelector('#save-as-form');
const saveAsNameInput = document.querySelector('#save-as-name');
const saveAsCancelButton = document.querySelector('#save-as-cancel');
const existingDeckNamesElement = document.querySelector('#existing-deck-names');

const urlParams = new URLSearchParams(window.location.search);
const saveFirstMode = urlParams.get('saveFirst') === '1';
const afterAction = urlParams.get('after');
const afterName = urlParams.get('name') ?? '';
const afterQuickN = urlParams.get('quickN') ?? '';

let tempDeck = await loadTempDeckOrDefault();
let userImages = [];
let webImages = [];

const deckCardGallery = createDeckCardGalleryRenderer({
  containerElement: deckCardsElement,
  emptyElement: savePageEmpty
});

function updateHeader() {
  const cardCount = getDeckPlayerCardCount(tempDeck.symbolsPerCard);
  deckSummary.textContent = `n=${tempDeck.symbolsPerCard}, cards=${cardCount}, selected images=${tempDeck.selectedImageRefs.length}`;
  renderDeckStatusLine(deckStatusLine, tempDeck);
  renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'Save', tempDeck });
  saveButton.disabled = !tempDeck.deckName;
}

async function renderDeckCards() {
  await deckCardGallery.render({ tempDeck, userImages, webImages });
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

  if (afterAction === 'quick') {
    const [userImagesForQuickDeck, webImagesForQuickDeck, standardImageIds] = await Promise.all([
      repository.listUserImages(),
      repository.listWebImages(),
      loadStandardImageNames()
    ]);
    const result = createQuickDeckTempDeck({
      symbolsPerCard: afterQuickN,
      userImageIds: userImagesForQuickDeck.map((image) => image.id),
      webImageIds: webImagesForQuickDeck.map((image) => image.id),
      standardImageIds
    });
    await repository.saveTempDeck(result.tempDeck);
    window.location.href = getLastBuildPageHref();
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
    generationOptions: { ...tempDeck.generationOptions },
    playOptions: { ...tempDeck.playOptions },
    updatedAt: new Date().toISOString()
  });

  tempDeck = markSaved({ ...tempDeck, deckName: name });
  await saveTempDeck(tempDeck);
  updateHeader();
  await renderDeckCards();
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

window.addEventListener('beforeunload', () => {
  deckCardGallery.dispose();
});

[userImages, webImages] = await Promise.all([
  repository.listUserImages(),
  repository.listWebImages()
]);
updateHeader();
await renderDeckCards();

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
