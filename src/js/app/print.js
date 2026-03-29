import { markDirty } from '../modules/deckSession.js';
import { loadTempDeckOrDefault, renderDeckHeaderAndTitle, renderDeckStatusLine, repository, saveTempDeck } from '../modules/deckFlowCommon.js';
import { createDeckCardEntries } from '../modules/deckCardEntries.js';
import { getDefaultPrintOptions, saveDefaultPrintOptions } from '../modules/printDefaults.js';
import { formatMeasurement, getRecommendedLayoutId, normalizePrintOptions, planPrintLayout, resolveEffectiveDpi } from '../modules/printOptions.js';
import { renderPrintPreviewSheet, renderPrintableSheets } from '../modules/printSheetRenderer.js';

const pageHeading = document.querySelector('header h1');
const deckStatusLine = document.querySelector('#deck-status-line');
const printOptionsForm = document.querySelector('#print-options-form');
const customPageSizeFields = document.querySelector('#custom-page-size-fields');
const customDpiRow = document.querySelector('#custom-dpi-row');
const printQualitySummary = document.querySelector('#print-quality-summary');
const printOptionsMessage = document.querySelector('#print-options-message');
const printButton = document.querySelector('#print-button');
const savePrintDefaultsButton = document.querySelector('#save-print-defaults-button');
const printTipsButton = document.querySelector('#print-tips-button');
const printTipsDialog = document.querySelector('#print-tips-dialog');
const printTipsClose = document.querySelector('#print-tips-close');
const layoutSizeDialog = document.querySelector('#layout-size-dialog');
const layoutSizeDialogMessage = document.querySelector('#layout-size-dialog-message');
const layoutSizeDialogOk = document.querySelector('#layout-size-dialog-ok');
const layoutSizeDialogCancel = document.querySelector('#layout-size-dialog-cancel');
const printPreview = document.querySelector('#print-preview');
const printPreviewEmpty = document.querySelector('#print-preview-empty');
const printPreviewPrev = document.querySelector('#print-preview-prev');
const printPreviewNext = document.querySelector('#print-preview-next');
const printPreviewPageLabel = document.querySelector('#print-preview-page-label');
const printSheetOutput = document.querySelector('#print-sheet-output');

let tempDeck = await loadTempDeckOrDefault();
let cardEntries = [];
let disposeCardEntries = () => {};
let previewPageIndex = 0;
let layoutPlan = null;
let renderVersion = 0;
let isRenderingPreview = false;
let pendingLayoutSizeChange = null;
const APPROX_HTML_ENTITY = '&#8776;';

function updateHeader() {
  renderDeckStatusLine(deckStatusLine, tempDeck);
  renderDeckHeaderAndTitle({ headingElement: pageHeading, pageLabel: 'Print', tempDeck });
}

function renderForm() {
  const printOptions = normalizePrintOptions(tempDeck.printOptions);
  for (const element of printOptionsForm.elements) {
    if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLSelectElement)) {
      continue;
    }

    const name = element.name;
    if (!name) {
      continue;
    }

    if (element instanceof HTMLInputElement && element.type === 'checkbox') {
      element.checked = Boolean(printOptions[name]);
      continue;
    }

    element.value = printOptions[name] ?? '';
  }
}

function getLayoutSelect() {
  const layoutSelect = printOptionsForm.elements.namedItem('layoutId');
  return layoutSelect instanceof HTMLSelectElement ? layoutSelect : null;
}

function getRawFieldValue(name) {
  const field = printOptionsForm.elements.namedItem(name);
  return field && 'value' in field ? String(field.value).trim() : '';
}

function updateLayoutOptions(printOptions, selectedLayoutId) {
  const layoutSelect = getLayoutSelect();
  if (!layoutSelect) {
    return;
  }

  const previousValue = selectedLayoutId ?? layoutSelect.value;
  layoutSelect.innerHTML = '';

  for (const layoutId of ['1-up', '2-up', '4-up', '6-up', '9-up', '12-up']) {
    const planned = planPrintLayout(1, { ...printOptions, layoutId }, tempDeck.generationOptions);
    const option = document.createElement('option');
    option.value = layoutId;
    if (planned.isValid) {
      option.innerHTML = `${layoutId} (Max Card Size ${APPROX_HTML_ENTITY} ${formatMeasurement(planned.maxCardWidthIn, printOptions.units)})`;
    } else {
      option.textContent = `${layoutId} (Not available)`;
    }
    option.selected = layoutId === previousValue;
    layoutSelect.appendChild(option);
  }
}

