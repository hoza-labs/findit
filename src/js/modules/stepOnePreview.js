const ALLOWED_SYMBOLS_PER_CARD = [3, 4, 6, 8, 12];

export function getAllowedSymbolsPerCard() {
  return [...ALLOWED_SYMBOLS_PER_CARD];
}

export function renderStepOnePreview(targetElement, symbolsPerCard) {
  if (!targetElement) {
    throw new Error('targetElement is required.');
  }

  if (!ALLOWED_SYMBOLS_PER_CARD.includes(symbolsPerCard)) {
    throw new Error('symbolsPerCard must be one of 3, 4, 6, 8, 12.');
  }

  const p = symbolsPerCard - 1;
  targetElement.innerHTML = '';

  const canvas = document.createElement('div');
  canvas.className = 'step-one-canvas';

  for (let rowIndex = 0; rowIndex < p; rowIndex += 1) {
    const row = document.createElement('div');
    row.className = 'step-one-row';
    row.setAttribute('aria-label', `Grid row ${rowIndex + 1} of ${p}`);

    for (let columnIndex = 0; columnIndex < p; columnIndex += 1) {
      row.appendChild(createPlaceholderItem(''));
    }

    canvas.appendChild(row);
  }

  const hr = document.createElement('hr');
  canvas.appendChild(hr);

  const slopeLabel = document.createElement('p');
  slopeLabel.className = 'fw-semibold mb-2';
  slopeLabel.textContent = 'Slope items';
  canvas.appendChild(slopeLabel);

  const slopeRow = document.createElement('div');
  slopeRow.className = 'step-one-row slope-row';
  slopeRow.setAttribute('aria-label', 'Slope items');

  for (let index = 0; index < p; index += 1) {
    slopeRow.appendChild(createPlaceholderItem(String(index)));
  }

  slopeRow.appendChild(createPlaceholderItem('infinity'));
  canvas.appendChild(slopeRow);

  targetElement.appendChild(canvas);
}

function createPlaceholderItem(label) {
  const item = document.createElement('div');
  item.className = 'placeholder-item';

  const box = document.createElement('div');
  box.className = 'placeholder-box';
  if (label) {
    box.title = label;
  }

  const text = document.createElement('div');
  text.className = 'placeholder-label';
  text.textContent = label;

  item.append(box, text);
  return item;
}
