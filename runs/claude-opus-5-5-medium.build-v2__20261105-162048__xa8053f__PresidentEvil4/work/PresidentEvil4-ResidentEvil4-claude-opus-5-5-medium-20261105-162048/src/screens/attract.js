// Attract mode: a director over a list of clips. Cheats freely. Any input exits. Must survive any clip failing.
import { TITLE } from '../config.js';
import { Area } from '../game/area.js';
import { Bot } from '../game/bot.js';
import { addItem, arrange, newRun } from '../core/run.js';
import { foghornScene } from '../game/setpieces.js';
import { device, pollPads } from '../core/device.js';
import { CaseScreen } from './case.js';
import { ShopScreen, tune } from './shop.js';
import { SettingsScreen } from './settings.js';
const cheat = (a) => { const P = a.player; P.god = true; a.infiniteAmmo = true; a.cheatGod = true; a.autoDialog = true; a.fastText = true; a.silentTannoys = true; a.bot = new Bot(a, { attract: true }); P.locked = false; };
export const CLIPS = [
  { area: 'quay', jump: 'siege', t: 40, run: (a) => { cheat(a); a.ctx.tweens.call(12, () => { const d = a.level.spawns[2]; a.spawnEnemy('flenser', d.x, d.z); }); a.ctx.tweens.call(26, () => { foghornScene(a); }); } },
  { area: 'quay', jump: 'presiege', t: 16, menu: true, run: (a) => { cheat(a); a.bot = null; a.player.locked = true; const R = a.run; for (const id of ['scatter', 'rifle', 'flare', 'samphire', 'samphire', 'dulse']) addItem(R, id); const cs = new CaseScreen(a, {}); a.openMenu(cs); let t = 0; a.def.menuDemo = (A, ui) => { t += 1 / 60; const T = Math.floor(t * 2); if (t < 8) { cs.cx = T % 8; cs.cy = (T >> 1) % 5; if (T === 8 && !cs.did) { cs.did = true; arrange(R); A.ctx.audio.play('uiconfirm'); } if (t > 5 && !cs.held && R.items[0]) cs.pickUp(R.items[0], ui); if (cs.held && T % 2 === 0 && cs.lastRot !== T) { cs.lastRot = T; cs.held.rot = !cs.held.rot; } } else if (!A.shopDemo) { if (cs.held) { cs.held.rot = cs.held.orot ?? false; R.items.push(cs.held.orig); cs.held = null; } A.shopDemo = new ShopScreen(A, { x: 0, z: 0 }); A.shopDemo.s.tab = 2; A.menu = A.shopDemo; R.money = 9999; A.demoT = 0; } else { A.demoT += 1 / 60; if (A.demoT > 1 && Math.floor(A.demoT) !== A.demoLast) { A.demoLast = Math.floor(A.demoT); tune(R, 'pistol', ['power', 'rate', 'reload', 'capacity'][A.demoLast % 4]); A.ctx.audio.play('reload3'); A.shopDemo.s.focus = A.demoLast % 4; A.shopDemo.line('TUNED AND TARRED.'); } } }; } },
  { area: 'cannery', jump: 'belt', t: 30, run: (a) => { cheat(a); a.spawnEnemy('carrier', a.level.wx(36), a.level.wz(24)); for (let i = 0; i < 6; i++) a.spawnEnemy('gaffer', a.level.wx(14 + i * 3), a.level.wz(24)); a.spawnEnemy('runner', a.level.wx(20), a.level.wz(24)); a.scripts = []; } },
  { area: 'yard', t: 25, run: (a) => { cheat(a); a.bot.preferBoss = true; a.oneHit = false; a.player.teleport(a.level.wx(17), a.level.wz(26), 0, Math.PI); } },
  { area: 'causeway', t: 15, run: (a) => { cheat(a); a.cutscene?.skip(); } },
  { area: 'abbey', jump: 'crypt', t: 15, run: (a) => { cheat(a); a.bot = new Bot(a, { attract: true, crypt: true }); } },
  { area: 'nave', jump: 'hatch', t: 15, run: (a) => { cheat(a); } }, { area: 'nave', jump: 'mother', t: 15, run: (a) => { cheat(a); } },
  { area: 'launch', t: 15, run: (a) => { cheat(a); } },
];
export class AttractDirector {
  constructor(app, touch = false) { this.app = app; this.i = -1; this.t = 0; this.touch = touch; this.base = device.moved; this.card = 0; this.loops = 0; }
  start() { this.app.attract = this; this.app.attractOverlay = (ui) => this.overlay(ui); this.next(); }
  next() {
    const app = this.app; this.i++; if (this.i >= CLIPS.length) { this.i = -1; this.loops++; this.card = 5; this.toCard(); return; }
    const c = CLIPS[this.i]; this.t = c.t; app.run = newRun('standard'); const o = { attract: true, fromSave: true, jump: c.jump, noPause: true, attractStart: (a) => { try { c.run(a); } catch (e) { console.warn('attract clip', e); this.t = 0.5; } } };
    app.goArea(c.area, o).catch?.((e) => { console.warn('attract load', e); this.t = 0.1; });
  }
  toCard() { const app = this.app, self = this; const T = app.factories.title; class Card extends T { constructor(a) { super(a); this.name = 'attract-card'; } update(ctx, dt) { const ui = a0.ui; ui.begin(ctx); pollPads(); this.t += dt || 1 / 60; for (const w of this.waters) w.update(ctx.physics.time, ctx.engine.sunDir); ui.center(ui.H / 2 - 30, TITLE, { scale: 3, color: 'sand', shadow: 'plum' }); self.overlay(ui); self.tick(ctx, dt); } } const a0 = app; app.load(new Card(app)); this.inCard = true; this.t = 5; }
  tick(ctx, dt) {
    const real = dt || 1 / 60; const moved = device.moved !== this.base; const touch = ctx.input.anyDown(['Touch']);
    if (moved && !(device.last === 'pad' && false)) { this.exit(); return; } if (!this.touch && touch) { this.exit(); return; }
    this.t -= real; if (this.t <= 0 && !this.app.loading) { this.inCard = false; this.next(); }
  }
  overlay(ui) {
    if (!this.inCard) this.tick(ui.ctx, ui.ctx.engine.timeScale ? 1 / 60 : 1 / 60);
    const b = 16; ui.rect(0, ui.H - b, ui.W, b, 'ink'); ui.text(8, ui.H - b + 4, `DEMO  ${TITLE}`, { color: 'sand' });
    const msg = this.touch ? 'CONTROLLER OR KEYBOARD REQUIRED' : 'PRESS ANY BUTTON'; if (Math.floor(ui.t * 2) % 2) { const m = ui.measure(msg); ui.text(ui.W - m.width - 8, ui.H - b + 4, msg, { color: 'white' }); }
    if (this.touch) { const w = 250, x = ui.W / 2 - w / 2, y = 92; ui.panel(x, y, w, 58, { bg: 'ink', border: 'sand' }); ui.center(y + 10, 'CONTROLLER OR KEYBOARD REQUIRED', { color: 'white' }); const bx = ui.W / 2 - 40, by = y + 28; ui.rect(bx, by, 80, 18, 'navy'); ui.center(by + 5, 'SETTINGS', { color: 'sand' });
      if (this.settings) { this.settings.update(ui); if (this.settings.done) this.settings = null; } else if (ui.click && ui.within(bx, by, 80, 18, ui.cx, ui.cy)) { this.settings = new SettingsScreen(this.app); } if (device.padSeen || device.keySeen) this.exit(); }
  }
  exit() { const app = this.app; if (this.exited) return; this.exited = true; app.attract = null; app.attractOverlay = null; device.touchOnly = this.touch && !(device.padSeen || device.keySeen); app.goTitle(); }
}