function formatInputNumber(value, fractionDigits = 2) {
  if (!Number.isFinite(value)) {
    return '';
  }

  return String(Number.parseFloat(value.toFixed(fractionDigits)));
}

function closeLayoutSizeDialog() {
  pendingLayoutSizeChange = null;
  if (layoutSizeDialog.open) {
    layoutSizeDialog.close();
  }
}

function confirmLayoutSizeDialog() {
  if (!pendingLayoutSizeChange) {
    closeLayoutSizeDialog();
    return;
  }

  const nextLayoutId = pendingLayoutSizeChange.layoutId;
  const desiredCardSizeField = printOptionsForm.elements.namedItem('desiredCardSize');
  if (desiredCardSizeField && 'value' in desiredCardSizeField) {
    desiredCardSizeField.value = pendingLayoutSizeChange.desiredCardSizeValue;
  }

  closeLayoutSizeDialog();
  void refreshPreview({ selectedLayoutId: nextLayoutId, autoRecommend: false });
}

function cancelLayoutSizeDialog() {
  const layoutSelect = getLayoutSelect();
  if (layoutSelect) {
    layoutSelect.value = tempDeck.printOptions.layoutId;
  }

  closeLayoutSizeDialog();
  void refreshPreview();
}

function openLayoutSizeDialog(layoutId, expectedCardWidth, units) {
  pendingLayoutSizeChange = {
    layoutId,
    desiredCardSizeValue: formatInputNumber(expectedCardWidth)
  };
  layoutSizeDialogMessage.textContent = `The ${layoutId} page layout requires a smaller card size of ${formatInputNumber(expectedCardWidth)} ${units}. Do you want to change the Desired Card Size to match?`;
  layoutSizeDialog.showModal();
  layoutSizeDialogOk.focus();
}

function getPrintOptionsFromForm() {
  const formData = new FormData(printOptionsForm);
  return normalizePrintOptions({
    pageSizeId: formData.get('pageSizeId'),
    orientation: formData.get('orientation'),
    units: formData.get('units'),
    desiredCardSize: formData.get('desiredCardSize'),
    customPageWidth: formData.get('customPageWidth'),
    customPageHeight: formData.get('customPageHeight'),
    marginTop: formData.get('marginTop'),
    marginRight: formData.get('marginRight'),
    marginBottom: formData.get('marginBottom'),
    marginLeft: formData.get('marginLeft'),
    layoutId: formData.get('layoutId'),
    qualityPreset: formData.get('qualityPreset'),
    customDpi: formData.get('customDpi'),
    showCardNumber: formData.get('showCardNumber') === 'on',
    showCardOutline: formData.get('showCardOutline') === 'on',
    markupColor: formData.get('markupColor'),
    cardOutlineDashStyle: formData.get('cardOutlineDashStyle')
  });
}

function updateConditionalFields(printOptions) {
  customPageSizeFields.hidden = printOptions.pageSizeId !== 'custom';
  customDpiRow.hidden = printOptions.qualityPreset !== 'custom';
  const effectiveDpi = resolveEffectiveDpi(printOptions);
  printQualitySummary.textContent = effectiveDpi
    ? `Rendering target: ${effectiveDpi} dpi.`
    : 'Enter a custom dpi value to finish the print setup.';
}

