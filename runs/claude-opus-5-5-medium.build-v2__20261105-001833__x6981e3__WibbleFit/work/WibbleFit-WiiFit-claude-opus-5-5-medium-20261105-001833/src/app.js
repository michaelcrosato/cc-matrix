// App: everything that outlives a scene. Scene switching, save, settings, tunables, device, debug API.
import { LOOK_PRESETS, THREE } from '../pixel-engine.js';
import { SFX_DEFS } from './audio/sfx.js';
import { SONGS } from './audio/songs.js';
import { VoicePlayer } from './audio/voice.js';
import { PAD_MAP } from './core/actions.js';
import { RealClock } from './core/clock.js';
import { Device } from './core/device.js';
import { makeDriver, SKILLS } from './core/drivers.js';
import { applyResult, dropInRecord } from './core/progress.js';
import { Save } from './core/save.js';
import { resetTunables, T, TUNABLES } from './core/tunables.js';
import { BARKS } from './data/lines.js';
import { rects } from './ui/widgets.js';

export const LOOKS = { default: null, storybook: 'storybook', arcade: 'arcade', handheld: 'handheld' };
export const ATTRACT_PLAYLIST = [
  ['hub', { attract: true }],
  ['activity', { id: 'tree', attract: true }],
  ['activity', { id: 'hoop', attract: true }],
  ['activity', { id: 'header', attract: true }],
  ['activity', { id: 'step', attract: true }],
  ['activity', { id: 'squats', attract: true }],
  ['activity', { id: 'slackline', attract: true }],
  ['activity', { id: 'tray', attract: true }],
  ['activity', { id: 'pier', attract: true }],
  ['activity', { id: 'jog', attract: true }],
  ['weighin', { attract: true }],
  ['activity', { id: 'longstand', attract: true, from: 28 }],
];
export const ATTRACT_SECONDS = 14;
export const ATTRACT_IDLE = 10;

