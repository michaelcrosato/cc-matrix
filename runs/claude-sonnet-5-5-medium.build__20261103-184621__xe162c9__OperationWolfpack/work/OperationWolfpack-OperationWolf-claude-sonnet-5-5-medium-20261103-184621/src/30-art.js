// Presentation: billboards for every entity type, scenery, FX, telegraph rings, crosshairs, the first-person gun, and the HUD.
(() => {
const E = My3D2dge, WP = globalThis.WP, px = E.px, { clamp, lerp } = WP;
const TN = {}; const tones = h => TN[h] || (TN[h] = E.tones(h));
const A = WP.Art = {};

// local-units polygon: pts are [x (right), y (up)] around the foot point
const P = (g, k, sx, sy, pts, c) => px.poly(g, pts.map(p => [Math.round(sx + p[0] * k), Math.round(sy - p[1] * k)]), c);
const R = (g, k, sx, sy, x, y, w, h, c) => px.rect(g, Math.round(sx + x * k), Math.round(sy - (y + h) * k), Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k)), c);
const D = (g, k, sx, sy, x, y, r, c) => px.disc(g, Math.round(sx + x * k), Math.round(sy - y * k), Math.max(1, Math.round(r * k)), c);
const L = (g, k, sx, sy, x0, y0, x1, y1, c, w = 1) => px.line(g, Math.round(sx + x0 * k), Math.round(sy - y0 * k), Math.round(sx + x1 * k), Math.round(sy - y1 * k), c, w);
const box = (g, k, sx, sy, x, y, w, h, col) => { const t = tones(col); R(g, k, sx, sy, x, y, w, h, t.base); R(g, k, sx, sy, x, y, w, Math.max(.4, h * .2), t.sh); R(g, k, sx, sy, x, y + h * .85, w, Math.max(.4, h * .15), t.lt); };

// ------------------------------------------------------------------ scenery
const SC = {
  palm(g, k, sx, sy, s) { const t = tones('#7a5a38'); P(g, k, sx, sy, [[-1.6 * s, 0], [1.6 * s, 0], [.8 * s, 36 * s], [-.4 * s, 36 * s]], t.base);
    L(g, k, sx, sy, .6 * s, 0, .3 * s, 36 * s, t.sh, Math.max(1, k * .8));
    const gr = tones('#3f8a3c'); const tx = .2 * s, ty = 36 * s;
    for (let i = 0; i < 7; i++) { const a = -Math.PI * .1 + i * Math.PI * 1.2 / 6 - Math.PI * .1, ex = Math.cos(a) * 17 * s, ey = Math.sin(a) * 9 * s - (Math.abs(Math.cos(a)) * 4 * s);
      P(g, k, sx, sy, [[tx, ty + 1], [tx + ex * .55, ty + ey * .4 + 4 * s], [tx + ex, ty + ey - 2 * s], [tx + ex * .5, ty + ey * .3 - 1 * s]], i % 2 ? gr.base : gr.lt); } },
  bush(g, k, sx, sy, s) { const c = tones('#3a7a3a'); D(g, k, sx, sy, -3 * s, 3 * s, 4 * s, c.sh); D(g, k, sx, sy, 3 * s, 3 * s, 4 * s, c.sh); D(g, k, sx, sy, 0, 5 * s, 5 * s, c.base); D(g, k, sx, sy, -1 * s, 6.5 * s, 2.5 * s, c.lt); },
  hut(g, k, sx, sy, s) { box(g, k, sx, sy, -16 * s, 0, 32 * s, 15 * s, '#b8986a'); P(g, k, sx, sy, [[-20 * s, 15 * s], [20 * s, 15 * s], [11 * s, 28 * s], [-11 * s, 28 * s]], tones('#8a6a34').base); L(g, k, sx, sy, -20 * s, 15 * s, 20 * s, 15 * s, tones('#8a6a34').sh, Math.max(1, k * 1.4)); R(g, k, sx, sy, -3 * s, 0, 7 * s, 9 * s, '#3a2a20'); R(g, k, sx, sy, 8 * s, 6 * s, 5 * s, 5 * s, '#2a3a4a'); },
  rock(g, k, sx, sy, s) { const c = tones('#8a8274'); P(g, k, sx, sy, [[-9 * s, 0], [-6 * s, 7 * s], [0, 10 * s], [7 * s, 6 * s], [10 * s, 0]], c.base); P(g, k, sx, sy, [[-6 * s, 7 * s], [0, 10 * s], [3 * s, 5 * s]], c.lt); },
  tower(g, k, sx, sy, s) { const w = tones('#6a4a30'); for (const x of [-8, 8]) L(g, k, sx, sy, x * s, 0, x * .7 * s, 40 * s, w.base, Math.max(1, k * 1.6)); L(g, k, sx, sy, -8 * s, 8 * s, 7 * s, 30 * s, w.sh, 1); L(g, k, sx, sy, 8 * s, 8 * s, -7 * s, 30 * s, w.sh, 1);
    box(g, k, sx, sy, -12 * s, 40 * s, 24 * s, 3 * s, '#8a6a40'); box(g, k, sx, sy, -9 * s, 43 * s, 18 * s, 10 * s, '#7a6a50'); P(g, k, sx, sy, [[-12 * s, 53 * s], [12 * s, 53 * s], [8 * s, 60 * s], [-8 * s, 60 * s]], '#5a3a28'); },
  mangrove(g, k, sx, sy, s) { const c = tones('#4a3a28'), gr = tones('#2f7a3c');
    for (let i = -3; i <= 3; i++) L(g, k, sx, sy, i * 3 * s, 0, i * 1.5 * s, 14 * s, c.base, Math.max(1, k * .9));
    D(g, k, sx, sy, 0, 22 * s, 11 * s, gr.sh); D(g, k, sx, sy, -7 * s, 19 * s, 7 * s, gr.base); D(g, k, sx, sy, 7 * s, 20 * s, 8 * s, gr.base); D(g, k, sx, sy, 0, 27 * s, 7 * s, gr.lt); },
  reeds(g, k, sx, sy, s) { const c = tones('#7a9a4a'); for (let i = -4; i <= 4; i++) L(g, k, sx, sy, i * 1.6 * s, 0, i * 1.6 * s + (i % 2 ? 1.2 : -1.2) * s, (10 + (i & 3) * 3) * s, i % 2 ? c.base : c.lt, 1); },
  fence(g, k, sx, sy, s) { const c = tones('#6a5a48'); for (let i = -2; i <= 2; i++) L(g, k, sx, sy, i * 8 * s, 0, i * 8 * s, 18 * s, c.base, Math.max(1, k * 1.2)); L(g, k, sx, sy, -16 * s, 14 * s, 16 * s, 14 * s, '#b0b0b0', 1); L(g, k, sx, sy, -16 * s, 8 * s, 16 * s, 8 * s, '#b0b0b0', 1); L(g, k, sx, sy, -16 * s, 3 * s, 16 * s, 3 * s, '#909090', 1); },
  lamp(g, k, sx, sy, s) { L(g, k, sx, sy, 0, 0, 0, 30 * s, '#40404a', Math.max(1, k * 1.2)); D(g, k, sx, sy, 0, 31 * s, 2.4 * s, '#ffe9a0'); px.blend(g, .35, 'add', () => D(g, k, sx, sy, 0, 31 * s, 8 * s, '#ffd070')); }
};
A.scenery = SC;

