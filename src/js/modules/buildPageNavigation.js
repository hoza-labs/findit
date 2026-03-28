const LEGACY_BUILD_PAGE_ALIASES = new Map([
  ['build.html', './deck-preview.html']
]);

const DECK_MAGIC_PAGE_FILES = Array.from({ length: 8 }, (_, index) => `deck-magic-${index + 1}.html`);
const BUILD_PAGE_FILES = ['deck-preview.html', ...DECK_MAGIC_PAGE_FILES, 'deck-builder.html'];
const LAST_DECK_MAGIC_PAGE_STORAGE_KEY = 'findit:last-deck-magic-page';
const DECK_MAGIC_DEFAULT_HREF = './deck-magic-1.html';
const DECK_MAGIC_TAB_ID = 'deck-magic';
const DECK_PREVIEW_TAB_ID = 'deck-preview';
const DECK_BUILDER_TAB_ID = 'deck-builder';

export const BUILD_PAGE_ENTRIES = [
  { href: './deck-preview.html', label: 'Deck Preview', tabId: DECK_PREVIEW_TAB_ID },
  { href: DECK_MAGIC_DEFAULT_HREF, label: null, tabId: DECK_MAGIC_TAB_ID },
  { href: './deck-builder.html', label: 'Deck Builder', tabId: DECK_BUILDER_TAB_ID }
];

export const DEFAULT_BUILD_PAGE_HREF = './deck-preview.html';
export const LAST_BUILD_PAGE_STORAGE_KEY = 'findit:last-build-page';

const buildPageHrefByFile = new Map(BUILD_PAGE_FILES.map((fileName) => [fileName, `./${fileName}`]));

function getDeckMagicTabLabel() {
  const sparkle = String.fromCodePoint(0x2728);
  return `${sparkle}Deck Magic${sparkle}`;
}

function isDeckMagicFileName(fileName) {
  return DECK_MAGIC_PAGE_FILES.includes(fileName);
}

function getBuildPageTabIdFromHref(href) {
  const fileName = href?.replace('./', '');
  if (isDeckMagicFileName(fileName)) {
    return DECK_MAGIC_TAB_ID;
  }

  if (fileName === 'deck-preview.html') {
    return DECK_PREVIEW_TAB_ID;
  }

  if (fileName === 'deck-builder.html') {
    return DECK_BUILDER_TAB_ID;
  }

  return null;
}

function normalizeDeckMagicPageHref(value) {
  const href = normalizeBuildPageHref(value);
  return getBuildPageTabIdFromHref(href) === DECK_MAGIC_TAB_ID ? href : null;
}

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

  if (!fileName) {
    return null;
  }

  if (LEGACY_BUILD_PAGE_ALIASES.has(fileName)) {
    return LEGACY_BUILD_PAGE_ALIASES.get(fileName) ?? null;
  }

  if (!BUILD_PAGE_FILES.includes(fileName)) {
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

export function getLastDeckMagicPageHref(storage = globalThis.localStorage) {
  const storedValue = storage?.getItem?.(LAST_DECK_MAGIC_PAGE_STORAGE_KEY);
  return normalizeDeckMagicPageHref(storedValue) ?? DECK_MAGIC_DEFAULT_HREF;
}

export function getBuildPageTabId(href) {
  return getBuildPageTabIdFromHref(normalizeBuildPageHref(href));
}

export function getBuildPageSubnavEntries(storage = globalThis.localStorage) {
  return BUILD_PAGE_ENTRIES.map((entry) => ({
    ...entry,
    href: entry.tabId === DECK_MAGIC_TAB_ID ? getLastDeckMagicPageHref(storage) : entry.href,
    label: entry.label ?? getDeckMagicTabLabel()
  }));
}

export function rememberCurrentBuildPage(storage = globalThis.localStorage, locationLike = globalThis.location) {
  const currentHref = getCurrentBuildPageHref(locationLike);
  if (!currentHref) {
    return null;
  }

  storage?.setItem?.(LAST_BUILD_PAGE_STORAGE_KEY, currentHref);
  if (getBuildPageTabIdFromHref(currentHref) === DECK_MAGIC_TAB_ID) {
    storage?.setItem?.(LAST_DECK_MAGIC_PAGE_STORAGE_KEY, currentHref);
  }
  return currentHref;
}

export function applyBuildLinks(root = document, storage = globalThis.localStorage) {
  const href = getLastBuildPageHref(storage);
  root?.querySelectorAll?.('[data-build-link]').forEach((link) => {
    link.setAttribute('href', href);
  });
  return href;
}

export function renderBuildHeaderAndSubnav({ headingElement, subnavElement, tempDeck, currentHref, storage = globalThis.localStorage }) {
  const deckName = tempDeck?.deckName ? tempDeck.deckName : '(new untitled deck)';
  const dirtyMarker = tempDeck?.dirty ? '*' : '';
  const normalizedCurrentHref = normalizeBuildPageHref(currentHref) ?? DEFAULT_BUILD_PAGE_HREF;
  const currentTabId = getBuildPageTabIdFromHref(normalizedCurrentHref);

  if (headingElement) {
    headingElement.textContent = 'Build - ' + deckName + dirtyMarker;
  }

  document.title = 'FindIt | Build | ' + deckName + dirtyMarker;

  if (!subnavElement) {
    return;
  }

  subnavElement.replaceChildren();

  for (const entry of getBuildPageSubnavEntries(storage)) {
    const link = document.createElement('a');
    link.href = entry.href;
    link.textContent = entry.label;
    link.className = 'image-page-subnav-link';
    if (entry.tabId === currentTabId) {
      link.classList.add('is-current');
      link.setAttribute('aria-current', 'page');
    }
    subnavElement.appendChild(link);
  }
}
