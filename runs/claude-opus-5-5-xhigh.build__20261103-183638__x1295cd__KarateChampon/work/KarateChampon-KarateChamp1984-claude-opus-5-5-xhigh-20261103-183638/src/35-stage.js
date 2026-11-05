/* =====================================================================================================================
 * STAGES: the painters. Each stage is a sky (E.Backdrop), custom scenery layers drawn in screen pixels with parallax, a
 * floor painted from the fight line down (side view) or over the floor plane (2.5D), props depth-sorted with the fighters
 * (r.prop, r.shape and our own drawings through r.queue), lights, a crowd and ambient life. The world is painted from
 * x -140 to 540 so a wide screen never shows emptiness. KC.Stage.draw(r, id, t) draws one; KC.Stage.enter(id) lights it.
 * ===================================================================================================================== */
const SPR = (rows, pal, s = 1) => E.sprite(rows, pal, s);
KC.SPRITES = {
  ku: SPR(['.....#......', '.##########.', '.#........#.', '.#..#..#..#.', '...#....#...', '..#......#..', '............', '..########..', '......#.....', '......#.....', '.##########.', '............'], { '#': '#1a1418' }),
  te: SPR(['.......##...', '..######....', '......#.....', '..########..', '......#.....', '.##########.', '......#.....', '......#.....', '......#.....', '......#.....', '...#..#.....', '....###.....'], { '#': '#1a1418' }),
  do: SPR(['.#...#.#....', '..#.#####...', '......#.....', '#..######...', '.#.#....#...', '...######...', '...#....#...', '.#.######...', '.#.#....#...', '.#.######...', '#.#.........', '...########.'], { '#': '#1a1418' }),
  gull: [SPR(['#.....#', '.#...#.', '..#.#..', '...#...'], { '#': '#f4f4f0' }), SPR(['.......', '##...##', '..#.#..', '...#...'], { '#': '#f4f4f0' })],
  petal: SPR(['.p.', 'pPp', '.p.'], { p: '#ffb0c8', P: '#ffe0ea' }),
  star: SPR(['..y..', '.yYy.', 'yYYYy', '.yYy.', '..y..'], { y: '#ffd040', Y: '#fff6c0' })
};
const camX = r => { const v = r.view, o = r.w(0, 0, 0)[0]; return (r.W / 2 - o) / v.scale; };
// the line the scenery stands on: the fight line in the side view, the floor's back edge in the 2.5D view
const floorY = r => r.view.isSide ? Math.round(r.w(0, 0, 0)[1]) : Math.round(r.w(camX(r), -70, 0)[1]);
// x on screen of a world x seen at parallax par (1 = the fight plane; less = farther)
const PX = (r, x, par) => { const cx = camX(r); return Math.round(r.W / 2 + (x - cx) * r.view.scale * par); };
const hash = (i, k = 0) => E.hash2 ? E.hash2(i, k) : ((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1 + 1) % 1;
KC.Stage = {
  bg: {}, t: 0, cheer: 0, flashes: [],
  backdrop(id) {
    if (this.bg[id]) return this.bg[id];
    const B = {
      dojo: { sky: ['#1a1026', '#3a2030', '#6a3a2a'], stars: 0, layers: [] },
      harbor: { sky: ['#3a5a9a', '#e8a8a0', '#ffd8a0'], sun: { x: .72, y: .55, r: 22, color: '#fff0c0' }, layers: [{ kind: 'hills', color: '#6a6a9a', y: .58, height: .16, parallax: .08 }, { kind: 'sea', color: '#4a7ab8', y: .66, height: .34, parallax: .2 }] },
      bamboo: { sky: ['#a8d8a0', '#d8f0c0', '#f0f8d8'], layers: [{ kind: 'forest', color: '#4a7a4a', y: .6, height: .3, parallax: .1 }] },
      log: { sky: ['#5a88c8', '#a8c8e8', '#e8f0f4'], layers: [{ kind: 'mountains', color: '#6a7a8a', y: .5, height: .34, parallax: .05, snow: '#f0f4f8' }, { kind: 'forest', color: '#3a5a4a', y: .62, height: .2, parallax: .14 }] },
      ship: { sky: ['#2a1a4a', '#c8506a', '#ffa860', '#ffd890'], sun: { x: .3, y: .62, r: 26, color: '#ffe0a0' }, layers: [{ kind: 'hills', color: '#5a2a4a', y: .62, height: .08, parallax: .05 }, { kind: 'sea', color: '#7a3a5a', y: .66, height: .34, parallax: .2 }] },
      market: { sky: ['#06061a', '#141a3a', '#2a2a4a'], moon: { x: .8, y: .2, r: 12, color: '#f0e8d0' }, stars: 60, starsY: .5, layers: [{ kind: 'hills', color: '#1a1a30', y: .52, height: .2, parallax: .04 }, { kind: 'city', color: '#20203a', y: .6, height: .3, parallax: .12, windows: '#ffc870' }] },
      fuji: { sky: ['#3a3a7a', '#c87aa0', '#ffc8a8'], sun: { x: .2, y: .6, r: 16, color: '#ffe0c0' }, layers: [{ kind: 'hills', color: '#7a5a8a', y: .66, height: .14, parallax: .1 }] },
      stadium: { sky: ['#06040e', '#100a1e', '#1a1230'], layers: [] },
      courtyard: { sky: ['#68a8e8', '#b8dcf8', '#e8f4fc'], sun: { x: .8, y: .2, r: 14, color: '#fffbe0' }, layers: [{ kind: 'clouds', color: '#ffffff', y: .2, height: .1, parallax: .05 }, { kind: 'hills', color: '#7aa07a', y: .55, height: .14, parallax: .06 }] },
      fishmarket: { sky: ['#80b0e0', '#c8e0f0', '#f0f4f4'], layers: [{ kind: 'sea', color: '#5a8ab8', y: .52, height: .2, parallax: .08 }, { kind: 'city', color: '#6a5a5a', y: .6, height: .2, parallax: .14 }] },
      pasture: { sky: ['#5a98e0', '#a8d0f4', '#e0f0fc'], sun: { x: .15, y: .18, r: 13, color: '#fffbe0' }, layers: [{ kind: 'clouds', color: '#ffffff', y: .22, height: .12, parallax: .04 }, { kind: 'hills', color: '#6a9a5a', y: .62, height: .14, parallax: .1 }] }
    }[id];
    return (this.bg[id] = new E.Backdrop(B || 'day'));
  },
  /** set up the scene's light and weather for stage id */
  enter(game, id) {
    const S = KC.STAGE[id]; this.id = id; this.t = 0; this.flashes = [];
    game.lights.enabled = true; game.lights.ambient = S.ambient; game.weather = S.weather ? Object.assign({}, S.weather) : null;
  },
  update(dt) { this.t += dt; this.cheer = Math.max(0, this.cheer - dt * .7); for (const f of this.flashes) f.t -= dt; this.flashes = this.flashes.filter(f => f.t > 0); },
  /** draw the whole stage behind and around the actors */
  draw(r, id, o = {}) {
    const g = r.ctx, P = KC.PAINT[id], t = this.t;
    this.backdrop(id).draw(r);
    if (P.far) P.far(g, r, t);
    KC.Stage.floor(g, r, P.floor || 'planks', id);
    if (P.near) P.near(g, r, t);
    if (P.props) P.props(r, t, o);
    if (P.lights) P.lights(r, t);
    if (P.crowd && !o.noCrowd) KC.Crowd.draw(r, P.crowd, t, this.cheer, o);
  },
  /** the floor: the fight line and the mat in front of it (side view), or the floor plane (2.5D) */
  floor(g, r, kind, id) {
    const v = r.view, side = v.isSide, W = r.W, H = r.H, cx = camX(r), fy = Math.round(r.w(cx, 0, 0)[1]);
    const y0 = side ? fy : Math.round(r.w(cx, -70, 0)[1]), y1 = side ? H : Math.max(fy + 20, Math.round(r.w(cx, 50, 0)[1]));
    const F = KC.FLOORS[kind] || KC.FLOORS.planks, rows = Math.max(1, y1 - y0);
    for (let y = y0; y < H; y++) {
      const d = clamp((y - y0) / rows, 0, 1.4);
      px.rect(g, 0, y, W, 1, F.row(d, y, y >= y1));
    }
    // seams and texture: lines that fan out from the fight line (side) or run straight (2.5D)
    if (F.lines) {
      const sp = F.lines, vx = W / 2, x0w = Math.floor((cx - 400) / sp) * sp;
      for (let wx = x0w; wx < cx + 400; wx += sp) {
        const xa = Math.round(r.w(wx, side ? 0 : -70, 0)[0]), xb = side ? Math.round(vx + (xa - vx) * 2.2) : Math.round(r.w(wx, 50, 0)[0]);
        px.line(g, xa, y0, xb, side ? H : y1, F.lineColor, 1);
      }
    }
    if (F.cross) for (let k = 1; k < 7; k++) { const y = Math.round(y0 + rows * Math.pow(k / 7, side ? 1.7 : 1)); px.rect(g, 0, y, W, 1, F.cross); }
    if (F.speck) for (let i = 0; i < 260; i++) { const wx = cx - 260 + hash(i, 3) * 520, dd = hash(i, 7), y = Math.round(y0 + dd * (Math.min(H, y1 + 20) - y0)); const x = Math.round(W / 2 + (wx - cx) * v.scale * (side ? 1 + dd * 1.2 : 1)); px.rect(g, x, y, 1 + (dd > .6 ? 1 : 0), 1, hash(i, 9) > .5 ? F.speck[0] : F.speck[1]); }
    if (F.extra) F.extra(g, r, y0, y1, cx);
    // the lit centre of the mat, the fight line's edge
    px.blend(g, .16, 'add', () => px.ell(g, Math.round(r.w(200, 0, 0)[0]), Math.round((y0 + Math.min(H, y1)) / 2), Math.round(W * .38), Math.round(Math.max(6, rows * .35)), F.glow || '#ffd8a0'));
    px.rect(g, 0, y0, W, 1, F.edge || E.shade(F.row(0, y0), .25));
  }
};
const ramp = (a, b) => (d, y, past) => past ? E.shade(b, -.25) : E.mix(a, b, Math.min(1, d));
KC.FLOORS = {
  planks: { row: (d, y) => E.shade(E.mix('#c89058', '#7a4a2a', Math.min(1, d)), (y % 7 === 0 ? -.08 : 0)), lines: 26, lineColor: '#6a3e22', glow: '#ffc880' },
  deck: { row: (d, y) => E.shade(E.mix('#a8805a', '#5a4030', Math.min(1, d)), y % 6 === 0 ? -.12 : 0), lines: 34, lineColor: '#4a3020', cross: null, glow: '#ffd8a0' },
  dirt: { row: ramp('#8a7050', '#4a3a28'), speck: ['#c8a060', '#3a2a1a'], glow: '#e8f0a0' },
  log: { row: (d, y, past) => past ? '#1a2a2a' : E.mix('#8a5a3a', '#3a2418', Math.min(1, d)), cross: '#5a3a24', speck: ['#a87a50', '#2a1a10'], glow: '#ffe0a0',
    extra: (g, r, y0, y1) => { const H = r.H, y = Math.min(H, y0 + 26); px.rect(g, 0, y, r.W, H - y, '#2a3a3a'); for (let x = 0; x < r.W; x += 3) px.rect(g, x, y + ((x * 7) % 5), 1, H - y, '#3a4a4a'); px.blend(g, .35, 'normal', () => px.rect(g, 0, y, r.W, H - y, '#c8d8e0')); px.rect(g, 0, y - 1, r.W, 2, '#1a1008'); } },
  stone: { row: (d, y) => E.mix('#6a6a78', '#2a2a36', Math.min(1, d)), lines: 30, lineColor: '#22222c', cross: '#30303c', glow: '#ff9a5a' },
  gravel: { row: (d, y) => E.shade(E.mix('#d8d0c0', '#8a8478', Math.min(1, d)), y % 3 === 0 ? -.05 : 0), speck: ['#f4f0e8', '#7a7468'], glow: '#ffd0c0',
    extra: (g, r, y0) => { for (let k = 1; k < 6; k++) { const y = y0 + k * 4; for (let x = 0; x < r.W; x += 2) px.dot(g, x, y + Math.round(Math.sin((x + k * 9) * .15)), '#b8b0a0'); } } },
  mat: { row: (d, y, past) => past ? '#14183a' : E.mix('#3a5ad8', '#1a2a7a', Math.min(1, d)), glow: '#c8d8ff', edge: '#8aa0ff',
    extra: (g, r, y0, y1) => { const side = r.view.isSide, yb = side ? r.H : y1; for (const [wx, c] of [[150, '#f4f4f4'], [250, '#e83a2a']]) { const xa = Math.round(r.w(wx, side ? 0 : -70, 0)[0]), xb = side ? Math.round(r.W / 2 + (xa - r.W / 2) * 2.2) : Math.round(r.w(wx, 50, 0)[0]); px.line(g, xa, y0 + 1, xb, yb, c, 2); } px.rect(g, 0, y0 + 2, r.W, 1, '#f0c040'); } },
  earth: { row: ramp('#b89870', '#6a5038'), speck: ['#d8b888', '#5a4028'], glow: '#fff0c0' },
  wetstone: { row: (d, y) => E.mix('#7a8a96', '#3a4650', Math.min(1, d)), lines: 24, lineColor: '#2a343c', cross: '#34404a', glow: '#e0f0ff', speck: ['#c8e0f0', '#2a3038'] },
  grass: { row: (d, y) => E.shade(E.mix('#7ab84a', '#3a6a2a', Math.min(1, d)), y % 4 === 0 ? -.06 : 0), speck: ['#a8e070', '#2a5020'], glow: '#f8ffc0' }
};

/* ---- shared scenery pieces (screen pixels) ---- */
const lanternAt = (g, x, y, c, t, k = 0, s = 1) => {   // a paper lantern hanging from a cord
  const gl = .55 + .25 * Math.sin(t * 3 + k);
  px.rect(g, x, y - 10 * s, 1, 10 * s, '#2a1a14');
  px.blend(g, .28 * gl, 'add', () => px.disc(g, x, y + 6 * s, 13 * s, '#ff9a4a'));
  px.ell(g, x, y + 6 * s, 5 * s, 7 * s, E.shade(c, -.25)); px.ell(g, x - s, y + 5 * s, 4 * s, 6 * s, c); px.rect(g, x - 3 * s, y, 7 * s, 1, '#2a1a14'); px.rect(g, x - 3 * s, y + 12 * s, 7 * s, 1, '#2a1a14');
  px.rect(g, x - 2 * s, y + 4 * s, 4 * s, 1, E.shade(c, .3));
};
const stoneLantern = (g, x, y, s, t) => {   // a toro: base, post, firebox, roof
  const T = E.tones('#9a968a');
  px.rect(g, x - 7 * s, y - 3 * s, 14 * s, 3 * s, T.sh); px.rect(g, x - 2 * s, y - 15 * s, 4 * s, 12 * s, T.base); px.rect(g, x - 2 * s, y - 15 * s, 1, 12 * s, T.lt);
  px.rect(g, x - 6 * s, y - 18 * s, 12 * s, 3 * s, T.base); px.rect(g, x - 5 * s, y - 25 * s, 10 * s, 7 * s, T.sh);
  const gl = .7 + .3 * Math.sin(t * 7); px.rect(g, x - 2 * s, y - 24 * s, 4 * s, 4 * s, gl > .8 ? '#ffe8a0' : '#ffb850');
  px.blend(g, .25, 'add', () => px.disc(g, x, y - 22 * s, 9 * s, '#ffb860'));
  px.poly(g, [[x - 9 * s, y - 25 * s], [x, y - 31 * s], [x + 9 * s, y - 25 * s]], T.base); px.rect(g, x - 9 * s, y - 26 * s, 18 * s, 1, T.lt); px.rect(g, x - 1, y - 34 * s, 2, 3 * s, T.base);
};
const torii = (g, x, y, h, s) => {
  const C = E.tones('#d8402a'), w = 46 * s;
  for (const k of [-1, 1]) { px.rect(g, x + k * w * .36 - 2 * s, y - h, 4 * s, h, C.base); px.rect(g, x + k * w * .36 - 2 * s, y - h, 1, h, C.lt); }
  px.rect(g, x - w / 2 - 4 * s, y - h - 5 * s, w + 8 * s, 4 * s, '#1a1418'); px.rect(g, x - w / 2, y - h - 1 * s, w, 3 * s, C.base); px.rect(g, x - w / 2 + 4 * s, y - h + 9 * s, w - 8 * s, 3 * s, C.sh);
  px.rect(g, x - s, y - h + 2 * s, 2 * s, 7 * s, C.sh);
};
const pagoda = (g, x, y, s, c) => { for (let k = 0; k < 4; k++) { const w = (26 - k * 5) * s, yy = y - k * 12 * s; px.rect(g, x - w / 2 + 3 * s, yy - 9 * s, w - 6 * s, 9 * s, E.shade(c, .08)); px.poly(g, [[x - w / 2 - 3 * s, yy - 9 * s], [x, yy - 14 * s], [x + w / 2 + 3 * s, yy - 9 * s]], c); } px.rect(g, x, y - 56 * s, 1, 10 * s, c); };
const scroll = (g, x, y, spr, s = 1) => { px.rect(g, x - 1, y - 2, 16 + 2, 2, '#5a3a1a'); px.rect(g, x, y, 16, 30, '#f0e8d0'); px.rect(g, x, y, 1, 30, '#d8ccb0'); px.sprite(g, spr, x + 2, y + 9); px.rect(g, x - 1, y + 30, 18, 2, '#5a3a1a'); px.rect(g, x + 7, y - 6, 2, 4, '#2a1a10'); void s; };
const bambooStalks = (g, r, par, n, color, t, top) => {
  const T = E.tones(color), W = r.W, cx = camX(r), fy = floorY(r);
  for (let i = 0; i < n; i++) {
    const wx = -300 + i * (900 / n) + hash(i, par * 10) * 30, x = PX(r, wx, par) + Math.round(Math.sin(t * .8 + i) * 2 * par);
    if (x < -10 || x > W + 10) continue;
    const w = Math.max(2, Math.round(5 * par)), y1 = fy - Math.round(12 * (1 - par));
    px.rect(g, x, top, w, y1 - top, T.base); px.rect(g, x, top, 1, y1 - top, T.lt); px.rect(g, x + w - 1, top, 1, y1 - top, T.sh);
    for (let y = top + (i * 13) % 22; y < y1; y += 22) { px.rect(g, x - 1, y, w + 2, 1, T.deep); px.rect(g, x, y + 1, w, 1, T.hi); }
    if (par > .5) for (let k = 0; k < 3; k++) { const ly = top + 18 + k * 34 + (i * 7) % 20; px.poly(g, [[x + w, ly], [x + w + 9, ly - 2], [x + w + 3, ly + 2]], E.shade('#5aa04a', -.1 * k)); }
    void cx;
  }
};
const crate = (r, x, y, s = 1) => r.shape('crate', x, y, 0, { scale: s });
KC.PAINT = {
  /* HON-DOJO: shoji walls glowing warm, beams, a kamidana shelf, calligraphy, a weapon rack, a taiko; classmates in seiza */
  dojo: {
    floor: 'planks',
    far(g, r, t) {
      const W = r.W, fy = floorY(r), top = fy - 150;
      px.rect(g, 0, top, W, fy - top, '#5a3420');
      for (let k = -6; k < 12; k++) {   // shoji panels in a timber frame, backlit
        const x = PX(r, k * 64 - 40, .9), w = Math.round(58 * r.view.scale * .9);
        px.rect(g, x, top + 18, w, fy - top - 40, '#f0d8a0'); px.blend(g, .3, 'add', () => px.rect(g, x + 2, top + 20, w - 4, fy - top - 44, '#ffcf80'));
        for (let gx = x; gx < x + w; gx += 10) px.rect(g, gx, top + 18, 1, fy - top - 40, '#8a5a32');
        for (let gy = top + 18; gy < fy - 22; gy += 13) px.rect(g, x, gy, w, 1, '#8a5a32');
        px.rect(g, x - 3, top + 12, 3, fy - top - 10, '#3a2214');
      }
      px.rect(g, 0, top + 8, W, 6, '#3a2214'); px.rect(g, 0, top + 8, W, 1, '#6a4428'); px.rect(g, 0, fy - 22, W, 22, '#4a2c18'); px.rect(g, 0, fy - 22, W, 1, '#7a5030');
      // the kamidana shelf and three scrolls
      const kx = PX(r, 200, .9); px.rect(g, kx - 30, top + 26, 60, 4, '#3a2214'); px.rect(g, kx - 12, top + 14, 24, 12, '#c8a060'); px.poly(g, [[kx - 15, top + 14], [kx, top + 6], [kx + 15, top + 14]], '#5a3a1a');
      [KC.SPRITES.ku, KC.SPRITES.te, KC.SPRITES.do].forEach((s, i) => scroll(g, PX(r, 120 + i * 80, .9) - 8, top + 36, s));
      // the weapon rack: three bo staffs
      const rx = PX(r, -40, .9); px.rect(g, rx, fy - 70, 34, 3, '#3a2214'); px.rect(g, rx, fy - 40, 34, 3, '#3a2214'); for (let i = 0; i < 4; i++) px.rect(g, rx + 4 + i * 8, fy - 84, 2, 62, '#a87a48');
      void t;
    },
    props(r, t) {
      r.queue(372, -60, 0, g => { const p = r.w(372, -60, 0), x = Math.round(p[0]), y = Math.round(p[1]), T = E.tones('#8a3a2a'); px.rect(g, x - 14, y - 28, 28, 24, T.base); px.ell(g, x, y - 28, 14, 4, '#e8d8b8'); px.rect(g, x - 14, y - 22, 28, 1, T.lt); for (let i = 0; i < 6; i++) px.dot(g, x - 12 + i * 5, y - 25, '#d8b040'); px.rect(g, x - 10, y - 4, 3, 6, '#3a2214'); px.rect(g, x + 7, y - 4, 3, 6, '#3a2214'); });
      for (const x of [40, 110, 290, 360]) r.prop('lantern', x, -40, 110, { anchor: 'top', size: 1.3, halo: false });
    },
    lights(r) { const L = KC.game.lights; L.add(200, -40, 90, 200, .55, { color: '#ffb870' }); L.add(60, -40, 100, 90, .6, { color: '#ffa860' }); L.add(340, -40, 100, 90, .6, { color: '#ffa860' }); void r; },
    crowd: { kind: 'seiza', n: 9, palette: ['#f2eee4', '#e8e4d8', '#f4f0e6'], belts: ['#f4f4ee', '#f0c830', '#3aa050', '#f4f4ee'] }
  },
  /* NAGASAKI PIER: dawn over the sea, a lighthouse, moored boats, gulls; crates, barrels, Mei's noodle cart */
  harbor: {
    floor: 'deck',
    far(g, r, t) {
      const fy = floorY(r), lx = PX(r, 620, .25);
      px.rect(g, lx - 5, fy - 110, 10, 70, '#e8e0d8'); px.rect(g, lx - 5, fy - 90, 10, 8, '#d83a2a'); px.rect(g, lx - 5, fy - 66, 10, 8, '#d83a2a'); px.rect(g, lx - 7, fy - 118, 14, 8, '#3a3a4a');
      px.blend(g, .4 + .3 * Math.sin(t * 2), 'add', () => px.disc(g, lx, fy - 114, 10, '#fff0a0'));
      for (let i = 0; i < 4; i++) { const bx = PX(r, -200 + i * 170, .35), by = fy - 50 + (i % 2) * 4 + Math.round(Math.sin(t + i) * 1.5); px.poly(g, [[bx - 22, by], [bx + 22, by], [bx + 16, by + 7], [bx - 16, by + 7]], '#3a3a5a'); px.rect(g, bx - 1, by - 30, 2, 30, '#3a3a5a'); px.poly(g, [[bx + 1, by - 28], [bx + 16, by - 6], [bx + 1, by - 6]], '#c8c0c8'); }
      for (let i = 0; i < 5; i++) { const gx = ((t * (14 + i * 3) + i * 120) % (r.W + 60)) - 30, gy = fy - 150 + i * 14 + Math.round(Math.sin(t * 2 + i) * 4); px.sprite(g, KC.SPRITES.gull[Math.floor(t * 4 + i) % 2], Math.round(gx), gy); }
      px.rect(g, 0, fy - 14, r.W, 14, '#5a4030'); for (let x = PX(r, -200, 1) % 40; x < r.W; x += 40) px.rect(g, x, fy - 30, 4, 30, '#4a3424');
      px.rect(g, 0, fy - 28, r.W, 2, '#c8a878');
    },
    props(r, t, o) {
      r.shape('kc:barrel-small-stack', 62, -34, 0, { scale: 1.3 }); crate(r, 352, -40, 1.3); crate(r, 372, -44, 1.1); r.shape('barrel', 392, -30, 0, { scale: 1.3 });
      r.shape('kc:boat-row-large', 430, -60, 0, { scale: 1.2, facing: PI / 2 });
      KC.Props.noodleCart(r, 18, -24, t, o.meiCart);
    },
    lights(r) { KC.game.lights.add(18, -24, 50, 70, .5, { color: '#ffc070' }); void r; },
    crowd: { kind: 'dock', n: 10, palette: ['#3a5a8a', '#8a5a3a', '#5a5a5a', '#2a4a6a', '#a8784a'] }
  },
  /* BAMBOO FOREST: three depths of stalks, light shafts; a stone lantern, a small shrine; leaves fall */
  bamboo: {
    floor: 'dirt',
    far(g, r, t) {
      const fy = floorY(r);
      bambooStalks(g, r, .35, 26, '#8ab87a', t, 0); bambooStalks(g, r, .6, 20, '#6aa05a', t, 0);
      px.blend(g, .12, 'add', () => { for (let i = 0; i < 4; i++) { const x = PX(r, i * 160 - 80, .5); px.poly(g, [[x, 0], [x + 30, 0], [x + 90, fy], [x + 40, fy]], '#fffbd0'); } });
    },
    near(g, r, t) { void g; void r; void t; },
    props(r, t) {
      r.queue(36, -30, 0, g => { const p = r.w(36, -30, 0); stoneLantern(g, Math.round(p[0]), Math.round(p[1]), r.view.scale, t); });
      r.queue(372, -50, 0, g => { const p = r.w(372, -50, 0), x = Math.round(p[0]), y = Math.round(p[1]); px.rect(g, x - 16, y - 26, 32, 26, '#8a5a3a'); px.rect(g, x - 12, y - 22, 24, 18, '#3a2214'); px.poly(g, [[x - 22, y - 26], [x, y - 40], [x + 22, y - 26]], '#5a3a2a'); px.rect(g, x - 4, y - 18, 8, 8, '#f0d890'); });
      r.queue(200, -80, 0, g => bambooStalks(g, r, .85, 9, '#4a8a3a', t, 0), { bias: -50 });
      r.prop('grass', 20, 6, 0, { size: 1.3 }); r.prop('grass', 380, 6, 0, { size: 1.3 }); r.prop('rock', 398, -10, 0, { size: 1.2 });
    },
    lights(r) { KC.game.lights.add(36, -30, 30, 60, .5, { color: '#ffc870' }); void r; }
  },
  /* LOG BRIDGE: a trunk over a gorge, cliffs, a waterfall, mist, pines; rope rails */
  log: {
    floor: 'log',
    far(g, r, t) {
      const fy = floorY(r), W = r.W;
      for (const [wx, par, c] of [[-160, .4, '#5a6470'], [560, .4, '#5a6470'], [-120, .7, '#4a5260'], [520, .7, '#4a5260']]) { const x = PX(r, wx, par); px.poly(g, [[x - 70, fy + 40], [x - 50, fy - 110], [x - 10, fy - 140], [x + 30, fy - 120], [x + 70, fy + 40]], c); px.poly(g, [[x - 50, fy - 110], [x - 10, fy - 140], [x - 6, fy - 100]], E.shade(c, .12)); }
      const wx = PX(r, 260, .45); for (let y = fy - 130; y < fy + 40; y += 2) { const off = (Math.floor(y + t * 90) % 9); px.rect(g, wx - 12, y, 24, 2, off < 3 ? '#e8f4fc' : off < 6 ? '#c8e0f0' : '#a8c8e0'); }
      px.blend(g, .35, 'add', () => px.ell(g, wx, fy + 30, 30, 8, '#ffffff'));
      for (let i = 0; i < 6; i++) { const x = ((i * 90 + t * 6) % (W + 80)) - 40; px.blend(g, .14, 'normal', () => px.ell(g, Math.round(x), fy - 10 + (i % 3) * 8, 50, 8, '#e8f0f4')); }
    },
    props(r) {
      r.queue(0, -10, 30, g => { const a = r.w(-40, -10, 28), b = r.w(440, -10, 28); px.line(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), '#c8a868', 1); for (let x = -40; x <= 440; x += 40) { const p = r.w(x, -10, 0), q = r.w(x, -10, 30); px.rect(g, Math.round(p[0]), Math.round(q[1]), 2, Math.round(p[1] - q[1]), '#6a4a2a'); } }, { bias: -30 });
      r.shape('pine', -6, -40, 0, { params: { h: 60, tiers: 5 } }); r.shape('pine', 412, -40, 0, { params: { h: 70, tiers: 5 } });
      r.prop('vines', 372, -30, 120, { anchor: 'top', size: 1.4 });
    }
  },
  /* SHIP'S STERN: a sunset sea, the mast and rigging, the ship's wheel, lanterns, a cannon, barrels; a cheering crew */
  ship: {
    floor: 'deck',
    far(g, r, t) {
      const fy = floorY(r), W = r.W; for (let i = 0; i < 30; i++) { const x = Math.round(hash(i, 2) * W), y = fy - 40 + Math.round(hash(i, 5) * 30); if (Math.sin(t * 3 + i) > .6) px.rect(g, x, y, 3, 1, '#ffe8b0'); }
      const sway = KC.game && KC.game.reduceMotion ? 0 : Math.sin(t * .9) * 1.5, mx = PX(r, 200, .95);
      px.rect(g, mx - 3, 0, 6, fy, '#5a3a22'); px.rect(g, mx - 60, 30 + sway, 120, 4, '#4a3020'); px.rect(g, mx - 40, 90 + sway, 80, 3, '#4a3020');
      px.poly(g, [[mx - 56, 34 + sway], [mx + 56, 34 + sway], [mx + 46, 88 + sway], [mx - 46, 88 + sway]], '#e8dcc0'); px.poly(g, [[mx - 56, 34 + sway], [mx - 20, 34 + sway], [mx - 16, 88 + sway], [mx - 46, 88 + sway]], '#d0c4a8');
      for (const k of [-1, 1]) for (let i = 0; i < 5; i++) px.line(g, mx + k * (60 - i * 6), 32 + sway, mx + k * (150 + i * 30), fy - 20, '#3a2414', 1);
      px.rect(g, 0, fy - 30, W, 30, '#6a4a30'); px.rect(g, 0, fy - 30, W, 3, '#8a6a48'); for (let x = PX(r, -200, 1) % 24; x < W; x += 24) px.rect(g, x, fy - 27, 3, 27, '#4a3020');
    },
    props(r, t) {
      r.shape('kc:cannon', 52, -30, 0, { scale: 1.4, facing: PI / 2 }); r.shape('barrel', 352, -30, 0, { scale: 1.3 }); r.shape('kc:barrel-small-stack', 392, -40, 0, { scale: 1.3 });
      r.queue(14, -30, 0, g => KC.Props.wheel(g, r, 14, -30, t));
      for (const x of [20, 380]) r.prop('lantern', x, -35, 105, { anchor: 'top', size: 1.2, halo: false });
    },
    lights(r) { KC.game.lights.add(20, -35, 95, 80, .55, { color: '#ffb060' }); KC.game.lights.add(380, -35, 95, 80, .55, { color: '#ffb060' }); void r; },
    crowd: { kind: 'crew', n: 8, palette: ['#e8e8f0', '#2a3a6a', '#c8c8d0', '#3a4a7a'] }
  },
  /* CHAMPON STREET: the night market under rows of red lanterns, stalls, the Champon-tei shop front with its noren */
  market: {
    floor: 'stone',
    far(g, r, t) {
      const fy = floorY(r), W = r.W;
      for (let k = -4; k < 10; k++) { const x = PX(r, k * 90 - 50, .8), w = Math.round(80 * r.view.scale * .8); const c = ['#3a2a3a', '#2a2a3a', '#3a2a2a'][(k + 9) % 3]; px.rect(g, x, fy - 120, w, 100, c); px.poly(g, [[x - 6, fy - 120], [x + w / 2, fy - 136], [x + w + 6, fy - 120]], '#1a1420'); for (let wy = fy - 108; wy < fy - 40; wy += 22) for (let wx = x + 8; wx < x + w - 10; wx += 18) px.rect(g, wx, wy, 8, 10, (k + wx + wy) % 3 ? '#ffb860' : '#4a3a2a'); }
      for (let row = 0; row < 2; row++) { const y0 = 26 + row * 26; px.line(g, 0, y0, W, y0 + 6, '#1a1010', 1); for (let i = -2; i < 14; i++) lanternAt(g, PX(r, i * 46 - 60 + row * 23, .9), y0 + 6, row ? '#e8402a' : '#d8302a', t, i + row * 3); }
      // CHAMPON-TEI: a shop front, a noren curtain with a bowl, steam
      const sx = PX(r, 200, .8), w = 120; px.rect(g, sx - w / 2, fy - 110, w, 90, '#5a2a1a'); px.rect(g, sx - w / 2 - 6, fy - 118, w + 12, 10, '#2a1410');
      px.rect(g, sx - 36, fy - 128, 72, 12, '#f0e0b0'); E.font.text(g, 'CHAMPON-TEI', sx, fy - 126, '#8a1a10', { align: 'center', outline: false });
      for (let i = 0; i < 5; i++) { const nx = sx - 50 + i * 20 + Math.round(Math.sin(t * 1.5 + i) * 1); px.rect(g, nx, fy - 106, 18, 40, '#1e2a5a'); px.rect(g, nx, fy - 106, 18, 2, '#3a4a8a'); }
      px.ell(g, sx, fy - 86, 12, 6, '#f0e8d8'); px.rect(g, sx - 12, fy - 86, 24, 2, '#f0e8d8'); px.line(g, sx + 4, fy - 100, sx + 10, fy - 88, '#c8a060', 1); px.line(g, sx + 7, fy - 100, sx + 12, fy - 88, '#c8a060', 1);
      px.blend(g, .45, 'add', () => px.rect(g, sx - 40, fy - 62, 80, 40, '#ffc870'));
      for (let i = 0; i < 3; i++) { const y = fy - 120 - ((t * 20 + i * 14) % 40); px.blend(g, .2, 'normal', () => px.ell(g, sx + 30 + Math.round(Math.sin(t + i) * 4), Math.round(y), 6, 4, '#f0f0f0')); }
    },
    props(r) { r.shape('kc:stall-red', 22, -40, 0, { scale: 1.3 }); r.shape('kc:stall-red', 384, -40, 0, { scale: 1.3 }); r.shape('kc:bowl-soup', 22, -40, 22, { scale: 1.5 }); r.prop('streetlamp', 342, -20, 0, { size: 1.2, light: true }); },
    lights(r) { const L = KC.game.lights; for (let i = 0; i < 6; i++) L.add(i * 80, -40, 120, 70, .6, { color: '#ff7a4a' }); L.add(200, -60, 40, 120, .6, { color: '#ffc870' }); void r; },
    crowd: { kind: 'market', n: 12, palette: ['#5a3a6a', '#3a5a7a', '#7a3a3a', '#4a6a4a', '#7a5a3a', '#6a6a8a'] }
  },
  /* FUJI GARDEN: Mount Fuji at dusk, a pagoda, a torii, cherry trees; raked gravel, stone lanterns, a koi pond; petals */
  fuji: {
    floor: 'gravel',
    far(g, r, t) {
      const fy = floorY(r), fx = PX(r, 260, .08), top = fy - 175;
      px.poly(g, [[fx - 210, fy - 10], [fx - 34, top], [fx + 34, top], [fx + 210, fy - 10]], '#6a5a9a'); px.poly(g, [[fx - 34, top], [fx + 34, top], [fx + 70, top + 36], [fx + 40, top + 30], [fx + 18, top + 44], [fx - 6, top + 32], [fx - 30, top + 46], [fx - 70, top + 36]], '#f4f0fa');
      px.poly(g, [[fx + 34, top], [fx + 210, fy - 10], [fx + 120, fy - 10], [fx + 20, top + 40]], '#5a4a88');
      pagoda(g, PX(r, -120, .4), fy - 22, 1, '#3a2a4a');
      for (const [wx, par] of [[-60, .6], [470, .6], [150, .5]]) { const x = PX(r, wx, par); px.rect(g, x - 2, fy - 60, 4, 50, '#4a2a2a'); for (let i = 0; i < 9; i++) px.disc(g, x - 18 + hash(i, wx) * 36, fy - 66 - hash(i + 3, wx) * 26, 9, i % 2 ? '#ffb0c8' : '#f890b0'); }
      void t;
    },
    props(r, t) {
      r.queue(330, -70, 0, g => { const p = r.w(330, -70, 0); torii(g, Math.round(p[0]), Math.round(p[1]), Math.round(62 * r.view.scale), r.view.scale); });
      for (const x of [30, 372]) r.queue(x, -30, 0, g => { const p = r.w(x, -30, 0); stoneLantern(g, Math.round(p[0]), Math.round(p[1]), r.view.scale, t); });
      r.queue(40, 12, 0, g => { const p = r.w(40, 12, 0), x = Math.round(p[0]), y = Math.round(p[1]); px.ell(g, x, y + 4, 40, 7, '#2a5a7a'); px.ell(g, x, y + 3, 36, 5, '#3a7aa0'); const k = Math.round(Math.sin(t * 1.3) * 18); px.ell(g, x + k, y + 3, 4, 2, '#ff8a3a'); px.ell(g, x - k / 2, y + 4, 3, 1, '#f4f4f0'); });
    },
    lights(r) { const L = KC.game.lights; L.add(30, -30, 30, 60, .5, { color: '#ffc870' }); L.add(372, -30, 30, 60, .5, { color: '#ffc870' }); void r; },
    crowd: { kind: 'garden', n: 6, palette: ['#c86a8a', '#6a8ac8', '#e8d8c0', '#8a6aa8'] }
  },
  /* NATIONAL STADIUM: tiered crowd, banners, the scoreboard, spotlights, camera flashes, the Golden Bowl on its table */
  stadium: {
    floor: 'mat',
    far(g, r, t) {
      const fy = floorY(r), W = r.W;
      for (let row = 0; row < 7; row++) { const y = fy - 40 - row * 16, c = E.shade('#2a2040', -row * .04); px.rect(g, 0, y - 16, W, 16, c); px.rect(g, 0, y - 1, W, 1, '#3a3058'); }
      KC.Crowd.tiers(g, r, t, KC.Stage.cheer);
      const sx = PX(r, 200, .7), sy = Math.max(34, fy - 146); px.rect(g, sx - 60, sy, 120, 34, '#101018'); px.rect(g, sx - 58, sy + 2, 116, 30, '#1a1a28');
      E.font.text(g, "CHAMPON CUP '84", sx, sy + 4, '#ffd040', { align: 'center', outline: false }); const sc = KC.scene && KC.scene.bout ? KC.scene.bout.points : [0, 0];
      E.font.text(g, 'WHITE ' + sc[0] + '   RED ' + sc[1], sx, sy + 18, '#ff7a5a', { align: 'center', outline: false });
      px.blend(g, .25, 'add', () => px.rect(g, sx - 60, sy, 120, 34, '#ffb040'));
      for (const [wx, c] of [[-60, '#d83a2a'], [460, '#2a5ad8']]) { const x = PX(r, wx, .75); px.rect(g, x - 16, fy - 150, 32, 46, c); px.poly(g, [[x - 16, fy - 104], [x, fy - 96], [x + 16, fy - 104]], c); E.font.text(g, '84', x, fy - 136, '#fff6d0', { align: 'center', outline: false, scale: 2 }); }
      for (const f of KC.Stage.flashes) px.blend(g, f.t * 3, 'add', () => px.disc(g, f.x, f.y, 4, '#ffffff'));
      if (Math.floor(t * 30) % 17 === 0 && KC.Stage.flashes.length < 6) KC.Stage.flashes.push({ x: Math.round(hash(Math.floor(t * 30), 4) * W), y: fy - 50 - Math.round(hash(Math.floor(t * 30), 8) * 100), t: .25 });
    },
    near(g, r) { const fy = floorY(r); px.blend(g, .12, 'add', () => { for (const wx of [120, 280]) { const x = Math.round(r.w(wx, 0, 0)[0]); px.poly(g, [[x - 10, 0], [x + 10, 0], [x + 60, fy + 8], [x - 60, fy + 8]], '#fff4d8'); } }); },
    props(r, t) {
      r.queue(372, -46, 0, g => { const p = r.w(372, -46, 0); KC.Props.goldenBowl(g, Math.round(p[0]), Math.round(p[1]), r.view.scale, t); });
      r.shape('chair', 16, -44, 0, { scale: 1.3, facing: PI / 2 }); r.shape('chair', 384, -44, 0, { scale: 1.3, facing: PI / 2 });
    },
    lights(r) { const L = KC.game.lights; L.add(120, 0, 160, 150, .7, { color: '#fff4d8' }); L.add(280, 0, 160, 150, .7, { color: '#fff4d8' }); L.add(372, -46, 30, 60, .6, { color: '#ffd040' }); void r; },
    crowd: null
  },
  /* BONUS: the dojo courtyard, the fish-market alley, the Fuji pasture */
  courtyard: {
    floor: 'earth',
    far(g, r) { const fy = floorY(r); px.rect(g, 0, fy - 90, r.W, 90, '#e8dcc0'); px.rect(g, 0, fy - 96, r.W, 8, '#5a3a2a'); for (let x = PX(r, -200, 1) % 50; x < r.W; x += 50) px.rect(g, x, fy - 90, 3, 90, '#c8b898'); px.poly(g, [[0, fy - 96], [r.W, fy - 96], [r.W, fy - 106], [0, fy - 106]], '#3a2a2a'); },
    props(r) { r.shape('pine', 14, -40, 0, { params: { h: 64, tiers: 5 } }); r.shape('barrel', 380, -30, 0, { scale: 1.3 }); r.prop('bush', 352, -10, 0, { size: 1.3 }); r.prop('rock', 58, -10, 0, { size: 1.1 }); }
  },
  fishmarket: {
    floor: 'wetstone',
    far(g, r, t) { const fy = floorY(r); for (let k = -3; k < 8; k++) { const x = PX(r, k * 100 - 40, .8), w = 70; px.rect(g, x, fy - 80, w, 60, '#6a5a4a'); px.poly(g, [[x - 8, fy - 80], [x + w / 2, fy - 100], [x + w + 8, fy - 80]], '#3a3a4a'); px.rect(g, x + 10, fy - 60, w - 20, 22, '#2a2a30'); px.rect(g, x + 20, fy - 92, 30, 9, k % 2 ? '#d84a2a' : '#2a6ad8'); } for (let i = 0; i < 3; i++) px.sprite(g, KC.SPRITES.gull[Math.floor(t * 4 + i) % 2], Math.round((t * 20 + i * 140) % r.W), 30 + i * 18); },
    props(r) { crate(r, 20, -30, 1.3); crate(r, 46, -50, 1.2); r.shape('kc:barrel-small-stack', 378, -30, 0, { scale: 1.3 }); r.prop('sign', 352, -40, 0, { size: 1.2 }); }
  },
  pasture: {
    floor: 'grass',
    far(g, r) { const fy = floorY(r), fx = PX(r, 300, .08), top = fy - 140; px.poly(g, [[fx - 170, fy - 20], [fx - 28, top], [fx + 28, top], [fx + 170, fy - 20]], '#7a8ac0'); px.poly(g, [[fx - 28, top], [fx + 28, top], [fx + 56, top + 30], [fx + 30, top + 24], [fx, top + 36], [fx - 30, top + 26], [fx - 56, top + 30]], '#f4f8ff'); },
    props(r) { for (let x = -120; x < 540; x += 34) r.shape('fence', x, -40, 0, { params: { len: 34 } }); r.shape('kc:hay-bale-bundled', 26, -24, 0, { scale: 1.5 }); r.shape('kc:hay-bale-bundled', 384, -24, 0, { scale: 1.5 }); r.shape('tree', 404, -60, 0, { params: { h: 60, seed: 3 } }); }
  }
};

