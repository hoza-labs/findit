import { createDefaultPrintOptions, normalizePrintOptions } from './printOptions.js';

export const DEFAULT_PRINT_OPTIONS_STORAGE_KEY = 'findit.defaultPrintOptions';

export function getDefaultPrintOptions(storage = globalThis.localStorage) {
  const rawValue = storage?.getItem?.(DEFAULT_PRINT_OPTIONS_STORAGE_KEY);
  if (!rawValue) {
    return createDefaultPrintOptions();
  }

  try {
    return normalizePrintOptions(JSON.parse(rawValue));
  } catch {
    return createDefaultPrintOptions();
  }
}

export function saveDefaultPrintOptions(printOptions, storage = globalThis.localStorage) {
  const normalized = normalizePrintOptions({
    ...getDefaultPrintOptions(storage),
    ...(printOptions && typeof printOptions === 'object' ? printOptions : {})
  });
  storage?.setItem?.(DEFAULT_PRINT_OPTIONS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
