import { storage } from './storage.js';
export const SETTINGS_KEY = 'creditor-creek:settings';
export const DEFAULTS = { music: 0.1, sfx: 0.8, voices: 0.7, voiceStyle: 'gibberish', textSpeed: 35, glyphs: 'ps', rumble: true, shake: true, clock: 'village', quality: 'high', pixel: 1 };
export function loadSettings() { return { ...DEFAULTS, ...storage.json(SETTINGS_KEY, {}) }; }
export function saveSettings(s) { storage.setJson(SETTINGS_KEY, s); }
