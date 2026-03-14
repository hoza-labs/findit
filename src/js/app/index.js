import { createEmptyTempDeck, createTempDeckFromSavedDeck } from '../modules/deckSession.js';
import { createIndexedDbRepository } from '../modules/indexedDbRepository.js';
import { renderDeckHeaderAndTitle, renderDeckStatusLine } from '../modules/deckFlowCommon.js';

const repository = createIndexedDbRepository();
const existingDecksElement = document.querySelector('#existing-decks');
const newDeckButton = document.querySelector('#new-deck-button');
const deckStatusLine = document.querySelector('#deck-status-line');
const pageHeading = document.querySelector('header h1');

const saveChangesDialog = document.querySelector('#save-changes-dialog');
const saveChangesYesButton = document.querySelector('#save-changes-yes');
const saveChangesNoButton = document.querySelector('#save-changes-no');
const saveChangesCancelButton = document.querySelector('#save-changes-cancel');
const deleteDeckDialog = document.querySelector('#delete-deck-dialog');
const deleteDeckMessage = document.querySelector('#delete-deck-message');
const deleteDeckCancelButton = document.querySelector('#delete-deck-cancel');
const deleteDeckConfirmButton = document.querySelector('#delete-deck-confirm');

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

async function promptDeleteDeck(name) {
  if (typeof deleteDeckDialog.showModal !== 'function') {
    return window.confirm(`Are you sure you want to delete deck "${name}"? This action cannot be undone.`);
  }

  deleteDeckMessage.textContent = `Are you sure you want to delete deck "${name}"? This action cannot be undone.`;

  return new Promise((resolve) => {
    let resolved = false;

    function cleanup() {
      deleteDeckCancelButton.removeEventListener('click', onCancel);
      deleteDeckConfirmButton.removeEventListener('click', onConfirm);
      deleteDeckDialog.removeEventListener('cancel', onDialogCancel);
      deleteDeckDialog.removeEventListener('close', onDialogClose);
    }

    function finish(value) {
      if (resolved) {
        return;
      }
      resolved = true;
      cleanup();
      if (deleteDeckDialog.open) {
        deleteDeckDialog.close();
      }
      resolve(value);
    }

    function onCancel() {
      finish(false);
    }

    function onConfirm() {
      finish(true);
    }

    function onDialogCancel(event) {
      event.preventDefault();
      finish(false);
    }

    function onDialogClose() {
      finish(false);
    }

    deleteDeckCancelButton.addEventListener('click', onCancel);
    deleteDeckConfirmButton.addEventListener('click', onConfirm);
    deleteDeckDialog.addEventListener('cancel', onDialogCancel);
    deleteDeckDialog.addEventListener('close', onDialogClose);

    deleteDeckDialog.showModal();
  });
}

async function promptSaveChoice() {
  if (typeof saveChangesDialog.showModal !== 'function') {
    const response = (window.prompt('Do you want to save changes first? (yes/no/cancel)', 'yes') ?? 'cancel').trim().toLowerCase();
    if (response === 'yes' || response === 'y') {
      return 'yes';
    }
    if (response === 'no' || response === 'n') {
      return 'no';
    }
    return 'cancel';
  }

  return new Promise((resolve) => {
    let resolved = false;

    function cleanup() {
      saveChangesYesButton.removeEventListener('click', onYes);
      saveChangesNoButton.removeEventListener('click', onNo);
      saveChangesCancelButton.removeEventListener('click', onCancel);
      saveChangesDialog.removeEventListener('cancel', onDialogCancel);
      saveChangesDialog.removeEventListener('close', onDialogClose);
    }

    function finish(value) {
      if (resolved) {
        return;
      }
      resolved = true;
      cleanup();
      if (saveChangesDialog.open) {
        saveChangesDialog.close();
      }
      resolve(value);
    }

    function onYes() {
      finish('yes');
    }

    function onNo() {
      finish('no');
    }

    function onCancel() {
      finish('cancel');
    }

    function onDialogCancel(event) {
      event.preventDefault();
      finish('cancel');
    }

    function onDialogClose() {
      finish('cancel');
    }

    saveChangesYesButton.addEventListener('click', onYes);
    saveChangesNoButton.addEventListener('click', onNo);
    saveChangesCancelButton.addEventListener('click', onCancel);
    saveChangesDialog.addEventListener('cancel', onDialogCancel);
    saveChangesDialog.addEventListener('close', onDialogClose);

    saveChangesDialog.showModal();
  });
}

async function maybeSaveBeforeNavigate(nextAction, deckName = '') {
  const currentTempDeck = await repository.getTempDeck();
  if (!currentTempDeck?.dirty) {
    return 'no';
  }

  const choice = await promptSaveChoice();
  if (choice === 'cancel') {
    return 'cancel';
  }

  if (choice === 'yes') {
    const params = new URLSearchParams({
      saveFirst: '1',
      after: nextAction
    });

    if (deckName) {
      params.set('name', deckName);
    }

    window.location.href = `./save.html?${params.toString()}`;
  }

  return choice;
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

    const text = document.createElement('a');
    text.href = '#';
    text.className = 'link-primary text-decoration-none';
    text.textContent = `${deck.name} (n=${deck.symbolsPerCard}, images=${deck.imageRefs.length})`;
    text.addEventListener('click', (event) => {
      event.preventDefault();
      void (async () => {
        const choice = await maybeSaveBeforeNavigate('open', deck.name);
        if (choice === 'yes' || choice === 'cancel') {
          return;
        }
        await openExistingDeck(deck.name);
      })();
    });

    const actionGroup = document.createElement('div');
    actionGroup.className = 'd-flex gap-2';

    const openButton = document.createElement('button');
    openButton.className = 'btn btn-sm btn-outline-primary';
    openButton.type = 'button';
    openButton.textContent = 'Open';
    openButton.addEventListener('click', () => {
      void (async () => {
        const choice = await maybeSaveBeforeNavigate('open', deck.name);
        if (choice === 'yes' || choice === 'cancel') {
          return;
        }
        await openExistingDeck(deck.name);
      })();
    });

    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-sm btn-outline-danger';
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => {
      void (async () => {
        const confirmed = await promptDeleteDeck(deck.name);
        if (!confirmed) {
          return;
        }
        await repository.deleteDeck(deck.name);
        await renderExistingDecks();
      })();
    });

    actionGroup.append(openButton, deleteButton);
    row.append(text, actionGroup);
    existingDecksElement.appendChild(row);
  }
}

newDeckButton.addEventListener('click', () => {
  void (async () => {
    const choice = await maybeSaveBeforeNavigate('new');
    if (choice === 'yes' || choice === 'cancel') {
      return;
    }
    await openNewDeck();
  })();
});

const tempDeck = await repository.getTempDeck();
const normalizedTempDeck = tempDeck ?? createEmptyTempDeck();
renderDeckStatusLine(deckStatusLine, normalizedTempDeck);
renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'Home', tempDeck: normalizedTempDeck });
await renderExistingDecks();
