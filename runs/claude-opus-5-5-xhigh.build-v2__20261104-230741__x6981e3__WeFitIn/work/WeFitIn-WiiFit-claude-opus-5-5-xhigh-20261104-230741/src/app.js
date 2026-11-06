// App: what outlives a scene. Save, settings, tunables, device, scene switching, debug API.
import { PALETTE, THREE } from '../pixel-engine.js';
import { PAD_BUTTONS } from './core/actions.js';
import { Device } from './core/device.js';
import { DEFAULT_SETTINGS, Store } from './core/save.js';
import { T } from './core/tunables.js';
import { renderVoice, syllabify, VoicePlayer } from './audio/voice.js';
import { SONGS } from './audio/songs.js';
import { registerSfx } from './audio/sfx.js';
import { registerParticles } from './art/particles.js';
import { ScreenStack } from './ui/stack.js';
import { layout } from './ui/layout.js';

export const APP_LOOKS = { default: undefined, storybook: 'storybook', arcade: 'arcade', handheld: 'handheld' };

export const App = {
  engine: null, ctx: null, scene: null,
  T,
  device: new Device(),
  stack: new ScreenStack(),
  voice: new VoicePlayer(),
  voiceApi: { syllabify, renderVoice },
  layout,
  store: null,
  session: null,
  touchOnly: false,
  scenes: {},
  loading: false,
  queued: null,
  attract: null,
  dev: { god: false, autopilot: null, overlay: false, hideHud: false, timeScale: 1, freeCam: false, allUnlocked: false },
  bark: null,
  frame: 0,
  uiT: 0,

  registerScenes(map) { Object.assign(this.scenes, map); },

  /** Set before the engine starts: { session, storage, touchOnly }. */
  boot({ session = null, storage = null, touchOnly = false } = {}) {
    this.session = session;
    this.bootStorage = storage;
    this.touchOnly = touchOnly;
    this.engine = null;
    this.store = null;
  },

  ensureInit(engine) {
    if (this.engine === engine) return;
    this.init(engine, { storage: this.bootStorage ?? null, session: this.session });
  },

  init(engine, { storage = null, session = null } = {}) {
    this.engine = engine;
    this.session = session;
    this.store = this.store ?? new Store(storage);
    const input = engine.input;
    input.gamepadButtons = { ...PAD_BUTTONS };
    input.gamepadDeadzone = 0.12;
    registerSfx(engine.audio);
    registerParticles(engine.particles);
    this.applySettings();
  },

  get settings() { return this.store?.settings ?? DEFAULT_SETTINGS; },
  get slot() { return this.store?.slot ?? null; },

  /** Every boot, from our own settings: the engine's own stored volume is shared by every engine game. */
  applySettings() {
    const s = this.settings;
    const audio = this.engine?.audio;
    if (audio) {
      audio.setVolume('music', s.music);
      audio.setVolume('sfx', s.sfx);
    }
    this.voice.setLevel(s.voice);
    this.device.glyphs = s.glyphs;
    T.mouseLeanRadius = s.mouseLeanRadius;
    T.stepOffsetMs = s.stepOffsetMs;
    if (this.engine?.settings) {
      const look = APP_LOOKS[s.look];
      const patch = {};
      if ((this.engine.settings.values.look ?? undefined) !== look) patch.look = look;
      const px = s.pixelSize ? 'chunky' : undefined;
      if ((this.engine.settings.values.pixelSize ?? undefined) !== px) patch.pixelSize = px;
      if (Object.keys(patch).length) this.engine.settings.set(patch);
    }
  },

  saveSettings() { this.applySettings(); this.store.write(); },

  /** A ring radius after the player's and the designer's scaling. */
  ringOf(r) { return r * T.ringScale * (this.settings.gentle ? 1.25 : 1); },
  noiseScale() { return this.settings.gentle ? 0.8 : 1; },

  sfx(name, opts) { return this.ctx?.audio.play(name, opts); },
  music(name) {
    const song = name ? SONGS[name] : null;
    this.ctx?.audio.playMusic(song, name ?? 'song');
    this.songName = name ?? null;
  },
  speak(syllables, who) { if (this.ctx) this.voice.speak(this.ctx.audio, syllables, who); },
  say(who, text) { this.bark?.say(who, text); },

  flash(color = 'white', o = { duration: 0.1 }) {
    if (!this.settings.reduceFlashes) this.engine?.screen.flash(color, o);
  },

  attach(ctx, scene) {
    this.ctx = ctx;
    this.scene = scene;
    this.stack.clear();
    this.voice.stop();
  },

  scene2(id) {
    const f = this.scenes[id];
    if (!f) throw new Error(`no scene ${id}`);
    return f;
  },

  /** Switch scene with an iris. A second call while one is under way waits its turn. */
  async go(id, args = {}, { transition = 'iris' } = {}) {
    if (this.loading) { this.queued = [id, args, { transition }]; return; }
    this.loading = true;
    const engine = this.engine;
    try {
      const make = this.scene2(id);
      this.dimmed = false;
      if (transition) await engine.screen.cover(transition, { duration: 0.28 });
      const scene = make(args);
      await engine.loadGame(scene, { camera: scene.cameraConfig?.() });
      engine.timeScale = this.dev.timeScale;
      if (transition) await engine.screen.reveal(transition, { duration: 0.28 });
    } finally {
      this.loading = false;
    }
    if (this.queued) {
      const q = this.queued;
      this.queued = null;
      await this.go(...q);
    }
  },

  /** Go wherever this guest's week is up to. */
  continueWeek() {
    const slot = this.slot;
    if (!slot) return;
    if (slot.phase === 'ferry') return this.go('ferry');
    if (slot.phase === 'morning') return this.go('weighin');
    if (slot.phase === 'report') return this.go('report');
    if (slot.phase === 'ending') return this.go('ending');
    return this.go('hub', {});
  },

  /** For tests: the whole picture as data. */
  state() {
    const engine = this.engine;
    const slot = this.slot;
    return {
      scene: this.scene?.id ?? null,
      status: this.scene?.status?.(this.ctx) ?? '',
      stack: this.stack.names(),
      device: this.device.last,
      glyphs: this.device.glyphs,
      column: this.device.promptColumn(),
      prompts: [...layout.prompts],
      day: slot?.day ?? null, week: slot?.week ?? null, drips: slot?.drips ?? null, phase: slot?.phase ?? null,
      music: engine?.audio.volume.music ?? null,
      attract: !!this.attract,
      timeScale: engine?.timeScale ?? 1,
      loading: this.loading,
      songName: this.songName ?? null,
      session: !!this.session,
    };
  },

  setDriver(skill) { this.dev.autopilot = skill; },
  tunables: T,
  palette: PALETTE,
  THREE,
};

globalThis.__GAME__ = App;
