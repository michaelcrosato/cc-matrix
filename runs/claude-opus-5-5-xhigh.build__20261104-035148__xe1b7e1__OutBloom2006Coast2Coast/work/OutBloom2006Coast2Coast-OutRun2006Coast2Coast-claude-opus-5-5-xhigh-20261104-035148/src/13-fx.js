/* OutBloom — effects in screen space: tyre smoke, petals, sparks, dust and sand, spray, confetti, fireworks; the
 * pixel bloom (bright pixels summed into a quarter grid, blurred, quantised to four levels and added back through a
 * Bayer dither: pixel art, never blur), the lens flare, speed lines, heat shimmer, the sun shower, the petal storm and
 * skid marks. Cosmetic only: their own random stream, so toggling them never changes a run. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { px, clamp } = E;
const FX = OB.FX = { parts: [], rnd: E.rng(0xF00D), skids: [] };
const rnd = () => FX.rnd();
const motion = () => !(OB.game.reduceMotion || OB.game.settings.motion);
/** add particles: kind smoke | petal | spark | dust | spray | confetti | sparkle | star | ring, at screen x, y */
FX.emit = (kind, x, y, n = 1, o = {}) => {
  if (OB.env.headless) return;
  if (!motion() && (kind === 'petal' || kind === 'confetti')) n = Math.ceil(n / 3);
  for (let i = 0; i < n; i++) {
    const a = (o.angle !== undefined ? o.angle : -Math.PI / 2) + (rnd() - .5) * (o.spread !== undefined ? o.spread : 1.6), sp = (o.speed || 60) * (.5 + rnd());
    const p = { kind, x: x + (rnd() - .5) * (o.jx || 4), y: y + (rnd() - .5) * (o.jy || 4), vx: Math.cos(a) * sp + (o.vx || 0), vy: Math.sin(a) * sp + (o.vy || 0), t: 0, life: (o.life || 1) * (.6 + rnd() * .8), size: (o.size || 2) * (.6 + rnd() * .8), color: o.color || (o.colors ? o.colors[Math.floor(rnd() * o.colors.length)] : '#ffffff'), spin: rnd() * 6, grav: o.grav || 0, drag: o.drag || 0 };
    FX.parts.push(p);
  }
  if (FX.parts.length > 900) FX.parts.splice(0, FX.parts.length - 900);
};
FX.step = dt => {
  for (const p of FX.parts) { p.t += dt; p.vy += p.grav * dt; p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.spin += dt * 5; }
  FX.parts = FX.parts.filter(p => p.t < p.life);
};
FX.clear = () => { FX.parts.length = 0; FX.skids.length = 0; };
FX.draw = (g, vp) => {
  for (const p of FX.parts) {
    if (vp && (p.x < vp.x || p.x > vp.x + vp.w || p.y < vp.y || p.y > vp.y + vp.h)) continue;
    const u = p.t / p.life, x = Math.round(p.x), y = Math.round(p.y);
    if (p.kind === 'smoke' || p.kind === 'dust' || p.kind === 'spray') { const a = g.globalAlpha; g.globalAlpha = a * Math.round((1 - u) * 4) / 5; px.disc(g, x, y, Math.max(1, Math.round(p.size * (1 + u * 2.2))), p.color); g.globalAlpha = a; px.reset(g); }
    else if (p.kind === 'petal') { const w = Math.max(1, Math.round(p.size * Math.abs(Math.cos(p.spin)))); px.rect(g, x, y, w + 1, Math.max(1, Math.round(p.size * .8)), p.color); if (p.size > 2) px.rect(g, x, y, 1, 1, '#ffffff'); }
    else if (p.kind === 'spark') px.line(g, x, y, Math.round(x - p.vx * .03), Math.round(y - p.vy * .03), u < .5 ? '#fff8c0' : p.color, 1);
    else if (p.kind === 'confetti') px.rect(g, x, y, Math.max(1, Math.round(p.size * Math.abs(Math.sin(p.spin)) + .5)), Math.max(1, Math.round(p.size)), p.color);
    else if (p.kind === 'sparkle' || p.kind === 'star') { const s = Math.max(1, Math.round(p.size * (1 - u))); px.rect(g, x - s, y, s * 2 + 1, 1, p.color); px.rect(g, x, y - s, 1, s * 2 + 1, p.color); }
    else if (p.kind === 'ring') { const r = Math.round(p.size * (1 + u * 6)); for (let k = 0; k < 16; k++) { const an = k / 16 * Math.PI * 2; px.rect(g, Math.round(x + Math.cos(an) * r), Math.round(y + Math.sin(an) * r * .5), 1, 1, p.color); } }
    else if (p.kind === 'text') E.font.text(g, p.color, x, Math.round(y - u * 14), u < .7 ? '#ffffff' : '#ffd23a', { align: 'center', outline: true, scale: p.size });
  }
};
/* ---- skid marks: a ring buffer of marks per stage, drawn on the asphalt through the road's onBand ---- */
FX.skid = (stage, z, x) => { FX.skids.push({ stage, z, x }); if (FX.skids.length > 400) FX.skids.shift(); };
FX.drawSkids = (g, seg, p1, p2, road) => {
  for (const s of FX.skids) {
    if (s.stage !== road.id || s.z < seg.z || s.z >= seg.z + OB.SEG) continue;
    const u = (s.z - seg.z) / OB.SEG, sc = p1.scale + (p2.scale - p1.scale) * u, sx = p1.x + (p2.x - p1.x) * u, sy = p1.y + (p2.y - p1.y) * u, W = road.o.width * seg.w;
    const a = g.globalAlpha; g.globalAlpha = .5;
    for (const d of [-.17, .17]) px.rect(g, Math.round(sx + (s.x + d) * W * sc), Math.round(sy), Math.max(1, Math.round(70 * sc)), Math.max(1, Math.round(Math.abs(p1.y - p2.y) * .6)), '#2a2430');
    g.globalAlpha = a; px.reset(g);
  }
};
/* ---- the pixel bloom: bright pixels into a quarter grid, two box blurs, four levels, added back dithered ---- */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16);
let bloomBuf = null, bloomOut = null;
FX.bloom = (g, vp, strength, tint) => {
  if (OB.env.headless || strength <= 0) return;
  const W = vp.w | 0, H = vp.h | 0, X = vp.x | 0, Y = vp.y | 0; if (W < 8 || H < 8) return;
  let img; try { img = g.getImageData(X, Y, W, H); } catch (e) { return; }
  const d = img.data, gw = Math.ceil(W / 4), gh = Math.ceil(H / 4), n = gw * gh;
  if (!bloomBuf || bloomBuf.length < n) { bloomBuf = new Float32Array(n); bloomOut = new Float32Array(n); }
  const grid = bloomBuf, tmp = bloomOut; grid.fill(0, 0, n);
  const thr = 196;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) { const i = (y * W + x) * 4, l = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; if (l > thr) grid[(y >> 2) * gw + (x >> 2)] += (l - thr) / (255 - thr) * .25; }
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { let s = 0, c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < gw && yy < gh) { s += grid[yy * gw + xx]; c++; } } tmp[y * gw + x] = s / c; }
    grid.set(tmp.subarray(0, n));
  }
  const tr = tint ? E.hex(tint) : [255, 236, 200], k = strength * 1.6;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = grid[(y >> 2) * gw + (x >> 2)] * k; if (v < .06) continue;
    v = Math.min(1, Math.round(v * 4) / 4); if (v < BAYER[(y & 3) * 4 + (x & 3)] * .9) continue;
    const i = (y * W + x) * 4, a = v * .55; d[i] = Math.min(255, d[i] + tr[0] * a); d[i + 1] = Math.min(255, d[i + 1] + tr[1] * a); d[i + 2] = Math.min(255, d[i + 2] + tr[2] * a);
  }
  g.putImageData(img, X, Y);
};
/* ---- the lens flare: ghosts along the line from the sun through the screen's middle ---- */
FX.flare = (g, vp, sun, strength) => {
  if (!sun || strength <= 0) return;
  const cx = vp.x + vp.w / 2, cy = vp.y + vp.h / 2, dx = cx - sun[0], dy = cy - sun[1], centred = clamp(1 - Math.hypot(dx / vp.w, dy / vp.h) * 2.2, 0, 1) * strength;
  if (centred <= .05) return;
  const a = g.globalAlpha; g.globalCompositeOperation = 'lighter';
  [[.35, 4, '#ff9a5a'], [.6, 2, '#ffe08a'], [.9, 6, '#7ad0ff'], [1.25, 3, '#ff7ad0'], [1.6, 5, '#a8ff9a']].forEach(([t, r, c], i) => { g.globalAlpha = centred * (i % 2 ? .3 : .2); px.disc(g, Math.round(sun[0] + dx * t), Math.round(sun[1] + dy * t), r, c); });
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = a; px.reset(g);
};
/* ---- speed lines, rain, the petal storm, heat shimmer, slipstream wind ---- */
FX.speedLines = (g, vp, v, t, slip) => {
  if (!motion()) return;
  const k = clamp((v - 255) / 60, 0, 1) + slip * .6; if (k <= 0) return;
  const cx = vp.x + vp.w / 2, cy = vp.y + vp.h * .45, r = E.rng(Math.floor(t * 30));
  const a = g.globalAlpha; g.globalAlpha = .5;
  for (let i = 0; i < 18 * k; i++) { const an = r() * Math.PI * 2, d0 = vp.w * (.3 + r() * .3), d1 = d0 + 20 + r() * 30; px.line(g, Math.round(cx + Math.cos(an) * d0), Math.round(cy + Math.sin(an) * d0 * .6), Math.round(cx + Math.cos(an) * d1), Math.round(cy + Math.sin(an) * d1 * .6), slip > .3 ? '#c8f0ff' : '#ffffff', 1); }
  g.globalAlpha = a; px.reset(g);
};
FX.weather = (g, vp, kind, t, amount = 1) => {
  if (!kind) return;
  const r = E.rng(7), n = Math.round((kind === 'rain' ? 120 : 70) * amount * (motion() ? 1 : .4));
  for (let i = 0; i < n; i++) {
    const sx = r() * vp.w, sy = r() * vp.h, sp = .6 + r();
    if (kind === 'rain' || kind === 'shower') { const y = vp.y + ((sy + t * 520 * sp) % vp.h), x = vp.x + ((sx - t * 60) % vp.w + vp.w) % vp.w; px.line(g, Math.round(x), Math.round(y), Math.round(x - 2), Math.round(y + 6), '#d8ecff', 1); }
    else if (kind === 'petals') { const y = vp.y + ((sy + t * 70 * sp) % vp.h), x = vp.x + ((sx - t * 110 * sp + Math.sin(t * 2 + i) * 20) % vp.w + vp.w) % vp.w; px.rect(g, Math.round(x), Math.round(y), 2 + (i % 2), 2, i % 3 ? '#ffc0d8' : '#ffffff'); }
    else if (kind === 'snow') { const y = vp.y + ((sy + t * 40 * sp) % vp.h), x = vp.x + ((sx + Math.sin(t + i) * 15) % vp.w + vp.w) % vp.w; px.rect(g, Math.round(x), Math.round(y), 2, 2, '#ffffff'); }
  }
};
FX.shimmer = (g, vp, hy, t) => {
  if (OB.env.headless || !motion()) return;
  const y0 = Math.round(hy), h = Math.round(vp.h * .12);
  for (let y = y0; y < y0 + h; y += 2) { const off = Math.round(Math.sin(y * .7 + t * 9) * 1.5); if (off) g.drawImage(g.canvas, vp.x, y, vp.w, 2, vp.x + off, y, vp.w, 2); }
};
FX.wind = (g, vp, slip, t) => {
  if (slip < .5) return; const r = E.rng(Math.floor(t * 20)), a = g.globalAlpha; g.globalAlpha = (slip - .5) * 1.2;
  for (let i = 0; i < 10; i++) { const side = i % 2 ? 1 : -1, x = vp.x + vp.w / 2 + side * vp.w * (.2 + r() * .2), y = vp.y + vp.h * (.55 + r() * .35); px.line(g, Math.round(x), Math.round(y), Math.round(x + side * 24), Math.round(y + 8), '#e8f8ff', 1); }
  g.globalAlpha = a; px.reset(g);
};
/** dither a whole viewport toward a colour (sunset warmth on time up, the sky dissolve) */
FX.ditherFill = (g, vp, color, amount) => {
  if (amount <= 0) return; const lv = Math.round(amount * 16);
  for (let y = 0; y < vp.h; y++) for (let x = (y & 1); x < vp.w; x += 2) { if (BAYER[(y & 3) * 4 + (x & 3)] * 16 < lv) px.rect(g, vp.x + x, vp.y + y, 1, 1, color); }
};
})();
