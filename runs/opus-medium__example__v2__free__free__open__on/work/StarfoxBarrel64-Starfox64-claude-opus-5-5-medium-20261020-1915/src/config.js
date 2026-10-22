// Global constants + persistent settings.
export const GAME_TITLE = 'STARFOX BARREL 64';
export const BUILD_DATE = '2026-10-20 19:15';

const SETTINGS_KEY = 'sfb64.settings.v1';
const SAVE_KEY = 'sfb64.save.v1';

export const DEFAULT_SETTINGS = {
  invertX: false,
  invertY: false,
  masterVol: 0.8,
  musicVol: 0.6,
  sfxVol: 0.8,
  voiceVol: 0.7,
  rumble: true,
  shake: 1.0,
  difficulty: 1, // 0 easy, 1 normal, 2 hard
  aimAssist: true,
  hints: true,
  subtitlesSize: 1, // 0 normal,1 large,2 huge
};

export const settings = { ...DEFAULT_SETTINGS };

export function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    Object.assign(settings, DEFAULT_SETTINGS, s);
  } catch (e) { /* storage unavailable: defaults */ }
}
export function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {}
}

export const save = { best: {}, medals: {}, unlocked: 1 };
export function loadSave() {
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
}
export function writeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

export const DIFFICULTY = [
  { name: 'Cadet', dmgMul: 0.55, enemyFire: 0.6, enemyHp: 0.8 },
  { name: 'Pilot', dmgMul: 1.0, enemyFire: 1.0, enemyHp: 1.0 },
  { name: 'Ace', dmgMul: 1.5, enemyFire: 1.45, enemyHp: 1.25 },
];

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
