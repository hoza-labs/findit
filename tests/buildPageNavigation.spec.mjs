import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_BUILD_PAGE_HREF,
  getCurrentBuildPageHref,
  getLastBuildPageHref,
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
    }
  };
}

test('given a build page path, normalizeBuildPageHref returns the canonical href', () => {
  assert.equal(normalizeBuildPageHref('./build.html'), './build.html');
  assert.equal(normalizeBuildPageHref('/builder/deck-builder.html?foo=bar'), './deck-builder.html');
  assert.equal(normalizeBuildPageHref('https://example.test/app/deck-builder.html#top'), './deck-builder.html');
});

test('given a non-build page path, normalizeBuildPageHref returns null', () => {
  assert.equal(normalizeBuildPageHref('./preview.html'), null);
  assert.equal(normalizeBuildPageHref(''), null);
});

test('given no saved build page, getLastBuildPageHref falls back to deck preview', () => {
  assert.equal(getLastBuildPageHref(createMemoryStorage()), DEFAULT_BUILD_PAGE_HREF);
});

test('given a current build page, rememberCurrentBuildPage stores and returns it', () => {
  const storage = createMemoryStorage();
  const currentHref = rememberCurrentBuildPage(storage, { pathname: '/app/deck-builder.html' });

  assert.equal(currentHref, './deck-builder.html');
  assert.equal(getLastBuildPageHref(storage), './deck-builder.html');
});

test('given a location, getCurrentBuildPageHref identifies build pages only', () => {
  assert.equal(getCurrentBuildPageHref({ pathname: '/app/build.html' }), './build.html');
  assert.equal(getCurrentBuildPageHref({ pathname: '/app/save.html' }), null);
});