/* ---- custom props (drawn in screen pixels at their projected point) ---- */
KC.Props = {
  noodleCart(r, x, y, t, mei) {
    r.queue(x, y, 0, g => {
      const p = r.w(x, y, 0), X = Math.round(p[0]), Y = Math.round(p[1]), s = r.view.scale, W = Math.round(48 * s), T = E.tones('#8a5a3a');
      px.disc(g, X - W / 2 + 8, Y - 6, 6, '#3a2a1a'); px.disc(g, X + W / 2 - 8, Y - 6, 6, '#3a2a1a'); px.disc(g, X - W / 2 + 8, Y - 6, 3, '#8a6a4a'); px.disc(g, X + W / 2 - 8, Y - 6, 3, '#8a6a4a');
      px.rect(g, X - W / 2, Y - 30, W, 20, T.base); px.rect(g, X - W / 2, Y - 30, W, 2, T.lt); px.rect(g, X - W / 2, Y - 12, W, 2, T.sh);
      px.rect(g, X - W / 2 + 2, Y - 62, 3, 32, T.sh); px.rect(g, X + W / 2 - 5, Y - 62, 3, 32, T.sh);
      px.poly(g, [[X - W / 2 - 6, Y - 62], [X + W / 2 + 6, Y - 62], [X + W / 2, Y - 72], [X - W / 2, Y - 72]], '#c8302a'); for (let i = 0; i < 6; i++) px.rect(g, X - W / 2 - 4 + i * (W + 8) / 6, Y - 62, (W + 8) / 12, 4, '#f4ece0');
      px.rect(g, X - 10, Y - 40, 20, 10, '#5a5a62'); px.ell(g, X, Y - 40, 10, 2, '#8a8a92');
      for (let i = 0; i < 3; i++) { const yy = Y - 44 - ((t * 18 + i * 9) % 24); px.blend(g, .3, 'normal', () => px.ell(g, X + Math.round(Math.sin(t * 2 + i) * 3), Math.round(yy), 4, 3, '#ffffff')); }
      px.rect(g, X - 14, Y - 26, 28, 10, '#f0e0b0'); E.font.text(g, 'MEI', X, Y - 25, '#8a1a10', { align: 'center', outline: false }); void mei;
    });
  },
  wheel(g, r, x, y, t) {
    const p = r.w(x, y, 40), X = Math.round(p[0]), Y = Math.round(p[1]), R = Math.round(16 * r.view.scale), a0 = Math.sin(t * .6) * .3;
    for (let i = 0; i < 8; i++) { const a = a0 + i * PI / 4; px.line(g, X, Y, X + Math.round(Math.cos(a) * (R + 5)), Y + Math.round(Math.sin(a) * (R + 5)), '#6a4a2a', 2); }
    px.disc(g, X, Y, R, '#5a3a22'); px.disc(g, X, Y, R - 3, '#00000000'); px.disc(g, X, Y, 4, '#c8a060');
    const pb = r.w(x, y, 0); px.rect(g, X - 2, Y, 4, Math.round(pb[1] - Y), '#4a3020');
  },
  goldenBowl(g, x, y, s, t) {
    px.rect(g, x - 18, y - 22, 36, 22, '#3a1a2a'); px.rect(g, x - 18, y - 22, 36, 2, '#6a3a4a');
    const T = E.tones('#e8c040'); px.ell(g, x, y - 32, 13, 9, T.sh); px.ell(g, x, y - 34, 13, 8, T.base); px.ell(g, x, y - 40, 13, 3, T.lt); px.rect(g, x - 4, y - 26, 8, 4, T.sh);
    px.dot(g, x - 6, y - 36, '#ffffff'); if (Math.sin(t * 3) > .7) { px.dot(g, x + 8, y - 42, '#ffffff'); px.dot(g, x + 9, y - 43, '#fff6c0'); }
    px.blend(g, .3, 'add', () => px.disc(g, x, y - 34, 18, '#ffd040')); void s;
  },
  bonsai(g, x, y, s) { px.rect(g, x - 6 * s, y - 6 * s, 12 * s, 6 * s, '#3a5a8a'); px.rect(g, x - 7 * s, y - 7 * s, 14 * s, 2 * s, '#5a7aaa'); px.rect(g, x - 1, y - 12 * s, 2, 6 * s, '#5a3a22'); px.disc(g, x - 3 * s, y - 13 * s, 4 * s, '#3a7a3a'); px.disc(g, x + 3 * s, y - 14 * s, 4 * s, '#4a8a3a'); },
  clayPot(g, x, y, s) { const T = E.tones('#b8683a'); px.ell(g, x, y - 5 * s, 6 * s, 5 * s, T.base); px.ell(g, x - s, y - 6 * s, 4 * s, 3 * s, T.lt); px.rect(g, x - 3 * s, y - 11 * s, 6 * s, 2 * s, T.sh); },
  boulder(g, x, y, s) { const T = E.tones('#7a7468'); px.disc(g, x, y - 6 * s, 7 * s, T.sh); px.disc(g, x - s, y - 7 * s, 6 * s, T.base); px.disc(g, x - 3 * s, y - 9 * s, 2 * s, T.lt); },
  bowl(g, x, y, s) { px.ell(g, x, y - 4 * s, 7 * s, 4 * s, '#f4f0e8'); px.rect(g, x - 7 * s, y - 6 * s, 14 * s, 2 * s, '#e8a040'); px.ell(g, x, y - 6 * s, 6 * s, 1 * s, '#f0c060'); px.rect(g, x - 3 * s, y - 2 * s, 6 * s, 1, '#c8c4bc'); px.rect(g, x - 2 * s, y - 8 * s, 1, 2 * s, '#ffffff'); }
};

