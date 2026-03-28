import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DECK_MAGIC_PAGE_TITLES,
  getDeckMagicIntroText,
  getDeckMagicPageInfo,
  getDeckMagicPageHref,
  normalizeDeckMagicPageNumber
} from '../src/js/modules/deckMagicPageModel.js';

test('given an invalid deck magic page number, normalization falls back to page one', () => {
  assert.equal(normalizeDeckMagicPageNumber('0'), 1);
  assert.equal(normalizeDeckMagicPageNumber('abc'), 1);
  assert.equal(normalizeDeckMagicPageNumber('9'), 1);
});

test('given a deck magic page number, getDeckMagicPageHref returns the matching page href', () => {
  assert.equal(getDeckMagicPageHref(1), './deck-magic-1.html');
  assert.equal(getDeckMagicPageHref(8), './deck-magic-8.html');
});

test('given deck magic page one, the footer hides the first-page link and links to page two', () => {
  const pageInfo = getDeckMagicPageInfo(1);

  assert.equal(pageInfo.pageTitle, DECK_MAGIC_PAGE_TITLES[0]);
  assert.equal(pageInfo.bodyParagraphs[0], 'Secret wisdom coming soon - stay tuned!');
  assert.equal(pageInfo.firstPageHref, './deck-magic-1.html');
  assert.equal(pageInfo.showFirstPageLink, false);
  assert.equal(pageInfo.currentPageLabel, '1');
  assert.equal(pageInfo.nextHref, './deck-magic-2.html');
  assert.equal(pageInfo.showNextPageLink, true);
});

test('given deck magic page four, the footer shows first page and links to page five', () => {
  const pageInfo = getDeckMagicPageInfo(4);

  assert.equal(pageInfo.pageTitle, DECK_MAGIC_PAGE_TITLES[3]);
  assert.equal(pageInfo.firstPageHref, './deck-magic-1.html');
  assert.equal(pageInfo.showFirstPageLink, true);
  assert.equal(pageInfo.currentPageLabel, '4');
  assert.equal(pageInfo.nextHref, './deck-magic-5.html');
  assert.equal(pageInfo.showNextPageLink, true);
});

test('given deck magic page eight, the next page link is hidden by returning null', () => {
  const pageInfo = getDeckMagicPageInfo(8);

  assert.equal(pageInfo.pageTitle, DECK_MAGIC_PAGE_TITLES[7]);
  assert.equal(pageInfo.firstPageHref, './deck-magic-1.html');
  assert.equal(pageInfo.showFirstPageLink, true);
  assert.equal(pageInfo.currentPageLabel, '8');
  assert.equal(pageInfo.nextHref, null);
  assert.equal(pageInfo.showNextPageLink, false);
});

test('given deck magic page info, the page menu marks the current page and includes titles', () => {
  const pageInfo = getDeckMagicPageInfo(2);

  assert.equal(pageInfo.pageMenuItems.length, 8);
  assert.deepEqual(
    pageInfo.pageMenuItems.slice(0, 3),
    [
      { pageNumber: 1, label: '1 - The wonder of it all', href: './deck-magic-1.html', isCurrent: false },
      { pageNumber: 2, label: '2 - The key insight', href: './deck-magic-2.html', isCurrent: true },
      { pageNumber: 3, label: '3 - Lining up the images', href: './deck-magic-3.html', isCurrent: false }
    ]
  );
  assert.deepEqual(pageInfo.pageMenuItems[4], {
    pageNumber: 5,
    label: "5 - Don't consider all the angles",
    href: './deck-magic-5.html',
    isCurrent: false
  });
  assert.deepEqual(pageInfo.pageMenuItems[7], {
    pageNumber: 8,
    label: '8 - Build it!',
    href: './deck-magic-8.html',
    isCurrent: false
  });
});

test('given deck magic intro text, it returns the shorter shared intro copy', () => {
  const introText = getDeckMagicIntroText();

  assert.equal(introText, 'Learn how we build the deck and why it works!');
});
