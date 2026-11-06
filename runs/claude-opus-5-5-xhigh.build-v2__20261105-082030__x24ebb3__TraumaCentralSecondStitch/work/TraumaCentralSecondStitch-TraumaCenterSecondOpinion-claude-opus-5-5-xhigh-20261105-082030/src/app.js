// The persistent singleton: survives every stage swap. Save, settings, devices, config, the music
// director and the shared asset pack live here.
import { loadPack } from '../pixel-engine.js';
import { ALL_SYLLABLES, renderSyllable, syllableAt, wavDataUrl } from './audio/voice.js';
import { MusicDirector } from './audio/director.js';
import { SFX_DEFS } from './content/sfx.js';
import { createConfig } from './core/config.js';
import { DEFAULT_SETTINGS, loadSave, newProgress, writeSave } from './core/save.js';
import { Devices } from './input/devices.js';

const AUDIO_KEY = 'pixel-engine:audio';

export const PARTICLE_DEFS = {
  blood: { count: [3, 6], life: [0.25, 0.6], speed: [0.8, 2.2], gravity: 7, size: [1, 1], colors: ['red', 'plum'], spread: 70 },
  suck: { count: [1, 3], life: [0.12, 0.26], speed: [1, 2.6], gravity: -2, size: [1, 1], colors: ['red', 'orange'], spread: 40, radius: 0.25 },
  spark: { count: [4, 8], life: [0.15, 0.4], speed: [1.5, 3.4], gravity: 6, size: [1, 1], colors: ['white', 'sand', 'orange'] },
  smoke2: { count: [1, 2], life: [0.4, 0.9], speed: [0.5, 1.2], gravity: -1.5, size: [2, 1], colors: ['mist', 'slate'], spread: 25, radius: 0.1 },
  foam: { count: [2, 4], life: [0.25, 0.55], speed: [0.3, 1], gravity: 1, size: [1, 1], colors: ['lime', 'white'], radius: 0.4 },
  scanmote: { count: [1, 2], life: [0.3, 0.6], speed: [0.2, 0.6], gravity: -1, size: [1, 1], colors: ['cyan', 'sky'], radius: 1.2 },
  bonechip: { count: [3, 5], life: [0.2, 0.45], speed: [1, 2.2], gravity: 6, size: [1, 1], colors: ['white', 'sand'] },
  tear: { count: [3, 5], life: [0.3, 0.6], speed: [0.8, 1.8], gravity: 5, size: [1, 1], colors: ['cyan', 'sky'] },
  gold: { count: [8, 14], life: [0.5, 1.1], speed: [0.6, 2], gravity: -0.6, size: [1, 1], colors: ['sand', 'white', 'orange'] },
  gunk: { count: [10, 18], life: [0.4, 0.9], speed: [1, 3], gravity: 6, size: [2, 1], colors: ['lime', 'green', 'plum'] },
  ice: { count: [2, 4], life: [0.3, 0.7], speed: [0.2, 0.8], gravity: 1, size: [1, 1], colors: ['white', 'cyan'] },
};

export const App = {
  engine: null,
  ctx: null,
  devices: new Devices(),
  config: createConfig(),
  save: loadSave(),
  director: new MusicDirector(),
  overlays: [],
  frameDt: 1 / 60,
  idle: 0,
  kit: null,
  inited: false,
  inSession: false,
  cheats: {},
  devView: { hitboxes: false, botPlays: false, botSkill: 0.7, simSpeed: 1, stats: false, frameStep: false, stepNow: false },
  loading: false,
  log: [],

  async init(ctx) {
    this.ctx = ctx;
    this.engine = ctx.engine;
    this.director.attach(ctx.audio);
    if (this.inited) return;
    this.inited = true;
    this.devices.listen();
    ctx.engine.input.gamepadButtons = {};
    ctx.input.preventKeys.add('Tab');
    for (const k of ['KeyQ', 'KeyE', 'KeyF', 'KeyJ', 'KeyK']) ctx.input.preventKeys.add(k);
    const container = ctx.engine.renderer.container;
    if (container?.addEventListener) container.addEventListener('contextmenu', (e) => e.preventDefault());

    // Music is 10% by default: only if the player has never set it.
    let stored = null;
    try { stored = typeof localStorage === 'undefined' ? null : localStorage.getItem(AUDIO_KEY); } catch { stored = null; }
    if (!stored) ctx.audio.setVolume('music', 0.1);
    ctx.audio.setVolume('sfx', this.save.settings.sound);

    for (const [name, def] of Object.entries(SFX_DEFS)) ctx.audio.register(name, def);
    this.registerParticles(ctx);
    // Voices: pre-render syllables in pure JS. They play through the engine's buses and respect mute.
    await Promise.all(ALL_SYLLABLES.map((s) => ctx.audio.load(s.name, wavDataUrl(renderSyllable(s.t, s.v, s.o)))));
    try {
      this.kit = await loadPack('packs/kenney-furniture.json');
    } catch { this.kit = null; }
    if (typeof window !== 'undefined') window.__TRAUMA_APP__ = this;
  },
  registerParticles(ctx) {
    for (const [k, def] of Object.entries(PARTICLE_DEFS)) ctx.particles.register(k, def);
  },

  sfx(name, o) { return this.ctx?.audio.play(name, o); },
  /** One typewriter character: maybe a syllable. Returns true if it spoke. */
  voiceChar(who, text, i) {
    const s = syllableAt(who, text, i);
    if (!s) return false;
    const v = this.save.settings.voices;
    if (v <= 0) return false;
    this.ctx?.audio.play(s.name, { pitch: s.pitch, volume: s.volume * v });
    return true;
  },
  shake(a) { const k = this.save.settings.shake; if (k > 0) this.engine?.shake.add(a * k); },
  flash(color = 'white', o = {}) {
    if (this.save.settings.reduceFlashes) return;
    this.engine?.screen.flash(color, o);
  },
  rumble(o = {}, padIndex) {
    if (!this.save.settings.rumble) return false;
    return this.devices.rumble(padIndex, o);
  },
  cursor(visible) {
    const el = this.engine?.renderer?.container;
    if (el?.style) el.style.cursor = visible ? 'default' : 'none';
    const cv = this.ctx?.hud?.canvas;
    if (cv?.style) cv.style.cursor = visible ? 'default' : 'none';
  },
  persist() { if (!this.inSession) writeSave(this.save); },
  newRun(difficulty) {
    this.save.progress = { ...newProgress(), difficulty };
    this.save.hasSave = true;
    this.persist();
  },
  resetSettings() {
    this.save.settings = { ...DEFAULT_SETTINGS };
    this.ctx?.audio.setVolume('music', 0.1);
    this.ctx?.audio.setVolume('sfx', this.save.settings.sound);
    this.persist();
  },

  /** Swap stages under a transition. */
  async goto(stage, { kind = 'fade', duration = 0.3, camera } = {}) {
    if (this.loading) return;
    this.loading = true;
    this.overlays.length = 0;
    const engine = this.engine;
    const cam = camera ?? stage.cameraConfig ?? { preset: 'fixed', position: [0, 6, 8], target: [0, 1, 0], fov: 40, minZoom: 1, maxZoom: 1 };
    try {
      if (!engine.manual) await engine.screen.cover(kind, { duration });
      await engine.loadGame(stage, { camera: cam });
      if (!engine.manual) await engine.screen.reveal(kind, { duration });
      else engine.screen.clear();
    } finally {
      this.loading = false;
    }
  },
};
