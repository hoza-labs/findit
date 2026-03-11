import { createEmptyTempDeck, createTempDeckFromSavedDeck, markDirty, markSaved } from '../modules/deckSession.js';
import { createImageTile, loadTempDeckOrDefault, renderDeckHeaderAndTitle, renderDeckStatusLine, repository, saveTempDeck } from '../modules/deckFlowCommon.js';
import { drawImagesOnSquareTarget } from '../modules/cardCanvasRenderer.js';
import { getDeckPlayerCardCount, getDeckPlayerCardItems, getDeckPlayerStepAt } from '../modules/deckPlayer.js';
import { describeImageRef, removeImageRefAtIndex } from '../modules/imageRefs.js';

const deckPatternElement = document.querySelector('#deck-pattern');
const selectedImagesElement = document.querySelector('#selected-images');
const extraImagesSection = document.querySelector('#extra-images-section');
const previewSampleCardTarget = document.querySelector('#preview-sample-card-target');
const deckPlayerPanel = document.querySelector('#deck-player-panel');
const deckPlayerToggle = document.querySelector('#deck-player-toggle');
const deckPlayerSummary = document.querySelector('#deck-player-summary');
const deckPlayerSlider = document.querySelector('#deck-player-slider');
const deckPlayerRewindButton = document.querySelector('#deck-player-rewind-button');
const deckPlayerBackButton = document.querySelector('#deck-player-back-button');
const deckPlayerPlayButton = document.querySelector('#deck-player-play-button');
const deckPlayerForwardButton = document.querySelector('#deck-player-forward-button');
const deckPlayerEndButton = document.querySelector('#deck-player-end-button');
const deckPlayerStatus = document.querySelector('#deck-player-status');
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
let slopePatternItems = [];
let gridPatternItems = [];
let deckPlayerIndex = 0;
let deckPlayerTimerId = null;
let deckPlayerExpanded = false;
const patternActiveOutlineBuffer = 6;

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
  const usableWidth = Math.max(0, availableWidth - patternActiveOutlineBuffer * 2);
  const rawSize = Math.floor((usableWidth - (columns - 1) * gap) / columns);
  const imageSize = Math.max(24, Math.min(96, rawSize));

  deckPatternElement.style.setProperty('--pattern-item-size', `${imageSize}px`);
  deckPatternElement.style.setProperty('--pattern-gap', `${gap}px`);
}

function createPatternItem({ slotIndex, slotTitle = '', topLabel = '', refIndex = null, kind, row = null, column = null, slopeIndex = null }) {
  const item = document.createElement('article');
  item.className = 'deck-pattern-item';

  const selectedRef = refIndex !== null ? tempDeck.selectedImageRefs[refIndex] : null;
  const fallbackNumber = slotIndex + 1;
  const src = selectedRef ? resolveImageSrc(selectedRef, fallbackNumber) : `./assets/placeholder-images/${fallbackNumber}.png`;
  const label = selectedRef ? describeImageRef(selectedRef, userImages, webImages) : `placeholder ${fallbackNumber}`;
  const tooltipText = slotTitle ? `${label} | slot ${slotTitle}` : label;

  item.dataset.kind = kind;
  item.dataset.renderSrc = src;
  if (row !== null) {
    item.dataset.row = String(row);
  }
  if (column !== null) {
    item.dataset.column = String(column);
  }
  if (slopeIndex !== null) {
    item.dataset.slopeIndex = String(slopeIndex);
  }

  if (topLabel) {
    const topLabelElement = document.createElement('div');
    topLabelElement.className = 'deck-pattern-top-label';
    topLabelElement.textContent = topLabel;
    item.appendChild(topLabelElement);
  }

  const image = document.createElement('img');
  image.className = 'deck-pattern-image';
  image.src = src;
  image.alt = label;
  image.title = tooltipText;

  const imageWrap = document.createElement('div');
  imageWrap.className = 'deck-pattern-image-wrap';
  imageWrap.title = tooltipText;
  imageWrap.append(image);
  item.append(imageWrap);

  if (selectedRef) {
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'preview-remove-button';
    removeButton.textContent = 'X';
    removeButton.title = `Remove ${label}`;
    removeButton.setAttribute('aria-label', `Remove ${label}`);
    removeButton.addEventListener('click', async () => {
      tempDeck = markDirty(removeImageRefAtIndex(tempDeck, refIndex));
      await saveTempDeck(tempDeck);
      await renderSelectedImages();
    });
    imageWrap.appendChild(removeButton);
  }

  return item;
}

