import { store } from './util.js';
export const DEFAULTS = {
  invertH: false, invertV: false, flightPitch: false, sensitivity: 1, deadzone: 0.15,
  masterVol: 0.8, musicVol: 0.6, sfxVol: 0.9, voiceVol: 0.7,
  shake: 1, rumble: true, aimAssist: true, subtitles: true, reducedFlash: false, quality: 'high', hints: true,
};
export const settings = Object.assign({}, DEFAULTS, store.get('settings', {}));
export const saveSettings = () => store.set('settings', settings);
