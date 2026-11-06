// Spawns, attack tokens, the adaptive rank. Slow enemies, few attackers at a time, always one more behind you.
import { TUNING } from '../data/tuning.js';

export class Director {
  constructor(area) {
    this.area = area;
    this.tokens = 0;
    this.thrower = null;
    this.queue = [];
    this.spawned = 0;
    this.killed = 0;
    this.accuracyHits = 0;
    this.accuracyShots = 0;
    this.noHurtT = 0;
    this.rankT = 0;
    this.maxActiveOverride = null;
  }

  get run() { return this.area.run; }
  get limit() { return this.run ? this.run.tokens : Math.max(1, Math.round(TUNING.attackTokens)); }
  tokenFree() { return this.tokens < this.limit; }
  takeToken(e) {
    if (e.token) return true;
    if (this.tokens >= this.limit) return false;
    this.tokens++;
    e.token = true;
    return true;
  }
  releaseToken(e) { if (e.token) { e.token = false; this.tokens = Math.max(0, this.tokens - 1); } }
  takeThrow(e) {
    if (this.thrower && !this.thrower.dead) return false;
    this.thrower = e;
    e.throwToken = true;
    return true;
  }
  releaseThrow(e) { if (e.throwToken) { e.throwToken = false; if (this.thrower === e) this.thrower = null; } }

  get maxActive() { return this.maxActiveOverride ?? Math.round(TUNING.maxActive); }
  alive() { return this.area.enemies.reduce((n, e) => n + (e.dead ? 0 : 1), 0); }

  /** Queue n of a type at a spawn door; they wait there while maxActive is met. */
  queueSpawn(type, n, door, o = {}) { for (let i = 0; i < n; i++) this.queue.push({ type, door, o, delay: (o.every ?? 0.4) * i * (this.run?.waveInterval ?? 1) }); }

  step(dt) {
    for (const q of this.queue) if (q.delay > 0) q.delay -= dt;
    for (let i = 0; i < this.queue.length && this.alive() < this.maxActive; i++) {
      const q = this.queue[i];
      if (q.delay > 0) continue;
      this.queue.splice(i, 1);
      i--;
      this.spawnAtDoor(q.type, q.door, q.o);
    }
    // Rank: up on long no-damage streaks with good accuracy, down on each death.
    if (this.run && this.alive() > 0) {
      this.noHurtT += dt;
      this.rankT += dt;
      if (this.rankT > 20) {
        this.rankT = 0;
        const acc = this.accuracyShots ? this.accuracyHits / this.accuracyShots : 0;
        if (this.noHurtT > 40 && acc > 0.55) this.run.rankUp();
        this.accuracyHits = 0; this.accuracyShots = 0;
      }
    }
  }

  noteHit() { this.accuracyHits++; this.accuracyShots++; }
  noteMiss() { this.accuracyShots++; }
  noteHurt() { this.noHurtT = 0; }

  spawnAtDoor(type, door, o = {}) {
    const { area } = this;
    const pos = area.level.spawnDoors[door] ?? (Array.isArray(door) ? door : null) ?? Object.values(area.level.spawnDoors)[0] ?? [0, 0];
    const rng = area.ctx.random;
    const nav = area.level.nav;
    let x = pos[0]; let z = pos[1];
    for (let tries = 0; tries < 6; tries++) {
      const px = pos[0] + rng.range(-1.2, 1.2); const pz = pos[1] + rng.range(-1.2, 1.2);
      if (nav.walkable(px, pz)) { x = px; z = pz; break; }
    }
    this.spawned++;
    return area.spawnEnemy(type, { x, z, ...o });
  }
}

/** A distance field to many cells (the nearest water, say), for walking everyone into the sea. */
export class SeaField {
  constructor(info) {
    this.info = info;
    const { w, h } = info;
    this.d = new Float32Array(w * h).fill(Infinity);
    const q = [];
    const open = (c, r) => !'#T~HSG'.includes(info.ch(c, r));
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (!open(c, r)) continue;
        let edge = false;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (info.ch(c + dx, r + dy) === '~') edge = true;
        if (edge) { this.d[r * w + c] = 0; q.push([c, r]); }
      }
    }
    for (let i = 0; i < q.length; i++) {
      const [c, r] = q[i];
      const dv = this.d[r * w + c];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dx; const nr = r + dy;
        if (nc < 0 || nr < 0 || nc >= w || nr >= h || !open(nc, nr)) continue;
        if (this.d[nr * w + nc] > dv + 1) { this.d[nr * w + nc] = dv + 1; q.push([nc, nr]); }
      }
    }
    this.out = [0, 0];
  }
  distAt(x, z) {
    const c = this.info.col(x); const r = this.info.row(z);
    if (c < 0 || r < 0 || c >= this.info.w || r >= this.info.h) return 0;
    return this.d[r * this.info.w + c];
  }
  /** Direction downhill. At the shore it points at the water. */
  dirAt(x, z) {
    const { info } = this;
    const c = info.col(x); const r = info.row(z);
    const here = this.distAt(x, z);
    if (!Number.isFinite(here)) return null;
    let best = null; let bd = here;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dx; const nr = r + dy;
      if (here === 0 && info.ch(nc, nr) === '~') { this.out[0] = dx; this.out[1] = dy; return this.out; }
      if (nc < 0 || nr < 0 || nc >= info.w || nr >= info.h) continue;
      const v = this.d[nr * info.w + nc];
      if (v < bd) { bd = v; best = [info.x(nc), info.z(nr)]; }
    }
    if (!best) return null;
    const dx = best[0] - x; const dz = best[1] - z;
    const l = Math.hypot(dx, dz) || 1;
    this.out[0] = dx / l; this.out[1] = dz / l;
    return this.out;
  }
}
