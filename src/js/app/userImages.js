import { addImageRef, createImageRef } from '../modules/imageRefs.js';
import { markDirty } from '../modules/deckSession.js';
import { createImageTile, loadTempDeckOrDefault, renderDeckStatusLine, repository, saveTempDeck } from '../modules/deckFlowCommon.js';

const uploadImagesForm = document.querySelector('#upload-images-form');
const imageUploadInput = document.querySelector('#image-upload-input');
const userImagesElement = document.querySelector('#user-images');
const deckStatusLine = document.querySelector('#deck-status-line');

let tempDeck = await loadTempDeckOrDefault();
let objectUrls = [];
renderDeckStatusLine(deckStatusLine, tempDeck);

function clearObjectUrls() {
  for (const url of objectUrls) {
    URL.revokeObjectURL(url);
  }
  objectUrls = [];
}

async function renderUserImages() {
  clearObjectUrls();
  userImagesElement.innerHTML = '';

  const userImages = await repository.listUserImages();
  for (const image of userImages) {
    const src = URL.createObjectURL(image.blob);
    objectUrls.push(src);

    userImagesElement.appendChild(
      createImageTile({
        src,
        label: image.fileName,
        buttonText: 'Add to deck',
        onClick: async () => {
          tempDeck = markDirty(addImageRef(tempDeck, createImageRef('user', image.id)));
          await saveTempDeck(tempDeck);
          renderDeckStatusLine(deckStatusLine, tempDeck);
        }
      })
    );
  }

  if (userImages.length === 0) {
    userImagesElement.textContent = 'No uploaded images yet.';
  }
}

uploadImagesForm.addEventListener('submit', (event) => {
  event.preventDefault();
});

imageUploadInput.addEventListener('change', async () => {
  const files = [...(imageUploadInput.files ?? [])];
  for (const file of files) {
    const saved = await repository.addUserImage(file);
    tempDeck = markDirty(addImageRef(tempDeck, createImageRef('user', saved.id)));
  }

  if (files.length > 0) {
    await saveTempDeck(tempDeck);
    renderDeckStatusLine(deckStatusLine, tempDeck);
  }

  imageUploadInput.value = '';
  await renderUserImages();
});

await renderUserImages();
