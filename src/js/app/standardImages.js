import { addImageRef, createImageRef } from '../modules/imageRefs.js';
import { markDirty } from '../modules/deckSession.js';
import { createImageTile, loadTempDeckOrDefault, renderDeckStatusLine, saveTempDeck } from '../modules/deckFlowCommon.js';

const standardImagesElement = document.querySelector('#standard-images');
const deckStatusLine = document.querySelector('#deck-status-line');
let tempDeck = await loadTempDeckOrDefault();
renderDeckStatusLine(deckStatusLine, tempDeck);

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
    const src = `./assets/deck-images/${fileName}`;
    standardImagesElement.appendChild(
      createImageTile({
        src,
        label: fileName,
        buttonText: 'Add to deck',
        onClick: async () => {
          tempDeck = markDirty(addImageRef(tempDeck, createImageRef('standard', fileName)));
          await saveTempDeck(tempDeck);
          renderDeckStatusLine(deckStatusLine, tempDeck);
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