// ------------------------------------------------------------------ props, vehicles, animals
const SH = {
  crate(g, k, sx, sy, e) { box(g, k, sx, sy, -8, 0, 16, 13, '#a67c3e'); L(g, k, sx, sy, -8, 0, 8, 13, '#6a4a26', 1); L(g, k, sx, sy, 8, 0, -8, 13, '#6a4a26', 1); R(g, k, sx, sy, -3, 13, 6, 2, '#5aa05a'); R(g, k, sx, sy, -1, 11, 2, 6, '#e8f0e8'); },
  barrel(g, k, sx, sy, e) { box(g, k, sx, sy, -5, 0, 10, 14, '#c0392b'); R(g, k, sx, sy, -5, 4, 10, 1.4, '#6a1a14'); R(g, k, sx, sy, -5, 9, 10, 1.4, '#6a1a14'); R(g, k, sx, sy, -2, 5, 4, 3, '#f4d03a'); },
  fuel(g, k, sx, sy, e) { box(g, k, sx, sy, -13, 4, 26, 17, '#8a96a0'); D(g, k, sx, sy, -13, 12.5, 8.5, tones('#8a96a0').base); D(g, k, sx, sy, 13, 12.5, 8.5, tones('#8a96a0').sh); R(g, k, sx, sy, -11, 0, 2, 5, '#4a4a4a'); R(g, k, sx, sy, 9, 0, 2, 5, '#4a4a4a'); R(g, k, sx, sy, -4, 11, 8, 3, '#d03030'); },
  mast(g, k, sx, sy, e) { const hpf = e.hp / e.hpMax; const c = e.hp <= 0 ? '#444' : '#d8d8e0';
    L(g, k, sx, sy, -4, 0, -1, 68, c, Math.max(1, k * 1.1)); L(g, k, sx, sy, 4, 0, 1, 68, c, Math.max(1, k * 1.1));
    for (let i = 0; i < 8; i++) { const y0 = i * 8.5, y1 = y0 + 8.5; L(g, k, sx, sy, i % 2 ? 3.5 - i * .36 : -3.5 + i * .36, y0, i % 2 ? -3.5 + (i + 1) * .36 : 3.5 - (i + 1) * .36, y1, '#b0b0c0', 1); }
    box(g, k, sx, sy, -7, 0, 14, 6, '#5a6a5a'); const blink = Math.floor(e.age * 2) % 2; D(g, k, sx, sy, 0, 70, 2.2, blink ? '#ff4040' : '#702020'); if (hpf < .5) { px.blend(g, .5, 'add', () => D(g, k, sx, sy, 2, 30, 4 + Math.sin(e.age * 20), '#ff8030')); } },
  sandbag(g, k, sx, sy, e) { const c = tones('#b09a6a'); for (let row = 0; row < 3; row++) for (let i = 0; i < 5 - row; i++) { const x = -20 + row * 4 + i * 8.2; R(g, k, sx, sy, x, row * 3.7, 8, 3.8, (i + row) % 2 ? c.base : c.lt); R(g, k, sx, sy, x, row * 3.7, 8, .7, c.sh); } },
  goat(g, k, sx, sy, e) { const d = e.dir || 1, c = tones('#d8d0c0'); R(g, k, sx, sy, -7 * d - (d < 0 ? 12 : 0) + 6, 4, 12, 6, c.base); R(g, k, sx, sy, -5 + (d < 0 ? -6 : 0) + 3, 0, 1.6, 5, '#6a5a48'); R(g, k, sx, sy, 3 + (d < 0 ? -6 : 0) - 1, 0, 1.6, 5, '#6a5a48'); D(g, k, sx, sy, 8 * d, 10, 3, c.lt); L(g, k, sx, sy, 8 * d, 12, 10 * d, 16, '#8a7a60', 1); D(g, k, sx, sy, 9 * d, 10.5, .6, '#202020'); },
  hen(g, k, sx, sy, e) { const d = e.dir || 1; D(g, k, sx, sy, 0, 4, 3.6, '#c8601a'); D(g, k, sx, sy, 3 * d, 7.5, 2, '#d8701a'); R(g, k, sx, sy, 4.4 * d, 7.5, 1.4, 1, '#f0c030'); R(g, k, sx, sy, 3 * d, 9, 1, 1, '#d02020'); L(g, k, sx, sy, 0, 1, 0, 0, '#d0a030', 1); },
  jeep(g, k, sx, sy, e) { const d = e.dir || 1, c = tones('#6a6a3a');
    box(g, k, sx, sy, -22, 4, 44, 9, '#6a6a3a'); P(g, k, sx, sy, [[-9 * d, 13], [-9 * d + 5 * d, 21], [9 * d, 21], [11 * d, 13]], c.lt); R(g, k, sx, sy, -4, 15, 8, 5, '#4a7a9a');
    box(g, k, sx, sy, -14 * d - 3, 13, 6, 5, '#7a7a4a'); L(g, k, sx, sy, 16 * d, 19, 24 * d, 20, '#303030', Math.max(1, k * 1.2)); R(g, k, sx, sy, 14 * d, 13, 5, 5, '#404030');
    for (const x of [-14, 14]) { D(g, k, sx, sy, x, 4, 4.6, '#1c1c1c'); D(g, k, sx, sy, x, 4, 2, '#8a8a8a'); } if (e.hp > 0) { D(g, k, sx, sy, -3 * d, 21, 2.3, '#c8a07a'); R(g, k, sx, sy, -5 * d, 22, 5, 2, '#4a5a3a'); } },
  boat(g, k, sx, sy, e) { const w = Math.sin(e.age * 2) * .6; P(g, k, sx, sy + w * k, [[-20, 6], [20, 6], [15, 0], [-17, 0]], tones('#6a7a68').base); R(g, k, sx, sy + w * k, -9, 6, 16, 8, tones('#9aa89a').base); R(g, k, sx, sy + w * k, -6, 10, 9, 3, '#3a5a72'); L(g, k, sx, sy + w * k, 10, 12, 20, 13, '#303030', Math.max(1, k * 1.3)); px.blend(g, .4, 'add', () => R(g, k, sx, sy, -22, -1, 44, 1.2, '#e0f4ff')); },
  skiff(g, k, sx, sy, e) { const w = Math.sin(e.age * 3) * .5; P(g, k, sx, sy + w * k, [[-13, 5], [13, 5], [9, 0], [-10, 0]], tones('#8a5a38').base); R(g, k, sx, sy + w * k, -3, 5, 6, 5, '#c8a07a'); R(g, k, sx, sy + w * k, -4, 10, 8, 2, '#4a5a3a'); L(g, k, sx, sy + w * k, 4, 8, 12, 9, '#303030', 1); },
  canoe(g, k, sx, sy, e) { const w = Math.sin(e.age * 1.5) * .5; P(g, k, sx, sy + w * k, [[-14, 4], [14, 4], [9, 0], [-9, 0]], tones('#a08050').base); R(g, k, sx, sy + w * k, -2, 4, 4, 6, '#e08838'); D(g, k, sx, sy + w * k, 0, 12, 2.2, '#c8a07a'); P(g, k, sx, sy + w * k, [[-5, 12.5], [5, 12.5], [0, 16]], '#d8c070'); },
  heli(g, k, sx, sy, e) { const d = e.dir || 1, t = e.age * 40;
    box(g, k, sx, sy, -16, 8, 32, 13, '#4a5258'); P(g, k, sx, sy, [[10 * d, 14], [20 * d, 11], [20 * d, 9], [10 * d, 8]], '#5a6a72'); R(g, k, sx, sy, 5 * d - 4, 14, 8, 6, '#6a9ab8');
    L(g, k, sx, sy, -16 * d, 16, -34 * d, 20, '#3a4248', Math.max(1, k * 2)); R(g, k, sx, sy, -34 * d, 15, 2, 9, '#3a4248');
    L(g, k, sx, sy, -12, 5, 12, 5, '#2a3036', 1); L(g, k, sx, sy, -8, 5, -8, 8, '#2a3036', 1); L(g, k, sx, sy, 8, 5, 8, 8, '#2a3036', 1);
    L(g, k, sx, sy, 0, 21, 0, 25, '#202428', 1); px.blend(g, .55, 'normal', () => { const ww = 38 + Math.sin(t) * 3; L(g, k, sx, sy, -ww, 25.5, ww, 25.5, '#c8d0d8', Math.max(1, k * 1.3)); }); L(g, k, sx, sy, -34 * d, 22 + Math.sin(t) * 3, -34 * d, 22 - Math.sin(t) * 3, '#c8d0d8', 1);
    if (e.hp / e.hpMax < .5) px.blend(g, .5, 'add', () => D(g, k, sx, sy, -5, 24, 5 + Math.sin(e.age * 18) * 1.4, '#ff8a30')); }
};
A.shapes = SH;

