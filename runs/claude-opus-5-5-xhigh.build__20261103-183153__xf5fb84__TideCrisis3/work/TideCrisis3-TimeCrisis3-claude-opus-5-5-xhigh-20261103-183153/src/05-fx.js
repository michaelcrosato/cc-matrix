/* 05-fx: presentation-only effects in 3D: particles (sparks, splinters, dust, glass, water spray, smoke, fire, debris,
 * fireworks), tracers and lasers, muzzle flashes and explosion lights, decals (bullet holes, scorch), rain and
 * lightning. Its own random stream (cosmetic), never the Sim's. Drawn by Rail3D after the world and actors. */
class FX {
  constructor() { this.p = []; this.tr = []; this.dec = []; this.lights = []; this.t = 0; this.seed = 1234567; this.rain = 0; this.flash = 0; this.nextBolt = 6; }
  r() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
  add(o) { if (this.p.length > 900) this.p.splice(0, 100); this.p.push(Object.assign({ t: 0, life: 1, vel: [0, 0, 0], g: 0, size: 2, mode: 0, drag: 0, grow: 0 }, o)); }
  burst(at, n, o) {
    for (let i = 0; i < n; i++) {
      const a = this.r() * TAU, e = (this.r() - .3) * Math.PI * .8, s = (o.speed || 80) * (.4 + this.r() * .8);
      this.add(Object.assign({}, o, { pos: at.slice(), vel: [Math.cos(a) * Math.cos(e) * s, Math.sin(a) * Math.cos(e) * s, Math.sin(e) * s + (o.up || 0)], life: (o.life || .5) * (.6 + this.r() * .8), color: Array.isArray(o.colors) ? o.colors[(this.r() * o.colors.length) | 0] : o.color }));
    }
  }
  spark(at, n = 6, c = [255, 210, 120]) { this.burst(at, n, { speed: 110, g: 240, life: .35, size: 1.2, mode: 1, color: c }); }
  impact(at, mat) {
    if (!at) return;
    if (mat === 'metal') { this.spark(at, 8); this.add({ pos: at.slice(), life: .06, size: 5, mode: 1, color: [255, 240, 200] }); }
    else if (mat === 'wood') this.burst(at, 7, { speed: 70, g: 300, life: .6, size: 1.6, color: [150, 100, 60], colors: [[150, 100, 60], [200, 150, 90], [110, 70, 40]] });
    else if (mat === 'water') this.burst(at, 10, { speed: 50, up: 60, g: 260, life: .6, size: 1.8, mode: 2, color: [200, 230, 255] });
    else if (mat === 'glass') this.burst(at, 9, { speed: 80, g: 300, life: .6, size: 1.2, mode: 1, color: [180, 230, 255] });
    else if (mat === 'cloth') this.burst(at, 4, { speed: 30, g: 60, life: .5, size: 1.5, mode: 2, color: [220, 200, 170] });
    else { this.burst(at, 6, { speed: 40, g: 120, life: .5, size: 2.4, mode: 2, grow: 4, color: [170, 160, 150] }); this.spark(at, 2); }
    if (mat !== 'water' && mat !== 'cloth') this.decal(at, mat === 'glass' ? [40, 60, 80] : [26, 22, 24], 1.4);
  }
  decal(at, c, s) { this.dec.push({ pos: at.slice(), c, s }); if (this.dec.length > 160) this.dec.shift(); }
  blood(at) { this.burst(at, 6, { speed: 40, g: 200, life: .4, size: 1.6, mode: 2, color: [120, 20, 30] }); }
  muzzle(at, k = 1, c = [255, 220, 140]) { this.add({ pos: at.slice(), life: .05, size: 5 * k, mode: 1, color: c }); this.add({ pos: at.slice(), life: .08, size: 9 * k, mode: 1, color: [120, 80, 30] }); this.lights.push({ x: at[0], y: at[1], z: at[2], r: 70 * k, k: .6, t: .06 }); }
  tracer(a, b, c = [255, 230, 160], life = .07) { this.tr.push({ a: a.slice(), b: b.slice(), c, t: 0, life }); }
  explosion(at, r = 40) {
    const k = r / 40;
    this.add({ pos: at.slice(), life: .18, size: 30 * k, mode: 1, color: [255, 240, 200] });
    for (let i = 0; i < 14 * k + 6; i++) { const a = this.r() * TAU, e = this.r() * Math.PI * .5, s = 40 + this.r() * 90 * k; this.add({ pos: at.slice(), vel: [Math.cos(a) * Math.cos(e) * s, Math.sin(a) * Math.cos(e) * s, Math.sin(e) * s + 30], life: .35 + this.r() * .4, size: (6 + this.r() * 8) * k, grow: -6, mode: 1, drag: 2.5, color: [255, 140 + this.r() * 80 | 0, 40] }); }
    for (let i = 0; i < 10 * k + 4; i++) this.add({ pos: [at[0] + (this.r() - .5) * r * .6, at[1] + (this.r() - .5) * r * .6, at[2] + this.r() * r * .3], vel: [(this.r() - .5) * 30, (this.r() - .5) * 30, 25 + this.r() * 30], life: 1.2 + this.r() * 1.2, size: (8 + this.r() * 8) * k, grow: 10, mode: 2, drag: 1, color: [70 + this.r() * 30 | 0, 66, 70] });
    this.burst(at, 6 * k + 3, { speed: 140 * k, up: 80, g: 300, life: 1, size: 1.3, color: [50, 44, 40], colors: [[50, 44, 40], [90, 80, 70], [30, 28, 30]] });
    this.spark(at, 12);
    this.lights.push({ x: at[0], y: at[1], z: at[2] + 10, r: 220 * k, k: 1.2, t: .4 });
    this.decal([at[0], at[1], at[2]], [20, 16, 16], 10 * k);
  }
  smoke(at, n = 1, c = [80, 80, 86], s = 6, grow = 5) { for (let i = 0; i < n; i++) this.add({ pos: [at[0] + (this.r() - .5) * 4, at[1] + (this.r() - .5) * 4, at[2]], vel: [(this.r() - .5) * 8, (this.r() - .5) * 8, 18 + this.r() * 10], life: .9 + this.r() * .6, size: s, grow, mode: 2, color: c }); }
  fire(at, n = 1, s = 1) { for (let i = 0; i < n; i++) this.add({ pos: [at[0] + (this.r() - .5) * 8 * s, at[1] + (this.r() - .5) * 8 * s, at[2] + this.r() * 4], vel: [0, 0, 30 + this.r() * 25], life: .35 + this.r() * .3, size: (4 + this.r() * 4) * s, grow: -4, mode: 1, color: [255, 120 + this.r() * 100 | 0, 30] }); }
  firework(at, kind = 0) {
    const cols = [[255, 90, 90], [255, 211, 74], [90, 209, 255], [138, 255, 138], [255, 120, 220]], c = cols[(this.r() * cols.length) | 0], n = 40;
    for (let i = 0; i < n; i++) { const a = i / n * TAU, e = kind === 1 ? 0 : (this.r() - .5) * Math.PI, s = 110 + this.r() * 30; this.add({ pos: at.slice(), vel: [Math.cos(a) * Math.cos(e) * s, Math.sin(a) * Math.cos(e) * s, Math.sin(e) * s + (kind === 2 ? 40 : 0)], g: kind === 2 ? 70 : 30, drag: 1.2, life: 1.4 + this.r() * .6, size: 3.5, mode: 1, color: c, trail: kind === 2 }); }
    this.add({ pos: at.slice(), life: .25, size: 60, mode: 1, color: c.map(v => v * .5) });
    this.lights.push({ x: at[0], y: at[1], z: at[2], r: 400, k: .5, t: .5 });
  }
  step(dt, sim) {
    this.t += dt;
    for (const p of this.p) {
      p.t += dt; const v = p.vel;
      if (p.drag) { const k = Math.exp(-p.drag * dt); v[0] *= k; v[1] *= k; v[2] *= k; }
      v[2] -= p.g * dt; p.pos[0] += v[0] * dt; p.pos[1] += v[1] * dt; p.pos[2] += v[2] * dt; p.size = Math.max(.3, p.size + p.grow * dt);
      if (p.trail && this.r() < .3) this.add({ pos: p.pos.slice(), life: .3, size: 1.5, mode: 1, color: p.color.map(c => c * .6) });
      if (p.g && sim && p.pos[2] < sim.waterZ() && !p.splashed) { p.splashed = true; p.t = p.life; }
    }
    this.p = this.p.filter(p => p.t < p.life);
    for (const t of this.tr) t.t += dt; this.tr = this.tr.filter(t => t.t < t.life);
    for (const l of this.lights) l.t -= dt; this.lights = this.lights.filter(l => l.t > 0);
    this.flash = Math.max(0, this.flash - dt * 4);
  }
  draw(R3) {
    for (const l of this.lights) R3.addLight(l.x, l.y, l.z, l.r, l.k * Math.min(1, l.t * 10));
  }
  drawAfter(R3) {
    for (const d of this.dec) R3.splat(d.pos[0], d.pos[1], d.pos[2], d.s, d.c, 0);
    for (const p of this.p) { const f = 1 - p.t / p.life; R3.splat(p.pos[0], p.pos[1], p.pos[2], p.size, p.mode === 1 ? p.color.map(c => c * (.4 + .6 * f)) : p.color, p.mode, p.mode === 2 ? Math.min(1, f * 1.5) : 1); }
    for (const t of this.tr) R3.line(t.a, t.b, t.c, 1);
  }
}
TC.FX = FX;

