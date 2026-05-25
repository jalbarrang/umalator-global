import { beforeEach } from 'vitest';
import '@/modules/data/bootstrap-skill-indexes';

function createInMemoryStorage(): Storage {
  const data = new Map<string, string>();

  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.has(key) ? (data.get(key) ?? null) : null;
    },
    key(index: number) {
      return [...data.keys()][index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, String(value));
    }
  };
}

function hasWorkingStorage(storage: Storage | undefined): storage is Storage {
  return typeof storage?.clear === 'function' && typeof storage?.getItem === 'function';
}

/** Node 24+ can expose `localStorage` as undefined unless --localstorage-file is set. */
function ensureWebStorage() {
  if (!hasWorkingStorage(globalThis.localStorage)) {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createInMemoryStorage(),
      configurable: true,
      writable: true
    });
  }

  if (!hasWorkingStorage(globalThis.sessionStorage)) {
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: createInMemoryStorage(),
      configurable: true,
      writable: true
    });
  }
}

ensureWebStorage();

beforeEach(() => {
  ensureWebStorage();
});
