/* balance.js: the Lean. Every activity's body is one Balance; every input device, bot and replay fills one `intent`. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { clamp } = E, game = G.game;
const DT = 1 / 120;

/* ---- smooth noise: three sines with seeded phases ---- */
const noise = (rng, f) => { const ph = [rng() * 6.28, rng() * 6.28, rng() * 6.28];
  return t => (Math.sin(t * f + ph[0]) + .6 * Math.sin(t * f * 1.73 + ph[1]) + .35 * Math.sin(t * f * 2.61 + ph[2])) / 1.3; };
G.noise = noise;

/* ---- the model ---- */
class Balance {
  /** set: { k, c, s, A, nf, R, pushV, pushEvery, sx?, sy? } (sx/sy: per-axis instability). rng: seeded. */
  constructor(set, rng) {
    this.set = Object.assign({}, set); this.rng = rng;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.ux = 0; this.uy = 0; this.t = 0;
    this.nx = noise(rng, set.nf || 1); this.ny = noise(rng, (set.nf || 1) * 1.07);
    this.fx = 0; this.fy = 0;           // this step's scripted push (a gull, a gust, a thought)
    this.falls = 0; this.stumbling = 0; this.fallT = 0; this.pushIn = set.pushEvery || 0;
    this.ringX = 0; this.ringY = 0; this.inRingT = 0; this.totalT = 0; this.inRing = false; this.streak = 0;
    this.frozen = false; this.cheat = false; this.trail = [];
    this.extraS = 0; this.axis = null;   // axis: 'x' keeps only x (the rope)
  }
  /** the ring's radius now, with Gentle Mode and the dev slider */
  get R() { return (this.set.R || .2) * G.DEV.ring * (G.gentle() ? 1.25 : 1); }
  retarget(o) { Object.assign(this.set, o); }
  kick(vx, vy) { this.vx += vx; this.vy += vy; }
  /** one fixed step */
  step(dt, ux, uy) {
    const d = G.DEV, g = G.gentle(), set = this.set;
    this.t += dt; this.ux = ux; this.uy = uy;
    if (this.frozen || dt === 0) return;
    if (this.stumbling > 0) {   // input ignored, p eases home
      this.stumbling -= dt; const e = Math.min(1, dt * 4); this.x += (0 - this.x) * e; this.y += (0 - this.y) * e; this.vx *= 1 - e; this.vy *= 1 - e; this.fx = this.fy = 0;
      this.totalT += dt; this.inRing = false; this.streak = 0; this._trail(dt); return;
    }
    const k = set.k * d.k, c = set.c * d.c, gs = g ? .7 : 1, A = (set.A || 0) * d.A * gs;
    const sx = ((set.sx !== undefined ? set.sx : set.s) * d.s + this.extraS) * gs, sy = ((set.sy !== undefined ? set.sy : set.s) * d.s + this.extraS) * gs;
    const t = this.t * d.nf;
    const ax = k * (ux - this.x) - c * this.vx + sx * this.x + A * this.nx(t) + this.fx;
    let ay = k * (uy - this.y) - c * this.vy + sy * this.y + A * this.ny(t) + this.fy;
    if (this.axis === 'x') ay = -this.y * 20 - this.vy * 8;
    this.vx += ax * dt; this.vy += ay * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    this.fx = this.fy = 0;
    if (set.pushEvery) {
      this.pushIn -= dt;
      if (this.pushIn <= 0) { this.pushIn = set.pushEvery * (.8 + .4 * this.rng()); const a = this.rng() * 6.283, v = set.pushV * d.push; this.vx += Math.cos(a) * v; if (this.axis !== 'x') this.vy += Math.sin(a) * v; else this.vx += Math.cos(a) * v * .3; this.onPush && this.onPush(); }
    }
    this.totalT += dt;
    const inside = Math.hypot(this.x - this.ringX, this.y - this.ringY) <= this.R;
    this.inRing = inside; if (inside) { this.inRingT += dt; this.streak += dt; } else this.streak = 0;
    const lim = d.stumble;
    if (Math.hypot(this.x, this.y) >= lim) {
      if (this.cheat || d.noStumble) { const l = Math.hypot(this.x, this.y) / (lim * .98); this.x /= l; this.y /= l; this.vx *= .5; this.vy *= .5; }
      else this.stumble();
    }
    this._trail(dt);
  }
  _trail(dt) { this.fallT += dt; if (this.fallT > 1 / 30) { this.fallT = 0; this.trail.push(this.x, this.y); if (this.trail.length > 60) this.trail.splice(0, 2); } }
  stumble() { this.falls++; this.stumbling = 1; this.streak = 0; this.onStumble && this.onStumble(); }
  get steadiness() { return this.totalT > 0 ? this.inRingT / this.totalT : 0; }
  get edge() { return clamp(Math.hypot(this.x, this.y), 0, 1); }
}
G.Balance = Balance;

