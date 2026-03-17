import { createEmptyTempDeck, normalizeTempDeck } from './deckSession.js';
import { createIndexedDbRepository } from './indexedDbRepository.js';

export const repository = createIndexedDbRepository();

export async function loadTempDeckOrDefault() {
  const temp = await repository.getTempDeck();
  const normalized = normalizeTempDeck(temp);

  if (!temp) {
    await repository.saveTempDeck(normalized);
  }

  return normalized;
}

export async function saveTempDeck(tempDeck) {
  await repository.saveTempDeck(normalizeTempDeck(tempDeck));
}

export async function resetTempDeck() {
  const empty = createEmptyTempDeck();
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

export function createImageTile({
  src,
  label,
  buttonText,
  onClick,
  buttonVariant = 'outline-primary',
  isSelected = false,
  tooltipText = '',
  menuActions = []
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

  const image = document.createElement('img');
  image.className = 'image-preview';
  image.src = src;
  image.alt = label;
  if (tooltipText) {
    image.title = tooltipText;
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

  imageFrame.appendChild(image);
  tile.append(imageFrame, meta, button);
  // Keep menu as top-most clickable overlay.
  const menu = tile.querySelector('.image-menu');
  if (menu) {
    tile.appendChild(menu);
  }
  return tile;
}