// ------------------------------------------------------------------ projectiles and pickups
const PJ = {
  knife(g, k, sx, sy, e) { const a = e.age * 22; const c = Math.cos(a), s = Math.sin(a), q = Math.max(2, k * 5); px.line(g, Math.round(sx - c * q), Math.round(sy - s * q), Math.round(sx + c * q), Math.round(sy + s * q), '#e8eef4', Math.max(1, Math.round(k * 1.4))); px.disc(g, Math.round(sx - c * q), Math.round(sy - s * q), Math.max(1, Math.round(k * 1.3)), '#7a4a28'); },
  grenade(g, k, sx, sy, e) { const r = Math.max(3, k * 3.4); px.disc(g, Math.round(sx), Math.round(sy), Math.round(r), '#3a5a30'); px.disc(g, Math.round(sx - r * .3), Math.round(sy - r * .3), Math.max(1, Math.round(r * .4)), '#78a060'); px.rect(g, Math.round(sx - 1), Math.round(sy - r - 2), 2, 2, '#c0c0c0'); },
  missile(g, k, sx, sy, e) { const r = Math.max(3, k * 4); px.rect(g, Math.round(sx - r * .5), Math.round(sy - r), Math.round(r), Math.round(r * 2), '#e8e8e8'); px.rect(g, Math.round(sx - r * .5), Math.round(sy - r), Math.round(r), Math.max(1, Math.round(r * .5)), '#d03030'); px.blend(g, .8, 'add', () => px.disc(g, Math.round(sx), Math.round(sy + r + 1), Math.max(2, Math.round(r * .8 + Math.sin(e.age * 40))), '#ffb040')); },
  shell(g, k, sx, sy, e) { const r = Math.max(4, k * 6); px.disc(g, Math.round(sx), Math.round(sy), Math.round(r), '#2a2a30'); px.disc(g, Math.round(sx - r * .3), Math.round(sy - r * .3), Math.max(1, Math.round(r * .35)), '#7a7a88'); px.blend(g, .5, 'add', () => px.disc(g, Math.round(sx), Math.round(sy), Math.round(r * 1.5 + Math.sin(e.age * 25) * 1.5), '#ff7020')); }
};
A.projs = PJ; A.pj = (g, k, sx, sy, e) => PJ[e.t](g, k, sx, sy, e);
const PK = {
  mag: ['#f2c230', g => { }], gren: ['#4a7a3a'], med: ['#f4f4f4'], fury: ['#e03a3a'], tnt: ['#c03030'], medal: ['#ffd24a']
};
A.pickupIcon = (g, cx, cy, s, kind, t) => {   // s = half size in px
  const bob = Math.round(Math.sin(t * 5) * 1);
  cy += bob;
  const col = PK[kind][0];
  px.blend(g, .3 + Math.sin(t * 8) * .1, 'add', () => px.disc(g, cx, cy, Math.round(s * 1.5), kind === 'med' ? '#60ff90' : '#ffe080'));
  px.disc(g, cx, cy, Math.round(s + 1), '#101018');
  if (kind === 'mag') { px.rect(g, cx - s * .6 | 0, cy - s * .8 | 0, Math.round(s * 1.2), Math.round(s * 1.6), '#f2c230'); for (let i = 0; i < 3; i++) px.rect(g, cx - s * .4 + i * s * .4 | 0, cy - s * .9 | 0, Math.max(1, s * .25 | 0), Math.max(2, s * .5 | 0), '#c88a20'); }
  else if (kind === 'gren') { px.disc(g, cx, cy + 1, Math.round(s * .75), '#4a7a3a'); px.rect(g, cx - 1, cy - s | 0, 2, 3, '#c0c0c0'); }
  else if (kind === 'med') { px.rect(g, cx - s * .8 | 0, cy - s * .8 | 0, Math.round(s * 1.6), Math.round(s * 1.6), '#f4f4f4'); px.rect(g, cx - 1, cy - s * .6 | 0, 2, Math.round(s * 1.2), '#20a040'); px.rect(g, cx - s * .6 | 0, cy - 1, Math.round(s * 1.2), 2, '#20a040'); }
  else if (kind === 'fury') { px.poly(g, [[cx + 1, cy - s], [cx - s * .7, cy + 1], [cx, cy + 1], [cx - 1, cy + s], [cx + s * .7, cy - 1], [cx, cy - 1]], '#ffe040'); }
  else if (kind === 'tnt') { for (let i = -1; i <= 1; i++) px.rect(g, cx + i * 3 - 1, cy - s * .7 | 0, 3, Math.round(s * 1.4), '#d03a3a'); px.line(g, cx, cy - s * .7, cx + 2, cy - s, '#f0f0f0', 1); px.dot(g, cx + 2, cy - s, '#ffa030'); }
  else if (kind === 'medal') { px.disc(g, cx, cy, Math.round(s * .7), '#ffd24a'); px.disc(g, cx, cy, Math.max(1, Math.round(s * .35)), '#c8901a'); }
};

