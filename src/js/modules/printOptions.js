export const PAGE_SIZE_DEFINITIONS = Object.freeze({
  letter: Object.freeze({ label: 'US Letter (8.5 x 11 in)', widthIn: 8.5, heightIn: 11 }),
  legal: Object.freeze({ label: 'US Legal (8.5 x 14 in)', widthIn: 8.5, heightIn: 14 }),
  tabloid: Object.freeze({ label: 'US Tabloid (11 x 17 in)', widthIn: 11, heightIn: 17 }),
  a3: Object.freeze({ label: 'A3 (297 x 420 mm)', widthIn: 11.6929, heightIn: 16.5354 }),
  a4: Object.freeze({ label: 'A4 (210 x 297 mm)', widthIn: 8.2677, heightIn: 11.6929 }),
  a5: Object.freeze({ label: 'A5 (148 x 210 mm)', widthIn: 5.8268, heightIn: 8.2677 })
});

export const PAGE_SIZE_IDS = Object.freeze([...Object.keys(PAGE_SIZE_DEFINITIONS), 'custom']);
export const PRINT_UNITS = Object.freeze(['in', 'mm']);
export const PRINT_LAYOUT_IDS = Object.freeze(['1-up', '2-up', '4-up', '6-up', '9-up', '12-up']);
export const PRINT_QUALITY_PRESETS = Object.freeze(['inkjet', 'laser', 'photo', 'professional', 'custom']);
export const CARD_NUMBER_POSITIONS = Object.freeze(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
export const CARD_OUTLINE_DASH_STYLES = Object.freeze(['solid', 'dashed', 'dotted']);

export const PRINT_GAP_IN = 0.125;
export const DEFAULT_PRINT_TARGET_CARD_WIDTH_IN = 4;

const MM_PER_INCH = 25.4;
const DPI_PRESET_VALUES = Object.freeze({
  inkjet: 300,
  laser: 600,
  photo: 1200,
  professional: 300
});

const LAYOUT_CANDIDATES = Object.freeze({
  '1-up': Object.freeze([[1, 1]]),
  '2-up': Object.freeze([[1, 2], [2, 1]]),
  '4-up': Object.freeze([[2, 2]]),
  '6-up': Object.freeze([[2, 3], [3, 2]]),
  '9-up': Object.freeze([[3, 3]]),
  '12-up': Object.freeze([[3, 4], [4, 3]])
});

export function createDefaultPrintOptions() {
  return {
    pageSizeId: 'letter',
    orientation: 'portrait',
    units: 'in',
    customPageWidth: '',
    customPageHeight: '',
    marginTop: '0.25',
    marginRight: '0.25',
    marginBottom: '0.25',
    marginLeft: '0.25',
    layoutId: '4-up',
    qualityPreset: 'inkjet',
    customDpi: '',
    showCardNumber: false,
    cardNumberPosition: 'bottom-right',
    showCardOutline: false,
    cardOutlineColor: '#000000',
    cardOutlineDashStyle: 'solid'
  };
}

export function normalizePrintOptions(rawOptions) {
  const defaults = createDefaultPrintOptions();
  const options = rawOptions && typeof rawOptions === 'object' ? rawOptions : defaults;

  return {
    pageSizeId: normalizeEnum(options.pageSizeId, PAGE_SIZE_IDS, defaults.pageSizeId),
    orientation: normalizeEnum(options.orientation, ['portrait', 'landscape'], defaults.orientation),
    units: normalizeEnum(options.units, PRINT_UNITS, defaults.units),
    customPageWidth: normalizePositiveNumberString(options.customPageWidth),
    customPageHeight: normalizePositiveNumberString(options.customPageHeight),
    marginTop: normalizeNonNegativeNumberString(options.marginTop, defaults.marginTop),
    marginRight: normalizeNonNegativeNumberString(options.marginRight, defaults.marginRight),
    marginBottom: normalizeNonNegativeNumberString(options.marginBottom, defaults.marginBottom),
    marginLeft: normalizeNonNegativeNumberString(options.marginLeft, defaults.marginLeft),
    layoutId: normalizeEnum(options.layoutId, PRINT_LAYOUT_IDS, defaults.layoutId),
    qualityPreset: normalizeEnum(options.qualityPreset, PRINT_QUALITY_PRESETS, defaults.qualityPreset),
    customDpi: normalizePositiveIntegerString(options.customDpi),
    showCardNumber: Boolean(options.showCardNumber),
    cardNumberPosition: normalizeEnum(options.cardNumberPosition, CARD_NUMBER_POSITIONS, defaults.cardNumberPosition),
    showCardOutline: Boolean(options.showCardOutline),
    cardOutlineColor: normalizeColor(options.cardOutlineColor, defaults.cardOutlineColor),
    cardOutlineDashStyle: normalizeEnum(options.cardOutlineDashStyle, CARD_OUTLINE_DASH_STYLES, defaults.cardOutlineDashStyle)
  };
}

export function getPageSizeOptions() {
  return PAGE_SIZE_IDS.map((id) => ({
    id,
    label: id === 'custom' ? 'Custom' : PAGE_SIZE_DEFINITIONS[id].label
  }));
}

export function getPrintLayoutOptions() {
  return PRINT_LAYOUT_IDS.map((id) => ({ id, label: id }));
}

export function getPrintQualityOptions() {
  return PRINT_QUALITY_PRESETS.map((id) => ({
    id,
    label: id === 'custom' ? 'Custom' : `${capitalize(id)} (${DPI_PRESET_VALUES[id]} dpi)`
  }));
}

export function resolvePageSize(printOptions) {
  const normalized = normalizePrintOptions(printOptions);
  const units = normalized.units;
  let widthIn;
  let heightIn;

  if (normalized.pageSizeId === 'custom') {
    widthIn = convertToInches(normalized.customPageWidth, units);
    heightIn = convertToInches(normalized.customPageHeight, units);
  } else {
    const preset = PAGE_SIZE_DEFINITIONS[normalized.pageSizeId] ?? PAGE_SIZE_DEFINITIONS.letter;
    widthIn = preset.widthIn;
    heightIn = preset.heightIn;
  }

  if (!Number.isFinite(widthIn) || !Number.isFinite(heightIn) || widthIn <= 0 || heightIn <= 0) {
    return {
      id: normalized.pageSizeId,
      label: normalized.pageSizeId === 'custom' ? 'Custom' : PAGE_SIZE_DEFINITIONS[normalized.pageSizeId]?.label ?? 'Custom',
      widthIn: null,
      heightIn: null,
      width: null,
      height: null,
      units,
      isCustom: normalized.pageSizeId === 'custom'
    };
  }

  const [resolvedWidthIn, resolvedHeightIn] = normalized.orientation === 'landscape'
    ? [Math.max(widthIn, heightIn), Math.min(widthIn, heightIn)]
    : [Math.min(widthIn, heightIn), Math.max(widthIn, heightIn)];

  return {
    id: normalized.pageSizeId,
    label: normalized.pageSizeId === 'custom' ? 'Custom' : PAGE_SIZE_DEFINITIONS[normalized.pageSizeId]?.label ?? 'Custom',
    widthIn: resolvedWidthIn,
    heightIn: resolvedHeightIn,
    width: convertInchesToUnits(resolvedWidthIn, units),
    height: convertInchesToUnits(resolvedHeightIn, units),
    units,
    isCustom: normalized.pageSizeId === 'custom'
  };
}

export function resolveEffectiveDpi(printOptions) {
  const normalized = normalizePrintOptions(printOptions);
  if (normalized.qualityPreset === 'custom') {
    return normalized.customDpi ? Number.parseInt(normalized.customDpi, 10) : null;
  }

  return DPI_PRESET_VALUES[normalized.qualityPreset] ?? DPI_PRESET_VALUES.inkjet;
}

export function getRecommendedLayoutId(printOptions) {
  let bestLayoutId = createDefaultPrintOptions().layoutId;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestCardWidthIn = -1;

  for (const layoutId of PRINT_LAYOUT_IDS) {
    const planned = planPrintLayout(1, { ...normalizePrintOptions(printOptions), layoutId });
    if (!planned.isValid) {
      continue;
    }

    const distance = Math.abs(planned.expectedCardWidthIn - DEFAULT_PRINT_TARGET_CARD_WIDTH_IN);
    if (
      distance < bestDistance
      || (Math.abs(distance - bestDistance) < 0.0001 && planned.expectedCardWidthIn > bestCardWidthIn)
    ) {
      bestLayoutId = layoutId;
      bestDistance = distance;
      bestCardWidthIn = planned.expectedCardWidthIn;
    }
  }

  return bestLayoutId;
}

export function planPrintLayout(cardCount, printOptions, generationOptions = undefined) {
  const normalized = normalizePrintOptions(printOptions);
  const pageSize = resolvePageSize(normalized);
  const marginsIn = {
    top: convertToInches(normalized.marginTop, normalized.units),
    right: convertToInches(normalized.marginRight, normalized.units),
    bottom: convertToInches(normalized.marginBottom, normalized.units),
    left: convertToInches(normalized.marginLeft, normalized.units)
  };

  if (!Number.isInteger(cardCount) || cardCount <= 0) {
    throw new Error('cardCount must be a positive integer.');
  }

  if (!Number.isFinite(pageSize.widthIn) || !Number.isFinite(pageSize.heightIn)) {
    return createInvalidPrintLayout('Page width and height must be valid positive numbers.', normalized, pageSize, marginsIn);
  }

  if (Object.values(marginsIn).some((value) => !Number.isFinite(value) || value < 0)) {
    return createInvalidPrintLayout('Margins must be zero or greater.', normalized, pageSize, marginsIn);
  }

  const printableWidthIn = pageSize.widthIn - marginsIn.left - marginsIn.right;
  const printableHeightIn = pageSize.heightIn - marginsIn.top - marginsIn.bottom;
  if (printableWidthIn <= 0 || printableHeightIn <= 0) {
    return createInvalidPrintLayout('Margins leave no printable space on the page.', normalized, pageSize, marginsIn);
  }

  const candidates = LAYOUT_CANDIDATES[normalized.layoutId] ?? LAYOUT_CANDIDATES['4-up'];
  let bestCandidate = null;

  for (const [rows, columns] of candidates) {
    const cardWidthIn = Math.min(
      (printableWidthIn - PRINT_GAP_IN * (columns - 1)) / columns,
      (printableHeightIn - PRINT_GAP_IN * (rows - 1)) / rows
    );

    if (!Number.isFinite(cardWidthIn) || cardWidthIn <= 0) {
      continue;
    }

    const gridWidthIn = columns * cardWidthIn + PRINT_GAP_IN * (columns - 1);
    const gridHeightIn = rows * cardWidthIn + PRINT_GAP_IN * (rows - 1);

    if (!bestCandidate || cardWidthIn > bestCandidate.cardWidthIn) {
      bestCandidate = {
        rows,
        columns,
        cardsPerPage: rows * columns,
        cardWidthIn,
        gridWidthIn,
        gridHeightIn
      };
    }
  }

  if (!bestCandidate) {
    return createInvalidPrintLayout('The selected layout does not fit inside the printable area.', normalized, pageSize, marginsIn);
  }

  const offsetXIn = marginsIn.left + (printableWidthIn - bestCandidate.gridWidthIn) / 2;
  const offsetYIn = marginsIn.top + (printableHeightIn - bestCandidate.gridHeightIn) / 2;
  const pageCount = Math.ceil(cardCount / bestCandidate.cardsPerPage);
  const pages = [];

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const slots = [];
    for (let slotIndex = 0; slotIndex < bestCandidate.cardsPerPage; slotIndex += 1) {
      const cardIndex = pageIndex * bestCandidate.cardsPerPage + slotIndex;
      if (cardIndex >= cardCount) {
        break;
      }

      const row = Math.floor(slotIndex / bestCandidate.columns);
      const column = slotIndex % bestCandidate.columns;
      const leftIn = offsetXIn + column * (bestCandidate.cardWidthIn + PRINT_GAP_IN);
      const topIn = offsetYIn + row * (bestCandidate.cardWidthIn + PRINT_GAP_IN);
      slots.push({
        cardIndex,
        cardNumber: cardIndex + 1,
        row,
        column,
        leftIn,
        topIn,
        sizeIn: bestCandidate.cardWidthIn
      });
    }

    pages.push({
      pageNumber: pageIndex + 1,
      slots
    });
  }

  return {
    isValid: true,
    validationMessage: '',
    printOptions: normalized,
    generationOptions,
    pageSize,
    pageWidthIn: pageSize.widthIn,
    pageHeightIn: pageSize.heightIn,
    printableWidthIn,
    printableHeightIn,
    marginsIn,
    gapIn: PRINT_GAP_IN,
    layoutId: normalized.layoutId,
    rows: bestCandidate.rows,
    columns: bestCandidate.columns,
    cardsPerPage: bestCandidate.cardsPerPage,
    expectedCardWidthIn: bestCandidate.cardWidthIn,
    expectedCardWidth: convertInchesToUnits(bestCandidate.cardWidthIn, normalized.units),
    units: normalized.units,
    pageCount,
    pages
  };
}

