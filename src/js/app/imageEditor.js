import { repository } from '../modules/deckFlowCommon.js';
import {
  clampImageMask,
  getDefaultImageMask,
  getImageMaskMetrics,
  imageMaskFromPixels,
  imageMaskToPixels
} from '../modules/imageMasking.js';
import { getDefaultWebImageName, getWebImageCaption } from '../modules/webImageMetadata.js';

const pageHeading = document.querySelector('#image-editor-heading');
const pageStatus = document.querySelector('#image-editor-status');
const pageError = document.querySelector('#image-editor-error');
const editorStage = document.querySelector('#image-editor-stage');
const editorImage = document.querySelector('#image-editor-image');
const editorOverlay = document.querySelector('#image-editor-overlay');
const editorDimPath = document.querySelector('#image-editor-dim-path');
const editorHitRing = document.querySelector('#image-editor-hit-ring');
const editorOutline = document.querySelector('#image-editor-outline');
const editorOutlineShadow = document.querySelector('#image-editor-outline-shadow');
const editorCloseButton = document.querySelector('#editor-close-button');

const confirmationDialog = document.querySelector('#editor-confirmation-dialog');
const confirmationTitle = document.querySelector('#editor-confirmation-title');
const confirmationMessage = document.querySelector('#editor-confirmation-message');
const confirmationCancelButton = document.querySelector('#editor-confirmation-cancel');
const confirmationOkButton = document.querySelector('#editor-confirmation-ok');
const actionButtons = [...document.querySelectorAll('[data-editor-action]')];

const urlParams = new URLSearchParams(window.location.search);
const source = urlParams.get('source');
const imageId = urlParams.get('id');
const returnHref = source === 'web' ? './web-images.html' : './user-images.html';

let imageRecord = null;
let objectUrl = '';
let savedMask = getDefaultImageMask();
let currentMask = getDefaultImageMask();
let pendingAction = '';
let allowNavigation = false;
let dragState = null;

await initialize();

async function initialize() {
  bindActionButtons();
  bindEditorInteractions();

  if (!isSupportedSource(source) || !imageId) {
    showError('Choose a user image or web image to edit.');
    return;
  }

  imageRecord = source === 'user'
    ? await repository.getUserImage(imageId)
    : await repository.getWebImage(imageId);

  if (!imageRecord) {
    showError('That image could not be found in browser storage.');
    return;
  }

  const label = getImageLabel(imageRecord);
  pageHeading.textContent = `Image Editor - ${label}`;
  document.title = `FindIt | Image Editor | ${label}`;
  editorImage.alt = label;

  if (source === 'user') {
    objectUrl = URL.createObjectURL(imageRecord.blob);
    editorImage.src = objectUrl;
  } else {
    editorImage.src = imageRecord.url;
  }

  try {
    await waitForImage(editorImage);
  } catch {
    showError('The image could not be loaded for editing.');
    return;
  }

  savedMask = clampCurrentMask(imageRecord.mask ?? getDefaultImageMask());
  currentMask = savedMask;
  pageStatus.textContent = 'Drag inside the circle to move it, or drag the edge to resize it.';
  renderOverlay();
}

function bindActionButtons() {
  for (const button of actionButtons) {
    button.addEventListener('click', () => {
      const details = button.closest('details');
      if (details) {
        details.open = false;
      }
      openConfirmation(button.dataset.editorAction ?? '');
    });
  }

  editorCloseButton.addEventListener('click', () => {
    openConfirmation('cancel');
  });

  confirmationCancelButton.addEventListener('click', () => {
    closeConfirmation();
  });

  confirmationOkButton.addEventListener('click', () => {
    void performConfirmedAction();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !confirmationDialog.hidden) {
      event.preventDefault();
      closeConfirmation();
    }
  });

  window.addEventListener('beforeunload', (event) => {
    if (allowNavigation) {
      return;
    }

    event.preventDefault();
    event.returnValue = '';
    return '';
  });
}

