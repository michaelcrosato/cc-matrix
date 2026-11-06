// the Lean: balance model, intent sources (devices, bots), the Plate
(() => {
const E = My3D2dge, G = window.G, { px } = E;
const noise = (rng, f) => { const ph = [rng() * 6.28, rng() * 6.28, rng() * 6.28]; return t => (Math.sin(t * f + ph[0]) + .6 * Math.sin(t * f * 1.73 + ph[1]) + .35 * Math.sin(t * f * 2.61 + ph[2])) / 1.3; };
G.noise = noise;
G.gentle = () => !!(G.game && G.game.settings && G.game.settings.gentle);

class Balance {
  constructor(set, rng) {
    this.set = Object.assign({ k: 14, c: 7, s: 4, A: 3, nf: 1.1, R: .2, push: null }, set || {});
    this.rng = rng || E.rng(1);
    this.nx = noise(this.rng, this.set.nf); this.ny = noise(this.rng, this.set.nf * 1.07);
    this.p = { x: 0, y: 0 }; this.v = { x: 0, y: 0 }; this.u = { x: 0, y: 0 }; this.t = 0;
    this.fx = 0; this.fy = 0; this.center = [0, 0];
    this.stumbleT = 0; this.falls = 0; this.inT = 0; this.total = 0; this.inRing = false; this.streak = 0; this.pushT = this.set.push ? this.set.push[1] * (.5 + this.rng() * .5) : 1e9;
    this.cheat = false; this.onStumble = null; this.gust = [0, 0]; this.edge = 0; this.trail = []; this.hidden = false; this.mult = { k: 1, A: 1, s: 1 }; this.freeze = false;
  }
  get R() { return this.set.R * G.DEV.ring * (G.gentle() ? 1.25 : 1); }
  get steadiness() { return this.total > 0 ? this.inT / this.total : 0; }
  reset() { this.p.x = this.p.y = this.v.x = this.v.y = 0; this.stumbleT = 0; }
  step(dt) {
    const S = this.set, g = G.gentle() ? .7 : 1, D = G.DEV;
    this.t += dt; this.total += dt;
    if (this.freeze) { this.edge = 0; return; }
    if (this.stumbleT > 0) {
      this.stumbleT -= dt; const e = Math.min(1, dt * 3); this.p.x -= this.p.x * e; this.p.y -= this.p.y * e; this.v.x *= .9; this.v.y *= .9; this.inRing = false; this.streak = 0; this.edge = 0; return;
    }
    const k = S.k * D.k * this.mult.k, c = S.c * D.c, s = S.s * D.s * g * this.mult.s, A = S.A * D.A * g * this.mult.A, sx = S.sx != null ? S.sx * D.s * g * this.mult.s : s, sy = S.sy != null ? S.sy * D.s * g * this.mult.s : s;
    if (S.push) { this.pushT -= dt; if (this.pushT <= 0) { this.pushT = S.push[1] * (.6 + this.rng() * .8); const a = this.rng() * 6.283, m = S.push[0] * D.push; this.v.x += Math.cos(a) * m; this.v.y += Math.sin(a) * m; } }
    const ux = this.u.x, uy = this.u.y;
    const ax = k * (ux - this.p.x) - c * this.v.x + sx * this.p.x + A * this.nx(this.t) + this.fx + this.gust[0];
    const ay = k * (uy - this.p.y) - c * this.v.y + sy * this.p.y + A * this.ny(this.t) + this.fy + this.gust[1];
    this.v.x += ax * dt; this.v.y += ay * dt; this.p.x += this.v.x * dt; this.p.y += this.v.y * dt;
    const h = Math.hypot(this.p.x, this.p.y); this.edge = G.clamp((h - .6) / .4, 0, 1);
    if (h >= D.stumble && !this.cheat && !G.devFlags.noStumble) { this.falls++; this.stumbleT = 1; this.v.x = this.v.y = 0; if (this.onStumble) this.onStumble(this); return; }
    if (h >= D.stumble) { const f = (D.stumble - .02) / h; this.p.x *= f; this.p.y *= f; this.v.x *= .5; this.v.y *= .5; }
    this.inRing = Math.hypot(this.p.x - this.center[0], this.p.y - this.center[1]) <= this.R;
    if (this.inRing) { this.inT += dt; this.streak += dt; } else this.streak = 0;
    this.trail.push([this.p.x, this.p.y, this.t]); while (this.trail.length && this.trail[0][2] < this.t - 1) this.trail.shift();
  }
  get speed() { return Math.hypot(this.v.x, this.v.y); }
}
G.Balance = Balance;

// ---- intent -------------------------------------------------------------------------------------
G.newIntent = () => ({ ux: 0, uy: 0, breath: 0, breathA: null, breathHeld: false, effort: 0, catchL: false, catchR: false, paceL: false, paceR: false, jump: false, stepP: { stepL: false, stepR: false, stepU: false, stepD: false }, src: 'key', keyT: -99, confirm: false, hasInput: false, moved: false });
// reads one input (game.input or a game.players[i]) into an intent
G.readHuman = (input, it, dt, opt) => {
  opt = opt || {};
  const v = a => input.map[a] ? input.value(a) : 0, dn = a => input.map[a] ? input.down(a) : false, pr = a => input.map[a] ? input.pressed(a) : false;
  const dv = G.devFlags && G.devFlags.open, kd = a => dn(a) || pr(a), kx = (kd(dv ? 'wR' : 'nR') ? 1 : 0) - (kd(dv ? 'wL' : 'nL') ? 1 : 0), ky = (kd(dv ? 'wU' : 'nU') ? 1 : 0) - (kd(dv ? 'wD' : 'nD') ? 1 : 0);
  if (kx || ky) it.keyT = input.clock; it.kx = kx; it.ky = ky;
  const sx = v('axR') - v('axL'), sy = v('axU') - v('axD');
  const stickOn = Math.hypot(sx, sy) > .05;
  if (input.lastDevice === 'gamepad' || stickOn) it.src = 'pad';
  else if (input.mouse && input.mouse.active && input.mouse.t > it.keyT && !opt.noMouse && !(G.dev && G.dev.hover)) it.src = 'mouse';
  else it.src = 'key';
  if (kx || ky) it.src = (input.lastDevice === 'gamepad' && stickOn) ? 'pad' : 'key';
  const D = G.DEV;
  if (it.src === 'pad') { let x = sx, y = sy; const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } it.ux = x; it.uy = y; }
  else if (it.src === 'key') {
    const rate = D.nudge;
    for (const ax of ['x', 'y']) { const d = ax === 'x' ? kx : ky, k = 'u' + ax; if (d) it[k] = G.clamp(it[k] + d * rate * dt, -1, 1); else it[k] -= Math.sign(it[k]) * Math.min(Math.abs(it[k]), .5 * dt); }
  } else {
    const p = input.pointer && input.pointer(); const W = input.screenW || (G.game && G.game.W) || 427, H = (G.game && G.game.H) || 240;
    if (p) { let x = (p[0] - W / 2) / (H * D.mouseReach), y = -(p[1] - H / 2) / (H * D.mouseReach); const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } it.ux = x; it.uy = y; }
  }
  // breath / effort
  const an = Math.max(v('breathP'), 0); let held = dn('breath');
  if (G.game && G.game.settings && G.game.settings.breathMode === 'Toggle' && !opt.noToggle) { if (pr('breath')) it.tog = !it.tog; held = it.tog || an > .5; }
  it.breathHeld = held || an > .5; it.breathA = an > .03 ? an : null;
  if (it.breathA != null && it.src === 'pad') it.breath = it.breathA;
  else { const tgt = held ? 1 : 0; it.breath += G.clamp(tgt - it.breath, -dt / 4, dt / 4); }
  it.effort = it.breathA != null && it.src === 'pad' ? it.breathA : (held ? .6 : 0);
  it.catchL = pr('catchL'); it.catchR = pr('catchR'); it.paceL = pr('paceL'); it.paceR = pr('paceR'); it.jump = pr('jump'); it.confirm = pr('confirm');
  for (const a of ['stepL', 'stepR', 'stepU', 'stepD']) it.stepP[a] = pr(a);
  it.moved = Math.hypot(it.ux, it.uy) > .08 || it.breathHeld; return it;
};

