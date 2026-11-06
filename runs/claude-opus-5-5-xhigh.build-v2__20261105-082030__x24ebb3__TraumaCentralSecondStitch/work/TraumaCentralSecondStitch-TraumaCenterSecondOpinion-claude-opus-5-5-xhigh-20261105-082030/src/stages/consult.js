// Consult on one TV: up to four seats, keyboard and mouse plus pads. Press to scrub in, back out to
// leave, and seat one starts. Never touches the network outside a session.
import { App } from '../app.js';
import { CAMPAIGN_OPS, OPS, SESSION_OPS } from '../content/ops/index.js';
import { Figure } from '../view/figure.js';
import { applyLook } from '../view/looks.js';
import { SetView } from '../view/sets.js';
import { toTitle } from './flow.js';
import { OperationStage, OP_CAMERA } from './operation.js';
import { Stage } from './stage.js';

const COLORS = [0xe8443a, 0x3b82f6, 0x22c55e, 0xf5b700];
const SPOTS = [[-1.9, 0, -2.2, 0.9], [1.9, 0, -2.2, -0.9], [-1.6, 0, -4, 0.6], [1.6, 0, -4, -0.6]];

export class ConsultStage extends Stage {
  name = 'consult';
  attractable = true;
  cameraConfig = { preset: 'fixed', position: [0, 3.6, 3.8], target: [0, 1.1, -3], fov: 44, minZoom: 1, maxZoom: 1 };
  constructor() {
    super();
    this.seats = [];
    this.opI = 0;
    this.figs = [];
  }
  async build(ctx) {
    this.set = new SetView(ctx, 'or7');
    applyLook(ctx.engine, App.save.settings);
    App.director.play('or-calm');
    // Pile-Up, or any cleared op except the triage and the finale.
    this.ops = [OPS.pileup, ...SESSION_OPS.filter((o) => o.id !== 'pileup'), ...CAMPAIGN_OPS.filter((o) => (App.save.log[o.id] || App.unlockAll) && o.id !== 'op3' && o.id !== 'op9')];
  }
  refreshFigures(ctx) {
    for (const f of this.figs) ctx.scene.remove(f.object);
    this.figs = this.seats.map((s, i) => {
      const f = new Figure(ctx, 'extra', SPOTS[i].slice(0, 3), SPOTS[i][3]);
      const color = COLORS[i];
      f.object.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.userData = { ...m.material.userData, shared: false }; } });
      f.object.traverse((m) => { if (m.isMesh && m.name?.startsWith?.('scrub')) m.material.color.setHex(color); });
      return f;
    });
  }
  frame(ctx, dt, overlay) {
    this.set.update(dt, ctx.camera.camera.position);
    for (const f of this.figs) f.update(dt);
    if (overlay) return;
    const d = App.devices;
    const has = (b) => this.seats.findIndex((s) => s.binding === b);
    // Scrub in.
    const kbmIn = d.click || ctx.input.wasPressed('Enter') || ctx.input.wasPressed('Space');
    const kbmOut = d.rightClick || ctx.input.wasPressed('Escape');
    const joins = [];
    if (kbmIn) joins.push('kbm');
    d.pads.forEach((p, i) => { if (p.connected && p.edge[0]) joins.push(i); });
    for (const b of joins) {
      const at = has(b);
      if (at === 0) {
        // Seat one, again: start.
        this.start();
        return;
      }
      if (at < 0 && this.seats.length < 4) {
        this.seats.push({ binding: b });
        App.sfx('uiConfirm');
        App.rumble({ strong: 0.3, weak: 0.3, ms: 120 }, typeof b === 'number' ? b : undefined);
        this.refreshFigures(ctx);
      }
    }
    // Leave.
    const leaves = [];
    if (kbmOut) leaves.push('kbm');
    d.pads.forEach((p, i) => { if (p.connected && p.edge[1]) leaves.push(i); });
    for (const b of leaves) {
      const at = has(b);
      if (at >= 0) { this.seats.splice(at, 1); App.sfx('uiBack'); this.refreshFigures(ctx); } else if (this.seats.length === 0) { toTitle(); return; }
    }
    if (d.nav.left) { this.opI = (this.opI + this.ops.length - 1) % this.ops.length; App.sfx('uiMove'); }
    if (d.nav.right) { this.opI = (this.opI + 1) % this.ops.length; App.sfx('uiMove'); }
    // Seat one may pick with tabs too.
    if (d.nav.tabL) { this.opI = (this.opI + this.ops.length - 1) % this.ops.length; App.sfx('uiMove'); }
    if (d.nav.tabR) { this.opI = (this.opI + 1) % this.ops.length; App.sfx('uiMove'); }
  }
  start() {
    if (!this.seats.length) return;
    App.sfx('uiConfirm');
    const op = this.ops[this.opI];
    App.goto(new OperationStage({ opId: op.id, mode: 'consult', difficulty: 'resident', seats: this.seats.map((s) => ({ binding: s.binding })), seed: Math.floor(Math.random() * 1e9) }), { kind: 'iris', camera: OP_CAMERA });
  }
  draw(ctx, ui) {
    const w = ui.w, h = ui.h;
    ui.center(8, 'CONSULT', { color: 'sand', scale: 3 });
    ui.center(36, 'A SECOND PAIR OF HANDS', { color: 'mist' });
    const cw = Math.min(100, (w - 30) / 4), gap = 6, total = cw * 4 + gap * 3;
    const x0 = (w - total) / 2, y = 55;
    for (let i = 0; i < 4; i++) {
      const s = this.seats[i];
      const x = x0 + i * (cw + gap);
      ui.rect(x, y, cw, 70, s ? 'night' : 'ink');
      ui.outline(x, y, cw, 70, s ? COLORS[i] : 'slate', s ? 2 : 1);
      ui.text(x + 6, y + 6, `SEAT ${i + 1}`, { color: s ? COLORS[i] : 'slate', shadow: false });
      if (s) {
        ui.text(x + 6, y + 20, s.binding === 'kbm' ? 'KEYS+MOUSE' : `PAD ${s.binding + 1}`, { color: 'white', shadow: false });
        ui.text(x + 6, y + 32, i % 2 === 0 ? 'THE QUIET' : 'SECOND LOOK', { color: 'cyan', shadow: false });
        ui.text(x + 6, y + 52, 'READY', { color: 'lime', shadow: false });
      } else {
        const lw = ui.actionWidth('confirm');
        ui.action(x + 6, y + 30, 'confirm');
        ui.text(x + 6 + lw + 3, y + 31, 'SCRUB IN', { color: 'mist', shadow: false });
      }
    }
    const op = this.ops?.[this.opI];
    if (op) {
      ui.panel(x0, y + 80, total, 50, 'navy', 'sand');
      ui.text(x0 + 10, y + 86, op.title, { color: 'sand', scale: 2, shadow: false });
      ui.text(x0 + 10, y + 106, `${op.patient.name}`, { color: 'white', shadow: false });
      const obj = ui.wrap(op.patient.objective, total - 20);
      ui.text(x0 + 10, y + 117, obj[0], { color: 'mist', shadow: false });
      ui.text(x0 - 16, y + 96, '<', { color: 'sand', scale: 2 });
      ui.text(x0 + total + 6, y + 96, '>', { color: 'sand', scale: 2 });
    }
    if (this.seats.length) {
      const label = 'SEAT 1: ';
      const lw = ui.hud.measure(label, 1).width + ui.actionWidth('confirm') + ui.hud.measure(' STARTS', 1).width + 2;
      let x = (w - lw) / 2;
      const yy = y + 138;
      ui.text(x, yy, label, { color: COLORS[0] });
      x += ui.hud.measure(label, 1).width;
      x += ui.action(x, yy - 1, 'confirm') + 2;
      ui.text(x, yy, ' STARTS');
    }
    ui.hints([['back', this.seats.length ? 'LEAVE' : 'BACK']], h - 12);
  }
  status() { return `consult seats=${this.seats.length} op=${this.ops?.[this.opI]?.id}`; }
}
