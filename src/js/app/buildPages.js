import { markDirty } from '../modules/deckSession.js';
import { createImageTile, createPreviewGenerationOptions, loadTempDeckOrDefault, renderDeckStatusLine, repository, saveTempDeck } from '../modules/deckFlowCommon.js';
import { drawImagesOnSquareTarget } from '../modules/cardCanvasRenderer.js';
import { getCurrentBuildPageHref, renderBuildHeaderAndSubnav } from '../modules/buildPageNavigation.js';
import { createDeckCardGalleryRenderer } from '../modules/deckCardGallery.js';
import { getDeckPlayerCardCount, getDeckPlayerCardItems, getDeckPlayerSlopeComponents, getDeckPlayerStepAt } from '../modules/deckPlayer.js';
import { describeImageRef, removeImageRefAtIndex } from '../modules/imageRefs.js';
import { deriveRenderSeed } from '../modules/patternSeed.js';
import { getLastImagePageHref } from '../modules/imagePageNavigation.js';
import { getStandardImageSrc } from '../modules/standardImageFiles.js';

const buildPageSubnav = document.querySelector('#build-page-subnav');
const buildPageIntro = document.querySelector('#build-page-intro');
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
const deckCardsElement = document.querySelector('#deck-cards');
const deckPreviewEmpty = document.querySelector('#deck-preview-empty');
const deckStatusLine = document.querySelector('#deck-status-line');
const pageHeading = document.querySelector('header h1');
const incompleteDeckWarning = document.querySelector('#incomplete-deck-warning');
const incompleteDeckWarningTitle = document.querySelector('#incomplete-deck-warning-title');
const incompleteDeckWarningMessage = document.querySelector('#incomplete-deck-warning-message');

const isDeckBuilderPage = Boolean(deckPatternElement);

let tempDeck = await loadTempDeckOrDefault();
let objectUrls = [];
let userImages = [];
let webImages = [];
let slopePatternItems = [];
let gridPatternItems = [];
let deckPlayerIndex = 0;
let deckPlayerTimerId = null;
let deckPlayerExpanded = false;
let managePatternImages = false;
const patternActiveOutlineBuffer = 6;

const deckCardGallery = createDeckCardGalleryRenderer({
  containerElement: deckCardsElement,
  emptyElement: deckPreviewEmpty
});
function waitForNextPaint() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });
}

function formatSlopeAngleDegrees(rise, run = 1) {
  const angle = Math.atan2(rise, run) * (180 / Math.PI);
  return String(Math.round(angle));
}

function clearObjectUrls() {
  for (const url of objectUrls) {
    URL.revokeObjectURL(url);
  }
  objectUrls = [];
}

function getRequiredImageCount() {
  return tempDeck.symbolsPerCard * (tempDeck.symbolsPerCard - 1) + 1;
}

function getDeckPreviewIntroText() {
  return 'Take a quick peek at all the cards in your deck.';
}

function updateBuildPageIntro() {
  if (!buildPageIntro || isDeckBuilderPage) {
    return;
  }

  buildPageIntro.textContent = getDeckPreviewIntroText();
}

function updateHeader() {
  const requiredCount = getRequiredImageCount();
  if (deckSummary) {
    deckSummary.textContent = `You are building a ${requiredCount}-card deck that shows ${tempDeck.symbolsPerCard} pictures per card. It uses ${requiredCount} unique images.`;
  }
  renderDeckStatusLine(deckStatusLine, tempDeck);
  renderBuildHeaderAndSubnav({
    headingElement: pageHeading,
    subnavElement: buildPageSubnav,
    tempDeck,
    currentHref: getCurrentBuildPageHref()
  });
  updateBuildPageIntro();
  renderIncompleteDeckWarning();
}

function renderIncompleteDeckWarning() {
  if (!incompleteDeckWarning || isDeckBuilderPage) {
    return;
  }

  const requiredImageCount = getRequiredImageCount();
  const needsMoreImages = tempDeck.selectedImageRefs.length < requiredImageCount;
  incompleteDeckWarning.hidden = !needsMoreImages;

  if (!needsMoreImages) {
    return;
  }

  if (incompleteDeckWarningTitle) {
    const missingImageCount = requiredImageCount - tempDeck.selectedImageRefs.length;
    const imageLabel = missingImageCount === 1 ? 'Image' : 'Images';
    incompleteDeckWarningTitle.textContent = `${missingImageCount} More ${imageLabel} Needed`;
  }

  if (incompleteDeckWarningMessage) {
    incompleteDeckWarningMessage.innerHTML = '';
    incompleteDeckWarningMessage.append('Please ');

    const selectImagesLink = document.createElement('a');
    selectImagesLink.href = getLastImagePageHref();
    selectImagesLink.textContent = 'select more images';

    const basicInfoLink = document.createElement('a');
    basicInfoLink.href = './basic-info.html';
    basicInfoLink.textContent = 'reduce the # Pictures per Card';

    incompleteDeckWarningMessage.append(selectImagesLink);
    incompleteDeckWarningMessage.append(' or ');
    incompleteDeckWarningMessage.append(basicInfoLink);
    incompleteDeckWarningMessage.append('.');
  }
}

