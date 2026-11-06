// localStorage under a key built from the title, in try/catch, versioned JSON. Saved data reaches the sim through ctx.input.send.
import { SAVE_KEY } from '../data/meta.js';
const mem = {};
const store = () => (typeof localStorage !== 'undefined' ? localStorage : { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; }, removeItem: (k) => { delete mem[k]; } });
export const blankSave = () => ({ v: 1, heroes: [null, null, null], guests: {}, stash: [[], [], []], devotion: { xp: 0, level: 0, spent: { core: 0, offence: 0, defence: 0, utility: 0 } }, unlocks: { penance: false, knell: false }, bests: {}, settings: {}, last: 0 });
export function readSave() { try { const raw = store().getItem(SAVE_KEY); if (!raw) return blankSave(); const o = JSON.parse(raw); if (o.v !== 1) return blankSave(); return { ...blankSave(), ...o }; } catch { return blankSave(); } }
export function writeSave(data) { try { store().setItem(SAVE_KEY, JSON.stringify(data)); return true; } catch { return false; } }
export const storage = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } };
