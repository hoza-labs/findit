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
const expectedCardWidth = document.querySelector('#expected-card-width');
const printOptionsMessage = document.querySelector('#print-options-message');
const printButton = document.querySelector('#print-button');
const savePrintDefaultsButton = document.querySelector('#save-print-defaults-button');
const printTipsButton = document.querySelector('#print-tips-button');
const printTipsDialog = document.querySelector('#print-tips-dialog');
const printTipsClose = document.querySelector('#print-tips-close');
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

function getPrintOptionsFromForm() {
  const formData = new FormData(printOptionsForm);
  return normalizePrintOptions({
    pageSizeId: formData.get('pageSizeId'),
    orientation: formData.get('orientation'),
    units: formData.get('units'),
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

async function refreshPreview() {
  const version = renderVersion += 1;
  const printOptions = getPrintOptionsFromForm();
  updateConditionalFields(printOptions);
  await persistPrintOptions(printOptions);

  const customValidationMessage = validateCustomFields(printOptions);
  layoutPlan = customValidationMessage ? null : planPrintLayout(cardEntries.length, printOptions, tempDeck.generationOptions);

  if (customValidationMessage) {
    printOptionsMessage.textContent = customValidationMessage;
    expectedCardWidth.textContent = '--';
    printButton.disabled = true;
    printPreview.innerHTML = '';
    printPreviewEmpty.hidden = false;
    printPreviewEmpty.textContent = customValidationMessage;
    printPreviewPrev.disabled = true;
    printPreviewNext.disabled = true;
    printPreviewPageLabel.textContent = 'Page 0 of 0';
    return;
  }

  if (!layoutPlan.isValid) {
    printOptionsMessage.textContent = layoutPlan.validationMessage;
    expectedCardWidth.textContent = '--';
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
  expectedCardWidth.textContent = formatMeasurement(layoutPlan.expectedCardWidthIn, printOptions.units);
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
      await refreshPreview();
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

printOptionsForm.addEventListener('input', () => {
  void refreshPreview();
});

printOptionsForm.addEventListener('change', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) {
    return;
  }

  if (target.name === 'pageSizeId' || target.name === 'orientation') {
    const layoutSelect = printOptionsForm.elements.namedItem('layoutId');
    if (layoutSelect instanceof HTMLSelectElement) {
      const currentOptions = getPrintOptionsFromForm();
      if (layoutSelect.value === tempDeck.printOptions.layoutId) {
        layoutSelect.value = getRecommendedLayoutId(currentOptions);
      }
    }
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
