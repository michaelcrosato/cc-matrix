/* ---- 20-levels: two chapters' streets as data: buildings, floors, skies, props, shops, waves ---- */
const LEVELS = {
  street: {
    id: 'street', name: 'TUESDAY COLLECTIONS', sub: 'NEWARK AVENUE, 6 P.M.', song: 'street', boss: 'dino', dusk: true,
    objective: 'Collect from the three shops. Then deal with Fat Dino.',
    blocks: [
      { n: 9, h: 112, color: '#8a4434', face: 'brick', kind: 'tenement' }, { n: 8, h: 64, color: '#d8c4a0', face: 'plaster', kind: 'pork', text: 'VESUVIO PORK STORE', tc: '#ffd890' },
      { n: 6, h: 100, color: '#5c4c62', face: 'brick', kind: 'tenement' }, { n: 8, h: 70, color: '#5a7a96', face: 'plaster', kind: 'cleaners', text: 'SPARKLE DRY CLEAN', tc: '#9ae8ff' },
      { n: 4, h: 90, color: '#3a3040', face: 'brick', kind: 'alley' }, { n: 10, h: 76, color: '#2a1a30', face: 'none', kind: 'club', text: 'BADA BOOM', tc: '#ff5aa8' },
      { n: 9, h: 120, color: '#743246', face: 'brick', kind: 'tenement' }, { n: 10, h: 66, color: '#6a6a74', face: 'none', kind: 'garage', text: "SAL'S AUTO", tc: '#ffd24a' }, { n: 6, h: 104, color: '#626c8a', face: 'stone', kind: 'tenement' }],
    lamps: [30, 200, 352, 505, 660, 822, 980, 1090],
    street: [['trashcan', 46, 25, 1.25], ['firedrum', 84, 27, 1.3], ['hydrant', 196, 146, 1], ['trashcan', 312, 25, 1.25], ['firedrum', 520, 26, 1.3], ['trashcan', 626, 25, 1.25], ['hydrant', 690, 146, 1], ['trashcan', 800, 25, 1.25], ['firedrum', 940, 27, 1.3], ['trashcan', 1040, 25, 1.25]],
    boxes: [[11, 74, 'crate'], [18, 100, 'barrel'], [26, 66, 'crate'], [36, 78, 'barrel'], [47, 64, 'crate'], [55, 72, 'barrel']],
    npcs: [{ id: 'pork', x: 212, y: 30, rig: 'shopA', face: Math.PI, name: 'MR. BARTOLO', voice: 'shop', cash: [120, 220] }, { id: 'clean', x: 440, y: 30, rig: 'shopB', face: Math.PI, name: 'WALTER KOWAL', voice: 'shop', cash: [100, 180] },
      { id: 'club', x: 648, y: 30, rig: 'shopC', face: Math.PI, name: 'DESIREE', voice: 'shop', cash: [150, 260] }],
    pickups: [['sandwich', 330, 90], ['sandwich', 700, 100], ['bat', 560, 92], ['sandwich', 930, 120], ['sandwich', 1010, 118]],
    waves: [{ x: 250, foes: ['associate', 'associate'] }, { x: 470, foes: ['tracksuit', 'associate', 'associate'] }, { x: 690, foes: ['heavy', 'shooter', 'associate'] }, { x: 940, foes: ['dino', 'associate', 'shooter'] }],
    ambient: .62, rain: false },
  yard: {
    id: 'yard', name: 'THE MEADOWLANDS YARD', sub: 'WASTE MANAGEMENT. 11 P.M. RAIN.', song: 'yard', boss: 'johnny', dusk: false,
    objective: "Feed the ducks if you need it. Then Johnny Salt.",
    blocks: [
      { n: 6, h: 80, color: '#7a2a2a', face: 'none', kind: 'container', text: 'MEADOW HAULING' }, { n: 6, h: 80, color: '#2a4a7a', face: 'none', kind: 'container', text: 'GARDEN STATE' }, { n: 4, h: 40, color: '#5a4a38', face: 'plank', kind: 'fence' },
      { n: 7, h: 80, color: '#3a6a4a', face: 'none', kind: 'container', text: 'SALT & SONS' }, { n: 6, h: 120, color: '#4a4a52', face: 'stone', kind: 'office', text: 'SCALE HOUSE' }, { n: 5, h: 40, color: '#5a4a38', face: 'plank', kind: 'fence' },
      { n: 7, h: 80, color: '#7a5a2a', face: 'none', kind: 'container', text: 'NO WAY OUT' }, { n: 8, h: 80, color: '#5a2a6a', face: 'none', kind: 'container', text: 'SALT & SONS' }, { n: 5, h: 80, color: '#2a6a6a', face: 'none', kind: 'container', text: 'FRESH PICKED' }],
    lamps: [60, 260, 470, 690, 900],
    street: [['firedrum', 40, 27, 1.3], ['barrel', 100, 140, 1], ['barrel', 330, 26, 1], ['firedrum', 400, 27, 1.3], ['barrel', 500, 140, 1], ['firedrum', 650, 27, 1.3], ['barrel', 780, 26, 1], ['hydrant', 800, 146, 1], ['firedrum', 940, 27, 1.3]],
    boxes: [[6, 44, 'barrel'], [15, 40, 'crate'], [24, 46, 'barrel'], [29, 38, 'crate'], [35, 44, 'barrel'], [43, 40, 'crate'], [50, 46, 'barrel']],
    npcs: [{ id: 'sal', x: 70, y: 100, rig: 'sal', face: 0, name: 'SAL PISTACHIO', voice: 'sal', talk: true }],
    pond: { x: 190, y: 86, rx: 38, ry: 18 }, ducks: 5,
    pickups: [['bat', 118, 60], ['sandwich', 420, 96], ['sandwich', 640, 90], ['sandwich', 850, 120], ['sandwich', 920, 118]],
    waves: [{ x: 280, foes: ['associate', 'tracksuit', 'associate'] }, { x: 480, foes: ['heavy', 'shooter', 'tracksuit'] }, { x: 700, foes: ['shooter', 'shooter', 'heavy', 'associate'] }, { x: 880, foes: ['johnny', 'tracksuit', 'shooter'] }],
    ambient: .42, rain: true }
};
for (const lv of Object.values(LEVELS)) {
  let at = 0; lv.blocks.forEach((b, i) => { b.i = i; b.x0 = at * T; b.w = b.n * T; b.id = 'abcdefghij'[i]; at += b.n; }); lv.len = at * T;
  lv.lights = lv.lamps.map(x => ({ x, y: 46, r: 46, c: lv.dusk ? '#ffb45a' : '#c8e0ff' }));
  for (const b of lv.blocks) if (b.tc) lv.lights.push({ x: b.x0 + b.w * .5, y: 22, r: 44, c: b.tc });
}
const Y0 = 28, Y1 = 136;

