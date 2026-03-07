const DEFAULT_STORAGE_KEY = 'findit.deck.v1';

export function createDeckStorage(storage, key = DEFAULT_STORAGE_KEY) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new Error('A storage-like object with getItem/setItem/removeItem is required.');
  }

  return {
    save(deck) {
      storage.setItem(key, JSON.stringify(deck));
    },
    load() {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    },
    clear() {
      storage.removeItem(key);
    }
  };
}