// ---- bots (tests, attract, class fill-ins) ----------------------------------------------------------
G.BOTS = { poor: { tau: .34, gain: 1.1, damp: .22, noise: .16 }, average: { tau: .25, gain: 1.4, damp: .30, noise: .08 }, good: { tau: .18, gain: 1.8, damp: .36, noise: .04 }, expert: { tau: .14, gain: 2.2, damp: .42, noise: .02 } };
class Bot {
  constructor(skill, rng) { this.P = G.BOTS[skill] || G.BOTS.average; this.rng = rng || E.rng(7); this.n = noise(this.rng, 2.1); this.n2 = noise(this.rng, 1.7); this.hist = []; this.u = { x: 0, y: 0 }; this.t = 0; this.skill = skill; }
  // returns u for balance bal; goal: optional target point (defaults to ring centre)
  lean(bal, dt, goal) {
    this.t += dt; this.hist.push([this.t, bal.p.x, bal.p.y, bal.v.x, bal.v.y]); while (this.hist.length > 2 && this.hist[1][0] < this.t - this.P.tau) this.hist.shift();
    const h = this.hist[0], gx = goal ? goal[0] : bal.center[0], gy = goal ? goal[1] : bal.center[1];
    let tx = -this.P.gain * (h[1] - gx) - this.P.damp * h[3] + this.P.noise * this.n(this.t), ty = -this.P.gain * (h[2] - gy) - this.P.damp * h[4] + this.P.noise * this.n2(this.t);
    if (bal.set.s > bal.set.k * .8) { tx += gx * (bal.set.s / bal.set.k) * 1.0; ty += gy * (bal.set.s / bal.set.k) * 1.0; }
    const e = Math.min(1, dt * 16); this.u.x += (tx - this.u.x) * e; this.u.y += (ty - this.u.y) * e;
    const m = Math.hypot(this.u.x, this.u.y); if (m > 1) { this.u.x /= m; this.u.y /= m; }
    return this.u;
  }
}
G.Bot = Bot;