export const App = {
  engine: null, ctx: null, scene: null, save: new Save(), T, device: new Device(), clock: new RealClock(), voice: new VoicePlayer(),
  overlays: [], scenes: {}, loading: false, attract: null, session: null, touchOnly: false, slotIndex: null, idle: 0,
  devDriver: null, god: false, hudHidden: false, overlayDebug: false, lastPrompts: {}, lastDev: null, domInput: false, frames: 0, loadErrors: [], bark: null, barkT: 0, attractLoops: 0, attractLine: 0, devTimeScale: 1, lastResult: null, dialCenter: { x: 240, y: 56 }, dialOwner: null,

  get settings() { return this.save.data.settings; },
  get slot() { return this.slotIndex === null ? null : this.save.data.slots[this.slotIndex]; },
  glyphSet() { return this.settings.glyphs === 'xb' ? 'xb' : 'ps'; },
  get cheats() { return !!this.attract || this.god; },

  init(engine, { session = null, touchOnly = false } = {}) {
    this.engine = engine; this.ctx = engine.context; this.session = session; this.touchOnly = touchOnly;
    const input = engine.input;
    input.gamepadButtons = PAD_MAP; input.gamepadDeadzone = 0.12;
    input.preventKeys?.add('Tab');
    for (const [k, def] of Object.entries(SFX_DEFS)) engine.audio.register(k, def);
    this.applySettings();
    const tun = this.save.data.tunables ?? {};
    for (const r of TUNABLES) if (typeof tun[r.key] === 'number') T[r.key] = tun[r.key];
    globalThis.__GAME__ = this;
  },
  applySettings() {
    const s = this.settings, e = this.engine; if (!e) return;
    e.audio.setVolume('music', s.music ?? 0.1);
    e.audio.setVolume('sfx', s.sfx ?? 0.8);
    this.voice.level = s.voice ?? 0.8;
    T.mouseLeanRadius = s.mouseRadius ?? 70; T.stepOffsetMs = s.stepOffset ?? 0;
    if (!this.session && e.settings) {
      const patch = {};
      if (s.look && s.look !== 'default' && LOOK_PRESETS[s.look]) patch.look = s.look; else patch.look = undefined;
      patch.pixelSize = s.pixelSize ? s.pixelSize : undefined;
      try { e.settings.set(patch); } catch { /* headless has no panel */ }
    }
  },
  writeSave() { if (!this.session) this.save.write(); },

  sfx(name, o) { this.ctx?.audio.play(name, o); },
  music(id) { if (!id) { this.ctx.audio.playMusic(null); return; } this.ctx.audio.playMusic(SONGS[id], id); },
  say(text, who = 'ounce') { return this.voice.speak(this.ctx.audio, text, who); },
  flash(color = 'white', o = {}) { if (!this.settings.reduceFlashes) this.engine.screen.flash(color, o); },
  barkLine(text, who = 'ounce', seconds = 3.2) { this.bark = { text, who }; this.barkT = seconds; this.say(text, who); },

  // Scene switching: iris, swap, iris. Overlays never survive it.
  async go(id, args = {}, kind = 'iris') {
    if (this.loading) return false;
    this.loading = true;
    try {
      const make = this.scenes[id]; if (!make) throw new Error(`no scene ${id}`);
      const e = this.engine;
      await e.screen.cover(kind, { duration: 0.28 });
      this.overlays.length = 0; this.bark = null; this.barkT = 0;
      if (e.timeScale !== 1) e.timeScale = 1;
      const scene = make(args);
      await e.loadGame(scene, { camera: scene.camera?.() ?? { preset: 'fixed', position: [0, 3, 10], target: [0, 1, 0], fov: 30 } });
      if (this.devTimeScale !== 1 && !this.attract) e.timeScale = this.devTimeScale;
      this.freeCam = false;
      await e.screen.reveal(kind, { duration: 0.28 });
    } catch (err) { this.loadErrors.push(String(err?.message ?? err)); console.error(err); } finally { this.loading = false; }
    return true;
  },

  open(o) { this.overlays.push(o); o.opened?.(); return o; },
  close(o) { const i = this.overlays.indexOf(o ?? this.top()); if (i >= 0) this.overlays.splice(i, 1); },
  top() { return this.overlays[this.overlays.length - 1] ?? null; },
  blocked() { return this.overlays.length > 0; },

  openPause() {
    const p = this.scenes.pauseOverlay(); this.pausedScale = this.engine.timeScale;
    if (!this.session) { this.engine.timeScale = 0; this.scene?.onPause?.(this.ctx); }
    this.open(p); this.voice.stop();
  },
  resume() {
    if (!this.session) { this.engine.timeScale = this.devTimeScale; this.scene?.onResume?.(this.ctx); }
  },

  // Frame housekeeping, called once per rendered frame by the running scene.
  frame(ctx, dt) {
    const rdt = this.clock.tick(this.engine);
    this.frames++;
    this.device.update(ctx.input);
    if (this.barkT > 0) { this.barkT -= rdt; if (this.barkT <= 0) this.bark = null; }
    const any = this.device.anyInput || this.device.moved > 0.01 || this.domInput; this.domInput = false;
    if (this.touchOnly && ctx.input.gamepadConnected) this.touchOnly = false;
    if (this.attract) {
      if (any && !this.loading && this.attract.armed > 0.3) { this.stopAttract(); return rdt; }
      this.attract.armed += rdt; this.attract.t += rdt;
      if (this.attract.t >= ATTRACT_SECONDS && !this.loading) this.nextAttract();
    } else if (!this.session && this.scene?.attractable && !this.loading) {
      this.idle = any ? 0 : this.idle + rdt;
      if (this.idle >= ATTRACT_IDLE) this.startAttract();
    } else this.idle = 0;
    return rdt;
  },
  startAttract() {
    this.idle = 0; this.attract = { i: -1, t: 0, armed: 0 }; this.attractLoops = 0; this.overlays.length = 0;
    this.nextAttract();
  },
  nextAttract() {
    const a = this.attract; a.i = (a.i + 1) % ATTRACT_PLAYLIST.length; a.t = 0; if (a.i === 0) this.attractLoops++;
    this.attractLine = (this.attractLine + 1) % BARKS.attract.length;
    const [id, args] = ATTRACT_PLAYLIST[a.i];
    this.go(id, args);
  },
  stopAttract() { this.attract = null; this.idle = 0; this.engine.timeScale = 1; this.devTimeScale = 1; this.voice.stop(); this.go('title', { fromAttract: true }, 'fade'); },

  playerDriver(rng) { const name = this.attract ? 'expert' : this.devDriver; return name ? makeDriver(name, rng) : null; },
  setDriver(name) { this.devDriver = name; this.scene?.onDriverChange?.(); },
  lanesEnv(ctx) {
    return { input: ctx.input, device: this.device, blocked: () => this.blocked(), mouseLean: () => {
      const p = ctx.input.pointer, h = ctx.hud, c = this.dialCenter;
      const ax = ((p.x + 1) / 2) * h.width, ay = ((1 - p.y) / 2) * h.height;
      return { x: (ax - c.x) / T.mouseLeanRadius, y: -(ay - c.y) / T.mouseLeanRadius };
    } };
  },
  simEnv(ctx, def) {
    const gentle = !!this.settings.gentle;
    return { T, gentle, get god() { return App.cheats; }, get ringMul() { return T.ringScale * (gentle ? 1.25 : 1) * (App.attract ? 2 : 1); }, noiseMul: gentle ? 0.8 : 1 };
  },
  // One finished activity. Week guests earn Drips; Drop-In keeps records only.
  recordActivity(def, score, stars, seconds, mode) {
    const s = this.slot;
    let r;
    if (mode === 'week' && s) r = applyResult(s, def, score, stars, seconds);
    else r = { drips: 0, first: false, goalNow: false, beat: [], milestones: [], newBest: dropInRecord(this.save.data.dropIn, def, score, stars), stars, score };
    this.lastResult = { id: def.id, score, stars, ...r };
    this.writeSave();
    return r;
  },
  persistTunables() { this.save.data.tunables = { ...T }; this.writeSave(); },
  resetAllTunables() { resetTunables(); this.settings.mouseRadius = 70; this.settings.stepOffset = 0; this.persistTunables(); },

  state() {
    const e = this.engine;
    return { scene: this.scene?.id ?? null, status: this.scene?.status?.(this.ctx) ?? '', overlays: this.overlays.map((o) => o.id ?? 'overlay'), loading: this.loading, attract: this.attract ? { i: this.attract.i, t: this.attract.t, loops: this.attractLoops } : null, device: this.device.last, prompts: { ...this.lastPrompts }, glyphs: this.glyphSet(), volume: e?.audio.volume, session: !!this.session, touchOnly: this.touchOnly, timeScale: e?.timeScale, slotIndex: this.slotIndex, slot: this.slot, god: this.god, driver: this.devDriver, rects: rects.list.slice(), hudSize: e ? [e.hud.width, e.hud.height] : null, voice: this.voice.log.slice(-1)[0] ?? null, errors: e?.errors?.slice() ?? [], loadErrors: this.loadErrors.slice(), lastResult: this.lastResult, idle: this.idle };
  },
  tunables: T,
  skills: Object.keys(SKILLS),
  THREE,
};
App.goScene = App.go;
export const go = (id, args) => App.go(id, args);
// Test hook: voice rendered offline, so the check needs no ears.
App.voiceTest = async function voiceTest() {
  const { renderVoice, syllabify, voiceDuration } = await import('./audio/voice.js');
  const render = async (who) => {
    const syl = syllabify('Thank you. I have written that down.', who), len = voiceDuration(syl) + 0.2, sr = 22050;
    const c = new OfflineAudioContext(1, Math.ceil(len * sr), sr);
    renderVoice(c, c.destination, syl, 0, who);
    const b = await c.startRendering(), d = b.getChannelData(0);
    let rms = 0; for (const v of d) rms += v * v; rms = Math.sqrt(rms / d.length);
    return { rms, pitch: syl.reduce((a, s) => a + s.f0, 0) / syl.length };
  };
  const o = await render('ounce'), k = await render('coach');
  return { rms: Math.min(o.rms, k.rms), ounce: o.pitch, coach: k.pitch };
};
