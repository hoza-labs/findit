import { addImageRef, createImageRef, hasImageRef, removeAllImageRefs, removeImageRef } from '../modules/imageRefs.js';
import { markDirty } from '../modules/deckSession.js';
import { createImageTile, loadTempDeckOrDefault, renderDeckHeaderAndTitle, renderDeckStatusLine, repository, saveTempDeck } from '../modules/deckFlowCommon.js';

const uploadImagesForm = document.querySelector('#upload-images-form');
const imageUploadInput = document.querySelector('#image-upload-input');
const userImagesElement = document.querySelector('#user-images');
const deckStatusLine = document.querySelector('#deck-status-line');
const pageHeading = document.querySelector('header h1');

const renameDialog = document.querySelector('#rename-image-dialog');
const renameForm = document.querySelector('#rename-image-form');
const renameInput = document.querySelector('#rename-image-input');
const renameCancelButton = document.querySelector('#rename-image-cancel');

const deleteDialog = document.querySelector('#delete-image-dialog');
const deleteForm = document.querySelector('#delete-image-form');
const deleteCancelButton = document.querySelector('#delete-image-cancel');

let tempDeck = await loadTempDeckOrDefault();
let objectUrls = [];
let renameTarget = null;
let deleteTarget = null;

renderDeckStatusLine(deckStatusLine, tempDeck);
renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'User Images', tempDeck });

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
    const imageRef = createImageRef('user', image.id);
    const isSelected = hasImageRef(tempDeck, imageRef);
    const src = URL.createObjectURL(image.blob);
    objectUrls.push(src);

    userImagesElement.appendChild(
      createImageTile({
        src,
        label: image.name || image.fileName,
        buttonText: isSelected ? 'Remove from deck' : 'Add to deck',
        buttonVariant: isSelected ? 'outline-danger' : 'outline-primary',
        isSelected,
        onClick: async () => {
          tempDeck = markDirty(isSelected ? removeImageRef(tempDeck, imageRef) : addImageRef(tempDeck, imageRef));
          await saveTempDeck(tempDeck);
          renderDeckStatusLine(deckStatusLine, tempDeck);
          renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'User Images', tempDeck });
          await renderUserImages();
        },
        menuActions: [
          {
            label: 'Rename...',
            onClick: async () => {
              renameTarget = image;
              renameInput.value = image.name || image.fileName;
              renameDialog.showModal();
              renameInput.focus();
              renameInput.select();
            }
          },
          {
            label: 'Delete...',
            onClick: async () => {
              deleteTarget = image;
              deleteDialog.showModal();
            }
          }
        ]
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
    renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'User Images', tempDeck });
  }

  imageUploadInput.value = '';
  await renderUserImages();
});

renameCancelButton.addEventListener('click', () => {
  renameDialog.close();
  renameTarget = null;
});

renameForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!renameTarget) {
    return;
  }

  await repository.renameUserImage(renameTarget.id, renameInput.value);
  renameDialog.close();
  renameTarget = null;
  await renderUserImages();
});

deleteCancelButton.addEventListener('click', () => {
  deleteDialog.close();
  deleteTarget = null;
});

deleteForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!deleteTarget) {
    return;
  }

  await repository.deleteUserImage(deleteTarget.id);
  const beforeCount = tempDeck.selectedImageRefs.length;
  tempDeck = removeAllImageRefs(tempDeck, createImageRef('user', deleteTarget.id));
  if (tempDeck.selectedImageRefs.length !== beforeCount) {
    tempDeck = markDirty(tempDeck);
    await saveTempDeck(tempDeck);
    renderDeckStatusLine(deckStatusLine, tempDeck);
    renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'User Images', tempDeck });
  }

  deleteDialog.close();
  deleteTarget = null;
  await renderUserImages();
});

await renderUserImages();
