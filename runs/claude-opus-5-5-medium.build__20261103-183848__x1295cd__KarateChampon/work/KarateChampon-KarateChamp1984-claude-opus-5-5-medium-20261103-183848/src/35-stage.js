/* ---- STAGES: painters for the 8 fight stages and 3 bonus locations (backdrop, custom layers, floor, props, crowd,
 * lights, weather). The arena is x 0-400; the world is painted from -160 to 560 so a wide screen never shows emptiness. */
E.SHAPES.toro = { about: 'stone lantern (toro)', tags: 'japan garden', mats: { s: 'granite', f: 'flame' }, lights: [[0, 0, 22, '#ffc070', 50]],
  parts: [['cyl', 's', [0, 0, 0], 5, 3, { seg: 6 }], ['cyl', 's', [0, 0, 3], 2, 12, { seg: 6 }], ['box', 's', [0, 0, 15], [9, 9, 2]], ['box', 'f', [0, 0, 17], [5, 5, 5]], ['cyl', 's', [0, 0, 22], 8, 4, { r2: 1, seg: 4 }]] };
E.SHAPES.torii = { about: 'vermilion torii gate', tags: 'japan shrine', mats: { v: '#d8402a', k: '#1a1416' },
  parts: [['mirror', 'x', ['cyl', 'v', [14, 0, 0], 2.2, 40]], ['box', 'k', [0, 0, 40], [42, 4, 3]], ['box', 'v', [0, 0, 32], [34, 3, 2.5]], ['box', 'k', [0, 0, 43], [46, 5, 2]]] };
E.SHAPES.cinder = { about: 'cinder block', tags: 'dojo', mats: { c: 'stone' }, parts: [['box', 'c', [0, 0, 0], [10, 8, 8]]] };
E.SHAPES.taiko = { about: 'taiko drum on a stand', tags: 'dojo japan', mats: { w: 'walnut', h: 'linen', b: 'gold' },
  parts: [['box', 'w', [0, 0, 0], [16, 6, 6]], ['lathe', 'w', [0, 0, 6], [[0, 0], [7, 0], [8.5, 6], [7, 12], [0, 12]]], ['cyl', 'h', [0, 0, 18], 7, .5]] };
E.SHAPES.cart = E.SHAPES.cart || E.SHAPES.cart;
E.SHAPES.champonBowl = { about: 'a steaming bowl of champon', tags: 'food', mats: { b: '#e8e0d0', s: '#d8a050', r: '#c8302a' }, parts: [['lathe', 'b', [0, 0, 0], [[0, 0], [2, 0], [5, 3], [5.5, 4.5], [0, 4.5]]], ['cyl', 's', [0, 0, 4], 5, .5], ['box', 'r', [0, 0, 4.4], [6, .5, .4]]] };
E.SHAPES.goldenBowl = { about: 'the Golden Bowl trophy on a plinth', tags: 'trophy', mats: { g: 'gold', p: 'marble' },
  parts: [['box', 'p', [0, 0, 0], [12, 12, 10]], ['cyl', 'g', [0, 0, 10], 2, 4], ['lathe', 'g', [0, 0, 14], [[0, 0], [3, 0], [8, 6], [9, 9], [0, 9]]], ['mirror', 'x', ['box', 'g', [9, 0, 19], [2, 1, 4]]]] };
E.SHAPES.noodleCart = { about: "Mei's noodle cart", tags: 'food stall', mats: { w: 'oak', c: '#c8302a', p: 'iron' }, lights: [[-8, 0, 30, '#ffb060', 50]],
  parts: [['box', 'w', [0, 0, 5], [30, 14, 14]], ['mirror', 'x', ['cyl', 'p', [13, 8, 0], 5, 1.5, { sq: .3 }]], ['mirror', 'x', ['box', 'w', [14, 0, 19], [1.5, 1.5, 16]]], ['box', 'c', [0, 0, 35], [34, 18, 2]], ['cyl', 'p', [6, 0, 19], 5, 6]] };
