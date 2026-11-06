const KEY = 'a-cry-too-far-save';
const SETTINGS_KEY = 'a-cry-too-far-settings';

export function storage() {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function writeSave(data) {
  const s = storage();
  if (!s) return false;
  s.setItem(KEY, JSON.stringify(data));
  return true;
}

export function readSave() {
  const s = storage();
  if (!s) return null;
  const raw = s.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeSettings(data) {
  const s = storage();
  if (!s) return;
  s.setItem(SETTINGS_KEY, JSON.stringify(data));
}

export function readSettings() {
  const s = storage();
  if (!s) return null;
  const raw = s.getItem(SETTINGS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