// ------------------------------------------------------------------ rigs
const RIGCFG = {
  grunt: { build: 'chibi', weapon: 'gun', hat: { style: 'helmet', color: '#5a5a48' }, outfit: 'shirt', sleeves: 'long', colors: { cloth: '#7a7040', pants: '#4a4a30', boot: '#2a2418', hair: '#3a2a20', plate: '#5a5a48', skin: '#c8a07a' } },
  knifer: { build: 'chibi', weapon: null, hat: { style: 'band', color: '#c03030' }, outfit: 'shirt', colors: { cloth: '#a86a3a', pants: '#3a3a4a', hair: '#1a1a1a', trim: '#c03030', skin: '#b88a66' } },
  grenadier: { build: 'chibi', weapon: null, hat: { style: 'cap', color: '#3a2a4a' }, outfit: 'coat', colors: { cloth: '#5a4a6a', coat: '#4a3a5a', pants: '#2a2a38', hair: '#5a3a20', skin: '#d0a888' } },
  heavy: { build: 'bulky', weapon: 'gun', hat: { style: 'helmet', color: '#6a6870' }, armor: true, outfit: 'coat', size: 1.28, colors: { cloth: '#4a4048', coat: '#5a3a3a', plate: '#78747a', pants: '#2a2a30', hair: '#1a1a1a', skin: '#a88060' } },
  sniper: { build: 'chibi', weapon: 'gun', hood: true, outfit: 'coat', colors: { cloth: '#3a5a38', coat: '#4a6a3a', hair: '#3a5a38', pants: '#2a3a28', skin: '#b08860' } },
  civ: { build: 'chibi', weapon: null, outfit: 'shirt', sleeves: 'short', colors: { cloth: '#d86a4a', pants: '#6a5a40', hair: '#2a1a10', skin: '#a07048' } },
  host: { build: 'chibi', weapon: null, outfit: 'shirt', sleeves: 'short', colors: { cloth: '#f0f0e8', pants: '#3a5a8a', hair: '#8a5a30', trim: '#20a040', skin: '#e0b898' } },
  den: { build: 'chibi', weapon: null, outfit: 'coat', hat: { style: 'band', color: '#40a0d0' }, colors: { cloth: '#6a7a8a', hair: '#c8c8d0', trim: '#40a0d0', skin: '#c89a78' } },
  kragg: { build: 'bulky', weapon: 'gun', hat: { style: 'crown', color: '#d0a030' }, armor: true, outfit: 'coat', size: 2.0, cape: { len: 8, width: 7, seg: 2.5 }, colors: { cloth: '#6a2a2a', coat: '#7a2a28', plate: '#9a8a58', pants: '#2a1a1a', hair: '#ddd', cape: '#a02a28', capeIn: '#401010', skin: '#c89a78' } },
  hostageCap: {}
};
const CIVS = ['#d86a4a', '#4a8ad8', '#d8c04a', '#9a5ad8', '#4ad8a0'];
A.makeRig = (kind, seed = 0) => {
  const c = JSON.parse(JSON.stringify(RIGCFG[kind] || RIGCFG.grunt));
  if (kind === 'civ') { c.colors.cloth = CIVS[Math.floor(seed * 5) % 5]; c.hat = seed > .5 ? { style: 'band', color: '#e8e0c8' } : undefined; c.hair = seed > .7 ? 'long' : seed > .3 ? 'short' : 'bald'; }
  if (kind === 'grunt') { c.colors.hair = seed > .5 ? '#3a2a20' : '#6a4a2a'; }
  const rig = new E.Humanoid(Object.assign({ size: 1 }, c));
  return rig;
};
A.rigFor = e => (e.ty.rig);

