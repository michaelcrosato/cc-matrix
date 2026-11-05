// The stadium builder: the TileMap (field, sidelines, stands), the painted field, goalposts, pylons, props, the backdrop,
// lights and weather. One yard is one tile (16 world units); x runs along the field, y across it (the far sideline at the top).
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, game = FF.game;
const YD = 16;
const F = FF.F = { YD, COLS: 128, ROWS: 70, END_L: 64, GOAL_L: 224, GOAL_R: 1824, END_R: 1984, SIDE_T: 192, SIDE_B: 1040, MID_Y: 616, MID_X: 1024,
  HASH: 3 * YD, BAR: 53, UPR: 49.5, UPH: 160 };
F.W = F.COLS * YD; F.H = F.ROWS * YD;
FF.views = {
  broadcast: new E.View('broadcast', 'Broadcast', 0, 50, 1, 1),
  sky: new E.View('sky', 'Sky Cam', 0, 65, 1, 1),
  blimp: E.VIEWS.topdown,
  field: new E.View('field', 'Field Level', 0, 28, 1, 1),
  iso: E.VIEWS.iso,
  reverse: new E.View('reverse', 'Reverse Angle', 180, 45, 1, 1),
  kickL: new E.View('kickL', 'Kick Cam', 90, 32, 1, 1),
  kickR: new E.View('kickR', 'Kick Cam', -90, 32, 1, 1)
};
for (const k in FF.views) if (!E.VIEWS[FF.views[k].id]) E.VIEWS[FF.views[k].id] = FF.views[k];

