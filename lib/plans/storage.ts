/**
 * Persistence backend for the zustand stores.
 *
 * On a device this is AsyncStorage. Under Jest (and anywhere the native module
 * is missing) requiring AsyncStorage throws at import time, so the require is
 * guarded and falls back to an in-memory object. Stores then behave exactly as
 * they did before persistence was added instead of failing to load.
 */

import { createJSONStorage, type PersistStorage } from 'zustand/middleware';

interface AsyncKeyValueStore {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

function memoryStore(): AsyncKeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem:    async (key) => map.get(key) ?? null,
    setItem:    async (key, value) => { map.set(key, value); },
    removeItem: async (key) => { map.delete(key); },
  };
}

let cached: AsyncKeyValueStore | null = null;

function backend(): AsyncKeyValueStore {
  if (cached) return cached;
  try {
    const mod = require('@react-native-async-storage/async-storage');
    const store = (mod?.default ?? mod) as AsyncKeyValueStore | undefined;
    if (store && typeof store.getItem === 'function') {
      cached = store;
      return cached;
    }
  } catch {
    // Native module unavailable (tests, unsupported platform): stay in memory.
  }
  cached = memoryStore();
  return cached;
}

/** JSON storage for zustand `persist`, backed by AsyncStorage when available. */
export function persistStorage<T>(): PersistStorage<T> | undefined {
  return createJSONStorage<T>(() => backend());
}
