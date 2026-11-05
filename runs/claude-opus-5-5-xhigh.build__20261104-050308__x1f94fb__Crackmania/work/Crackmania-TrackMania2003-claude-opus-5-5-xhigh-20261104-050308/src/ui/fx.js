// CRACKMANIA effects (PLAN §7.5): dust by surface, tyre smoke, skid marks, sparks on walls, the landing ring, the boost,
// checkpoint flashes, the respawn's glints, confetti and fireworks at the finish; HUD notes. Particles are the engine's
// (drawn in 3D by the world), the rest the pen. Cosmetic: its own random stream, never the game's
import { ctx, E, U } from '../ctx.js';
import { add, mul, sub, cross, norm } from '../lib/v3.js';
import { LIFT } from '../track/geometry.js';
import { ENVS } from '../env/envs.js';
const R = E.rng(0xC0FFEE);
const DUST = { road: '#a8a8b0', boost: '#ffd060', dirt: '#9a7448', sand: '#e0b878', grass: '#7aa850', snow: '#f4f8ff', ice: '#d8f0ff', wall: '#c8c8d0' };
const skids = [], MAXSKID = 240, booms = [];
let reduce = false;
const P3 = (p, k = U) => [p[0] * k, p[1] * k, p[2] * k];
export const fx = {
  reset() { skids.length = 0; booms.length = 0; },
  note(P, text, color = '#ffffff', t = 1.6, o = {}) { (P.notes || (P.notes = [])).push(Object.assign({ text, color, t }, o)); if (P.notes.length > 3) P.notes.shift(); },
  text(P, text, color, t) { fx.note(P, text, color, t); },
  update(dt) {
    const sess = ctx.session; if (!sess) return; reduce = !!ctx.game.reduceMotion;
    for (const P of sess.players) { if (P.notes) { for (const n of P.notes) n.t -= dt; P.notes = P.notes.filter(n => n.t > 0); } if (P.split) P.split.t -= dt; }
    for (const s of skids) s.t -= dt; while (skids.length && skids[0].t <= 0) skids.shift();
    for (const b of booms) { b.t -= dt; if (b.t <= 0 && !b.done) { b.done = true; const c = b.colors[Math.floor(R() * b.colors.length)]; ctx.game.particles.bits(b.x * U, b.y * U, b.z * U, 24, b.colors); ctx.game.particles.glints(b.x * U, b.y * U, b.z * U, 10, c); ctx.sound && ctx.sound.sfx('pop'); } }
    for (let i = booms.length - 1; i >= 0; i--) if (booms[i].done) booms.splice(i, 1);
  },
  carStep(P, dt) {
    const car = P.run.car, Pt = ctx.game.particles; if (!Pt || P.hidden) return;
    const n = car.steps;
    // rear wheels: dust by surface, smoke and skids when sliding
    if (car.grounded && car.kmh > 25) {
      const slide = car.slideAmt || 0, surf = car.surface, loose = surf === 'dirt' || surf === 'sand' || surf === 'snow' || surf === 'grass';
      const rear = add(car.p, car.f, -CFGwb(P) / 2), every = loose ? 3 : slide > 3 ? 4 : 0;
      if (every && n % every === 0) for (const sd of [-1, 1]) {
        const q = add(add(rear, car.r, sd * .8), car.u, -.4);
        Pt.dust(q[0] * U, q[1] * U, q[2] * U, 1, { color: DUST[surf] || '#c8c8d0' });
      }
      if ((slide > 4 || car.drift || (car.brakeOn && car.kmh > 60)) && n % 3 === 0 && !loose) for (const sd of [-1, 1]) { const q = add(add(rear, car.r, sd * .8), car.u, -.5); skids.push({ p: q, f: car.f.slice(), r: car.r.slice(), u: car.u.slice(), t: 8 }); if (skids.length > MAXSKID) skids.shift(); if (n % 6 === 0) Pt.smoke(q[0] * U, q[1] * U, q[2] * U, 1, { color: '#d8d8e0', size: .6 }); }
    }
    if (car.boostT > 0 && n % 3 === 0) { const q = add(add(car.p, car.f, -2.3), car.u, -.2); Pt.add({ kind: 'fire', x: q[0] * U, y: q[1] * U, z: q[2] * U, vx: -car.f[0] * 30, vy: -car.f[1] * 30, vz: 4, life: .25, size: 1.4 }); }
    if (car.scrape > .5 && n % 2 === 0) { const q = add(car.p, car.u, .3); Pt.sparks(q[0] * U, q[1] * U, q[2] * U, 2, Math.atan2(-car.v[1], -car.v[0])); }
  },
  cp(P, ev) {
    P.split = { steps: ev.steps, delta: ev.delta, t: 2.2 };
    const g = ev.g, Pt = ctx.game.particles; if (Pt) { for (const sd of [-1, 1]) { const q = add(add(g.p, g.r, sd * g.hw), g.u, 6); Pt.glints(q[0] * U, q[1] * U, q[2] * U, 12, '#bff8ff'); } }
  },
  finish(P, ev) {
    const sess = ctx.session, car = P.run.car, e = ENVS[sess.env], Pt = ctx.game.particles;
    fx.note(P, 'FINISH!', '#ffd060', 2.5);
    if (ev.delta !== null && ev.delta < 0) fx.note(P, 'NEW RECORD!', '#5ab4ff', 3);
    if (Pt) { const q = add(car.p, car.u, 3); Pt.bits(q[0] * U, q[1] * U, q[2] * U, 60, [e.accent, e.accent2, '#ffffff', '#ff4a8a', '#4ad0ff']); }
    for (let i = 0; i < 6; i++) booms.push({ x: car.p[0] + (R() - .5) * 60, y: car.p[1] + (R() - .5) * 60, z: car.p[2] + 20 + R() * 15, t: .3 + i * .35, colors: [e.accent, e.accent2, '#ffffff', ['#ff4a8a', '#4ad0ff', '#7aff6a'][i % 3]] });
  },
  boost(P) { if (!reduce && P.input) ctx.game.flash('#ffd060', .05, .15); },
  land(P, ev) { if (ev.impact < 5) return; const car = P.run.car, Pt = ctx.game.particles; if (!Pt) return; const q = add(car.p, car.u, -.4); Pt.ring(q[0] * U, q[1] * U, Math.max(4, ev.impact * .6) * U * .1, Math.max(8, ev.impact) * U * .4, DUST[car.surface] || '#d8d0c0', .5); Pt.dust(q[0] * U, q[1] * U, q[2] * U, Math.min(16, ev.impact | 0), { color: DUST[car.surface] || '#d8d0c0' }); if (ev.impact > 12 && !reduce) ctx.game.shake(Math.min(4, ev.impact / 6)); },
  wall(P, ev) { const Pt = ctx.game.particles; if (!Pt || !ev.at) return; Pt.sparks(ev.at[0] * U, ev.at[1] * U, ev.at[2] * U, Math.min(20, 3 + ev.impact | 0)); },
  splash(P) { const car = P.run.car, Pt = ctx.game.particles; if (Pt) { Pt.dust(car.p[0] * U, car.p[1] * U, -1.6 * U, 20, { color: '#bfe4ff' }); Pt.ring(car.p[0] * U, car.p[1] * U, 10, 80, '#bfe4ff', .6); } },
  respawn(car) { const Pt = ctx.game.particles; if (Pt) Pt.glints(car.p[0] * U, car.p[1] * U, (car.p[2] + 1) * U, 16, '#fff6c0'); },
  /** skid marks: dark thin slabs on the road, fading */
  draw3d(pen, w, alpha) {
    for (const s of skids) { if (s.t < 1 && Math.floor(s.t * 10) % 2) continue; const q = add(s.p, s.u, .03); pen.frame(q[0] * U, q[1] * U, q[2] * U, s.f, s.r, s.u, U).box(0, 0, 0, .7, .26, .01, s.t > 4 ? '#1e1e22' : '#2e2e34'); }
    pen.at();
  }
};
import { CFG } from '../config.js';
const CFGwb = P => CFG.cars[P.model].wheelbase;
