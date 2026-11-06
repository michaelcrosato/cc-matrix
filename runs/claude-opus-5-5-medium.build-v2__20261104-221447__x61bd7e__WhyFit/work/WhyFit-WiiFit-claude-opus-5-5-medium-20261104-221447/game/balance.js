// The Lean: one centre of balance chased by a target. Every activity reads the same model and the same intent object.
G.noise = (rng, f) => { const ph = [rng() * 6.28, rng() * 6.28, rng() * 6.28]; return t => (Math.sin(t * f + ph[0]) + .6 * Math.sin(t * f * 1.73 + ph[1]) + .35 * Math.sin(t * f * 2.61 + ph[2])) / 1.3; };

G.Balance = class {
  constructor(set, rng, o = {}) {
    this.set = set; this.rng = rng; this.o = o; this.px = 0; this.py = 0; this.vx = 0; this.vy = 0; this.t = 0;
    this.nx = G.noise(rng, 1); this.ny = G.noise(rng, 1); this.ringX = 0; this.ringY = 0;
    this.inside = 0; this.total = 0; this.falls = 0; this.stumbleT = 0; this.streak = 0; this.trail = []; this.fx = 0; this.fy = 0; this.pushT = set.push ? set.push[1] : 0; this.onFall = null; this.xOnly = !!o.xOnly;
    this.nphaseT = 0; this.frozen = false;
  }
  get gentle() { return !this.o.noGentle && G.game.settings && G.game.settings.gentle; }
  get R() { return this.set.R * G.DEV.ring * (this.gentle ? 1.25 : 1) * (this.o.ringMul || 1); }
  get inRing() { return Math.hypot(this.px - this.ringX, this.py - this.ringY) <= this.R; }
  get steadiness() { return this.total > 0 ? this.inside / this.total : 0; }
  get lean() { return Math.hypot(this.px, this.py); }
  step(dt, ux, uy, ef = {}) {
    const S = this.set, D = G.DEV, gm = this.gentle ? .7 : 1;
    this.t += dt;
    if (this.frozen) return;
    if (this.stumbleT > 0) { this.stumbleT -= dt; const e = Math.min(1, dt * 4); this.px -= this.px * e; this.py -= this.py * e; this.vx = this.vy = 0; this.total += dt; this.pushTrail(dt); return; }
    const k = S.k * D.k * (ef.k || 1), c = S.c * D.c, s = S.s * D.s * gm + (ef.s || 0), A = S.A * D.A * gm * (ef.A || 1), f = (S.nf || 1) * D.nf;
    const sx = S.sx !== undefined ? S.sx * D.s * gm : s, sy = S.sy !== undefined ? S.sy * D.s * gm : s;
    if (S.push) { this.pushT -= dt; if (this.pushT <= 0) { this.pushT += S.push[1]; const a = this.rng() * 6.283, v = S.push[0] * D.push; this.vx += Math.cos(a) * v; this.vy += Math.sin(a) * v; } }
    const ax = k * (ux - this.px) - c * this.vx + sx * this.px + A * this.nx(this.t * f) + (ef.fx || 0);
    const ay = k * (uy - this.py) - c * this.vy + sy * this.py + A * this.ny(this.t * f) + (ef.fy || 0);
    this.vx += ax * dt; this.vy += ay * dt; this.px += this.vx * dt; this.py += this.vy * dt;
    if (this.xOnly) { this.py = 0; this.vy = 0; }
    this.total += dt; if (this.inRing) { this.inside += dt; this.streak += dt; } else this.streak = 0;
    this.pushTrail(dt);
    const lim = D.stumble * (this.o.stumbleAt || 1), l = this.lean;
    if (l >= lim) {
      if (this.o.noFall || G.TOOLS.noStumble) { this.px *= lim / l * .99; this.py *= lim / l * .99; this.vx *= .5; this.vy *= .5; }
      else { this.falls++; this.stumbleT = 1; this.streak = 0; if (this.onFall) this.onFall(); }
    }
  }
  pushTrail(dt) { this.nphaseT += dt; if (this.nphaseT > .04) { this.nphaseT = 0; this.trail.push(this.px, this.py); if (this.trail.length > 50) this.trail.splice(0, 2); } }
};