function bindEditorInteractions() {
  editorStage.addEventListener('pointerdown', (event) => {
    const metrics = getEditorMetrics();
    if (!imageRecord || !metrics) {
      return;
    }

    const point = getPointerPoint(event, { clampToStage: false });
    if (!point) {
      return;
    }

    const hitMode = getHitMode(point, metrics);
    if (!hitMode) {
      return;
    }

    const maskPixels = getDisplayMaskPixels(currentMask, metrics);
    dragState = {
      mode: hitMode,
      pointerId: event.pointerId,
      startPoint: point,
      startMaskPixels: maskPixels
    };
    editorStage.setPointerCapture(event.pointerId);
    updateCursor(point);
    event.preventDefault();
  });

  editorStage.addEventListener('pointermove', (event) => {
    const metrics = getEditorMetrics();
    const point = getPointerPoint(event, { clampToStage: Boolean(dragState) });
    if (!point) {
      return;
    }

    if (!dragState || dragState.pointerId !== event.pointerId) {
      updateCursor(point, metrics);
      return;
    }

    const deltaX = point.x - dragState.startPoint.x;
    const deltaY = point.y - dragState.startPoint.y;

    if (dragState.mode === 'move') {
      currentMask = clampCurrentMask(displayMaskPixelsToMask({
        centerX: dragState.startMaskPixels.centerX + deltaX,
        centerY: dragState.startMaskPixels.centerY + deltaY,
        radius: dragState.startMaskPixels.radius
      }, metrics));
    } else if (dragState.mode === 'resize') {
      currentMask = clampCurrentMask(displayMaskPixelsToMask({
        centerX: dragState.startMaskPixels.centerX,
        centerY: dragState.startMaskPixels.centerY,
        radius: Math.hypot(point.x - dragState.startMaskPixels.centerX, point.y - dragState.startMaskPixels.centerY)
      }, metrics));
    }

    renderOverlay();
  });

  editorStage.addEventListener('pointerup', (event) => {
    if (dragState && dragState.pointerId === event.pointerId) {
      dragState = null;
      editorStage.releasePointerCapture(event.pointerId);
    }

    updateCursor(getPointerPoint(event, { clampToStage: false }), getEditorMetrics());
  });

  editorStage.addEventListener('pointercancel', () => {
    dragState = null;
    editorStage.style.cursor = 'default';
  });

  window.addEventListener('resize', () => {
    if (!imageRecord || !getEditorMetrics()) {
      return;
    }

    currentMask = clampCurrentMask(currentMask);
    renderOverlay();
  });
}

function openConfirmation(action) {
  if (action === 'save' && masksEqual(currentMask, savedMask)) {
    void performSave();
    return;
  }

  if (action === 'cancel' && masksEqual(currentMask, savedMask)) {
    navigateBack();
    return;
  }

  if (action === 'reset' && isDefaultMask(currentMask)) {
    currentMask = clampCurrentMask(getDefaultImageMask());
    renderOverlay();
    return;
  }

  pendingAction = action;
  const { title, message, confirmLabel, confirmClassName } = getConfirmationCopy(action);
  confirmationTitle.textContent = title;
  confirmationMessage.textContent = message;
  confirmationOkButton.textContent = confirmLabel;
  confirmationOkButton.className = confirmClassName;
  confirmationDialog.hidden = false;
}

function closeConfirmation() {
  pendingAction = '';
  confirmationDialog.hidden = true;
}

async function performConfirmedAction() {
  const action = pendingAction;
  closeConfirmation();

  if (action === 'save') {
    await performSave();
    return;
  }

  if (action === 'reset') {
    currentMask = clampCurrentMask(getDefaultImageMask());
    renderOverlay();
    return;
  }

  if (action === 'cancel') {
    navigateBack();
  }
}

