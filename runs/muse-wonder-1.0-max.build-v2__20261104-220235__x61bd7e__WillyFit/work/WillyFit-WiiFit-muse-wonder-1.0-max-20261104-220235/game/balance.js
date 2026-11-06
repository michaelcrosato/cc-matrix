// Willy Fit — the Lean: balance model, intent sources (devices + bots), the Plate.
window.G = window.G || {};
(function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function makeNoise(rng, f) {
    const ph = [rng() * 6.28, rng() * 6.28, rng() * 6.28];
    return t => (Math.sin(t * f + ph[0]) + 0.6 * Math.sin(t * f * 1.73 + ph[1]) + 0.35 * Math.sin(t * f * 2.61 + ph[2])) / 1.3;
  }
  G.makeNoise = makeNoise;
  G.Balance = class Balance {
    constructor(params, rng) {
      this.p = { x: 0, y: 0 }; this.v = { x: 0, y: 0 }; this.u = { x: 0, y: 0 };
      this.params = params; this.rng = rng || Math.random;
      this.nx = makeNoise(this.rng, (params.nf || 1.2)); this.ny = makeNoise(this.rng, (params.nf || 1.2) * 0.9);
      this.t = 0; this.fx = 0; this.fy = 0; this.stumbleT = 0; this.falls = 0;
      this.inRing = 0; this.steps = 0; this.ring = { x: 0, y: 0 }; this.trail = [];
      this.gentle = false;
    }
    ringR() { const g = (window.G && G.game && G.game.settings && G.game.settings.gentle) ? 1.25 : 1; return (this.params.R || 0.24) * G.DEV.ringScale * g; }
    step(dt, u) {
      const P = this.params, dev = G.DEV;
      const k = P.k * (dev.k / 12), c = P.c * (dev.c / 6), sBase = P.s;
      const gentle = !!(G.game && G.game.settings && G.game.settings.gentle);
      const s = sBase * (gentle ? 0.7 : 1) * (dev.s / 8 || 1) * (P.s === 0 ? 0 : 1) * (sBase === 0 ? 0 : 1);
      const sEff = P.s === 0 ? 0 : s;
      const A = (P.A || 0) * (gentle ? 0.7 : 1) * (dev.A / 3 || 1);
      this.t += dt;
      if (this.stumbleT > 0) {
        this.stumbleT -= dt;
        this.p.x += (0 - this.p.x) * Math.min(1, dt * 4); this.p.y += (0 - this.p.y) * Math.min(1, dt * 4);
        this.v.x = 0; this.v.y = 0;
      } else {
        this.u.x = u ? u.x : 0; this.u.y = u ? u.y : 0;
        const ax = k * (this.u.x - this.p.x) - c * this.v.x + sEff * this.p.x + A * this.nx(this.t) + this.fx;
        const ay = k * (this.u.y - this.p.y) - c * this.v.y + sEff * this.p.y + A * this.ny(this.t) + this.fy;
        this.v.x += ax * dt; this.v.y += ay * dt; this.p.x += this.v.x * dt; this.p.y += this.v.y * dt;
        if (Math.hypot(this.p.x, this.p.y) >= (G.DEV.noStumble ? 99 : G.DEV.stumbleAt) && G.DEV.stumbleAt > 0) {
          this.stumbleT = 1; this.falls++; this.p.x *= 0.3; this.p.y *= 0.3; this.v.x = 0; this.v.y = 0;
          if (this.onStumble) this.onStumble();
        }
      }
      this.fx = 0; this.fy = 0;
      const d = Math.hypot(this.p.x - this.ring.x, this.p.y - this.ring.y);
      this.steps++;
      if (d <= this.ringR()) this.inRing++;
      this.trail.push([this.p.x, this.p.y]); if (this.trail.length > 120) this.trail.shift();
    }
    steadiness() { return this.steps ? this.inRing / this.steps : 0; }
    speed() { return Math.hypot(this.v.x, this.v.y); }
  };
  G.BOTS = {
    passive: { tau: 9, gain: 0, damp: 0, noise: 0 },
    poor: { tau: 0.34, gain: 1.1, damp: 0.22, noise: 0.16 },
    average: { tau: 0.25, gain: 1.4, damp: 0.30, noise: 0.08 },
    good: { tau: 0.18, gain: 1.8, damp: 0.36, noise: 0.04 },
    expert: { tau: 0.14, gain: 2.2, damp: 0.42, noise: 0.02 }
  };
  G.makeBot = function (skill, seed) {
    const cfg = G.BOTS[skill] || G.BOTS.average;
    let s = (seed || 1234) >>> 0;
    const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    const nx = makeNoise(rnd, 0.7), ny = makeNoise(rnd, 0.6);
    const hist = []; let u = { x: 0, y: 0 }, t = 0;
    return {
      skill: skill, cfg: cfg,
      intent: function (bal, dt, ring) {
        t += dt;
        hist.push({ px: bal.p.x, py: bal.p.y, vx: bal.v.x, vy: bal.v.y, t: t });
        while (hist.length && hist[0].t < t - cfg.tau - 0.2) hist.shift();
        let seen = hist[0] || { px: bal.p.x, py: bal.p.y, vx: bal.v.x, vy: bal.v.y };
        for (const h of hist) if (Math.abs(h.t - (t - cfg.tau)) < Math.abs(seen.t - (t - cfg.tau))) seen = h;
        const rx = ring ? ring.x : 0, ry = ring ? ring.y : 0;
        let tx = rx + (-cfg.gain * (seen.px - rx) - cfg.damp * seen.vx) + cfg.noise * nx(t);
        let ty = ry + (-cfg.gain * (seen.py - ry) - cfg.damp * seen.vy) + cfg.noise * ny(t);
        // aim at ring: bot target is lean that centres p on ring
        tx = rx + (-cfg.gain * (seen.px - rx) - cfg.damp * seen.vx) + cfg.noise * nx(t);
        ty = ry + (-cfg.gain * (seen.py - ry) - cfg.damp * seen.vy) + cfg.noise * ny(t);
        if (skill === 'passive') { tx = 0; ty = 0; }
        u.x += (tx - u.x) * Math.min(1, dt * 16); u.y += (ty - u.y) * Math.min(1, dt * 16);
        const l = Math.hypot(u.x, u.y); if (l > 1) { u.x /= l; u.y /= l; }
        return { lean: { x: u.x, y: u.y }, breath: 0, breathHeld: false };
      }
    };
  };
  // Device intent: fills {lean, breath...} from game.input. Keyboard nudges, mouse holds, pad direct.
  G.DeviceIntent = class DeviceIntent {
    constructor(input) { this.input = input; this.u = { x: 0, y: 0 }; this.kb = { x: 0, y: 0 }; this.lastKeyT = -9; this.breathLevel = 0; }
    read(dt, game) {
      const inp = this.input, dev = G.DEV;
      let lean = { x: 0, y: 0 }, src = 'stick';
      // gamepad stick via move()
      let mv = [0, 0];
      try { mv = inp.move ? inp.move() : [0, 0]; } catch (e) { mv = [0, 0]; }
      const padActive = Math.hypot(mv[0], mv[1]) > 0.18 && inp.lastDevice === 'gamepad';
      const keyX = (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0);
      const keyY = (inp.down('down') ? 1 : 0) - (inp.down('up') ? 1 : 0);
      // WASD lean keys: A/D left/right, W/S forward/back via step actions too
      const lx = (inp.down('stepR') ? 1 : 0) - (inp.down('stepL') ? 1 : 0);
      const ly = (inp.down('stepD') ? 1 : 0) - (inp.down('stepU') ? 1 : 0);
      const kx = keyX || lx, ky = keyY || ly;
      if (kx || ky) this.lastKeyT = game ? game.time : 0;
      // mouse
      let mouseLean = null, mouseT = -9;
      try {
        const pt = inp.pointer ? inp.pointer() : null;
        if (pt && game && game.r) { const H = game.r.H || 240; mouseLean = { x: clamp((pt[0] - (game.r.W || 320) / 2) / (H * dev.mouseReach), -1, 1), y: clamp((pt[1] - (game.r.H || 240) / 2) / (H * dev.mouseReach), -1, 1) }; mouseT = inp.mouse && inp.mouse.t != null ? inp.mouse.t : -9; }
      } catch (e) {}
      const useMouse = mouseLean && (mouseT > this.lastKeyT + 0.001) && !padActive && !(kx || ky);
      if (padActive) { lean = { x: clamp(mv[0], -1, 1), y: clamp(mv[1], -1, 1) }; this.u = { x: lean.x, y: lean.y }; src = 'gamepad'; }
      else if (useMouse) { lean = mouseLean; this.u = { x: lean.x, y: lean.y }; src = 'mouse'; }
      else {
        // keyboard nudge
        if (kx || ky) { this.kb.x = clamp(this.kb.x + kx * dev.nudgeRate * dt, -1, 1); this.kb.y = clamp(this.kb.y + ky * dev.nudgeRate * dt, -1, 1); }
        else { this.kb.x += (0 - this.kb.x) * Math.min(1, dt * 0.5 * 2); this.kb.y += (0 - this.kb.y) * Math.min(1, dt * 0.5 * 2); }
        lean = { x: this.kb.x, y: this.kb.y }; src = 'keyboard';
      }
      // breath: analog value or ramp
      let bHeld = false, bVal = 0;
      try { bVal = inp.value ? inp.value('breath') : 0; bHeld = inp.down('breath'); } catch (e) {}
      const toggle = G.game && G.game.settings && G.game.settings.breathToggle;
      if (toggle) { if (inp.pressed && inp.pressed('breath')) this._tog = !this._tog; this.breathLevel = this._tog ? Math.min(1, this.breathLevel + dt / 1) : Math.max(0, this.breathLevel - dt / 1); }
      else if (bVal > 0.05) this.breathLevel = clamp(bVal, 0, 1);
      else this.breathLevel = clamp(this.breathLevel + ((bHeld ? 1 : -1) * dt / 4), 0, 1);
      return { lean: lean, breath: this.breathLevel, breathHeld: bHeld || this.breathLevel > 0.5, source: src };
    }
  };
  G.drawPlate = function (r, cx, cy, bal, opts) {
    opts = opts || {};
    const E = G.E, px = E.px;
    const rad = opts.r || 26;
    r.overlay(g => {
      // trail
      const tr = bal.trail || [];
      for (let i = 0; i < tr.length; i++) {
        const a = i / Math.max(1, tr.length);
        px.disc(g, cx + tr[i][0] * rad, cy - tr[i][1] * rad, 1, a > 0.8 ? '#8fd8c8' : '#cfe8e2');
      }
      px.disc(g, cx, cy, rad + 3, '#20404c'); px.disc(g, cx, cy, rad, '#ffffff');
      const R = bal.ringR() * rad, inRing = Math.hypot(bal.p.x - bal.ring.x, bal.p.y - bal.ring.y) <= bal.ringR();
      // ring
      const col = bal.stumbleT > 0 ? '#e0553a' : inRing ? '#2fbf8f' : '#2cc6e6';
      for (let a = 0; a < 24; a++) { const t = a / 24 * Math.PI * 2; px.disc(g, cx + bal.ring.x * rad + Math.cos(t) * R, cy - bal.ring.y * rad + Math.sin(t) * R, 1, col); }
      px.disc(g, cx + bal.p.x * rad, cy - bal.p.y * rad, 3, '#ff7a59'); px.disc(g, cx + bal.p.x * rad - 1, cy - bal.p.y * rad - 1, 1, '#ffffff');
      if (opts.small) E.font.text(g, opts.label || '', cx, cy + rad + 5, '#20404c', { align: 'center' });
    });
  };
})();