export function convertInchesToUnits(valueInInches, units = 'in') {
  if (!Number.isFinite(valueInInches)) {
    return null;
  }

  return units === 'mm'
    ? valueInInches * MM_PER_INCH
    : valueInInches;
}

export function formatMeasurement(valueInInches, units = 'in', fractionDigits = 2) {
  const convertedValue = convertInchesToUnits(valueInInches, units);
  if (!Number.isFinite(convertedValue)) {
    return '';
  }

  return `${trimTrailingZeros(convertedValue.toFixed(fractionDigits))} ${units}`;
}

function createInvalidPrintLayout(validationMessage, printOptions, pageSize, marginsIn) {
  return {
    isValid: false,
    validationMessage,
    printOptions,
    pageSize,
    pageWidthIn: pageSize.widthIn,
    pageHeightIn: pageSize.heightIn,
    printableWidthIn: null,
    printableHeightIn: null,
    marginsIn,
    gapIn: PRINT_GAP_IN,
    layoutId: printOptions.layoutId,
    rows: 0,
    columns: 0,
    cardsPerPage: 0,
    expectedCardWidthIn: null,
    expectedCardWidth: null,
    units: printOptions.units,
    pageCount: 0,
    pages: []
  };
}

function convertToInches(value, units) {
  const parsedValue = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return units === 'mm' ? parsedValue / MM_PER_INCH : parsedValue;
}