E.SHAPES.shipWheel = { about: "ship's wheel on a post", tags: 'ship', mats: { w: 'walnut' }, parts: [['box', 'w', [0, 0, 0], [4, 4, 18]], ['cyl', 'w', [0, -3, 24], 8, 1.2, { seg: 8, rot: [90, 0, 0] }], ['cyl', 'w', [0, -3, 24], 2, 2, { rot: [90, 0, 0] }]] };
const KANJI = { // calligraphy strokes for 空 手 道 麺 (12x12 grid)
  '空': [[6, 0, 6, 2], [1, 3, 11, 3], [1, 3, 1, 5], [11, 3, 11, 5], [4, 5, 2, 7], [8, 5, 10, 7], [2, 8, 10, 8], [6, 8, 6, 11], [1, 11, 11, 11]],
  '手': [[9, 0, 3, 2], [2, 4, 10, 4], [1, 7, 11, 7], [6, 1, 6, 11], [6, 11, 4, 10]],
  '道': [[3, 0, 4, 2], [8, 0, 7, 2], [5, 2, 11, 2], [6, 3, 6, 4], [5, 4, 10, 4], [5, 4, 5, 9], [10, 4, 10, 9], [5, 6, 10, 6], [5, 9, 10, 9], [0, 4, 2, 5], [1, 7, 2, 10], [2, 10, 11, 11]],
  '麺': [[0, 2, 5, 2], [2, 0, 2, 11], [0, 6, 5, 4], [3, 7, 5, 11], [6, 1, 11, 1], [8, 1, 8, 3], [6, 3, 11, 3], [6, 3, 6, 11], [11, 3, 11, 11], [6, 11, 11, 11], [8, 5, 8, 9], [10, 5, 10, 9]]
};
KC.kanji = (g, ch, x, y, s, c) => { for (const [a, b, cc, d] of KANJI[ch] || []) px.line(g, Math.round(x + a * s), Math.round(y + b * s), Math.round(x + cc * s), Math.round(y + d * s), c, Math.max(1, Math.round(s))); };

const BG = {
  dojo: new E.Backdrop({ sky: ['#1a1018', '#2a1a20'], layers: [] }),
  harbor: new E.Backdrop({ sky: ['#2a3a6a', '#d87a6a', '#ffc890'], sun: { x: .7, y: .62, r: 16, color: '#fff0c0' }, layers: [{ kind: 'hills', color: '#5a4a6a', y: .6, height: .12, parallax: .08 }, { kind: 'sea', color: '#3a5a8a', y: .66, height: .34, parallax: .15 }] }),
  bamboo: new E.Backdrop({ sky: ['#3a6a4a', '#8ab870', '#d0e8a0'], layers: [{ kind: 'forest', color: '#2a4a2a', y: .52, height: .3, parallax: .1 }, { kind: 'fog', color: '#d8f0c0', y: .55, height: .1, parallax: .2 }] }),
  log: new E.Backdrop({ sky: ['#4a6a9a', '#a8c0d8', '#e8e0c8'], layers: [{ kind: 'mountains', color: '#6a6a7a', y: .45, height: .3, parallax: .05 }, { kind: 'mountains', color: '#4a4a52', y: .55, height: .3, parallax: .12, seed: 3 }, { kind: 'forest', color: '#2a3a2a', y: .64, height: .12, parallax: .2 }, { kind: 'fog', color: '#e8f0f8', y: .7, height: .2, parallax: .3 }] }),
  ship: new E.Backdrop({ sky: ['#2a1a4a', '#c84a3a', '#ffa850'], sun: { x: .3, y: .6, r: 22, color: '#ffd080' }, layers: [{ kind: 'hills', color: '#3a2a4a', y: .58, height: .08, parallax: .05 }, { kind: 'sea', color: '#6a3a5a', y: .62, height: .4, parallax: .1 }] }),
  market: new E.Backdrop('city-night'),
  fuji: new E.Backdrop({ sky: ['#2a2050', '#a85a8a', '#f8b8a0'], stars: true, starsY: .3, layers: [{ kind: 'hills', color: '#4a3a5a', y: .64, height: .1, parallax: .12 }] }),
  stadium: new E.Backdrop({ sky: ['#06060e', '#141428'], layers: [] }),
  courtyard: new E.Backdrop({ sky: ['#6aa0e0', '#b8d8f0', '#f0f0e0'], layers: [{ kind: 'mountains', color: '#8aa0b8', y: .5, height: .2, parallax: .05 }, { kind: 'forest', color: '#3a5a3a', y: .6, height: .14, parallax: .15 }] }),
  fishmarket: new E.Backdrop({ sky: ['#7ab0e0', '#c8e0f0', '#f8f0e0'], layers: [{ kind: 'sea', color: '#4a7aa8', y: .55, height: .3, parallax: .06 }, { kind: 'city', color: '#6a6a7a', y: .6, height: .14, parallax: .15 }] }),
  pasture: new E.Backdrop({ sky: ['#5a9ae0', '#a8d0f0', '#e8f4f8'], layers: [{ kind: 'clouds', color: '#ffffff', y: .2, height: .1, parallax: .03 }, { kind: 'hills', color: '#6a9a5a', y: .6, height: .14, parallax: .12 }] })
};
// a crowd of silhouettes in parallax rows, plus front-row rigs (and Mei)
const CROWD_PAL = ['#5a3a6a', '#3a4a7a', '#7a3a3a', '#4a6a4a', '#7a5a3a', '#3a3a4a', '#6a5a4a'];
const CROWD = Array.from({ length: 90 }, (_, i) => ({ x: -160 + i * 8 + E.hash2(i, 3) * 6, row: i % 3, h: 16 + E.hash2(i, 5) * 8, c: CROWD_PAL[Math.floor(E.hash2(i, 7) * CROWD_PAL.length)], ph: E.hash2(i, 9) * 6 }));
const FRONT = Array.from({ length: 8 }, (_, i) => new E.Humanoid({ style: 'classic', size: 1.1, weapon: null, colors: { cloth: CROWD_PAL[i % 7], pants: '#2a2a3a', skin: ['#f0c8a0', '#d8a078', '#f4d8b8'][i % 3], hair: ['#1a1418', '#4a2a18', '#2a2020'][i % 3] } }));
const SEIZA = Array.from({ length: 6 }, (_, i) => new E.Humanoid({ size: 1.5, weapon: null, hair: ['short', 'spiky', 'ponytail'][i % 3], colors: { cloth: '#f2eee4', pants: '#f2eee4', belt: [BELT.white, BELT.yellow, BELT.green][i % 3], skin: '#f0c8a0', boot: '#f0c8a0', glove: '#f0c8a0', hair: '#1a1418' } }));
const MEI_FAN = new E.Humanoid({ size: 1.7, build: 'heroic', weapon: null, hair: 'ponytail', outfit: 'robe', colors: { skin: '#f4d0b0', hair: '#141018', cloth: '#f4ecd8', coat: '#e8e0d0', pants: '#3a2a4a', trim: '#c8302a', belt: '#c8302a', boot: '#3a2a2a' } });
KC.MEI_FAN = MEI_FAN;

