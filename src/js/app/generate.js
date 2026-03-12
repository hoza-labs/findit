import { markDirty, normalizePlayOptions } from '../modules/deckSession.js';
import { loadTempDeckOrDefault, renderDeckHeaderAndTitle, renderDeckStatusLine, saveTempDeck } from '../modules/deckFlowCommon.js';
import { getDeckPlayerCardCount } from '../modules/deckPlayer.js';
import { isValidPositiveNumberInput, isValidPositiveWholeNumberInput } from '../modules/playNumberValidation.js';

const pageHeading = document.querySelector('header h1');
const deckStatusLine = document.querySelector('#deck-status-line');
const playOptionsForm = document.querySelector('#play-options-form');
const playButton = document.querySelector('#play-button');
const playOptionsMessage = document.querySelector('#play-options-message');
const readyMessageHtml = 'Play options are ready and we\'ll help you keep score. You\'ll have to invent your own rules or (better yet!) support the fine folks who invented <a href="https://www.spotitgame.com/" target="_blank" rel="noopener noreferrer">Spot It!</a>';

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
  const minRaw = getFieldValue('cardsToShowMin');
  const maxRaw = getFieldValue('cardsToShowMax');
  const countdownRaw = getFieldValue('countdownSeconds');
  const lengthRaw = getFieldValue('lengthOfPlay');
  const min = playOptions.cardsToShowMin ? Number.parseInt(playOptions.cardsToShowMin, 10) : null;
  const max = playOptions.cardsToShowMax ? Number.parseInt(playOptions.cardsToShowMax, 10) : null;

  if (minRaw && !/^\d+$/.test(minRaw)) {
    return 'Minimum cards to show must be a whole number.';
  }

  if (maxRaw && !/^\d+$/.test(maxRaw)) {
    return 'Maximum cards to show must be a whole number.';
  }

  if (countdownRaw && !isValidPositiveWholeNumberInput(countdownRaw)) {
    return 'Countdown in seconds must be a valid number.';
  }

  if (lengthRaw && !isValidPositiveNumberInput(lengthRaw)) {
    return 'Length of play must be a valid number.';
  }

  if (min !== null && min > deckCardCount) {
    return `Minimum cards to show cannot exceed ${deckCardCount}.`;
  }

  if (max !== null && max > deckCardCount) {
    return `Maximum cards to show cannot exceed ${deckCardCount}.`;
  }

  if (min !== null && max !== null && min > max) {
    return 'Minimum cards to show cannot be greater than maximum cards to show.';
  }

  if (playOptions.cardsToShowMin === '') {
    return 'Minimum cards to show must be at least 1.';
  }

  if (playOptions.cardsToShowMax === '') {
    return 'Maximum cards to show must be at least 1.';
  }

  if (lengthRaw && playOptions.lengthOfPlay === '') {
    return 'Length of play must be greater than 0.';
  }

  if (countdownRaw && playOptions.countdownSeconds === '') {
    return 'Countdown in seconds must be at least 1.';
  }

  return '';
}

function getFieldValue(name) {
  const field = playOptionsForm.elements.namedItem(name);
  return field && 'value' in field ? field.value.trim() : '';
}

function renderPlayOptionsMessage(message, { allowHtml = false } = {}) {
  if (allowHtml) {
    playOptionsMessage.innerHTML = message;
    return;
  }

  playOptionsMessage.textContent = message;
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
  renderPlayOptionsMessage(validationMessage || readyMessageHtml, { allowHtml: !validationMessage });
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

    window.location.assign('./playing.html');
  })();
});

renderPlayOptions();
updateHeader();
const initialValidationMessage = getPlayOptionsValidationMessage(tempDeck.playOptions);
renderPlayOptionsMessage(initialValidationMessage || readyMessageHtml, { allowHtml: !initialValidationMessage });
playButton.disabled = Boolean(initialValidationMessage);
