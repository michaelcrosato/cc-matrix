/* Lean: one heavy body on an unstable board. The section 3 trial and every activity share this step. */
var G = G || {};
(function () {
  'use strict';
  const E = My3D2dge;
  const DT = 1 / 120;
  G.BOTS = {
    poor: { tau: .34, gain: 1.1, damp: .22, noise: .16 },
    average: { tau: .25, gain: 1.4, damp: .30, noise: .08 },
    good: { tau: .18, gain: 1.8, damp: .36, noise: .04 },
    expert: { tau: .14, gain: 2.2, damp: .42, noise: .02 }
  };
  G.SETS = {
    body: { k: 14, c: 7, s: 4, A: 3, nf: 1.1, R: .20, push: null, band: { passive: 50, poor: 76, average: 99, good: 100 } },
    sun: { k: 12, c: 6, s: 6, A: 3.2, nf: 1.3, R: .28, push: [.5, 9], band: { passive: 53, poor: 78, average: 99, good: 100 } },
    stork1: { k: 12, c: 5, s: 13, A: 3, nf: 1.5, R: .24, push: [.6, 7], band: { passive: 20, poor: 30, average: 68, good: 95 } },
    stork2: { k: 11, c: 4.5, s: 15, A: 3.6, nf: 1.7, R: .22, push: [.7, 6], band: { passive: 22, poor: 15, average: 29, good: 54 } },
    candle: { k: 10, c: 5, s: 11, A: 1.4, nf: .8, R: .20, push: [.55, 5], band: { passive: 14, poor: 59, average: 95, good: 100 } },
    laundry: { k: 10, c: 3.5, s: 16, A: 3.5, nf: 1.2, R: .40, push: [.9, 5], band: { passive: 35, poor: 31, average: 39, good: 79 } }
  };
  const noise = (rng, f) => {
    const ph = [rng() * 6.28, rng() * 6.28, rng() * 6.28];
    return t => (Math.sin(t * f + ph[0]) + .6 * Math.sin(t * f * 1.73 + ph[1]) + .35 * Math.sin(t * f * 2.61 + ph[2])) / 1.3;
  };
  function live(set, raw) {
    const d = !raw && G.dev && G.dev.on ? G.dev.v : null;
    return {
      k: set.k * (d ? d.k : 1),
      c: set.c * (d ? d.c : 1),
      s: set.s * (d ? d.s : 1),
      A: set.A * (d ? d.A : 1),
      nf: set.nf * (d ? d.nf : 1),
      R: set.R * (d ? d.ring : 1),
      pushMul: d ? d.push : 1,
      stumbleAt: d ? d.stumble : 1
    };
  }
  class Balance {
    constructor(set, seed, o) {
      o = o || {};
      this.set = set;
      this.raw = !!o.raw;
      this.skill = o.skill || null;
      this.cheat = !!o.cheat;
      this.seed = seed >>> 0;
      const rng = E.rng(this.seed);
      const L0 = live(set, true);
      this.nx = noise(rng, L0.nf);
      this.ny = noise(rng, L0.nf * 1.07);
      this.rng = rng;
      this.push = set.push ? set.push.slice() : null;
      this.pushT = this.push ? rng() * this.push[1] : 0;
      this.pushLeft = 0; this.pfx = 0; this.pfy = 0;
      this.px = 0; this.py = 0; this.vx = 0; this.vy = 0;
      this.ux = 0; this.uy = 0;
      this.hist = [];
      this.stumble = 0; this.falls = 0; this.inside = 0; this.frames = 0; this.t = 0;
      this.trail = [];
      if (this.skill) {
        const br = E.rng((this.seed ^ 0x9e3779b9) >>> 0);
        const b = G.BOTS[this.skill];
        this.bnx = noise(br, .35); this.bny = noise(br, .35 * 1.17); this.bot = b;
      }
    }
    /* One fixed step. ux, uy are the player's lean (ignored while a skill bot owns the body, and while stumbling).
       fx, fy are extra pushes (a gull, a gust, a thought) on top of the table's periodic push.
       c is the ring centre. Steadiness counts a frame only when not stumbling and inside the ring, after the step.
       The last stumble frame can count: stumble is decremented first. */
    step(dt, ux, uy, fx, fy, c) {
      dt = dt || DT;
      fx = fx || 0; fy = fy || 0;
      const cx = c ? c.x || 0 : 0, cy = c ? c.y || 0 : 0;
      const L = live(this.set, this.raw);
      this.hist.push({ x: this.px, y: this.py, vx: this.vx, vy: this.vy });
      if (this.hist.length > 90) this.hist.shift();
      if (this.holdP) {
        this.ux = 0; this.uy = 0; this.vx = 0; this.vy = 0;
      } else if (this.stumble > 0) {
        this.stumble -= dt;
        this.px += (0 - this.px) * Math.min(1, 3 * dt);
        this.py += (0 - this.py) * Math.min(1, 3 * dt);
        this.vx *= Math.max(0, 1 - 8 * dt);
        this.vy *= Math.max(0, 1 - 8 * dt);
        this.ux = 0; this.uy = 0;
      } else {
        if (this.skill && this.bot) {
          const lag = Math.max(0, this.hist.length - 1 - Math.round(this.bot.tau / dt));
          const seen = this.hist[Math.min(this.hist.length - 1, lag)];
          const tx = cx - this.bot.gain * (seen.x - cx) - this.bot.damp * seen.vx + this.bot.noise * this.bnx(this.t);
          const ty = cy - this.bot.gain * (seen.y - cy) - this.bot.damp * seen.vy + this.bot.noise * this.bny(this.t);
          const a = Math.min(1, dt * 16);
          this.ux += (tx - this.ux) * a; this.uy += (ty - this.uy) * a;
          const m = Math.hypot(this.ux, this.uy);
          if (m > 1) { this.ux /= m; this.uy /= m; }
          ux = this.ux; uy = this.uy;
        } else { this.ux = ux || 0; this.uy = uy || 0; }
        let pfx = fx, pfy = fy;
        if (this.push) {
          const speed = this.push[0] * L.pushMul, every = this.push[1];
          this.pushT += dt;
          let use = false, bx = 0, by = 0;
          if (this.pushLeft > 0) { this.pushLeft -= dt; use = true; bx = this.pfx; by = this.pfy; }
          if (this.pushT >= every) {
            this.pushT -= every;
            const ang = this.rng() * Math.PI * 2;
            this.pushLeft = .6;
            this.pfx = Math.cos(ang) * speed * 2;
            this.pfy = Math.sin(ang) * speed * 2;
            use = true; bx = this.pfx; by = this.pfy;
          }
          if (use) { pfx += bx; pfy += by; }
        }
        const dmul = !this.raw && G.dev && G.dev.on ? G.dev.v : null;
        const dk = dmul ? dmul.k : 1, dc = dmul ? dmul.c : 1, ds = dmul ? dmul.s : 1;
        const kx = (this.set.kx != null ? this.set.kx : this.set.k) * dk, ky = (this.set.ky != null ? this.set.ky : this.set.k) * dk;
        const cdx = (this.set.cx != null ? this.set.cx : this.set.c) * dc, cdy = (this.set.cy != null ? this.set.cy : this.set.c) * dc;
        const sx = (this.set.sx != null ? this.set.sx : this.set.s) * ds, sy = (this.set.sy != null ? this.set.sy : this.set.s) * ds;
        const ax = kx * (this.ux - this.px) - cdx * this.vx + sx * this.px + L.A * this.nx(this.t) + pfx;
        const ay = ky * (this.uy - this.py) - cdy * this.vy + sy * this.py + L.A * this.ny(this.t) + pfy;
        this.vx += ax * dt; this.vy += ay * dt; this.px += this.vx * dt; this.py += this.vy * dt;
        if (!this.cheat && Math.hypot(this.px, this.py) >= L.stumbleAt) {
          this.stumble = 1; this.falls++;
          this.vx = 0; this.vy = 0;
          const h = Math.hypot(this.px, this.py) || 1; this.px /= h; this.py /= h;
        }
      }
      const dx = this.px - cx, dy = this.py - cy;
      if (this.stumble <= 0 && Math.hypot(dx, dy) < L.R) this.inside++;
      this.frames++;
      this.t += dt;
      this.trail.push({ x: this.px, y: this.py });
      if (this.trail.length > 120) this.trail.shift();
      return this;
    }
    get steadiness() { return this.frames ? this.inside / this.frames : 0; }
    get p() { return { x: this.px, y: this.py }; }
    get v() { return { x: this.vx, y: this.vy }; }
  }
  G.Balance = Balance;
  /* 45 s, the section 3 seeds. skill 'passive' holds still. raw constants, so a live slider cannot move the table. */
  G.bandTrial = function (name, skill, seed) {
    const set = G.SETS[name];
    const b = new Balance(set, seed >>> 0, { skill: !skill || skill === 'passive' ? null : skill, raw: true });
    const n = Math.round(45 / DT);
    for (let i = 0; i < n; i++) b.step(DT, 0, 0);
    return { pct: b.inside / n * 100, falls: b.falls };
  };
  /* Same seed and the same scripted lean, twice: a hash of the shipped step, not a second copy of it. */
  G.hashRun = function (seed) {
    const R = E.rng(seed >>> 0);
    const b = new Balance(G.SETS.stork1, (seed * 13 + 7) >>> 0, { raw: true });
    let h = 2166136261;
    for (let i = 0; i < 2400; i++) {
      const u = (R() * 2 - 1) * .8, v = (R() * 2 - 1) * .8;
      b.step(DT, u, v);
      h = Math.imul(h ^ ((Math.round(b.px * 500) + 8000) & 65535), 16777619);
      h = Math.imul(h ^ ((Math.round(b.py * 500) + 8000) & 65535), 16777619);
    }
    return h >>> 0;
  };
  G.gentleSet = function (set, on) {
    if (!on) return set;
    return Object.assign({}, set, { R: set.R * 1.25, s: set.s * .7, A: set.A * .7 });
  };
})();