class Stage {
  constructor(id, o = {}) { this.id = id; this.S = KC.STAGE[id]; this.bg = BG[id]; this.t = 0; this.cheer = 0; this.meiCheer = 0; this.mei = o.mei !== undefined ? o.mei : false; this.flashes = []; this.sway = 0; }
  enter() {
    const L = game.lights; L.enabled = true; L.ambient = this.S.ambient;
    game.weather = this.S.weather === 'leaves' ? { kind: 'leaves', amount: .4, wind: .2 } : this.id === 'fuji' ? { kind: 'leaves', amount: .35, wind: .3 } : this.id === 'log' ? null : null;
    game.particles.ground = () => 0;
  }
  react(kind) { if (kind === 'point') { this.cheer = 1; this.meiCheer = 1.5; } else if (kind === 'full') { this.cheer = 1.4; this.meiCheer = 2; } else if (kind === 'block') this.cheer = Math.max(this.cheer, .4); }
  update(dt) {
    this.t += dt; this.cheer = Math.max(0, this.cheer - dt * .7); this.meiCheer = Math.max(0, this.meiCheer - dt);
    if (this.id === 'stadium' && E.hash2(Math.floor(this.t * 9), 2) > .93) this.flashes.push({ x: -100 + E.hash2(Math.floor(this.t * 9), 4) * 600, t: 0 });
    this.flashes.forEach(f => f.t += dt); this.flashes = this.flashes.filter(f => f.t < .12);
    this.sway = this.id === 'ship' && !game.reduceMotion ? Math.sin(this.t * .9) * .5 : 0;
    if (this.mei) MEI_FAN.update(dt, { x: 330, y: 70, z: 0, facing: Math.PI / 2 + .3, pose: this.meiCheer > 0 ? 'cheer' : 'wave', expr: this.meiCheer > 0 ? 'shout' : 'smile' });
    FRONT.forEach((h, i) => h.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: this.cheer > .3 && i % 2 ? 'cheer' : i % 3 === 0 ? 'wave' : null }));
    SEIZA.forEach(h => h.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: 'kneel' }));
    if (this.id === 'market' || this.id === 'harbor') if (E.hash2(Math.floor(this.t * 4), 7) > .85) game.particles.smoke(this.id === 'harbor' ? -40 : 470, 60, 40, 1, { size: .6, color: '#e8e8e8' });
    if (this.id === 'log' && E.hash2(Math.floor(this.t * 6), 1) > .7) game.particles.smoke(-60 + E.hash2(Math.floor(this.t * 6), 3) * 520, -10, -10, 1, { size: 1.2, color: '#e8f0f8' });
  }
  draw(r) {
    const g = r.ctx, W = r.bw || r.W, H = r.bh || r.H, s = this.S, t = this.t, sx = x => r.w(x, 0, 0)[0], fy = Math.round(r.w(0, 0, 0)[1]) + Math.round(this.sway);
    const par = (x, k) => Math.round((sx(x) - W / 2) * k + W / 2);
    this.bg.draw(r);
    const L = game.lights, light = (x, y, z, rad, k, c) => L.add(x, y, z, rad, k, { color: c });
    switch (this.id) {
      case 'dojo': {
        px.rect(g, 0, 0, W, fy, '#3a2418');
        for (let k = -6; k < 14; k++) { const x = par(k * 60, .85); px.rect(g, x, fy - 120, 56, 92, '#e8d8b0'); for (let gx = 0; gx < 4; gx++) px.rect(g, x + gx * 14, fy - 120, 1, 92, '#8a6a48'); for (let gy = 0; gy < 6; gy++) px.rect(g, x, fy - 120 + gy * 16, 56, 1, '#8a6a48'); px.blend(g, .25 + .1 * Math.sin(t + k), 'add', () => px.rect(g, x + 2, fy - 118, 52, 88, '#ffb860')); px.rect(g, x + 56, fy - 124, 4, 124, '#5a3a24'); }
        px.rect(g, 0, fy - 128, W, 8, '#4a2e1c'); px.rect(g, 0, fy - 30, W, 30, '#5a3a24'); px.rect(g, 0, fy - 30, W, 2, '#7a5234');
        // the kamidana shelf and scrolls with kanji
        const kx = par(200, .9); px.rect(g, kx - 30, fy - 150, 60, 6, '#6a4228'); px.rect(g, kx - 20, fy - 162, 40, 12, '#8a5a30'); px.rect(g, kx - 4, fy - 170, 8, 8, '#e8e0c8');
        ['空', '手', '道'].forEach((ch, i) => { const x = par(80 + i * 120, .9); px.rect(g, x - 9, fy - 116, 18, 52, '#f4ecd8'); px.rect(g, x - 10, fy - 118, 20, 3, '#4a2a18'); px.rect(g, x - 10, fy - 64, 20, 3, '#4a2a18'); KC.kanji(g, ch, x - 7, fy - 104, 1.2, '#1a1418'); });
        r.prop('lantern', -60, 50, 64, { anchor: 'top', light: true, size: 1.4 }); r.prop('lantern', 200, 50, 70, { anchor: 'top', light: true, size: 1.4 }); r.prop('lantern', 460, 50, 64, { anchor: 'top', light: true, size: 1.4 });
        r.shape('taiko', -90, 40, 0); r.prop('banner', 520, 60, 0, { size: 1.4, color: '#c8302a' });
        light(-60, 40, 60, 90, .8, '#ffb060'); light(200, 40, 66, 110, .8, '#ffc070'); light(460, 40, 60, 90, .8, '#ffb060');
        break; }
      case 'harbor': {
        const lx = par(500, .25); px.rect(g, lx - 5, fy - 92, 10, 60, '#e8e4dc'); px.rect(g, lx - 5, fy - 80, 10, 6, '#c8302a'); px.rect(g, lx - 7, fy - 98, 14, 7, '#3a3a4a'); px.blend(g, .4 + .3 * Math.sin(t * 2), 'add', () => px.disc(g, lx, fy - 95, 8, '#ffe8a0'));
        for (let k = 0; k < 3; k++) { const bx = par(-60 + k * 220, .3), by = fy - 36; px.poly(g, [[bx - 22, by], [bx + 22, by], [bx + 16, by + 6], [bx - 16, by + 6]], '#2a2a3a'); px.rect(g, bx - 1, by - 26, 2, 26, '#2a2a3a'); px.poly(g, [[bx + 1, by - 24], [bx + 14, by - 4], [bx + 1, by - 4]], '#d8d0c0'); }
        px.rect(g, 0, fy - 8, W, 8, '#5a4030'); for (let k = -10; k < 30; k++) px.rect(g, sx(k * 24), fy - 14, 4, 14, '#4a3020');
        r.shape('crate', -110, 50, 0); r.shape('crate', -96, 52, 14); r.shape('barrel', 480, 46, 0); r.shape('barrel', 500, 54, 0); r.shape('noodleCart', -40, 60, 0);
        for (let k = 0; k < 3; k++) { const gx = par(((t * 20 + k * 150) % 700) - 150, .5), gy = 40 + k * 14 + Math.sin(t * 2 + k) * 4, w = Math.sin(t * 8 + k) > 0 ? 3 : 1; px.line(g, gx - 5, gy - w, gx, gy, '#f8f8f8'); px.line(g, gx, gy, gx + 5, gy - w, '#f8f8f8'); }
        light(-40, 60, 30, 80, .6, '#ffb060');
        break; }
      case 'bamboo': {
        for (const [k, par0, c, n] of [[0, .4, '#3a6a3a', 30], [1, .65, '#4a8a3a', 22], [2, .9, '#5aa048', 14]]) for (let i = 0; i < n; i++) { const x = par(-200 + i * (800 / n) + E.hash2(i, k) * 20, par0), w = 3 + k * 2; px.rect(g, x, 0, w, fy, c); px.rect(g, x + w - 1, 0, 1, fy, E.shade(c, -.2)); for (let j = 0; j < 6; j++) px.rect(g, x - 1, (j * 40 + i * 13) % fy, w + 2, 2, E.shade(c, .15)); if (k === 2 && i % 2) px.poly(g, [[x + w, 30 + i * 7], [x + w + 12, 26 + i * 7], [x + w + 4, 33 + i * 7]], '#6ab858'); }
        px.blend(g, .15, 'add', () => { for (let k = 0; k < 4; k++) { const x = par(k * 140, .7); px.poly(g, [[x, 0], [x + 30, 0], [x + 70, fy], [x + 40, fy]], '#fff8c0'); } });
        r.shape('toro', -80, 40, 0); r.shape('toro', 480, 40, 0); r.prop('rock', 520, 30, 0, { size: 1.4 }); r.prop('bush', -120, 30, 0, { size: 1.4 });
        light(-80, 40, 22, 60, .5, '#ffc070'); light(480, 40, 22, 60, .5, '#ffc070');
        break; }
      case 'log': {
        const wx = par(470, .35); for (let y = 30; y < fy + 60; y += 2) { const sh = (y + Math.floor(t * 60)) % 8 < 4; px.rect(g, wx - 10, y, 20, 2, sh ? '#c8e0f0' : '#e8f4ff'); } px.blend(g, .4, 'add', () => px.ell(g, wx, fy + 30, 26, 8, '#ffffff'));
        // the gorge below and the log itself (bark), ropes along it
        px.rect(g, 0, fy + 4, W, H - fy, '#1a1a24'); px.blend(g, .5, 'normal', () => { for (let y = fy + 10; y < H; y += 6) px.rect(g, 0, y, W, 3, '#2a3040'); });
        px.rect(g, sx(-140), fy - 4, sx(540) - sx(-140), 14, '#6a4a30'); for (let k = -140; k < 540; k += 12) px.rect(g, sx(k), fy + (k % 24 === 0 ? -2 : 2), 7, 2, '#4a301c'); px.rect(g, sx(-140), fy - 5, sx(540) - sx(-140), 2, '#8a6a48');
        px.line(g, sx(-140), fy - 32, sx(540), fy - 30, '#c8b080'); for (let k = -140; k < 560; k += 70) px.rect(g, sx(k), fy - 34, 2, 30, '#5a4028');
        r.prop('pine', -120, 50, 0, { size: 1.6 }); r.prop('pine', 540, 50, 0, { size: 1.6 }); r.prop('vines', -40, 60, 120, { anchor: 'top', size: 1.4 });
        break; }
      case 'ship': {
        px.rect(g, 0, fy - 12, W, 12, '#5a3420'); px.rect(g, 0, fy - 14, W, 2, '#8a5a34'); for (let k = -10; k < 30; k++) px.rect(g, sx(k * 30), fy - 26, 3, 14, '#4a2a18'); px.rect(g, 0, fy - 27, W, 2, '#8a5a34');
        const mx = sx(330); px.rect(g, mx - 3, 0, 6, fy - 12, '#4a2a18'); px.rect(g, mx - 40, 30, 80, 3, '#4a2a18'); px.line(g, mx, 10, sx(100), fy - 26, '#2a1a10'); px.line(g, mx, 10, sx(520), fy - 26, '#2a1a10');
        px.poly(g, [[mx - 36, 34], [mx + 36, 34], [mx + 30, 90], [mx - 30, 90]], '#e8dcc8'); px.poly(g, [[mx - 30, 90], [mx + 30, 90], [mx + 30, 92], [mx - 30, 92]], '#b8a888');
        r.shape('shipWheel', 480, 30, 0); r.shape('barrel', -90, 40, 0); r.shape('barrel', -110, 50, 0); r.prop('lantern', 130, 40, 60, { anchor: 'top', light: true, size: 1.3 }); r.prop('lantern', 300, 40, 60, { anchor: 'top', light: true, size: 1.3 });
        light(130, 40, 56, 80, .7, '#ffa040'); light(300, 40, 56, 80, .7, '#ffa040');
        break; }
      case 'market': {
        for (let k = -3; k < 10; k++) { const x = sx(k * 70), y = 26 + (k % 2) * 4; px.line(g, x, y, x + 70, y + 4, '#2a1a1a'); for (let j = 0; j < 3; j++) { const lx = x + 12 + j * 22, ly = y + 6 + j; px.blend(g, .35, 'add', () => px.disc(g, lx, ly + 4, 9, '#ff6a3a')); px.ell(g, lx, ly + 4, 4, 5, '#e83a2a'); px.rect(g, lx - 3, ly + 1, 6, 1, '#ffd060'); } }
        const shx = sx(470); px.rect(g, shx - 50, fy - 110, 100, 110, '#3a2a24'); px.rect(g, shx - 54, fy - 116, 108, 8, '#1a1416'); px.rect(g, shx - 40, fy - 96, 80, 40, '#ffcf80'); for (let k = 0; k < 4; k++) { px.rect(g, shx - 40 + k * 20, fy - 104, 18, 30, '#1e2a52'); } KC.kanji(g, '麺', shx - 8, fy - 100, 1.3, '#f4ecd8'); T(g, 'CHAMPON-TEI', shx - 32, fy - 66, '#3a1a10', { shadow: null });
        r.prop('awning', -90, 50, 0, { size: 1.4, color: '#c8302a' }); r.prop('streetlamp', 140, 60, 0, { light: true, size: 1.3 }); r.prop('crate', -120, 40, 0, { size: 1.3 });
        light(470, 50, 40, 100, .9, '#ffc080'); light(140, 60, 50, 90, .7, '#ffd090'); for (let k = 0; k < 5; k++) light(-60 + k * 130, 40, 70, 60, .5, '#ff7040');
        break; }
      case 'fuji': {
        const fx = par(300, .12), fyy = Math.round(H * .64); px.poly(g, [[fx - 140, fyy], [fx - 22, fyy - 96], [fx + 22, fyy - 96], [fx + 140, fyy]], '#6a5a8a'); px.poly(g, [[fx - 140, fyy], [fx, fyy - 96], [fx, fyy]], '#5a4a7a');
        px.poly(g, [[fx - 40, fyy - 64], [fx - 22, fyy - 96], [fx + 22, fyy - 96], [fx + 40, fyy - 64], [fx + 26, fyy - 70], [fx + 12, fyy - 62], [fx - 4, fyy - 72], [fx - 20, fyy - 64]], '#f4f0f8');
        const pg = par(-60, .3); for (let k = 0; k < 4; k++) { px.rect(g, pg - 14 + k * 2, fyy - 30 - k * 14, 28 - k * 4, 3, '#2a1a2a'); px.rect(g, pg - 9 + k * 2, fyy - 27 - k * 14, 18 - k * 4, 11, '#3a2a3a'); }
        for (let k = 0; k < 5; k++) { const cx = par(-120 + k * 170, .6), cy = fy - 70; px.rect(g, cx - 2, cy + 10, 4, 60, '#4a2a2a'); for (let j = 0; j < 7; j++) px.disc(g, cx + Math.cos(j) * 16, cy + Math.sin(j * 2) * 8, 11, j % 2 ? '#f8b8c8' : '#f0a0b8'); }
        r.shape('torii', 470, 60, 0, { scale: 1.6 }); r.shape('toro', -60, 40, 0); r.shape('toro', 420, 30, 0); r.prop('flowers', 520, 20, 0, { size: 1.3 });
        light(-60, 40, 22, 60, .5, '#ffc070'); light(420, 30, 22, 60, .5, '#ffc070');
        break; }
      case 'stadium': {
        for (let row = 0; row < 7; row++) { const y = fy - 150 + row * 18, k = .6 + row * .05; px.rect(g, 0, y, W, 18, row % 2 ? '#1a1830' : '#201c38'); for (let i = 0; i < 70; i++) { const x = Math.round((((i * 13 + row * 7) % 70) * 10 - 100 - (sx(200) - W / 2) * k * .3 + W / 2 - 300)), bob = Math.abs(Math.sin(t * (3 + this.cheer * 6) + i + row)) * (1 + this.cheer * 3); px.rect(g, x, y + 6 - bob, 6, 10, CROWD_PAL[(i + row) % 7]); px.disc(g, x + 3, y + 4 - bob, 3, '#d8b090'); } }
        for (const f of this.flashes) px.blend(g, .8, 'add', () => px.disc(g, par(f.x, .6), fy - 120 + (f.x % 90), 4, '#ffffff'));
        const sbx = par(200, .7), sby = Math.max(30, fy - 196); box(g, sbx - 60, sby, 120, 40, { bg: ['#101018', '#000008'], border: '#5a5a7a' }); T(g, "CHAMPON CUP '84", sbx - 42, sby + 6, '#ffd060', { shadow: null }); T(g, 'WHITE      RED', sbx - 40, sby + 20, '#ff8a6a', { shadow: null });
        for (const bx of [-100, 500]) { const x = par(bx, .8); px.rect(g, x - 20, fy - 150, 40, 60, '#c8302a'); T(g, 'CHAMPON', x - 18, fy - 130, '#ffe8a0', { shadow: null }); }
        px.rect(g, 0, fy - 20, W, 20, '#2a2a40');
        r.shape('goldenBowl', 470, 40, 0, { scale: 1.2 }); r.shape('chair', -70, 40, 0); r.shape('chair', 520, 40, 0);
        px.blend(g, .12, 'add', () => { for (const cx of [130, 270]) { const a = sx(cx); px.poly(g, [[a - 6, 0], [a + 6, 0], [a + 50, fy + 10], [a - 50, fy + 10]], '#e8f0ff'); } });
        light(130, 0, 60, 120, .9, '#e8f0ff'); light(270, 0, 60, 120, .9, '#e8f0ff'); light(470, 40, 30, 50, .6, '#ffd060');
        break; }
      case 'courtyard': { px.rect(g, 0, fy - 70, W, 70, '#c8b898'); for (let k = -6; k < 16; k++) px.rect(g, sx(k * 40), fy - 70, 2, 70, '#a89878'); px.rect(g, 0, fy - 76, W, 6, '#5a4a40'); r.prop('pine', -80, 40, 0, { size: 1.6 }); r.prop('pine', 500, 40, 0, { size: 1.6 }); r.shape('barrel', 420, 40, 0); break; }
      case 'fishmarket': { for (let k = -4; k < 12; k++) { const x = sx(k * 70); px.poly(g, [[x, fy - 90], [x + 70, fy - 90], [x + 60, fy - 76], [x + 10, fy - 76]], k % 2 ? '#5a6a8a' : '#6a5a5a'); px.rect(g, x + 10, fy - 76, 50, 76, '#4a4038'); } r.shape('crate', -90, 40, 0); r.shape('crate', 480, 40, 0); r.prop('sign', 520, 50, 0, { size: 1.3 }); break; }
      case 'pasture': { const fx = par(300, .1), fyy = Math.round(H * .62); px.poly(g, [[fx - 120, fyy], [fx - 18, fyy - 80], [fx + 18, fyy - 80], [fx + 120, fyy]], '#7a8ab0'); px.poly(g, [[fx - 34, fyy - 54], [fx - 18, fyy - 80], [fx + 18, fyy - 80], [fx + 34, fyy - 54], [fx, fyy - 60]], '#f4f4f8'); for (let k = -10; k < 40; k++) { const x = sx(k * 16); px.rect(g, x, fy - 22, 3, 22, '#8a6a40'); px.rect(g, x + 1, fy - 22, 1, 22, '#a88a5a'); } px.rect(g, 0, fy - 18, W, 2, '#9a7a4a'); px.rect(g, 0, fy - 10, W, 2, '#8a6a40'); r.prop('rock', 520, 40, 0, { size: 1.3 }); r.prop('tree', -100, 50, 0, { size: 1.5 }); break; }
    }
    // crowd silhouettes and the front row
    const cw = s.crowd;
    if (cw && cw !== 'stadium' && cw !== 'seiza') {
      for (const p of CROWD) { if (cw === 'garden' && p.row > 0) continue; const k = [.7, .82, .94][p.row], x = Math.round((sx(p.x) - W / 2) * k + W / 2), bob = Math.abs(Math.sin(t * (3 + this.cheer * 6) + p.ph)) * (1 + this.cheer * 4), y = fy - 32 - p.row * 8 - p.h + 18 - bob; const c = E.shade(p.c, -.1 * (2 - p.row)); px.rect(g, x - 5, y + 6, 10, p.h, c); px.disc(g, x, y + 3, 4, E.shade(c, .15)); if (this.cheer > .3 && E.hash2(Math.floor(p.ph * 10), 1) > .5) { px.rect(g, x - 7, y - 4 - bob, 2, 8, c); px.rect(g, x + 5, y - 4 - bob, 2, 8, c); } }
      FRONT.forEach((h, i) => { const x = -120 + i * 40 + (i > 3 ? 360 : 0) - (i > 3 ? 160 : 0); r.actor(x, 64, 0, (g2, ox, oy) => h.draw(g2, ox, oy, r.view), { every: 2, key: h }); });
    }
    if (cw === 'seiza') SEIZA.forEach((h, i) => { const x = i < 3 ? -110 + i * 24 : 450 + (i - 3) * 24; r.actor(x, 56, 0, (g2, ox, oy) => h.draw(g2, ox, oy, r.view), { every: 2, key: h }); });
    if (this.mei) r.actor(330, 70, 0, (g2, ox, oy) => { MEI_FAN.draw(g2, ox, oy, r.view); if (this.meiCheer > 0) { const hy = oy - 70; px.disc(g2, ox - 2, hy - 4, 2, '#ff5a8a'); px.disc(g2, ox + 2, hy - 4, 2, '#ff5a8a'); px.poly(g2, [[ox - 4, hy - 3], [ox + 4, hy - 3], [ox, hy + 2]], '#ff5a8a'); } }, { key: MEI_FAN });
    this.floor(r, fy);
  }
  floor(r, fy) {
    const g = r.ctx, W = r.bw || r.W, H = r.bh || r.H, f = this.S.floor, sx = x => r.w(x, 0, 0)[0], top = Math.round(Math.min(fy, r.w(0, 90, 0)[1]));
    if (f === 'log') return;
    const C = { planks: ['#a8784a', '#6a4428'], deck: ['#8a6440', '#4a3020'], dirt: ['#7a6040', '#4a3a24'], stone: ['#5a5460', '#2a2830'], gravel: ['#c8c0b0', '#8a8478'], mat: ['#2a4aa8', '#16264a'], earth: ['#a88a60', '#6a5438'], wet: ['#6a7480', '#3a4048'], grass: ['#6aa84a', '#3a6a2a'] }[f] || ['#7a6a5a', '#3a3028'];
    for (let y = top; y < H; y++) { const k = (y - top) / Math.max(1, H - top); px.rect(g, 0, y, W, 1, E.mix(C[0], C[1], k)); }
    if (f === 'planks' || f === 'deck') for (let k = -14; k <= 22; k++) { const x0 = sx(k * 30); px.line(g, Math.round(x0), top, Math.round(W / 2 + (x0 - W / 2) * 1.8), H, E.shade(C[1], -.1)); }
    if (f === 'planks') { px.rect(g, 0, top, W, 2, '#c89868'); }
    if (f === 'gravel') for (let y = top + 4; y < H; y += 5) for (let x = (y % 10); x < W; x += 10) px.rect(g, x, y, 4, 1, '#a8a090');
    if (f === 'stone') for (let y = top; y < H; y += 8) { px.rect(g, 0, y, W, 1, '#3a3640'); for (let x = (y % 16) * 2; x < W; x += 32) px.rect(g, x, y, 1, 8, '#3a3640'); }
    if (f === 'mat') { px.rect(g, sx(150) - 1, top, 3, H - top, '#f4f4f4'); px.rect(g, sx(250) - 1, top, 3, H - top, '#e8302a'); px.rect(g, sx(0), top, 2, H - top, '#e8c040'); px.rect(g, sx(400), top, 2, H - top, '#e8c040'); }
    if (f === 'wet') px.blend(g, .2, 'add', () => { for (let k = 0; k < 8; k++) px.ell(g, sx(k * 60 - 40), top + 10 + k % 3 * 6, 14, 2, '#c8e0ff'); });
    if (f === 'grass') for (let x = 0; x < W; x += 3) px.rect(g, x, top - (x * 7 % 3), 1, 3, '#4a8a3a');
    // start marks (Karate Champ's two spots)
    if (!this.S.bonus && f !== 'mat') { px.rect(g, sx(150) - 6, top + 3, 12, 2, '#f4f0e8'); px.rect(g, sx(250) - 6, top + 3, 12, 2, '#e8402a'); }
  }
}
KC.Stage = Stage;
KC.stageCam = (fighters, view) => {
  // the camera frames both fighters, clamped so the arena edges stay on screen
  const mid = fighters.length ? fighters.reduce((a, f) => a + f.x, 0) / fighters.length : 200, sc = 1.5, half = game.W / sc / 2;
  const cx = half * 2 >= 520 ? 200 : clamp(mid, -40 + half, 440 - half);
  game.focus(cx, view === 'brawler' ? 20 : 0, 62 + Math.max(0, (game.H - 240) / 4));
};
