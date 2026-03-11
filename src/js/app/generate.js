import { markDirty, normalizePlayOptions } from '../modules/deckSession.js';
import { loadTempDeckOrDefault, renderDeckHeaderAndTitle, renderDeckStatusLine, saveTempDeck } from '../modules/deckFlowCommon.js';
import { getDeckPlayerCardCount } from '../modules/deckPlayer.js';

const pageHeading = document.querySelector('header h1');
const deckStatusLine = document.querySelector('#deck-status-line');
const playOptionsForm = document.querySelector('#play-options-form');
const playButton = document.querySelector('#play-button');
const playOptionsMessage = document.querySelector('#play-options-message');

let tempDeck = await loadTempDeckOrDefault();

function updateHeader() {
  renderDeckStatusLine(deckStatusLine, tempDeck);
  renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'Play!', tempDeck });
}

function renderPlayOptions() {
  for (const element of playOptionsForm.elements) {
    if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLSelectElement)) {
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
    lengthOfPlay: formData.get('lengthOfPlay'),
    lengthOfPlayUnits: formData.get('lengthOfPlayUnits'),
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

renderPlayOptions();
updateHeader();
const initialValidationMessage = getPlayOptionsValidationMessage(tempDeck.playOptions);
playOptionsMessage.textContent = initialValidationMessage || 'Play options are ready.';
playButton.disabled = Boolean(initialValidationMessage);
