import { SAVE_KEY, SAVE_VERSION } from '../data/config.js';
const blank = () => ({ v: SAVE_VERSION, profiles: [null, null, null, null], current: -1, settings: {} });
let mem = null, storageOk = true;
export function parseSave(text) {
  try {
    const d = JSON.parse(text);
    if (!d || typeof d !== 'object' || d.v !== SAVE_VERSION || !Array.isArray(d.profiles)) return blank();
    d.settings = d.settings && typeof d.settings === 'object' ? d.settings : {};
    while (d.profiles.length < 4) d.profiles.push(null);
    return d;
  } catch { return blank(); }
}
export function loadSave() {
  if (mem) return mem;
  let text = null;
  try { text = localStorage.getItem(SAVE_KEY); } catch { storageOk = false; }
  mem = text ? parseSave(text) : blank();
  return mem;
}
export function writeSave() {
  if (!mem) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(mem)); } catch { storageOk = false; }
}
export function wipeSave() { mem = blank(); try { localStorage.removeItem(SAVE_KEY); } catch { storageOk = false; } return mem; }
export const storageAvailable = () => storageOk;
export const blankSave = blank;
