// Saves: localStorage, versioned JSON, every call in try/catch. Sessions never save.
import { SAVE_KEY } from '../data/meta.js';
import { newAccount } from '../sim/world.js';

export const HERO_SLOTS = 3;

export function emptySave() {
  return { version: 1, heroes: [null, null, null], guests: {}, account: newAccount(), settings: defaultSettings() };
}

export function defaultSettings() {
  return { glyphs: 'ps', shake: 1, numbers: true, zoom: 1, voices: 1, seenAttract: false };
}

export function readSave() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.version !== 1) return null;
    const blank = emptySave();
    s.account = { ...blank.account, ...s.account };
    s.settings = { ...blank.settings, ...s.settings };
    s.heroes = s.heroes ?? blank.heroes;
    s.guests = s.guests ?? {};
    return s;
  } catch { return null; }
}

export function writeSave(save) {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch { return false; }
}
