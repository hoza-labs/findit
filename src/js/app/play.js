import { drawImagesOnSquareTarget } from '../modules/cardCanvasRenderer.js';
import { loadTempDeckOrDefault, repository } from '../modules/deckFlowCommon.js';
import { getDeckPlayerCardCount, getDeckPlayerCardItems, getDeckPlayerStepAt } from '../modules/deckPlayer.js';
import {
  getCardsToDrawForHand,
  getCurrentDeckNumber,
  getDeckLimitedHandStatus,
  isFinalDeckExhausted
} from '../modules/playDeckLimit.js';
import { createPlayHatState, drawNextHand } from '../modules/playHat.js';
import { parsePositiveNumberInput, parsePositiveWholeNumberInput } from '../modules/playNumberValidation.js';

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
let minuteLimitTimerId = null;
const state = {
  completedHandsCount: 0,
  activeHandNumber: 0,
  startedAtMs: 0,
  endedAtMs: 0,
  hatState: null,
  sessionEnded: false,
  currentCardsShownCount: 0,
  pendingHandCount: false
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

function stopMinuteLimitTimer() {
  if (minuteLimitTimerId !== null) {
    window.clearInterval(minuteLimitTimerId);
    minuteLimitTimerId = null;
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
  const countdownSeconds = parsePositiveWholeNumberInput(tempDeck.playOptions?.countdownSeconds ?? '') ?? 0;
  const lengthOfPlay = parsePositiveNumberInput(tempDeck.playOptions?.lengthOfPlay ?? '');
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

function updateHeader(players, settings) {
  const deckName = tempDeck.deckName || '(new untitled deck)';
  const limitText = describePlayLimit(settings);
  const playersText = players.length > 0 ? `${players.length} player${players.length === 1 ? '' : 's'}` : 'no named players';
  playSubtitle.textContent = `${deckName} | n=${tempDeck.symbolsPerCard} | ${limitText} | ${playersText}`;
  document.title = `FindIt | Playing ${deckName}`;
}

function setNextHandButtonLabel(label) {
  nextHandButton.textContent = label;
}

function renderCompletion(settings, players, reason = '') {
  stopCountdown();
  stopMinuteLimitTimer();
  state.sessionEnded = true;
  state.endedAtMs = Date.now();
  setNextHandButtonLabel('Next hand');
  nextHandButton.disabled = true;
  if (state.hatState) {
    state.hatState = {
      ...state.hatState,
      displayedCardIndices: []
    };
  }
  playCardGrid.innerHTML = '';
  clearObjectUrls();
  playBoardEmpty.hidden = false;
  playBoardEmpty.textContent = getStatisticsText(settings, reason);
  handStatus.textContent = getCompletionText(settings, reason);
  countdownStatus.textContent = `Elapsed: ${formatElapsedTime()}`;
  playerStatus.textContent = players.length > 0
    ? `Players: ${players.join(', ')} | Total hands played: ${state.completedHandsCount}`
    : `Total hands played: ${state.completedHandsCount}`;
}

function commitPendingHand() {
  if (!state.pendingHandCount) {
    return;
  }

  state.completedHandsCount += 1;
  state.pendingHandCount = false;
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

function getCompletionText(settings, reason) {
  if (reason === 'minutes') {
    return `Finished ${settings.lengthOfPlay} minute${settings.lengthOfPlay === 1 ? '' : 's'} of play.`;
  }

  if (reason === 'decks') {
    return `Finished after using the deck ${settings.lengthOfPlay} time${settings.lengthOfPlay === 1 ? '' : 's'}.`;
  }

  if (!settings.lengthOfPlay) {
    return 'Finished.';
  }

  if (settings.lengthOfPlayUnits === 'decks') {
    return `Finished ${settings.lengthOfPlay} deck${settings.lengthOfPlay === 1 ? '' : 's'} of play.`;
  }

  return `Finished ${settings.lengthOfPlay} hand${settings.lengthOfPlay === 1 ? '' : 's'}.`;
}

function getStatisticsText(settings, reason) {
  const completedDecks = settings.cardCount > 0 ? (state.completedHandsCount / settings.cardCount).toFixed(2) : '0.00';
  const averageSecondsPerHand = state.completedHandsCount > 0
    ? ((getElapsedMilliseconds() / 1000) / state.completedHandsCount).toFixed(2)
    : '0.00';
  const reasonText = reason === 'minutes'
    ? `Time limit reached after ${state.completedHandsCount} hand${state.completedHandsCount === 1 ? '' : 's'}.`
    : reason === 'decks'
      ? `The deck was used ${settings.lengthOfPlay} time${settings.lengthOfPlay === 1 ? '' : 's'} to play ${state.completedHandsCount} hands.`
      : reason === 'hands'
        ? `Finished ${state.completedHandsCount} hand${state.completedHandsCount === 1 ? '' : 's'}.`
        : 'Play finished.';

  return `${reasonText} Equivalent deck passes: ${completedDecks}. Elapsed time: ${formatElapsedTime()}. Average seconds per hand: ${averageSecondsPerHand}.`;
}

function hasReachedPlayLimit(settings) {
  if (!settings.lengthOfPlay) {
    return false;
  }

  if (settings.lengthOfPlayUnits === 'minutes') {
    return getElapsedMilliseconds() >= settings.lengthOfPlay * 60_000;
  }

  return settings.lengthOfPlayUnits === 'hands' && state.completedHandsCount >= settings.lengthOfPlay;
}

function getCurrentHandStatus(settings, cardsToShow, hatState) {
  if (!settings.lengthOfPlay) {
    return `Hand ${state.activeHandNumber}. Showing ${cardsToShow} card${cardsToShow === 1 ? '' : 's'}.`;
  }

  if (settings.lengthOfPlayUnits === 'minutes') {
    return getMinuteHandStatus(settings, cardsToShow);
  }

  if (settings.lengthOfPlayUnits === 'decks') {
    return getDeckLimitedHandStatus(
      state.activeHandNumber,
      settings.lengthOfPlay,
      getCurrentDeckNumber(hatState),
      hatState.hatCardIndices.length
    );
  }

  return `Hand ${state.activeHandNumber} of ${settings.lengthOfPlay}. Showing ${cardsToShow} card${cardsToShow === 1 ? '' : 's'}.`;
}

function formatElapsedTime() {
  const elapsedSeconds = Math.max(0, Math.floor(getElapsedMilliseconds() / 1000));
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function getElapsedMilliseconds() {
  if (state.startedAtMs === 0) {
    return 0;
  }

  const endTime = state.endedAtMs || Date.now();
  return Math.max(0, endTime - state.startedAtMs);
}

function getMinuteHandStatus(settings, cardsToShow) {
  const remainingMilliseconds = Math.max(0, settings.lengthOfPlay * 60_000 - getElapsedMilliseconds());
  const remainingSeconds = (remainingMilliseconds / 1000).toFixed(1);
  return `Hand ${state.activeHandNumber}. Showing ${cardsToShow} card${cardsToShow === 1 ? '' : 's'}. ${remainingSeconds}s remaining.`;
}

function startMinuteLimitTimer(settings, players) {
  if (settings.lengthOfPlayUnits !== 'minutes' || !settings.lengthOfPlay) {
    return;
  }

  stopMinuteLimitTimer();
  minuteLimitTimerId = window.setInterval(() => {
    if (state.sessionEnded) {
      stopMinuteLimitTimer();
      return;
    }

    handStatus.textContent = getMinuteHandStatus(settings, state.currentCardsShownCount);
    if (hasReachedPlayLimit(settings)) {
      renderCompletion(settings, players, 'minutes');
    }
  }, 100);
}

async function renderHand() {
  const players = getPlayerNames();
  const settings = getHandSettings();
  if (state.sessionEnded) {
    return;
  }
  if (state.startedAtMs === 0) {
    state.startedAtMs = Date.now();
  }
  commitPendingHand();
  updateHeader(players, settings);
  setNextHandButtonLabel('Next hand');
  nextHandButton.disabled = false;

  if (hasReachedPlayLimit(settings)) {
    renderCompletion(settings, players, settings.lengthOfPlayUnits === 'minutes' ? 'minutes' : 'hands');
    return;
  }

  state.activeHandNumber = state.completedHandsCount + 1;
  playCardGrid.innerHTML = '';
  playBoardEmpty.hidden = true;

  if (!state.hatState || state.hatState.cardCount !== settings.cardCount) {
    state.hatState = createPlayHatState(settings.cardCount);
  }
  if (isFinalDeckExhausted(settings, state.hatState)) {
    handStatus.textContent = getCurrentHandStatus(settings, 0, state.hatState);
    countdownStatus.textContent = 'Final deck complete. Click Finished to view statistics.';
    playCardGrid.innerHTML = '';
    playBoardEmpty.hidden = true;
    setNextHandButtonLabel('Finished');
    return;
  }
  const cardsToShow = getCardsToDrawForHand(settings, state.hatState, getRandomInteger);
  state.currentCardsShownCount = cardsToShow;
  const maxRefills = settings.lengthOfPlayUnits === 'decks' && settings.lengthOfPlay
    ? Math.max(0, settings.lengthOfPlay - 1)
    : Number.POSITIVE_INFINITY;
  const drawResult = drawNextHand(state.hatState, cardsToShow, { maxRefills });
  state.hatState = drawResult.state;
  const cardIndices = state.hatState.displayedCardIndices;
  state.currentCardsShownCount = cardIndices.length;
  const pattern = getPatternSources();
  const currentPlayer = players.length > 0 ? players[(state.activeHandNumber - 1) % players.length] : '';

  handStatus.textContent = getCurrentHandStatus(settings, cardsToShow, state.hatState);
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
    if (state.sessionEnded) {
      return;
    }
  }

  startMinuteLimitTimer(settings, players);

  if (hasReachedPlayLimit(settings) && settings.lengthOfPlayUnits === 'minutes') {
    renderCompletion(settings, players, 'minutes');
    return;
  }

  if (cardIndices.length < settings.minCardsToShow) {
    renderCompletion(settings, players, settings.lengthOfPlayUnits === 'decks' ? 'decks' : 'hands');
    return;
  }

  state.pendingHandCount = true;

  stopCountdown();
  if (drawResult.refillLimitHit) {
    commitPendingHand();
    renderCompletion(settings, players, 'decks');
    return;
  }

  if (settings.countdownSeconds > 0 && !hasReachedPlayLimit(settings)) {
    const countdownStartedAt = Date.now();
    countdownStatus.textContent = `Auto-advancing in ${settings.countdownSeconds.toFixed(1)}s.`;
    countdownTimerId = window.setInterval(() => {
      const elapsedSeconds = (Date.now() - countdownStartedAt) / 1000;
      const remaining = Math.max(0, settings.countdownSeconds - elapsedSeconds);
      if (remaining <= 0) {
        stopCountdown();
        if (hasReachedPlayLimit(settings)) {
          renderCompletion(settings, players, settings.lengthOfPlayUnits === 'minutes' ? 'minutes' : 'hands');
          return;
        }
        countdownStatus.textContent = 'Advancing...';
        void renderHand();
        return;
      }

      countdownStatus.textContent = `Auto-advancing in ${remaining.toFixed(1)}s.`;
    }, 100);
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
  const settings = getHandSettings();
  const players = getPlayerNames();

  if (!state.sessionEnded && state.hatState && isFinalDeckExhausted(settings, state.hatState)) {
    commitPendingHand();
    renderCompletion(settings, players, 'decks');
    return;
  }

  void renderHand();
});

restartButton.addEventListener('click', () => {
  stopCountdown();
  stopMinuteLimitTimer();
  state.completedHandsCount = 0;
  state.activeHandNumber = 0;
  state.startedAtMs = 0;
  state.endedAtMs = 0;
  state.hatState = null;
  state.sessionEnded = false;
  state.currentCardsShownCount = 0;
  state.pendingHandCount = false;
  playBoardEmpty.hidden = true;
  setNextHandButtonLabel('Next hand');
  nextHandButton.disabled = false;
  void renderHand();
});

window.addEventListener('beforeunload', () => {
  stopCountdown();
  stopMinuteLimitTimer();
  clearObjectUrls();
});

if (tempDeck.selectedImageRefs.length === 0) {
  showEmptyState('This deck has no selected images yet. Add images before using Play.');
} else {
  await renderHand();
}