function resolveImageSrc(ref, placeholderNumber) {
  if (ref?.source === 'standard') {
    return { src: getStandardImageSrc(ref.id) };
  }

  if (ref?.source === 'user') {
    const userImage = userImages.find((item) => item.id === ref.id);
    if (!userImage) {
      return { src: `./assets/placeholder-images/${placeholderNumber}.png` };
    }

    const url = URL.createObjectURL(userImage.blob);
    objectUrls.push(url);
    return { src: url, mask: userImage.mask };
  }

  const webImage = webImages.find((item) => item.id === ref.id);
  return webImage
    ? { src: webImage.url, mask: webImage.mask }
    : { src: `./assets/placeholder-images/${placeholderNumber}.png` };
}

function applyPatternScale() {
  if (!deckPatternElement) {
    return;
  }

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
  const renderSource = selectedRef
    ? resolveImageSrc(selectedRef, fallbackNumber)
    : { src: `./assets/placeholder-images/${fallbackNumber}.png` };
  const label = selectedRef ? describeImageRef(selectedRef, userImages, webImages) : `placeholder ${fallbackNumber}`;
  const tooltipText = slotTitle ? `${label} | slot ${slotTitle}` : label;

  item.dataset.kind = kind;
  item.classList.toggle('deck-pattern-item--removable', refIndex !== null);
  item.renderSource = renderSource;
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
    for (const line of String(topLabel).split('\n')) {
      const topLabelLineElement = document.createElement('span');
      topLabelLineElement.className = 'deck-pattern-top-label-line';
      topLabelLineElement.textContent = line;
      topLabelElement.appendChild(topLabelLineElement);
    }
    item.appendChild(topLabelElement);
  }

  const image = document.createElement('div');
  image.className = 'deck-pattern-image';
  image.setAttribute('role', 'img');
  image.setAttribute('aria-label', label);
  image.title = tooltipText;

  const imageWrap = document.createElement('div');
  imageWrap.className = 'deck-pattern-image-wrap';
  imageWrap.title = tooltipText;
  imageWrap.append(image);
  item.append(imageWrap);
  queueMicrotask(() => {
    void renderPatternItemPreview(image, renderSource);
  });

  if (selectedRef) {
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'preview-remove-button';
    removeButton.textContent = '\u2612';
    removeButton.title = `Remove ${label}`;
    removeButton.setAttribute('aria-label', `Remove ${label}`);
    removeButton.addEventListener('click', async () => {
      tempDeck = markDirty(removeImageRefAtIndex(tempDeck, refIndex));
      await saveTempDeck(tempDeck);
      await renderSelectedImages();
    });
    removeButton.hidden = !managePatternImages;
    imageWrap.appendChild(removeButton);
  }

  return item;
}

function stopDeckPlayer() {
  if (deckPlayerTimerId !== null) {
    window.clearInterval(deckPlayerTimerId);
    deckPlayerTimerId = null;
  }

  if (!deckPlayerPlayButton) {
    return;
  }

  deckPlayerPlayButton.textContent = '\u25B6\uFE0F';
  deckPlayerPlayButton.title = 'Play';
  deckPlayerPlayButton.setAttribute('aria-label', 'Play deck');
}

function updateDeckPlayerSummary() {
  if (!deckPlayerSummary) {
    return;
  }

  if (!deckPlayerExpanded) {
    deckPlayerSummary.textContent = 'Deck Builder is off.';
    return;
  }

  deckPlayerSummary.textContent = '';
}

function setDeckPlayerExpanded(expanded) {
  deckPlayerExpanded = expanded;

  if (!deckPlayerPanel || !deckPlayerToggle) {
    return;
  }

  deckPlayerPanel.hidden = !expanded;
  deckPlayerToggle.setAttribute('aria-expanded', String(expanded));
  deckPlayerToggle.setAttribute('aria-label', expanded ? 'Turn Deck Builder off' : 'Turn Deck Builder on');

  if (!expanded) {
    stopDeckPlayer();
    clearActivePatternItems();
    if (deckPlayerStatus) {
      deckPlayerStatus.textContent = '';
    }
  }

  updateDeckPlayerSummary();
}