/* ---- presentation camera: shake (trauma), recoil, hit jolt, carrier sway, travel bob; dev free camera ---- */
class CamFX {
  constructor() { this.trauma = 0; this.rec = { x: 0, v: 0 }; this.jolt = { x: 0, v: 0 }; this.t = 0; }
  kick(k) { this.trauma = Math.min(1, this.trauma + k); }
  recoil(deg) { this.rec.v += deg * 14; }
  hit() { this.jolt.v += 30; this.kick(.35); }
  step(dt) { this.t += dt; this.trauma = Math.max(0, this.trauma - dt * 1.6); spring(this.rec, 0, 220, 22, dt); spring(this.jolt, 0, 160, 14, dt); }
  apply(cam, sway) {
    const S = TC.game && TC.game.settings, shakeK = S ? (S.reduceMotion ? 0 : (S.shake === undefined ? 1 : +S.shake)) : 1, tr = this.trauma * this.trauma * 2.5 * DEG * shakeK;
    const out = Object.assign({}, cam);
    out.yaw += vnoise(this.t * 18) * tr; out.pitch += vnoise(this.t * 18 + 50) * tr + this.rec.x * DEG + this.jolt.x * -.5 * DEG;
    out.roll = (cam.roll || 0) + this.jolt.x * DEG * 1.2 + vnoise(this.t * 15 + 9) * tr * .5;
    if (sway) { out.roll += Math.sin(this.t * .9) * sway * DEG; out.pitch += Math.sin(this.t * .7 + 1) * sway * .6 * DEG; out.z += Math.sin(this.t * 1.3) * sway * .8; }
    return out;
  }
}
TC.CamFX = CamFX;
