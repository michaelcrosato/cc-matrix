// World system: terrain, sky, time, wind, plants. Owns reset().
import { PALETTE, THREE, groundFog, createNoise } from '../../pixel-engine.js';
import { makeLand, makeTerrain, WORLD, HALF, CELLS, CELL } from './terrain.js';
import { Sky } from './sky.js';
import { TUNING } from '../core/tuning.js';

export class WorldSystem {
  name = 'world';
  hour = 17; day = 1;
  wind = { dir: [0.8, 0.6], speed: 3, pin: null };
  setup(g) {
    const ctx = g.ctx;
    this.land = makeLand(7);
    const T = makeTerrain(ctx, this.land);
    Object.assign(this, { terrain: T.t, kind: T.kind, baseCol: T.baseCol, col: T.col, pal: T.pal });
    g.terrain = this.terrain;
    this.sky = new Sky(ctx);
    this.fog = groundFog({ color: 0xe9c98f, top: -60, amount: 0.55, near: 200, far: 950 });
    ctx.scene.fogNode = this.fog.node;
    const cam = ctx.camera.camera; cam.far = 1000; cam.updateProjectionMatrix();
    this.windRng = ctx.random.fork('wind');
    this.sky.update(this.hour, cam.position, true);
    this.fog.color.value.copy(this.sky.fogCol);
  }
  heightAt(x, z) { return this.terrain.heightAt(x, z); }
  kindAt(x, z) {
    const ix = Math.floor((x + HALF) / CELL), iz = Math.floor((z + HALF) / CELL);
    if (ix < 0 || iz < 0 || ix >= CELLS || iz >= CELLS) return 0;
    return this.kind[ix + iz * CELLS];
  }
  fixed(g, dt) {
    // wind: slow random walk
    const w = this.wind;
    if (!w.pin) {
      const a = Math.atan2(w.dir[1], w.dir[0]) + (this.windRng.range(-1, 1) * 15 * Math.PI / 180) * dt / 60;
      w.dir[0] = Math.cos(a); w.dir[1] = Math.sin(a);
      w.speed = Math.max(0, Math.min(8, w.speed + this.windRng.range(-1, 1) * dt * 0.15));
    }
    // time of day
    this.hour += dt * 24 / (TUNING.dayMinutes * 60);
    if (this.hour >= 24) { this.hour -= 24; this.day++; }
  }
  frame(g, dt) {
    const cam = g.ctx.camera.camera;
    const changed = this.sky.update(this.hour, cam.position, false);
    if (changed) this.fog.color.value.copy(this.sky.fogCol);
  }
  state() { return { hour: +this.hour.toFixed(2), day: this.day, wind: { dir: this.wind.dir.map((v) => +v.toFixed(2)), speed: +this.wind.speed.toFixed(2) } }; }
}