function startDeckPlayer() {
  if (!deckPlayerPlayButton || deckPlayerTimerId !== null) {
    return;
  }

  deckPlayerPlayButton.textContent = '\u23F8\uFE0F';
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
      source: element.renderSource,
      slopeIndex: index
    })),
    grid: gridPatternItems.map((row) =>
      row.map((element) => ({
        element,
        source: element.renderSource,
        row: Number(element.dataset.row),
        column: Number(element.dataset.column)
      }))
    )
  };
}

function updatePatternImageManagementState() {
  if (!deckPatternElement) {
    return;
  }

  for (const button of deckPatternElement.querySelectorAll('.deck-pattern-item .preview-remove-button')) {
    button.hidden = !managePatternImages;
  }
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

async function renderDeckPlayerCard(slopeItems, grid, s, r, cardNumber) {
  if (!previewSampleCardTarget) {
    return;
  }

  clearActivePatternItems();

  const selectedItems = getDeckPlayerCardItems(slopeItems, grid, s, r);
  for (const item of selectedItems) {
    item.element.classList.add('is-active');
  }

  await drawImagesOnSquareTarget(
    previewSampleCardTarget,
    selectedItems.map((item) => item.source),
    tempDeck.generationOptions,
    { randomSeed: deriveRenderSeed(tempDeck.pattern, cardNumber) }
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

  if (deckPlayerSlider) {
    deckPlayerSlider.value = String(deckPlayerIndex + 1);
  }

  if (!deckPlayerExpanded || !previewSampleCardTarget) {
    clearActivePatternItems();
    updateDeckPlayerSummary();
    return;
  }

  const step = getDeckPlayerStepAt(tempDeck.symbolsPerCard, deckPlayerIndex);
  const { slopeItems, grid } = getDeckPlayerPatternItems();
  await renderDeckPlayerCard(slopeItems, grid, step.s, step.r, deckPlayerIndex + 1);
  if (deckPlayerStatus) {
    deckPlayerStatus.textContent = getDeckPlayerStatusText(step, deckPlayerIndex + 1, cardCount);
  }
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
  slopePatternItems = [];
  gridPatternItems = [];

  if (deckPatternElement) {
    deckPatternElement.innerHTML = '';
  }
  if (selectedImagesElement) {
    selectedImagesElement.innerHTML = '';
  }
  if (extraImagesSection) {
    extraImagesSection.hidden = true;
  }

  const n = tempDeck.symbolsPerCard;
  const p = n - 1;
  const requiredCount = getRequiredImageCount();

  if (deckPatternElement) {
    applyPatternScale();

    const canvas = document.createElement('div');
    canvas.className = 'deck-pattern-canvas';

    const slopeLabel = document.createElement('h3');
    slopeLabel.className = 'h6 mb-2';
    slopeLabel.textContent = `Slope Images (${n})`;
    canvas.appendChild(slopeLabel);

    const slopeRow = document.createElement('div');
    slopeRow.className = 'deck-pattern-row deck-pattern-row--slope';
    for (let slot = 0; slot < n; slot += 1) {
      const slotTitle = slot < p ? String(slot) : 'infinity';
      const { rise, run } = getDeckPlayerSlopeComponents(slot, p);
      const topLabel = `(${rise}/${run})\n\u2248${formatSlopeAngleDegrees(rise, run)}\u00B0`;
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

    const gridLabel = document.createElement('h3');
    gridLabel.className = 'h6 mb-2';
    gridLabel.textContent = `Grid Images (${p} x ${p} = ${p * p})`;
    canvas.appendChild(gridLabel);

    const gridRows = [];
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
      gridRows.push(rowElement);
    }

    for (let row = gridRows.length - 1; row >= 0; row -= 1) {
      canvas.appendChild(gridRows[row]);
    }

    const manageImagesWrap = document.createElement('div');
    manageImagesWrap.className = 'form-check mt-3';

    const manageImagesCheckbox = document.createElement('input');
    manageImagesCheckbox.type = 'checkbox';
    manageImagesCheckbox.className = 'form-check-input';
    manageImagesCheckbox.id = 'manage-pattern-images-checkbox';
    manageImagesCheckbox.checked = managePatternImages;
    manageImagesCheckbox.addEventListener('change', () => {
      managePatternImages = manageImagesCheckbox.checked;
      updatePatternImageManagementState();
    });

    const manageImagesLabel = document.createElement('label');
    manageImagesLabel.className = 'form-check-label';
    manageImagesLabel.htmlFor = 'manage-pattern-images-checkbox';
    manageImagesLabel.textContent = 'Manage Images';

    manageImagesWrap.append(manageImagesCheckbox, manageImagesLabel);
    canvas.appendChild(manageImagesWrap);

    deckPatternElement.appendChild(canvas);
    updatePatternImageManagementState();
  }

  if (selectedImagesElement && extraImagesSection) {
    const extraRefs = tempDeck.selectedImageRefs.slice(requiredCount);
    if (extraRefs.length > 0) {
      extraImagesSection.hidden = false;

      for (let index = 0; index < extraRefs.length; index += 1) {
        const refIndex = requiredCount + index;
        const ref = extraRefs[index];
        const label = describeImageRef(ref, userImages, webImages);
        const imageSource = resolveImageSrc(ref, (refIndex % 133) + 1);
        selectedImagesElement.appendChild(
          createImageTile({
            src: imageSource.src,
            mask: imageSource.mask,
            label: '',
            tooltipText: label,
            buttonText: 'Remove',
            buttonVariant: 'outline-danger',
            previewGenerationOptions: getPatternPreviewGenerationOptions(),
            onClick: async () => {
              tempDeck = markDirty(removeImageRefAtIndex(tempDeck, refIndex));
              await saveTempDeck(tempDeck);
              await renderSelectedImages();
            }
          })
        );
      }
    }
  }

  if (deckPlayerSlider) {
    const cardCount = getDeckPlayerCardCount(tempDeck.symbolsPerCard);
    deckPlayerSlider.min = '1';
    deckPlayerSlider.max = String(cardCount);
    await renderDeckPlayerAt(Math.min(deckPlayerIndex, cardCount - 1));
  }

  updateHeader();

  if (!isDeckBuilderPage && deckCardsElement) {
    await waitForNextPaint();
  }

  await deckCardGallery.render({ tempDeck, userImages, webImages });
}

function getPatternPreviewGenerationOptions() {
  return createPreviewGenerationOptions(tempDeck.generationOptions.sourceSamplingBias);
}

async function renderPatternItemPreview(targetElement, imageSource) {
  try {
    await drawImagesOnSquareTarget(targetElement, [imageSource], getPatternPreviewGenerationOptions());
  } catch {
    targetElement.textContent = 'Preview unavailable.';
  }
}

window.addEventListener('resize', () => {
  applyPatternScale();
  if (deckPlayerExpanded && deckPlayerSlider) {
    void renderDeckPlayerAt(deckPlayerIndex);
  }
});

if (deckPlayerSlider) {
  deckPlayerSlider.addEventListener('input', () => {
    stopDeckPlayer();
    void renderDeckPlayerAt(Number(deckPlayerSlider.value) - 1);
  });
}

if (deckPlayerRewindButton) {
  deckPlayerRewindButton.addEventListener('click', () => {
    stopDeckPlayer();
    void renderDeckPlayerAt(0);
  });
}

if (deckPlayerBackButton) {
  deckPlayerBackButton.addEventListener('click', () => {
    stopDeckPlayer();
    void stepDeckPlayer(-1);
  });
}

if (deckPlayerPlayButton) {
  deckPlayerPlayButton.addEventListener('click', () => {
    if (deckPlayerTimerId !== null) {
      stopDeckPlayer();
      return;
    }

    startDeckPlayer();
  });
}

if (deckPlayerForwardButton) {
  deckPlayerForwardButton.addEventListener('click', () => {
    stopDeckPlayer();
    void stepDeckPlayer(1);
  });
}

if (deckPlayerEndButton) {
  deckPlayerEndButton.addEventListener('click', () => {
    stopDeckPlayer();
    void renderDeckPlayerAt(getDeckPlayerCardCount(tempDeck.symbolsPerCard) - 1);
  });
}

if (deckPlayerToggle) {
  deckPlayerToggle.addEventListener('click', () => {
    const nextExpanded = !deckPlayerExpanded;
    setDeckPlayerExpanded(nextExpanded);
    if (nextExpanded) {
      void renderDeckPlayerAt(deckPlayerIndex);
    }
  });
}

[userImages, webImages] = await Promise.all([
  repository.listUserImages(),
  repository.listWebImages()
]);

window.addEventListener('beforeunload', () => {
  clearObjectUrls();
  deckCardGallery.dispose();
});

setDeckPlayerExpanded(false);
await renderSelectedImages();