/* ---- the bitmaps for field paint: the pixel font's glyphs as 0/1 grids ---- */
const glyphBits = (() => {
  const f = E.font._f({}), cache = {};
  return ch => {
    if (cache[ch]) return cache[ch];
    const gl = E.font._glyph(f, ch), w = gl.w, bits = [];
    for (let y = 0; y < 7; y++) bits.push(new Array(w).fill(0));
    for (const [x, y, n] of gl.runs) for (let k = 0; k < n; k++) if (bits[y]) bits[y][x + k] = 1;
    return (cache[ch] = { w, bits });
  };
})();
const hex3 = h => { const v = parseInt(h.slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; };
FF.hex3 = hex3;

class Stadium {
  /** def: a stadium id; o: { night, weather (override: 'clear' | 'rain' | 'snow' | null for the stadium's), full (the crowd) } */
  constructor(id, o = {}) {
    const d = this.def = FF.data.stadiums[id] || FF.data.stadiums.tumbleweed; this.id = d.id; this.o = o;
    this.night = !!o.night; this.lightsOut = false;
    const S = d.surface, home = FF.data.teams[d.home];
    this.home = home;
    this.stripes = S.stripes.map(hex3); this.ez = hex3(S.endzone); this.logo = FF.data.teams[S.mid].logo;
    this.logoPal = Object.fromEntries(Object.entries(this.logo.pal).map(([k, v]) => [k, hex3(v)]));
    this.mudSeed = (S.mud || 0) * 7 + 3;
    // the map: far stands (rows 0-7), the far sideline area (8-11), the field (12-64), the near sideline (65-69)
    const N = d.stands.tiers, rows = [];
    for (let r = 0; r < F.ROWS; r++) {
      let s = '';
      for (let c = 0; c < F.COLS; c++) {
        if (r <= 7) { const tier = 7 - r; s += tier < N ? String(tier + 1) : tier === N ? '9' : ','; continue; }
        const endCol = c <= 3 ? 3 - c : c >= 124 ? c - 124 : -1;
        if (endCol >= 0 && r <= 62) { s += 'abcd'[endCol]; continue; }
        if (c >= 4 && c <= 123 && r >= 12 && r <= 64) s += '.';
        else s += 's';
      }
      rows.push(s);
    }
    const st = d.stands, types = {};
    for (let k = 0; k < 8; k++) types[11 + k] = { h: 14 + 12 * k, cut: true, cutH: 8, face: st.face, side: st.side, top: st.top, roof: st.roof || 'slab' };
    types[19] = { h: 14 + 12 * (N - 1) + 34, face: st.face === 'plank' ? 'timber' : 'stone', side: E.shade(st.side, -.25), top: E.shade(st.top, -.2), roof: 'slab' };
    const legend = { '.': { floor: 'grass' }, s: { floor: 'sideline' }, ',': { floor: 'outside' }, 9: 19, a: 11, b: 12, c: 13, d: 14 };
    for (let k = 0; k < 8; k++) legend[String(k + 1)] = 11 + k;
    this.N = N;
    this.map = new E.TileMap({ rows, legend, types, outside: false, ao: 4, floorTex: (x, y, tag) => this.texel(x, y, tag) });
    this.bd = new E.Backdrop(this.backdropSpec());
    this.props = d.props.map(([id, x, y, opt]) => ({ id, x: F.GOAL_L + x * YD, y: F.SIDE_T + y * YD, o: opt || {} }));
    this.t = 0; this.flicker = 0; this.lightning = 0;
  }
  backdropSpec() {
    const b = this.def.backdrop;
    if (this.night && this.def.night) return { sky: ['#04040c', '#0c0c24', '#1c1438'], stars: 60, moon: { x: .8, y: .18, r: 9, color: '#f0f0ff' }, layers: (b.layers || []).map(l => Object.assign({}, l, { color: E.shade(l.color, -.55) })) };
    return { sky: b.sky, sun: b.sun, moon: b.moon, stars: b.stars, layers: b.layers || [] };
  }
  /** which surface is at a world point: 'grass' | 'mud' | 'ice' | 'endzone' | 'out' */
  surfaceAt(x, y) {
    const S = this.def.surface;
    if (x < F.END_L || x > F.END_R || y < F.SIDE_T || y > F.SIDE_B) return 'out';
    if (S.ice && (y < F.SIDE_T + 3 * YD || y > F.SIDE_B - 3 * YD)) return 'ice';
    if (S.mud && this.mudAt(x, y)) return 'mud';
    if (x < F.GOAL_L || x > F.GOAL_R) return 'endzone';
    return 'grass';
  }
  mudAt(x, y) {
    const S = this.def.surface; if (!S.mud) return false;
    const n = E.noise2(x * .012 + this.mudSeed, y * .014), mid = Math.abs(y - F.MID_Y) < 6 * YD ? .12 : 0, cen = Math.abs(x - F.MID_X) < 14 * YD ? .08 : 0;
    return n + mid + cen > .72;
  }
  /** the field's paint, per world pixel */
  floorTex(x, y, tag) {
    const S = this.def.surface, n = E.hash2(x | 0, y | 0) - .5, glow = S.glowLines && !this.lightsOut ? 1 : 0;
    if (tag === 'outside') { const k = 30 + n * 10; return this.def.light.indoor ? [k * .8, k * .8, k] : [k + 12, k + 6, k]; }
    const inField = x >= F.END_L && x <= F.END_R && y >= F.SIDE_T && y <= F.SIDE_B;
    const white = (a = 236) => { const w = a + n * 14; return glow ? [w * .7, w, w, 1] : [w, w, w - 6]; };
    if (!inField) {
      // the boundary paint just outside the field, then the sideline: a darker apron of grass or turf
      if ((y >= F.SIDE_T - 4 && y < F.SIDE_T && x >= F.END_L - 4 && x <= F.END_R + 4) || (y > F.SIDE_B && y <= F.SIDE_B + 4 && x >= F.END_L - 4 && x <= F.END_R + 4) ||
        (x >= F.END_L - 4 && x < F.END_L && y >= F.SIDE_T - 4 && y <= F.SIDE_B + 4) || (x > F.END_R && x <= F.END_R + 4 && y >= F.SIDE_T - 4 && y <= F.SIDE_B + 4)) return white(240);
      // the coaches' box: a dashed yellow line 2 yd off the near sideline between the 25s
      if (y > F.SIDE_B + 30 && y < F.SIDE_B + 32 && x > F.GOAL_L + 25 * YD && x < F.GOAL_R - 25 * YD && Math.floor(x / 8) % 2) return [230, 200, 60];
      const s = this.stripes[1], k = .62 + n * .1 + E.noise2(x * .05, y * .05) * .1;
      if (S.snow) { const sn = E.noise2(x * .04, y * .04); if (sn > .45) { const w = 210 + n * 30; return [w, w + 4, w + 12]; } }
      return [s[0] * k, s[1] * k, s[2] * k];
    }
    // field lines
    const gx = x - F.GOAL_L;
    if (Math.abs(x - F.GOAL_L) < 2.4 || Math.abs(x - F.GOAL_R) < 2.4) return white(248);
    if (x > F.GOAL_L && x < F.GOAL_R) {
      const m5 = ((gx % 80) + 80) % 80, lineW = (Math.round(gx / 80) % 2 === 0) ? 1.8 : 1.3;
      if (m5 < lineW || m5 > 80 - lineW) return white();
      const m1 = ((gx % 16) + 16) % 16;
      if ((m1 < .9 || m1 > 15.1) && (Math.abs(y - (F.MID_Y - F.HASH)) < 6.4 || Math.abs(y - (F.MID_Y + F.HASH)) < 6.4 || (y > F.SIDE_T + 6 && y < F.SIDE_T + 18) || (y < F.SIDE_B - 6 && y > F.SIDE_B - 18))) return white(220);
      const num = this.numberAt(x, y); if (num) return num === 2 ? (glow ? [240, 80, 200, 1] : [240, 236, 228]) : white(232);
      // the midfield logo
      const PXS = 8, lw = 12 * PXS, fx0 = (x - (F.MID_X - lw / 2)) / PXS, fy0 = (y - (F.MID_Y - lw / 2)) / PXS, lx = Math.floor(fx0), ly = Math.floor(fy0);
      if (lx >= 0 && lx < 12 && ly >= 0 && ly < 12) { const ch = this.logo.rows[ly][lx]; if (ch !== '.') { const c = this.logoPal[ch], st = this.stripes[Math.floor(gx / 80) % 2], a = .72; return glow ? [c[0], c[1], c[2], .6] : [c[0] * a + st[0] * (1 - a) + n * 10, c[1] * a + st[1] * (1 - a) + n * 10, c[2] * a + st[2] * (1 - a) + n * 10]; } }
    }
    // the end zones: a team color with the abbreviation painted across, rotated
    if (x < F.GOAL_L || x > F.GOAL_R) {
      const left = x < F.GOAL_L, ab = left ? FF.ezLeft || this.def.surface.ezText : FF.ezRight || this.def.surface.ezText;
      const u0 = left ? (F.SIDE_B - y) : (y - F.SIDE_T), v0 = left ? (F.GOAL_L - 2 - x) : (x - F.GOAL_R - 2);   // u: along the letters, v: up them
      const ph = 16, tw = ab.length * 6 * ph - ph, start = (F.SIDE_B - F.SIDE_T - tw) / 2, vu = (v0 - 20) / ph, uu = (u0 - start) / ph;
      if (vu >= 0 && vu < 7 && uu >= 0 && uu < ab.length * 6) {
        const li = Math.floor(uu / 6), gxp = Math.floor(uu - li * 6), gyp = 6 - Math.floor(vu), gb = glyphBits(ab[li]);
        if (gxp < gb.w && gb.bits[gyp] && gb.bits[gyp][gxp]) return glow ? [240, 240, 255, 1] : [244, 240, 228];
      }
      const e = this.ez, k = .9 + n * .12 + (Math.floor((left ? x : x) / 8) % 2 ? .03 : 0);
      return [e[0] * k + 6, e[1] * k + 6, e[2] * k + 6];
    }
    // grass: stripes mown 5 yards wide, wear between the hashes, dirt, mud, snow
    const stripe = this.stripes[Math.floor(gx / 80) % 2], nz = E.noise2(x * .06, y * .06) - .5;
    let k = 1 + n * .16 + nz * .14;
    let c = [stripe[0] * k, stripe[1] * k, stripe[2] * k];
    if (S.worn && Math.abs(y - F.MID_Y) < 5 * YD) { const w = S.worn * (1 - Math.abs(y - F.MID_Y) / (5 * YD)) * (.5 + E.noise2(x * .03, y * .05) * .7); c = [E.lerp(c[0], 140, w * .5), E.lerp(c[1], 120, w * .5), E.lerp(c[2], 70, w * .5)]; }
    if (S.dirt && E.noise2(x * .03 + 9, y * .03) > .86) c = [150 + n * 20, 110 + n * 16, 70 + n * 10];
    if (S.mud && this.mudAt(x, y)) { const w = E.noise2(x * .2, y * .2); c = w > .75 ? [90 + n * 10, 74, 60] : [86 + n * 18, 58 + n * 12, 34 + n * 8]; }
    if (S.ice && (y < F.SIDE_T + 3 * YD || y > F.SIDE_B - 3 * YD)) { const w = 200 + n * 20 + (Math.floor((x + y) / 6) % 5 === 0 ? 30 : 0); c = [w * .82, w * .92, w]; }
    if (S.snow) { const sn = E.noise2(x * .02, y * .02) * .8 + E.noise2(x * .11, y * .11) * .2 + n * .08; if (sn > .66) { const w = 222 + n * 20, k = Math.min(.75, (sn - .66) * 6); c = [E.lerp(c[0], w, k), E.lerp(c[1], w + 4, k), E.lerp(c[2], w + 12, k)]; } }
    if (glow) c = [c[0] * .8, c[1] * .85, c[2] * .9];
    return c;
  }
  /** the yard numbers (and their little arrows) at a point: 1 a number pixel, 2 an arrow pixel, 0 nothing */
  numberAt(x, y) {
    const gx = x - F.GOAL_L, k = Math.round(gx / 160); if (k < 1 || k > 9) return 0;
    const lineX = F.GOAL_L + k * 160, val = (k <= 5 ? k : 10 - k) * 10, s = String(val), hpx = 40 / 7;
    for (const near of [true, false]) {
      const cy = near ? F.SIDE_B - 12 * YD : F.SIDE_T + 12 * YD;
      if (Math.abs(y - cy) > 24) continue;
      // near side reads upright from the camera; the far side is upside down, as painted on a real field
      let u = (x - lineX), v = (y - (cy - 20));
      if (!near) { u = -u; v = 40 - v; }
      const row = Math.floor(v / hpx); if (row < 0 || row > 6) continue;
      const dw = 5 * hpx, gap = 7;
      let li = -1, col = -1;
      if (u < -gap / 2 && u >= -gap / 2 - dw) { li = 0; col = Math.floor((u + gap / 2 + dw) / hpx); }
      else if (u > gap / 2 && u <= gap / 2 + dw) { li = 1; col = Math.floor((u - gap / 2) / hpx); }
      if (li >= 0) { const gb = glyphBits(s[li]); if (col >= 0 && col < gb.w && gb.bits[row][col]) return 1; }
      // the arrow toward the nearer goal, outside the tens digit
      if (val < 50) {
        const toward = k < 5 ? -1 : 1, ax = (toward * (near ? 1 : -1)) * (gap / 2 + dw + 8), ay = 20;
        const du = (u - ax) * (toward * (near ? 1 : -1)), dv = Math.abs(v - ay);
        if (du >= -5 && du <= 0 && dv <= (du + 5) * .8) return 2;
      }
    }
    return 0;
  }
  /** the painted field, computed once per stadium in world space (a texel per world unit) and sampled by every view's bake,
   *  so a new zoom or angle bakes fast */
  texel(x, y, tag) {
    if (!this._tex) this.paint();
    const ix = Math.max(0, Math.min(F.W - 1, x | 0)), iy = Math.max(0, Math.min(F.H - 1, y | 0)), k = (iy * F.W + ix) * 4, t = this._tex, o = this._out;
    o[0] = t[k]; o[1] = t[k + 1]; o[2] = t[k + 2]; o[3] = t[k + 3] / 255; return o;
  }
  paint() {
    const t = this._tex = new Uint8ClampedArray(F.W * F.H * 4); this._out = [0, 0, 0, 0];
    for (let y = 0; y < F.H; y++) { const cy = Math.floor(y / YD); for (let x = 0; x < F.W; x++) {
      const tag = this.map ? this.map.floorTags[cy * F.COLS + Math.floor(x / YD)] : 'grass', c = this.floorTex(x + .5, y + .5, tag) || [0, 0, 0], k = (y * F.W + x) * 4;
      t[k] = c[0]; t[k + 1] = c[1]; t[k + 2] = c[2]; t[k + 3] = (c[3] || 0) * 255;
    } }
  }
  setLightsOut(on) { this.lightsOut = !!on; }
  /** the northern lights over Frostbite: slow green and purple curtains drawn into the sky */
  aurora(r, t) {
    const g = r.tgt; if (!g) return;
    for (let k = 0; k < 3; k++) {
      const col = k === 1 ? '#b05ae0' : '#5af0a0', y0 = 8 + k * 9, pts = [];
      for (let i = 0; i <= 16; i++) { const x = (i / 16) * r.W, y = y0 + Math.sin(i * .7 + t * .4 + k) * 6 + Math.sin(i * 1.9 - t * .3) * 3; pts.push([x, y]); }
      for (let i = 16; i >= 0; i--) { const x = (i / 16) * r.W, y = y0 + 16 + Math.sin(i * .9 + t * .5 + k * 2) * 5; pts.push([x, y]); }
      px.polyDither(g, pts, col, .28, r.ix, r.iy);
    }
  }
  /** apply the light, weather and music for play here */
  enter(o = {}) {
    const L = game.lights, d = this.def;
    L.enabled = true;
    const amb = this.night && d.night ? d.night.ambient : d.light.ambient;
    L.ambient = this.lightsOut ? .12 : amb; L.darkness = this.lightsOut ? .9 : .82;
    L.dark = this.night || d.light.towers ? [8, 8, 26] : d.id === 'tumbleweed' ? [40, 14, 46] : [20, 22, 34]; L.tint = .35;
    try { L.refresh(); } catch (e) { /* headless */ }
    const wk = o.weather === undefined || o.weather === 'stadium' ? d.weather : o.weather === 'clear' ? null : o.weather === 'rain' ? { kind: 'rain', amount: .6, wind: .2, lightning: .08 } : o.weather === 'snow' ? { kind: 'snow', amount: .7, wind: .3 } : d.weather;
    this.weather = wk; game.weather = wk ? Object.assign({}, wk) : null;
    if (wk && wk.kind === 'snow') this.snowing = true;
  }
  /** this frame's lights */
  lights(r, t) {
    const L = game.lights, d = this.def; if (this.lightsOut) { L.ambient = .12; return; }
    const amb = this.night && d.night ? d.night.ambient : d.light.ambient; L.ambient = amb;
    if (this.night && d.night && d.night.flicker) { const f = Math.sin(t * 13) * Math.sin(t * 7.3) > .2 ? 1 : .55; L.add(F.MID_X, F.MID_Y - 60, 110, 300, .75 * f, { color: '#ffe0a0' }); L.add(F.MID_X + 420, F.MID_Y - 140, 90, 200, .45, { color: '#ffc880' }); return; }
    if (d.light.towers) for (const [x, y] of [[F.END_L - 40, F.SIDE_T - 70], [F.END_R + 40, F.SIDE_T - 70], [F.END_L - 40, F.SIDE_B + 60], [F.END_R + 40, F.SIDE_B + 60], [F.MID_X - 500, F.SIDE_T - 80], [F.MID_X + 500, F.SIDE_T - 80]])
      L.add(x, y, 200, 620, .95, { color: '#f4f0ff' });
    if (d.light.neon) { L.add(F.GOAL_L + 20 * YD, F.SIDE_T - 2 * YD, 30, 200, .8, { color: d.light.neon[0] }); L.add(F.GOAL_L + 80 * YD, F.SIDE_T - 2 * YD, 30, 200, .8, { color: d.light.neon[1] }); }
    if (d.light.strings) for (let k = 0; k < 10; k++) L.add(F.GOAL_L + k * 180, F.SIDE_T - 40, 70, 160, .55, { color: '#ffd080' });
    if (d.light.sun) L.add(F.MID_X - 900, F.MID_Y, 400, 1400, .55, { color: d.light.sun.color });
    if (d.light.spots) for (let k = 0; k < d.light.spots; k++) { const a = t * .4 + k * 1.05; L.add(F.MID_X + Math.cos(a) * 600, F.MID_Y + Math.sin(a * 1.3) * 300, 220, 260, .9, { color: k % 2 ? '#fff0c0' : '#c0e0ff' }); }
    if (!d.light.towers && !d.light.spots && !d.light.sun && !d.light.strings) L.add(F.MID_X, F.MID_Y, 300, 1600, .6, { color: '#e0e8ff' });
  }
  /** draw the stadium: the backdrop, the floor, the stands' walls, goalposts, pylons, props */
  draw(r, t) {
    this.t = t;
    this.bd.draw(r);
    if (this.def.backdrop.aurora) this.aurora(r, t);
    this.map.drawFloor(r);
    this.map.queueWalls(r);
    // goalposts
    for (const side of [-1, 1]) this.goalpost(r, side);
    // pylons at the 4 goal-line and 4 end-line corners
    for (const x of [F.GOAL_L, F.GOAL_R, F.END_L, F.END_R]) for (const y of [F.SIDE_T, F.SIDE_B]) r.shape('pylon', x, y, 0, {});
    // props
    for (const p of this.props) this.prop(r, p, t);
    this.lights(r, t);
  }
  prop(r, p, t) {
    const o = p.o;
    if (p.id === 'neonSign') {
      r.shape('neonSign', p.x, p.y, 0, {});
      if (!this.lightsOut || true) r.queue(p.x, p.y + 2, 38, g => { const [x, y] = r.w(p.x, p.y + 2, 40); const on = Math.sin(t * 6 + p.x) > -.8; px.glow(g, 1); E.font.text(g, o.text, Math.round(x), Math.round(y) - 6, on ? o.color : E.shade(o.color, -.5), { align: 'center', outline: '#000', scale: 1 }); }, { emissive: true });
      return;
    }
    if (p.id === 'oldScoreboard' || p.id === 'jumbotron') {
      r.shape(p.id, p.x, p.y, 0, {});
      const z = p.id === 'jumbotron' ? 100 : 52;
      r.queue(p.x, p.y + 3, z - 10, g => {
        const [x, y] = r.w(p.x, p.y + 3, z); const m = FF.match, S = m ? m.score : [0, 99], T = m ? m.teams : null;
        if (p.id === 'jumbotron') { px.glow(g, .8); E.font.text(g, (T ? T[0].abbr : 'HOME') + ' ' + S[0] + '  ' + S[1] + ' ' + (T ? T[1].abbr : 'AWAY'), Math.round(x), Math.round(y) - 14, '#ffe890', { align: 'center', outline: '#000' }); E.font.text(g, Math.floor(t * 2) % 2 ? 'MAKE SOME NOISE!' : 'FIASCO CUP', Math.round(x), Math.round(y) - 4, '#ff6a8a', { align: 'center', outline: '#000', font: 'tiny' }); }
        else { E.font.text(g, 'HOME ' + S[0] + '  GUEST ' + S[1], Math.round(x), Math.round(y) - 8, '#f4f0e0', { align: 'center', outline: false, font: 'tiny' }); }
      }, { emissive: p.id === 'jumbotron' });
      return;
    }
    if (E.SHAPES[p.id] || p.id.includes(':')) { r.shape(p.id, p.x, p.y, 0, { facing: o.facing === undefined ? Math.PI / 2 : o.facing, light: o.light, mats: o.color ? { b: 'ff-blue', y: 'ff-blue' } : undefined }); return; }
    r.prop(p.id, p.x, p.y, 0, Object.assign({}, o));
  }
  goalpost(r, side) {
    const xe = side < 0 ? F.END_L : F.END_R, out = side, y = F.MID_Y, Y = '#ffd84a', Ysh = '#c89a1a', B = F.BAR, U = F.UPR, H = F.UPH;
    const base = xe + out * 14;
    r.queue(base, y, 0, g => {
      const P = (x, yy, z) => r.w(x, yy, z).map(Math.round);
      const [bx0, by0] = P(base, y, 0), [bx1, by1] = P(base, y, B - 8), [gx, gy] = P(xe, y, B);
      px.line(g, bx0, by0, bx1, by1, Ysh, 3); px.line(g, bx0 - 1, by0, bx1 - 1, by1, Y, 2);
      px.line(g, bx1, by1, gx, gy, Y, 2);
      const [cx0, cy0] = P(xe, y - U, B), [cx1, cy1] = P(xe, y + U, B);
      px.line(g, cx0, cy0 + 1, cx1, cy1 + 1, Ysh, 2); px.line(g, cx0, cy0, cx1, cy1, Y, 2);
      for (const s of [-1, 1]) { const [ux0, uy0] = P(xe, y + s * U, B), [ux1, uy1] = P(xe, y + s * U, B + H); px.line(g, ux0 + 1, uy0, ux1 + 1, uy1, Ysh, 2); px.line(g, ux0, uy0, ux1, uy1, Y, 2); px.rect(g, ux1 - 1, uy1 - 3, 2, 3, '#e83a2a'); }
      // the padding on the base post
      px.rect(g, bx0 - 2, by0 - 14, 5, 14, FF.match && FF.match.teams ? FF.match.teams[0].colors.primary : '#4a6ad8');
    }, { bias: 2 });
  }
}
FF.Stadium = Stadium;
})();
