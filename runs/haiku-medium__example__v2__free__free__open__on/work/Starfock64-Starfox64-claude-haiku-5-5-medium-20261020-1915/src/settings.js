// Player settings, persisted to localStorage. Read by input, audio and game.
const KEY = 'starfock64.settings.v1';

export const DEFAULTS = {
  invertX: false,      // flips stick left/right (fixes the intermittent inverted-axis controller issue)
  invertY: false,      // flips stick up/down
  sensitivity: 1.0,    // stick response multiplier
  deadzone: 0.15,      // stick dead zone
  musicVol: 0.6,
  sfxVol: 0.8,
  shake: true,         // camera shake on hits and explosions
};

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
    // Storage can be unavailable (private mode); settings then last for this session only.
  }
}
