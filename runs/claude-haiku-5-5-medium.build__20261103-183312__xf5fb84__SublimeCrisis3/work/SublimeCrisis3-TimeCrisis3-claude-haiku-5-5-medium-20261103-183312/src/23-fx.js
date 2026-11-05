// 23-fx.js: the presentation's effects (plan 4.8, 4.13): tracers, muzzle flashes, sparks, explosions, popups and banners.
// They live in one list with a life each, read from the sim's events. Everything here is cosmetic: none of it changes
// the sim. The FX are drawn in screen space over each viewport, projected with that viewport's camera.
TC.FX = class FX {
  constructor() { this.list = []; this.banners = []; this.popups = []; this.shake = 0; this.flash = null; this.hurt = 0; }

  add(e) { this.list.push(Object.assign({ t: 0, life: 0.2 }, e)); }

  // A banner is a line of text across the middle of the screen: ACTION!, WAIT, STAGE CLEAR, TIDE'S IN!, ...
  banner(text, color = '#ffffff', seconds = 1.2, scale = 4, sub = null) {
    this.banners.push({ text, color, t: 0, life: seconds, scale, sub });
  }
  // A popup is a number or word at a world point; it rises and fades.
  popup(at, text, color = '#ffffff', seconds = 0.9) {
    this.popups.push({ at, text, color, t: 0, life: seconds });
  }

  update(dt) {
    for (const f of this.list) f.t += dt;
    this.list = this.list.filter(f => f.t < f.life);
    for (const b of this.banners) b.t += dt;
    this.banners = this.banners.filter(b => b.t < b.life);
    for (const p of this.popups) p.t += dt;
    this.popups = this.popups.filter(p => p.t < p.life);
    this.shake = Math.max(0, this.shake - dt * 1.6);
    this.hurt = Math.max(0, this.hurt - dt * 1.4);
    if (this.flash) { this.flash.t += dt; if (this.flash.t >= this.flash.life) this.flash = null; }
  }

  // Draw the world-anchored FX into a viewport: raster is the Raster (for projection), g the 2D context.
  drawWorld(g, raster, x0, y0) {
    for (const f of this.list) {
      const u = TC.clamp(f.t / f.life, 0, 1);
      if (f.kind === 'tracer') {
        const a = raster.project(f.from), b = raster.project(f.to);
        if (!a && !b) continue;
        const A = a || [raster.cxp, raster.cyp + 40, 1], B = b || [raster.cxp, raster.cyp, 1];
        g.globalAlpha = 1 - u;
        g.strokeStyle = f.color || '#ffe9a0';
        g.lineWidth = f.width || 1;
        g.beginPath(); g.moveTo(x0 + A[0], y0 + A[1]); g.lineTo(x0 + B[0], y0 + B[1]); g.stroke();
        g.globalAlpha = 1;
      } else if (f.kind === 'flash') {
        const p = raster.project(f.at);
        if (!p) continue;
        const r = (f.r || 6) * (1 - u) * Math.max(1, raster.F / p[2]) * 0.25 + 1;
        g.fillStyle = f.color || '#ffd36a';
        g.globalAlpha = 1 - u;
        g.beginPath(); g.arc(x0 + p[0], y0 + p[1], r, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
      } else if (f.kind === 'spark') {
        const p = raster.project(f.at);
        if (!p) continue;
        const n = f.n || 6;
        g.fillStyle = f.color || '#fff2b0';
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2 + (f.seed || 0);
          const d = u * (f.spread || 10);
          g.globalAlpha = 1 - u;
          g.fillRect(x0 + p[0] + Math.cos(a) * d, y0 + p[1] + Math.sin(a) * d - u * 4, 1, 1);
        }
        g.globalAlpha = 1;
      } else if (f.kind === 'boom') {
        const p = raster.project(f.at);
        if (!p) continue;
        const rad = (f.rad || 40) * u * Math.max(1, raster.F / p[2]) * 0.18 + 2;
        g.globalAlpha = (1 - u) * 0.85;
        g.fillStyle = '#ffb347';
        g.beginPath(); g.arc(x0 + p[0], y0 + p[1], rad, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff3b0';
        g.beginPath(); g.arc(x0 + p[0], y0 + p[1], rad * 0.5, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
      }
    }
    for (const pu of this.popups) {
      const p = raster.project(pu.at);
      if (!p) continue;
      const u = TC.clamp(pu.t / pu.life, 0, 1);
      g.globalAlpha = 1 - u * u;
      TC.text(g, pu.text, x0 + p[0], y0 + p[1] - 8 - u * 12, pu.color, { align: 'center', scale: 1 });
      g.globalAlpha = 1;
    }
  }
};

// Text on the buffer: the engine's pixel font, with an outline so it reads over any picture.
TC.text = function (g, s, x, y, color, o = {}) {
  if (!E.font) return;
  E.font.text(g, s, Math.round(x), Math.round(y), color, Object.assign({ outline: '#05070f', scale: 1 }, o));
};
