// Player settings, persisted to localStorage. Read directly as `settings.<key>`.
const KEY = 'starfoxtastic64.settings.v1';

export const DEFAULTS = Object.freeze({
  invertX: false,
  invertY: false,
  deadzone: 0.15,
  musicVol: 7,
  sfxVol: 8,
  screenShake: true,
  rumble: true,
  hudScale: 100,
});

export const settings = { ...DEFAULTS };

export function loadSettings() {
  try {
    Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || '{}'));
  } catch {
    // Corrupt or unavailable storage: keep the defaults.
  }
}

export function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage may be disabled; settings then last for this session only.
  }
}

export function resetSettings() {
  Object.assign(settings, DEFAULTS);
  saveSettings();
}
