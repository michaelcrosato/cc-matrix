// Pure Dot physics (PLAN section 4). No engine imports.
export class Dot {
  x = 0; y = 0; vx = 0; vy = 0; ux = 0; uy = 0; t = 0;
  constructor(rand) { this.ph = [rand(), rand(), rand(), rand()].map((r) => r * 6.283); this.rand = rand; }
  step(dt, inX, inY, T, m = {}) {
    this.t += dt;
    const k = Math.min(1, dt / Math.max(0.01, T.dotLag));
    this.ux += (inX - this.ux) * k; this.uy += (inY - this.uy) * k;
    const n = T.dotNoise * (m.noise ?? 1), inst = T.dotInstability * (m.inst ?? 1), auth = T.dotAuthority * (m.auth ?? 1);
    const nx = n * (Math.sin(1.7 * this.t + this.ph[0]) + 0.6 * Math.sin(3.1 * this.t + this.ph[1]));
    const ny = n * (Math.sin(1.3 * this.t + this.ph[2]) + 0.6 * Math.sin(2.7 * this.t + this.ph[3]));
    this.vx += (inst * this.x + auth * this.ux - T.dotDamping * this.vx + nx + (m.bx ?? 0)) * dt;
    this.vy += (inst * this.y + auth * this.uy - T.dotDamping * this.vy + ny + (m.by ?? 0)) * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    const d = Math.hypot(this.x, this.y);
    if (d > 1.2) { const s = 1.2 / d; this.x *= s; this.y *= s; this.vx *= 0.3; this.vy *= 0.3; }
  }
  impulse(ix, iy) { this.vx += ix; this.vy += iy; }
}
// Bot PD controller (PLAN section 4). skill: idle|sloppy|average|good|expert
export const BOT_PARAMS = {
  idle: null,
  sloppy: { tau: 0.42, kp: 0.7, kd: 0.12, err: 1.3 },
  average: { tau: 0.30, kp: 1.1, kd: 0.35, err: 0.8 },
  good: { tau: 0.22, kp: 1.5, kd: 0.55, err: 0.45 },
  expert: { tau: 0.17, kp: 1.9, kd: 0.7, err: 0.2 },
};
export class Bot {
  constructor(skill, rand) {
    this.skill = skill; this.p = BOT_PARAMS[skill] || null; this.rand = rand;
    this.hist = []; this.drift = { x: 0, y: 0 };
  }
  // history of {x,y,vx,vy} sampled each step; returns {x,y} input toward target {x,y}
  drive(dot, target, dt) {
    if (!this.p) return { x: 0, y: 0 };
    this.hist.push({ x: dot.x, y: dot.y, vx: dot.vx, vy: dot.vy });
    const delay = Math.max(0, Math.round(this.p.tau / Math.max(dt, 1 / 240)));
    while (this.hist.length > delay + 2) this.hist.shift();
    const seen = this.hist[0] || { x: dot.x, y: dot.y, vx: dot.vx, vy: dot.vy };
    this.drift.x += (this.rand() - 0.5) * this.p.err * dt * 6; this.drift.y += (this.rand() - 0.5) * this.p.err * dt * 6;
    this.drift.x *= 0.995; this.drift.y *= 0.995;
    let ux = -this.p.kp * (seen.x - target.x) - this.p.kd * seen.vx + this.drift.x;
    let uy = -this.p.kp * (seen.y - target.y) - this.p.kd * seen.vy + this.drift.y;
    const d = Math.hypot(ux, uy); if (d > 1) { ux /= d; uy /= d; }
    return { x: ux, y: uy };
  }
}
export function mulberry(seed) {
  let a = seed >>> 0;
  return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Measure in-ring fraction for a bot skill. Used by tests.
export function measureInRing(skill, ring, seconds, T, seed = 1) {
  const rand = mulberry(seed);
  const dot = new Dot(rand); const bot = new Bot(skill, rand);
  const dt = 1 / 60; let inside = 0, total = 0;
  const steps = Math.floor(seconds / dt);
  for (let i = 0; i < steps; i++) {
    const u = bot.drive(dot, { x: 0, y: 0 }, dt);
    dot.step(dt, u.x, u.y, T, {});
    if (i * dt >= 2) { total++; if (Math.hypot(dot.x, dot.y) <= ring) inside++; }
  }
  return total ? inside / total : 0;
}
export function starsFor(score, thresholds) {
  let s = 0; for (const t of thresholds) if (score >= t) s++; return s;
}
