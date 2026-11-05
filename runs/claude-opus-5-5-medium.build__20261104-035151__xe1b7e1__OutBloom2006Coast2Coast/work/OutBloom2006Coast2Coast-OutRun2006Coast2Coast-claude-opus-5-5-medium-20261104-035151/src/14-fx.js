/* Screen effects (PLAN §7.2): particles in screen space (tyre smoke, petals, sparks, dust, spray, confetti, fireworks),
 * the night grade with emissive glows drawn after it, the pixel bloom (bright pixels summed into a quarter grid,
 * blurred, quantised and added back through an ordered dither: it never blurs the pixel art), the lens flare, speed
 * lines, a sun-shower's rain and a petal storm. Cosmetic only: their own random stream. */
(() => {
'use strict';
const OB = window.OB, E = OB.E, { px } = E;
const rnd = E.rng(0xB100);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
OB.FX = {
  parts: [],
  reduce() { return !!(OB.game && OB.game.reduceMotion); },
  emit(kind, x, y, n = 1, o = {}) {
    if (OB.env.headless) return;
    for (let i = 0; i < n; i++) {
      const p = { kind, x: x + (rnd() - .5) * (o.spread || 6), y: y + (rnd() - .5) * (o.spreadY || o.spread || 4), vx: (o.vx || 0) + (rnd() - .5) * (o.vs || 30), vy: (o.vy || 0) + (rnd() - .5) * (o.vs || 30), life: 0, max: (o.life || .8) * (.7 + rnd() * .6), size: (o.size || 2) * (.7 + rnd() * .6), color: o.color || (o.colors ? o.colors[Math.floor(rnd() * o.colors.length)] : '#ffffff'), g: o.g || 0, spin: rnd() * 6, vp: o.vp };
      this.parts.push(p);
    }
    if (this.parts.length > 900) this.parts.splice(0, this.parts.length - 900);
  },
  step(dt) { for (const p of this.parts) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.spin += dt * 5; } this.parts = this.parts.filter(p => p.life < p.max); },
  clear() { this.parts = []; },
  draw(g, vp) {
    for (const p of this.parts) {
      if (p.vp !== undefined && vp && p.vp !== vp.i) continue;
      const u = p.life / p.max, a = 1 - u;
      if (p.kind === 'smoke' || p.kind === 'dust' || p.kind === 'spray') { const r = p.size * (1 + u * 2.5); px.blend(g, a * (p.kind === 'smoke' ? .55 : .5), 'normal', () => px.disc(g, p.x, p.y, r, p.color)); }
      else if (p.kind === 'spark') px.blend(g, a, 'add', () => px.rect(g, p.x, p.y, Math.max(1, p.size), 1, p.color));
      else if (p.kind === 'petal') { const w = Math.max(1, Math.round(Math.abs(Math.cos(p.spin)) * p.size)); px.rect(g, p.x, p.y, w, Math.max(1, p.size * .7), p.color); }
      else if (p.kind === 'confetti') { const w = Math.max(1, Math.round(Math.abs(Math.cos(p.spin)) * p.size)); px.rect(g, p.x, p.y, w, p.size, p.color); }
      else if (p.kind === 'star') px.blend(g, a, 'add', () => { px.rect(g, p.x - p.size, p.y, p.size * 2 + 1, 1, p.color); px.rect(g, p.x, p.y - p.size, 1, p.size * 2 + 1, p.color); });
      else if (p.kind === 'flame') px.blend(g, a, 'add', () => px.disc(g, p.x, p.y, p.size * (1 - u * .5), u < .4 ? '#fff0a0' : '#ff7a20'));
      else if (p.kind === 'text') E.font.text(g, p.text, Math.round(p.x), Math.round(p.y), p.color, { align: 'center', shadow: '#000', outline: false });
    }
  },
  text(x, y, text, color, vp) { if (OB.env.headless) return; this.parts.push({ kind: 'text', x, y, vx: 0, vy: -22, life: 0, max: 1.1, text, color, g: 0, vp }); },
  /** the night grade (multiply) then every glow collected while drawing, added back */
  grade(g, vp, tod, glows, tunnel) {
    const night = tod.night || 0;
    if (tod.grade) px.blend(g, night ? .35 + .25 * night : .22, 'multiply', () => px.rect(g, vp.x, vp.y, vp.w, vp.h, tod.grade));
    if (tunnel) px.blend(g, .55, 'multiply', () => px.rect(g, vp.x, vp.y, vp.w, vp.h, '#806a58'));
    for (const [x, y, r, c, a, kind, s] of glows) {
      if (kind === 'pool') continue;
      if (!night && !tunnel && kind !== 'lamp' && a < .85 && r > 20) continue;
      const rr = Math.max(1, Math.min(r * (night || tunnel ? 1 : .5), 8 + vp.h * .025)); if (y < vp.y - rr || y > vp.y + vp.h + rr) continue;
      px.blend(g, .1 * a, 'add', () => px.disc(g, x, y, rr, c));
      px.blend(g, .25 * a, 'add', () => px.disc(g, x, y, Math.max(1, rr * .4), c));
    }
  },
  /** pools of light on the road, drawn before the car */
  pools(g, vp, glows) { for (const [x, y, r, c, a, kind] of glows) if (kind === 'pool') { const pr = Math.min(r, vp.w * .22); px.blend(g, .3 * a, 'add', () => px.ell(g, x, y, pr, Math.max(1, pr * .22), c)); } },
  /** the pixel bloom: quarter-resolution bright sums, two box blurs, 4 levels, added back through a Bayer dither */
  bloom(g, vp, strength, tint) {
    if (OB.env.headless || strength <= 0 || !g.getImageData) return;
    const W = Math.floor(vp.w / 4), H = Math.floor(vp.h / 4); if (W < 4 || H < 4) return;
    let img; try { img = g.getImageData(vp.x, vp.y, W * 4, H * 4); } catch (e) { return; }
    const d = img.data, grid = new Float32Array(W * H), th = 200;
    for (let y = 0; y < H * 4; y += 2) for (let x = 0; x < W * 4; x += 2) { const i = (y * W * 4 + x) * 4, l = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; if (l > th) grid[(y >> 2) * W + (x >> 2)] += (l - th) / 55 / 4; }
    const tmp = new Float32Array(W * H);
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H) { s += grid[yy * W + xx]; n++; } } tmp[y * W + x] = s / n; }
      grid.set(tmp);
    }
    const tc = E.hex(tint || '#fff0d0');
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = Math.min(1, grid[y * W + x] * strength * 2.2); if (v < .08) continue;
      const q = Math.round(v * 4) / 4;
      for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) if (q > BAYER[(sy & 3) * 4 + (sx & 3)] * 1.6) { g.fillStyle = `rgb(${tc[0] * .35 | 0},${tc[1] * .32 | 0},${tc[2] * .26 | 0})`; g.fillRect(vp.x + x * 4 + sx, vp.y + y * 4 + sy, 1, 1); }
    }
    g.restore(); px.reset(g);
  },
  /** the lens flare: ghosts along the line from the sun through the screen's centre */
  flare(g, vp, sun, k) {
    if (!sun || k <= 0) return;
    const sx = vp.x + sun.x * vp.w, sy = vp.y + sun.y * vp.h, cx = vp.x + vp.w / 2, cy = vp.y + vp.h / 2;
    const cols = ['#ffe0a0', '#a0ffd0', '#ffa0e0', '#a0c0ff', '#fff0c0'], sizes = [7, 4, 10, 3, 14], at = [.3, .55, .8, 1.1, 1.4];
    for (let i = 0; i < 5; i++) { const x = sx + (cx - sx) * at[i] * 2, y = sy + (cy - sy) * at[i] * 2; px.blend(g, .12 * k, 'add', () => i % 2 ? px.disc(g, x, y, sizes[i], cols[i]) : px.poly(g, [0, 1, 2, 3, 4, 5].map(j => [x + Math.cos(j * 1.047) * sizes[i], y + Math.sin(j * 1.047) * sizes[i]]), cols[i])); }
  },
  speedLines(g, vp, k, t) {
    if (k <= 0 || this.reduce()) return;
    const cx = vp.x + vp.w / 2, cy = vp.y + vp.h * .45;
    px.blend(g, .35 * k, 'add', () => { for (let i = 0; i < 14; i++) { const a = i * 2.39 + Math.floor(t * 20) * .7, r0 = vp.w * (.42 + (i % 3) * .05), r1 = r0 + 24 + 30 * k; px.line(g, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * .6, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * .6, '#ffffff'); } });
  },
  rain(g, vp, t, amt) {
    if (this.reduce()) amt *= .4;
    px.blend(g, .45, 'normal', () => { for (let i = 0; i < 70 * amt; i++) { const x = vp.x + ((i * 97.3 + t * 40) % vp.w), y = vp.y + ((i * 53.1 + t * 380) % vp.h); px.line(g, x, y, x - 2, y + 6, '#d8e8ff'); } });
  },
  petalStorm(g, vp, t, amt) {
    const cs = ['#ffc0d8', '#ffffff', '#ff90b8'];
    for (let i = 0; i < 60 * amt; i++) { const x = vp.x + ((i * 71.7 - t * 90 + Math.sin(t + i) * 20) % vp.w + vp.w) % vp.w, y = vp.y + ((i * 37.3 + t * 70) % vp.h); px.rect(g, x, y, 2, 1, cs[i % 3]); }
  },
  heat(g, vp, t) {
    if (OB.env.headless || this.reduce() || !g.canvas) return;
    const y0 = Math.round(vp.y + vp.h * .38), h = Math.round(vp.h * .12);
    for (let y = 0; y < h; y += 2) { const off = Math.round(Math.sin(t * 9 + y * .7)); if (off) try { g.drawImage(g.canvas, vp.x, y0 + y, vp.w, 2, vp.x + off, y0 + y, vp.w, 2); } catch (e) { return; } }
  }
};
})();