function renderOverlay() {
  const metrics = getEditorMetrics();
  if (!metrics) {
    return;
  }

  currentMask = clampCurrentMask(currentMask);
  const maskPixels = getDisplayMaskPixels(currentMask, metrics);
  const handleWidth = getHandleWidth(metrics.stageWidth, metrics.stageHeight);
  const visibleStrokeWidth = getVisibleStrokeWidth(metrics.stageWidth, metrics.stageHeight);
  const visibleOutlineRadius = maskPixels.radius + (visibleStrokeWidth / 2);
  const shadowStrokeWidth = visibleStrokeWidth + 2;
  const shadowOutlineRadius = maskPixels.radius + (shadowStrokeWidth / 2);
  const path = [
    `M0 0 H${metrics.stageWidth} V${metrics.stageHeight} H0 Z`,
    `M ${maskPixels.centerX} ${maskPixels.centerY} m -${maskPixels.radius}, 0`,
    `a ${maskPixels.radius} ${maskPixels.radius} 0 1 0 ${maskPixels.radius * 2} 0`,
    `a ${maskPixels.radius} ${maskPixels.radius} 0 1 0 -${maskPixels.radius * 2} 0`
  ].join(' ');

  editorOverlay.setAttribute('viewBox', `0 0 ${metrics.stageWidth} ${metrics.stageHeight}`);
  editorDimPath.setAttribute('d', path);
  editorHitRing.setAttribute('cx', String(maskPixels.centerX));
  editorHitRing.setAttribute('cy', String(maskPixels.centerY));
  editorHitRing.setAttribute('r', String(maskPixels.radius));
  editorHitRing.setAttribute('stroke-width', String(handleWidth));
  editorOutlineShadow.setAttribute('cx', String(maskPixels.centerX));
  editorOutlineShadow.setAttribute('cy', String(maskPixels.centerY));
  editorOutlineShadow.setAttribute('r', String(shadowOutlineRadius));
  editorOutlineShadow.setAttribute('stroke-width', String(shadowStrokeWidth));
  editorOutline.setAttribute('cx', String(maskPixels.centerX));
  editorOutline.setAttribute('cy', String(maskPixels.centerY));
  editorOutline.setAttribute('r', String(visibleOutlineRadius));
  editorOutline.setAttribute('stroke-width', String(visibleStrokeWidth));

  pageStatus.textContent = masksEqual(currentMask, savedMask)
    ? 'Mask saved. Drag inside the circle to move it, or drag the edge to resize it.'
    : 'Unsaved mask changes. Save to store them in browser storage.';
}

function clampCurrentMask(mask) {
  const metrics = getEditorMetrics();
  return clampImageMask(mask, metrics?.imageWidth || editorImage.naturalWidth, metrics?.imageHeight || editorImage.naturalHeight, {
    minRadius: 10
  });
}

function getConfirmationCopy(action) {
  if (action === 'save') {
    return {
      title: 'Save Image Mask',
      message: 'Save this circular mask to browser storage and leave the Image Editor?',
      confirmLabel: 'Save',
      confirmClassName: 'btn btn-primary'
    };
  }

  if (action === 'reset') {
    return {
      title: 'Reset Mask',
      message: 'Reset the circular mask to the default shape? This changes only the editor state until you choose Save.',
      confirmLabel: 'Reset',
      confirmClassName: 'btn btn-warning'
    };
  }

  return {
    title: 'Cancel Editing',
    message: 'Leave the Image Editor without saving the current circular mask changes?',
    confirmLabel: 'Discard Changes',
    confirmClassName: 'btn btn-danger'
  };
}

function getHitMode(point, metrics = getEditorMetrics()) {
  if (!metrics) {
    return '';
  }

  const maskPixels = getDisplayMaskPixels(currentMask, metrics);
  const distance = Math.hypot(point.x - maskPixels.centerX, point.y - maskPixels.centerY);
  const edgeWidth = getHandleWidth(metrics.stageWidth, metrics.stageHeight);

  if (Math.abs(distance - maskPixels.radius) <= edgeWidth / 2) {
    return 'resize';
  }

  if (distance < maskPixels.radius) {
    return 'move';
  }

  return '';
}

