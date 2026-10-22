'use strict';
/* ===== Lylat Lark :: utilities ===== */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const TAU = Math.PI * 2;
const sign0 = (v) => (v < 0 ? -1 : 1);
const pad = (n, l) => String(Math.floor(n)).padStart(l, '0');
const Ease = {
  linear: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  back: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  elastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
};
/* Tiny tween/timeline system (animation of cameras, ship intro, UI) */
const Tween = {
  list: [],
  add(dur, fn, o = {}) {
    const tw = { t: -(o.delay || 0), dur, fn, ease: Ease[o.ease || 'inOut'], done: o.done, dead: false };
    this.list.push(tw); return tw;
  },
  update(dt) {
    for (const tw of this.list) {
      tw.t += dt;
      if (tw.t < 0) continue;
      const k = clamp(tw.t / tw.dur, 0, 1);
      tw.fn(tw.ease(k), k);
      if (k >= 1) { tw.dead = true; if (tw.done) tw.done(); }
    }
    this.list = this.list.filter((t) => !t.dead);
  },
  clear() { this.list.length = 0; },
};
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v) * 2 - 1;
}
function fbm(x, y) { return vnoise(x, y) * 0.6 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.1; }
const $ = (s, r = document) => r.querySelector(s);
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
