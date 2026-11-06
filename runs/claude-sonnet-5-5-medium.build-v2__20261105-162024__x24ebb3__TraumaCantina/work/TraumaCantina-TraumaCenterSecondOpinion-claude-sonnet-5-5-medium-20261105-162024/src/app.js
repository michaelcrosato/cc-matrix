// The App singleton: save, settings, devices, music director. Survives stage swaps (engine.loadGame).
import { loadSave, loadSettings, persist, DEFAULT_SETTINGS, DEFAULT_SAVE } from './core/save.js';
import { Devices } from './input/devices.js';
import { MusicDirector } from './audio/director.js';
import { cfg } from './core/config.js';

export const ASSIST = { off: 1, low: 0.6, high: 0.4 };
export const app = {
  save: loadSave(), settings: loadSettings(), devices: new Devices(), director: new MusicDirector(), session: null, frozenStore: false, attractActive: false, ready: false, rngSeed: 1,
  flush() { if (this.attractActive || this.session) return; persist(this.save, this.settings); },
  applySettings(ctx) {
    cfg.aimAssist = ASSIST[this.settings.aim] ?? 0.6; cfg.cursorSpeed = this.settings.cursor; this.devices.rumbleOn = this.settings.rumble;
    if (ctx?.audio) { ctx.audio.setVolume('music', this.settings.music); ctx.audio.setVolume('sfx', this.settings.sfx); }
  },
  resetSettings(ctx) { Object.assign(this.settings, DEFAULT_SETTINGS); this.applySettings(ctx); this.flush(); },
  voiceVol() { return this.settings.voices; },
};
