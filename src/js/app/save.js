import { createEmptyTempDeck, createTempDeckFromSavedDeck, markSaved } from '../modules/deckSession.js';
import { drawImagesOnSquareTarget } from '../modules/cardCanvasRenderer.js';
import { loadTempDeckOrDefault, renderDeckHeaderAndTitle, renderDeckStatusLine, repository, saveTempDeck } from '../modules/deckFlowCommon.js';
import { getDeckPlayerCardCount, getDeckPlayerCardItems, getDeckPlayerStepAt } from '../modules/deckPlayer.js';
import { getStandardImageSrc } from '../modules/standardImageFiles.js';

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

let tempDeck = await loadTempDeckOrDefault();
let userImages = [];
let webImages = [];
let objectUrls = [];

function clearObjectUrls() {
  for (const url of objectUrls) {
    URL.revokeObjectURL(url);
  }
  objectUrls = [];
}

function updateHeader() {
  const cardCount = getDeckPlayerCardCount(tempDeck.symbolsPerCard);
  deckSummary.textContent = `n=${tempDeck.symbolsPerCard}, cards=${cardCount}, selected images=${tempDeck.selectedImageRefs.length}`;
  renderDeckStatusLine(deckStatusLine, tempDeck);
  renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'Save', tempDeck });
  saveButton.disabled = !tempDeck.deckName;
}

function resolveImageSrc(ref, placeholderNumber) {
  if (ref?.source === 'standard') {
    return getStandardImageSrc(ref.id);
  }

  if (ref?.source === 'user') {
    const userImage = userImages.find((item) => item.id === ref.id);
    if (!userImage) {
      return `./assets/placeholder-images/${placeholderNumber}.png`;
    }

    const url = URL.createObjectURL(userImage.blob);
    objectUrls.push(url);
    return url;
  }

  if (ref?.source === 'web') {
    const webImage = webImages.find((item) => item.id === ref.id);
    return webImage ? webImage.url : `./assets/placeholder-images/${placeholderNumber}.png`;
  }

  return `./assets/placeholder-images/${placeholderNumber}.png`;
}

function getPatternSources() {
  clearObjectUrls();

  const n = tempDeck.symbolsPerCard;
  const order = n - 1;
  const slopeItems = [];
  const grid = [];

  for (let slopeIndex = 0; slopeIndex < n; slopeIndex += 1) {
    slopeItems.push(resolveImageSrc(tempDeck.selectedImageRefs[slopeIndex], slopeIndex + 1));
  }

  for (let row = 0; row < order; row += 1) {
    const gridRow = [];
    for (let column = 0; column < order; column += 1) {
      const slotIndex = n + row * order + column;
      gridRow.push(resolveImageSrc(tempDeck.selectedImageRefs[slotIndex], slotIndex + 1));
    }
    grid.push(gridRow);
  }

  return { slopeItems, grid };
}

async function renderDeckCards() {
  deckCardsElement.innerHTML = '';
  savePageEmpty.hidden = true;

  if (tempDeck.selectedImageRefs.length === 0) {
    savePageEmpty.hidden = false;
    savePageEmpty.textContent = 'This deck has no selected images yet.';
    return;
  }

  const pattern = getPatternSources();
  const cardCount = getDeckPlayerCardCount(tempDeck.symbolsPerCard);

  for (let cardIndex = 0; cardIndex < cardCount; cardIndex += 1) {
    const step = getDeckPlayerStepAt(tempDeck.symbolsPerCard, cardIndex);
    const sources = getDeckPlayerCardItems(pattern.slopeItems, pattern.grid, step.s, step.r);

    const card = document.createElement('section');
    card.className = 'save-card card shadow-sm';

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    const title = document.createElement('h2');
    title.className = 'h6 mb-2';
    title.textContent = `Card ${cardIndex + 1}`;

    const target = document.createElement('div');
    target.className = 'sample-card-target save-card-target';

    cardBody.append(title, target);
    card.appendChild(cardBody);
    deckCardsElement.appendChild(card);

    await drawImagesOnSquareTarget(target, sources);
  }
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
    playOptions: { ...tempDeck.playOptions },
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

window.addEventListener('beforeunload', () => {
  clearObjectUrls();
});

userImages = await repository.listUserImages();
webImages = await repository.listWebImages();
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
