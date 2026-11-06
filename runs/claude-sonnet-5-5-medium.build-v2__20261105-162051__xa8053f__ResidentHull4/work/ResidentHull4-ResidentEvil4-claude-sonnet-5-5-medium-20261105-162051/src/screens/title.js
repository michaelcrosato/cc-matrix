// Title: a live 3D Foghorn scene, slow camera, menu. Ten seconds of no input starts the attract mode.
import { THREE, PALETTE, buildModel, setLookLayer } from '../../pixel-engine.js';
import { app } from '../core/app.js';
import { ui } from '../core/ui.js';
import { device, pollPads } from '../core/device.js';
import { TITLE, TAGLINE } from '../config.js';
import { applyMood, makeWater, addBackdrop } from '../game/world.js';
import { MODELS } from '../models/index.js';
import { hasSave } from '../core/save.js';
import { SettingsScreen } from './menus.js';
import { registerSfx } from '../audio/sfx.js';
import { registerVoices } from '../audio/voice.js';
import { Mix } from '../audio/mix.js';
import { applySettings } from '../core/settings.js';

const { Vector3 } = THREE;
const IDLE_FRAMES = 600;
export class TitleScene {
  constructor(o = {}) { this.name = 'title'; this.opts = o; this.st = { i: 0 }; this.idle = 0; this.seq = -1; this.t = 0; this.args = { title: 1 }; this.target = new Vector3(0, 8, 0); }
  async setup(ctx) {
    this.ctx = ctx; const eng = ctx.engine;
    registerSfx(eng.audio); registerVoices(eng.audio);
    app.mix = new Mix(eng.audio); applySettings(eng);
    this.mood = applyMood(ctx, 'title');
    const water = makeWater(ctx, [-90, -90, 90, 90], -0.3, false); this.water = water;
    const tower = buildModel('foghorn-tower', { catalog: MODELS }); tower.object.position.set(0, 0, 0); ctx.scene.add(tower.object); setLookLayer(tower.object, 'actors');
    ctx.lights.request({ position: [0, 24, 0], color: 0xffa040, intensity: 14, radius: 40 });
    ctx.lights.request({ position: [10, 6, 12], color: 0xff8030, intensity: 8, radius: 20, flicker: 'torch' });
    addBackdrop(ctx, 0, 0, 40, ['sea-stack'], 12, 3);
    for (let i = 0; i < 6; i++) { const b = buildModel(['rowboat', 'buoy', 'bollard'][i % 3], { catalog: MODELS }); b.object.position.set(-14 + i * 5, -0.2, 14 + (i % 2) * 5); b.object.rotation.y = i; ctx.scene.add(b.object); }
    const rig = ctx.camera; rig.zoomable = false; const self = this;
    rig.step = () => {
      const a = self.t * 0.05; const r = 34;
      rig.camera.position.set(Math.cos(a) * r, 7 + Math.sin(self.t * 0.2) * 1.2, Math.sin(a) * r);
      rig.camera.lookAt(0, 11, 0); rig.focus.set(0, 8, 0);
      if (rig.camera.fov !== 48) { rig.camera.fov = 48; rig.camera.updateProjectionMatrix(); }
    };
    app.mix.play('title');
    this.touchOnly = !!app.touchOnly; device.touchOnly = this.touchOnly;
  }
  menuRows() {
    const rows = [];
    if (hasSave() && !app.hub) rows.push({ id: 'continue', label: 'CONTINUE' });
    rows.push({ id: 'new', label: 'NEW CLAIM' }, { id: 'shift', label: 'NIGHT SHIFT' }, { id: 'settings', label: 'SETTINGS' }, { id: 'about', label: 'ABOUT' });
    return rows;
  }
  update(ctx, dt) {
    this.t += 1 / 60;
    const padNew = pollPads();
    ui.begin(ctx);
    app.mix.update(1 / 60);
    if (this.water) this.water.update(ctx.time);
    // idle / attract
    if (this.seq !== device.inputSeq) { this.seq = device.inputSeq; this.idle = 0; } else this.idle++;
    const lobby = app.top()?.isLobby;
    if (this.idle >= IDLE_FRAMES && !lobby && !app.hub && !app.attract) { this.idle = 0; app.startAttract?.(); return; }
    if (app.attract) { app.attractFrame?.(this, ctx, dt); if (this.opts.attractCard) { ui.text(ui.W / 2, 60, TITLE, { align: 'center', scale: 3, color: 'sand' }); } return; }
    const W = ui.W, H = ui.H;
    const top = app.top();
    if (this.touchOnly && !device.padSeen && device.kind !== 'pad' && !device.keyUsed) {
      // touch-only: required panel, settings button
      ui.panel(W / 2 - 110, H / 2 - 30, 220, 60, { fill: 'ink', edge: 'orange' });
      ui.text(W / 2, H / 2 - 14, 'CONTROLLER OR KEYBOARD REQUIRED', { align: 'center', color: 'orange' });
      ui.text(W / 2, H / 2 + 4, 'PLUG ONE IN. WE WILL WAIT.', { align: 'center', color: 'mist' });
      const bx = W - 56, by = 8; ui.rect(bx, by, 48, 16, 'navy'); ui.text(bx + 24, by + 5, 'SETTINGS', { align: 'center', color: 'white' });
      if (ui.nav.click && ui.ptr.cx >= bx && ui.ptr.cx < bx + 48 && ui.ptr.cy >= by && ui.ptr.cy < by + 16 && !top) app.push(new SettingsScreen());
      if (top) top.frame(this, ctx);
      return;
    }
    if (top) { top.frame(this, ctx); return; }
    // title
    const sc = ui.measure(TITLE, 3) < W - 24 ? 3 : 2;
    let lines = [TITLE];
    if (sc === 2 && ui.measure(TITLE, 2) > W - 24) { const mid = TITLE.lastIndexOf(' ', Math.floor(TITLE.length / 2) + 3); lines = [TITLE.slice(0, mid), TITLE.slice(mid + 1)]; }
    lines.forEach((l, i) => { ui.text(W / 2 + 1, 25 + i * 26, l, { align: 'center', scale: sc, color: 'ink', shadow: false }); ui.text(W / 2, 24 + i * 26, l, { align: 'center', scale: sc, color: 'sand' }); });
    ui.text(W / 2, 24 + lines.length * 26 + 2, TAGLINE, { align: 'center', color: 'mist' });
    const rows = this.menuRows();
    const x = Math.floor(W / 2) - 70;
    const r = ui.list(x, 132, 140, rows.map((q) => ({ label: q.label })), this.st, { rowH: 16 });
    ui.prompts([['confirm', 'SELECT']]);
    if (r.ok >= 0) { ctx.audio.play('uiOk'); this.choose(rows[r.ok].id); }
  }
  choose(id) {
    if (id === 'continue') app.continueGame?.();
    else if (id === 'new') app.push(new DifficultyScreen());
    else if (id === 'shift') app.push(new ShiftMenu());
    else if (id === 'settings') app.push(new SettingsScreen());
    else if (id === 'about') app.push(new app.AboutScreen());
  }
  cameraTarget() { return this.target; }
  status() { return `title idle ${this.idle}`; }
  ready() { window.__GAME__ = this; }
}
export class DifficultyScreen {
  constructor() { this.st = { i: 1 }; }
  frame(host, ctx) {
    const W = ui.W, H = ui.H; ui.rect(0, 0, W, H, 'ink');
    ui.text(W / 2, 24, 'NEW CLAIM', { align: 'center', scale: 3, color: 'sand' });
    ui.text(W / 2, 54, 'CHOOSE YOUR POLICY', { align: 'center', color: 'mist' });
    const rows = [{ label: 'ASSISTED' }, { label: 'STANDARD' }, { label: 'PROFESSIONAL' }];
    const r = ui.list(Math.floor(W / 2) - 80, 84, 160, rows, this.st, { rowH: 20 });
    const t = ['ENEMIES HIT SOFTER, BOSSES CALL HALF AS MANY FRIENDS. THE SAW IS NOT LETHAL.', 'THE POLICY AS WRITTEN.', 'ENEMIES HIT HARDER. ONE MORE ATTACKER AT A TIME.'][this.st.i];
    ui.panel(30, 160, W - 60, 30, { fill: 'night' }); ui.text(W / 2, 170, t, { align: 'center', color: 'white' });
    if (ui.nav.back) app.pop();
    if (r.ok >= 0) { app.pop(); app.startNew?.(['assisted', 'standard', 'professional'][r.ok]); }
    ui.prompts([['confirm', 'BEGIN'], ['back', 'BACK']]);
  }
}
export class ShiftMenu {
  constructor() { this.st = { i: 0 }; this.isLobby = false; }
  frame(host, ctx) {
    const W = ui.W, H = ui.H; ui.rect(0, 0, W, H, 'ink');
    ui.text(W / 2, 24, 'NIGHT SHIFT', { align: 'center', scale: 3, color: 'sand' });
    ui.text(W / 2, 54, 'HOLD THE QUAY UNTIL DAWN. FOUR MINUTES.', { align: 'center', color: 'mist' });
    const rows = [{ label: 'SOLO' }, { label: 'HOST PARTY' }, { label: 'JOIN PARTY' }, { label: 'LOCAL BOARD' }];
    const r = ui.list(Math.floor(W / 2) - 80, 84, 160, rows, this.st, { rowH: 20 });
    if (ui.nav.back) app.pop();
    if (r.ok >= 0) { if (r.ok === 0) { app.pop(); app.startShift?.({ solo: true }); } else if (r.ok === 3) app.push(new app.BoardScreen()); else { app.pop(); app.openLobby?.(r.ok === 1 ? 'host' : 'join'); } }
    ui.prompts([['confirm', 'SELECT'], ['back', 'BACK']]);
  }
}