/* floor: dusk asphalt with sidewalks and a crosswalk; or the yard's wet gravel with painted bays and a pond */
const hx = c => E.hex(c);
const FL = { slab: hx('#8a8496'), slab2: hx('#837d90'), seam: hx('#5a546c'), lip: hx('#9e98aa'), curb: hx('#c4becc'), cface: hx('#5c566e'), gut: hx('#1c1826'), tar: hx('#3a3450'), tar2: hx('#4a4262'), yel: hx('#e8b440'), paint: hx('#d6d2de'),
  gr1: hx('#4a4640'), gr2: hx('#5a554c'), gr3: hx('#38342e'), mud: hx('#3a3228'), wat: hx('#2a4a6a'), wat2: hx('#3a6a8a'), grass: hx('#2e4a2e') };
const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
function floorStreet(x, y) {
  let c;
  if (y < 42 || y >= 133) { const s = y < 42 ? y - 16 : y - 133, row = s < 10 ? 0 : 1, sy = s - row * 10, sx = (x + s * .7) % 24; c = sx < 1.3 || sy < 1.6 ? FL.seam : sy < 3.2 || sx < 2.6 ? FL.lip : E.hash2(Math.floor((x + s * .7) / 24), row + (y > 99 ? 7 : 0)) > .6 ? FL.slab2 : FL.slab; if (y < 24) c = c.map(v => v * (.6 + (y - 16) * .05)); }
  else if (y < 48.5) c = y < 45 ? FL.curb : FL.cface;
  else if (y < 51 || y >= 130) c = FL.gut;
  else {
    c = mixc(FL.tar, FL.tar2, E.noise2(x * .012, y * .045) * .8);
    const u = (x % 420 - 230) / (.75 + (y - 51) / 79 * .5);
    if (Math.abs(u) < 30 && (u + 30) % 10 < 5.5 && y > 54 && y < 127) c = FL.paint; else if (Math.abs(y - 88.5) < .9 || Math.abs(y - 91.5) < .9) c = FL.yel;
    if (E.noise2(x * .028 + 5, y * .08) > .72) c = mixc(c, hx('#8c6a9c'), .45);
  }
  let [r, g, b] = c;
  for (const Lt of LEVELS.street.lights) { const dx = (x - Lt.x) / Lt.r, dy = (y - Lt.y) / (Lt.r * .6), d2 = dx * dx + dy * dy; if (d2 < 1) { const k = (1 - d2) * (1 - d2) * .7, rgb = Lt.rgb || (Lt.rgb = E.hex(Lt.c)); r += k * rgb[0] * (r / 200 + .12); g += k * rgb[1] * (g / 200 + .12); b += k * rgb[2] * (b / 200 + .12); } }
  return [r, g, b];
}
function floorYard(x, y) {
  const pd = LEVELS.yard.pond, dxp = (x - pd.x) / pd.rx, dyp = (y - pd.y) / pd.ry, d = dxp * dxp + dyp * dyp;
  if (d < 1) return d > .78 ? FL.mud : mixc(FL.wat, FL.wat2, E.noise2(x * .08, y * .12 + game.time * .0) * .9);
  if (d < 1.8) return mixc(FL.grass, FL.mud, E.noise2(x * .1, y * .1));
  let c = mixc(FL.gr3, FL.gr2, E.noise2(x * .03, y * .06) * .9 + E.hash2(x | 0, y | 0) * .15);
  if (y < 30) c = c.map(v => v * .7);
  if (y > 60 && y < 130 && Math.abs(((x % 160) + 160) % 160 - 80) < 1.4) c = FL.paint.map(v => v * .55);        // painted bay lines
  if (E.noise2(x * .02 + 9, y * .07) > .66) c = mixc(c, FL.wat2, .45);                                              // puddles
  let [r, g, b] = c;
  for (const Lt of LEVELS.yard.lights) { const dx = (x - Lt.x) / Lt.r, dy = (y - Lt.y) / (Lt.r * .6), d2 = dx * dx + dy * dy; if (d2 < 1) { const k = (1 - d2) * (1 - d2) * .6, rgb = Lt.rgb || (Lt.rgb = E.hex(Lt.c)); r += k * rgb[0] * (r / 200 + .1); g += k * rgb[1] * (g / 200 + .1); b += k * rgb[2] * (b / 200 + .1); } }
  return [r, g, b];
}
LEVELS.street.floor = floorStreet; LEVELS.yard.floor = floorYard;

