// The one piece of state that outlives a level: engine, settings, device, UI, screen stack, music, session.
import { Device } from './device.js';
import { UI } from './ui.js';
import { PAD_BUTTONS } from './intent.js';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './save.js';
import { Mix } from '../audio/mix.js';
import { Voice } from '../audio/voice.js';
import { registerSfx } from '../audio/sfx.js';
import { HEADLESS } from '../config.js';

export const app = {
  engine: null,
  run: null,
  device: new Device(),
  settings: loadSettings(),
  ui: null,
  stack: [],
  session: null, // the hub or a LocalSession, during a Night Shift round
  hub: false,
  attract: false,
  fast: false, // tests: no transitions
  devSpeed: 1,
  dev: { god: false, noclip: false, infiniteAmmo: false, oneHit: false, freezeAi: false, showZones: false, showNav: false, showTriggers: false, used: false },
  slow: 1,
  mix: null,
  voice: null,
  inited: false,
  transitioning: false,

  init(engine) {
    if (this.inited) { this.engine = engine; return; }
    this.inited = true;
    this.engine = engine;
    this.ui = new UI(this.device, this.settings);
    this.ui.onMove = () => engine.audio.play('uiMove');
    const { input, audio } = engine;
    input.gamepadButtons = { ...PAD_BUTTONS };
    input.preventKeys.add('Tab');
    input.preventKeys.add('F1');
    audio.persist = false;
    registerSfx(audio);
    this.mix = new Mix(audio, this.settings);
    this.voice = new Voice(audio, this.settings);
    this.applySettings(true);
    this.device.attach();
  },

  applySettings(first = false) {
    const { engine, settings: s } = this;
    if (!engine) return;
    engine.audio.persist = false;
    engine.audio.setVolume('master', s.master);
    engine.audio.setVolume('sfx', s.sfx);
    this.mix.setLevel(s.music);
    engine.audio.setMuted(false);
    engine.shake.strength = s.shake;
    if (HEADLESS) return;
    const patch = {
      look: s.look === 'native' ? undefined : s.look,
      pixelSize: s.pixelSize,
      quality: s.quality,
      fps: s.fps,
    };
    if (!first || s.look !== 'native' || s.pixelSize !== 'fine' || s.quality !== 'high' || s.fps !== 60) engine.settings.set(patch);
  },

  saveSettings() { saveSettings(this.settings); },
  resetSettings() {
    Object.assign(this.settings, DEFAULT_SETTINGS);
    this.saveSettings();
    this.applySettings();
  },

  // ---- Screen stack ----
  open(screen) {
    this.stack.push(screen);
    screen.justOpened = true; // The press that opened it must not also act on it.
    screen.savedFocus = this.ui?.focus;
    if (this.ui) this.ui.focus = null;
    screen.onOpen?.(this.engine.context);
    this.releasePointerLock();
    this.syncTime();
    return screen;
  },
  close(screen = this.stack[this.stack.length - 1]) {
    const i = this.stack.indexOf(screen);
    if (i < 0) return;
    this.stack.splice(i, 1);
    if (this.ui) this.ui.focus = screen.savedFocus ?? null;
    screen.onClose?.(this.engine.context);
    this.syncTime();
  },
  closeAll() { while (this.stack.length) this.close(); },
  get top() { return this.stack[this.stack.length - 1]; },

  /** Menus run with timeScale 0, never `paused`: update() still runs and wasPressed still works. */
  syncTime() {
    if (!this.engine) return;
    const frozen = this.stack.some((s) => s.frozen !== false);
    this.engine.timeScale = frozen ? 0 : this.slow * this.devSpeed;
  },

  /** Run the top screen. The frame it opened on, it only waits. */
  updateTop(ctx, ui) {
    const top = this.top;
    if (!top) return;
    if (top.justOpened) { top.justOpened = false; return; }
    top.update(ctx, ui);
  },

  // ---- Pointer lock: only while playing, requested from a real pointer press ----
  lockWanted: false,
  releasedByUs: false,
  lockFail: 0,
  installPointerLock() {
    if (HEADLESS || this.lockInstalled) return;
    const dom = this.engine.gpu?.renderer?.domElement;
    if (!dom) return;
    this.lockInstalled = true;
    dom.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || !this.lockWanted || document.pointerLockElement) return;
      const r = dom.requestPointerLock?.();
      if (r?.catch) r.catch(() => { this.lockFail = 1; });
    });
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.lockWanted && !this.releasedByUs) this.onLockLost?.();
      this.releasedByUs = false;
    });
  },
  releasePointerLock() {
    if (HEADLESS) return;
    if (document.pointerLockElement) { this.releasedByUs = true; document.exitPointerLock?.(); }
  },
  get pointerLocked() { return !HEADLESS && !!document.pointerLockElement; },
};

/** Change scene: cover, load, reveal. Keeps the HUD clear through the covers (the HUD sits above them). */
export async function goto(game, { kind = 'iris' } = {}) {
  const { engine } = app;
  if (app.transitioning) return;
  app.transitioning = true;
  try {
    app.closeAll();
    app.slow = 1;
    if (!app.fast) {
      engine.hud.clear();
      await engine.screen.cover(kind);
      engine.hud.clear();
    }
    await engine.loadGame(game);
    if (!app.fast) engine.screen.reveal(kind);
  } finally {
    app.transitioning = false;
    app.syncTime();
  }
}
