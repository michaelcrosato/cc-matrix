// Circle-vs-tile collision (deterministic, headless friendly).
import { TW, TD } from './townMap.js';
export class Grid {
  constructor(w = TW, d = TD) { this.w = w; this.d = d; this.bl = new Uint8Array(w * d); }
  set(bl) { this.bl = bl; }
  solid(x, z) { const tx = Math.floor(x), tz = Math.floor(z); if (tx < 0 || tz < 0 || tx >= this.w || tz >= this.d) return true; return this.bl[tz * this.w + tx] === 1; }
  hit(x, z, r) { return this.solid(x - r, z - r) || this.solid(x + r, z - r) || this.solid(x - r, z + r) || this.solid(x + r, z + r); }
  /** Move p={x,z} by (dx,dz) with sliding. Returns true if blocked on any axis. */
  move(p, dx, dz, r = 0.3) {
    let blocked = false;
    if (dx) { if (!this.hit(p.x + dx, p.z, r)) p.x += dx; else blocked = true; }
    if (dz) { if (!this.hit(p.x, p.z + dz, r)) p.z += dz; else blocked = true; }
    return blocked;
  }
  /** Nearest free tile centre around (x,z) (for spawning). */
  free(x, z) { for (let rad = 0; rad < 8; rad++) for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) { const tx = Math.floor(x) + dx, tz = Math.floor(z) + dz; if (!this.solid(tx + 0.5, tz + 0.5)) return [tx + 0.5, tz + 0.5]; } return [x, z]; }
}
