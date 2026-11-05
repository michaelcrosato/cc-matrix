// Attract mode: after 10 s without input on the title or a menu, a looping demo of everything (the bots cheat freely);
// any input ends it. RACE (The Big Crack) -> BUILD (a time-lapse) -> PUZZLE -> SURVIVAL -> SPLIT SCREEN -> GARAGE.
import { Demo } from './demo.js';
import { Track, compileTurtle } from './track.js';
import { TRACKS, PUZZLES, RIVALS } from './data.js';
import { orbit, ChaseCam } from './cam.js';
import { U } from './v3.js';
import { big, text, tw, medalIcon, COL } from './ui.js';
import { defaultPaint, drawCar } from './view.js';
import { CARS } from './config.js';
import { SWATCHES } from './data.js';
import { BLOCKS } from './blocks.js';
import { fmt } from './run.js';

const E = globalThis.My3D2dge, px = E.px;
const SEG = [['RACE', 'THE BIG CRACK', 24], ['BUILD', 'EVERY TRACK IS BLOCKS', 16], ['PUZZLE', 'FINISH THE ROAD', 14], ['SURVIVAL', 'THE GHOST GUILD', 18], ['SPLIT SCREEN', 'UP TO FOUR AT ONCE', 14], ['GARAGE', 'PAINT YOUR CAR', 10]];
export class Attract {
  constructor(app) { this.app = app; this.on = false; this.seg = 0; this.t = 0; this.cur = null; this.lastPtr = null; }
  get game() { return this.app.game; }
  start() { this.on = true; this.seg = 0; this.t = 0; this.begin(); this.app.music('title'); this.game.input.consumeAll && this.game.input.consumeAll(); this.lastPtr = this.game.input.pointer(); }
  stop() { this.on = false; this.end(); this.cur = null; this.game.input.consumeAll && this.game.input.consumeAll(); }
  anyInput() {
    const I = this.game.input; if (I.anyPressed() || Math.hypot(...I.move()) > .4 || I.clicked()) return true;
    const p = I.pointer(); if (p && this.lastPtr && (Math.abs(p[0] - this.lastPtr[0]) + Math.abs(p[1] - this.lastPtr[1]) > 4)) return true; if (p && !this.lastPtr) this.lastPtr = p; return false;
  }
  end() { if (this.cur && this.cur.split && !this.game.headless) this.game.splitScreen(1); }
  begin() {
    const app = this.app, name = SEG[this.seg][0];
    this.end(); this.t = 0;
    if (name === 'RACE') this.cur = { demo: new Demo(app, 'D5', { cheat: true, skill: 1, camSwitch: 5 }) };
    else if (name === 'BUILD' || name === 'PUZZLE') {
      const full = name === 'BUILD' ? app.track('R1') : app.track('PS1');
      const fixed = name === 'PUZZLE' ? full.blocks.filter(b => /^(ST|CP|FN)$/.test(b.type)) : [];
      const t = new Track({ env: full.env, name: full.name }); for (const b of fixed) t.place(b.type, b.cx, b.cy, b.L, b.rot, true);
      const rest = full.blocks.filter(b => !fixed.includes(b));
      this.cur = { build: true, full, t, rest, k: 0, next: .3, P: app.prepare(t), puzzle: name === 'PUZZLE', cam: new ChaseCam() };
    } else if (name === 'SURVIVAL') {
      const runs = app.modes.rivalRuns('R2', 2, 'hedgerow');
      this.cur = { demo: new Demo(app, 'R2', { cheat: true, skill: 1, camSwitch: 6, ghosts: runs.map(r => ({ ghost: r.ghost, carId: 'pebble', paint: Object.assign(defaultPaint('pebble'), { body: r.color }), color: r.color })) }), runs };
    } else if (name === 'SPLIT SCREEN') {
      this.cur = { demo: new Demo(app, 'S2', { cars: 2, cheat: true, skill: 1, carIds: ['moose', 'moose'], paints: [Object.assign(defaultPaint('moose'), { body: '#e8443a' }), Object.assign(defaultPaint('moose'), { body: '#3b82f6' })] }), split: true, cams: [new ChaseCam(), new ChaseCam()] };
      if (!this.game.headless) { const w = app.views.frostpeak.world; while (w.cameras.length < 2) w.addCamera({ mode: 'fixed', far: 26000, mouseLook: false }); this.game.splitScreen(2, { layout: 'rows' }); }
    } else this.cur = { garage: true, P: app.prepare(app.track('D3'), 'D3'), cam: new ChaseCam(), ang: 0 };
  }
  step(dt) {
    this.t += dt; const S = SEG[this.seg], C = this.cur;
    if (this.t > S[2]) { this.seg = (this.seg + 1) % SEG.length; this.begin(); return; }
    if (C.demo) {
      C.demo.step(dt);
      if (C.split) { const w = this.app.views.frostpeak && this.app.views.frostpeak.world; C.demo.cars.forEach((car, i) => { C.cams[i].follow(car.run.car, dt, C.demo.P.course.phys); if (w && w.cameras[i]) { w.cameras[i].set('fixed'); w.cameras[i].fixed = C.cams[i].pose(); } }); }
    }
    if (C.build) {
      C.next -= dt;
      if (C.next <= 0 && C.k < C.rest.length) { const b = C.rest[C.k++]; C.t.place(b.type, b.cx, b.cy, b.L, b.rot, true); C.P = this.app.prepare(C.t); C.drop = 1; C.next = (S[2] - 4) / C.rest.length; this.game.audio.sfx('place', { vol: .5 }); }
      if (C.drop) C.drop = Math.max(0, C.drop - dt * 4);
      if (C.k >= C.rest.length && !C.demo && this.t > S[2] - 4) { C.demo = new Demo(this.app, C.t, { prepared: C.P, cheat: true, skill: 1 }); if (C.puzzle) { C.validated = true; this.game.audio.sfx('coin'); } }
      if (!C.demo) {
        const bb = C.full.bounds(), cx = 1536 + (bb.x0 + bb.x1 + 1) * 16, cy = 1536 + (bb.y0 + bb.y1 + 1) * 16, span = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) * 32 + 80;
        orbit(C.cam, [cx, cy, 0], this.t * .25, span * .7, span * .55, 50);
        const v = this.app.views[C.t.env]; if (v) { v.world.camera.set('fixed'); v.world.camera.fixed = C.cam.pose(); v.world.camera.target = { x: cx * U, y: cy * U, z: 0 }; v.world.step(dt); }
      }
    }
    if (C.garage) {   // the three cars spin through paint jobs on a turntable at the start line
      C.ang += dt * .8; const sp = C.P.course.spawn, ctr = [sp.p[0] + sp.t[0] * 30, sp.p[1] + sp.t[1] * 30, sp.p[2]];
      C.ctr = ctr; orbit(C.cam, ctr, this.t * .25 + 2, 11, 3, 45);
      const v = this.app.views[C.P.track.env]; if (v) { v.world.camera.set('fixed'); v.world.camera.fixed = C.cam.pose(); v.world.camera.target = { x: ctr[0] * U, y: ctr[1] * U, z: 0 }; v.world.step(dt); }
    }
  }
  draw(r) {
    const C = this.cur, S = SEG[this.seg], game = this.game;
    if (!C) return;
    if (C.demo) C.demo.draw(r, { ghostCars: C.split });
    else if (C.build) { const v = this.app.show(C.P); if (v) { v.drawTrack(game.real || 0, { startGate: C.P.course.startGate }); v.world.draw(r); } }
    else if (C.garage) {
      const v = this.app.show(C.P); if (v) {
        const t = this.t, id = ['coyote', 'pebble', 'moose'][Math.floor(t / 3.4) % 3], k = Math.floor(t * 1.5), Cc = CARS[id], a = C.ang, ctr = C.ctr || [0, 0, 0];
        const p = Object.assign(defaultPaint(id), { body: SWATCHES[k % 24], accent: SWATCHES[(k * 7 + 3) % 24], pattern: k % 8, pcol: SWATCHES[(k * 5 + 10) % 24], number: (k * 13) % 100 });
        v.drawTrack(game.real || 0, { startGate: C.P.course.startGate, cheer: 1 });
        v.world.pen.at(ctr[0] * U, ctr[1] * U, ctr[2] * U, 0, U).tube(0, 0, 0, 0, 0, .15, 3.2, '#5a5a62').tube(0, 0, .15, 0, 0, .2, 3, '#ffd23a');
        drawCar(v.world.pen, id, { p: [ctr[0], ctr[1], ctr[2] + Cc.ride + .2], f: [Math.cos(a), Math.sin(a), 0], r: [-Math.sin(a), Math.cos(a), 0], u: [0, 0, 1], wd: [Cc.ride, Cc.ride, Cc.ride, Cc.ride], lights: true, time: t }, p);
        v.world.draw(r);
      }
    }
    if (r.viewport && r.viewport.i > 0) return;
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (this.t < 2.5) { const k = Math.min(1, this.t * 3) * Math.min(1, (2.5 - this.t) * 3); px.blend(g, .6 * k, 'normal', () => px.rect(g, 0, H * .3, W, 56, '#05060c')); big(g, S[0], W / 2, H * .3 + 6, '#ffd23a', 3); text(g, S[1], W / 2 - tw(S[1]) / 2, H * .3 + 36, '#ffffff'); }
      if (C.build) E.font.text(g, 'BLOCKS ' + (C.t.blocks.length) + ' • COPPERS ' + C.t.cost(), 10, 30, '#ffd23a', { outline: '#10101a' });
      if (C.validated) { big(g, 'VALIDATED!', W / 2, H * .55, '#5ae07a', 3); medalIcon(g, W / 2 - 16, H * .55 + 30, 3, 2); }
      if (C.runs && this.t > SEG[this.seg][2] - 5) { const rows = C.runs.map(r2 => [r2.name, r2.steps, r2.color]).sort((a, b) => (a[1] || 1e9) - (b[1] || 1e9)); rows.forEach((rw, i) => text(g, (i + 1) + '. ' + rw[0] + '  ' + fmt(rw[1]), W / 2 - 110, 60 + i * 22, rw[2])); E.font.text(g, 'TEX: "GO HOME, ROOKIE. TAKE THE SCENIC ROUTE."', W / 2, 140, '#ffffff', { outline: '#10101a', align: 'center' }); }
      E.font.title(g, 'CRACKMANIA', 70, 8, { scale: 2, colors: ['#fff6d0', '#ffd060', '#ff8a2a', '#c8402a'], depth: 2, align: 'center' });
      if (Math.floor(this.t * 1.6) % 2 === 0) big(g, 'DEMO - PRESS ANY BUTTON', W / 2, H - 26, '#ffffff', 2);
    });
  }
}
