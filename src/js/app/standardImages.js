import { addImageRef, createImageRef, hasImageRef, removeImageRef } from '../modules/imageRefs.js';
import { markDirty } from '../modules/deckSession.js';
import { createImageTile, loadTempDeckOrDefault, renderDeckHeaderAndTitle, renderDeckStatusLine, saveTempDeck } from '../modules/deckFlowCommon.js';
import { getStandardImageSrc } from '../modules/standardImageFiles.js';

const standardImagesElement = document.querySelector('#standard-images');
const deckStatusLine = document.querySelector('#deck-status-line');
const pageHeading = document.querySelector('header h1');
let tempDeck = await loadTempDeckOrDefault();
renderDeckStatusLine(deckStatusLine, tempDeck);
renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'Standard Images', tempDeck });

async function loadStandardImageNames() {
  const response = await fetch('./assets/deck-images/manifest.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to load standard image manifest.');
  }
  return response.json();
}

function renderStandardImages(fileNames) {
  standardImagesElement.innerHTML = '';

  for (const fileName of fileNames) {
    const imageRef = createImageRef('standard', fileName);
    const isSelected = hasImageRef(tempDeck, imageRef);
    const src = getStandardImageSrc(fileName);

    standardImagesElement.appendChild(
      createImageTile({
        src,
        label: fileName,
        buttonText: isSelected ? 'Remove from deck' : 'Add to deck',
        buttonVariant: isSelected ? 'outline-danger' : 'outline-primary',
        isSelected,
        onClick: async () => {
          tempDeck = markDirty(isSelected ? removeImageRef(tempDeck, imageRef) : addImageRef(tempDeck, imageRef));
          await saveTempDeck(tempDeck);
          renderDeckStatusLine(deckStatusLine, tempDeck);
          renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'Standard Images', tempDeck });
          renderStandardImages(fileNames);
        }
      })
    );
  }
}

try {
  renderStandardImages(await loadStandardImageNames());
} catch {
  standardImagesElement.textContent = 'Could not load standard images.';
}
