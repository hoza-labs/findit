import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_IMAGE_PAGE_HREF,
  getCurrentImagePageHref,
  getLastImagePageHref,
  normalizeImagePageHref,
  rememberCurrentImagePage
} from '../src/js/modules/imagePageNavigation.js';

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

test('given an image page path, normalizeImagePageHref returns the canonical href', () => {
  assert.equal(normalizeImagePageHref('./standard-images.html'), './standard-images.html');
  assert.equal(normalizeImagePageHref('/builder/user-images.html?foo=bar'), './user-images.html');
  assert.equal(normalizeImagePageHref('https://example.test/app/web-images.html#top'), './web-images.html');
});

test('given a non-image page path, normalizeImagePageHref returns null', () => {
  assert.equal(normalizeImagePageHref('./preview.html'), null);
  assert.equal(normalizeImagePageHref(''), null);
});

test('given no saved image page, getLastImagePageHref falls back to standard images', () => {
  assert.equal(getLastImagePageHref(createMemoryStorage()), DEFAULT_IMAGE_PAGE_HREF);
});

test('given a current image page, rememberCurrentImagePage stores and returns it', () => {
  const storage = createMemoryStorage();
  const currentHref = rememberCurrentImagePage(storage, { pathname: '/app/web-images.html' });

  assert.equal(currentHref, './web-images.html');
  assert.equal(getLastImagePageHref(storage), './web-images.html');
});

test('given a location, getCurrentImagePageHref identifies image pages only', () => {
  assert.equal(getCurrentImagePageHref({ pathname: '/app/standard-images.html' }), './standard-images.html');
  assert.equal(getCurrentImagePageHref({ pathname: '/app/save.html' }), null);
});
