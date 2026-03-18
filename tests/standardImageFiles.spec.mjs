import test from 'node:test';
import assert from 'node:assert/strict';

import { createImageRef, hasImageRef } from '../src/js/modules/imageRefs.js';
import { getStandardImageSrc, resolveStandardImageId } from '../src/js/modules/standardImageFiles.js';

test('given no alias entry, standard image ids remain unchanged', () => {
  assert.equal(resolveStandardImageId('anchor.png'), 'anchor.png');
  assert.equal(getStandardImageSrc('anchor.png'), './assets/deck-images/anchor.png');
});

test('given a standard image ref, createImageRef keeps the comparable standard id', () => {
  const imageRef = createImageRef('standard', 'anchor.png');
  assert.deepEqual(imageRef, { source: 'standard', id: 'anchor.png' });
});

test('given an equivalent standard image ref, hasImageRef matches it in the temp deck', () => {
  const tempDeck = {
    selectedImageRefs: [createImageRef('standard', 'anchor.png')]
  };

  assert.equal(hasImageRef(tempDeck, createImageRef('standard', 'anchor.png')), true);
});
