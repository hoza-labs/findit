import { addImageRef, createImageRef, hasImageRef, removeImageRef } from '../modules/imageRefs.js';
import { markDirty } from '../modules/deckSession.js';
import {
  createImageTile,
  loadTempDeckOrDefault,
  renderDeckHeaderAndTitle,
  renderDeckStatusLine,
  repository,
  saveTempDeck
} from '../modules/deckFlowCommon.js';
import {
  getDefaultWebImageName,
  getWebImageCaption,
  inferWebContentTypeFromUrl,
  normalizeWebContentType,
  trimWebImageName
} from '../modules/webImageMetadata.js';

const webImageForm = document.querySelector('#web-image-form');
const webImageUrlInput = document.querySelector('#web-image-url');
const webImageNameInput = document.querySelector('#web-image-name');
const webImagesElement = document.querySelector('#web-images');
const deckStatusLine = document.querySelector('#deck-status-line');
const pageHeading = document.querySelector('header h1');

let tempDeck = await loadTempDeckOrDefault();
renderDeckStatusLine(deckStatusLine, tempDeck);
renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'Web Images', tempDeck });

async function fetchRemoteContentType(url) {
  const attempts = [
    { method: 'HEAD' },
    { method: 'GET' }
  ];

  for (const attempt of attempts) {
    try {
      const response = await fetch(url, {
        method: attempt.method,
        cache: 'no-store'
      });

      const headerType = normalizeWebContentType(response.headers.get('content-type'));
      if (headerType !== 'unknown') {
        return headerType;
      }

      if (attempt.method === 'GET' && response.type !== 'opaque') {
        const blob = await response.blob();
        const blobType = normalizeWebContentType(blob.type);
        if (blobType !== 'unknown') {
          return blobType;
        }
      }
    } catch {
      // Try next method/fallback.
    }
  }

  return inferWebContentTypeFromUrl(url);
}

async function renderWebImages() {
  webImagesElement.innerHTML = '';
  const webImages = await repository.listWebImages();

  for (const image of webImages) {
    const imageRef = createImageRef('web', image.id);
    const isSelected = hasImageRef(tempDeck, imageRef);

    webImagesElement.appendChild(
      createImageTile({
        src: image.url,
        label: getWebImageCaption(image),
        tooltipText: image.url,
        buttonText: isSelected ? 'Remove from deck' : 'Add to deck',
        buttonVariant: isSelected ? 'outline-danger' : 'outline-primary',
        isSelected,
        onClick: async () => {
          tempDeck = markDirty(isSelected ? removeImageRef(tempDeck, imageRef) : addImageRef(tempDeck, imageRef));
          await saveTempDeck(tempDeck);
          renderDeckStatusLine(deckStatusLine, tempDeck);
          renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'Web Images', tempDeck });
          await renderWebImages();
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
  const trimmedName = trimWebImageName(webImageNameInput.value);

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

  const contentType = await fetchRemoteContentType(url);
  const name = trimmedName || getDefaultWebImageName(url);

  const saved = await repository.addWebImage({ url, name, contentType });
  tempDeck = markDirty(addImageRef(tempDeck, createImageRef('web', saved.id)));
  await saveTempDeck(tempDeck);
  renderDeckStatusLine(deckStatusLine, tempDeck);
  renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'Web Images', tempDeck });

  webImageUrlInput.value = '';
  webImageNameInput.value = '';
  await renderWebImages();
});

await renderWebImages();
