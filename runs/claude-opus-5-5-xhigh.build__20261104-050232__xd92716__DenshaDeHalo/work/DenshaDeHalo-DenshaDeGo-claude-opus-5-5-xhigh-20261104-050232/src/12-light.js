/* 12-light: the time of day and the weather as a colour grade (sky gradient, ambient multiply and lift, fog colour and
 * density, sun or moon, stars), blended between neighbouring keyframes so every hour is continuous; the zone backdrops
 * tinted to match; the sun placed by the camera's heading. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, Rail = E.Rail;
const rgb = Rail.rgb, hexOf = Rail.hexOf, mix = Rail.mix;
// keyframes by hour: sky top / mid / horizon, the multiply and lift on every non-emissive colour, night 0..1, sun elevation
const KEYS = [
  { h: 0, top: '#060818', mid: '#0c1230', hor: '#1a2440', mul: [.26, .3, .5], add: [3, 5, 14], night: 1, stars: 1, sun: -1 },
  { h: 4.5, top: '#060818', mid: '#0c1230', hor: '#1a2440', mul: [.26, .3, .5], add: [3, 5, 14], night: 1, stars: 1, sun: -1 },
  { h: 5.5, top: '#2a2850', mid: '#7a5a8a', hor: '#f0a080', mul: [.82, .7, .76], add: [18, 6, 10], night: .2, stars: .3, sun: .04 },
  { h: 6.8, top: '#3a4a8a', mid: '#9a8ab0', hor: '#f8c8a0', mul: [.92, .86, .84], add: [14, 8, 6], night: 0, stars: 0, sun: .2 },
  { h: 8, top: '#3a78d8', mid: '#78b0ee', hor: '#bfe0ff', mul: [1, 1, 1], add: [0, 0, 0], night: 0, stars: 0, sun: .55 },
  { h: 13.5, top: '#3a78d8', mid: '#78b0ee', hor: '#bfe0ff', mul: [1, 1, 1], add: [0, 0, 0], night: 0, stars: 0, sun: .8 },
  { h: 15, top: '#5a8ad0', mid: '#a0b8d8', hor: '#e8e0c8', mul: [1, .96, .88], add: [8, 4, 0], night: 0, stars: 0, sun: .5 },
  { h: 16.4, top: '#4a6ac0', mid: '#c0a0a0', hor: '#f8c890', mul: [1, .88, .74], add: [14, 4, 0], night: 0, stars: 0, sun: .25 },
  { h: 17.5, top: '#3a2a6a', mid: '#b0506a', hor: '#ff9a4a', mul: [1, .74, .58], add: [22, 4, 0], night: .1, stars: 0, sun: .06 },
  { h: 18.5, top: '#2a2058', mid: '#6a3a6a', hor: '#e07a4a', mul: [.72, .56, .58], add: [14, 2, 8], night: .45, stars: .2, sun: -.05 },
  { h: 19.5, top: '#060818', mid: '#0c1230', hor: '#1a2440', mul: [.26, .3, .5], add: [3, 5, 14], night: 1, stars: 1, sun: -1 },
  { h: 24, top: '#060818', mid: '#0c1230', hor: '#1a2440', mul: [.26, .3, .5], add: [3, 5, 14], night: 1, stars: 1, sun: -1 }
];
DH.TOD_KEYS = KEYS;
const lerpN = (a, b, t) => a + (b - a) * t, lerpA = (a, b, t) => a.map((v, i) => lerpN(v, b[i], t)), lerpH = (a, b, t) => hexOf(mix(rgb(a), rgb(b), t));
/** the grade at hour h (0..24) under weather w ('clear' | 'rain' | 'fog'): { top, mid, hor, mul, add, night, stars, sun,
 *  fog (rgb), density, fogScale } */
