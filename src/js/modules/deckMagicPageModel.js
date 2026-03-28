export const DECK_MAGIC_PAGE_TITLES = [
  'The wonder of it all',
  'The key insight',
  'Lining up the images (literally!)',
  'Exploring and tinkering',
  "Don't consider all the angles",
  'Wrap your head around the wrap-around',
  'More tinkering',
  'Build it!'
];

const DECK_MAGIC_PAGE_COUNT = DECK_MAGIC_PAGE_TITLES.length;
const SECRET_WISDOM_MESSAGE = 'Secret wisdom coming soon - stay tuned!';

export function normalizeDeckMagicPageNumber(value) {
  const parsedValue = Number.parseInt(String(value ?? ''), 10);
  if (Number.isNaN(parsedValue) || parsedValue < 1 || parsedValue > DECK_MAGIC_PAGE_COUNT) {
    return 1;
  }

  return parsedValue;
}

export function getDeckMagicPageHref(pageNumber) {
  return `./deck-magic-${normalizeDeckMagicPageNumber(pageNumber)}.html`;
}

export function getDeckMagicIntroText() {
  return 'Learn how we build the deck and why it works!';
}

export function getDeckMagicPageInfo(pageNumber) {
  const normalizedPageNumber = normalizeDeckMagicPageNumber(pageNumber);
  const pageTitle = DECK_MAGIC_PAGE_TITLES[normalizedPageNumber - 1];
  const nextHref = normalizedPageNumber < DECK_MAGIC_PAGE_COUNT ? getDeckMagicPageHref(normalizedPageNumber + 1) : null;
  const pageMenuItems = DECK_MAGIC_PAGE_TITLES.map((menuTitle, index) => {
    const menuPageNumber = index + 1;
    return {
      pageNumber: menuPageNumber,
      label: `${menuPageNumber} - ${menuTitle}`,
      href: getDeckMagicPageHref(menuPageNumber),
      isCurrent: menuPageNumber === normalizedPageNumber
    };
  });

  return {
    pageNumber: normalizedPageNumber,
    pageTitle,
    currentPageLabel: `${normalizedPageNumber}`,
    introText: getDeckMagicIntroText(),
    bodyParagraphs: [SECRET_WISDOM_MESSAGE],
    firstPageHref: getDeckMagicPageHref(1),
    showFirstPageLink: normalizedPageNumber > 1,
    nextHref,
    showNextPageLink: nextHref !== null,
    pageMenuItems
  };
}
