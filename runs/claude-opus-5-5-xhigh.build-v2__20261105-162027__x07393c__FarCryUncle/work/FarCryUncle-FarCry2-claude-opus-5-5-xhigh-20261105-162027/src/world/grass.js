// GrassField chunks of 48 m with about 7,000 blades, built near the camera, disposed far away, and burned blade by blade.
import { THREE, GrassField, PALETTE } from '../../pixel-engine.js';
import { K, HALF } from './ground.js';
import { S, FN, FCELL } from './fire.js';
const { Matrix4 } = THREE;
const CHUNK = 48, N = Math.ceil(1280 / CHUNK);
const ZERO = new Matrix4().makeScale(0, 0, 0);
const BUILD_R = 170, HIDE_R = 200, FREE_R = 320;
export class GrassManager {
  chunks = new Map(); wind = [0, 0]; built = 0;
  constructor(game) { this.game = game; }
  key(cx, cz) { return cx + cz * N; }
  coords(x, z) { return [Math.floor((x + HALF) / CHUNK), Math.floor((z + HALF) / CHUNK)]; }
  update(ctx, camPos, time) {
    const g = this.game;
    if (!g.views) return;
    const [ccx, ccz] = this.coords(camPos.x, camPos.z);
    const reach = Math.ceil(BUILD_R / CHUNK);
    let budget = this.primeAll ? 500 : 2; // a couple per frame, so walking never stalls
    for (let dz = -reach; dz <= reach && budget > 0; dz++) for (let dx = -reach; dx <= reach && budget > 0; dx++) {
      const cx = ccx + dx, cz = ccz + dz;
      if (cx < 0 || cz < 0 || cx >= N || cz >= N) continue;
      const k = this.key(cx, cz);
      if (this.chunks.has(k)) continue;
      const mx = cx * CHUNK - HALF + CHUNK / 2, mz = cz * CHUNK - HALF + CHUNK / 2;
      if (Math.hypot(mx - camPos.x, mz - camPos.z) > BUILD_R) continue;
      this.buildChunk(ctx, cx, cz, mx, mz);
      budget--;
    }
    this.primeAll = false;
    for (const [k, c] of this.chunks) {
      const d = Math.hypot(c.mx - camPos.x, c.mz - camPos.z);
      if (c.field) {
        c.field.visible = d < HIDE_R;
        if (d < HIDE_R) { c.field.wind.set(g.wind.vx * 0.42, g.wind.vz * 0.42); c.field.update(time); if (d < 60 && g.hasPlayer && !g.player.seat) c.field.push(0, g.player.feet, 0.9); }
      }
      if (c.young) { c.young.visible = d < HIDE_R; if (d < HIDE_R) { c.young.wind.set(g.wind.vx * 0.42, g.wind.vz * 0.42); c.young.update(time); } }
      if (d > FREE_R) { this.dropChunk(ctx, c); this.chunks.delete(k); }
    }
  }
  buildChunk(ctx, cx, cz, mx, mz) {
    const { ground, fire, world } = this.game;
    const mask = (x, z) => {
      const k = ground.kindAt(x, z);
      if (k !== K.GRASS && k !== K.CROP && k !== K.WOOD && k !== K.BANK) return false;
      const id = fire.idOf(x, z);
      if (id < 0 || fire.state[id] === S.BURNT || fire.state[id] === S.BURNING) return false;
      if (fire.state[id] === S.REGROW) return false;   // the young field below has these
      // Burned once and back: half as thick as it was.
      if (fire.halfDensity?.has(id) && ((Math.floor(x * 7.3) ^ Math.floor(z * 5.9)) & 1)) return false;
      return true;
    };
    const crop = ground.kindAt(mx, mz) === K.CROP;
    const field = new GrassField({ area: [CHUNK, CHUNK], at: [mx, 40, mz], count: 7000, height: crop ? [1.0, 1.7] : [0.4, 0.95], width: crop ? 0.14 : 0.1, base: PALETTE.orange, tip: PALETTE.sand, mask, ground: (x, z) => world.heightAt(x, z), seed: cx * 31 + cz * 977 });
    field.castShadow = false; field.receiveShadow = true; field.frustumCulled = false;
    field.sway = 0.14;
    ctx.scene.add(field);
    const root = field.geometry.getAttribute('aRoot');
    // Blades indexed by fire cell so a burn is one lookup.
    const byCell = new Map();
    const blades = field.blades;
    for (let i = 0; i < blades; i++) {
      const x = root.getX(i), z = root.getY(i);
      const id = fire.idOf(x, z);
      if (id < 0) continue;
      if (!byCell.has(id)) byCell.set(id, []);
      byCell.get(id).push(i);
    }
    this.chunks.set(this.key(cx, cz), { field, mx, mz, byCell, young: this.buildYoung(ctx, mx, mz) });
    this.built++;
  }
  /** New growth on burnt ground: short, green and lime, so it reads as an event. Only where a chunk has some. */
  buildYoung(ctx, mx, mz) {
    const { ground, fire } = this.game;
    const isYoung = (x, z) => { const id = fire.idOf(x, z); return id >= 0 && fire.state[id] === S.REGROW; };
    let any = false;
    for (let z = mz - CHUNK / 2; z <= mz + CHUNK / 2 && !any; z += FCELL) for (let x = mx - CHUNK / 2; x <= mx + CHUNK / 2 && !any; x += FCELL) any = isYoung(x, z);
    if (!any) return null;
    const mask = (x, z) => { const k = ground.kindAt(x, z); return (k === K.GRASS || k === K.CROP || k === K.WOOD || k === K.BANK) && isYoung(x, z); };
    const young = new GrassField({ area: [CHUNK, CHUNK], at: [mx, 40, mz], count: 2500, height: [0.14, 0.34], width: 0.1, base: PALETTE.green, tip: PALETTE.lime, mask, ground: (x, z) => this.game.world.heightAt(x, z), seed: 7 });
    young.castShadow = false; young.receiveShadow = true; young.frustumCulled = false; young.sway = 0.1;
    ctx.scene.add(young);
    return young;
  }
  /** The ground under a cell changed for good (it regrew, or came back as fuel): build its chunk again. */
  invalidateCell(id) {
    if (!this.game.views) return;
    const ctx = this.game.ctx, x = this.game.fire.wx(id), z = this.game.fire.wz(id);
    for (const [dx, dz] of [[-FCELL / 2, -FCELL / 2], [FCELL / 2, FCELL / 2]]) {
      const [cx, cz] = this.coords(x + dx, z + dz), k = this.key(cx, cz), c = this.chunks.get(k);
      if (c) { this.dropChunk(ctx, c); this.chunks.delete(k); }
    }
  }
  dropChunk(ctx, c) {
    if (c.field) { ctx.scene.remove(c.field); c.field.dispose(); }
    if (c.young) { ctx.scene.remove(c.young); c.young.dispose(); }
  }
  /** A cell went burnt or burning: zero its blades in whichever chunks hold them. */
  burnCell(id) {
    const x = this.game.fire.wx(id), z = this.game.fire.wz(id);
    const seen = new Set();
    for (const [dx, dz] of [[-FCELL / 2, -FCELL / 2], [FCELL / 2, FCELL / 2]]) {
      const [cx, cz] = this.coords(x + dx, z + dz);
      const k = this.key(cx, cz);
      if (seen.has(k)) continue;
      seen.add(k);
      const c = this.chunks.get(k);
      if (!c) continue;
      const list = c.byCell.get(id);
      if (!list) continue;
      for (const i of list) c.field.setMatrixAt(i, ZERO);
      c.field.instanceMatrix.needsUpdate = true;
      c.byCell.delete(id);
    }
  }
  reset(ctx) {
    for (const c of this.chunks.values()) this.dropChunk(ctx, c);
    this.chunks.clear();
  }
}