// ------------------------------------------------------------------ boss bodies
const BS = {
  bigear(g, k, sx, sy, e) {
    const f = e.flash > 0; const tone = c => f ? '#ffffff' : c;
    for (const x of [-26, -8, 12, 28]) { D(g, k, sx, sy, x, 5, 6, '#1a1a1a'); D(g, k, sx, sy, x, 5, 2.5, '#6a6a6a'); }
    box(g, k, sx, sy, -37, 6, 74, 34, tone('#586a50')); box(g, k, sx, sy, 14, 6, 23, 22, tone('#4a5a44')); R(g, k, sx, sy, 18, 22, 15, 7, '#5a8aa8');
    R(g, k, sx, sy, -33, 14, 42, 3, tone('#3a4a36')); R(g, k, sx, sy, -33, 24, 42, 3, tone('#3a4a36'));
    for (let i = 0; i < 4; i++) R(g, k, sx, sy, -30 + i * 10, 40, 8, 4, '#9a8a58');   // sandbags on roof
    const w = e.boss.wp; L(g, k, sx, sy, w.dx, 40, w.dx, 52, '#9aa0a8', Math.max(1, k * 1.5));
    P(g, k, sx, sy, [[w.dx - 15, 62], [w.dx + 15, 62], [w.dx + 6, 52], [w.dx - 6, 52]], tone('#d8dce4')); P(g, k, sx, sy, [[w.dx - 15, 62], [w.dx, 66], [w.dx + 15, 62]], tone('#a8aeb8'));
    D(g, k, sx, sy, w.dx, w.dy, 3, e.st === 'stun' || Math.floor(e.age * 4) % 2 ? '#ff5050' : '#a02020');
    if (e.hp / e.hpMax < .5) px.blend(g, .5, 'add', () => D(g, k, sx, sy, -20, 44, 6 + Math.sin(e.age * 14), '#ff8a30')); },
  riverhog(g, k, sx, sy, e) {
    const f = e.flash > 0, tone = c => f ? '#ffffff' : c, w = Math.sin(e.age * 1.7) * .7;
    P(g, k, sx, sy + w * k, [[-46, 12], [46, 12], [38, 0], [-40, 0]], tone('#5a6a62')); R(g, k, sx, sy + w * k, -44, 8, 88, 3, tone('#8a3a2a'));
    box(g, k, sx, sy + w * k, -34, 12, 50, 12, tone('#7a8a82')); box(g, k, sx, sy + w * k, -12, 24, 30, 18, tone('#9aa8a0')); R(g, k, sx, sy + w * k, -8, 34, 22, 5, '#3a5a72');
    L(g, k, sx, sy + w * k, 24, 20, 44, 24, '#2a2a30', Math.max(2, k * 3)); D(g, k, sx, sy + w * k, 44, 24, 2, '#ff9a40');
    L(g, k, sx, sy + w * k, 22, 42, 22, 52, '#303038', 1); D(g, k, sx, sy + w * k, 22, 53, 2, '#ff3030');
    const wp = e.boss.wp; D(g, k, sx, sy + w * k, wp.dx, wp.dy - 6, 3, e.st === 'stun' || Math.floor(e.age * 4) % 2 ? '#ff5050' : '#a02020');
    px.blend(g, .4, 'add', () => R(g, k, sx, sy, -50, -1, 100, 1.4, '#e0f4ff')); },
  butcher(g, k, sx, sy, e) {
    const f = e.flash > 0, tone = c => f ? '#ffffff' : c;
    P(g, k, sx, sy, [[-38, 0], [38, 0], [42, 12], [-42, 12]], tone('#4a4a38')); for (let i = -4; i <= 4; i++) D(g, k, sx, sy, i * 9, 6, 5, '#2a2a22');
    box(g, k, sx, sy, -34, 12, 68, 12, tone('#6a6a48')); P(g, k, sx, sy, [[-24, 24], [24, 24], [18, 38], [-18, 38]], tone('#7a7a54'));
    L(g, k, sx, sy, 10, 32, 50, 34, '#2a2a28', Math.max(2, k * 4)); R(g, k, sx, sy, 46, 31, 6, 5, '#3a3a38');
    R(g, k, sx, sy, -20, 38, 14, 3, '#3a3a2a'); const w = e.boss.wp; D(g, k, sx, sy, w.dx, w.dy, 4.5, '#2a2a22'); D(g, k, sx, sy, w.dx, w.dy, 3, e.st === 'stun' || Math.floor(e.age * 4) % 2 ? '#ff5050' : '#a02020');
    L(g, k, sx, sy, -14, 38, -14, 50, '#303030', 1); D(g, k, sx, sy, -14, 52, 2, '#d03030');
    for (const x of [-30, -18, -6]) R(g, k, sx, sy, x, 24, 8, 2, tone('#4a4a30')); },
  kragg(g, k, sx, sy, e) {   // an iron stilt-frame under the General's rig
    const f = e.flash > 0, tone = c => f ? '#ffffff' : c;
    for (const x of [-20, 20]) { L(g, k, sx, sy, x, 0, x * .6, 26, tone('#5a5a64'), Math.max(2, k * 3)); R(g, k, sx, sy, x - 7, 0, 14, 3, tone('#3a3a44')); }
    box(g, k, sx, sy, -26, 24, 52, 8, tone('#5a5a64')); R(g, k, sx, sy, -26, 30, 52, 2, tone('#d0a030'));
    D(g, k, sx, sy, -28, 30, 5, tone('#7a7a84')); D(g, k, sx, sy, 28, 30, 5, tone('#7a7a84'));
    L(g, k, sx, sy, 28, 30, 40, 36, '#2a2a30', Math.max(2, k * 3)); }
};
A.bosses = BS;

