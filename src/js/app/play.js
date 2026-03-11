import { drawImagesOnSquareTarget } from '../modules/cardCanvasRenderer.js';
import { loadTempDeckOrDefault, repository } from '../modules/deckFlowCommon.js';
import { getDeckPlayerCardCount, getDeckPlayerCardItems, getDeckPlayerStepAt } from '../modules/deckPlayer.js';

const playSubtitle = document.querySelector('#play-subtitle');
const handStatus = document.querySelector('#hand-status');
const countdownStatus = document.querySelector('#countdown-status');
const playerStatus = document.querySelector('#player-status');
const playCardGrid = document.querySelector('#play-card-grid');
const playBoardEmpty = document.querySelector('#play-board-empty');
const nextHandButton = document.querySelector('#next-hand-button');
const restartButton = document.querySelector('#restart-button');

const tempDeck = await loadTempDeckOrDefault();
const userImages = await repository.listUserImages();
const webImages = await repository.listWebImages();

let objectUrls = [];
let countdownTimerId = null;
const state = {
  handNumber: 0,
  startedAtMs: 0
};

function clearObjectUrls() {
  for (const url of objectUrls) {
    URL.revokeObjectURL(url);
  }
  objectUrls = [];
}

function stopCountdown() {
  if (countdownTimerId !== null) {
    window.clearInterval(countdownTimerId);
    countdownTimerId = null;
  }
}

function resolveImageSrc(ref, placeholderNumber) {
  if (ref?.source === 'standard') {
    return `./assets/deck-images/${ref.id}`;
  }

  if (ref?.source === 'user') {
    const userImage = userImages.find((item) => item.id === ref.id);
    if (!userImage) {
      return `./assets/placeholder-images/${placeholderNumber}.png`;
    }

    const url = URL.createObjectURL(userImage.blob);
    objectUrls.push(url);
    return url;
  }

  if (ref?.source === 'web') {
    const webImage = webImages.find((item) => item.id === ref.id);
    return webImage ? webImage.url : `./assets/placeholder-images/${placeholderNumber}.png`;
  }

  return `./assets/placeholder-images/${placeholderNumber}.png`;
}

function getPatternSources() {
  clearObjectUrls();

  const n = tempDeck.symbolsPerCard;
  const order = n - 1;
  const slopeItems = [];
  const grid = [];

  for (let slopeIndex = 0; slopeIndex < n; slopeIndex += 1) {
    slopeItems.push(resolveImageSrc(tempDeck.selectedImageRefs[slopeIndex], slopeIndex + 1));
  }

  for (let row = 0; row < order; row += 1) {
    const gridRow = [];
    for (let column = 0; column < order; column += 1) {
      const slotIndex = n + row * order + column;
      gridRow.push(resolveImageSrc(tempDeck.selectedImageRefs[slotIndex], slotIndex + 1));
    }
    grid.push(gridRow);
  }

  return { slopeItems, grid };
}

