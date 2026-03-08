import { addImageRef, createImageRef } from '../modules/imageRefs.js';
import { markDirty } from '../modules/deckSession.js';
import { createImageTile, loadTempDeckOrDefault, renderDeckStatusLine, repository, saveTempDeck } from '../modules/deckFlowCommon.js';

const webImageForm = document.querySelector('#web-image-form');
const webImageUrlInput = document.querySelector('#web-image-url');
const webImagesElement = document.querySelector('#web-images');
const deckStatusLine = document.querySelector('#deck-status-line');

let tempDeck = await loadTempDeckOrDefault();
renderDeckStatusLine(deckStatusLine, tempDeck);

async function renderWebImages() {
  webImagesElement.innerHTML = '';
  const webImages = await repository.listWebImages();

  for (const image of webImages) {
    webImagesElement.appendChild(
      createImageTile({
        src: image.url,
        label: image.url,
        buttonText: 'Add to deck',
        onClick: async () => {
          tempDeck = markDirty(addImageRef(tempDeck, createImageRef('web', image.id)));
          await saveTempDeck(tempDeck);
          renderDeckStatusLine(deckStatusLine, tempDeck);
        }
      })
    );
  }

  if (webImages.length === 0) {
    webImagesElement.textContent = 'No web images yet.';
  }
}

webImageForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const url = webImageUrlInput.value.trim();
  if (!url) {
    return;
  }

  try {
    new URL(url);
  } catch {
    webImageUrlInput.setCustomValidity('Enter a valid URL.');
    webImageUrlInput.reportValidity();
    return;
  }

  webImageUrlInput.setCustomValidity('');
  const saved = await repository.addWebImage(url);
  tempDeck = markDirty(addImageRef(tempDeck, createImageRef('web', saved.id)));
  await saveTempDeck(tempDeck);
  renderDeckStatusLine(deckStatusLine, tempDeck);
  webImageUrlInput.value = '';
  await renderWebImages();
});

await renderWebImages();
