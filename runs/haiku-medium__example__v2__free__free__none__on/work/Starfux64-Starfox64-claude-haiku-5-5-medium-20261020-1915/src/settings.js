// Persistent player options. Everything the Options screen edits lives here.
const KEY = 'starfux64.settings.v1';

export const DEFAULTS = Object.freeze({
  invertX: false,
  invertY: false,
  sensitivity: 1.0,
  deadzone: 0.15,
  masterVol: 0.8,
  musicVol: 0.6,
  sfxVol: 0.8,
  shake: true,
  hudHints: true,
});

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export const settings = { ...DEFAULTS, ...load() };

export function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // storage can be blocked; settings then last for this session only
  }
}

export function resetSettings() {
  Object.assign(settings, DEFAULTS);
  saveSettings();
}
