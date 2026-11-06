// What you see and hear of the fire grid: flame sprites, smoke columns, embers, light and the roar.
import { THREE, SpriteBatch, spriteSheet, spatialize } from '../../pixel-engine.js';
import { grassFlame } from '../art/textures.js';
import { FCELL, FN } from './fire.js';
import { clamp, hash2 } from '../core/rng.js';
const CAP = 1800;
const NEAR = 220;
export class FireView {
  sprites = new Map(); free = []; flip = 0; nextSmoke = 0; lights = []; hidden = [0, -4000, 0];
  constructor(game) { this.game = game; this.loop = null; }
  build(ctx) {
    const g = this.game;
    if (g.views) {
      this.batch = new SpriteBatch(spriteSheet(grassFlame), { capacity: CAP });
      this.batch.frustumCulled = false;
      for (let i = 0; i < CAP; i++) { this.batch.spawn(this.hidden, { size: 1.6, frame: 0 }); this.free.push(CAP - 1 - i); }
      ctx.scene.add(this.batch);
    }
    ctx.particles.register('fire-smoke', { count: [2, 4], life: [2.6, 4.6], speed: [2, 4], direction: [0, 1, 0], spread: 18, gravity: -0.8, drag: 0.08, size: [4, 9], colors: ['ink', 'night', 'night', 'slate', 'slate'], radius: 6, max: 900 });
    ctx.particles.register('ember', { count: [3, 6], life: [0.8, 1.8], speed: [1.5, 4.5], direction: [0, 1, 0], spread: 40, gravity: -1.4, drag: 0.4, size: [1, 1], colors: ['sand', 'orange', 'red'], radius: 5, max: 400 });
    ctx.particles.register('ash', { count: [2, 4], life: [1.6, 3], speed: [0.5, 1.4], direction: [0, 0.3, 0], spread: 70, gravity: 0.4, drag: 0.2, size: [1, 1], colors: ['mist', 'slate', 'night'], radius: 8, max: 300 });
  }
  reset() {
    for (const list of this.sprites.values()) for (const s of list) { this.batch?.put(s, 0, -4000, 0, 0, false); this.free.push(s); }
    this.sprites.clear();
    if (this.people) { for (const list of this.people.values()) for (const i of list) { this.batch?.put(i, 0, -4000, 0, 0, false); this.free.push(i); } this.people.clear(); }
    for (const l of this.lights) l?.handle?.release();
    this.lights.length = 0;
    this.nearestDist = Infinity;
  }
  onIgnite(id) {
    if (!this.batch) return;
    const { fire, world } = this.game;
    const x = fire.wx(id), z = fire.wz(id);
    const cam = this.game.camPos;
    if (Math.hypot(x - cam.x, z - cam.z) > NEAR) return;
    this.placeCell(id, x, z, world);
  }
  placeCell(id, x, z, world) {
    if (this.sprites.has(id) || this.free.length < 3) return;
    const list = [];
    for (let k = 0; k < 3; k++) {
      const s = this.free.pop();
      const ox = (hash2(id, k * 7 + 1) - 0.5) * FCELL, oz = (hash2(id, k * 7 + 3) - 0.5) * FCELL;
      const sx = x + ox, sz = z + oz, size = 1.6 + hash2(id, k * 7 + 5) * 1.6;
      this.batch.set(s, { at: [sx, world.heightAt(sx, sz) + size * 0.46, sz], size, frame: k % 4 });
      list.push(s);
    }
    this.sprites.set(id, list);
  }
  onDone(id) {
    const list = this.sprites.get(id);
    if (!list) return;
    for (const s of list) { this.batch.put(s, 0, -4000, 0, 0, false); this.free.push(s); }
    this.sprites.delete(id);
  }
  /** Someone is on fire: flames that run with them. */
  stepPeople(ctx, dt, time) {
    if (!this.batch) return;
    this.people = this.people ?? new Map();
    const g = this.game;
    const burning = [];
    for (const so of g.actors.soldiers) if (so.active && !so.dead && so.burning > 0) burning.push(so);
    for (const b of g.actors.buddies) if (b.active && !b.dead && b.isDown && b.burningDown) burning.push(b);
    for (const [who, list] of this.people) if (!burning.includes(who)) { for (const i of list) { this.batch.put(i, 0, -4000, 0, 0, false); this.free.push(i); } this.people.delete(who); }
    const tf = (time * 12) | 0;
    for (const who of burning) {
      if (!this.people.has(who)) { if (this.free.length < 3) continue; this.people.set(who, [this.free.pop(), this.free.pop(), this.free.pop()]); }
      const list = this.people.get(who);
      const y = who.y ?? 0;
      this.batch.set(list[0], { at: [who.x, y + 0.9, who.z], size: 1.7, frame: tf & 3 });
      this.batch.set(list[1], { at: [who.x + 0.2, y + 1.5, who.z - 0.1], size: 1.2, frame: (tf + 1) & 3 });
      this.batch.set(list[2], { at: [who.x - 0.2, y + 0.5, who.z + 0.1], size: 1.1, frame: (tf + 2) & 3 });
    }
  }
  /** Burning cells that came into range while the player moved; once in a while, never a grid scan. */
  sweep() {
    if (!this.batch) return;
    const { fire, world } = this.game, cam = this.game.camPos;
    for (const id of fire.burning) {
      if (this.sprites.has(id)) continue;
      const x = fire.wx(id), z = fire.wz(id);
      if (Math.hypot(x - cam.x, z - cam.z) <= NEAR) this.placeCell(id, x, z, world);
    }
  }
  update(ctx, dt, time) {
    const g = this.game, { fire } = g;
    this.stepPeople(ctx, dt, time);
    if (this.batch && (this.flip += dt) >= 0.1) {
      this.flip = 0;
      const tf = (time * 10) | 0;
      for (const [id, list] of this.sprites) {
        if (fire.state[id] !== 1) { this.onDone(id); continue; }
        for (let k = 0; k < list.length; k++) this.batch.set(list[k], { frame: (tf + id + k) & 3 });
      }
      if (((tf) % 8) === 0) this.sweep();
    }
    // Clusters: 16 x 16 cell tiles. Take the nearest few for smoke, light and sound.
    const cam = g.camPos;
    const near = [];
    for (const [tile, n] of fire.clusters) {
      const x = (tile % 16) * 16 * FCELL - 640 + 8 * FCELL, z = ((tile / 16) | 0) * 16 * FCELL - 640 + 8 * FCELL;
      near.push({ tile, n, x, z, d: Math.hypot(x - cam.x, z - cam.z) });
    }
    near.sort((a, b) => a.d - b.d);
    this.nearestDist = near.length ? near[0].d : Infinity;
    if (g.fireSmokeOn !== false && (this.nextSmoke -= dt) <= 0) {
      this.nextSmoke = 0.16;
      for (const c of near.slice(0, 8)) {
        const y = g.world.heightAt(c.x, c.z);
        ctx.particles.burst('fire-smoke', [c.x, y + 1.5, c.z], { direction: [g.wind.vx * 0.12, 1, g.wind.vz * 0.12], count: Math.min(5, 1 + (c.n >> 3)) });
        if (c.d < 180) ctx.particles.burst('ember', [c.x, y + 1, c.z], { direction: [g.wind.vx * 0.25, 1, g.wind.vz * 0.25] });
      }
      if (near.length && near[0].d < 120) ctx.particles.burst('ash', [cam.x + g.wind.x * -8, cam.y + 2, cam.z + g.wind.z * -8], { direction: [g.wind.vx * 0.3, 0.1, g.wind.vz * 0.3] });
    }
    // A column of smoke visible across the map for a game day: what you did at the depot.
    const st = g.story;
    if (st?.smokeUntil > g.clock.abs && st.smokeAt && (this.columnT = (this.columnT ?? 0) - dt) <= 0) {
      this.columnT = 0.25;
      const [sx, sz] = st.smokeAt;
      ctx.particles.burst('fire-smoke', [sx, g.world.heightAt(sx, sz) + 6, sz], { count: 5, direction: [g.wind.vx * 0.1, 1, g.wind.vz * 0.1], speed: 2 });
    }
    // Up to 3 lights, by size.
    const want = near.slice(0, 3);
    for (let i = 0; i < 3; i++) {
      const c = want[i];
      let l = this.lights[i];
      if (c) {
        const y = g.world.heightAt(c.x, c.z) + 5;
        const intensity = clamp(6 + c.n * 0.8, 6, 40), radius = clamp(18 + c.n * 0.6, 18, 60);
        if (!l || !l.handle?.alive) { l = { handle: ctx.lights.request({ position: [c.x, y, c.z], color: 0xff7a30, intensity, radius, flicker: 'torch', name: 'fire' }) }; this.lights[i] = l; }
        l.handle.position.set(c.x, y, c.z); l.handle.intensity = intensity; l.handle.radius = radius;
      } else if (l) { l.handle?.release(); this.lights[i] = null; }
    }
    // One spatial roar for the nearest cluster.
    if (near.length) {
      if (!this.loop || this.loop.stopped) this.loop = ctx.audio.loop('fire-loop', { volume: 0 });
      const c = near[0];
      const s = spatialize(g.listener(), [c.x, cam.y, c.z], { max: 150 });
      if ((this.muffleT = (this.muffleT ?? 0) - dt) <= 0) { this.muffleT = 0.5; this.muffled = g.sfx.blocked(c.x, c.z); }
      this.loop.set({ volume: clamp(s.gain * clamp(c.n / 20, 0.25, 1), 0, 1), pan: s.pan, muffle: this.muffled ? 0.8 : 0 });
    } else if (this.loop) { this.loop.set({ volume: 0 }); }
  }
}
