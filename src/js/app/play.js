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
const resultsButton = document.querySelector('#results-button');
const nextHandButton = document.querySelector('#next-hand-button');
const restartButton = document.querySelector('#restart-button');
const claimDialog = document.querySelector('#claim-dialog');
const claimDialogHeader = document.querySelector('#claim-dialog-header');
const claimDialogMessage = document.querySelector('#claim-dialog-message');
const claimPlayerList = document.querySelector('#claim-player-list');
const claimDialogResultsButton = document.querySelector('#claim-dialog-results-button');
const claimDialogCancelButton = document.querySelector('#claim-dialog-cancel-button');
const claimDialogNextHandButton = document.querySelector('#claim-dialog-next-hand-button');
const confirmationDialog = document.querySelector('#confirmation-dialog');
const confirmationDialogMessage = document.querySelector('#confirmation-dialog-message');
const confirmationDialogCancelButton = document.querySelector('#confirmation-dialog-cancel-button');
const confirmationDialogOkButton = document.querySelector('#confirmation-dialog-ok-button');

const tempDeck = await loadTempDeckOrDefault();
const userImages = await repository.listUserImages();
const webImages = await repository.listWebImages();

let objectUrls = [];
let countdownTimerId = null;
let minuteLimitTimerId = null;
let scoreAnimationTimerId = null;
const state = {
  completedHandsCount: 0,
  activeHandNumber: 0,
  startedAtMs: 0,
  endedAtMs: 0,
  hatState: null,
  sessionEnded: false,
  currentCardsShownCount: 0,
  pendingHandCount: false,
  countdownRemainingMs: 0,
  countdownEndsAtMs: 0,
  claimDialogOpen: false,
  claimDialogOpenedAtMs: 0,
  totalClaimDialogOpenMs: 0,
  confirmationDialogOpen: false,
  confirmationDialogOpenedAtMs: 0,
  totalConfirmationDialogOpenMs: 0,
  pendingConfirmedAction: null,
  navigationConfirmationEnabled: false,
  navigationPromptOpenedAtMs: 0,
  totalNavigationPromptOpenMs: 0,
  navigationPromptOverlapsDialog: false,
  totalNavigationPromptOverlapMs: 0,
  playerScores: [],
  claimHandPoints: [],
  claimDragOffsetX: 0,
  claimDragOffsetY: 0,
  claimDragging: false
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

  state.countdownEndsAtMs = 0;
}

function stopMinuteLimitTimer() {
  if (minuteLimitTimerId !== null) {
    window.clearInterval(minuteLimitTimerId);
    minuteLimitTimerId = null;
  }
}

