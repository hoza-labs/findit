import { createEmptyTempDeck, normalizeTempDeck } from './deckSession.js';
import { drawImagesOnSquareTarget } from './cardCanvasRenderer.js';
import { NEUTRAL_PREVIEW_GENERATION_OPTIONS } from './cardGenerationOptions.js';
import { createIndexedDbRepository } from './indexedDbRepository.js';
import { getDefaultPrintOptions } from './printDefaults.js';

export const repository = createIndexedDbRepository();

export async function loadTempDeckOrDefault() {
  const temp = await repository.getTempDeck();
  if (!temp) {
    const empty = createEmptyTempDeck({ printOptions: getDefaultPrintOptions() });
    await repository.saveTempDeck(empty);
    return empty;
  }

  const normalized = normalizeTempDeck(temp);
  if (JSON.stringify(normalized) !== JSON.stringify(temp)) {
    await repository.saveTempDeck(normalized);
  }

  return normalized;
}

export async function saveTempDeck(tempDeck) {
  await repository.saveTempDeck(normalizeTempDeck(tempDeck));
}

export async function resetTempDeck() {
  const empty = createEmptyTempDeck({ printOptions: getDefaultPrintOptions() });
  await repository.saveTempDeck(empty);
  return empty;
}

export function renderDeckStatusLine(targetElement, tempDeck) {
  if (!targetElement) {
    return;
  }

  const deckName = tempDeck.deckName ? tempDeck.deckName : '(new untitled deck)';
  const status = tempDeck.dirty ? '(unsaved changes)' : '(no changes yet)';
  targetElement.textContent = `Current deck: ${deckName} ${status}`;
}

export function renderDeckHeaderAndTitle({ headingElement, pageLabel, tempDeck }) {
  const deckName = tempDeck.deckName ? tempDeck.deckName : '(new untitled deck)';
  const dirtyMarker = tempDeck.dirty ? '*' : '';

  if (headingElement) {
    headingElement.textContent = `${pageLabel} - ${deckName}${dirtyMarker}`;
  }

  document.title = `FindIt | ${pageLabel} | ${deckName}${dirtyMarker}`;
}

export function createPreviewGenerationOptions(sourceSamplingBias = 'balanced') {
  return {
    ...NEUTRAL_PREVIEW_GENERATION_OPTIONS,
    sourceSamplingBias
  };
}

export function createImageTile({
  src,
  mask = undefined,
  label,
  buttonText,
  onClick,
  buttonVariant = 'outline-primary',
  isSelected = false,
  tooltipText = '',
  menuActions = [],
  previewGenerationOptions = NEUTRAL_PREVIEW_GENERATION_OPTIONS
}) {
  const tile = document.createElement('article');
  tile.className = 'image-tile';
  if (isSelected) {
    tile.classList.add('in-deck');
  }
  if (tooltipText) {
    tile.title = tooltipText;
  }

  const imageFrame = document.createElement('div');
  imageFrame.className = 'image-preview-mask';
  imageFrame.setAttribute('role', 'img');
  imageFrame.setAttribute('aria-label', label);
  if (tooltipText) {
    imageFrame.title = tooltipText;
  }

  const meta = document.createElement('div');
  meta.className = 'image-meta';
  meta.textContent = label;
  if (tooltipText) {
    meta.title = tooltipText;
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn btn-sm btn-${buttonVariant} w-100`;
  button.textContent = buttonText;
  button.addEventListener('click', onClick);

  if (menuActions.length > 0) {
    const menu = document.createElement('details');
    menu.className = 'image-menu';

    const summary = document.createElement('summary');
    summary.className = 'image-menu-trigger';
    summary.textContent = '⋮';
    summary.title = 'Image options';
    summary.setAttribute('aria-label', 'Image options');

    const list = document.createElement('div');
    list.className = 'image-menu-list';

    for (const action of menuActions) {
      const actionButton = document.createElement('button');
      actionButton.type = 'button';
      actionButton.className = 'image-menu-item';
      actionButton.textContent = action.label;
      actionButton.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        menu.open = false;
        await action.onClick();
      });
      list.appendChild(actionButton);
    }

    menu.append(summary, list);
    tile.appendChild(menu);
  }

  tile.append(imageFrame, meta, button);
  queueMicrotask(() => {
    void renderTilePreview(imageFrame, src, mask, previewGenerationOptions);
  });
  const menu = tile.querySelector('.image-menu');
  if (menu) {
    tile.appendChild(menu);
  }
  return tile;
}

async function renderTilePreview(targetElement, src, mask, previewGenerationOptions) {
  try {
    await drawImagesOnSquareTarget(targetElement, [{ src, mask }], previewGenerationOptions);
  } catch {
    targetElement.textContent = 'Preview unavailable.';
  }
}