function normalizeEnum(value, allowedValues, fallback) {
  return allowedValues.includes(value) ? value : fallback;
}

function normalizePositiveNumberString(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return trimTrailingZeros(String(value));
  }

  if (typeof value !== 'string') {
    return '';
  }

  const trimmedValue = value.trim();
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(trimmedValue)) {
    return '';
  }

  const parsedValue = Number.parseFloat(trimmedValue);
  return parsedValue > 0 ? trimTrailingZeros(String(parsedValue)) : '';
}

function normalizeNonNegativeNumberString(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return trimTrailingZeros(String(value));
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmedValue = value.trim();
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(trimmedValue)) {
    return fallback;
  }

  const parsedValue = Number.parseFloat(trimmedValue);
  return parsedValue >= 0 ? trimTrailingZeros(String(parsedValue)) : fallback;
}

function normalizePositiveIntegerString(value) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return String(value);
  }

  if (typeof value !== 'string') {
    return '';
  }

  const trimmedValue = value.trim();
  if (!/^\d+$/.test(trimmedValue)) {
    return '';
  }

  const parsedValue = Number.parseInt(trimmedValue, 10);
  return parsedValue > 0 ? String(parsedValue) : '';
}

function normalizeColor(value, fallback) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim())
    ? value.trim().toLowerCase()
    : fallback;
}

function trimTrailingZeros(value) {
  return value.replace(/\.0+$|(?<=\.[0-9]*?)0+$/u, '').replace(/\.$/, '');
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