function updateCursor(point, metrics = getEditorMetrics()) {
  if (!point) {
    editorStage.style.cursor = 'default';
    return;
  }

  const hitMode = dragState?.mode ?? getHitMode(point, metrics);
  editorStage.style.cursor = hitMode === 'resize'
    ? 'nwse-resize'
    : hitMode === 'move'
      ? 'grab'
      : 'default';
}

function getPointerPoint(event, { clampToStage }) {
  const rect = editorStage.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return null;
  }

  const rawX = event.clientX - rect.left;
  const rawY = event.clientY - rect.top;
  if (!clampToStage && (rawX < 0 || rawY < 0 || rawX > rect.width || rawY > rect.height)) {
    return null;
  }

  return {
    x: clamp(rawX, 0, rect.width),
    y: clamp(rawY, 0, rect.height)
  };
}

function getHandleWidth(width, height) {
  return Math.max(14, Math.min(28, Math.min(width, height) * 0.06));
}

function getVisibleStrokeWidth(width, height) {
  return Math.max(2, Math.min(4, Math.min(width, height) * 0.008));
}

function getImageLabel(record) {
  return source === 'user'
    ? (record.name || record.fileName)
    : getWebImageCaption({
      ...record,
      name: record.name || getDefaultWebImageName(record.url)
    });
}

function isSupportedSource(value) {
  return value === 'user' || value === 'web';
}

function masksEqual(left, right) {
  return Math.abs(left.centerX - right.centerX) < 0.0001
    && Math.abs(left.centerY - right.centerY) < 0.0001
    && Math.abs(left.radius - right.radius) < 0.0001;
}

function isDefaultMask(mask) {
  return masksEqual(clampCurrentMask(mask), clampCurrentMask(getDefaultImageMask()));
}

async function performSave() {
  if (!imageRecord) {
    return;
  }

  const maskToSave = clampCurrentMask(currentMask);
  if (source === 'user') {
    await repository.saveUserImageMask(imageRecord.id, maskToSave);
  } else {
    await repository.saveWebImageMask(imageRecord.id, maskToSave);
  }

  savedMask = maskToSave;
  navigateBack();
}

function navigateBack() {
  allowNavigation = true;
  window.location.assign(returnHref);
}

function showError(message) {
  pageError.hidden = false;
  pageError.textContent = message;
  pageStatus.textContent = 'Image Editor is unavailable.';
  pageHeading.textContent = 'Image Editor';
  editorStage.hidden = true;
}

function getEditorMetrics() {
  const stageWidth = editorStage.clientWidth;
  const stageHeight = editorStage.clientHeight;
  const imageWidth = editorImage.clientWidth;
  const imageHeight = editorImage.clientHeight;
  if (!stageWidth || !stageHeight || !imageWidth || !imageHeight) {
    return null;
  }

  return {
    stageWidth,
    stageHeight,
    imageWidth,
    imageHeight,
    imageLeft: (stageWidth - imageWidth) / 2,
    imageTop: (stageHeight - imageHeight) / 2
  };
}

function getDisplayMaskPixels(mask, metrics) {
  const imageMaskPixels = imageMaskToPixels(mask, metrics.imageWidth, metrics.imageHeight);
  return {
    centerX: metrics.imageLeft + imageMaskPixels.centerX,
    centerY: metrics.imageTop + imageMaskPixels.centerY,
    radius: imageMaskPixels.radius
  };
}

function displayMaskPixelsToMask(maskPixels, metrics) {
  return imageMaskFromPixels({
    centerX: maskPixels.centerX - metrics.imageLeft,
    centerY: maskPixels.centerY - metrics.imageTop,
    radius: maskPixels.radius
  }, metrics.imageWidth, metrics.imageHeight);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function waitForImage(image) {
  return new Promise((resolve, reject) => {
    if (image.complete && image.naturalWidth > 0) {
      resolve();
      return;
    }

    image.addEventListener('load', () => resolve(), { once: true });
    image.addEventListener('error', () => reject(new Error('Failed to load image.')), { once: true });
  });
}

window.addEventListener('beforeunload', () => {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
  }
});