// Bots share the model: they react to where the body was tau seconds ago.
G.BOTS = { poor: { tau: .34, gain: 1.1, damp: .22, noise: .16 }, average: { tau: .25, gain: 1.4, damp: .30, noise: .08 }, good: { tau: .18, gain: 1.8, damp: .36, noise: .04 }, expert: { tau: .14, gain: 2.2, damp: .42, noise: .02 } };
G.LeanBot = class {
  constructor(skill, rng) { this.b = G.BOTS[skill]; this.skill = skill; this.q = []; this.ux = 0; this.uy = 0; this.t = 0; this.nx = G.noise(rng, 1.3); this.ny = G.noise(rng, 1.1); }
  // ex, ey: the error to correct (where the body is, relative to where it wants to be); vx, vy: its speed
  step(dt, ex, ey, vx, vy) {
    this.t += dt; this.q.push(this.t, ex, ey, vx, vy);
    while (this.q.length > 5 && this.q[5] <= this.t - this.b.tau) this.q.splice(0, 5);
    const b = this.b, tx = -b.gain * this.q[1] - b.damp * this.q[3] + b.noise * this.nx(this.t), ty = -b.gain * this.q[2] - b.damp * this.q[4] + b.noise * this.ny(this.t), e = Math.min(1, dt * 16);
    this.ux += (tx - this.ux) * e; this.uy += (ty - this.uy) * e;
    const l = Math.hypot(this.ux, this.uy); if (l > 1) { this.ux /= l; this.uy /= l; }
    return [this.ux, this.uy];
  }
};

// Intent: activities read this, never a device. Devices, bots and attract all fill the same object.
G.newIntent = () => ({ ux: 0, uy: 0, breath: 0, breathOn: false, catchL: false, catchR: false, paceL: false, paceR: false, jump: false, effort: 0, press: [false, false, false, false], touched: false, source: 'keys' });
G.fillDevice = (c, ctx, dt) => {
  const I = c.input, i = c.intent, src = i.source = c.player1 ? G.source(I) : (I.lastDevice === 'gamepad' ? 'pad' : 'keys'), D = G.DEV;
  const prevx = i.ux, prevy = i.uy;
  if (src === 'pad') { const m = I.padMove || [0, 0]; i.ux = m[0]; i.uy = -m[1]; }
  else if (src === 'mouse') { const p = I.pointer(), H = G.game.H || 240, W = G.game.W || 320; if (p && !(G.Dev && G.Dev.isOpen && p[0] < W / 3)) { i.ux = (p[0] - W / 2) / (H * D.mouseReach); i.uy = -(p[1] - H / 2) / (H * D.mouseReach); } }
  else {
    let mx = 0, my = 0;
    if (G.Dev && G.Dev.isOpen && c.player1) { const h = I.held; mx = (h.has('KeyD') ? 1 : 0) - (h.has('KeyA') ? 1 : 0); my = (h.has('KeyS') ? 1 : 0) - (h.has('KeyW') ? 1 : 0); }
    else { const m = I.move(); mx = m[0]; my = m[1]; }
    if (ctx.def.kbDirect) { i.ux = mx; i.uy = -my; }
    else if (mx || my) { const r = D.nudge * dt; i.ux += mx * r; i.uy -= my * r; }
    else { const l = Math.hypot(i.ux, i.uy), d = .5 * dt; if (l <= d) { i.ux = 0; i.uy = 0; } else { i.ux -= i.ux / l * d; i.uy -= i.uy / l * d; } }
  }
  const l = Math.hypot(i.ux, i.uy); if (l > 1) { i.ux /= l; i.uy /= l; }
  if (Math.abs(i.ux - prevx) + Math.abs(i.uy - prevy) > 1e-6 && src !== 'keys' || I.move()[0] || I.move()[1]) i.touched = true;
  // breath: analog triggers read through, digital ramps over four seconds
  const bv = I.value('breath'), analog = src === 'pad' && bv > 0 && bv < 1;
  const G2 = G.game.settings; let held = bv > .02;
  if (G2 && G2.breathMode === 'Toggle' && src !== 'pad') { if (I.pressed('breath')) i.breathOn = !i.breathOn; held = i.breathOn; }
  if (analog) i.breath = bv; else i.breath = clamp(i.breath + (held ? 1 : -1) * dt / 4, 0, 1);
  i.effort = src === 'pad' ? bv : (bv > .02 ? .6 : 0);
  if (I.map && I.map.catchL) { i.catchL = I.pressed('catchL'); i.catchR = I.pressed('catchR'); }
  if (I.map && I.map.paceL) { i.paceL = I.pressed('paceL'); i.paceR = I.pressed('paceR'); }
  i.jump = I.map && I.map.jump ? I.pressed('jump') : false;
  const lanes = (ctx.classMode || !I.map.stepL) ? ['left', 'down', 'up', 'right'] : ['stepL', 'stepD', 'stepU', 'stepR'];
  for (let n = 0; n < 4; n++) i.press[n] = I.pressed(lanes[n]);
};
