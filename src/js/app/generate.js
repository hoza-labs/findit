import { markDirty, normalizePlayOptions } from '../modules/deckSession.js';
import { loadTempDeckOrDefault, renderDeckHeaderAndTitle, renderDeckStatusLine, saveTempDeck } from '../modules/deckFlowCommon.js';
import { getDeckPlayerCardCount } from '../modules/deckPlayer.js';
import { isValidPositiveNumberInput, isValidPositiveWholeNumberInput } from '../modules/playNumberValidation.js';

const pageHeading = document.querySelector('header h1');
const deckStatusLine = document.querySelector('#deck-status-line');
const playOptionsForm = document.querySelector('#play-options-form');
const playButton = document.querySelector('#play-button');
const playOptionsMessage = document.querySelector('#play-options-message');
const chaosSelect = document.querySelector('#chaos-select');
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
    cardsToShowCounts: formData.get('cardsToShowCounts'),
    countdownSeconds: formData.get('countdownSeconds'),
    drumrollSeconds: formData.get('drumrollSeconds'),
    chaos: formData.get('chaos'),
    lengthOfPlay: formData.get('lengthOfPlay'),
    lengthOfPlayUnits: formData.get('lengthOfPlayUnits'),
    playerNames: formData.get('playerNames')
  });
}

function getPlayOptionsValidationMessage(playOptions) {
  const deckCardCount = getDeckPlayerCardCount(tempDeck.symbolsPerCard);
  const countsRaw = getFieldValue('cardsToShowCounts');
  const countdownRaw = getFieldValue('countdownSeconds');
  const drumrollRaw = getFieldValue('drumrollSeconds');
  const lengthRaw = getFieldValue('lengthOfPlay');
  const lengthUnits = playOptions.lengthOfPlayUnits;
  const counts = playOptions.cardsToShowCounts
    ? playOptions.cardsToShowCounts.split(',').map((item) => Number.parseInt(item.trim(), 10))
    : [];

  if (!playOptions.cardsToShowCounts) {
    return 'Number of cards to display at once must include at least one whole number.';
  }

  if (countsRaw) {
    const rawParts = countsRaw.split(',').map((item) => item.trim());
    if (rawParts.some((item) => item === '' || !/^\d+$/.test(item))) {
      return 'Number of cards to display at once must be a comma-separated list of whole numbers.';
    }
  }

  if (countdownRaw && !isValidPositiveWholeNumberInput(countdownRaw)) {
    return 'Countdown in seconds must be a valid number.';
  }

  if (drumrollRaw && !isValidPositiveWholeNumberInput(drumrollRaw)) {
    return 'Drumroll seconds must be a valid number.';
  }

  if (lengthRaw) {
    if (lengthUnits === 'minutes' && !isValidPositiveNumberInput(lengthRaw)) {
      return 'Length of play must be a valid number.';
    }

    if ((lengthUnits === 'hands' || lengthUnits === 'decks') && !isValidPositiveWholeNumberInput(lengthRaw)) {
      return 'Length of play must be a positive whole number of hands or decks; fractional minutes are allowed.';
    }
  }

  if (counts.some((count) => !Number.isInteger(count) || count <= 0)) {
    return 'Number of cards to display at once must include only whole numbers greater than 0.';
  }

  if (counts.some((count) => count > deckCardCount)) {
    return `Number of cards to display at once cannot include values above ${deckCardCount}.`;
  }

  if (lengthRaw && playOptions.lengthOfPlay === '') {
    return 'Length of play must be greater than 0.';
  }

  if (countdownRaw && playOptions.countdownSeconds === '') {
    return 'Countdown in seconds must be at least 1.';
  }

  if (drumrollRaw && playOptions.drumrollSeconds === '') {
    return 'Drumroll seconds must be at least 1.';
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

chaosSelect.addEventListener('change', () => {
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


