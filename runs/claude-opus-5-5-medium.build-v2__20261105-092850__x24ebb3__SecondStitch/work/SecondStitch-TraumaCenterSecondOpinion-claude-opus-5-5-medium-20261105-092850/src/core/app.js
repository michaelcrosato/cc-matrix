// The persistent singleton: save, settings, devices, config, director. Stages come and go; this stays.
import { config, resetConfig } from './config.js';
import { loadAll, storeAll } from './save.js';
import { Devices } from '../input/devices.js';
import { Prompts } from '../ui/prompts.js';
import { Voice, loadSyllables } from '../audio/voice.js';
import { MusicDirector } from '../audio/director.js';
import { SFX_DEFS } from '../content/sfx.js';
import { CAST } from '../content/cast.js';

export class App {
  devices = new Devices();
  config = config;
  prompts = new Prompts(this);
  voice = new Voice(this);
  engine = null; ctx = null; director = null;
  sessionInfo = null; touchGate = false; flags = {}; urlFlags = {};
  attractIndex = 0;
  swapToken = 0; going = false; pendingStage = null;
  chosenSeats = null;
  constructor() { const { save, settings } = loadAll(); this.save = save; this.settings = settings; }
  get audio() { return this.engine.audio; }
  async boot(ctx) {
    this.engine = ctx.engine; this.ctx = ctx;
    if (this.booted) return;
    this.booted = true;
    const audio = ctx.audio;
    for (const [k, def] of Object.entries(SFX_DEFS)) audio.register(k, def);
    let stored = null;
    try { stored = typeof localStorage !== 'undefined' ? localStorage.getItem('pixel-engine:audio') : null; } catch { stored = null; }
    if (!stored) audio.setVolume('music', 0.1); // the brief: music at 10% by default.
    this.settings.music = audio.volume.music;
    this.settings.sfx = audio.volume.sfx;
    if (audio.volume.music !== this.settings.music) audio.setVolume('music', this.settings.music);
    this.director = new MusicDirector(audio);
    await loadSyllables(audio).catch(() => {});
    ctx.input.preventKeys.add('Tab');
    ctx.engine.input.gamepadButtons = {};
    const box = ctx.engine.renderer.container;
    if (box) box.addEventListener('contextmenu', (e) => e.preventDefault());
    this.applyLook();
  }
  persist() { if (this.demo) return; storeAll(this.save, this.settings); }
  resetConfig() { resetConfig(config); }
  castOf(id) { return CAST[id]; }
  applyLook(sat = 1, vig = 0.3, spread = 0) { this.engine.setLook(fieldLook(sat, vig, spread, this.settings)); }
  rumble(strong, weak, ms, index = null) { this.devices.rumble(index, strong, weak, ms, this.settings.rumble && !this.demo); }
  flash(color, o) { if (!this.settings.reduceFlash) this.engine.screen.flash(color, o); }
  shake(v) { if (this.settings.shake > 0) this.engine.shake.add(v * this.settings.shake); }
}
export function fieldLook(sat = 1, vig = 0.3, spread = 0, settings = {}) {
  const size = settings.pixel ?? 1;
  return {
    scene: [{ id: 'vignette', params: { intensity: vig } }, { id: 'adjust', params: { saturation: sat, contrast: 1 } }, { id: 'chromatic', params: { spread } }],
    actors: { pixel: { size, outline: 0.85, crease: 0.2 }, filters: [] },
    environment: { pixel: { size, outline: 0, crease: 0 }, filters: [] },
  };
}
export const app = new App();
