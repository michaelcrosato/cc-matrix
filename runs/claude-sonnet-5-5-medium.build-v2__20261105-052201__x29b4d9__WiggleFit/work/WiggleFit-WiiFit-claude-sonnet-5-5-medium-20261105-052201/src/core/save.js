import { SAVE_KEY } from '../data/config.js';
const VERSION = 1;
let mem = null;
export function blankProfile(name, paint) {
  return { name, paint: paint ?? 0, hat: 0, day: 1, step: 0, doneToday: [], ages: [], medals: {}, bestTier: {}, met: [], marbles: 0, floor: 0, minutes: 0, levelled: false, calendar: [], unlockedSeen: 0, firstClear: {}, asked: [] };
}
export function blankSave() { return { v: VERSION, profiles: [null, null, null, null], last: 0, settings: defaultSettings() }; }
export function defaultSettings() { return { music: 10, sound: 80, voice: 80, glyphs: 'ps', rumble: true, autoBreathe: false, rhythmOffset: 0, uiScale: 100, ink: 100, reduceShake: false, difficulty: 1 }; }
function store() { try { return window.localStorage; } catch (e) { return null; } }
export function loadSave() {
  try {
    const s = store(); const raw = s && s.getItem(SAVE_KEY);
    if (!raw) return mem || blankSave();
    const o = JSON.parse(raw);
    if (!o || o.v !== VERSION || !Array.isArray(o.profiles)) return blankSave();
    o.settings = Object.assign(defaultSettings(), o.settings || {});
    while (o.profiles.length < 4) o.profiles.push(null);
    return o;
  } catch (e) { return blankSave(); }
}
export function writeSave(o) { mem = o; try { const s = store(); if (s) s.setItem(SAVE_KEY, JSON.stringify(o)); } catch (e) { /* memory only */ } }
