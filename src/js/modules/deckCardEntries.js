import { getDeckPlayerCardCount, getDeckPlayerCardItems, getDeckPlayerStepAt } from './deckPlayer.js';
import { getStandardImageSrc } from './standardImageFiles.js';

export function createDeckCardEntries(tempDeck, userImages = [], webImages = []) {
  const objectUrls = [];

  function dispose() {
    for (const url of objectUrls) {
      URL.revokeObjectURL(url);
    }
  }

  function resolveImageSrc(ref, placeholderNumber) {
    if (ref?.source === 'standard') {
      return { src: getStandardImageSrc(ref.id) };
    }

    if (ref?.source === 'user') {
      const userImage = userImages.find((item) => item.id === ref.id);
      if (!userImage) {
        return { src: `./assets/placeholder-images/${placeholderNumber}.png` };
      }

      const url = URL.createObjectURL(userImage.blob);
      objectUrls.push(url);
      return { src: url, mask: userImage.mask };
    }

    if (ref?.source === 'web') {
      const webImage = webImages.find((item) => item.id === ref.id);
      return webImage
        ? { src: webImage.url, mask: webImage.mask }
        : { src: `./assets/placeholder-images/${placeholderNumber}.png` };
    }

    return { src: `./assets/placeholder-images/${placeholderNumber}.png` };
  }

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

  const cardEntries = Array.from({ length: getDeckPlayerCardCount(tempDeck.symbolsPerCard) }, (_, cardIndex) => {
    const step = getDeckPlayerStepAt(tempDeck.symbolsPerCard, cardIndex);
    return {
      cardIndex,
      cardNumber: cardIndex + 1,
      sources: getDeckPlayerCardItems(slopeItems, grid, step.s, step.r)
    };
  });

  return {
    cardEntries,
    dispose
  };
}
