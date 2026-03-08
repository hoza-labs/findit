import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getDefaultWebImageName,
  getWebImageCaption,
  normalizeWebContentType,
  trimWebImageName
} from '../src/js/modules/webImageMetadata.js';

test('trimWebImageName removes leading and trailing whitespace', () => {
  assert.equal(trimWebImageName('  My Name  '), 'My Name');
});

test('normalizeWebContentType drops image/ prefix', () => {
  assert.equal(normalizeWebContentType('image/png; charset=binary'), 'png');
});

test('getDefaultWebImageName returns etld-plus-hash36 pattern', () => {
  const name = getDefaultWebImageName('https://images.example.com/path/pic.png');
  assert.match(name, /^example\.com-[0-9a-z]{5}$/);
});

test('getWebImageCaption returns name/content-type', () => {
  const caption = getWebImageCaption({
    url: 'https://cdn.example.com/pic.webp',
    name: 'sample',
    contentType: 'image/webp'
  });
  assert.equal(caption, 'sample/webp');
});