/* ---- crowds: silhouettes behind (parallax rows), a front row of small rigs that wave and cheer, Mei among them ---- */
KC.Crowd = {
  rigs: {},
  draw(r, spec, t, cheer, o = {}) {
    const g = r.ctx, fy = floorY(r), W = r.W;
    if (spec.kind === 'seiza') {   // the classmates kneel along the back wall
      for (let i = 0; i < spec.n; i++) {
        const key = 'seiza' + i, wx = -40 + i * 60;
        const rig = this.rigs[key] || (this.rigs[key] = KC.rigPost(new E.Humanoid({ size: 1.55, build: 'chibi', weapon: null, hair: i % 3 ? 'short' : 'spiky', colors: { skin: ['#f0c49c', '#e0b08a', '#f4d0b0'][i % 3], hair: '#1a1418', cloth: '#f2eee4', pants: '#ece6da', belt: spec.belts[i % spec.belts.length], boot: '#f0c49c', glove: '#f0c49c' } })));
        KC.poseStep(rig, 1 / 60, { seiza: cheer > .3 ? 0 : 1 }); rig.update(1 / 60, { x: wx, y: -50, z: 0, facing: wx < 200 ? .5 : PI - .5, pose: cheer > .3 ? 'cheer' : null, expr: cheer > .3 ? 'shout' : null });
        r.actor(wx, -50, 0, (gg, ox, oy) => rig.draw(gg, ox, oy, r.view), { every: 2, key: rig });
      }
      return;
    }
    // back rows: silhouettes (rectangle plus head disc), bobbing harder on a cheer
    const rows = spec.kind === 'garden' ? 1 : 2;
    for (let row = 0; row < rows; row++) for (let i = 0; i < 26; i++) {
      const par = [.82, .9][row], wx = -180 + i * 30 + hash(i, row) * 10, x = PX(r, wx, par);
      if (x < -10 || x > W + 10) continue;
      const bob = Math.abs(Math.sin(t * (3 + cheer * 7) + i * 1.7 + row)) * (1 + cheer * 4), h = 16 + hash(i, 5 + row) * 7, c = E.shade(spec.palette[(i + row) % spec.palette.length], -.25 + row * .1);
      const y = fy - 20 - (1 - row) * 9 - h + 16 - bob;
      px.rect(g, x - 5, Math.round(y + 6), 10, Math.round(h), c); px.disc(g, x, Math.round(y + 3), 4, E.shade('#e0b090', -.3 + row * .12));
      if (cheer > .35 && hash(i, 1) > .45) { px.rect(g, x - 7, Math.round(y - 3 - bob), 2, 8, c); px.rect(g, x + 5, Math.round(y - 3 - bob), 2, 8, c); }
    }
    // the front row: small rigs; Mei among them on story stages after the harbor
    const n = Math.min(6, spec.n);
    for (let i = 0; i < n; i++) {
      const key = spec.kind + i, wx = [-16, 28, 372, 416, 70, 330][i];
      const rig = this.rigs[key] || (this.rigs[key] = new E.Humanoid({ size: 1.6, style: 'hd', build: 'chibi', weapon: null, hair: ['short', 'ponytail', 'spiky', 'long'][i % 4], colors: { skin: ['#f0c49c', '#d8a07a', '#f4d0b0'][i % 3], hair: ['#2a1a10', '#4a2a1a', '#1a1418', '#6a4a2a'][i % 4], cloth: spec.palette[i % spec.palette.length], pants: '#3a3a4a', boot: '#2a2020' } }));
      const cheerP = cheer > .3 ? 'cheer' : (Math.sin(t * .7 + i * 2) > .6 ? 'wave' : null);
      rig.update(1 / 60, { x: wx, y: -46, z: 0, facing: PI / 2 + (i % 2 ? .3 : -.3), pose: cheerP, expr: cheer > .3 ? 'smile' : null });
      r.actor(wx, -46, 0, (gg, ox, oy) => rig.draw(gg, ox, oy, r.view), { every: 2, key: rig });
    }
    if (o.mei) {
      const rig = this.meiRig || (this.meiRig = KC.makeRig('mei', null, 'champ', { cloth: '#f4ece0', pants: '#3a3a52', colors: { trim: '#c8302a' } }));
      rig.update(1 / 60, { x: 48, y: -46, z: 0, facing: PI / 2 - .2, pose: cheer > .4 ? 'cheer' : 'hips', expr: cheer > .4 ? 'shout' : 'smile' });
      r.actor(48, -46, 0, (gg, ox, oy) => rig.draw(gg, ox, oy, r.view), { key: rig });
      if (cheer > .6 && Math.floor(t * 4) % 2 === 0) r.textAt(48, -46, 52, '♥', '#ff5a8a');
    }
  },
  /** the stadium's tiers: dense rows of heads with banners and flashes */
  tiers(g, r, t, cheer) {
    const fy = floorY(r), W = r.W;
    for (let row = 0; row < 6; row++) for (let x = (row * 5) % 8; x < W; x += 8) {
      const bob = Math.abs(Math.sin(t * (2.5 + cheer * 8) + x * .3 + row)) * (1 + cheer * 3), y = fy - 46 - row * 16 - Math.round(bob);
      const c = ['#5a3a6a', '#3a4a7a', '#7a3a3a', '#4a6a4a', '#7a5a3a', '#c8c8d8'][(x * 7 + row) % 6];
      px.rect(g, x - 3, y + 3, 6, 8, E.shade(c, -.2 - row * .05)); px.disc(g, x, y + 1, 3, E.shade('#e0b090', -.25 - row * .06));
    }
  }
};
