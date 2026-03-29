import { drawImagesOnSquareTarget } from './cardCanvasRenderer.js';
import { getDeckPlayerCardCount, getDeckPlayerCardItems, getDeckPlayerStepAt } from './deckPlayer.js';
import { deriveRenderSeed } from './patternSeed.js';
import { getStandardImageSrc } from './standardImageFiles.js';

export function createDeckCardGalleryRenderer({
  containerElement,
  emptyElement = null,
  emptyText = 'This deck has no selected images yet.'
}) {
  let objectUrls = [];

  function clearObjectUrls() {
    for (const url of objectUrls) {
      URL.revokeObjectURL(url);
    }
    objectUrls = [];
  }

  function resolveImageSrc(ref, placeholderNumber, userImages, webImages) {
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

  function getPatternSources(tempDeck, userImages, webImages) {
    clearObjectUrls();

    const n = tempDeck.symbolsPerCard;
    const order = n - 1;
    const slopeItems = [];
    const grid = [];

    for (let slopeIndex = 0; slopeIndex < n; slopeIndex += 1) {
      slopeItems.push(resolveImageSrc(tempDeck.selectedImageRefs[slopeIndex], slopeIndex + 1, userImages, webImages));
    }

    for (let row = 0; row < order; row += 1) {
      const gridRow = [];
      for (let column = 0; column < order; column += 1) {
        const slotIndex = n + row * order + column;
        gridRow.push(resolveImageSrc(tempDeck.selectedImageRefs[slotIndex], slotIndex + 1, userImages, webImages));
      }
      grid.push(gridRow);
    }

    return { slopeItems, grid };
  }

  async function render({ tempDeck, userImages = [], webImages = [] }) {
    if (!containerElement) {
      return;
    }

    containerElement.innerHTML = '';
    if (emptyElement) {
      emptyElement.hidden = true;
      emptyElement.textContent = '';
    }

    if (tempDeck.selectedImageRefs.length === 0) {
      if (emptyElement) {
        emptyElement.hidden = false;
        emptyElement.textContent = emptyText;
      }
      return;
    }

    const pattern = getPatternSources(tempDeck, userImages, webImages);
    const cardCount = getDeckPlayerCardCount(tempDeck.symbolsPerCard);

    for (let cardIndex = 0; cardIndex < cardCount; cardIndex += 1) {
      const step = getDeckPlayerStepAt(tempDeck.symbolsPerCard, cardIndex);
      const sources = getDeckPlayerCardItems(pattern.slopeItems, pattern.grid, step.s, step.r);

      const card = document.createElement('section');
      card.className = 'save-card card shadow-sm';

      const cardBody = document.createElement('div');
      cardBody.className = 'card-body';

      const title = document.createElement('h2');
      title.className = 'h6 mb-2';
      title.textContent = `Card ${cardIndex + 1}`;

      const target = document.createElement('div');
      target.className = 'sample-card-target save-card-target';

      cardBody.append(title, target);
      card.appendChild(cardBody);
      containerElement.appendChild(card);

      await drawImagesOnSquareTarget(target, sources, tempDeck.generationOptions, {
        randomSeed: deriveRenderSeed(tempDeck.pattern, cardIndex + 1)
      });
    }
  }

  function dispose() {
    clearObjectUrls();
  }

  return {
    render,
    dispose
  };
}
