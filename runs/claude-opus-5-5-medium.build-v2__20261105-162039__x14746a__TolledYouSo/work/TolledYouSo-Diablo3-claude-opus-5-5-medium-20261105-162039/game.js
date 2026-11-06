// Tolled You So: a gothic co-op action RPG for the TV, on the Pixel Engine. Exports createGame(opts); starts the engine only when a page exists.
// Pad: left stick moves, Cross/Square/Triangle/Circle/R1/R2 are skills, L2 dodges, L1 drinks. Keyboard: WASD, mouse, 1-4, Space, Q, E, I, K, M, T, F, Esc.
import { ENGINE_VERSION, Engine, LOOK_PRESETS, THREE, withUrlOptions } from './pixel-engine.js';
import { SKILLS } from './src/data/classes.js';
import { TITLE } from './src/data/meta.js';
import { Music, setupAudio } from './src/audio/music.js';
import { VoicePlayer } from './src/audio/voice.js';
import { Router } from './src/input/router.js';
import { Play } from './src/modes/play.js';
import { Shell } from './src/modes/shell.js';
import { blankSave, readSave, storage, writeSave } from './src/save/save.js';
import { saveCampaign, saveHero } from './src/sim/serialize.js';
import { SettingsScreen } from './src/ui/settings.js';
import { UI } from './src/ui/ui.js';
import { runHubFlow, runServerCopy } from './src/net/hubflow.js';

export const isTouchOnly = () => typeof matchMedia !== 'undefined' && typeof navigator !== 'undefined' && !matchMedia('(any-pointer: fine)').matches && navigator.maxTouchPoints > 0;