// ------------------------------------------------------------------ the FX store (world particles drawn as billboards)
class FX {
  constructor() { this.p = []; this.texts = []; this.tracers = []; this.rings = []; this.marks = []; this.flashes = []; this.rr = WP.mulberry(77); }
  r() { return this.rr(); }
  clear() { this.p.length = 0; this.texts.length = 0; this.tracers.length = 0; this.marks.length = 0; }
  explode(x, y, z, size = 14) {
    const n = Math.round(6 + size * .5);
    for (let i = 0; i < n; i++) { const a = this.r() * 6.28, sp = (.3 + this.r()) * size * 2.2; this.p.push({ k: 'fire', x, y, z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .3, vz: (.2 + this.r()) * size * 2.5, life: .5 + this.r() * .5, max: 1, r: size * (.25 + this.r() * .3) }); }
    this.p.push({ k: 'flash', x, y, z, vx: 0, vy: 0, vz: 0, life: .22, max: .22, r: size * 1.1 });
    for (let i = 0; i < 4 + size / 4; i++) this.p.push({ k: 'smoke', x: x + (this.r() - .5) * size, y, z: z + this.r() * size * .5, vx: (this.r() - .5) * 12, vy: 0, vz: 10 + this.r() * 18, life: 1 + this.r() * 1.1, max: 2, r: size * (.3 + this.r() * .35) });
    for (let i = 0; i < 5; i++) { const a = this.r() * 6.28; this.p.push({ k: 'bit', x, y, z, vx: Math.cos(a) * size * 3, vy: 0, vz: size * (2 + this.r() * 4), life: .8 + this.r() * .4, max: 1, r: .8 }); }
  }
  dust(x, y, z, n = 4, col = '#c8b888') { for (let i = 0; i < n; i++) this.p.push({ k: 'dust', x, y, z, vx: (this.r() - .5) * 30, vy: 0, vz: 10 + this.r() * 25, life: .5 + this.r() * .3, max: .8, r: 1.6 + this.r() * 1.6, col }); }
  sparks(x, y, z, n = 5) { for (let i = 0; i < n; i++) this.p.push({ k: 'spark', x, y, z, vx: (this.r() - .5) * 70, vy: 0, vz: 15 + this.r() * 50, life: .3 + this.r() * .25, max: .5, r: .6 }); }
  text(sx, sy, str, col, big) { this.texts.push({ x: sx, y: sy, s: str, c: col, life: 1.0, max: 1.0, big }); }
  tracer(x0, y0, x1, y1, col) { this.tracers.push({ x0, y0, x1, y1, life: .06, col }); }
  mark(x, y, kind) { this.marks.push({ x, y, kind, life: .25 }); }
  update(dt) {
    for (const p of this.p) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.k === 'bit' || p.k === 'spark') p.vz -= 260 * dt; if (p.k === 'smoke') { p.vz *= .98; p.r += dt * 6; } if (p.k === 'fire') { p.vz -= 40 * dt; p.r *= (1 - dt * .9); } if (p.z < 0 && (p.k === 'bit' || p.k === 'spark')) { p.z = 0; p.vz *= -.3; p.vx *= .6; } }
    this.p = this.p.filter(p => p.life > 0);
    for (const t of this.texts) { t.life -= dt; t.y -= 16 * dt; } this.texts = this.texts.filter(t => t.life > 0);
    for (const t of this.tracers) t.life -= dt; this.tracers = this.tracers.filter(t => t.life > 0);
    for (const m of this.marks) m.life -= dt; this.marks = this.marks.filter(m => m.life > 0);
  }
  gather(m7) {
    for (const p of this.p) { const q = p; m7.add(q.x, q.y, q.z, (g, sx, sy, k) => {
      const u = 1 - q.life / q.max, r = Math.max(1, Math.round(q.r * k));
      if (q.k === 'fire') { const c = u < .3 ? '#fff0a0' : u < .6 ? '#ffa030' : '#c04018'; px.blend(g, 1 - u * .6, 'add', () => px.disc(g, Math.round(sx), Math.round(sy), r, c)); }
      else if (q.k === 'flash') px.blend(g, 1 - u, 'add', () => px.disc(g, Math.round(sx), Math.round(sy), Math.round(r * (1 + u)), '#ffffff'));
      else if (q.k === 'smoke') px.blend(g, .5 * (1 - u), 'normal', () => px.disc(g, Math.round(sx), Math.round(sy), r, '#4a4444'));
      else if (q.k === 'dust') px.blend(g, .6 * (1 - u), 'normal', () => px.disc(g, Math.round(sx), Math.round(sy), r, q.col));
      else if (q.k === 'spark') px.rect(g, Math.round(sx), Math.round(sy), 1, 1, '#ffe080');
      else px.rect(g, Math.round(sx), Math.round(sy), Math.max(1, r), Math.max(1, r), '#3a3028');
    }); }
  }
  drawScreen(g) {
    for (const t of this.tracers) px.line(g, t.x0, t.y0, t.x1, t.y1, t.col || '#ffe9a0', 1);
    for (const m of this.marks) { const c = m.kind === 'head' ? '#ffd24a' : m.kind === 'weak' ? '#ff6a40' : '#ffffff', s = m.kind === 'head' || m.kind === 'weak' ? 5 : 3; px.line(g, m.x - s, m.y - s, m.x + s, m.y + s, c, 1); px.line(g, m.x - s, m.y + s, m.x + s, m.y - s, c, 1); }
    for (const t of this.texts) { E.font.text(g, t.s, Math.round(t.x), Math.round(t.y), t.c, { align: 'center', outline: '#000', scale: t.big ? 2 : 1 }); }
  }
}
A.FX = FX;

