// App: profile, settings, input, audio mix and scene switching. It outlives every engine Game.
import { LOOK_PRESETS, PALETTE } from '../pixel-engine.js';
import { OPTIONS_KEY, SAVE_KEY, TITLE } from './data/meta.js';
import { SPEAKERS } from './data/text.js';
import { Actions } from './input/actions.js';
import { UI } from './ui/ui.js';
import { AudioMix } from './audio/mix.js';
import { defaultEnv, formatTime } from './sim/race.js';
import * as career from './sim/career.js';
export const DEFAULT_OPTIONS = () => ({ music: 0.1, sfx: 1, master: 0.8, voices: 0.8, pixel: 'fine', look: 'none', quality: 'auto', fps: 60, glyphs: 'ps', vibration: true, steerCurve: 1.4, mouseSteer: false, units: 'kmh', raceMusic: true, camMode: 0, assists: { abs: true, tcs: 5, asm: 5, auto: true, line: false } });
const store = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } };
export class App {
  constructor({ headless = false, session = false } = {}) {
    this.headless = headless; this.session = session;
    this.actions = new Actions(); this.ui = new UI(this); this.mix = new AudioMix(this); this.speakers = SPEAKERS; this.env = defaultEnv(); this.options = this.loadOptions(); this.profile = session ? career.newProfile() : this.loadProfile();
    this.engine = null; this.scene = null; this.ctx = null; this.switching = false; this.lastRecording = null; this.dev = null; this.touchGate = false; this.lastRace = null; this.fmt = formatTime; this.career = career; this.factory = {}; this.devDirty = false;
    this.applyActionOptions();
  }
  applyActionOptions() { const o = this.options, a = this.actions; a.vibration = o.vibration; a.steerCurve = o.steerCurve; a.mouseSteer = o.mouseSteer; }
  loadOptions() { const s = store(), d = DEFAULT_OPTIONS(); if (this.session) return d; try { const raw = s?.getItem(OPTIONS_KEY); if (raw) { const o = JSON.parse(raw); return { ...d, ...o, assists: { ...d.assists, ...(o.assists ?? {}) } }; } } catch { /* a refused or broken store: use defaults */ } return d; }
  saveOptions() { if (this.session) return; try { store()?.setItem(OPTIONS_KEY, JSON.stringify(this.options)); } catch { /* storage may refuse */ } }
  loadProfile() { const s = store(); try { const raw = s?.getItem(SAVE_KEY); if (raw) return career.migrate(JSON.parse(raw)); } catch { /* start fresh */ } return career.newProfile(); }
  hasSave() { const s = store(); try { return !!s?.getItem(SAVE_KEY); } catch { return false; } }
  save() { if (this.session) return true; try { store()?.setItem(SAVE_KEY, JSON.stringify(this.profile)); return true; } catch { return false; } }
  newGame() { this.profile = career.newProfile(); this.save(); }
  bind(engine) {
    this.engine = engine; const a = engine.audio; this.mix.attach(a);
    a.setVolume('music', this.options.music); a.setVolume('sfx', this.options.sfx); a.setVolume('master', this.options.master);
    engine.input.gamepadButtons = {}; engine.input.gamepadLookSpeed = 0;
    for (const k of ['Tab', 'Backspace', 'F1', 'F2']) engine.input.preventKeys.add(k);
    this.applyPicture();
    if (typeof window !== 'undefined') { window.addEventListener('contextmenu', (e) => e.preventDefault()); const mark = () => { this.actions.domInput = true; }; for (const ev of ['keydown', 'pointerdown', 'touchstart']) window.addEventListener(ev, mark, { passive: true }); } // attract mode ends on any input, even one made while a clip is loading
  }
  applyPicture() {
    const o = this.options, e = this.engine; if (!e || this.headless) return;
    const patch = {}; patch.pixelSize = o.pixel === 'chunky' ? 'chunky' : 'fine'; patch.quality = o.quality; patch.fps = o.fps; patch.look = o.look === 'none' ? undefined : o.look;
    try { e.settings.set(patch); } catch { /* a look name the engine rejects keeps the last */ }
  }
  // A scene has started: hooks for tools, sound for its context.
  enterScene(ctx, scene) {
    this.ctx = ctx; this.scene = scene; if (!this.engine) this.bind(ctx.engine);
    this.mix.attach(ctx.audio);
    if (typeof window !== 'undefined') window.__GAME__ = this.handle();
  }
  handle() {
    const app = this;
    return {
      app, TITLE,
      state() { const u = app.ui, s = app.scene, r = s?.sim; return { scene: s?.name ?? null, screen: u.top?.id ?? null, focus: u.top?.focus ?? null, items: u.items.map((i) => i.id), stack: u.stack.map((x) => x.id), profile: { credits: app.profile.credits, day: app.profile.day, licences: app.profile.licences, current: career.carEntry(app.profile)?.carId ?? null, cars: app.profile.cars.map((c) => c.carId), ended: app.profile.ended }, race: r ? { track: r.tr.id, phase: r.phase, time: r.time, laps: r.laps, done: r.done, order: r.order.map((e) => e.name), kind: s.data?.kind } : null, device: app.actions.lastDevice, music: app.engine?.audio.volume.music, attract: !!app.attract?.active, touchGate: app.touchGate, glyphs: app.options.glyphs, errors: app.engine?.errors ?? [], status: s?.status?.() }; },
      press(a) { app.actions.inject(a); },
      focus(id) { if (app.ui.top) app.ui.top.focus = id; },
      options: app.options, env: app.env,
    };
  }
  // ---- changing scene: Menu, Race, Replay ----
  async go(makeGame, kind = 'wipe') {
    if (this.switching) return false; this.switching = true;
    this.mix.quiet(); this.mix.stopVoice();
    const e = this.engine;
    try {
      if (!this.headless) await e.screen.cover(kind, { duration: 0.35 });
      this.ui.subtitle = null;
      await e.loadGame(makeGame());
      this.applyActionOptions();
      if (!this.headless) void e.screen.reveal(kind, { duration: 0.35 });
    } finally { this.switching = false; }
    return true;
  }
  devActive() { return this.devDirty; }
  afterFrame(ctx, dt) {
    const a = this.actions;
    // Hide the cursor after 2 s idle and during races.
    const c = ctx.engine.renderer?.container;
    if (c) { const hide = this.scene?.name === 'race' && !this.ui.top ? true : a.mouseIdle > 2; if (hide !== this.cursorHidden) { this.cursorHidden = hide; c.style.cursor = hide ? 'none' : ''; } }
    this.attract?.tick(ctx, dt);
  }
  openPause(scene) { this.factory.pause?.(scene); }
  onTestFinished(scene) { this.factory.testFinished?.(scene); }
  onRaceFinished(scene) { this.factory.raceFinished?.(scene); }
  note(line) { this.ui.note(line); }
}
void LOOK_PRESETS; void PALETTE;
