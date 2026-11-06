// Consult: couch co-op, 1 to 4 seats on one screen (keyboard and mouse plus pads). Never touches the network.
import { THREE } from '../../pixel-engine.js';
import { app } from '../app.js';
import { go } from '../core/nav.js';
import { ctext, mtext, textW, wrap, prompts, SEAT_PAL } from '../ui/hud.js';
import { BY_ID, OPS, pileup } from '../content/ops/index.js';
import { buildSet } from '../view/sets.js';
import { PAD } from '../input/devices.js';
import { LOOK } from '../core/look.js';
import { isUnlocked } from '../sim/campaign.js';
export class ConsultStage {
  name = 'Consult';
  constructor(a = {}) { this.a = a; }
  async setup(ctx) {
    this.ctx = ctx; this.t = 0; ctx.engine.setLook(LOOK(0.9, 0.5, 0)); const { ensureKit } = await import('../view/sets.js'); await ensureKit(); this.set = buildSet(ctx, 'or7'); ctx.engine.sun.intensity = 0.3;
    this.seats = []; this.round = 0; this.rounds = [pileup, BY_ID['s-introit'], BY_ID['s-lacrimosa'], BY_ID['s-wrath'], ...OPS.filter((o) => o.id !== 'op3' && o.id !== 'op9' && (app.save.cleared[o.id] || app.save.unlockedAll))];
    app.director.start(ctx, 'ward', 0); this.idleStart = performance.now(); this.lastAct = app.devices.activity; ctx.input.preventKeys.add('Tab');
  }
  cameraTarget() { return new THREE.Vector3(0, 1.6, 0); }
  status() { return `consult seats=${this.seats.length} round=${this.rounds[this.round].id}`; }
  join(src, label) { if (this.seats.some((s) => s.key === src.key) || this.seats.length >= 4) return; this.seats.push({ ...src, label }); this.ctx.audio.play('uiOk', { pitch: this.seats.length }); }
  leave(key) { const i = this.seats.findIndex((s) => s.key === key); if (i >= 0) { this.seats.splice(i, 1); this.ctx.audio.play('uiBack'); return true; } return false; }
  update(ctx, dt) {
    const hud = ctx.hud, dev = app.devices, inp = ctx.input; dev.poll(dt, ctx); const nav = dev.nav; this.t += dt; this.set.update(dt, this.t);
    const cam = ctx.camera.camera; cam.position.set(Math.sin(this.t * 0.2), 3.6, 8.6); cam.fov = 46; cam.updateProjectionMatrix(); cam.lookAt(0, 1.5, 0); cam.updateMatrixWorld?.(true);
    // idle returns nothing here; attract is menu-only
    // joins
    if (inp.wasPressed('Enter') || (nav.click && nav.click[1] > ctx.hud.height - 80)) { if (!this.seats.some((s) => s.key === 'kb')) this.join({ key: 'kb', kind: 'kb' }, 'KEYBOARD + MOUSE'); else if (this.seats[0].key === 'kb') this.start(ctx); }
    for (let i = 0; i < 4; i++) {
      if (!dev.pads[i].connected) continue; const key = 'pad' + i;
      if (dev.padPress(PAD.X, i)) { if (!this.seats.some((s) => s.key === key)) this.join({ key, kind: 'pad', i }, `PAD ${i + 1}`); else if (this.seats[0].key === key) this.start(ctx); }
      if (dev.padPress(PAD.O, i)) { if (!this.leave(key)) { if (!this.seats.length) return go.menu(ctx); } }
      if (dev.padPress(PAD.TRI, i) && this.seats[0]?.key === key) this.start(ctx);
      if (dev.padPress(PAD.LEFT, i) || dev.padPress(PAD.RIGHT, i)) this.cycle(dev.padPress(PAD.RIGHT, i) ? 1 : -1);
    }
    if (nav.rclick || inp.wasPressed('Escape') || inp.wasPressed('Backspace')) { if (!this.leave('kb')) { if (!this.seats.length || true) return go.menu(ctx); } }
    if (inp.wasPressed('ArrowLeft') || inp.wasPressed('KeyA')) this.cycle(-1); if (inp.wasPressed('ArrowRight') || inp.wasPressed('KeyD')) this.cycle(1); if (inp.wasPressed('KeyE')) this.start(ctx);
    hud.clear(); const w = hud.width, h = hud.height; hud.rect(0, 0, w, h, 'night'); ctext(hud, 6, 'CONSULT', { scale: 3, color: 'sand' }); ctext(hud, 34, 'ONE TABLE. UP TO FOUR PAIRS OF HANDS.', { color: 'mist' });
    const r = this.rounds[this.round]; hud.rect(60, 54, w - 120, 50, 'navy'); ctext(hud, 60, `< ${r.title} >`, { scale: 2, color: 'white' }); ctext(hud, 82, r.id === 'pileup' ? 'A WAVE-BASED CHEST WOUND. A SMALL INTROIT AT THE END.' : r.consult ? 'A BOSS FIGHT, TRIMMED FOR THE TABLE.' : `REPLAY: ${r.patient.name}`, { color: 'sand' }); ctext(hud, 94, `${this.round + 1} / ${this.rounds.length}`, { color: 'slate' });
    for (let i = 0; i < 4; i++) {
      const x = 14 + i * Math.floor((w - 28) / 4), cw = Math.floor((w - 28) / 4) - 8, s = this.seats[i], y = 116; hud.rect(x, y, cw, 98, s ? SEAT_PAL[i] : 'slate'); hud.rect(x + 2, y + 2, cw - 4, 94, 'ink');
      hud.text(x + 8, y + 8, `SEAT ${i + 1}`, { color: s ? SEAT_PAL[i] : 'slate', scale: 2 });
      if (s) { hud.text(x + 8, y + 30, s.label, { color: 'white' }); const doc = i % 2 === 0 ? ['DR. MARSH', 'THE QUIET (HOLD)'] : ['DR. ACHTERBERG', 'THE SECOND LOOK (PRESS)']; hud.text(x + 8, y + 44, doc[0], { color: 'mist' }); wrap(hud, doc[1], cw - 14).forEach((l, k) => hud.text(x + 8, y + 56 + k * 10, l, { color: 'sky' })); hud.text(x + 8, y + 84, 'SCRUBBED IN', { color: 'lime' }); }
      else { wrap(hud, 'PRESS TO SCRUB IN', cw - 14).forEach((l, k) => hud.text(x + 8, y + 36 + k * 10, l, { color: 'mist' })); }
    }
    prompts(hud, app, [{ act: 'confirm', label: 'SCRUB IN' }, { act: 'extra', label: 'START (SEAT 1)' }, { act: 'back', label: 'LEAVE / BACK' }], 'center', h - 14);
    if (!this.seats.length) ctext(hud, 222, 'SEAT 1 STARTS ONCE EVERYONE HAS SCRUBBED IN', { color: 'slate' });
  }
  cycle(d) { this.round = (this.round + d + this.rounds.length) % this.rounds.length; this.ctx.audio.play('uiMove'); }
  start(ctx) {
    if (!this.seats.length) return; const r = this.rounds[this.round]; ctx.audio.play('uiOk');
    const seatsDef = this.seats.map((s, i) => ({ id: i, doctor: i % 2 === 0 ? 'ilya' : 'sabine' })), srcs = this.seats.map((s) => ({ kind: s.kind, i: s.i }));
    go.operation(ctx, { opId: r.id, difficulty: 'resident', seatsDef, srcs, humans: this.seats.length, consult: true, noDive: false, quietOn: true, cheats: null, startStage: 0 });
  }
  dispose() {}
}
