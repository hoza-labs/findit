import { createEmptyTempDeck, createTempDeckFromSavedDeck } from '../modules/deckSession.js';
import { createIndexedDbRepository } from '../modules/indexedDbRepository.js';
import { renderDeckStatusLine } from '../modules/deckFlowCommon.js';

const repository = createIndexedDbRepository();
const existingDecksElement = document.querySelector('#existing-decks');
const newDeckButton = document.querySelector('#new-deck-button');
const deckStatusLine = document.querySelector('#deck-status-line');

async function openNewDeck() {
  await repository.saveTempDeck(createEmptyTempDeck());
  window.location.href = './basic-info.html';
}

async function openExistingDeck(name) {
  const deck = await repository.getDeck(name);
  if (!deck) {
    return;
  }

  await repository.saveTempDeck(createTempDeckFromSavedDeck(deck));
  window.location.href = './basic-info.html';
}

async function maybeSaveBeforeNavigate(nextAction, deckName = '') {
  const currentTempDeck = await repository.getTempDeck();
  if (!currentTempDeck?.dirty) {
    return false;
  }

  const shouldSaveFirst = window.confirm('Do you want to save changes first?');
  if (!shouldSaveFirst) {
    return false;
  }

  const params = new URLSearchParams({
    saveFirst: '1',
    after: nextAction
  });

  if (deckName) {
    params.set('name', deckName);
  }

  window.location.href = `./preview.html?${params.toString()}`;
  return true;
}

async function renderExistingDecks() {
  const decks = await repository.listDecks();
  existingDecksElement.innerHTML = '';

  if (decks.length === 0) {
    existingDecksElement.textContent = 'No saved decks yet.';
    return;
  }

  for (const deck of decks.sort((a, b) => a.name.localeCompare(b.name))) {
    const row = document.createElement('div');
    row.className = 'selected-ref';

    const text = document.createElement('span');
    text.textContent = `${deck.name} (n=${deck.symbolsPerCard}, images=${deck.imageRefs.length})`;

    const button = document.createElement('button');
    button.className = 'btn btn-sm btn-outline-primary';
    button.type = 'button';
    button.textContent = 'Open';
    button.addEventListener('click', () => {
      void (async () => {
        const redirectedForSave = await maybeSaveBeforeNavigate('open', deck.name);
        if (!redirectedForSave) {
          await openExistingDeck(deck.name);
        }
      })();
    });

    row.append(text, button);
    existingDecksElement.appendChild(row);
  }
}

newDeckButton.addEventListener('click', () => {
  void (async () => {
    const redirectedForSave = await maybeSaveBeforeNavigate('new');
    if (!redirectedForSave) {
      await openNewDeck();
    }
  })();
});

const tempDeck = await repository.getTempDeck();
renderDeckStatusLine(deckStatusLine, tempDeck ?? createEmptyTempDeck());
await renderExistingDecks();
