const IMAGE_PAGE_FILES = ['standard-images.html', 'user-images.html', 'web-images.html'];

export const IMAGE_PAGE_ENTRIES = [
  { href: './standard-images.html', label: 'Standard Images' },
  { href: './user-images.html', label: 'User Images' },
  { href: './web-images.html', label: 'Web Images' }
];

export const DEFAULT_IMAGE_PAGE_HREF = './standard-images.html';
export const LAST_IMAGE_PAGE_STORAGE_KEY = 'findit:last-image-page';

const imagePageHrefByFile = new Map(IMAGE_PAGE_ENTRIES.map((entry) => [entry.href.replace('./', ''), entry.href]));

export function normalizeImagePageHref(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const withoutHash = trimmedValue.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  const normalizedPath = withoutQuery.replace(/\\/g, '/');
  const fileName = normalizedPath.split('/').pop();

  if (!fileName || !IMAGE_PAGE_FILES.includes(fileName)) {
    return null;
  }

  return imagePageHrefByFile.get(fileName) ?? null;
}

export function getCurrentImagePageHref(locationLike = globalThis.location) {
  const pathname = locationLike?.pathname ?? locationLike?.href ?? '';
  return normalizeImagePageHref(pathname);
}

export function getLastImagePageHref(storage = globalThis.localStorage) {
  const storedValue = storage?.getItem?.(LAST_IMAGE_PAGE_STORAGE_KEY);
  return normalizeImagePageHref(storedValue) ?? DEFAULT_IMAGE_PAGE_HREF;
}

export function rememberCurrentImagePage(storage = globalThis.localStorage, locationLike = globalThis.location) {
  const currentHref = getCurrentImagePageHref(locationLike);
  if (!currentHref) {
    return null;
  }

  storage?.setItem?.(LAST_IMAGE_PAGE_STORAGE_KEY, currentHref);
  return currentHref;
}

export function applySelectImagesLinks(root = document, storage = globalThis.localStorage) {
  const href = getLastImagePageHref(storage);
  root?.querySelectorAll?.('[data-select-images-link]').forEach((link) => {
    link.setAttribute('href', href);
  });
  return href;
}

export function renderSelectImagesHeaderAndSubnav({ headingElement, subnavElement, tempDeck, currentHref }) {
  const deckName = tempDeck?.deckName ? tempDeck.deckName : '(new untitled deck)';
  const dirtyMarker = tempDeck?.dirty ? '*' : '';
  const normalizedCurrentHref = normalizeImagePageHref(currentHref) ?? DEFAULT_IMAGE_PAGE_HREF;

  if (headingElement) {
    headingElement.textContent = 'Select Images for ' + deckName + dirtyMarker;
  }

  document.title = 'FindIt | Select Images | ' + deckName + dirtyMarker;

  if (!subnavElement) {
    return;
  }

  subnavElement.replaceChildren();

  for (const entry of IMAGE_PAGE_ENTRIES) {
    const link = document.createElement('a');
    link.href = entry.href;
    link.textContent = entry.label;
    link.className = 'image-page-subnav-link';
    if (entry.href === normalizedCurrentHref) {
      link.classList.add('is-current');
      link.setAttribute('aria-current', 'page');
    }
    subnavElement.appendChild(link);
  }
}
