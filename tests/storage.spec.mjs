import test from 'node:test';
import assert from 'node:assert/strict';

import { createDeckStorage } from '../src/js/modules/storage.js';

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

test('given saved deck, load returns parsed deck object', () => {
  const storage = createMemoryStorage();
  const repository = createDeckStorage(storage);
  const expected = { symbolsPerCard: 4, cards: [[0, 1, 2, 3]] };

  repository.save(expected);

  assert.deepEqual(repository.load(), expected);
});

test('given no saved deck, load returns null', () => {
  const storage = createMemoryStorage();
  const repository = createDeckStorage(storage);

  assert.equal(repository.load(), null);
});

test('given clear is called, load returns null after save', () => {
  const storage = createMemoryStorage();
  const repository = createDeckStorage(storage);

  repository.save({ cards: [] });
  repository.clear();

  assert.equal(repository.load(), null);
});

test('given invalid storage dependency, createDeckStorage throws', () => {
  assert.throws(() => createDeckStorage({}), /storage-like object/);
});
