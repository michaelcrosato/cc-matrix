export const SAVE_VERSION = 1;
export const SAVE_KEY = 'mint-dial-save-v1';

function memoryStore() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

export function defaultSave() {
  return {
    v: SAVE_VERSION,
    slots: [null, null, null],
    settings: null,
  };
}

/** Versioned JSON. Missing storage uses memory. Corrupt JSON falls back to empty. */
export class Save {
  constructor(storage) {
    if (storage === null) this.storage = memoryStore();
    else if (storage) this.storage = storage;
    else this.storage = pickStorage();
    this.memory = false;
    try {
      const k = '__mint_probe__';
      this.storage.setItem(k, '1');
      this.storage.removeItem(k);
    } catch {
      this.storage = memoryStore();
      this.memory = true;
    }
  }
  read() {
    let raw;
    try {
      raw = this.storage.getItem(SAVE_KEY);
    } catch {
      return defaultSave();
    }
    if (!raw) return defaultSave();
    try {
      const data = JSON.parse(raw);
      if (!data || data.v !== SAVE_VERSION || !Array.isArray(data.slots)) return defaultSave();
      while (data.slots.length < 3) data.slots.push(null);
      data.slots = data.slots.slice(0, 3);
      return data;
    } catch {
      return defaultSave();
    }
  }
  write(data) {
    const out = { ...data, v: SAVE_VERSION };
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(out));
      return true;
    } catch {
      return false;
    }
  }
  clear() {
    try {
      this.storage.removeItem(SAVE_KEY);
    } catch {
      /* private mode */
    }
  }
}

function pickStorage() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      const k = '__mint_probe__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return localStorage;
    }
  } catch {
    /* fall through */
  }
  return memoryStore();
}
