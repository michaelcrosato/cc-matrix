// Player settings and campaign progress, persisted in localStorage.
const KEY = 'starcrossed-vulpes-save-v1';

export const DEFAULT_SETTINGS = {
  invertX: false,     // gamepad left stick, horizontal
  invertY: false,     // gamepad left stick, vertical
  deadzone: 0.15,
  musicVol: 7,        // 0-10
  sfxVol: 8,          // 0-10
  shake: true,        // camera shake
  hints: true,        // control prompt bar
};

export const DEFAULT_PROGRESS = {
  unlocked: { plains: true },   // route node -> true when available
  cleared: {},                  // stage id -> true
  medals: {},                   // stage id -> 'gold' | 'silver' | 'bronze'
  bestScore: {},                // stage id -> number
};

function readSave() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

const saved = readSave();
export const settings = { ...DEFAULT_SETTINGS, ...(saved.settings || {}) };
export const progress = { ...structuredClone(DEFAULT_PROGRESS), ...(saved.progress || {}) };

export function saveAll() {
  try { localStorage.setItem(KEY, JSON.stringify({ settings, progress })); } catch { /* storage full or disabled */ }
}

export function resetSettings() {
  Object.assign(settings, DEFAULT_SETTINGS);
  saveAll();
}

export function resetProgress() {
  Object.assign(progress, structuredClone(DEFAULT_PROGRESS));
  saveAll();
}