function stopScoreAnimation() {
  if (scoreAnimationTimerId !== null) {
    window.clearInterval(scoreAnimationTimerId);
    scoreAnimationTimerId = null;
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

function parseCardCountList(value, cardCount) {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  return value
    .split(',')
    .map((item) => parseOptionalPositiveInteger(item))
    .filter((count) => count !== null && count <= cardCount);
}

function getPlayerNames() {
  const rawNames = tempDeck.playOptions?.playerNames ?? '';
  return rawNames
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function resetPlayerScores() {
  state.playerScores = getPlayerNames().map((name) => ({ name, score: 0 }));
  state.claimHandPoints = state.playerScores.map(() => 0);
}

function renderPlayerClaimPrompt() {
  playerStatus.textContent = 'Any player can click anywhere or press any key to claim the hand.';
}

function renderClaimPlayerList() {
  claimPlayerList.innerHTML = '';

  if (state.playerScores.length === 0) {
    const emptyRow = document.createElement('p');
    emptyRow.className = 'mb-0 text-muted';
    emptyRow.textContent = 'No player names are configured for scoring.';
    claimPlayerList.appendChild(emptyRow);
    return;
  }

  for (let index = 0; index < state.playerScores.length; index += 1) {
    const player = state.playerScores[index];
    const row = document.createElement('div');
    row.className = 'claim-player-row';

    const name = document.createElement('div');
    name.className = 'claim-player-name';
    name.textContent = player.name;

    const score = document.createElement('div');
    score.className = 'claim-player-score';
    score.textContent = `Points for this hand: ${state.claimHandPoints[index] ?? 0}`;

    const controls = document.createElement('div');
    controls.className = 'claim-player-controls';

    const decreaseButton = document.createElement('button');
    decreaseButton.type = 'button';
    decreaseButton.className = 'btn btn-outline-secondary claim-player-button';
    decreaseButton.dataset.playerIndex = String(index);
    decreaseButton.dataset.scoreDelta = '-1';
    decreaseButton.textContent = '-';

    const increaseButton = document.createElement('button');
    increaseButton.type = 'button';
    increaseButton.className = 'btn btn-outline-primary claim-player-button';
    increaseButton.dataset.playerIndex = String(index);
    increaseButton.dataset.scoreDelta = '1';
    increaseButton.textContent = '+';

    controls.append(decreaseButton, increaseButton);
    row.append(name, score, controls);
    claimPlayerList.appendChild(row);
  }
}

function cancelClaimHandPoints() {
  for (let index = 0; index < state.playerScores.length; index += 1) {
    const player = state.playerScores[index];
    const handPoints = state.claimHandPoints[index] ?? 0;
    player.score -= handPoints;
  }

  state.claimHandPoints = state.playerScores.map(() => 0);
}

function getHandSettings() {
  const cardCount = getDeckPlayerCardCount(tempDeck.symbolsPerCard);
  const cardsToShowCounts = parseCardCountList(tempDeck.playOptions?.cardsToShowCounts, cardCount);
  const countdownSeconds = parsePositiveWholeNumberInput(tempDeck.playOptions?.countdownSeconds ?? '') ?? 0;
  const lengthOfPlay = parsePositiveNumberInput(tempDeck.playOptions?.lengthOfPlay ?? '');
  const lengthOfPlayUnits = tempDeck.playOptions?.lengthOfPlayUnits ?? 'hands';

  return {
    cardCount,
    cardsToShowCounts: cardsToShowCounts.length > 0 ? cardsToShowCounts : [Math.min(2, cardCount)],
    countdownSeconds,
    lengthOfPlay,
    lengthOfPlayUnits
  };
}

function isUnlimitedGame(settings) {
  return !settings.lengthOfPlay;
}

function getMinimumAllowedCardsToShow(settings) {
  return Math.min(...settings.cardsToShowCounts);
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

function positionClaimDialogAtCenter() {
  claimDialog.style.left = `${Math.max(16, Math.round((window.innerWidth - claimDialog.offsetWidth) / 2))}px`;
  claimDialog.style.top = `${Math.max(72, Math.round((window.innerHeight - claimDialog.offsetHeight) / 2))}px`;
  claimDialog.style.transform = 'none';
}

function pauseCountdownForDialog() {
  if (countdownTimerId === null || state.countdownEndsAtMs === 0) {
    return;
  }

  state.countdownRemainingMs = Math.max(0, state.countdownEndsAtMs - Date.now());
  stopCountdown();
  countdownStatus.textContent = `Countdown paused at ${(state.countdownRemainingMs / 1000).toFixed(1)}s.`;
}

function setPlayActionButtonsDisabled(disabled) {
  restartButton.disabled = disabled;
  nextHandButton.disabled = disabled;
  resultsButton.disabled = disabled || resultsButton.hidden;
}

function setNavigationConfirmationEnabled(enabled) {
  state.navigationConfirmationEnabled = enabled;
}

function pauseForNavigationPrompt() {
  if (state.sessionEnded || state.navigationPromptOpenedAtMs > 0) {
    return;
  }

  state.navigationPromptOpenedAtMs = Date.now();
  state.navigationPromptOverlapsDialog = state.claimDialogOpen || state.confirmationDialogOpen;
  pauseCountdownForDialog();
  stopMinuteLimitTimer();
}

function resumeAfterNavigationPrompt() {
  if (state.navigationPromptOpenedAtMs === 0) {
    return;
  }

  const promptOpenMs = Math.max(0, Date.now() - state.navigationPromptOpenedAtMs);
  state.totalNavigationPromptOpenMs += promptOpenMs;
  if (state.navigationPromptOverlapsDialog) {
    state.totalNavigationPromptOverlapMs += promptOpenMs;
  }
  state.navigationPromptOpenedAtMs = 0;
  state.navigationPromptOverlapsDialog = false;

  if (state.sessionEnded) {
    return;
  }

  const settings = getHandSettings();
  const players = getPlayerNames();

  if (settings.lengthOfPlayUnits === 'minutes' && settings.lengthOfPlay && state.currentCardsShownCount > 0) {
    handStatus.textContent = getMinuteHandStatus(settings, state.currentCardsShownCount);
    startMinuteLimitTimer(settings, players);
  }

  if (
    state.countdownRemainingMs > 0
    && !state.claimDialogOpen
    && !state.confirmationDialogOpen
    && state.currentCardsShownCount > 0
  ) {
    startCountdown(settings);
  }
}

function openConfirmationDialog(action) {
  if (state.confirmationDialogOpen) {
    return;
  }

  if (action === 'results' && state.sessionEnded) {
    return;
  }

  state.confirmationDialogOpen = true;
  state.confirmationDialogOpenedAtMs = Date.now();
  state.pendingConfirmedAction = action;
  confirmationDialogMessage.textContent = action === 'restart'
    ? (restartButton.textContent === 'New game'
        ? 'Start a new game with the same options?'
        : 'Restart this game?')
    : 'Show results and end this game?';
  confirmationDialog.hidden = false;
  pauseCountdownForDialog();
}

function closeClaimDialog(options = {}) {
  const { resumeCountdown = true, restoreButtons = true } = options;
  if (state.claimDialogOpenedAtMs > 0) {
    state.totalClaimDialogOpenMs += Math.max(0, Date.now() - state.claimDialogOpenedAtMs);
    state.claimDialogOpenedAtMs = 0;
  }
  state.claimDialogOpen = false;
  claimDialog.hidden = true;

  if (restoreButtons && !state.sessionEnded && !state.confirmationDialogOpen) {
    setPlayActionButtonsDisabled(false);
  }

  if (resumeCountdown && !state.sessionEnded && state.countdownRemainingMs > 0) {
    startCountdown(getHandSettings());
  }
}

function closeConfirmationDialog(options = {}) {
  const { resumeTimers = true } = options;
  if (state.confirmationDialogOpenedAtMs > 0) {
    state.totalConfirmationDialogOpenMs += Math.max(0, Date.now() - state.confirmationDialogOpenedAtMs);
    state.confirmationDialogOpenedAtMs = 0;
  }

  state.confirmationDialogOpen = false;
  state.pendingConfirmedAction = null;
  confirmationDialog.hidden = true;

  if (
    resumeTimers
    && !state.sessionEnded
    && !state.claimDialogOpen
    && state.countdownRemainingMs > 0
  ) {
    startCountdown(getHandSettings());
  }
}

function openClaimDialog(message) {
  if (state.sessionEnded || state.claimDialogOpen || state.confirmationDialogOpen || state.currentCardsShownCount === 0) {
    return;
  }

  const settings = getHandSettings();
  setNavigationConfirmationEnabled(true);
  state.claimDialogOpen = true;
  state.claimDialogOpenedAtMs = Date.now();
  state.claimHandPoints = state.playerScores.map(() => 0);
  claimDialogMessage.textContent = message;
  claimDialogResultsButton.hidden = !isUnlimitedGame(settings);
  renderClaimPlayerList();
  claimDialog.hidden = false;
  setPlayActionButtonsDisabled(true);
  positionClaimDialogAtCenter();
  pauseCountdownForDialog();
}

function performRestart() {
  stopCountdown();
  stopMinuteLimitTimer();
  stopScoreAnimation();
  closeConfirmationDialog({ resumeTimers: false });
  closeClaimDialog({ resumeCountdown: false, restoreButtons: false });
  state.completedHandsCount = 0;
  state.activeHandNumber = 0;
  state.startedAtMs = 0;
  state.endedAtMs = 0;
  state.hatState = null;
  state.sessionEnded = false;
  state.currentCardsShownCount = 0;
  state.pendingHandCount = false;
  state.navigationConfirmationEnabled = false;
  state.navigationPromptOpenedAtMs = 0;
  state.totalNavigationPromptOpenMs = 0;
  state.navigationPromptOverlapsDialog = false;
  state.totalNavigationPromptOverlapMs = 0;
  state.countdownRemainingMs = 0;
  state.claimDialogOpenedAtMs = 0;
  state.totalClaimDialogOpenMs = 0;
  state.confirmationDialogOpenedAtMs = 0;
  state.totalConfirmationDialogOpenMs = 0;
  resetPlayerScores();
  playBoardEmpty.hidden = true;
  resultsButton.hidden = true;
  setRestartButtonLabel('Restart');
  setNextHandButtonLabel('Next hand');
  nextHandButton.disabled = false;
  void renderHand();
}

function performResults() {
  const settings = getHandSettings();
  const players = getPlayerNames();
  if (isUnlimitedGame(settings)) {
    commitPendingHand();
  }
  closeConfirmationDialog({ resumeTimers: false });
  renderCompletion(settings, players);
}

function executeConfirmedAction() {
  if (state.pendingConfirmedAction === 'restart') {
    performRestart();
    return;
  }

  if (state.pendingConfirmedAction === 'results') {
    performResults();
  }
}

function setNextHandButtonLabel(label) {
  nextHandButton.textContent = label;
}

function setRestartButtonLabel(label) {
  restartButton.textContent = label;
}

function renderCompletion(settings, players, reason = '') {
  stopCountdown();
  stopMinuteLimitTimer();
  stopScoreAnimation();
  closeClaimDialog({ resumeCountdown: false });
  state.sessionEnded = true;
  setNavigationConfirmationEnabled(false);
  state.navigationPromptOpenedAtMs = 0;
  state.navigationPromptOverlapsDialog = false;
  state.endedAtMs = Date.now();
  setNextHandButtonLabel('Next hand');
  setRestartButtonLabel('New game');
  resultsButton.hidden = true;
  restartButton.disabled = false;
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
  renderStatisticsTable(settings, reason);
  handStatus.textContent = getCompletionText(settings, reason);
  countdownStatus.textContent = `Elapsed: ${formatElapsedTime(getActiveElapsedMilliseconds())}`;
  playerStatus.textContent = `Total hands played: ${state.completedHandsCount}`;
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
  const averageSecondsPerHand = state.completedHandsCount > 0
    ? ((getActiveElapsedMilliseconds() / 1000) / state.completedHandsCount).toFixed(2)
    : '0.00';
  const reasonText = reason === 'minutes'
    ? `Time limit reached after ${state.completedHandsCount} hand${state.completedHandsCount === 1 ? '' : 's'}.`
    : reason === 'decks'
      ? `The deck was used ${settings.lengthOfPlay} time${settings.lengthOfPlay === 1 ? '' : 's'} to play ${state.completedHandsCount} hands.`
      : reason === 'hands'
        ? `Finished ${state.completedHandsCount} hand${state.completedHandsCount === 1 ? '' : 's'}.`
        : 'Play finished.';

  return {
    reasonText,
    elapsedTimeText: formatElapsedTime(getActiveElapsedMilliseconds()),
    averageSecondsPerHand,
    playerScores: state.playerScores.map((player) => ({ ...player }))
  };
}

function hasReachedPlayLimit(settings) {
  if (!settings.lengthOfPlay) {
    return false;
  }

  if (settings.lengthOfPlayUnits === 'minutes') {
    return getActiveElapsedMilliseconds() >= settings.lengthOfPlay * 60_000;
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

function formatElapsedTime(elapsedMilliseconds) {
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMilliseconds / 1000));
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function getSessionElapsedMilliseconds() {
  if (state.startedAtMs === 0) {
    return 0;
  }

  const endTime = state.endedAtMs || Date.now();
  return Math.max(0, endTime - state.startedAtMs);
}

function getActiveElapsedMilliseconds() {
  const currentDialogOpenMs = state.claimDialogOpenedAtMs > 0
    ? Math.max(0, Date.now() - state.claimDialogOpenedAtMs)
    : 0;
  const currentConfirmationOpenMs = state.confirmationDialogOpenedAtMs > 0
    ? Math.max(0, Date.now() - state.confirmationDialogOpenedAtMs)
    : 0;
  const currentNavigationPromptOpenMs = state.navigationPromptOpenedAtMs > 0
    ? Math.max(0, Date.now() - state.navigationPromptOpenedAtMs)
    : 0;
  const currentNavigationPromptOverlapMs = state.navigationPromptOpenedAtMs > 0 && state.navigationPromptOverlapsDialog
    ? currentNavigationPromptOpenMs
    : 0;
  return Math.max(
    0,
    getSessionElapsedMilliseconds()
      - state.totalClaimDialogOpenMs
      - currentDialogOpenMs
      - state.totalConfirmationDialogOpenMs
      - currentConfirmationOpenMs
      - state.totalNavigationPromptOpenMs
      + state.totalNavigationPromptOverlapMs
      - currentNavigationPromptOpenMs
      + currentNavigationPromptOverlapMs
  );
}

function renderStatisticsTable(settings, reason) {
  const statistics = getStatisticsText(settings, reason);
  playBoardEmpty.innerHTML = '';
  stopScoreAnimation();

  const wrapper = document.createElement('div');
  wrapper.className = 'table-responsive play-results-table-wrap';

  const table = document.createElement('table');
  table.className = 'table table-sm align-middle mb-0 play-results-table';

  const body = document.createElement('tbody');
  const rows = [
    ['Elapsed Time', statistics.elapsedTimeText],
    ['Total Hands Played', String(state.completedHandsCount)],
    ['Average Seconds Per Hand', statistics.averageSecondsPerHand]
  ];

  const resultRow = document.createElement('tr');
  const resultCell = document.createElement('td');
  resultCell.colSpan = 2;
  resultCell.textContent = statistics.reasonText;
  resultCell.className = 'play-results-table-result';
  resultRow.appendChild(resultCell);
  body.appendChild(resultRow);

  for (const [label, value] of rows) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.textContent = value;
    const heading = document.createElement('th');
    heading.scope = 'row';
    heading.textContent = label;
    row.append(cell, heading);
    body.appendChild(row);
  }

  if (statistics.playerScores.length > 0) {
    const scoresHeadingRow = document.createElement('tr');
    const scoresHeading = document.createElement('th');
    scoresHeading.colSpan = 2;
    scoresHeading.textContent = 'Player Scores';
    scoresHeadingRow.appendChild(scoresHeading);
    body.appendChild(scoresHeadingRow);

    const maximumScore = Math.max(...statistics.playerScores.map((player) => player.score));
    const animatedPlayers = [];

    for (const player of statistics.playerScores) {
      const row = document.createElement('tr');
      const score = document.createElement('td');
      const startingScore = player.score < 0 ? player.score : 0;
      score.textContent = String(startingScore);
      score.className = 'play-results-player-score';
      const name = document.createElement('th');
      name.scope = 'row';
      name.textContent = player.name;
      name.className = 'play-results-player-name';
      updateResultsProgressBar(name, maximumScore, startingScore);
      row.append(score, name);
      body.appendChild(row);

      animatedPlayers.push({
        actualScore: player.score,
        displayedScore: startingScore,
        scoreElement: score,
        nameElement: name
      });
    }

    if (animatedPlayers.some((player) => player.displayedScore < player.actualScore)) {
      scoreAnimationTimerId = window.setInterval(() => {
        let hasRemainingAnimation = false;

        for (const player of animatedPlayers) {
          if (player.displayedScore < player.actualScore) {
            player.displayedScore += 1;
            player.scoreElement.textContent = String(player.displayedScore);
            updateResultsProgressBar(player.nameElement, maximumScore, player.displayedScore);
          }

          if (player.displayedScore < player.actualScore) {
            hasRemainingAnimation = true;
          }
        }

        if (!hasRemainingAnimation) {
          stopScoreAnimation();
        }
      }, 1000 / 3);
    }
  }

  table.appendChild(body);
  wrapper.appendChild(table);
  playBoardEmpty.appendChild(wrapper);
}

function updateResultsProgressBar(element, maximumScore, displayedScore) {
  if (maximumScore <= 0) {
    element.style.removeProperty('--play-results-score-fill');
    element.classList.remove('has-score-bar');
    return;
  }

  const clampedScore = Math.max(0, displayedScore);
  const fillPercent = Math.max(0, Math.min(100, (clampedScore / maximumScore) * 100));
  element.style.setProperty('--play-results-score-fill', `${fillPercent}`);
  element.classList.add('has-score-bar');
}

function getMinuteHandStatus(settings, cardsToShow) {
  const remainingMilliseconds = Math.max(0, settings.lengthOfPlay * 60_000 - getActiveElapsedMilliseconds());
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

function startCountdown(settings) {
  stopCountdown();

  if (settings.countdownSeconds <= 0 || hasReachedPlayLimit(settings)) {
    countdownStatus.textContent = settings.countdownSeconds > 0
      ? 'Final hand. Countdown complete.'
      : 'No countdown. Advance manually.';
    return;
  }

  state.countdownRemainingMs = state.countdownRemainingMs > 0
    ? state.countdownRemainingMs
    : settings.countdownSeconds * 1000;
  state.countdownEndsAtMs = Date.now() + state.countdownRemainingMs;
  countdownStatus.textContent = `Auto-advancing in ${(state.countdownRemainingMs / 1000).toFixed(1)}s.`;
  countdownTimerId = window.setInterval(() => {
    const remainingMs = Math.max(0, state.countdownEndsAtMs - Date.now());
    state.countdownRemainingMs = remainingMs;
    if (remainingMs <= 0) {
      stopCountdown();
      const players = getPlayerNames();
      if (hasReachedPlayLimit(settings)) {
        renderCompletion(settings, players, settings.lengthOfPlayUnits === 'minutes' ? 'minutes' : 'hands');
        return;
      }
      countdownStatus.textContent = 'Advancing...';
      void renderHand();
      return;
    }

    countdownStatus.textContent = `Auto-advancing in ${(remainingMs / 1000).toFixed(1)}s.`;
  }, 100);
}

function getClaimEventMessage(event) {
  if (event instanceof KeyboardEvent) {
    const keyLabel = event.key === ' ' ? 'Space' : event.key;
    return `The ${keyLabel} key was pressed!`;
  }

  if (event instanceof PointerEvent) {
    if (event.pointerType === 'mouse') {
      return 'Mouse click detected!';
    }

    if (event.pointerType === 'touch') {
      return 'Screen was touched!';
    }

    if (event.pointerType === 'pen') {
      return 'Pen touch detected!';
    }
  }

  return 'Input detected!';
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
  setRestartButtonLabel('Restart');
  resultsButton.hidden = !isUnlimitedGame(settings);
  setNextHandButtonLabel('Next hand');
  nextHandButton.disabled = false;

  if (hasReachedPlayLimit(settings)) {
    renderCompletion(settings, players, settings.lengthOfPlayUnits === 'minutes' ? 'minutes' : 'hands');
    return;
  }

  state.activeHandNumber = state.completedHandsCount + 1;
  if (state.activeHandNumber >= 2) {
    setNavigationConfirmationEnabled(true);
  }
  state.countdownRemainingMs = 0;
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
  if (cardsToShow === 0) {
    renderCompletion(settings, players, 'decks');
    return;
  }
  state.currentCardsShownCount = cardsToShow;
  const maxRefills = settings.lengthOfPlayUnits === 'decks' && settings.lengthOfPlay
    ? Math.max(0, settings.lengthOfPlay - 1)
    : Number.POSITIVE_INFINITY;
  const drawResult = drawNextHand(state.hatState, cardsToShow, { maxRefills });
  state.hatState = drawResult.state;
  const cardIndices = state.hatState.displayedCardIndices;
  state.currentCardsShownCount = cardIndices.length;
  const pattern = getPatternSources();
  handStatus.textContent = getCurrentHandStatus(settings, cardsToShow, state.hatState);
  renderPlayerClaimPrompt();

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

  const minimumCardsToShow = getMinimumAllowedCardsToShow(settings);
  if (cardIndices.length < minimumCardsToShow) {
    renderCompletion(settings, players, settings.lengthOfPlayUnits === 'decks' ? 'decks' : 'hands');
    return;
  }

  state.pendingHandCount = true;

  if (drawResult.refillLimitHit) {
    commitPendingHand();
    renderCompletion(settings, players, 'decks');
    return;
  }

  startCountdown(settings);
}

function showEmptyState(message) {
  playCardGrid.innerHTML = '';
  playBoardEmpty.hidden = false;
  playBoardEmpty.textContent = message;
  handStatus.textContent = '';
  countdownStatus.textContent = '';
  playerStatus.textContent = '';
  resultsButton.hidden = true;
  resultsButton.disabled = true;
  nextHandButton.disabled = true;
}

resultsButton.addEventListener('click', () => {
  openConfirmationDialog('results');
});

claimDialogResultsButton.addEventListener('click', () => {
  openConfirmationDialog('results');
});

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
  openConfirmationDialog('restart');
});

claimPlayerList.addEventListener('click', (event) => {
  const button = event.target instanceof HTMLElement ? event.target.closest('button[data-player-index]') : null;
  if (!button) {
    return;
  }

  const playerIndex = Number.parseInt(button.dataset.playerIndex ?? '', 10);
  const scoreDelta = Number.parseInt(button.dataset.scoreDelta ?? '', 10);
  const player = state.playerScores[playerIndex];
  if (!player || Number.isNaN(scoreDelta)) {
    return;
  }

  player.score += scoreDelta;
  state.claimHandPoints[playerIndex] = (state.claimHandPoints[playerIndex] ?? 0) + scoreDelta;
  renderClaimPlayerList();
});

claimDialogCancelButton.addEventListener('click', () => {
  cancelClaimHandPoints();
  closeClaimDialog();
});

claimDialogNextHandButton.addEventListener('click', () => {
  closeClaimDialog({ resumeCountdown: false });
  void renderHand();
});

confirmationDialogCancelButton.addEventListener('click', () => {
  closeConfirmationDialog({ resumeTimers: true });
});

confirmationDialogOkButton.addEventListener('click', () => {
  executeConfirmedAction();
});

claimDialogHeader.addEventListener('pointerdown', (event) => {
  state.claimDragging = true;
  const dialogRect = claimDialog.getBoundingClientRect();
  state.claimDragOffsetX = event.clientX - dialogRect.left;
  state.claimDragOffsetY = event.clientY - dialogRect.top;
  claimDialogHeader.setPointerCapture(event.pointerId);
});

claimDialogHeader.addEventListener('pointermove', (event) => {
  if (!state.claimDragging) {
    return;
  }

  claimDialog.style.left = `${Math.max(8, event.clientX - state.claimDragOffsetX)}px`;
  claimDialog.style.top = `${Math.max(56, event.clientY - state.claimDragOffsetY)}px`;
  claimDialog.style.transform = 'none';
});

claimDialogHeader.addEventListener('pointerup', (event) => {
  state.claimDragging = false;
  claimDialogHeader.releasePointerCapture(event.pointerId);
});

document.addEventListener('pointerdown', (event) => {
  if (state.sessionEnded || state.claimDialogOpen || state.confirmationDialogOpen) {
    return;
  }

  const target = event.target instanceof HTMLElement ? event.target : null;
  if (!target || target.closest('button, a, input, select, textarea, summary, #claim-dialog')) {
    return;
  }

  openClaimDialog(getClaimEventMessage(event));
}, true);

document.addEventListener('keydown', (event) => {
  if (state.sessionEnded || state.claimDialogOpen || state.confirmationDialogOpen) {
    return;
  }

  openClaimDialog(getClaimEventMessage(event));
});

window.addEventListener('beforeunload', (event) => {
  if (state.navigationConfirmationEnabled) {
    pauseForNavigationPrompt();
    event.preventDefault();
    event.returnValue = '';
    return '';
  }

  stopCountdown();
  stopMinuteLimitTimer();
  clearObjectUrls();
});

window.addEventListener('focus', () => {
  resumeAfterNavigationPrompt();
});

window.addEventListener('pageshow', () => {
  resumeAfterNavigationPrompt();
});

resetPlayerScores();
if (tempDeck.selectedImageRefs.length === 0) {
  showEmptyState('This deck has no selected images yet. Add images before using Play.');
} else {
  await renderHand();
}