DH.grade = (h, w = 'clear', extraFog = 0) => {
  h = ((h % 24) + 24) % 24;
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1].h <= h) i++;
  const a = KEYS[i], b = KEYS[i + 1], t = b.h > a.h ? (h - a.h) / (b.h - a.h) : 0;
  const G = { h, top: lerpH(a.top, b.top, t), mid: lerpH(a.mid, b.mid, t), hor: lerpH(a.hor, b.hor, t), mul: lerpA(a.mul, b.mul, t), add: lerpA(a.add, b.add, t), night: lerpN(a.night, b.night, t), stars: lerpN(a.stars, b.stars, t), sun: lerpN(a.sun, b.sun, t), density: 1, fogScale: 1 };
  if (w === 'rain') { G.mul = G.mul.map(v => v * .78); G.top = lerpH(G.top, '#5a6470', .6); G.mid = lerpH(G.mid, '#7a8490', .6); G.hor = lerpH(G.hor, '#9aa4ae', .5); G.stars = 0; G.density = 2.2; G.fogScale = .75; G.sun = Math.min(G.sun, -.5); }
  if (w === 'fog' || extraFog > 0) { const f = w === 'fog' ? 1 : extraFog; G.hor = lerpH(G.hor, G.night > .5 ? '#3a4050' : '#c8ccd0', .7 * f); G.density *= 1 + 4 * f; G.fogScale *= 1 - .7 * f; G.stars *= 1 - f; }
  G.fog = rgb(G.hor);
  G.key = [Math.round(h * 12), w, Math.round(extraFog * 10)].join(':');
  return G;
};
/** the grade as the rail renderer takes it */
DH.railGrade = G => ({ mul: G.mul, add: G.add, fog: G.fog, density: G.density, night: G.night });
/** the sky for the renderer: the gradient, the sun or moon where the heading puts it, stars, the zone's backdrop tinted */
const layerCache = new Map();
DH.skyFor = (G, zoneId, heading, sunAz, fov = 75) => {
  const Z = DH.ZONES[zoneId] || DH.ZONES.suburb, key = zoneId + '|' + G.key;
  let layers = layerCache.get(key);
  if (!layers) {
    layers = (Z.sky || []).map((l, i) => { const c = rgb(l.color), tinted = [c[0] * G.mul[0] + G.add[0], c[1] * G.mul[1] + G.add[1], c[2] * G.mul[2] + G.add[2]]; return Object.assign({}, l, { color: hexOf(mix(tinted, G.fog, i === 0 ? .45 : .25)), windows: l.windows && G.night > .4 ? l.windows : undefined }); });
    if (layerCache.size > 64) layerCache.clear(); layerCache.set(key, layers);
  }
  const rel = Math.atan2(Math.sin(sunAz - heading), Math.cos(sunAz - heading)), half = fov / 2 * Math.PI / 180;
  const x = Math.abs(rel) < Math.PI / 2 ? .5 + Math.tan(rel) / Math.tan(half) / 2 : null;
  const orb = G.sun > -.1 ? { x, y: E.clamp(1 - G.sun * 1.1, .08, .97), r: G.sun < .2 ? 13 : 9, color: G.sun < .2 ? '#ffb070' : '#fff8d8', rel } : null;
  const moon = G.night > .5 ? { x: Math.abs(rel + 2) < Math.PI / 2 ? .5 + Math.tan(rel + 2) / Math.tan(half) / 2 : null, y: .22, r: 8, color: '#f2ecd8' } : null;
  return { top: G.top, mid: G.mid, horizon: G.hor, sun: orb && orb.x !== null ? orb : null, moon: !orb && moon && moon.x !== null ? moon : null, stars: G.stars, layers, sunRel: orb ? rel : null };
};
/** a time-of-day name for the UI */
DH.todName = h => { h = ((h % 24) + 24) % 24; return h < 4.5 || h >= 19.5 ? 'NIGHT' : h < 7.5 ? 'DAWN' : h < 14.5 ? 'DAY' : h < 16.8 ? 'AFTERNOON' : 'SUNSET'; };
})();
