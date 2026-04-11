/**
 * IndexedDB Storage Adapter
 *
 * Drop-in replacement for localStorage that uses IndexedDB.
 * IndexedDB is transactional (writes to disk immediately) so it survives
 * Android killing PWA processes — unlike localStorage which can be lost.
 *
 * Compatible with both Supabase auth storage and Zustand persist middleware.
 */

const DB_NAME = 'fertilizer-tracker-storage';
const STORE_NAME = 'keyval';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getItem(key: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Fallback to localStorage if IndexedDB fails
    return localStorage.getItem(key);
  }
}

async function setItem(key: string, value: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Fallback to localStorage if IndexedDB fails
    localStorage.setItem(key, value);
  }
}

async function removeItem(key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    localStorage.removeItem(key);
  }
}

/**
 * Supabase-compatible storage adapter.
 * Supabase auth expects: getItem, setItem, removeItem (all async-compatible).
 */
export const supabaseIndexedDBStorage = {
  getItem,
  setItem,
  removeItem,
};

/**
 * Zustand persist-compatible storage adapter.
 * Zustand expects getItem to return parsed StorageValue objects, not raw strings.
 */
export const zustandIndexedDBStorage = {
  getItem: async (key: string) => {
    const value = await getItem(key);
    if (value === null) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: unknown) => {
    await setItem(key, JSON.stringify(value));
  },
  removeItem,
};
