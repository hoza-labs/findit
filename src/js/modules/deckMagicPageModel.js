export function normalizeDeckMagicPageNumber(value) {
  const parsedValue = Number.parseInt(String(value ?? ''), 10);
  if (Number.isNaN(parsedValue) || parsedValue < 1 || parsedValue > 3) {
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

  const bodyByPageNumber = {
    1: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sed nibh non justo vulputate posuere. Integer ac magna id mauris gravida sagittis.',
      'Praesent pulvinar, nibh at gravida porta, tellus neque convallis nisl, vitae malesuada justo turpis quis libero. Donec eget tincidunt mauris.'
    ],
    2: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus ullamcorper augue et orci facilisis, eget faucibus nibh consequat. Integer luctus dui vitae nibh feugiat tempus.',
      'Sed fermentum ex ac neque tristique, sed volutpat turpis suscipit. Curabitur a sem vel sapien dignissim tempus non a erat.'
    ],
    3: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. In porta, nisl in cursus efficitur, purus risus convallis enim, vel feugiat elit tortor vel lorem.',
      'Morbi tempor velit in magna varius, vel suscipit neque congue. Vivamus vestibulum velit ac nisi viverra, non tempor magna blandit.'
    ]
  };

  const nextHref = normalizedPageNumber < 3 ? getDeckMagicPageHref(normalizedPageNumber + 1) : null;
  const pageMenuItems = [1, 2, 3].map((menuPageNumber) => ({
    pageNumber: menuPageNumber,
    label: `Page ${menuPageNumber}`,
    href: getDeckMagicPageHref(menuPageNumber),
    isCurrent: menuPageNumber === normalizedPageNumber
  }));

  return {
    pageNumber: normalizedPageNumber,
    currentPageLabel: `Page ${normalizedPageNumber}`,
    introText: getDeckMagicIntroText(),
    bodyParagraphs: bodyByPageNumber[normalizedPageNumber],
    firstPageHref: getDeckMagicPageHref(1),
    showFirstPageLink: normalizedPageNumber > 1,
    nextHref,
    showNextPageLink: nextHref !== null,
    pageMenuItems
  };
}
