// FireSystem: the FireGrid made visible and dangerous: scars on the ground, flame sprites, smoke, lights, ignition of actors.
import { THREE, SpriteBatch, spriteSheet, PALETTE } from '../../pixel-engine.js';
import { FireGrid, FN, FCELL, ST, FUEL } from './fire.js';
import { CELLS, HALF } from './terrain.js';
import { grassFlame } from '../art/textures.js';
import { TUNING } from '../core/tuning.js';
import { SCARS } from '../content/roads.js';

const hash = (x, z) => { let h = (x * 374761393 + z * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export class FireSystem {
  name = 'fire';
  paintDirty = false; paintT = 0; flameT = 0; flameSlots = 0; lightHandles = []; clusters = new Map();
  setup(g) {
    this.g = g;
    const rng = g.ctx.random.fork('fire');
    this.grid = new FireGrid(rng);
    this.grid.heights = (x, z) => g.world.heightAt(x, z);
    this.grid.loadFuel(g.world.kind);
    this.grid.onChange = (i, s) => this.onCell(i, s);
    g.fire = this; this.rngView = g.ctx.random.fork('fireview');
    g.flameStream = (o, d, r, dmg, leak) => this.flameStream(o, d, r, dmg, leak);
    this.col = g.world.col; this.baseCol = g.world.baseCol;
    this.sheet = spriteSheet(grassFlame);
    this.flames = new SpriteBatch(this.sheet, { capacity: 1800 });
    this.flames.castShadow = false;
    g.ctx.scene.add(this.flames);
    this.flameIdx = []; this.cellSprites = new Map();
    g.ctx.particles.register('ember', { count: [3, 5], life: [0.6, 1.2], speed: [1, 2.5], gravity: -2, size: [1, 1], colors: ['sand', 'orange', 'red'] });
    g.ctx.particles.register('blood', { count: [4, 6], life: [0.3, 0.7], speed: [1, 3], gravity: 8, size: [1, 1], colors: ['red', 'red', 'plum'] });
    g.ctx.particles.register('ash', { count: [1, 2], life: [1.5, 3], speed: [0.5, 1.5], gravity: -0.3, size: [1, 1], colors: ['slate', 'night', 'mist'] });
    g.ctx.particles.register('fire-smoke', { count: [1, 2], life: [1.5, 3], speed: [0.6, 1.4], gravity: -1.2, size: [2, 3], colors: ['slate', 'night', 'plum'] });
  }
  // ---- API used by weapons, projectiles, missions ----
  ignite(x, z, r) { const n = this.grid.ignite(x, z, r); if (n) this.g.events.emit('ignite', x, z, n); return n; }
  stateAt(x, z) { return this.grid.stateAt(x, z); }
  burningAt(x, z) { return this.grid.stateAt(x, z) === ST.BURNING; }
  burnStrip(id, width = 14) { const pts = SCARS[id]; return pts ? this.grid.burnStrip(pts, width) : 0; }
  counts() { return this.grid.counts(); }
  igniteActorsNear(p, r) { for (const a of this.g.combat.actors) if (a.alive && Math.hypot(a.pos.x - p.x, a.pos.z - p.z) < r) a.ignite?.(); const f = this.g.player.feet; if (Math.hypot(f.x - p.x, f.z - p.z) < r * 0.6) this.g.setPlayerOnFire?.('fire'); }
  reset() { this.grid.reset(); this.repaintAll(); this.refreshFlames(true); }
  flameStream(o, d, range, dmg, leak) {
    const g = this.g;
    // light the ground along the stream and burn anything in the cone
    for (let t = 2; t <= range; t += 3) {
      const x = o.x + d.x * t, z = o.z + d.z * t, gy = g.world.heightAt(x, z);
      if (o.y + d.y * t < gy + 2.5) this.ignite(x, z, 1.5);
    }
    for (const a of g.combat.actors) {
      if (!a.alive || a.kind === 'civ') continue;
      const dx = a.pos.x - o.x, dz = a.pos.z - o.z, dist = Math.hypot(dx, dz);
      if (dist > range || dist < 0.1) continue;
      if ((dx * d.x + dz * d.z) / (dist * Math.hypot(d.x, d.z) + 1e-6) < 0.93) continue;
      g.damageActor(a, dmg, 'torso', { by: 'player', from: o, fire: true }); a.ignite?.();
    }
    g.ctx.particles.burst('ember', { x: o.x + d.x * 3, y: o.y + d.y * 3 - 0.2, z: o.z + d.z * 3 }, { count: 2 });
    g.vehicles?.igniteNear?.(o, range * 0.5);
  }
  // ---- painting ----
  onCell(i, s) {
    if (i < 0) return;
    this.paintCell(i, s);
    this.paintDirty = true;
    if (s === ST.BURNING) this.g.events.emit('cellburn', i);
    if (s === ST.BURNT) { const [x, z] = this.grid.cellCenter(i); this.g.world.burnTrees?.(x, z); }
  }
  paintCell(i, s) {
    const fx = i % FN, fz = (i / FN) | 0;
    const col = this.col, base = this.baseCol, pal = this.g.world.pal;
    const c = this.tmpC ||= new THREE.Color();
    for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) {
      const tx = fx * 2 + dx, tz = fz * 2 + dz, ti = tx + tz * CELLS, h = hash(tx, tz);
      if (s === ST.BURNT || s === ST.BURNING) {
        if (s === ST.BURNING) c.copy(pal.red).lerp(pal.orange, h * 0.5).multiplyScalar(0.7);
        else c.setHex(h < 0.25 ? PALETTE.ink : h < 0.7 ? PALETTE.night : PALETTE.slate).lerp(pal.plum, h * 0.2);
      } else if (s === ST.REGROWING) c.copy(pal.green).lerp(pal.lime, h * 0.6);
      else c.setRGB(base[ti * 3], base[ti * 3 + 1], base[ti * 3 + 2]);
      const b = 6 * ti;
      for (let q = 0; q < 6; q++) col.setXYZ(b + q, c.r, c.g, c.b);
    }
  }
  repaintAll() {
    for (let i = 0; i < FN * FN; i++) { const s = this.grid.state[i]; this.paintCell(i, s === ST.BURNING ? ST.FRESH : s); }
    this.col.needsUpdate = true; this.paintDirty = false;
  }
  // ---- sim ----
  fixed(g, dt) {
    const gr = this.grid;
    gr.wind.dir = g.world.wind.dir; gr.wind.speed = g.world.wind.speed; gr.rain = g.weather === 'storm';
    if (g.step % 15 === 0) {
      gr.step(0.25);
      gr.hourTick(g.gameHours());
      this.igniteActors();
      if (gr.burning.length) g.events.emit('firetick', gr.burning.length);
    }
  }
  igniteActors() {
    const g = this.g, gr = this.grid;
    if (!gr.burning.length) return;
    for (const a of g.combat.actors) { if (a.alive && !a.burning && gr.stateAt(a.pos.x, a.pos.z) === ST.BURNING) a.ignite?.(); }
    const f = g.player.feet;
    if (gr.stateAt(f.x, f.z) === ST.BURNING) g.setPlayerOnFire?.('fire');
    // burning actors light the grass they cross
    for (const a of g.combat.actors) if (a.alive && a.burning && gr.fuelAt(a.pos.x, a.pos.z)) gr.lightCell(...gr.cellOf(a.pos.x, a.pos.z));
  }
  // ---- view ----
  frame(g, dt) {
    if (this.paintDirty) { this.paintT -= dt; if (this.paintT <= 0) { this.col.needsUpdate = true; this.paintDirty = false; this.paintT = 0.25; } }
    this.flameT -= dt;
    if (this.flameT <= 0) { this.flameT = 0.1; this.refreshFlames(false); }
  }
  refreshFlames(force) {
    const g = this.g, gr = this.grid, cam = g.ctx.camera.camera.position;
    const rng = this.rngView;
    let n = 0; const fl = this.flames;
    const near = [];
    for (const i of gr.burning) {
      const [cx, cz] = gr.cellCenter(i), dx = cx - cam.x, dz = cz - cam.z, d2 = dx * dx + dz * dz;
      if (d2 > 220 * 220) continue;
      near.push([i, cx, cz, d2]);
      for (let k = 0; k < 3 && n < 1800; k++) {
        const ox = (hash(i, k) - 0.5) * FCELL * 0.9, oz = (hash(k, i) - 0.5) * FCELL * 0.9;
        const tall = gr.fuel[i] >= FUEL.TREE ? 2.8 : 1.6 + hash(i + k, 3) * 1.4;
        const y = g.world.heightAt(cx + ox, cz + oz);
        fl.set(n, { at: [cx + ox, y + tall * 0.5, cz + oz], frame: (Math.floor(g.ctx.time * 10) + k + i) & 3, flip: (i + k) % 2 === 0, size: tall });
        n++;
      }
    }
    // hide the rest
    for (let k = n; k < this.flameSlots; k++) fl.set(k, { at: [0, -999, 0], size: 0.01 });
    this.flameSlots = n;
    // smoke by cluster, lights over the nearest clusters
    const clusters = new Map();
    for (const [i, cx, cz] of near) { const key = ((cx + HALF) / 80 | 0) + ',' + ((cz + HALF) / 80 | 0); const c = clusters.get(key) || { x: 0, z: 0, n: 0 }; c.x += cx; c.z += cz; c.n++; clusters.set(key, c); }
    const list = [...clusters.values()].map((c) => ({ x: c.x / c.n, z: c.z / c.n, n: c.n })).sort((a, b) => ((a.x - cam.x) ** 2 + (a.z - cam.z) ** 2) - ((b.x - cam.x) ** 2 + (b.z - cam.z) ** 2));
    for (const c of list.slice(0, 6)) if (rng.chance(Math.min(1, c.n / 20))) g.ctx.particles.burst('fire-smoke', [c.x + rng.range(-12, 12), g.world.heightAt(c.x, c.z) + 3, c.z + rng.range(-12, 12)], { count: 1 });
    const want = list.slice(0, 3);
    while (this.lightHandles.length > want.length) this.lightHandles.pop().release();
    want.forEach((c, k) => {
      const y = g.world.heightAt(c.x, c.z) + 3;
      if (this.lightHandles[k]) { this.lightHandles[k].position.set(c.x, y, c.z); this.lightHandles[k].intensity = Math.min(40, 8 + c.n); }
      else this.lightHandles[k] = g.ctx.lights.request({ position: [c.x, y, c.z], color: 0xff7a30, intensity: Math.min(40, 8 + c.n), radius: 60, flicker: 'torch' });
    });
    this.nearest = list[0] || null;
    if (rng.chance(0.3) && near.length) { const p = near[(rng.next() * near.length) | 0]; g.ctx.particles.burst('ember', [p[1], g.world.heightAt(p[1], p[2]) + 2, p[2]], { count: 1 }); }
  }
  state() { const c = this.grid.counts(); return { fire: { burning: c.burning, burnt: c.burnt } }; }
}