// ------------------------------------------------------------------ rings, crosshairs, gun
A.ring = (g, cx, cy, r, col, w) => { const n = Math.max(12, Math.round(r * 1.6)); let px0 = cx + r, py0 = cy; for (let i = 1; i <= n; i++) { const a = i / n * Math.PI * 2, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; px.line(g, Math.round(px0), Math.round(py0), Math.round(x), Math.round(y), col, w); px0 = x; py0 = y; } };
A.telegraph = (g, cx, cy, r0, u, col, big) => {
  const r = lerp(r0, r0 * .32, u), pulse = u > .8 ? (Math.floor(u * 30) % 2 ? '#ffffff' : col) : col;
  A.ring(g, cx, cy, r0 + 1, '#00000080', 3); A.ring(g, cx, cy, r, pulse, big ? 3 : 2);
  A.ring(g, cx, cy, Math.max(2, r0 * .32), '#ffffff60', 1);
  px.line(g, cx - 3, cy, cx + 3, cy, pulse, 1); px.line(g, cx, cy - 3, cx, cy + 3, pulse, 1);
};
A.crosshair = (g, p, col, t, local) => {
  const x = Math.round(p.x), y = Math.round(p.y), s = 7 + Math.min(6, p.bloom || 0), c = p.fury > 0 ? '#ffd24a' : col;
  A.ring(g, x, y, s, '#000000', 3); A.ring(g, x, y, s, c, 1);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { px.line(g, x + dx * (s - 3), y + dy * (s - 3), x + dx * (s + 4), y + dy * (s + 4), '#000', 3); px.line(g, x + dx * (s - 2), y + dy * (s - 2), x + dx * (s + 3), y + dy * (s + 3), c, 1); }
  px.dot(g, x, y, c);
  if (p.reload > 0) { const u = 1 - p.reload / T_().reloadTime; const n = Math.round(u * 24); for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i / 24 * Math.PI * 2; px.dot(g, Math.round(x + Math.cos(a) * (s + 7)), Math.round(y + Math.sin(a) * (s + 7)), '#ffffff'); } }
  if (p.mag <= 0 && p.reload <= 0 && p.spares <= 0 && p.fury <= 0) E.font.text(g, 'EMPTY', x, y + s + 8, '#ff5050', { align: 'center', outline: '#000' });
  else if (p.mag <= 6 && p.mag > 0 && p.reload <= 0 && Math.floor(t * 4) % 2 === 0) E.font.text(g, 'LOW', x, y + s + 8, '#ffd24a', { align: 'center', outline: '#000' });
};
const T_ = () => WP.T;
A.gun = (g, p, aimX, aimY, t, seatCol, sx0) => {
  const kick = Math.max(0, 1 - (t - p.lastFire) * 14), x0 = sx0, y0 = 266;
  const a = Math.atan2(aimY - y0, aimX - x0), len = 86 - kick * 8, ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
  const pt = (f, o) => [Math.round(x0 + ca * f + nx * o), Math.round(y0 + sa * f + ny * o - kick * 3)];
  const body = '#2a2c32', hi = '#4a4e58', rec = p.reload > 0 ? Math.sin((1 - p.reload / T_().reloadTime) * Math.PI) * 26 : 0;
  px.poly(g, [pt(-6, -14), pt(len * .58, -9), pt(len * .58, 8), pt(-6, 16)], body);
  px.poly(g, [pt(-6, -14), pt(len * .58, -9), pt(len * .58, -6), pt(-6, -10)], hi);
  px.poly(g, [pt(len * .52, -5), pt(len, -3.5), pt(len, 3.5), pt(len * .52, 5)], '#16181c');
  px.poly(g, [pt(len * .86, -6), pt(len * .96, -6), pt(len * .96, 6), pt(len * .86, 6)], '#2a2c32');
  px.line(g, ...pt(8, -10), ...pt(len * .56, -7), '#6a6e78', 1);
  px.poly(g, [pt(len * .28, 8), pt(len * .4, 8), pt(len * .42 + 5, 26 + rec), pt(len * .3 + 5, 26 + rec)], p.fury > 0 ? '#e0a020' : '#5a4a30');
  px.poly(g, [pt(len * .08, 12), pt(len * .2, 12), pt(len * .22, 26), pt(len * .08, 26)], '#1e1e22');
  px.disc(g, ...pt(len + 1, 0), 1, '#101010');
  if (kick > .45) { px.blend(g, kick, 'add', () => { const m = pt(len + 4, 0); px.disc(g, m[0], m[1], 5 + Math.round(kick * 3), '#ffd070'); px.disc(g, m[0], m[1], 2, '#ffffff'); }); }
  px.disc(g, ...pt(len * .8, 0), 0, seatCol);
};
A.healthColor = f => f < .5 ? '#4ad060' : f < .75 ? '#f0c030' : '#e03a3a';