/* ---- bots: react to where p was tau seconds ago ---- */
G.BOTS = {
  poor: { tau: .34, gain: 1.1, damp: .22, noise: .16 },
  average: { tau: .25, gain: 1.4, damp: .30, noise: .08 },
  good: { tau: .18, gain: 1.8, damp: .36, noise: .04 },
  expert: { tau: .14, gain: 2.2, damp: .42, noise: .02 }
};
class BotBrain {
  constructor(skill, rng) {
    this.skill = skill; this.p = G.BOTS[skill]; this.rng = rng; this.nx = noise(rng, 2.1); this.ny = noise(rng, 2.4); this.t = 0; this.ux = 0; this.uy = 0;
    this.hist = []; this.head = 0;
  }
  /** returns [ux, uy]: hold p at (cx, cy). fx, fy: feed-forward lean to add (what a player has learned the spot needs) */
  hold(dt, bal, cx = 0, cy = 0, ffx = 0, ffy = 0) {
    this.t += dt;
    const p = this.p, n = Math.max(1, Math.round(p.tau / DT)), H = this.hist;
    H.push(bal.x, bal.y, bal.vx, bal.vy); if (H.length > (n + 1) * 4) H.splice(0, 4);
    const sx = H[0], sy = H[1], svx = H[2], svy = H[3];
    let tx = -p.gain * (sx - cx) - p.damp * svx + p.noise * this.nx(this.t) + ffx, ty = -p.gain * (sy - cy) - p.damp * svy + p.noise * this.ny(this.t) + ffy;
    const e = Math.min(1, dt * 16); this.ux += (tx - this.ux) * e; this.uy += (ty - this.uy) * e;
    const l = Math.hypot(this.ux, this.uy); if (l > 1) { this.ux /= l; this.uy /= l; }
    return [this.ux, this.uy];
  }
}
G.BotBrain = BotBrain;

/* ---- intent: what activities read. Devices, bots and attract all fill this one object ---- */
G.newIntent = () => ({ x: 0, y: 0, rawX: 0, rawY: 0, breath: 0, catchL: false, catchR: false, jump: false, walk: 0, paceL: false, paceR: false, steps: [false, false, false, false], source: 'keyboard', touched: false });

/** reads one player's devices into an intent, natively for each: a stick is a position, keys nudge, a mouse points */
class DeviceReader {
  constructor(input, o = {}) {
    this.input = input; this.ux = 0; this.uy = 0; this.breathLevel = 0; this.breathOn = false; this.source = input.lastDevice === 'gamepad' ? 'gamepad' : 'keyboard'; this.keyT = -100;
    this.mouseAllowed = o.mouse !== false; this.lanes = o.lanes || null; this.rawKX = 0; this.rawKY = 0; this.mouseStart = input.mouse ? input.mouse.t : 0;
  }
  sourceNow() {
    const I = this.input;
    if (I.lastDevice === 'gamepad') return 'gamepad';
    if (this.mouseAllowed && I.mouse && I.mouse.active && I.mouse.t > this.keyT && I.mouse.t > this.mouseStart) return 'mouse';
    return 'keyboard';
  }
  read(dt, intent, o = {}) {
    const I = this.input, d = G.DEV;
    const dx = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0), dy = o.axisX ? 0 : (I.down('up') ? 1 : 0) - (I.down('down') ? 1 : 0);
    if (dx || dy) this.keyT = I.clock;
    if (I.pressed('breath') && I.lastDevice !== 'mouse' && I.lastDevice !== 'gamepad') this.keyT = I.clock;
    const src = this.source = this.sourceNow(); intent.source = src;
    const pad = I.padMove || [0, 0], padOn = Math.hypot(pad[0], pad[1]) > 0;
    if (src === 'gamepad' && padOn) { this.ux = pad[0]; this.uy = -pad[1]; intent.rawX = pad[0]; intent.rawY = -pad[1]; intent.stick = true; }
    else if (src === 'mouse' && !o.overPanel) {
      const p = I.pointer();
      if (p) { const reach = game.H * d.reach, x = (p[0] - game.W / 2) / reach, y = -(p[1] - game.H / 2) / reach, l = Math.hypot(x, y) > 1 ? Math.hypot(x, y) : 1; this.ux = x / l; this.uy = y / l; intent.rawX = this.ux; intent.rawY = this.uy; }
    } else if (src !== 'mouse') {   // keys (or a d-pad): a nudge. While held, u moves toward the direction; released, it drifts home
      const rate = d.nudge * (o.keyRate || 1), home = o.keyHome || .5;
      if (dx) this.ux += dx * rate * dt; else this.ux = E.approach(this.ux, 0, home * dt);
      if (dy) this.uy += dy * rate * dt; else this.uy = E.approach(this.uy, 0, home * dt);
      const l = Math.hypot(this.ux, this.uy); if (l > 1) { this.ux /= l; this.uy /= l; }
      if (src === 'gamepad' && !dx && !dy) { this.ux = E.approach(this.ux, 0, 4 * dt); this.uy = E.approach(this.uy, 0, 4 * dt); }
      intent.rawX = dx; intent.rawY = dy;
    }
    if (dx || dy || padOn || (src === 'mouse' && I.mouse.t > this.mouseStart)) intent.touched = true;
    intent.x = this.ux; intent.y = this.uy;
    // breath / effort: an analog trigger is the level; keys and buttons ramp it by 1 over 4 s
    const toggle = game.settings.breathMode === 'Toggle', hasBreath = !!I.map.breath;
    if (hasBreath) {
      if (src === 'gamepad' && !toggle) { this.breathLevel = I.value('breath'); }
      else {
        if (toggle) { if (I.pressed('breath')) this.breathOn = !this.breathOn; } else this.breathOn = I.down('breath');
        this.breathLevel = clamp(this.breathLevel + (this.breathOn ? dt : -dt) / 4, 0, 1);
      }
      intent.breath = this.breathLevel;
    }
    intent.breathHeld = hasBreath && I.down('breath');
    intent.catchL = !!I.map.catchL && I.pressed('catchL'); intent.catchR = !!I.map.catchR && I.pressed('catchR');
    intent.jump = !!I.map.jump && I.pressed('jump');
    intent.walk = I.map.walk ? (src === 'gamepad' ? I.value('walk') : (I.down('walk') ? .6 : 0)) : 0;
    intent.paceL = !!I.map.paceL && I.pressed('paceL'); intent.paceR = !!I.map.paceR && I.pressed('paceR');
    return intent;
  }
}
G.DeviceReader = DeviceReader;

