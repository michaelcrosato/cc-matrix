// Feedback: impacts, tracers, flashes, marks. Pure presentation, driven by the sim's events; safe with no views.
import { THREE, Decals, Trail, glowMaterial, PALETTE, buildModel, setLookLayer } from '../../pixel-engine.js';
import { MODELS } from '../art/models.js';
import { clamp } from '../core/rng.js';
const { Vector3, Mesh, BoxGeometry, Group } = THREE;
const _n = new Vector3();
export class Fx {
  tracers = []; markerT = 0; markerHead = false; pool = [];
  constructor(game) { this.game = game; }
  build(ctx) {
    const p = ctx.particles;
    p.register('blood', { count: [6, 12], life: [0.25, 0.6], speed: [1.5, 4], spread: 50, gravity: 12, size: [1, 1], colors: ['red', 'red', 'plum'], max: 300 });
    p.register('dirt-hit', { count: [4, 8], life: [0.2, 0.5], speed: [1.5, 3.5], spread: 40, gravity: 10, size: [1, 1], colors: ['sand', 'orange', 'plum'], max: 200 });
    p.register('spark', { count: [4, 8], life: [0.1, 0.3], speed: [3, 7], spread: 60, gravity: 10, size: [1, 1], colors: ['white', 'sand', 'orange'], max: 300 });
    p.register('blast', { count: [24, 36], life: [0.4, 0.9], speed: [5, 14], spread: 180, gravity: 4, drag: 2, size: [3, 1], colors: ['white', 'sand', 'orange', 'red', 'night'], max: 300 });
    p.register('gun-smoke', { count: [1, 2], life: [0.4, 0.8], speed: [0.3, 0.8], direction: [0, 1, 0], spread: 30, gravity: -0.4, size: [1, 2], colors: ['mist', 'slate'], max: 80 });
    p.register('flame-jet', { count: [2, 3], life: [0.12, 0.3], speed: [10, 16], spread: 7, gravity: -2, size: [3, 1], colors: ['white', 'sand', 'orange', 'red'], max: 300 });
    p.register('vehicle-smoke', { count: [1, 2], life: [0.8, 1.6], speed: [1, 2], direction: [0, 1, 0], spread: 16, gravity: -1, size: [2, 5], colors: ['night', 'slate', 'mist'], max: 200 });
    p.register('vehicle-flame', { count: [1, 3], life: [0.2, 0.5], speed: [1.5, 3], direction: [0, 1, 0], spread: 20, gravity: -3, size: [2, 1], colors: ['white', 'sand', 'orange', 'red'], max: 200 });
    p.register('dust-wind', { count: [2, 3], life: [1, 2.2], speed: [3, 7], direction: [1, 0.05, 0], spread: 10, size: [1, 2], colors: ['sand', 'orange'], radius: 22, max: 300 });
    p.register('wrench-spark', { count: [3, 5], life: [0.1, 0.25], speed: [2, 4], spread: 70, gravity: 10, size: [1, 1], colors: ['white', 'sand'], max: 80 });
    if (this.game.views) this.decals = new Decals(ctx.scene, { capacity: 96 });
    this.tracerMat = glowMaterial(PALETTE.sand);
  }
  impact(x, y, z, normal, kind, opts = {}) {
    const g = this.game;
    const name = kind === 'flesh' ? 'blood' : kind === 'metal' ? 'spark' : 'dirt-hit';
    if (!opts.silent) {
      g.ctx.particles.burst(name, [x, y, z], { direction: [normal?.x ?? 0, normal?.y ?? 1, normal?.z ?? 0] });
      const d = Math.hypot(x - g.camPos.x, z - g.camPos.z);
      if (kind === 'flesh') g.sfx.at('hit-flesh', x, z, { max: 40, volume: 0.6 });
      else if (kind === 'metal') g.sfx.at('hit-metal', x, z, { max: 50, volume: 0.6 });
      else if (d < 30 && g.rng.fx.chance(0.2)) g.sfx.at('ricochet', x, z, { max: 40, volume: 0.45 });
    }
    if (kind === 'flesh') g.ctx.engine.hitstop(0.02);
    if (kind === 'dirt' && this.decals && normal) this.decals.add('crack', { x, y, z }, normal, { size: 0.25 });
  }
  tracerFromView(x, y, z) {
    const eye = this.game.player.eye;
    this.tracer(eye.x, eye.y - 0.12, eye.z, x, y, z);
  }
  tracer(ax, ay, az, bx, by, bz) {
    if (!this.game.views) return;
    const l = Math.hypot(bx - ax, by - ay, bz - az);
    const m = this.pool.pop() ?? new Mesh(new BoxGeometry(0.035, 0.035, 1), this.tracerMat);
    m.scale.z = Math.min(l, 8);
    m.position.set(ax, ay, az);
    m.lookAt(bx, by, bz);
    this.game.ctx.scene.add(m);
    this.tracers.push({ m, ax, ay, az, dx: (bx - ax) / l, dy: (by - ay) / l, dz: (bz - az) / l, l, t: 0, speed: 240 });
  }
  hitMarker(head) { this.markerT = 0.16; this.markerHead = head; this.game.sfx.play('hit-marker', { volume: 0.3 }); this.game.rumble(0.25, 0.04); }
  muzzleFlash(def) {
    const g = this.game;
    if (!g.views) return;
    const e = g.player.eye;
    g.ctx.lights.request({ position: [e.x, e.y, e.z], color: 0xffd090, intensity: 18, radius: 14, lifetime: 0.06, fadeIn: 0, fadeOut: 0.05 });
    g.hud.muzzle = 0.05;
  }
  gunSmoke() { const g = this.game, e = g.player.eye, f = g.player.forward(_n); g.ctx.particles.burst('gun-smoke', [e.x + f.x * 0.7, e.y - 0.1 + f.y * 0.7, e.z + f.z * 0.7]); }
  flamerStream(eye, fwd) {
    const g = this.game;
    g.ctx.particles.burst('flame-jet', [eye.x + fwd.x * 0.9, eye.y + fwd.y * 0.9 - 0.14, eye.z + fwd.z * 0.9], { direction: [fwd.x, fwd.y + 0.02, fwd.z] });
    if (g.views && !this.flameLight?.alive) this.flameLight = g.ctx.lights.request({ position: [eye.x, eye.y, eye.z], color: 0xff7a30, intensity: 18, radius: 22, lifetime: 0.25, flicker: 'torch' });
    else if (this.flameLight) { this.flameLight.lifetime = 0.25; this.flameLight.position.set(eye.x + fwd.x * 4, eye.y, eye.z + fwd.z * 4); }
  }
  explosion(x, y, z, r) {
    const g = this.game, ctx = g.ctx;
    ctx.particles.burst('blast', [x, y, z], { count: Math.round(clamp(r * 6, 18, 60)) });
    ctx.particles.burst('fire-smoke', [x, y, z], { count: Math.round(clamp(r * 3, 8, 28)) });
    if (g.views) {
      ctx.lights.request({ position: [x, y + 2, z], color: 0xffa040, intensity: clamp(r * 8, 20, 60), radius: r * 5, lifetime: 0.35, fadeIn: 0 });
      ctx.engine.screen.shockwave([x, y, z], { radius: clamp(r * 0.03, 0.15, 0.5) });
      if (!g.settings.reduceFlashes && Math.hypot(x - g.camPos.x, z - g.camPos.z) < r * 6) ctx.engine.screen.flash('white', { duration: 0.08 });
    }
    g.sfx.at(r > 8 ? 'explosion-big' : 'explosion', x, z, { max: r > 8 ? 500 : 300, volume: 1 });
    g.rumble(0.8, 0.25);
  }
  scorch(x, y, z, r) { if (this.decals) this.decals.add('scorch', { x, y: y + 0.05, z }, { x: 0, y: 1, z: 0 }, { size: r }); }
  chargeProp(x, y, z) {
    const g = this.game;
    if (!g.views) return null;
    const m = new Mesh(new BoxGeometry(0.34, 0.14, 0.24), glowMaterial(PALETTE.plum));
    m.position.set(x, y + 0.07, z);
    g.ctx.scene.add(m);
    return m;
  }
  removeProp(o) { if (o) this.game.ctx.scene.remove(o); }
  update(ctx, dt) {
    this.markerT = Math.max(0, this.markerT - dt);
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.t += dt * t.speed;
      if (t.t >= t.l) { ctx.scene.remove(t.m); this.pool.push(t.m); this.tracers.splice(i, 1); continue; }
      t.m.position.set(t.ax + t.dx * t.t, t.ay + t.dy * t.t, t.az + t.dz * t.t);
    }
    this.decals?.update(dt);
  }
}
