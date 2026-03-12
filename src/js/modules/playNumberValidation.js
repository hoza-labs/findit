export function isValidPositiveNumberInput(value) {
  return parsePositiveNumberInput(value) !== null;
}

export function isValidPositiveWholeNumberInput(value) {
  return parsePositiveWholeNumberInput(value) !== null;
}

export function parsePositiveNumberInput(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parsePositiveWholeNumberInput(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