function stopDeckPlayer() {
  if (deckPlayerTimerId !== null) {
    window.clearInterval(deckPlayerTimerId);
    deckPlayerTimerId = null;
  }

  deckPlayerPlayButton.textContent = '>';
  deckPlayerPlayButton.title = 'Play';
  deckPlayerPlayButton.setAttribute('aria-label', 'Play deck');
}

function updateDeckPlayerSummary() {
  if (!deckPlayerExpanded) {
    deckPlayerSummary.textContent = 'Deck Player is off.';
    return;
  }

  deckPlayerSummary.textContent = '';
}

function setDeckPlayerExpanded(expanded) {
  deckPlayerExpanded = expanded;
  deckPlayerPanel.hidden = !expanded;
  deckPlayerToggle.setAttribute('aria-expanded', String(expanded));
  deckPlayerToggle.setAttribute('aria-label', expanded ? 'Turn Deck Player off' : 'Turn Deck Player on');

  if (!expanded) {
    stopDeckPlayer();
    clearActivePatternItems();
  }

  updateDeckPlayerSummary();
}

function startDeckPlayer() {
  if (deckPlayerTimerId !== null) {
    return;
  }

  deckPlayerPlayButton.textContent = '[]';
  deckPlayerPlayButton.title = 'Stop';
  deckPlayerPlayButton.setAttribute('aria-label', 'Stop deck');

  deckPlayerTimerId = window.setInterval(() => {
    const cardCount = getDeckPlayerCardCount(tempDeck.symbolsPerCard);
    if (deckPlayerIndex >= cardCount - 1) {
      stopDeckPlayer();
      return;
    }

    void renderDeckPlayerAt(deckPlayerIndex + 1);
  }, 1000);
}

function getDeckPlayerPatternItems() {
  return {
    slopeItems: slopePatternItems.map((element, index) => ({
      element,
      src: element.dataset.renderSrc,
      slopeIndex: index
    })),
    grid: gridPatternItems.map((row) =>
      row.map((element) => ({
        element,
        src: element.dataset.renderSrc,
        row: Number(element.dataset.row),
        column: Number(element.dataset.column)
      }))
    )
  };
}

function clearActivePatternItems() {
  for (const item of slopePatternItems) {
    item.classList.remove('is-active');
  }

  for (const row of gridPatternItems) {
    for (const item of row) {
      item.classList.remove('is-active');
    }
  }
}

async function renderDeckPlayerCard(slopeItems, grid, s, r) {
  clearActivePatternItems();

  const selectedItems = getDeckPlayerCardItems(slopeItems, grid, s, r);
  for (const item of selectedItems) {
    item.element.classList.add('is-active');
  }

  await drawImagesOnSquareTarget(
    previewSampleCardTarget,
    selectedItems.map((item) => item.src)
  );
}

function getDeckPlayerStatusText(step, cardNumber, cardCount) {
  if (step.s === Number.POSITIVE_INFINITY) {
    return `Card ${cardNumber} of ${cardCount}: last card (all slope items).`;
  }

  if (step.s === tempDeck.symbolsPerCard - 1) {
    return `Card ${cardNumber} of ${cardCount}: vertical family, column ${step.r + 1}.`;
  }

  return `Card ${cardNumber} of ${cardCount}: slope item ${step.s + 1}, start row ${step.r + 1}.`;
}

async function renderDeckPlayerAt(index) {
  const cardCount = getDeckPlayerCardCount(tempDeck.symbolsPerCard);
  deckPlayerIndex = Math.max(0, Math.min(index, cardCount - 1));
  deckPlayerSlider.value = String(deckPlayerIndex + 1);

  if (!deckPlayerExpanded) {
    clearActivePatternItems();
    updateDeckPlayerSummary();
    return;
  }

  const step = getDeckPlayerStepAt(tempDeck.symbolsPerCard, deckPlayerIndex);
  const { slopeItems, grid } = getDeckPlayerPatternItems();
  await renderDeckPlayerCard(slopeItems, grid, step.s, step.r);
  deckPlayerStatus.textContent = getDeckPlayerStatusText(step, deckPlayerIndex + 1, cardCount);
  updateDeckPlayerSummary();
}

