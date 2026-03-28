import test from 'node:test';
import assert from 'node:assert/strict';

import {
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
  assert.equal(getDeckMagicPageHref(3), './deck-magic-3.html');
});

test('given deck magic page one, the footer hides the first-page link and links to page two', () => {
  const pageInfo = getDeckMagicPageInfo(1);

  assert.equal(pageInfo.firstPageHref, './deck-magic-1.html');
  assert.equal(pageInfo.showFirstPageLink, false);
  assert.equal(pageInfo.currentPageLabel, '1');
  assert.equal(pageInfo.nextHref, './deck-magic-2.html');
  assert.equal(pageInfo.showNextPageLink, true);
});

test('given deck magic page two, the footer shows first page and links to page three', () => {
  const pageInfo = getDeckMagicPageInfo(2);

  assert.equal(pageInfo.firstPageHref, './deck-magic-1.html');
  assert.equal(pageInfo.showFirstPageLink, true);
  assert.equal(pageInfo.currentPageLabel, '2');
  assert.equal(pageInfo.nextHref, './deck-magic-3.html');
  assert.equal(pageInfo.showNextPageLink, true);
});

test('given deck magic page three, the next page link is hidden by returning null', () => {
  const pageInfo = getDeckMagicPageInfo(3);

  assert.equal(pageInfo.firstPageHref, './deck-magic-1.html');
  assert.equal(pageInfo.showFirstPageLink, true);
  assert.equal(pageInfo.currentPageLabel, '3');
  assert.equal(pageInfo.nextHref, null);
  assert.equal(pageInfo.showNextPageLink, false);
});

test('given deck magic page info, the page menu marks the current page', () => {
  const pageInfo = getDeckMagicPageInfo(2);

  assert.deepEqual(
    pageInfo.pageMenuItems,
    [
      { pageNumber: 1, label: '1', href: './deck-magic-1.html', isCurrent: false },
      { pageNumber: 2, label: '2', href: './deck-magic-2.html', isCurrent: true },
      { pageNumber: 3, label: '3', href: './deck-magic-3.html', isCurrent: false }
    ]
  );
});

test('given deck magic intro text, it returns the shorter shared intro copy', () => {
  const introText = getDeckMagicIntroText();

  assert.equal(introText, 'Learn how we build the deck and why it works!');
});

