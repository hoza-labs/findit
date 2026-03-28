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

test('given deck magic page one, the page links to page two', () => {
  const pageInfo = getDeckMagicPageInfo(1);

  assert.equal(pageInfo.startOverHref, './deck-magic-1.html');
  assert.equal(pageInfo.nextHref, './deck-magic-2.html');
  assert.equal(pageInfo.showNextPageLink, true);
});

test('given deck magic page two, the page links to page three', () => {
  const pageInfo = getDeckMagicPageInfo(2);

  assert.equal(pageInfo.startOverHref, './deck-magic-1.html');
  assert.equal(pageInfo.nextHref, './deck-magic-3.html');
  assert.equal(pageInfo.showNextPageLink, true);
});

test('given deck magic page three, the next page link is hidden by returning null', () => {
  const pageInfo = getDeckMagicPageInfo(3);

  assert.equal(pageInfo.startOverHref, './deck-magic-1.html');
  assert.equal(pageInfo.nextHref, null);
  assert.equal(pageInfo.showNextPageLink, false);
});

test('given deck magic intro text, it returns the shorter shared intro copy', () => {
  const introText = getDeckMagicIntroText();

  assert.equal(introText, 'Learn how we build the deck and why it works!');
});