export class TolledYouSo {
  name = TITLE;
  constructor(opts = {}) { this.opts = opts; this.THREE = THREE; this.SKILLS = SKILLS; this.target = new THREE.Vector3(); this.menuOwner = null; this.touchOnly = !!opts.touchOnly; this.save = blankSave(); this.booted = false; this.testBot = !!opts.testBot; this.autoDismiss = !!opts.autoDismiss; }
  get settingsV() { return this.settings.v; }
  async setup(ctx) {
    this.ctx = ctx; this.baseLook = { ...LOOK_PRESETS.none, scene: [{ id: 'vignette', params: { intensity: 0.3 } }] };
    setupAudio(ctx, storage());
    this.router = new Router(ctx, this);
    this.ui = new UI(ctx, this.router);
    this.voice = new VoicePlayer(ctx.audio);
    this.music = new Music(ctx);
    this.settings = new SettingsScreen(ctx, { ui: this.ui, voice: this.voice, settingsChanged: () => {} });
    this.play = new Play(ctx, this);
    this.shell = new Shell(ctx, this);
    ctx.camera.teleport(this.target.set(10, 0.9, 10));
    if (this.opts.session) { this.session = this.opts.session; await this.session.setup(this); }
    else if (!this.opts.noSaveBoot) ctx.input.send({ save: readSave() });
    else this.shell.boot(this.opts.save ?? blankSave());
  }
  ready() { if (typeof window !== 'undefined') window.__GAME__ = this; }
  fixedUpdate(ctx, dt) {
    if (this.session) { this.session.fixed(dt); return; }
    this.shell.fixed(dt);
  }
  update(ctx, dt) {
    const cmds = ctx.input.commands;
    for (const c of cmds) if (c && c.save && !this.booted) { this.booted = true; this.shell.boot(c.save); }
    if (typeof document !== 'undefined') this.cursor();
    this.router.frame(cmds);
    this.ui.begin();
    if (this.session) { this.session.update(dt); return; }
    this.shell.update(dt);
  }
  cursor() {
    const dev = this.router.lastDevice; if (dev === this.cursorDev) return; this.cursorDev = dev;
    const canvas = this.ctx.engine.gpu?.canvas ?? document.querySelector('canvas'); if (!canvas) return;
    canvas.style.cursor = dev === 'pad' ? 'none' : gauntletCursor();
  }
  cameraTarget() { return this.play?.target ?? this.target; }
  command(cmd, seat) { return this.play.command(cmd, seat); }
  seatsOpenForMenu() { return false; }
  padGone(pad) { const seat = this.router.padSeat[pad]; if (seat > 0 && this.play.world) this.play.hud.toast(`SEAT ${seat + 1}: THE PAD IS GONE.`, 'red'); this.router.release(pad); }
  // Autosave on zone change, quest step, vendor close, and every 60 s. Sessions never save.
  persist(force = false) {
    if (this.session || this.opts.noPersist) return;
    const s = this.save; const w = this.play?.world;
    if (w && w.mode === 'campaign' && this.shell.state === 'play') {
      const h = w.heroes[0]; const data = saveHero(h); data.campaign = { ...saveCampaign(w), bossKills: w.bossKills };
      s.heroes[this.shell.heroSlot] = data; s.stash = w.stash; s.devotion = w.devotion; s.unlocks = w.unlocks; s.bests = w.bests; s.last = this.shell.heroSlot;
    }
    s.settings = this.settings.v;
    if (force || !this.lastWrite || this.ctx.time - this.lastWrite > 1) { writeSave(s); this.lastWrite = this.ctx.time; }
  }
  status() { const w = this.play?.world; const st = this.shell?.state; if (!w) return `shell:${st}`; const h = w.heroes[0]; return `${st} zone:${w.zone?.id} level:${h?.level ?? 0} party:${w.heroes.filter((q) => !q.left).length} kills:${w.stats.kills}`; }
  fingerprint() { return `${this.shell?.state}|${this.play?.fingerprint?.()}`; }
}
function gauntletCursor() {
  const rows = ['..xx....', '.xwwx...', '.xwwx...', '.xwwxxx.', '.xwwwwwx', 'xxwwwwwx', 'xwwwwwwx', 'xwwwwwwx', '.xwwwwx.', '..xxxx..'];
  const scale = 3; const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${8 * scale}" height="${10 * scale}" shape-rendering="crispEdges">${rows.flatMap((r, y) => [...r].map((c, x) => (c === '.' ? '' : `<rect x="${x * scale}" y="${y * scale}" width="${scale}" height="${scale}" fill="${c === 'x' ? '#1a1c2c' : '#ffcd75'}"/>`))).join('')}</svg>`;
  return `url("data:image/svg+xml;base64,${typeof btoa !== 'undefined' ? btoa(svg) : ''}") 6 0, auto`;
}
export const createGame = (opts = {}) => new TolledYouSo(opts);

async function startPage() {
  const app = document.getElementById('app'); const touchOnly = isTouchOnly();
  const options = withUrlOptions({ container: app, camera: { preset: 'iso', viewHeight: 11.5, pitch: 42, yaw: 45, minZoom: 0.6, maxZoom: 1.4 }, aspect: 'fill', quality: 'high', touch: false, settings: { button: touchOnly ? 'top-right' : false }, debugKeys: false });
  // Sessions: straight into the round; no title, menus, attract or saves.
  if (typeof AIHub !== 'undefined' && AIHub.active) {
    const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
    if (info) {
      if (info.server) { await runServerCopy(info, createGame); return; }
      await runHubFlow(info, createGame, options, noWebGpu);
      return;
    }
  }
  try { await Engine.start(createGame({ touchOnly }), options); } catch (e) { noWebGpu(e); }
}
function noWebGpu(e) {
  const app = document.getElementById('app'); const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#1a1c2c;color:#ffcd75;font:20px monospace;text-align:center;padding:24px';
  const t = document.createElement('h1'); t.textContent = TITLE; const p = document.createElement('p'); p.textContent = 'This game needs WebGPU: a recent Chrome or Edge, Safari 26, or Firefox on Windows';
  d.append(t, p); (app ?? document.body).append(d);
  if (typeof console !== 'undefined') console.warn('Engine failed to start', e?.message ?? e);
}
if (typeof document !== 'undefined') startPage();
export { ENGINE_VERSION };
