export const CLAIM_DIALOG_ACTION_KEY_DELAY_MS = 1000;

export function getClaimDialogShortcut(event, maxPlayers = 9) {
  if (!event || typeof event !== 'object' || event.repeat) {
    return null;
  }

  if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
    return {
      type: 'next-hand'
    };
  }

  if (!event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
    const normalizedKey = typeof event.key === 'string' ? event.key.toLowerCase() : '';
    if (normalizedKey === 's') {
      return {
        type: 'points-mode',
        mode: 'star'
      };
    }

    if (normalizedKey === 't') {
      return {
        type: 'points-mode',
        mode: 'tomato'
      };
    }
  }

  if (typeof event.code !== 'string' || !event.code.startsWith('Digit')) {
    return null;
  }

  if (event.altKey || event.ctrlKey || event.metaKey) {
    return null;
  }

  const playerNumber = Number.parseInt(event.code.slice('Digit'.length), 10);
  if (!Number.isInteger(playerNumber) || playerNumber < 1 || playerNumber > Math.min(9, maxPlayers)) {
    return null;
  }

  return {
    type: 'player-row',
    playerIndex: playerNumber - 1
  };
}

export function isClaimDialogActionKeyEnabled(openedAtMs, nowMs, delayMs = CLAIM_DIALOG_ACTION_KEY_DELAY_MS) {
  if (!Number.isFinite(openedAtMs) || openedAtMs <= 0) {
    return true;
  }

  return nowMs - openedAtMs >= delayMs;
}
