import { getDefaultWebImageName, normalizeWebContentType, trimWebImageName } from './webImageMetadata.js';

const DATABASE_NAME = 'findit-db';
const DATABASE_VERSION = 2;

const STORE_USER_IMAGES = 'user images';
const STORE_WEB_IMAGES = 'web images';
const STORE_DECKS = 'decks';
const STORE_TEMP = 'temp';
const TEMP_KEY = 'current';

export function createIndexedDbRepository() {
  const dbPromise = openDatabase();

  return {
    async listUserImages() {
      const records = await getAllRecords(await dbPromise, STORE_USER_IMAGES);
      return records.map((record) => ({
        ...record,
        name: trimWebImageName(record.name) || record.fileName
      }));
    },
    async addUserImage(file) {
      const now = new Date().toISOString();
      const record = {
        id: createId('user'),
        fileName: file.name,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        blob: file,
        createdAt: now
      };
      await putRecord(await dbPromise, STORE_USER_IMAGES, record);
      return record;
    },
    async renameUserImage(id, name) {
      await patchRecord(await dbPromise, STORE_USER_IMAGES, id, (record) => ({
        ...record,
        name: trimWebImageName(name) || record.fileName
      }));
    },
    async deleteUserImage(id) {
      await deleteRecord(await dbPromise, STORE_USER_IMAGES, id);
    },
    async listWebImages() {
      const records = await getAllRecords(await dbPromise, STORE_WEB_IMAGES);
      return records.map((record) => ({
        ...record,
        name: trimWebImageName(record.name) || getDefaultWebImageName(record.url),
        contentType: normalizeWebContentType(record.contentType)
      }));
    },
    async addWebImage({ url, name, contentType }) {
      const now = new Date().toISOString();
      const record = {
        id: createId('web'),
        url,
        name: trimWebImageName(name) || getDefaultWebImageName(url),
        contentType: normalizeWebContentType(contentType),
        createdAt: now
      };
      await putRecord(await dbPromise, STORE_WEB_IMAGES, record);
      return record;
    },
    async renameWebImage(id, name) {
      await patchRecord(await dbPromise, STORE_WEB_IMAGES, id, (record) => ({
        ...record,
        name: trimWebImageName(name) || getDefaultWebImageName(record.url)
      }));
    },
    async deleteWebImage(id) {
      await deleteRecord(await dbPromise, STORE_WEB_IMAGES, id);
    },
    async listDecks() {
      return getAllRecords(await dbPromise, STORE_DECKS);
    },
    async getDeck(name) {
      return getRecord(await dbPromise, STORE_DECKS, name);
    },
    async saveDeck(deck) {
      await putRecord(await dbPromise, STORE_DECKS, deck);
    },
    async deleteDeck(name) {
      await deleteRecord(await dbPromise, STORE_DECKS, name);
    },
    async getTempDeck() {
      return getRecord(await dbPromise, STORE_TEMP, TEMP_KEY);
    },
    async saveTempDeck(tempDeck) {
      await putRecord(await dbPromise, STORE_TEMP, { ...tempDeck, id: TEMP_KEY });
    },
    async clearTempDeck() {
      await deleteRecord(await dbPromise, STORE_TEMP, TEMP_KEY);
    }
  };
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_USER_IMAGES)) {
        db.createObjectStore(STORE_USER_IMAGES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_WEB_IMAGES)) {
        db.createObjectStore(STORE_WEB_IMAGES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_DECKS)) {
        db.createObjectStore(STORE_DECKS, { keyPath: 'name' });
      }
      if (!db.objectStoreNames.contains(STORE_TEMP)) {
        db.createObjectStore(STORE_TEMP, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllRecords(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getRecord(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

function putRecord(db, storeName, record) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const request = transaction.objectStore(storeName).put(record);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteRecord(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const request = transaction.objectStore(storeName).delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function patchRecord(db, storeName, key, updateFn) {
  const existing = await getRecord(db, storeName, key);
  if (!existing) {
    return;
  }
  await putRecord(db, storeName, updateFn(existing));
}

function createId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}