/* skies */
const SKY_DUSK = ['#150c30', '#301a52', '#62265e', '#a83a5e', '#e2685a', '#ffa868', '#ffd08a'];
LEVELS.street.sky = () => { const SK = Array.from({ length: 36 }, (_, i) => { const t = Math.min(1, i / 23) * 6, k = Math.min(5, Math.floor(t)); return E.mix(SKY_DUSK[k], SKY_DUSK[k + 1], t - k); });
  return new E.Backdrop({ sky: SK, stars: 36, starsY: .22, layers: [{ kind: 'city', color: '#5e3464', y: .6, height: .3, parallax: .05, windows: '#ffc070' }, { kind: 'city', color: '#3a2248', y: .66, height: .25, parallax: .12, windows: '#ffe08a', seed: 7 }] }); };
LEVELS.yard.sky = () => new E.Backdrop({ sky: ['#06070e', '#0c1220', '#16202e', '#22303c'], stars: 10, starsY: .2, moon: { x: .78, y: .2, r: 14, color: '#c8d4e8' },
  layers: [{ kind: 'city', color: '#10161e', y: .62, height: .26, parallax: .06 }, { kind: 'mountains', color: '#0c1018', y: .72, height: .22, parallax: .1 }, { kind: 'fog', color: '#38485a', y: .88, height: .14, parallax: 0, drift: 5 }] });

