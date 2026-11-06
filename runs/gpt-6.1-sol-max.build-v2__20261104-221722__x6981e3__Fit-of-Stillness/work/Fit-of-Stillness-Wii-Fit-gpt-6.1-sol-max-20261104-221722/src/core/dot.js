export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export function rng(seed = 1) { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function disc(x, y) { const d = Math.max(1, Math.hypot(x, y)); return { x: x / d, y: y / d }; }
export class Dot {
  x = 0; y = 0; vx = 0; vy = 0; ux = 0; uy = 0; t = 0;
  constructor(rand = rng()) { this.ph = [rand(), rand(), rand(), rand()].map(r => r * 6.283); }
  step(dt, inX, inY, T, m = {}) {
    this.t += dt;
    const k = Math.min(1, dt / Math.max(.001, T.dotLag));
    this.ux += (inX - this.ux) * k; this.uy += (inY - this.uy) * k;
    const n = T.dotNoise * (m.noise ?? 1), inst = T.dotInstability * (m.inst ?? 1), auth = T.dotAuthority * (m.auth ?? 1);
    const nx = n * (Math.sin(1.7 * this.t + this.ph[0]) + .6 * Math.sin(3.1 * this.t + this.ph[1]));
    const ny = n * (Math.sin(1.3 * this.t + this.ph[2]) + .6 * Math.sin(2.7 * this.t + this.ph[3]));
    this.vx += (inst * this.x + auth * this.ux - T.dotDamping * this.vx + nx + (m.bx ?? 0)) * dt;
    this.vy += (inst * this.y + auth * this.uy - T.dotDamping * this.vy + ny + (m.by ?? 0)) * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    const d = Math.hypot(this.x, this.y);
    if (d > 1.2) { this.x *= 1.2 / d; this.y *= 1.2 / d; this.vx *= .3; this.vy *= .3; }
  }
}
export const SKILLS = { idle: [0, 0, 0, 0], sloppy: [.42, .7, .12, 1.3], average: [.30, 1.1, .35, .8], good: [.22, 1.5, .55, .45], expert: [.17, 1.9, .7, .2] };
export class BalanceBot {
  constructor(skill = 'expert', random = rng()) { this.skill = skill; this.random = random; this.history = []; this.dx = this.dy = 0; }
  read(dot, dt, target = { x: 0, y: 0 }) {
    if (this.skill === 'idle') return { x: 0, y: 0 };
    const [tau, kp, kd, err] = SKILLS[this.skill] || SKILLS.expert;
    this.history.push({ x: dot.x, y: dot.y, vx: dot.vx, vy: dot.vy });
    const n = Math.round(tau / dt), seen = this.history[Math.max(0, this.history.length - 1 - n)];
    if (this.history.length > n + 3) this.history.shift();
    this.dx = (this.dx + (this.random() - .5) * err * dt * 6) * .995;
    this.dy = (this.dy + (this.random() - .5) * err * dt * 6) * .995;
    return disc(-kp * (seen.x - target.x) - kd * seen.vx + this.dx, -kp * (seen.y - target.y) - kd * seen.vy + this.dy);
  }
}
