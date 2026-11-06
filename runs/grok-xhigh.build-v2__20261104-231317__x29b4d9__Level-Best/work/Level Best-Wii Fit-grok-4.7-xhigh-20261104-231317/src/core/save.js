import { SAVE_VERSION } from '../data/config.js';

export function memoryStorage() {
  const map = new Map();
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
    removeItem(key) { map.delete(key); },
  };
}

export function readSave(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== SAVE_VERSION || !data.profile) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(storage, key, data) {
  const payload = JSON.stringify({ ...data, version: SAVE_VERSION });
  try {
    storage.setItem(key, payload);
    return true;
  } catch {
    return false;
  }
}
