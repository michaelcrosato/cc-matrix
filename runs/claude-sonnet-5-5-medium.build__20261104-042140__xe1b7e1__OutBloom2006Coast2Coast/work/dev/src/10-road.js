/* Stages as roads: each of the 15 stages is built from its biome and layout style, with pixel-art scenery drawn by code.
 * The fork at the end of a stage is two arches, one over each half of the road: drive under the one you want. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, px = E.px;
const SEG = 200, AHEAD = 840;
OB.SEG = SEG; OB.AHEAD = AHEAD; OB.LANES = [-.66, 0, .66];
const sh = (c, k) => E.shade(c, k);
// ---- scenery: { w, draw(g, sx, sy, s) }, s = pixels per world unit, (sx, sy) the foot ----
const thing = (w, fn) => ({ w, draw(g, x, y, s) { if (w * s < 1.2) return; fn(g, Math.round(x), Math.round(y), s, w); } });
const R = (g, x, y, s, ux, uy, uw, uh, c) => px.rect(g, Math.round(x + ux * s), Math.round(y - (uy + uh) * s), Math.max(1, Math.round(uw * s)), Math.max(1, Math.round(uh * s)), c);
const D = (g, x, y, s, ux, uy, ur, c) => px.disc(g, Math.round(x + ux * s), Math.round(y - uy * s), Math.max(1, Math.round(ur * s)), c);
const FLOWER = ['#ff5a8a', '#ffd23a', '#ff8a3a', '#c07aff', '#ffffff', '#ff3a5a'];
const flowerHead = (g, x, y, s, ux, uy, r, c) => { D(g, x, y, s, ux, uy, r, c); D(g, x, y, s, ux, uy, r * .38, '#ffe27a'); };
const MAKE = {
  palm: v => thing(700, (g, x, y, s) => { R(g, x, y, s, -30, 0, 60, 760, '#8a5a32'); R(g, x, y, s, -10, 0, 20, 760, '#a8723e'); for (let k = -2; k <= 2; k++) { px.poly(g, [[x, y - 760 * s], [x + k * 230 * s, y - (760 - 100 + Math.abs(k) * 60) * s], [x + k * 250 * s, y - (700 - Math.abs(k) * 90) * s]], k % 2 ? '#2f9a4a' : '#3cb85a'); } D(g, x, y, s, 0, 760, 40, '#7a4a22'); }),
  umbrella: v => thing(420, (g, x, y, s) => { R(g, x, y, s, -8, 0, 16, 420, '#e8e0d0'); const c = FLOWER[v % 6]; px.poly(g, [[x - 300 * s, y - 380 * s], [x, y - 520 * s], [x + 300 * s, y - 380 * s]], c); px.poly(g, [[x - 100 * s, y - 380 * s], [x, y - 520 * s], [x + 100 * s, y - 380 * s]], '#ffffff'); }),
  rock: v => thing(420, (g, x, y, s) => { px.poly(g, [[x - 210 * s, y], [x - 150 * s, y - 260 * s], [x + 30 * s, y - 330 * s], [x + 210 * s, y - 120 * s], [x + 220 * s, y]], '#8a8a96'); px.poly(g, [[x - 150 * s, y - 260 * s], [x + 30 * s, y - 330 * s], [x + 60 * s, y - 220 * s], [x - 80 * s, y - 180 * s]], '#a8a8b4'); }),
  tree: v => thing(520, (g, x, y, s) => { R(g, x, y, s, -35, 0, 70, 360, '#7a4a28'); D(g, x, y, s, 0, 520, 250, '#3ea84a'); D(g, x, y, s, -130, 420, 170, '#4cc058'); D(g, x, y, s, 140, 440, 150, '#349a42'); for (let k = 0; k < 9; k++) D(g, x, y, s, -200 + k * 50, 380 + ((k * 73) % 5) * 60, 28, k % 3 ? '#ffb0cc' : '#ffffff'); }),
  flowers: v => thing(620, (g, x, y, s) => { for (let k = 0; k < 6; k++) { const ux = -240 + k * 96, h = 120 + ((k * 37 + v * 11) % 5) * 55; R(g, x, y, s, ux - 6, 0, 12, h, '#2f9a4a'); flowerHead(g, x, y, s, ux, h + 20, 56 + (k % 2) * 14, FLOWER[(k + v) % 6]); } }),
  fence: v => thing(560, (g, x, y, s) => { for (let k = 0; k < 4; k++) R(g, x, y, s, -260 + k * 170, 0, 36, 200, '#f4ecd8'); R(g, x, y, s, -270, 60, 560, 24, '#e8dec8'); R(g, x, y, s, -270, 140, 560, 24, '#e8dec8'); }),
  mast: v => thing(300, (g, x, y, s) => { R(g, x, y, s, -10, 0, 20, 900, '#d8d8e0'); px.poly(g, [[x + 10 * s, y - 880 * s], [x + 10 * s, y - 280 * s], [x + 260 * s, y - 330 * s]], FLOWER[(v + 2) % 6]); R(g, x, y, s, -150, 0, 300, 60, '#2a6ad0'); }),
  lamp: v => thing(200, (g, x, y, s) => { R(g, x, y, s, -12, 0, 24, 620, '#4a4a58'); R(g, x, y, s, -12, 600, 150, 20, '#4a4a58'); D(g, x, y, s, 130, 590, 46, '#fff2b0'); }),
  crate: v => thing(380, (g, x, y, s) => { R(g, x, y, s, -170, 0, 340, 300, '#b07a42'); R(g, x, y, s, -170, 130, 340, 36, '#8a5a30'); R(g, x, y, s, -20, 0, 40, 300, '#8a5a30'); }),
  lavender: v => thing(760, (g, x, y, s) => { for (let k = 0; k < 7; k++) { const ux = -330 + k * 110; R(g, x, y, s, ux - 7, 0, 14, 90, '#5a9a4a'); R(g, x, y, s, ux - 30, 70, 60, 240, k % 2 ? '#a070e8' : '#8a56d6'); R(g, x, y, s, ux - 18, 300, 36, 90, '#c4a0ff'); } }),
  cypress: v => thing(300, (g, x, y, s) => { R(g, x, y, s, -16, 0, 32, 120, '#6a4a2a'); px.ell(g, x, y - 480 * s, Math.max(1, 120 * s), Math.max(1, 400 * s), '#2a6a3a'); px.ell(g, x - 30 * s, y - 520 * s, Math.max(1, 60 * s), Math.max(1, 300 * s), '#378a4a'); }),
  pine: v => thing(380, (g, x, y, s) => { R(g, x, y, s, -20, 0, 40, 160, '#6a4a2a'); for (let k = 0; k < 3; k++) px.poly(g, [[x - (240 - k * 50) * s, y - (140 + k * 190) * s], [x, y - (420 + k * 190) * s], [x + (240 - k * 50) * s, y - (140 + k * 190) * s]], k % 2 ? '#2a7a4a' : '#348a54'); }),
  cactus: v => thing(380, (g, x, y, s) => { R(g, x, y, s, -45, 0, 90, 520, '#3a9a52'); R(g, x, y, s, -190, 200, 60, 190, '#3a9a52'); R(g, x, y, s, -190, 200, 190, 55, '#3a9a52'); R(g, x, y, s, 130, 260, 60, 150, '#3a9a52'); R(g, x, y, s, 0, 260, 190, 55, '#3a9a52'); R(g, x, y, s, -18, 0, 12, 520, '#52b86a'); flowerHead(g, x, y, s, 0, 560, 50, '#ff5a8a'); flowerHead(g, x, y, s, -160, 420, 34, '#ffd23a'); }),
  vine: v => thing(640, (g, x, y, s) => { for (let k = 0; k < 4; k++) { const ux = -260 + k * 175; R(g, x, y, s, ux - 10, 0, 20, 300, '#6a4a2a'); R(g, x, y, s, ux - 80, 150, 160, 140, '#4a9a38'); D(g, x, y, s, ux - 30, 130, 28, '#7a2a6a'); D(g, x, y, s, ux + 30, 120, 26, '#8a3a7a'); } }),
  house: v => thing(900, (g, x, y, s) => { const c = ['#f4d4a4', '#f4b8a0', '#e8e0b8', '#bfe0d8'][v % 4]; R(g, x, y, s, -420, 0, 840, 640, c); px.poly(g, [[x - 470 * s, y - 640 * s], [x, y - 900 * s], [x + 470 * s, y - 640 * s]], '#c8503a'); for (let k = 0; k < 3; k++) { R(g, x, y, s, -320 + k * 240, 340, 130, 190, '#3a5a8a'); R(g, x, y, s, -340 + k * 240, 320, 170, 24, '#fff6e0'); } R(g, x, y, s, -60, 0, 120, 250, '#7a4a28'); }),
  flowerbox: v => thing(380, (g, x, y, s) => { R(g, x, y, s, -170, 0, 340, 150, '#a85a38'); for (let k = 0; k < 5; k++) flowerHead(g, x, y, s, -130 + k * 65, 200 + (k % 2) * 40, 44, FLOWER[(k + v) % 6]); }),
  redrock: v => thing(900, (g, x, y, s) => { px.poly(g, [[x - 450 * s, y], [x - 380 * s, y - 700 * s], [x - 120 * s, y - 1000 * s], [x + 200 * s, y - 760 * s], [x + 420 * s, y]], '#b4552e'); px.poly(g, [[x - 120 * s, y - 1000 * s], [x + 200 * s, y - 760 * s], [x + 40 * s, y - 520 * s]], '#d0703c'); for (let k = 0; k < 4; k++) flowerHead(g, x, y, s, -260 + k * 170, 40, 44, '#e8283a'); }),
  windmill: v => thing(900, (g, x, y, s) => { px.poly(g, [[x - 200 * s, y], [x - 120 * s, y - 800 * s], [x + 120 * s, y - 800 * s], [x + 200 * s, y]], '#f0e6d2'); px.poly(g, [[x - 150 * s, y - 800 * s], [x, y - 1000 * s], [x + 150 * s, y - 800 * s]], '#b84a3a'); const t = (E.current ? E.current.time : 0) * 1.2; for (let k = 0; k < 4; k++) { const a = t + k * Math.PI / 2, cx = x, cy = y - 780 * s; px.poly(g, [[cx, cy], [cx + Math.cos(a) * 520 * s - Math.sin(a) * 40 * s, cy + Math.sin(a) * 520 * s + Math.cos(a) * 40 * s], [cx + Math.cos(a) * 520 * s + Math.sin(a) * 40 * s, cy + Math.sin(a) * 520 * s - Math.cos(a) * 40 * s]], '#ffffff'); } }),
  sunflower: v => thing(560, (g, x, y, s) => { for (let k = 0; k < 3; k++) { const ux = -170 + k * 170, h = 520 + (k * 90 + v * 30) % 220; R(g, x, y, s, ux - 12, 0, 24, h, '#3a8a3a'); D(g, x, y, s, ux, h + 40, 130, '#ffc81e'); D(g, x, y, s, ux, h + 40, 70, '#6a3a1a'); } }),
  orange: v => thing(560, (g, x, y, s) => { R(g, x, y, s, -30, 0, 60, 280, '#6a4426'); D(g, x, y, s, 0, 460, 270, '#2f8a3e'); D(g, x, y, s, -120, 380, 160, '#3a9a4a'); for (let k = 0; k < 8; k++) D(g, x, y, s, -180 + k * 55, 360 + ((k * 61) % 4) * 70, 32, '#ff9a1e'); }),
  tower: v => thing(900 + (v % 3) * 200, (g, x, y, s, w) => { const h = 1700 + (v % 5) * 380, c = ['#2a2a4a', '#3a2a4a', '#2a3a4a'][v % 3]; R(g, x, y, s, -w / 2, 0, w, h, c); for (let yy = 120; yy < h - 100; yy += 190) for (let xx = -w / 2 + 90; xx < w / 2 - 120; xx += 190) R(g, x, y, s, xx, yy, 90, 110, ((xx * 7 + yy * 3 + v) % 5) > 1 ? '#ffd87a' : '#4a4a6a'); R(g, x, y, s, -w / 2, h - 40, w, 40, sh(c, .3)); }),
  neon: v => thing(520, (g, x, y, s) => { R(g, x, y, s, -12, 0, 24, 560, '#3a3a50'); const c = ['#ff3a8a', '#3adfff', '#ffd23a'][v % 3]; R(g, x, y, s, -240, 520, 480, 260, sh(c, -.55)); R(g, x, y, s, -220, 540, 440, 220, c); R(g, x, y, s, -170, 600, 340, 36, '#ffffff'); }),
  topiary: v => thing(360, (g, x, y, s) => { R(g, x, y, s, -20, 0, 40, 200, '#6a4a2a'); D(g, x, y, s, 0, 420, 190, '#2f9a52'); D(g, x, y, s, 0, 680, 120, '#2f9a52'); D(g, x, y, s, -60, 460, 60, '#48b86a'); })
};
const mkThing = (kind, v) => MAKE[kind](v);
// distant layer colours follow the time of day, so the horizon always matches the sky
const skyCache = {};
OB.skyFor = (biomeKey, todKey) => {
  const k = biomeKey + todKey; if (skyCache[k]) return skyCache[k];
  const B = OB.BIOMES[biomeKey], T = OB.TOD[todKey], far = E.mix(T.haze, '#506890', todKey === 'night' ? .75 : .35), near = E.mix(T.haze, '#2a5a4a', todKey === 'night' ? .85 : .5);
  const layers = [];
  if (todKey !== 'night') layers.push({ kind: 'clouds', color: E.mix('#ffffff', T.haze, .35), y: .3, height: .14, parallax: .04, drift: 4 });
  if (B.layer === 'sea') layers.push({ kind: 'sea', color: E.mix('#2a6ad0', T.haze, todKey === 'night' ? .2 : .35), y: .62, height: .2, parallax: .02 }, { kind: 'hills', color: far, y: .6, height: .08, parallax: .04 });
  else if (B.layer === 'city') layers.push({ kind: 'city', color: far, y: .6, height: .36, parallax: .06, windows: '#ffd87a' }, { kind: 'city', color: near, y: .66, height: .3, parallax: .1, windows: '#ffd87a' });
  else if (B.layer === 'forest') layers.push({ kind: 'mountains', color: far, y: .6, height: .22, parallax: .05 }, { kind: 'forest', color: near, y: .66, height: .2, parallax: .1 });
  else if (B.layer === 'mountains') layers.push({ kind: 'mountains', color: far, y: .6, height: .3, parallax: .05 }, { kind: 'hills', color: near, y: .68, height: .14, parallax: .09 });
  else layers.push({ kind: 'mountains', color: far, y: .62, height: .18, parallax: .05 }, { kind: 'hills', color: near, y: .68, height: .16, parallax: .1 });
  const o = { sky: T.sky, layers }; if (T.sun) o.sun = T.sun; if (T.moon) o.moon = T.moon; if (T.stars) o.stars = T.stars;
  return (skyCache[k] = new E.Backdrop(o));
};
/* ---- vehicles from behind: 8 civilian types ---- */
OB.VEHICLES = [
  { id: 'hatch', w: 340, len: 400, v: [75, 115], wt: 4 }, { id: 'sedan', w: 380, len: 440, v: [80, 120], wt: 4 }, { id: 'taxi', w: 380, len: 440, v: [90, 130], wt: 2, col: '#ffcf2a' },
  { id: 'van', w: 420, len: 520, v: [60, 95], wt: 2 }, { id: 'truck', w: 500, len: 900, v: [48, 78], wt: 2 }, { id: 'bus', w: 520, len: 1000, v: [55, 82], wt: 1 },
  { id: 'scooter', w: 190, len: 260, v: [55, 100], wt: 2 }, { id: 'flowertruck', w: 480, len: 800, v: [52, 80], wt: 1, col: '#ff8fb0' }
];
const CIV = ['#3a6ad8', '#e8e8f0', '#34a864', '#e8b020', '#b03a78', '#f0644a', '#5ac8d8', '#8a8a98'];
OB.drawVehicle = function (g, sx, sy, s) {
  const W = this.w * s, Hh = W * (this.kind === 'truck' || this.kind === 'bus' || this.kind === 'flowertruck' ? .95 : this.kind === 'van' ? .8 : this.kind === 'scooter' ? 1.1 : .46); if (W < 2) return;
  const c = this.col, k = this.kind;
  if (this.ghost) { g.globalAlpha *= .5; }
  if (k === 'scooter') {
    R(g, sx, sy, s, -40, 0, 80, 120, '#1a1a1a'); R(g, sx, sy, s, -75, 120, 150, 260, c); D(g, sx, sy, s, 0, 520, 60, '#e8b088'); R(g, sx, sy, s, -55, 380, 110, 180, '#f0e8e0'); R(g, sx, sy, s, -30, 420, 60, 30, '#ff3020');
  } else {
    px.ell(g, sx, sy, W * .52, Math.max(1, W * .06), 'rgba(0,0,0,.28)');
    px.rect(g, sx - W / 2, sy - Hh * .72, W, Hh * .66, c);
    if (k === 'truck' || k === 'bus' || k === 'van' || k === 'flowertruck') { px.rect(g, sx - W / 2, sy - Hh, W, Hh * .3, sh(c, .12)); if (k === 'flowertruck') for (let q = 0; q < 6; q++) px.disc(g, sx - W * .38 + q * W * .15, sy - Hh * 1.06, Math.max(1, W * .06), FLOWER[q]); if (k === 'bus') for (let q = 0; q < 4; q++) px.rect(g, sx - W * .42 + q * W * .22, sy - Hh * .94, W * .17, Hh * .16, '#bfe0f0'); }
    else { px.rect(g, sx - W * .38, sy - Hh * 1.2, W * .76, Hh * .52, sh(c, -.3)); px.rect(g, sx - W * .32, sy - Hh * 1.12, W * .64, Hh * .34, '#a0c8e0'); if (k === 'taxi') px.rect(g, sx - W * .12, sy - Hh * 1.32, W * .24, Hh * .14, '#fff6a0'); }
    px.rect(g, sx - W / 2, sy - Hh * .22, W * .17, Hh * .22, '#1a1a1a'); px.rect(g, sx + W * .33, sy - Hh * .22, W * .17, Hh * .22, '#1a1a1a');
    if (W > 8) { px.rect(g, sx - W * .46, sy - Hh * .5, W * .14, Hh * .1, '#ff3020'); px.rect(g, sx + W * .32, sy - Hh * .5, W * .14, Hh * .1, '#ff3020'); }
  }
  if (this.ghost) g.globalAlpha = 1;
};
OB.makeVehicle = (rng, z, lane, def) => {
  const tot = OB.VEHICLES.reduce((a, v) => a + v.wt, 0); let r = rng() * tot, t = OB.VEHICLES[0];
  for (const v of OB.VEHICLES) { r -= v.wt; if (r <= 0) { t = v; break; } }
  const sp = t.v[0] + rng() * (t.v[1] - t.v[0]);
  return { kind: t.id, z, x: OB.LANES[lane], lane, tx: OB.LANES[lane], w: t.w, len: t.len, v: sp, base: sp, col: t.col || CIV[Math.floor(rng() * CIV.length)], draw: OB.drawVehicle, changeT: 4 + rng() * 8, passed: false, minDx: 9e9, horned: false };
};
/* ---- building a stage ---- */
const STYLES = {
  gentle:   { cv: [1.2, 3.2], n: [50, 90], hill: [0, 1400] }, twisty: { cv: [3, 6], n: [40, 70], hill: [0, 1800] },
  hilly:    { cv: [.8, 3], n: [60, 100], hill: [2400, 4600] }, straight: { cv: [0, 1.4], n: [80, 130], hill: [0, 800] }
};
const cache = {};
OB.getStage = id => {
  if (cache[id]) return cache[id];
  const def = OB.STAGES[id], B = OB.BIOMES[def.biome], T = OB.TOD[def.tod], rng = E.rng(def.seed), st = STYLES[def.style];
  const colors = { grass: B.grass, rumble: B.rumble }; if (B.road) colors.road = B.road; if (B.lane) colors.lane = B.lane;
  const road = new E.Road({ segment: SEG, lanes: 3, draw: 190, fog: { color: T.haze, density: def.tod === 'night' ? 5 : 3.2 } });
  const rr = (a, b) => a + rng() * (b - a);
  road.add(36, { colors });
  let total = 36, sign = rng() < .5 ? -1 : 1, tunnelDone = !B.tunnel;
  const end = def.segs - 70;
  while (total < end) {
    const n = Math.min(end - total, Math.round(rr(st.n[0], st.n[1])));
    if (!tunnelDone && total > def.segs * .4) { tunnelDone = true; road.add(90, { curve: 2.2 * sign, tunnel: true, colors: Object.assign({}, colors, { grass: ['#3a3430', '#34302c'] }) }); total += 90; continue; }
    const straight = rng() < (def.style === 'straight' ? .5 : .2), cv = straight ? 0 : rr(st.cv[0], st.cv[1]) * sign, hill = rr(st.hill[0], st.hill[1]) * (rng() < .5 ? 1 : -1);
    road.add(n, { curve: cv, hill, colors }); total += n; sign = -sign;
  }
  road.add(70, { colors });
  const gateZ = (road.segs.length - 28) * SEG;
  // scenery: both sides, kinds of the biome, with variants; none in tunnels
  const kinds = B.scenery, sc = [];
  for (let z = 400, k = 0; z < gateZ - 3000; z += SEG * 3, k++) {
    if (road.seg(z).tunnel) continue;
    const side = k % 2 ? 1 : -1, kind = kinds[Math.floor(rng() * kinds.length)], v = Math.floor(rng() * 100), off = 1.35 + rng() * 1.7 + (['tower', 'house', 'windmill', 'redrock', 'tree', 'orange'].includes(kind) ? .8 : 0);
    road.place(z, side * off, mkThing(kind, v), 1); sc.push(z);
    if (rng() < .4) road.place(z + SEG, -side * (1.5 + rng() * 2), mkThing(kinds[Math.floor(rng() * kinds.length)], Math.floor(rng() * 100)), 1);
  }
  // the fork
  const arch = (label, col, wide) => ({ w: 0, draw(g, x, y, s) { const half = (wide ? 1900 : 950) * s, hh = 1400 * s; if (half < 3) return; px.rect(g, x - half - 40 * s, y - hh, 80 * s, hh, '#f4f0ea'); px.rect(g, x + half - 40 * s, y - hh, 80 * s, hh, '#f4f0ea'); px.rect(g, x - half - 40 * s, y - hh, half * 2 + 80 * s, hh * .26, col); px.rect(g, x - half - 40 * s, y - hh, half * 2 + 80 * s, Math.max(1, hh * .03), '#ffffff'); if (half > 24) E.font.text(g, label, Math.round(x), Math.round(y - hh * .92), '#ffffff', { align: 'center', shadow: '#000', outline: false, font: half < 70 ? 'tiny' : 'normal' }); } });
  const sign2 = (label, side) => ({ w: 600, draw(g, x, y, s) { const W = 760 * s, H = 300 * s; if (W < 6) return; px.rect(g, x - 20 * s, y - H * 2.2, 40 * s, H * 2.2, '#606068'); px.rect(g, x - W / 2, y - H * 2.7, W, H, '#1a6a4a'); px.rect(g, x - W / 2 + 6 * s, y - H * 2.7 + 6 * s, W - 12 * s, H - 12 * s, '#1a6a4a'); if (W > 40) E.font.text(g, (side < 0 ? '◄ ' : '') + label + (side > 0 ? ' ►' : ''), Math.round(x), Math.round(y - H * 2.4), '#ffffff', { align: 'center', shadow: '#000', outline: false, font: 'tiny' }); } });
  if (def.next) {
    const L = OB.STAGES[def.next[0]], Rr = OB.STAGES[def.next[1]];
    // the road visibly splits: a median island grows from nothing to the gate, with a sign at its tip
    const island = k => ({ w: 0, draw(g, x, y, sc) { const W = (40 + k * 40) * sc, H = (24 + k * 5) * sc; if (W < 1.5) return; px.rect(g, x - W, y - H, W * 2, H, B.grass[0]); px.rect(g, x - W, y - H, W * 2, Math.max(1, H * .35), '#ffffff'); if (k > 11) px.rect(g, x - W * .08, y - H * 5, W * .16, H * 4, '#f4f0ea'); } });
    for (let k = 0; k < 14; k++) road.place(gateZ - 5600 + k * 400, 0, island(k), 1);
    road.place(gateZ, -.5, arch(L.name.toUpperCase(), '#e8508a'), 1); road.place(gateZ, .5, arch(Rr.name.toUpperCase(), '#2a8ad0'), 1);
    road.place(gateZ - 9000, -1.55, sign2(L.name, -1), 1); road.place(gateZ - 9000, 1.55, sign2(Rr.name, 1), 1);
    road.place(gateZ - 4500, -1.55, sign2(L.name, -1), 1); road.place(gateZ - 4500, 1.55, sign2(Rr.name, 1), 1);
  } else { road.place(gateZ, 0, arch('GOAL  ' + OB.GOALS[def.idx].name.toUpperCase(), '#e8a020', true), 1); }
  // civilian traffic: deterministic from the stage seed, scaled by density
  const spawn = (density, trng) => {
    const out = [], spacing = 3300 / Math.max(.15, def.traffic * density);
    for (let z = 5000 + trng() * 1800, i = 0; z < gateZ - 1500; z += spacing * (.55 + trng() * .9), i++) {
      const lane = Math.floor(trng() * 3), c = OB.makeVehicle(trng, z, lane, null); out.push(c);
      if (trng() < .18 * def.traffic) { const l2 = (lane + 1 + Math.floor(trng() * 2)) % 3; out.push(OB.makeVehicle(trng, z + trng() * 300, l2, null)); }
    }
    return out;
  };
  return (cache[id] = { def, road, gateZ, sky: OB.skyFor(def.biome, def.tod), spawn, fogColor: T.haze, length: road.length });
};
})();