function validateCustomFields(printOptions) {
  const desiredCardSizeRaw = getRawFieldValue('desiredCardSize');
  if (!desiredCardSizeRaw || !/^(?:\d+\.?\d*|\.\d+)$/.test(desiredCardSizeRaw) || Number.parseFloat(desiredCardSizeRaw) <= 0) {
    return 'Desired card size must be a positive number.';
  }

  const desiredCardSize = Number.parseFloat(desiredCardSizeRaw);
  const minimumDesiredCardSize = printOptions.units === 'mm' ? 25 : 1;
  if (desiredCardSize < minimumDesiredCardSize) {
    return `Desired card size must be at least ${minimumDesiredCardSize} ${printOptions.units}.`;
  }

  if (printOptions.pageSizeId === 'custom') {
    if (!printOptions.customPageWidth || !printOptions.customPageHeight) {
      return 'Custom page width and height must both be positive numbers.';
    }
  }

  if (printOptions.qualityPreset === 'custom' && !printOptions.customDpi) {
    return 'Custom DPI must be a positive whole number.';
  }

  return '';
}

async function persistPrintOptions(printOptions) {
  const didChange = JSON.stringify(printOptions) !== JSON.stringify(tempDeck.printOptions);
  if (!didChange) {
    return;
  }

  tempDeck = markDirty({ ...tempDeck, printOptions });
  await saveTempDeck(tempDeck);
  updateHeader();
}

async function refreshPreview(options = {}) {
  const { selectedLayoutId = null, autoRecommend = true } = options;
  const version = renderVersion += 1;
  const rawPrintOptions = getPrintOptionsFromForm();
  const customValidationMessage = validateCustomFields(rawPrintOptions);
  const resolvedLayoutId = autoRecommend
    ? getRecommendedLayoutId(rawPrintOptions)
    : (selectedLayoutId ?? rawPrintOptions.layoutId ?? tempDeck.printOptions.layoutId);
  const layoutSelect = getLayoutSelect();
  if (layoutSelect) {
    layoutSelect.value = resolvedLayoutId;
  }

  const printOptions = normalizePrintOptions({
    ...rawPrintOptions,
    layoutId: resolvedLayoutId
  });

  updateConditionalFields(printOptions);
  updateLayoutOptions(printOptions, resolvedLayoutId);

  if (customValidationMessage) {
    layoutPlan = null;
    printOptionsMessage.textContent = customValidationMessage;
    printButton.disabled = true;
    printPreview.innerHTML = '';
    printPreviewEmpty.hidden = false;
    printPreviewEmpty.textContent = customValidationMessage;
    printPreviewPrev.disabled = true;
    printPreviewNext.disabled = true;
    printPreviewPageLabel.textContent = 'Page 0 of 0';
    return;
  }

  await persistPrintOptions(printOptions);
  layoutPlan = planPrintLayout(cardEntries.length, printOptions, tempDeck.generationOptions);

  if (!layoutPlan.isValid) {
    printOptionsMessage.textContent = layoutPlan.validationMessage;
    printButton.disabled = true;
    printPreview.innerHTML = '';
    printPreviewEmpty.hidden = false;
    printPreviewEmpty.textContent = layoutPlan.validationMessage;
    printPreviewPrev.disabled = true;
    printPreviewNext.disabled = true;
    printPreviewPageLabel.textContent = 'Page 0 of 0';
    return;
  }

  printOptionsMessage.textContent = 'Print options are ready. Use the browser print dialog for final printer and paper settings.';
  printButton.disabled = false;
  printPreviewEmpty.hidden = true;

  if (previewPageIndex >= layoutPlan.pageCount) {
    previewPageIndex = layoutPlan.pageCount - 1;
  }
  previewPageIndex = Math.max(0, previewPageIndex);
  printPreviewPrev.disabled = previewPageIndex === 0;
  printPreviewNext.disabled = previewPageIndex >= layoutPlan.pageCount - 1;
  printPreviewPageLabel.textContent = `Page ${previewPageIndex + 1} of ${layoutPlan.pageCount}`;

  if (isRenderingPreview) {
    return;
  }

  isRenderingPreview = true;
  try {
    await renderPrintPreviewSheet({
      containerElement: printPreview,
      layoutPlan,
      page: layoutPlan.pages[previewPageIndex],
      cardEntries,
      generationOptions: tempDeck.generationOptions,
      printOptions,
      mode: 'preview'
    });
  } finally {
    isRenderingPreview = false;
    if (version !== renderVersion) {
      await refreshPreview(options);
    }
  }
}
function updatePrintPageStyle(layout) {
  let styleElement = document.querySelector('#dynamic-print-page-style');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'dynamic-print-page-style';
    document.head.appendChild(styleElement);
  }

  if (!layout?.isValid) {
    styleElement.textContent = '';
    return;
  }

  styleElement.textContent = `@page { size: ${layout.pageWidthIn}in ${layout.pageHeightIn}in; margin: 0; }`;
}

