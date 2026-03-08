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

  const deckName = tempDeck.deckName ? tempDeck.deckName : '(unsaved)';
  const status = tempDeck.dirty ? '(unsaved changes)' : '(no changes yet)';
  targetElement.textContent = `Current deck: ${deckName} ${status}`;
}

export function createImageTile({ src, label, buttonText, onClick }) {
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
  button.textContent = buttonText;
  button.addEventListener('click', onClick);

  tile.append(image, meta, button);
  return tile;
}
