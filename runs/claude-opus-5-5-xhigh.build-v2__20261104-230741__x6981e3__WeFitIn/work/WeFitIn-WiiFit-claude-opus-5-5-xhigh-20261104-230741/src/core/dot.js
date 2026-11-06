// The Dot: an unstable weight. You apply force; it drifts, sways and overshoots.
// Pure, no engine imports. Step in fixedUpdate at 60 Hz. p is in -1.2..1.2.
export const DOT_LIMIT = 1.2;

export class Dot {
  x = 0; y = 0; vx = 0; vy = 0; ux = 0; uy = 0; t = 0;

  constructor(rand) {
    this.ph = [rand(), rand(), rand(), rand()].map((r) => r * 6.283);
  }

  /** T: tunables. m: per-activity modifiers { noise, noiseY, inst, auth, bx, by }. */
  step(dt, inX, inY, T, m = {}) {
    this.t += dt;
    const k = Math.min(1, dt / T.dotLag);
    this.ux += (inX - this.ux) * k;
    this.uy += (inY - this.uy) * k;
    const n = T.dotNoise * (m.noise ?? 1);
    const inst = T.dotInstability * (m.inst ?? 1);
    const auth = T.dotAuthority * (m.auth ?? 1);
    const nx = n * (Math.sin(1.7 * this.t + this.ph[0]) + 0.6 * Math.sin(3.1 * this.t + this.ph[1]));
    const ny = n * (m.noiseY ?? 1) * (Math.sin(1.3 * this.t + this.ph[2]) + 0.6 * Math.sin(2.7 * this.t + this.ph[3]));
    this.vx += (inst * this.x + auth * this.ux - T.dotDamping * this.vx + nx + (m.bx ?? 0)) * dt;
    this.vy += (inst * this.y + auth * this.uy - T.dotDamping * this.vy + ny + (m.by ?? 0)) * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const d = Math.hypot(this.x, this.y);
    if (d > DOT_LIMIT) {
      const s = DOT_LIMIT / d;
      this.x *= s; this.y *= s; this.vx *= 0.3; this.vy *= 0.3;
    }
  }

  /** A sneeze, a gust: adds directly to the velocity. */
  impulse(ix, iy) { this.vx += ix; this.vy += iy; }

  reset() { this.x = this.y = this.vx = this.vy = this.ux = this.uy = 0; }

  /** God mode and similar: hold the Dot inside a ring around (cx, cy). */
  clampTo(cx, cy, r) {
    const dx = this.x - cx, dy = this.y - cy, d = Math.hypot(dx, dy);
    if (d > r && d > 0) {
      const s = r / d;
      this.x = cx + dx * s; this.y = cy + dy * s; this.vx *= 0.3; this.vy *= 0.3;
    }
  }
}