function parseOptionalPositiveInteger(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getPlayerNames() {
  const rawNames = tempDeck.playOptions?.playerNames ?? '';
  return rawNames
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getHandSettings() {
  const cardCount = getDeckPlayerCardCount(tempDeck.symbolsPerCard);
  const parsedMin = parseOptionalPositiveInteger(tempDeck.playOptions?.cardsToShowMin);
  const parsedMax = parseOptionalPositiveInteger(tempDeck.playOptions?.cardsToShowMax);
  const min = Math.max(1, Math.min(parsedMin ?? 2, cardCount));
  const max = Math.max(min, Math.min(parsedMax ?? min, cardCount));
  const countdownSeconds = parseOptionalPositiveInteger(tempDeck.playOptions?.countdownSeconds) ?? 0;
  const lengthOfPlay = parseOptionalPositiveInteger(tempDeck.playOptions?.lengthOfPlay);
  const lengthOfPlayUnits = tempDeck.playOptions?.lengthOfPlayUnits ?? 'hands';

  return {
    cardCount,
    minCardsToShow: min,
    maxCardsToShow: max,
    countdownSeconds,
    lengthOfPlay,
    lengthOfPlayUnits
  };
}

function getRandomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickUniqueCardIndices(cardCount, cardsToShow) {
  const indices = Array.from({ length: cardCount }, (_, index) => index);

  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices.slice(0, cardsToShow);
}

function updateHeader(players, settings) {
  const deckName = tempDeck.deckName || '(new untitled deck)';
  const limitText = describePlayLimit(settings);
  const playersText = players.length > 0 ? `${players.length} player${players.length === 1 ? '' : 's'}` : 'no named players';
  playSubtitle.textContent = `${deckName} | n=${tempDeck.symbolsPerCard} | ${limitText} | ${playersText}`;
  document.title = `FindIt | Play | ${deckName}`;
}

function renderCompletion(settings, players) {
  nextHandButton.disabled = true;
  handStatus.textContent = getCompletionText(settings);
  countdownStatus.textContent = settings.countdownSeconds > 0 ? 'Countdown stopped.' : 'Manual play only.';
  playerStatus.textContent = players.length > 0 ? `Players: ${players.join(', ')}` : 'No player names configured.';
}

function describePlayLimit(settings) {
  if (!settings.lengthOfPlay) {
    return 'no time or hand limit';
  }

  if (settings.lengthOfPlayUnits === 'decks') {
    return `${settings.lengthOfPlay} deck${settings.lengthOfPlay === 1 ? '' : 's'}`;
  }

  if (settings.lengthOfPlayUnits === 'minutes') {
    return `${settings.lengthOfPlay} minute${settings.lengthOfPlay === 1 ? '' : 's'}`;
  }

  return `${settings.lengthOfPlay} hand${settings.lengthOfPlay === 1 ? '' : 's'}`;
}

function getCompletionText(settings) {
  if (!settings.lengthOfPlay) {
    return 'Finished.';
  }

  if (settings.lengthOfPlayUnits === 'decks') {
    return `Finished ${settings.lengthOfPlay} deck${settings.lengthOfPlay === 1 ? '' : 's'} of play.`;
  }

  if (settings.lengthOfPlayUnits === 'minutes') {
    return `Finished ${settings.lengthOfPlay} minute${settings.lengthOfPlay === 1 ? '' : 's'} of play.`;
  }

  return `Finished ${settings.lengthOfPlay} hand${settings.lengthOfPlay === 1 ? '' : 's'}.`;
}

function hasReachedPlayLimit(settings) {
  if (!settings.lengthOfPlay) {
    return false;
  }

  if (settings.lengthOfPlayUnits === 'minutes') {
    return Date.now() - state.startedAtMs >= settings.lengthOfPlay * 60_000;
  }

  const totalHandsAllowed = settings.lengthOfPlayUnits === 'decks'
    ? settings.lengthOfPlay * settings.cardCount
    : settings.lengthOfPlay;

  return state.handNumber >= totalHandsAllowed;
}

function getCurrentHandStatus(settings, cardsToShow) {
  if (!settings.lengthOfPlay) {
    return `Hand ${state.handNumber}. Showing ${cardsToShow} card${cardsToShow === 1 ? '' : 's'}.`;
  }

  if (settings.lengthOfPlayUnits === 'decks') {
    const totalHandsAllowed = settings.lengthOfPlay * settings.cardCount;
    return `Hand ${state.handNumber} of ${totalHandsAllowed}. Showing ${cardsToShow} card${cardsToShow === 1 ? '' : 's'}.`;
  }

  if (settings.lengthOfPlayUnits === 'minutes') {
    const elapsedSeconds = Math.floor((Date.now() - state.startedAtMs) / 1000);
    const totalSeconds = settings.lengthOfPlay * 60;
    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
    return `Hand ${state.handNumber}. Showing ${cardsToShow} card${cardsToShow === 1 ? '' : 's'}. ${remainingSeconds}s remaining.`;
  }

  return `Hand ${state.handNumber} of ${settings.lengthOfPlay}. Showing ${cardsToShow} card${cardsToShow === 1 ? '' : 's'}.`;
}

async function renderHand() {
  const players = getPlayerNames();
  const settings = getHandSettings();
  if (state.startedAtMs === 0) {
    state.startedAtMs = Date.now();
  }
  updateHeader(players, settings);
  nextHandButton.disabled = false;

  if (hasReachedPlayLimit(settings)) {
    renderCompletion(settings, players);
    return;
  }

  state.handNumber += 1;
  playCardGrid.innerHTML = '';
  playBoardEmpty.hidden = true;

  const cardsToShow = getRandomInteger(settings.minCardsToShow, settings.maxCardsToShow);
  const pattern = getPatternSources();
  const cardIndices = pickUniqueCardIndices(settings.cardCount, cardsToShow);
  const currentPlayer = players.length > 0 ? players[(state.handNumber - 1) % players.length] : '';

  handStatus.textContent = getCurrentHandStatus(settings, cardsToShow);
  playerStatus.textContent = currentPlayer
    ? `Players: ${players.join(', ')} | Current: ${currentPlayer}`
    : 'No player names configured.';

  for (let i = 0; i < cardIndices.length; i += 1) {
    const cardIndex = cardIndices[i];
    const step = getDeckPlayerStepAt(tempDeck.symbolsPerCard, cardIndex);
    const sources = getDeckPlayerCardItems(pattern.slopeItems, pattern.grid, step.s, step.r);

    const card = document.createElement('section');
    card.className = 'play-card card shadow-sm';

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    const title = document.createElement('h2');
    title.className = 'h6 mb-2';
    title.textContent = `Card ${cardIndex + 1}`;

    const target = document.createElement('div');
    target.className = 'sample-card-target play-card-target';

    cardBody.append(title, target);
    card.appendChild(cardBody);
    playCardGrid.appendChild(card);

    await drawImagesOnSquareTarget(target, sources);
  }

  stopCountdown();
  if (settings.countdownSeconds > 0 && !hasReachedPlayLimit(settings)) {
    let remaining = settings.countdownSeconds;
    countdownStatus.textContent = `Auto-advancing in ${remaining}s.`;
    countdownTimerId = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        stopCountdown();
        if (hasReachedPlayLimit(settings)) {
          renderCompletion(settings, players);
          return;
        }
        countdownStatus.textContent = 'Advancing...';
        void renderHand();
        return;
      }

      countdownStatus.textContent = `Auto-advancing in ${remaining}s.`;
    }, 1000);
  } else if (settings.countdownSeconds > 0) {
    countdownStatus.textContent = 'Final hand. Countdown complete.';
  } else {
    countdownStatus.textContent = 'No countdown. Advance manually.';
  }
}

function showEmptyState(message) {
  playCardGrid.innerHTML = '';
  playBoardEmpty.hidden = false;
  playBoardEmpty.textContent = message;
  handStatus.textContent = '';
  countdownStatus.textContent = '';
  playerStatus.textContent = '';
  nextHandButton.disabled = true;
}

nextHandButton.addEventListener('click', () => {
  void renderHand();
});

restartButton.addEventListener('click', () => {
  stopCountdown();
  state.handNumber = 0;
  state.startedAtMs = 0;
  nextHandButton.disabled = false;
  void renderHand();
});

window.addEventListener('beforeunload', () => {
  stopCountdown();
  clearObjectUrls();
});

if (tempDeck.selectedImageRefs.length === 0) {
  showEmptyState('This deck has no selected images yet. Add images before using Play.');
} else {
  await renderHand();
}
