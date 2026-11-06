// Sky: the engine's flat sky and sun, plus a far ring of silhouettes, a sun or moon disc, and chunky clouds.
import { applySky, skyAt, THREE } from '../../pixel-engine.js';
import { GeoBatch, mix, rgb, seeded } from './geo.js';
const { Color, Group } = THREE;
export function nightOf(hour) { const h = ((hour % 24) + 24) % 24; return h > 20 || h < 5 ? 1 : h > 18 ? (h - 18) / 2 : h < 7 ? (7 - h) / 2 : 0; }
export function applyHour(engine, hour, { rain = false, tunnel = 0 } = {}) {
  const s = skyAt(hour);
  applySky(engine, s);
  const night = nightOf(hour);
  // Raise the ambient so a road reads at night; the baked lamp pools and the glow do the rest.
  engine.ambient.intensity = s.ambientIntensity * (1 + 0.3 * (1 - night)) + night * 1.15;
  if (rain) { engine.ambient.intensity *= 0.9; engine.sun.intensity *= 0.45; const c = new Color(s.sky).lerp(new Color(0x566c86), 0.75); engine.scene.background = c; }
  if (tunnel > 0) { engine.sun.intensity *= 1 - tunnel * 0.85; engine.ambient.intensity *= 1 - tunnel * 0.5; const c = (engine.scene.background instanceof Color ? engine.scene.background.clone() : new Color(s.sky)).lerp(new Color(0x1a1c2c), tunnel); engine.scene.background = c; }
  return s;
}
export function buildSkyDressing(tr, theme, hour, { cx = 0, cz = 0, seed = 3, radius = 2600, skyline = false } = {}) {
  const group = new Group(), b = new GeoBatch(), g = new GeoBatch(), r = seeded(seed + (tr?.N ?? 0)), night = nightOf(hour), base = Math.min(...(tr ? tr.y : [0])) - 5;
  const far = theme.far ?? ['teal', 'navy'];
  const nightK = 1 - night * 0.55;
  const ring = (R, col, minH, maxH, parts, flat = false) => {
    let last = null;
    for (let i = 0; i <= parts; i++) {
      const a = (i / parts) * Math.PI * 2, h = minH + (maxH - minH) * (flat ? (r() > 0.6 ? r() : 0.05) : r()), p = [cx + Math.sin(a) * R, base, cz + Math.cos(a) * R], top = [p[0], base + h, p[2]];
      if (last) { b.quad(last.p, last.top, top, p, col); b.quad(p, top, last.top, last.p, col); }
      last = { p, top };
    }
  };
  const c0 = { r: rgb(far[0]).r * nightK, g: rgb(far[0]).g * nightK, b: rgb(far[0]).b * nightK }, c1 = { r: rgb(far[1]).r * nightK, g: rgb(far[1]).g * nightK, b: rgb(far[1]).b * nightK };
  ring(radius + 500, c1, 140, 330, 48, !!theme.flat && !skyline);
  ring(radius, c0, 60, 200, 64, !!theme.flat);
  if (skyline) { // A city skyline with lit windows, at the near edge of the ring.
    for (let i = 0; i < 90; i++) { const a = r() * Math.PI * 2, R = radius * 0.5 + r() * 500, x = cx + Math.sin(a) * R, z = cz + Math.cos(a) * R, w = 40 + r() * 60, h = 50 + r() * 190; b.box(x, base, z, w, h, w, mix('ink', 'navy', r() * 0.5), a); for (let k = 0; k < 8; k++) g.box(x + (r() - 0.5) * w * 1.02, base + 10 + r() * (h - 16), z + (r() - 0.5) * w * 1.02, 5, 5, 5, r() > 0.5 ? 'sand' : 'orange', a); }
  }
  // Sun or moon: a flat disc, far off along the sun's direction.
  const s = skyAt(hour), d = s.sunDir, D = 3200, sx = cx + d[0] * D, sy = base + Math.max(0.09, d[1]) * D, sz = cz + d[2] * D, n = 14, rad = night > 0.5 ? 60 : 110, col = night > 0.5 ? 'white' : hour > 16 ? 'orange' : 'sand';
  const ux = -d[2], uz = d[0], ul = Math.hypot(ux, uz) || 1;
  for (let i = 0; i < n; i++) { const a0 = (i / n) * 6.283, a1 = ((i + 1) / n) * 6.283, P = (a) => [sx + (ux / ul) * Math.cos(a) * rad, sy + Math.sin(a) * rad, sz + (uz / ul) * Math.cos(a) * rad]; g.tri([sx, sy, sz], P(a0), P(a1), col); g.tri([sx, sy, sz], P(a1), P(a0), col); }
  // Chunky clouds (none at night, stars instead).
  if (night < 0.6) for (let i = 0; i < 22; i++) { const a = r() * 6.283, R = 500 + r() * 1800, x = cx + Math.sin(a) * R, z = cz + Math.cos(a) * R, y = base + 260 + r() * 340, col2 = hour > 17 ? mix('sand', 'orange', 0.5) : 'white'; for (let k = 0; k < 4; k++) g.box(x + (k - 1.5) * 44 + r() * 20, y + r() * 14, z + r() * 40, 60 + r() * 50, 14 + r() * 14, 40 + r() * 40, col2, a); }
  else for (let i = 0; i < 260; i++) { const a = r() * 6.283, e = 0.12 + r() * 0.9, R = 3100, x = cx + Math.sin(a) * R * Math.cos(e), z = cz + Math.cos(a) * R * Math.cos(e), y = base + Math.sin(e) * R; g.box(x, y, z, 8, 8, 8, r() > 0.8 ? 'cyan' : 'white'); }
  group.add(b.mesh({ receive: false }), g.mesh({ glow: true }));
  return group;
}
