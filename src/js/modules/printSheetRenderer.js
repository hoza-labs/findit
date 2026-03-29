import { drawImagesOnSquareTarget } from './cardCanvasRenderer.js';
import { resolveEffectiveDpi } from './printOptions.js';

const CSS_PIXELS_PER_INCH = 96;

export async function renderPrintPreviewSheet({
  containerElement,
  layoutPlan,
  page,
  cardEntries,
  generationOptions,
  printOptions,
  mode = 'preview'
}) {
  if (!containerElement || !layoutPlan?.isValid || !page) {
    return;
  }

  containerElement.innerHTML = '';
  const sheet = createSheetElement(layoutPlan, page, mode);
  containerElement.appendChild(sheet);
  await populateSheetCards(sheet, layoutPlan, page, cardEntries, generationOptions, printOptions, mode);
}

export async function renderPrintableSheets({
  containerElement,
  layoutPlan,
  cardEntries,
  generationOptions,
  printOptions
}) {
  if (!containerElement) {
    return;
  }

  containerElement.innerHTML = '';
  if (!layoutPlan?.isValid) {
    return;
  }

  for (const page of layoutPlan.pages) {
    const sheet = createSheetElement(layoutPlan, page, 'print');
    containerElement.appendChild(sheet);
    await populateSheetCards(sheet, layoutPlan, page, cardEntries, generationOptions, printOptions, 'print');
  }
}

function createSheetElement(layoutPlan, page, mode) {
  const sheet = document.createElement('section');
  sheet.className = `print-sheet-page print-sheet-page--${mode}`;
  sheet.style.setProperty('--print-sheet-width-in', String(layoutPlan.pageWidthIn));
  sheet.style.setProperty('--print-sheet-height-in', String(layoutPlan.pageHeightIn));
  sheet.style.setProperty('--print-sheet-page-aspect', String(layoutPlan.pageWidthIn / layoutPlan.pageHeightIn));
  sheet.setAttribute('aria-label', `Printable sheet ${page.pageNumber} of ${layoutPlan.pageCount}`);

  const pageSurface = document.createElement('div');
  pageSurface.className = 'print-sheet-surface';

  for (const slot of page.slots) {
    const cardSlot = document.createElement('div');
    cardSlot.className = 'print-sheet-card-slot';
    cardSlot.style.left = `${(slot.leftIn / layoutPlan.pageWidthIn) * 100}%`;
    cardSlot.style.top = `${(slot.topIn / layoutPlan.pageHeightIn) * 100}%`;
    cardSlot.style.width = `${(slot.sizeIn / layoutPlan.pageWidthIn) * 100}%`;
    cardSlot.style.height = `${(slot.sizeIn / layoutPlan.pageHeightIn) * 100}%`;

    const cardTarget = document.createElement('div');
    cardTarget.className = 'print-sheet-card-target';
    cardTarget.dataset.cardIndex = String(slot.cardIndex);
    cardTarget.dataset.cardNumber = String(slot.cardNumber);

    cardSlot.appendChild(cardTarget);
    pageSurface.appendChild(cardSlot);
  }

  sheet.appendChild(pageSurface);
  return sheet;
}

async function populateSheetCards(sheetElement, layoutPlan, page, cardEntries, generationOptions, printOptions, mode) {
  const effectiveDpi = resolveEffectiveDpi(printOptions) ?? 300;
  const slotElements = sheetElement.querySelectorAll('.print-sheet-card-target');

  for (const [index, targetElement] of slotElements.entries()) {
    const slot = page.slots[index];
    const cardEntry = cardEntries[slot.cardIndex];
    await drawImagesOnSquareTarget(
      targetElement,
      cardEntry.sources,
      generationOptions,
      {
        sideLength: mode === 'print' ? slot.sizeIn * CSS_PIXELS_PER_INCH : null,
        renderScale: mode === 'print' ? effectiveDpi / CSS_PIXELS_PER_INCH : null,
        cardNumberText: printOptions.showCardNumber ? String(cardEntry.cardNumber) : '',
        showCardOutline: printOptions.showCardOutline,
        markupColor: printOptions.markupColor,
        cardOutlineDashStyle: printOptions.cardOutlineDashStyle
      }
    );
  }
}
