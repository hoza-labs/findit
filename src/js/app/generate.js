import { markDirty, markSaved, normalizePlayOptions } from '../modules/deckSession.js';
import { loadTempDeckOrDefault, renderDeckHeaderAndTitle, renderDeckStatusLine, repository, saveTempDeck } from '../modules/deckFlowCommon.js';
import { getDeckPlayerCardCount } from '../modules/deckPlayer.js';

const pageHeading = document.querySelector('header h1');
const deckStatusLine = document.querySelector('#deck-status-line');
const saveButton = document.querySelector('#save-button');
const saveAsButton = document.querySelector('#save-as-button');
const playOptionsForm = document.querySelector('#play-options-form');
const playButton = document.querySelector('#play-button');
const playOptionsMessage = document.querySelector('#play-options-message');

const saveAsDialog = document.querySelector('#save-as-dialog');
const saveAsForm = document.querySelector('#save-as-form');
const saveAsNameInput = document.querySelector('#save-as-name');
const saveAsCancelButton = document.querySelector('#save-as-cancel');
const existingDeckNamesElement = document.querySelector('#existing-deck-names');

let tempDeck = await loadTempDeckOrDefault();

function updateHeader() {
  renderDeckStatusLine(deckStatusLine, tempDeck);
  renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'Generate', tempDeck });
  saveButton.disabled = !tempDeck.deckName;
}

function renderPlayOptions() {
  for (const element of playOptionsForm.elements) {
    if (!(element instanceof HTMLInputElement)) {
      continue;
    }

    const name = element.name;
    if (!name) {
      continue;
    }

    element.value = tempDeck.playOptions[name] ?? '';
  }
}

function getPlayOptionsFromForm() {
  const formData = new FormData(playOptionsForm);
  return normalizePlayOptions({
    cardsToShowMin: formData.get('cardsToShowMin'),
    cardsToShowMax: formData.get('cardsToShowMax'),
    countdownSeconds: formData.get('countdownSeconds'),
    handsToPlay: formData.get('handsToPlay'),
    playerNames: formData.get('playerNames')
  });
}

function getPlayOptionsValidationMessage(playOptions) {
  const deckCardCount = getDeckPlayerCardCount(tempDeck.symbolsPerCard);
  const min = playOptions.cardsToShowMin ? Number.parseInt(playOptions.cardsToShowMin, 10) : null;
  const max = playOptions.cardsToShowMax ? Number.parseInt(playOptions.cardsToShowMax, 10) : null;

  if (min !== null && min > deckCardCount) {
    return `Minimum cards to show cannot exceed ${deckCardCount}.`;
  }

  if (max !== null && max > deckCardCount) {
    return `Maximum cards to show cannot exceed ${deckCardCount}.`;
  }

  if (min !== null && max !== null && min > max) {
    return 'Minimum cards to show cannot be greater than maximum cards to show.';
  }

  return '';
}

async function persistPlayOptions() {
  const playOptions = getPlayOptionsFromForm();
  const didChange = JSON.stringify(playOptions) !== JSON.stringify(tempDeck.playOptions);

  if (didChange) {
    tempDeck = markDirty({ ...tempDeck, playOptions });
    await saveTempDeck(tempDeck);
    updateHeader();
  }

  const validationMessage = getPlayOptionsValidationMessage(playOptions);
  playOptionsMessage.textContent = validationMessage || 'Play options saved in browser storage.';
  playButton.disabled = Boolean(validationMessage);
  return { playOptions, validationMessage };
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
    playOptions: { ...tempDeck.playOptions },
    updatedAt: new Date().toISOString()
  });

  tempDeck = markSaved({ ...tempDeck, deckName: name });
  await saveTempDeck(tempDeck);
  updateHeader();
  playOptionsMessage.textContent = 'Deck saved.';
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

playOptionsForm.addEventListener('input', () => {
  void persistPlayOptions();
});

playButton.addEventListener('click', () => {
  void (async () => {
    const { validationMessage } = await persistPlayOptions();
    if (validationMessage) {
      return;
    }

    const opened = window.open('./play.html', '_blank', 'noopener');
    if (!opened) {
      playOptionsMessage.textContent = 'The play window was blocked by the browser.';
    }
  })();
});

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

renderPlayOptions();
updateHeader();
const initialValidationMessage = getPlayOptionsValidationMessage(tempDeck.playOptions);
playOptionsMessage.textContent = initialValidationMessage || 'Play options are ready.';
playButton.disabled = Boolean(initialValidationMessage);
