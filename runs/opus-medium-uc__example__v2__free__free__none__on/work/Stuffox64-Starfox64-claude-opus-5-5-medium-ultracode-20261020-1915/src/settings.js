// Persistent settings + save data (localStorage)
const KEY = 'stuffox64.settings.v1';
const SAVE = 'stuffox64.save.v1';

export const DEFAULTS = {
  invertPadX: false,      // quick fix for controllers reporting inverted horizontal axes
  invertPadY: false,      // quick fix for controllers reporting inverted vertical axes
  flightY: 'normal',      // 'normal' (push up = nose up) or 'pilot' (push up = nose down)
  difficulty: 'normal',   // easy | normal | hard
  master: 0.8,
  music: 0.6,
  sfx: 0.8,
  voice: 0.7,
  vibration: true,
  shake: true,
  hints: true,
  deadzone: 0.18,
};

export const settings = { ...DEFAULTS };

export function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    Object.assign(settings, DEFAULTS, s);
  } catch (e) { /* storage unavailable */ }
  return settings;
}
export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
}
export function resetSettings() {
  Object.assign(settings, DEFAULTS);
  saveSettings();
}

export const save = { best: {}, medals: {}, cleared: {} };
export function loadSave() {
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE) || '{}')); } catch (e) { /* ignore */ }
  save.best ||= {}; save.medals ||= {}; save.cleared ||= {};
  return save;
}
export function writeSave() {
  try { localStorage.setItem(SAVE, JSON.stringify(save)); } catch (e) { /* ignore */ }
}

export const DIFF = {
  easy:   { dmgTaken: 0.6, enemyFire: 0.65, enemyHp: 0.8, label: 'Cadet' },
  normal: { dmgTaken: 1.0, enemyFire: 1.0, enemyHp: 1.0, label: 'Pilot' },
  hard:   { dmgTaken: 1.45, enemyFire: 1.45, enemyHp: 1.3, label: 'Ace' },
};
