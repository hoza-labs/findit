import test from 'node:test';
import assert from 'node:assert/strict';

import { getRequiredImageCount, getSelectImagesIntroText } from '../src/js/modules/selectImagesIntro.js';

test('given a temp deck, getRequiredImageCount returns n times n minus one plus one', () => {
  assert.equal(getRequiredImageCount({ symbolsPerCard: 4 }), 13);
});

test('given no selected images, getSelectImagesIntroText omits the word more', () => {
  assert.equal(
    getSelectImagesIntroText({ symbolsPerCard: 4, selectedImageRefs: [] }),
    'Select the images you want to have in your deck. You need 13 images for a complete deck.'
  );
});

test('given some selected images, getSelectImagesIntroText includes the word more', () => {
  assert.equal(
    getSelectImagesIntroText({ symbolsPerCard: 4, selectedImageRefs: [{}, {}] }),
    'Select the images you want to have in your deck. You need 11 more images for a complete deck.'
  );
});

test('given enough selected images, getSelectImagesIntroText shows the congrats message', () => {
  assert.equal(
    getSelectImagesIntroText({ symbolsPerCard: 4, selectedImageRefs: Array.from({ length: 13 }, () => ({})) }),
    'Select the images you want to have in your deck. Congrats! You\'ve got all the images you need for your deck!'
  );
});