async function stepDeckPlayer(delta) {
  const cardCount = getDeckPlayerCardCount(tempDeck.symbolsPerCard);
  const nextIndex = Math.max(0, Math.min(deckPlayerIndex + delta, cardCount - 1));
  await renderDeckPlayerAt(nextIndex);
}

async function renderSelectedImages() {
  clearObjectUrls();
  stopDeckPlayer();
  deckPatternElement.innerHTML = '';
  selectedImagesElement.innerHTML = '';
  extraImagesSection.hidden = true;
  slopePatternItems = [];
  gridPatternItems = [];

  const n = tempDeck.symbolsPerCard;
  const p = n - 1;
  const requiredCount = getRequiredImageCount();

  applyPatternScale();

  const canvas = document.createElement('div');
  canvas.className = 'deck-pattern-canvas';

  const slopeLabel = document.createElement('h3');
  slopeLabel.className = 'h6 mb-2';
  slopeLabel.textContent = 'Slope Items (over x, down y)';
  canvas.appendChild(slopeLabel);

  const slopeRow = document.createElement('div');
  slopeRow.className = 'deck-pattern-row deck-pattern-row--slope';
  for (let slot = 0; slot < n; slot += 1) {
    const slotTitle = slot < p ? String(slot) : 'infinity';
    const topLabel = slot < p ? `(1,${slot})` : '(0,1)';
    const hasSelected = slot < tempDeck.selectedImageRefs.length;
    const item = createPatternItem({
      slotIndex: slot,
      slotTitle,
      topLabel,
      refIndex: hasSelected ? slot : null,
      kind: 'slope',
      slopeIndex: slot
    });
    slopePatternItems.push(item);
    slopeRow.appendChild(item);
  }
  canvas.appendChild(slopeRow);

  canvas.appendChild(document.createElement('hr'));

  for (let row = 0; row < p; row += 1) {
    const rowElement = document.createElement('div');
    rowElement.className = 'deck-pattern-row deck-pattern-row--grid';
    const gridRowItems = [];
    for (let col = 0; col < p; col += 1) {
      const slotIndex = n + row * p + col;
      const hasSelected = slotIndex < tempDeck.selectedImageRefs.length;
      const item = createPatternItem({
        slotIndex,
        refIndex: hasSelected ? slotIndex : null,
        kind: 'grid',
        row,
        column: col
      });
      gridRowItems.push(item);
      rowElement.appendChild(item);
    }
    gridPatternItems.push(gridRowItems);
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

  const cardCount = getDeckPlayerCardCount(tempDeck.symbolsPerCard);
  deckPlayerSlider.min = '1';
  deckPlayerSlider.max = String(cardCount);
  await renderDeckPlayerAt(Math.min(deckPlayerIndex, cardCount - 1));
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
  if (deckPlayerExpanded) {
    void renderDeckPlayerAt(deckPlayerIndex);
  }
});

deckPlayerSlider.addEventListener('input', () => {
  stopDeckPlayer();
  void renderDeckPlayerAt(Number(deckPlayerSlider.value) - 1);
});

deckPlayerRewindButton.addEventListener('click', () => {
  stopDeckPlayer();
  void renderDeckPlayerAt(0);
});

deckPlayerBackButton.addEventListener('click', () => {
  stopDeckPlayer();
  void stepDeckPlayer(-1);
});

deckPlayerPlayButton.addEventListener('click', () => {
  if (deckPlayerTimerId !== null) {
    stopDeckPlayer();
    return;
  }

  startDeckPlayer();
});

deckPlayerForwardButton.addEventListener('click', () => {
  stopDeckPlayer();
  void stepDeckPlayer(1);
});

deckPlayerEndButton.addEventListener('click', () => {
  stopDeckPlayer();
  void renderDeckPlayerAt(getDeckPlayerCardCount(tempDeck.symbolsPerCard) - 1);
});

deckPlayerToggle.addEventListener('click', () => {
  const nextExpanded = !deckPlayerExpanded;
  setDeckPlayerExpanded(nextExpanded);
  if (nextExpanded) {
    void renderDeckPlayerAt(deckPlayerIndex);
  }
});

userImages = await repository.listUserImages();
webImages = await repository.listWebImages();
setDeckPlayerExpanded(false);
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
