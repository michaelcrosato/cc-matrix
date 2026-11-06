// A walkable place: rows of tile characters (or a bare rectangle), world offset, heights and collision.
export const WALK = new Set('.,PsuUrbkAQF'.split(''));
export const WATER = new Set('wom~'.split(''));
export const UPPER = 2;
export class Place {
  constructor(id, rows, ox = 0, oz = 0, o = {}) { this.id = id; this.rows = rows.map((r) => r.split('')); this.ox = ox; this.oz = oz; this.h = rows.length; this.w = rows[0].length; this.rects = []; this.circles = []; this.indoor = !!o.indoor; this.doors = []; }
  ch(tx, tz) { return this.rows[tz]?.[tx] ?? '#'; }
  chAt(x, z) { return this.ch(Math.floor(x - this.ox), Math.floor(z - this.oz)); }
  groundOf(c, fz) { if (c === 'u' || c === 'U' || c === 'c') return UPPER; if (c === 'r') return UPPER * (1 - fz); if (c === 'b') return 0.16; if (WATER.has(c)) return -0.45; return 0; }
  /** Pure ground height at a world point. Ramp tiles slope down to the south over four rows. */
  heightAt(x, z) { const tz = Math.floor(z - this.oz), tx = Math.floor(x - this.ox), c = this.ch(tx, tz); if (c === 'r') { let top = tz; while (this.ch(tx, top - 1) === 'r') top--; let bot = tz; while (this.ch(tx, bot + 1) === 'r') bot++; const t = (z - this.oz - top) / (bot - top + 1); return UPPER * (1 - t); } return this.groundOf(c, 0); }
  isWater(x, z) { return WATER.has(this.chAt(x, z)); }
  waterKind(x, z) { const c = this.chAt(x, z); return c === 'w' ? 'river' : c === 'o' ? 'pond' : c === 'm' ? 'mouth' : c === '~' ? 'sea' : null; }
  tileWalkable(tx, tz) { return WALK.has(this.ch(tx, tz)); }
  blockedByProps(x, z, r) {
    for (const b of this.rects) if (x + r > b.x0 && x - r < b.x1 && z + r > b.z0 && z - r < b.z1) return true;
    for (const c of this.circles) { const rr = c.r + r; if ((x - c.x) ** 2 + (z - c.z) ** 2 < rr * rr) return true; }
    return false;
  }
  walkable(x, z, r = 0.3) {
    for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7, r * 0.7], [-r * 0.7, r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, -r * 0.7]]) if (!WALK.has(this.chAt(x + dx, z + dz))) return false;
    return !this.blockedByProps(x, z, r);
  }
  /** Slide-move: returns the point reached from (x,z) by (dx,dz). */
  move(x, z, dx, dz, r = 0.3, ghost = false) {
    if (ghost) return [x + dx, z + dz];
    const y0 = this.heightAt(x, z);
    const ok = (a, b) => this.walkable(a, b, r) && Math.abs(this.heightAt(a, b) - y0) < 0.7;
    if (ok(x + dx, z + dz)) return [x + dx, z + dz];
    if (ok(x + dx, z)) return [x + dx, z];
    if (ok(x, z + dz)) return [x, z + dz];
    return [x, z];
  }
  /** Reachable tiles from a world point, for tests. */
  flood(x, z) { const seen = new Set(); const st = [[Math.floor(x - this.ox), Math.floor(z - this.oz)]]; const key = (a, b) => a + b * 1000; const blocked = (a, b) => !this.tileWalkable(a, b) || this.blockedByProps(a + this.ox + 0.5, b + this.oz + 0.5, 0.2); while (st.length) { const [a, b] = st.pop(); if (seen.has(key(a, b)) || blocked(a, b)) continue; seen.add(key(a, b)); st.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]); } return (px, pz) => seen.has(key(Math.floor(px - this.ox), Math.floor(pz - this.oz))); }
}