// pure sim for tests: share of time in the ring over secs
G.simLean = (setName, skill, seed, secs, movingRing) => {
  const set = G.SETS[setName], rng = E.rng(seed), bal = new Balance(set, rng), bot = skill === 'passive' ? null : new Bot(skill, E.rng(seed * 7 + 1));
  const dt = 1 / 120; let nextC = 12;
  for (let t = 0; t < secs; t += dt) {
    if (movingRing && t >= nextC - 12) { if (t === 0 || t >= nextC - 12 + 1e-9) { /* handled below */ } }
    if (movingRing && Math.abs(t % 12) < dt) { const a = rng() * 6.283, d = .25 + rng() * .25; bal.center = [Math.cos(a) * d, Math.sin(a) * d]; }
    if (bot) { const u = bot.lean(bal, dt); bal.u.x = u.x; bal.u.y = u.y; } else { bal.u.x = 0; bal.u.y = 0; }
    bal.step(dt);
  }
  return { pct: bal.steadiness, falls: bal.falls };
};

// ---- the Plate ------------------------------------------------------------------------------------
G.drawPlate = (r, bal, cx, cy, rad, o) => {
  o = o || {}; rad = rad || 26;
  r.overlay(g => {
    const al = o.alpha == null ? 1 : o.alpha;
    px.blend(g, al, 'normal', () => {
      px.disc(g, cx, cy + 2, rad + 1, '#9fbcc4'); px.disc(g, cx, cy, rad, '#f6fafa'); px.disc(g, cx, cy, rad - 3, '#e6f0f2');
      const inR = bal.inRing, R = bal.R * rad, rx = cx + bal.center[0] * rad, ry = cy - bal.center[1] * rad;
      if (o.hideRing) return;
      px.disc(g, rx, ry, R + 2, inR ? '#7fe3b8' : '#2cc6e6'); px.disc(g, rx, ry, Math.max(1, R - 1), inR ? '#bfeee0' : '#e6f0f2');
      if (inR && (G.game.time * 6 | 0) % 2) { px.dot(g, rx + R * .6, ry - R * .6, '#fff'); }
      const tr = bal.trail; for (let i = 0; i < tr.length; i += 6) px.dot(g, cx + tr[i][0] * rad, cy - tr[i][1] * rad, '#9ad8e6');
      const dx = cx + bal.p.x * rad, dy = cy - bal.p.y * rad;
      px.disc(g, dx, dy, 3.5, bal.edge > .2 ? '#e0553a' : '#ff7a59'); px.disc(g, dx - 1, dy - 1, 1, '#ffd0c0');
      if (bal.stumbleT > 0) px.disc(g, dx, dy, 5, '#e0553a');
    });
  });
};
})();