// ------------------------------------------------------------------ HUD
A.hud = (g, w, o) => {
  const sim = o.sim, W = WP.W, H = WP.H, t = o.t, glyph = o.label;
  const q = sim.q, st = sim.st;
  // quota counters
  const cats = [['soldier', 'SOLDIERS'], ['vehicle', st.id === 'op2' ? 'BOATS' : 'VEHICLES'], ['air', 'AIRCRAFT']].filter(c => q.need[c[0]]);
  let x = 6;
  for (const [k, name] of cats) {
    const got = Math.min(q.got[k], q.need[k]), done = got >= q.need[k];
    E.ui.box(g, x, 5, 78, 17, { bg: ['#00000090', '#00000090'], border: done ? '#4ad060' : '#505868', gradient: false });
    E.font.text(g, name, x + 4, 7, '#a8b0c0', { font: 'tiny' });
    E.font.text(g, String(got).padStart(2, '0') + '/' + String(q.need[k]).padStart(2, '0'), x + 74, 13, done ? '#4ad060' : '#ffffff', { align: 'right', outline: '#000' });
    x += 82;
  }
  if (st.objective) { const left = sim.stats.mastTotal - sim.stats.masts; E.ui.box(g, x, 5, 70, 17, { bg: ['#00000090', '#00000090'], border: left ? '#505868' : '#4ad060', gradient: false }); E.font.text(g, 'MASTS', x + 4, 7, '#a8b0c0', { font: 'tiny' }); E.font.text(g, (sim.stats.mastTotal - left) + '/' + sim.stats.mastTotal, x + 66, 13, left ? '#fff' : '#4ad060', { align: 'right', outline: '#000' }); x += 74; }
  if (st.id === 'op4') { E.ui.box(g, x, 5, 78, 17, { bg: ['#00000090', '#00000090'], border: '#505868', gradient: false }); E.font.text(g, 'HOSTAGES', x + 4, 7, '#a8b0c0', { font: 'tiny' }); E.font.text(g, sim.host.saved + ' SAFE ' + sim.host.lost + ' LOST', x + 74, 13, '#fff', { align: 'right', outline: '#000' }); }
  // boss bar
  const be = sim.bossEnt;
  if (be && !be.dead && sim.phase === 'boss') { const bw = 200, bx = (W - bw) / 2, by = 26; E.font.text(g, be.boss.name, W / 2, by - 1, '#ffffff', { align: 'center', outline: '#000' }); E.ui.box(g, bx - 2, by + 8, bw + 4, 9, { bg: ['#000', '#000'], border: '#000', gradient: false }); const f = clamp(be.hp / be.hpMax, 0, 1); px.rect(g, bx, by + 10, Math.round(bw * f), 5, be.st === 'stun' ? '#ffd24a' : '#d83a3a'); for (const a of be.boss.phases.slice(1)) px.rect(g, bx + Math.round(bw * a.at), by + 9, 1, 7, '#ffffff'); }
  // players
  const act = sim.players.filter(p => p.active), n = act.length;
  const pw = n === 1 ? 160 : 112;
  act.forEach((p, i) => {
    const x0 = n === 1 ? 6 : 4 + i * (pw + 4), y0 = H - 38, col = WP.SEAT[p.pid];
    E.ui.box(g, x0, y0, pw, 34, { bg: ['#000000a0', '#000000a0'], border: col, gradient: false });
    if (n > 1) E.font.text(g, 'P' + (p.pid + 1), x0 + 3, y0 + 3, col, { font: 'tiny' });
    // damage meter
    const bx = x0 + (n > 1 ? 18 : 4), bwid = pw - (n > 1 ? 22 : 8), f = p.dmg / 100;
    px.rect(g, bx, y0 + 3, bwid, 6, '#202028'); px.rect(g, bx, y0 + 3, Math.round(bwid * f), 6, A.healthColor(f)); if (p.hitT > 0) px.rect(g, bx, y0 + 3, bwid, 6, '#ffffff40');
    E.font.text(g, p.down ? 'DOWN' : 'DAMAGE', bx + 2, y0 + 3, '#ffffff', { font: 'tiny', outline: false });
    // ammo pips: bullets in magazine as bar
    const mf = p.mag / T_().magSize; px.rect(g, bx, y0 + 12, bwid - 30, 4, '#202028'); px.rect(g, bx, y0 + 12, Math.round((bwid - 30) * mf), 4, p.fury > 0 ? '#ffd24a' : mf < .25 ? '#e03a3a' : '#f2e8c0');
    E.font.text(g, p.fury > 0 ? 'FURY' : String(p.mag).padStart(2, '0'), bx + bwid - 2, y0 + 10, p.fury > 0 ? '#ffd24a' : '#ffffff', { align: 'right', outline: '#000', font: 'tiny' });
    for (let m = 0; m < Math.min(p.spares, 9); m++) px.rect(g, bx + m * 5, y0 + 19, 3, 5, '#d8b040');
    for (let m = 0; m < Math.min(p.grenades, 9); m++) px.disc(g, bx + 4 + m * 6, y0 + 29, 2, '#5a9a48');
    E.font.text(g, String(p.score), x0 + pw - 4, y0 + 20, col, { align: 'right', outline: '#000' });
    const mult = 1 + Math.min(4, Math.floor(p.streak / 5)); if (mult > 1) E.font.text(g, 'x' + mult, x0 + pw - 4, y0 + 27, '#ffd24a', { align: 'right', outline: '#000', font: 'tiny' });
  });
  // prompts (first seconds of an operation, and for the first player)
  if (o.hint && sim.t < 18 && sim.phase === 'rail') {
    const lines = o.hint; let yy = 26; for (const s of lines) { E.font.text(g, s, W - 6, yy, '#e8e8f0', { align: 'right', outline: '#000' }); yy += 10; }
  }
};
})();
