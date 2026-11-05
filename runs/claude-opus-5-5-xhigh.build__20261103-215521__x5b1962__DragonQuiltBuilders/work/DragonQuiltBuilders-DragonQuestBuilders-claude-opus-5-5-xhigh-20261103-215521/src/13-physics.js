// VoxelBody: a circle body in the voxel world: walls per level, ramps (stairs), head bumps, wading, the void, safe spots.
(() => {
const DQ = globalThis.DQ, E = DQ.E, T = 16;
class VoxelBody {
  constructor(o = {}) {
    Object.assign(this, { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 5, h: 28, step: 2, gravity: 800, friction: 0, onGround: true, groundZ: 0,
      hitWall: false, landed: false, fly: false, blockDoors: false, wade: true, fell: false, inWater: 0, lastSafe: null, _safeT: 0, fallV: 0, maxFall: 420 }, o);
  }
  push(ix, iy, iz = 0) { this.vx += ix; this.vy += iy; if (iz) { this.vz += iz; this.onGround = false; } return this; }
  jump(v = 215) { if (!this.onGround) return false; this.vz = v; this.onGround = false; return true; }
  get cx() { return Math.floor(this.x / T); }
  get cy() { return Math.floor(this.y / T); }
  get L() { return Math.floor((this.z + 1) / T); }
  update(dt, w) {
    this.landed = false; this.hitWall = false;
    if (this.friction) { const k = Math.exp(-this.friction * dt); this.vx *= k; this.vy *= k; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    const bx = this.x, by = this.y;
    if (w.collide(this)) {
      this.hitWall = true;
      const nx = this.x - bx, ny = this.y - by, l = Math.hypot(nx, ny);
      if (l > 1e-6) { const ux = nx / l, uy = ny / l, vn = this.vx * ux + this.vy * uy; if (vn < 0) { this.vx -= vn * ux; this.vy -= vn * uy; } }
    }
    const ground = w.groundAt(this.x, this.y, this.r, this.z, this.step);
    if (this.fly) {
      this.z += this.vz * dt; if (this.z < ground) { this.z = ground; this.vz = Math.max(0, this.vz); }
      const c = w.ceilingAt(this.x, this.y, this.r, this.z, this.step); if (this.z + this.h > c) { this.z = Math.max(ground, c - this.h); this.vz = Math.min(0, this.vz); }
      this.onGround = this.z <= ground + .01; this.groundZ = ground;
    } else {
      if (this.onGround) {
        if (ground >= this.z - 4.5 && ground <= this.z + this.step + .01) { this.z = ground; this.vz = 0; }   // stick to ramps and small steps down
        else this.onGround = false;
      }
      if (!this.onGround) {
        this.vz = Math.max(-this.maxFall, this.vz - this.gravity * dt); this.z += this.vz * dt;
        const c = w.ceilingAt(this.x, this.y, this.r, this.z, this.step);
        if (this.vz > 0 && this.z + this.h > c) { this.z = c - this.h; this.vz = 0; }
        if (this.z <= ground) { this.fallV = -this.vz; this.z = ground; this.vz = 0; this.onGround = true; this.landed = true; }
      }
      this.groundZ = ground;
    }
    // wading (shallow water) and the void
    const cx = this.cx, cy = this.cy, Lf = this.L;
    this.inWater = w.liquidAt(cx, cy, Lf) ? 1 + (w.liquidAt(cx, cy, Lf + 1) ? 1 : 0) : 0;
    this.fell = this.z < -T * 2 || (!this.fly && this.inWater >= 2 && this.onGround);
    if (this.onGround && !this.inWater) {
      this._safeT -= dt;
      if (this._safeT <= 0) { this._safeT = .5; if (this._solidAround(w)) this.lastSafe = [this.x, this.y, this.z]; }
    }
    return this;
  }
  _solidAround(w) {
    const cx = this.cx, cy = this.cy, L = this.L;
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { if (!w.inside(cx + dx, cy + dy, 0)) return false; if (!w.topZ(cx + dx, cy + dy)) return false; }
    return w.solidAt(cx, cy, L - 1) || DQ.STAIR[w.get(cx, cy, L)];
  }
  /** back to the last safe spot (the void, deep water) */
  toSafe() { if (this.lastSafe) { [this.x, this.y, this.z] = this.lastSafe; } this.vx = this.vy = this.vz = 0; this.onGround = true; this.fell = false; }
  aabbHits(cx, cy, L) {
    const x0 = cx * T, y0 = cy * T, z0 = L * T;
    const qx = E.clamp(this.x, x0, x0 + T), qy = E.clamp(this.y, y0, y0 + T);
    return (qx - this.x) ** 2 + (qy - this.y) ** 2 < (this.r - .3) ** 2 && this.z < z0 + T - .5 && this.z + this.h > z0 + .5;
  }
}
DQ.VoxelBody = VoxelBody;
})();
