const BUILD_PAGE_FILES = ['build.html', 'deck-builder.html'];

export const BUILD_PAGE_ENTRIES = [
  { href: './build.html', label: 'Deck Preview' },
  { href: './deck-builder.html', label: 'Deck Builder' }
];

export const DEFAULT_BUILD_PAGE_HREF = './build.html';
export const LAST_BUILD_PAGE_STORAGE_KEY = 'findit:last-build-page';

const buildPageHrefByFile = new Map(BUILD_PAGE_ENTRIES.map((entry) => [entry.href.replace('./', ''), entry.href]));

export function normalizeBuildPageHref(value) {
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

  if (!fileName || !BUILD_PAGE_FILES.includes(fileName)) {
    return null;
  }

  return buildPageHrefByFile.get(fileName) ?? null;
}

export function getCurrentBuildPageHref(locationLike = globalThis.location) {
  const pathname = locationLike?.pathname ?? locationLike?.href ?? '';
  return normalizeBuildPageHref(pathname);
}

export function getLastBuildPageHref(storage = globalThis.localStorage) {
  const storedValue = storage?.getItem?.(LAST_BUILD_PAGE_STORAGE_KEY);
  return normalizeBuildPageHref(storedValue) ?? DEFAULT_BUILD_PAGE_HREF;
}

export function rememberCurrentBuildPage(storage = globalThis.localStorage, locationLike = globalThis.location) {
  const currentHref = getCurrentBuildPageHref(locationLike);
  if (!currentHref) {
    return null;
  }

  storage?.setItem?.(LAST_BUILD_PAGE_STORAGE_KEY, currentHref);
  return currentHref;
}

export function applyBuildLinks(root = document, storage = globalThis.localStorage) {
  const href = getLastBuildPageHref(storage);
  root?.querySelectorAll?.('[data-build-link]').forEach((link) => {
    link.setAttribute('href', href);
  });
  return href;
}

export function renderBuildHeaderAndSubnav({ headingElement, subnavElement, tempDeck, currentHref }) {
  const deckName = tempDeck?.deckName ? tempDeck.deckName : '(new untitled deck)';
  const dirtyMarker = tempDeck?.dirty ? '*' : '';
  const normalizedCurrentHref = normalizeBuildPageHref(currentHref) ?? DEFAULT_BUILD_PAGE_HREF;

  if (headingElement) {
    headingElement.textContent = 'Build - ' + deckName + dirtyMarker;
  }

  document.title = 'FindIt | Build | ' + deckName + dirtyMarker;

  if (!subnavElement) {
    return;
  }

  subnavElement.replaceChildren();

  for (const entry of BUILD_PAGE_ENTRIES) {
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