/* the map: a row of buildings, then 8 rows of street */
function buildMap(lv) {
  const rows = [lv.blocks.map(b => b.id.repeat(b.n)).join(''), ...Array(8).fill('.'.repeat(lv.len / T))];
  return new E.TileMap({ rows, ao: 0, floorTex: lv.floor, legend: Object.fromEntries(lv.blocks.map(b => [b.id, b.i + 1])),
    types: Object.fromEntries(lv.blocks.map(b => [b.i + 1, { h: b.h, side: b.color, sideLt: b.color, top: E.shade(b.color, -.45), face: b.face, course: b.face === 'brick' ? 3 : undefined, roof: b.face === 'none' ? 'plain' : 'slab' }])) });
}

/* facades: painted onto each building's front (the wall plane, y = T) so they sit right in every camera view */
function paintFront(r, b, lv) {
  const wp = (u, z) => { const s = r.w(b.x0 + u, T, z); return [Math.round(s[0]), Math.round(s[1])]; };
  const at = (b.x0 + b.w / 2), Q = (u, z, w, h, c, a = 1, bias = .01) => { const p = [wp(u, z), wp(u + w, z), wp(u + w, z + h), wp(u, z + h)]; r.queue(at, T + .2, 0, g => { if (a < 1) px.blend(g, a, 'normal', () => px.poly(g, p, c)); else px.poly(g, p, c); }, { bias }); };
  const glow = (u, z, w, h, c, a) => { const p = [wp(u, z), wp(u + w, z), wp(u + w, z + h), wp(u, z + h)]; r.queue(at, T + .3, 0, g => px.blend(g, a, 'add', () => px.poly(g, p, c)), { bias: .02 }); };
  const txt = (s, u, z, c, sc = 1) => { const [x, y] = wp(u, z); r.queue(at, T + .4, 0, g => E.font.text(g, s, x, y, c, { align: 'center', scale: sc, outline: false, shadow: '#000' }), { bias: .03 }); };
  const win = (u, z, w, h, lit) => { Q(u - 1, z - 1, w + 2, h + 2, '#241c2c'); Q(u, z, w, h, lit ? '#ffc46c' : '#28304e'); if (lit) Q(u, z + h - 2, w, 2, '#fff0b4'); Q(u + w / 2 - .5, z, 1, h, '#d8d0c4'); Q(u - 2, z - 2.6, w + 4, 1.6, '#b0a8b8'); };
  const door = (u, w, h, c) => { Q(u - 1.5, 0, w + 3, h + 1.5, '#1c1624'); Q(u, 0, w, h, c); Q(u + 1.5, h * .5, w - 3, h * .36, '#ffd68c'); };
  const lit = (i, j, p = .55) => E.hash2(b.i * 11 + i, j) < p;
  const k = b.kind;
  if (k === 'tenement') { for (let j = 0; j < 3; j++) for (let u = 10, i = 0; u < b.w - 12; u += 25, i++) win(u, 34 + j * 26, 11, 16, lit(i, j)); door(b.w / 2 - 7, 14, 24, '#5a2e22'); Q(0, b.h - 6, b.w, 4, '#b8a8a0'); }
  else if (k === 'pork') { Q(4, 4, b.w - 36, 30, '#3a2418'); Q(6, 5.5, b.w - 40, 27, '#ffd9a0'); Q(6, 24, b.w - 40, 8, '#fff0c8'); for (let u = 10; u < b.w - 36; u += 6) { Q(u, 17, 2, 7, '#a83a3a'); Q(u + 3, 19, 2, 5, '#c8925a'); }
    door(b.w - 26, 14, 24, '#8a2a2a'); Q(8, b.h - 15, b.w - 16, 12, '#2a1a12'); txt(b.text, b.w / 2, b.h - 11, b.tc); glow(8, b.h - 15, b.w - 16, 12, b.tc, .12); }
  else if (k === 'cleaners') { Q(4, 4, b.w - 36, 30, '#1c2a3a'); Q(6, 5.5, b.w - 40, 27, '#9ac8e8'); for (let u = 10, i = 0; u < b.w - 36; u += 9, i++) { Q(u, 12, 6, 18, ['#e8e8f0', '#d84a4a', '#3a5ac8', '#e8c840'][i % 4]); Q(u + 2.7, 30, .6, 4, '#555'); }
    door(b.w - 26, 14, 24, '#3a5a7a'); Q(8, b.h - 17, b.w - 16, 12, '#14243a'); txt(b.text, b.w / 2, b.h - 13, b.tc); glow(8, b.h - 17, b.w - 16, 12, b.tc, .1); }
  else if (k === 'alley') { Q(8, 0, b.w - 16, 40, '#0e0a14'); Q(b.w - 12, 0, 2, b.h - 6, '#4a4a5a'); txt('SKULLZ', b.w * .5, 34, '#4ae8ff', 1); }
  else if (k === 'club') { Q(6, 0, b.w - 12, 38, '#120818'); door(b.w / 2 - 8, 16, 28, '#a01a3a'); for (let u = 10; u < b.w - 12; u += 12) Q(u, 40, 6, 12, E.hash2(b.i, u) > .5 ? '#ff3a8a' : '#6a2a9a');
    Q(8, b.h - 28, b.w - 16, 18, '#12060c'); txt(b.text, b.w / 2, b.h - 22, b.tc, 2); glow(8, b.h - 28, b.w - 16, 18, b.tc, .18); }
  else if (k === 'garage') { Q(10, 0, 70, 40, '#8e929e'); for (let z = 1; z < 40; z += 3) Q(10, z, 70, .8, '#5e626e'); door(b.w - 30, 14, 26, '#3a4a44'); Q(8, b.h - 22, 74, 12, '#1c1c24'); txt(b.text, 45, b.h - 18, b.tc); glow(8, b.h - 22, 74, 12, b.tc, .1); }
  else if (k === 'container' || k === 'office') {
    if (k === 'container') { for (let u = 2; u < b.w - 2; u += 4) Q(u, 0, 1.4, b.h, E.shade(b.color, -.18)); Q(b.w * .08, b.h * .38, b.w * .84, 10, '#14141a'); txt(b.text, b.w / 2, b.h * .38 + 2, '#e8e4d8'); Q(b.w - 6, 0, 2, b.h, '#5a5a62'); }
    else { for (let j = 0; j < 3; j++) for (let u = 10, i = 0; u < b.w - 12; u += 22, i++) win(u, 36 + j * 28, 12, 15, lit(i, j, .4)); door(b.w / 2 - 7, 14, 24, '#3a3a44'); Q(8, b.h - 22, b.w - 16, 11, '#12141a'); txt(b.text, b.w / 2, b.h - 19, '#d8d4c0'); } }
  Q(0, 0, b.w, 7, '#000', .3); Q(0, 0, b.w, 3, '#000', .3);                                     // street grime
}
