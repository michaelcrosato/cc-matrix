// The player's own settings (separate from the engine's). Music defaults to 10%.
import { loadKey, saveKey } from './store.js';
export const SETTING_DEFAULTS = {
  music: 0.10, sfx: 1, voice: 1, master: 0.8,
  padAim: 1, mouseAim: 1, invertY: false, aimAssist: true, glyphs: 'ps', shake: 1,
  look: 'native', pixelSize: 1, quality: 'high', fps: 60,
};
export const settings = { ...SETTING_DEFAULTS, ...(loadKey('settings') || {}) };
export function saveSettings() { saveKey('settings', settings); }
export function resetSettings() { Object.assign(settings, SETTING_DEFAULTS); saveSettings(); }
export const LOOKS = ['native', 'spooky', 'ps1_horror', 'noir'];
/** Apply to a running engine. */
export function applySettings(engine) {
  engine.audio.persist = false;
  engine.audio.setVolume('master', settings.master);
  engine.audio.setVolume('sfx', settings.sfx);
  engine.audio.setVolume('music', settings.music);
  try { engine.shake.strength = settings.shake; } catch { /* optional */ }
}