printOptionsForm.addEventListener('input', (event) => {
  const target = event.target;
  if (target instanceof HTMLSelectElement && target.name === 'layoutId') {
    return;
  }

  void refreshPreview();
});
printOptionsForm.addEventListener('change', (event) => {
  const target = event.target;
  if (target instanceof HTMLSelectElement && target.name === 'layoutId') {
    const printOptions = getPrintOptionsFromForm();
    const desiredCardSize = Number.parseFloat(printOptions.desiredCardSize);
    const planned = planPrintLayout(1, { ...printOptions, layoutId: target.value }, tempDeck.generationOptions);
    if (planned.isValid && Number.isFinite(desiredCardSize) && planned.expectedCardWidth < desiredCardSize) {
      openLayoutSizeDialog(target.value, planned.expectedCardWidth, printOptions.units);
      return;
    }

    void refreshPreview({ selectedLayoutId: target.value, autoRecommend: false });
    return;
  }

  void refreshPreview();
});

printPreviewPrev.addEventListener('click', () => {
  if (!layoutPlan || previewPageIndex <= 0) {
    return;
  }
  previewPageIndex -= 1;
  void refreshPreview();
});

printPreviewNext.addEventListener('click', () => {
  if (!layoutPlan || previewPageIndex >= layoutPlan.pageCount - 1) {
    return;
  }
  previewPageIndex += 1;
  void refreshPreview();
});

printButton.addEventListener('click', () => {
  void (async () => {
    await refreshPreview();
    if (!layoutPlan?.isValid) {
      return;
    }

    const printOptions = getPrintOptionsFromForm();
    updatePrintPageStyle(layoutPlan);
    printOptionsMessage.textContent = 'Preparing high-resolution print sheets...';
    await renderPrintableSheets({
      containerElement: printSheetOutput,
      layoutPlan,
      cardEntries,
      generationOptions: tempDeck.generationOptions,
      printOptions
    });
    printOptionsMessage.textContent = 'Opening the browser print dialog...';
    window.print();
    printOptionsMessage.textContent = 'The browser print dialog controls the final printer, paper, and hardware settings.';
  })();
});

savePrintDefaultsButton.addEventListener('click', () => {
  const printOptions = getPrintOptionsFromForm();
  saveDefaultPrintOptions(printOptions);
  printOptionsMessage.textContent = 'These print options are now the default for new decks.';
});

layoutSizeDialogOk.addEventListener('click', () => {
  confirmLayoutSizeDialog();
});

layoutSizeDialogCancel.addEventListener('click', () => {
  cancelLayoutSizeDialog();
});

layoutSizeDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  cancelLayoutSizeDialog();
});

layoutSizeDialog.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    confirmLayoutSizeDialog();
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    cancelLayoutSizeDialog();
  }
});

printTipsButton.addEventListener('click', () => {
  printTipsDialog.showModal();
});

printTipsClose.addEventListener('click', () => {
  printTipsDialog.close();
});

window.addEventListener('beforeunload', () => {
  disposeCardEntries();
});

const [userImages, webImages] = await Promise.all([
  repository.listUserImages(),
  repository.listWebImages()
]);

const cardEntryContext = createDeckCardEntries(tempDeck, userImages, webImages);
cardEntries = cardEntryContext.cardEntries;
disposeCardEntries = cardEntryContext.dispose;

tempDeck = {
  ...tempDeck,
  printOptions: normalizePrintOptions(tempDeck.printOptions ?? getDefaultPrintOptions())
};

renderForm();
updateHeader();
updateConditionalFields(tempDeck.printOptions);
updatePrintPageStyle(layoutPlan);
await refreshPreview();