/* ---- the Plate: the game's signature HUD ---- */
const P_WHITE = '#fbfdfd', P_RIM = '#c8dde2', P_MINT = '#7fe0c3', P_INK = '#20404c', P_CORAL = '#ff7a59';
/** o: { x, y, r, ring: [cx, cy, R] | null, inRing, color, trail, hide: draws nothing, label } */
G.drawPlate = (g, bal, o = {}) => {
  const px = E.px, x = Math.round(o.x), y = Math.round(o.y), R = o.r || 26;
  px.disc(g, x, y + 2, R + 2, '#9fc0c8');
  px.disc(g, x, y, R + 2, P_RIM);
  px.disc(g, x, y, R, P_WHITE);
  // the danger edge: warm near the rim
  const edge = bal.edge;
  if (edge > .7) { const n = 28, c = edge > .88 ? '#ff8a6a' : '#ffc9a8'; for (let i = 0; i < n; i++) { const a = i / n * 6.283; px.dot(g, Math.round(x + Math.cos(a) * (R - 1)), Math.round(y + Math.sin(a) * (R - 1)), c); } }
  // the cross
  px.rect(g, x - R + 3, y, 2 * R - 5, 1, '#e2eef0'); px.rect(g, x, y - R + 3, 1, 2 * R - 5, '#e2eef0');
  // the ring: mint and filled while inside (shape and colour both say so)
  const rg = o.ring; if (rg) {
    const rx = x + rg[0] * R, ry = y - rg[1] * R, rr = Math.max(2, rg[2] * R);
    if (bal.inRing) { px.disc(g, Math.round(rx), Math.round(ry), Math.round(rr), '#bff3e2'); }
    const n = Math.max(12, Math.round(rr * 3)); for (let i = 0; i < n; i++) { const a = i / n * 6.283; const pxx = Math.round(rx + Math.cos(a) * rr), pyy = Math.round(ry + Math.sin(a) * rr); px.dot(g, pxx, pyy, bal.inRing ? P_MINT : '#2cc6e6'); if (bal.inRing || R > 20) px.dot(g, pxx, pyy + (Math.sin(a) > 0 ? -1 : 1), bal.inRing ? P_MINT : '#7fd8ea'); }
  }
  // the trail of the last second
  const tr = bal.trail; for (let i = Math.max(0, tr.length - 60); i < tr.length; i += 2) { const k = i / tr.length; if (k < .35) continue; px.dot(g, Math.round(x + tr[i] * R), Math.round(y - tr[i + 1] * R), k > .75 ? '#ffb7a3' : '#ffd8cc'); }
  // the dot
  const dx = Math.round(x + clamp(bal.x, -1, 1) * R), dy = Math.round(y - clamp(bal.y, -1, 1) * R), col = o.color || P_CORAL;
  px.disc(g, dx, dy, R > 20 ? 3 : 2, P_INK); px.disc(g, dx, dy, R > 20 ? 2 : 1, col);
  if (bal.stumbling > 0) { const f = Math.floor(game.real * 8) % 2; if (f) px.disc(g, dx, dy, R > 20 ? 4 : 3, '#ffd0c0'); }
};
})();
