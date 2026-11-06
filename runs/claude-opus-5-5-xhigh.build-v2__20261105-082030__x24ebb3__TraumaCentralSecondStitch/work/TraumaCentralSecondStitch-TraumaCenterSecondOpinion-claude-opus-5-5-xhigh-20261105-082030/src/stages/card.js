// The game's own card before a round: OR-7 wide, one masked figure per player in their seat colour, the
// title, who is ready, how to win, the controls for this player's device, the time left.
import { App } from '../app.js';
import { TITLE } from '../core/meta.js';
import { OPS } from '../content/ops/index.js';
import { Figure } from '../view/figure.js';
import { applyLook } from '../view/looks.js';
import { SetView } from '../view/sets.js';
import { chooseRound } from '../net/host.js';
import { Stage } from './stage.js';

const SPOTS = [[-1.9, 0, -2.0, 0.9], [1.9, 0, -2.0, -0.9], [-1.4, 0, -4.1, 0.6], [1.4, 0, -4.1, -0.6]];

export class CardStage extends Stage {
  name = 'card';
  cameraConfig = { preset: 'fixed', position: [0, 3.6, 3.8], target: [0, 1.1, -3], fov: 44, minZoom: 1, maxZoom: 1 };
  constructor(info, session) { super(); this.info = info; this.session = session; this.card = { left: null, ready: [], asked: false, asking: 0, paused: false, starting: false }; }
  async build(ctx) {
    this.set = new SetView(ctx, 'or7');
    applyLook(ctx.engine, App.save.settings);
    const rnd = window.AIHub.rng('card');
    this.def = OPS[chooseRound(this.info)];
    this.figs = this.info.players.map((p, i) => {
      const f = new Figure(ctx, 'extra', SPOTS[i].slice(0, 3), SPOTS[i][3], rnd() > 0.5 ? 'Idle' : 'IdleLook');
      f.object.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.userData = { ...m.material.userData, shared: false }; m.material.color.setStyle(p.color); } });
      return f;
    });
    App.director.play('or-calm', { now: true });
  }
  onReady(ctx) { this.session.engineReady?.(); }
  frame(ctx, dt) {
    this.set.update(dt, ctx.camera.camera.position);
    for (const f of this.figs ?? []) f.update(dt);
    const d = App.devices;
    const hub = window.AIHub;
    const pressedReady = ctx.input.wasPressed('Enter') || d.pads.some((p) => p.edge[0]);
    const pressedMore = ctx.input.wasPressed('KeyM') || d.pads.some((p) => p.edge[3]);
    if (pressedReady) { hub.answer('ready'); App.sfx('uiConfirm'); }
    if (pressedMore) { hub.answer('more'); App.sfx('uiMove'); }
    if (d.click && this.readyBox && this.ui.hit(...this.readyBox)) { hub.answer('ready'); App.sfx('uiConfirm'); }
    if (d.click && this.moreBox && this.ui.hit(...this.moreBox)) { hub.answer('more'); App.sfx('uiMove'); }
  }
  draw(ctx, ui) {
    const w = ui.w, h = ui.h;
    const c = this.card;
    ui.center(8, TITLE, { color: 'white', scale: ui.fit(TITLE, w - 12, 3), shadow: 'plum' });
    if (this.def) {
      ui.center(35, this.def.title, { color: 'sand', scale: ui.fit(this.def.title, w - 12, 2) });
      const obj = ui.wrap(this.def.patient.objective, w - 60);
      obj.slice(0, 2).forEach((l, i) => ui.center(54 + i * 10, l, { color: 'white' }));
    }
    const stacked = w < 330;
    const boxH = stacked ? 130 : 80;
    const y = h - boxH - 8;
    ui.rect(6, y, w - 12, boxH, 'ink');
    ui.outline(6, y, w - 12, boxH, 'slate');
    this.info.players.forEach((p, i) => {
      const yy = y + 5 + i * 11;
      const ready = c.ready?.includes(p.id);
      const col = Number.parseInt(p.color.slice(1), 16);
      ui.rect(12, yy, 8, 8, col);
      ui.text(24, yy, p.name.slice(0, 14), { color: col, shadow: false });
      if (ready) ui.text(stacked ? w - 44 : 112, yy, 'READY', { color: 'lime', shadow: false });
    });
    const dx = stacked ? 12 : w / 2 + 6;
    const cy0 = stacked ? y + 50 : y + 5;
    ui.text(dx, cy0, 'CONTROLS', { color: 'sand', shadow: false });
    let cx = dx;
    cx += ui.action(cx, cy0 + 10, 'move') + 3; ui.text(cx, cy0 + 11, 'MOVE', { color: 'white', shadow: false }); cx += 32;
    cx += ui.action(cx, cy0 + 10, 'use') + 3; ui.text(cx, cy0 + 11, 'USE', { color: 'white', shadow: false });
    cx = dx;
    cx += ui.action(cx, cy0 + 22, 'tool') + 3; ui.text(cx, cy0 + 23, 'TOOL', { color: 'white', shadow: false }); cx += 32;
    cx += ui.action(cx, cy0 + 22, 'gift') + 3; ui.text(cx, cy0 + 23, 'GIFT', { color: 'white', shadow: false });
    // Answers.
    const by = cy0 + 39;
    const rw = Math.min(90, (w - 28) / 2 - 2), mw = Math.min(96, (w - 28) / 2 + 4);
    this.readyBox = [dx, by, rw, 13];
    this.moreBox = [dx + rw + 6, by, mw, 13];
    ui.rect(dx, by, rw, 13, 'navy'); ui.outline(dx, by, rw, 13, 'lime');
    let bx = dx + 4;
    bx += ui.action(bx, by + 2, 'confirm') + 3;
    ui.text(bx, by + 3, 'READY', { color: 'lime', shadow: false });
    ui.rect(dx + rw + 6, by, mw, 13, 'navy'); ui.outline(dx + rw + 6, by, mw, 13, c.asked ? 'sand' : 'slate');
    bx = dx + rw + 10;
    bx += ui.action(bx, by + 2, 'more') + 3;
    ui.text(bx, by + 3, 'MORE TIME', { color: c.asked ? 'sand' : 'white', shadow: false });
    const leftS = c.left != null ? Math.ceil(c.left / 1000) : null;
    const msg = c.starting ? 'STARTING' : c.paused ? 'PAUSED: MORE TIME' : leftS != null ? `STARTS IN ${leftS}` : '';
    ui.text(dx, cy0 + 59, msg, { color: 'white', shadow: false });
  }
  status() { return 'card'; }
}
