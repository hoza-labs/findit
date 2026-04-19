import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_BUILD_PAGE_HREF,
  getBuildPageSubnavEntries,
  getBuildPageTabId,
  getCurrentBuildPageHref,
  getLastBuildPageHref,
  getLastDeckMagicPageHref,
  normalizeBuildPageHref,
  rememberCurrentBuildPage
} from '../src/js/modules/buildPageNavigation.js';

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
    removeItem(key) {
      map.delete(key);
    }
  };
}

test('given a build page path, normalizeBuildPageHref returns the canonical href', () => {
  assert.equal(normalizeBuildPageHref('./deck-preview.html'), './deck-preview.html');
  assert.equal(normalizeBuildPageHref('/builder/deck-builder.html?foo=bar'), './deck-builder.html');
  assert.equal(normalizeBuildPageHref('https://example.test/app/deck-magic-8.html#top'), './deck-magic-8.html');
});

test('given a legacy build preview path, normalizeBuildPageHref maps it to deck preview', () => {
  assert.equal(normalizeBuildPageHref('./build.html'), './deck-preview.html');
  assert.equal(normalizeBuildPageHref('/app/build.html?from=legacy'), './deck-preview.html');
});

test('given a non-build page path, normalizeBuildPageHref returns null', () => {
  assert.equal(normalizeBuildPageHref('./preview.html'), null);
  assert.equal(normalizeBuildPageHref(''), null);
});

test('given no saved build page, getLastBuildPageHref falls back to deck preview', () => {
  assert.equal(getLastBuildPageHref(createMemoryStorage()), DEFAULT_BUILD_PAGE_HREF);
});

test('given no saved deck magic page, getLastDeckMagicPageHref falls back to deck magic page one', () => {
  assert.equal(getLastDeckMagicPageHref(createMemoryStorage()), './deck-magic-1.html');
});

test('given a non-deck-magic build page in deck magic storage, getLastDeckMagicPageHref falls back to deck magic page one', () => {
  const storage = createMemoryStorage();
  storage.setItem('findit:last-deck-magic-page', './deck-builder.html');

  assert.equal(getLastDeckMagicPageHref(storage), './deck-magic-1.html');
});

test('given a deck magic page visited within an hour, getLastDeckMagicPageHref returns the saved page', () => {
  const storage = createMemoryStorage();
  const now = 1_000_000;
  storage.setItem('findit:last-deck-magic-page', './deck-magic-8.html');
  storage.setItem('findit:last-deck-magic-visited-at', String(now - 60 * 60 * 1000));

  assert.equal(getLastDeckMagicPageHref(storage, now), './deck-magic-8.html');
});

test('given a deck magic page visited more than an hour ago, getLastDeckMagicPageHref falls back to page one', () => {
  const storage = createMemoryStorage();
  const now = 1_000_000;
  storage.setItem('findit:last-deck-magic-page', './deck-magic-8.html');
  storage.setItem('findit:last-deck-magic-visited-at', String(now - 60 * 60 * 1000 - 1));

  assert.equal(getLastDeckMagicPageHref(storage, now), './deck-magic-1.html');
  assert.equal(storage.getItem('findit:last-deck-magic-page'), null);
});

test('given the last build page is a stale deck magic page, getLastBuildPageHref falls back to deck magic page one', () => {
  const storage = createMemoryStorage();
  const now = 1_000_000;
  storage.setItem('findit:last-build-page', './deck-magic-6.html');
  storage.setItem('findit:last-deck-magic-page', './deck-magic-6.html');
  storage.setItem('findit:last-deck-magic-visited-at', String(now - 60 * 60 * 1000 - 1));

  assert.equal(getLastBuildPageHref(storage, now), './deck-magic-1.html');
  assert.equal(getLastBuildPageHref(storage, now), './deck-magic-1.html');
});

test('given a current build page, rememberCurrentBuildPage stores and returns it', () => {
  const storage = createMemoryStorage();
  const currentHref = rememberCurrentBuildPage(storage, { pathname: '/app/deck-builder.html' });

  assert.equal(currentHref, './deck-builder.html');
  assert.equal(getLastBuildPageHref(storage), './deck-builder.html');
});

test('given a current deck magic page, rememberCurrentBuildPage stores both exact build page and deck magic page', () => {
  const storage = createMemoryStorage();
  const now = 1_000_000;
  const currentHref = rememberCurrentBuildPage(storage, { pathname: '/app/deck-magic-7.html' }, now);

  assert.equal(currentHref, './deck-magic-7.html');
  assert.equal(getLastBuildPageHref(storage, now), './deck-magic-7.html');
  assert.equal(getLastDeckMagicPageHref(storage, now), './deck-magic-7.html');
  assert.equal(storage.getItem('findit:last-deck-magic-visited-at'), String(now));
});

test('given a build page href, getBuildPageTabId groups deck magic pages under one tab id', () => {
  assert.equal(getBuildPageTabId('./deck-preview.html'), 'deck-preview');
  assert.equal(getBuildPageTabId('./deck-magic-1.html'), 'deck-magic');
  assert.equal(getBuildPageTabId('./deck-magic-8.html'), 'deck-magic');
  assert.equal(getBuildPageTabId('./deck-builder.html'), 'deck-builder');
});

test('given saved deck magic history, getBuildPageSubnavEntries resolves the deck magic tab to the last deck magic page', () => {
  const storage = createMemoryStorage();
  storage.setItem('findit:last-deck-magic-page', './deck-magic-8.html');

  const entries = getBuildPageSubnavEntries(storage);

  assert.equal(entries.length, 3);
  assert.equal(entries[0].href, './deck-preview.html');
  assert.equal(entries[1].href, './deck-magic-8.html');
  assert.match(entries[1].label, /Deck Magic/);
  assert.equal(entries[2].href, './deck-builder.html');
});

test('given stale deck magic history, getBuildPageSubnavEntries resolves the deck magic tab to page one', () => {
  const storage = createMemoryStorage();
  const now = 1_000_000;
  storage.setItem('findit:last-deck-magic-page', './deck-magic-8.html');
  storage.setItem('findit:last-deck-magic-visited-at', String(now - 60 * 60 * 1000 - 1));

  const entries = getBuildPageSubnavEntries(storage, now);

  assert.equal(entries[1].href, './deck-magic-1.html');
  assert.equal(getLastBuildPageHref(storage, now), './deck-preview.html');
});

test('given a location, getCurrentBuildPageHref identifies build pages only', () => {
  assert.equal(getCurrentBuildPageHref({ pathname: '/app/deck-preview.html' }), './deck-preview.html');
  assert.equal(getCurrentBuildPageHref({ pathname: '/app/save.html' }), null);
});
