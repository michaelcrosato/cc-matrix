/* THE STADIUM: a TileMap of 128 x 70 tiles (one yard each): the far stands (3 to 8 tiers), the sidelines, the 120 yards
 * of field with its end zones, and end-zone stands. The floor is painted by code: mown stripes, yard lines, numbers,
 * hashes, end-zone names, the midfield logo, mud, ice and snow. On top: the crowd, goalposts, pylons, light towers,
 * sideline props, the backdrop, the lights and the weather. */
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, Y = 16, F = FF.FIELD;
const COLS = 128, ROWS = 70, FIELD_R0 = 12, FIELD_R1 = 64;
const hash = (x, y) => E.hash2(Math.floor(x), Math.floor(y));
const hexRgb = h => E.hex(h).slice(0, 3);

// a bitmap of text from the engine's pixel font (for numbers and end-zone names painted on the field)
function textBitmap(str, font = {}) {
  const f = E.font._f(font), cells = []; let x = 0;
  for (const ch of str) {
    if (ch === ' ') { x += f.space + 1; continue; }
    const gl = E.font._glyph(f, ch); for (const [gx, gy, n] of gl.runs) for (let k = 0; k < n; k++) cells.push([x + gx + k, gy]);
    x += gl.w + 1;
  }
  const w = x - 1, h = f.h, grid = new Uint8Array(Math.max(1, w * h));
  for (const [cx, cy] of cells) if (cx >= 0 && cx < w && cy >= 0 && cy < h) grid[cy * w + cx] = 1;
  return { w, h, at: (cx, cy) => cx >= 0 && cy >= 0 && cx < w && cy < h && grid[cy * w + cx] === 1 };
}
// a logo sprite's rows as a bitmap of colors
function logoBitmap(team) { const rows = team.logo, pal = team.pal; return { w: rows[0].length, h: rows.length, at: (cx, cy) => { const ch = (rows[cy] || '')[cx]; return ch && ch !== '.' ? pal[ch] : null; } }; }

const ST = FF.Stadium = {
  cur: null, map: null, fans: [], props: [], E: .3, wave: -1,
  /** build stadium `id` for a match between home and away (team objects); o: { night, density, weather } */
  build(id, home, away, o = {}) {
    const sd = FF.stadium(id), tiers = sd.stands.tiers;
    ST.cur = sd; ST.home = home; ST.away = away; ST.opt = o;
    const rows = [];
    for (let r = 0; r < ROWS; r++) {
      let s = '';
      for (let c = 0; c < COLS; c++) {
        let ch = ',';
        if (r <= 7) { const tier = 8 - r; ch = tier <= tiers ? String(tier) : tier === tiers + 1 ? 'W' : ','; }
        else if (r < FIELD_R0) ch = 's';
        else if (r <= FIELD_R1) { if (c < 4) ch = c === 3 ? 'a' : c === 2 ? 'b' : ','; else if (c > 123) ch = c === 124 ? 'a' : c === 125 ? 'b' : ','; else ch = '.'; }
        else ch = 's';
        s += ch;
      }
      rows.push(s);
    }
    const sideC = sd.stands.side, topC = sd.stands.top, face = sd.stands.face;
    const types = {};
    for (let t = 1; t <= 8; t++) types[10 + t] = { h: 2 + t * 12, side: E.shade(sideC, -t * .03), top: E.shade(topC, -t * .02), face, roof: 'slab', cut: true, cutH: 8 };
    types[19] = { h: 24 + tiers * 12 + 22, side: E.shade(sideC, -.35), top: E.shade(topC, -.3), face: face === 'plank' ? 'plank' : 'stone', roof: 'slab', cut: true, cutH: 8 };
    types[21] = { h: 14, side: E.shade(sideC, -.05), top: topC, face, roof: 'slab', cut: true, cutH: 6 };
    types[22] = { h: 26, side: E.shade(sideC, -.1), top: topC, face, roof: 'slab', cut: true, cutH: 6 };
    const legend = { '.': { floor: 'field' }, s: { floor: 'sideline' }, ',': { floor: 'outside' }, W: 19, a: 21, b: 22 };
    for (let t = 1; t <= 8; t++) legend[String(t)] = 10 + t;
    ST.surf = makeSurface(sd);
    ST.map = new E.TileMap({ rows, legend, types, floorTex: (x, y, tag) => floorTex(x, y, tag), outside: sd.surface.ground, ao: 3, chunks: true });
    ST.backdrop = new E.Backdrop(sd.backdrop);
    // the crowd on the tiers: colors by section (home, with an away section by the right end zone)
    ST.fans = [];
    const dens = o.density !== undefined ? o.density : sd.stands.density, hc = [home.colors.primary, home.colors.secondary, home.colors.trim], ac = [away.colors.primary, away.colors.secondary, away.colors.trim];
    const skins = FF.SKIN;
    for (let r = 8 - tiers; r <= 7; r++) for (let c = 2; c < COLS - 2; c++) for (const dx of [4, 11]) {
      const h = hash(c * 7 + dx, r * 13 + 3); if (h > dens) continue;
      const tier = 8 - r, away = c > 96, pal = away ? ac : hc, h2 = hash(c * 3 + dx * 5, r * 9);
      ST.fans.push({ x: c * Y + dx, y: r * Y + 10, z: 2 + tier * 12, shirt: E.shade(pal[Math.floor(h2 * 3)], (h2 * 10 % 1 - .5) * .3), skin: skins[Math.floor(hash(c, r * 5 + dx) * 6)],
        hat: h2 > .8 ? pal[0] : null, sign: h2 < .06 ? sd.stands.signs[Math.floor(h * 97) % sd.stands.signs.length] : null, finger: h2 > .94, ph: h * 9, tier, col: c, side: away ? 1 : 0 });
    }
    // light towers and props
    ST.towers = [];
    const nT = sd.light.towers || 0;
    const corners = [[2, 10.5], [125, 10.5], [2, 66.5], [125, 66.5], [44, 10.2], [84, 10.2]];
    for (let i = 0; i < nT; i++) ST.towers.push({ x: corners[i][0] * Y, y: corners[i][1] * Y });
    ST.props = sd.props.map(([name, cx, ry, label]) => ({ name, x: cx * Y + 8, y: F.SIDE_T + ry * Y, label }));
    ST.night = !!o.night || sd.light.ambient < .45;
    return ST.map;
  },
  surfaceAt(x, y) { const s = ST.surf; if (!s) return 'grass'; return s(x, y); },
  /** lights and weather for a scene's enter */
  applyLights(game, o = {}) {
    const sd = ST.cur, L = game.lights;
    L.enabled = true; L.ambient = o.lightsOut ? .14 : (ST.opt && ST.opt.night ? .32 : sd.light.ambient);
    if (L.tint !== undefined) L.tint = sd.light.tint;
    const w = o.weather !== undefined ? o.weather : sd.weather;
    game.weather = w ? Object.assign({}, w) : null;
    FF.sim.weatherKind = w ? w.kind : null;
  },
  /** draw the stadium: backdrop, floor and walls, lines of scrimmage, goalposts, pylons, towers, props, the crowd */
  draw(r, o = {}) {
    const g = FF.game, t = g.time, S = FF.sim, sd = ST.cur;
    ST.backdrop.draw(r);
    ST.map.drawFloor(r);
    // broadcast lines: scrimmage in blue, the line to gain in yellow
    if (o.lines && S.phase !== 'IDLE' && S.mode !== 'kickoff' && S.teams[0]) {
      const los = S.los, gain = S.los + S.dir[S.poss] * S.toGo * Y;
      r.decal(gg => { lineAcross(r, gg, los, '#4a8aff'); if (S.mode === 'normal' && Math.abs(gain - S.goalX(S.poss)) > 4 && (gain - S.goalX(S.poss)) * S.dir[S.poss] < 0) lineAcross(r, gg, gain, '#ffe040'); });
    }
    ST.map.queueWalls(r);
    // the chain gang on the near sideline: the down marker at the line of scrimmage, the chains to the line to gain
    if (o.lines && S.teams[0] && S.mode === 'normal') {
      const y = F.SIDE_B + 22, x0 = S.los, x1 = S.los + S.dir[S.poss] * S.toGo * Y;
      r.decal(gg => { const a = r.w(x0, y, 0), b = r.w(x1, y, 0); px.line(gg, a[0], a[1], b[0], b[1], '#c8c4b8'); });
      for (const [x, top] of [[x0, 'down'], [x1, 'pole'], [x0 - S.dir[S.poss] * 0, null]]) if (top) r.queue(x, y, 0, gg => {
        const p = r.w(x, y, 0), q = r.w(x, y, 34), X = Math.round(p[0]);
        px.line(gg, X, Math.round(p[1]), X, Math.round(q[1]), '#2a2a2a', 2);
        if (top === 'down') { px.rect(gg, X - 5, Math.round(q[1]) - 8, 10, 9, '#ff7a1a'); E.font.text(gg, String(S.down), X, Math.round(q[1]) - 7, '#141418', { align: 'center', outline: false }); }
        else px.rect(gg, X - 4, Math.round(q[1]) - 4, 8, 5, '#ff7a1a');
      });
    }
    // the crowd: bobbing; standing up when excited; the wave; signs and foam fingers; camera flashes at night
    const ex = ST.E, waveX = ST.wave >= 0 ? ST.wave : -999;
    for (const f of ST.fans) {
      if (!r.visible(f.x, f.y, f.z + 8)) continue;
      const jump = ex > .6 ? Math.abs(Math.sin(t * 9 + f.ph)) * (ex - .5) * 8 : Math.sin(t * 2 + f.ph) * .5;
      const wv = Math.abs(f.col - waveX) < 3 ? 6 : 0, up = jump + wv;
      r.queue(f.x, f.y, f.z + up, gg => {
        const [x, y] = r.w(f.x, f.y, f.z + up), X = Math.round(x), Yy = Math.round(y);
        px.rect(gg, X - 2, Yy - 5, 4, 5, f.shirt); px.rect(gg, X - 1, Yy - 8, 3, 3, f.skin);
        if (f.hat) px.rect(gg, X - 1, Yy - 9, 3, 1, f.hat);
        if (f.finger && ex > .4) px.rect(gg, X + 2, Yy - 11, 2, 5, '#ffd84a');
        if (f.sign && ex > .2) { px.rect(gg, X - 6, Yy - 15, 13, 6, '#f4f0e0'); E.font.text(gg, f.sign.slice(0, 4), X, Yy - 14, '#c03a2a', { font: 'tiny', align: 'center', outline: false }); }
      });
    }
    // goalposts at each end line: a base post, the gooseneck, the crossbar at 53, uprights 99 apart rising 160
    for (const [ex2, d] of [[F.END_L, 1], [F.END_R, -1]]) {
      const mid = F.MID_Y, Lw = 49.5, bar = 53, top = 213, gx = ex2;
      r.queue(gx, mid, 0, gg => {
        const A = r.w(gx - d * 16, mid, 0), B = r.w(gx - d * 16, mid, bar - 6), C = r.w(gx, mid, bar);
        px.line(gg, A[0], A[1], B[0], B[1], '#c89a1a', 3); px.line(gg, B[0], B[1], C[0], C[1], '#ffd84a', 2);
        const p0 = r.w(gx, mid - Lw, bar), p1 = r.w(gx, mid + Lw, bar), u0 = r.w(gx, mid - Lw, top), u1 = r.w(gx, mid + Lw, top);
        px.line(gg, p0[0], p0[1], p1[0], p1[1], '#ffd84a', 2); px.line(gg, p0[0], p0[1] + 1, p1[0], p1[1] + 1, '#c89a1a', 1);
        px.line(gg, p0[0], p0[1], u0[0], u0[1], '#ffd84a', 2); px.line(gg, p1[0], p1[1], u1[0], u1[1], '#ffd84a', 2);
        px.rect(gg, u0[0] - 1, u0[1] - 3, 2, 3, '#ff6a3a'); px.rect(gg, u1[0] - 1, u1[1] - 3, 2, 3, '#ff6a3a');
      }, { bias: 2 });
    }
    // pylons at the goal-line and end-line corners
    for (const x of [F.END_L, F.GOAL_L, F.GOAL_R, F.END_R]) for (const y of [F.SIDE_T, F.SIDE_B]) r.queue(x, y, 0, gg => { const p = r.w(x, y, 0); px.rect(gg, Math.round(p[0]) - 1, Math.round(p[1]) - 6, 3, 6, '#ff7a1a'); px.rect(gg, Math.round(p[0]) - 1, Math.round(p[1]) - 6, 1, 6, '#ffb060'); });
    // light towers: lattice poles with lamp banks (they light the field at night)
    const lightsOut = S.lights;
    for (const tw of ST.towers) {
      r.queue(tw.x, tw.y, 0, gg => {
        const b = r.w(tw.x, tw.y, 0), tp = r.w(tw.x, tw.y, 200);
        px.line(gg, b[0] - 2, b[1], tp[0] - 1, tp[1], '#5a5a66', 1); px.line(gg, b[0] + 2, b[1], tp[0] + 1, tp[1], '#4a4a56', 1);
        for (let k = 0; k < 8; k++) { const q = r.w(tw.x, tw.y, k * 25), q2 = r.w(tw.x, tw.y, k * 25 + 25); px.line(gg, q[0] - 2 + k * .1, q[1], q2[0] + 1, q2[1], '#6a6a76'); }
        px.rect(gg, tp[0] - 7, tp[1] - 6, 14, 6, '#2a2a34');
        for (let k = 0; k < 4; k++) px.rect(gg, tp[0] - 6 + k * 3, tp[1] - 5, 2, 2, lightsOut ? '#3a3a40' : '#fff6d0');
      }, { emissive: !lightsOut });
      if (ST.night && !lightsOut) g.lights.add(tw.x, tw.y, 200, 760, .9, { color: sd.light.neon ? '#d0c8ff' : '#fff0d0' });
    }
    for (const p of ST.props) {
      if (p.name === 'sign') r.prop('sign', p.x, p.y, 0, { label: p.label });
      else r.prop(p.name, p.x, p.y, 0, { light: ST.night && !lightsOut && /lamp|lantern|firedrum|brazier|streetlamp|crystal/.test(p.name) });
    }
    // the scoreboard behind the far stands (old hand-flipped, or a jumbotron)
    const sbx = 64 * Y, sby = (7 - sd.stands.tiers) * Y + 4, sbz = 40 + sd.stands.tiers * 12;
    r.queue(sbx, sby, sbz, gg => {
      const p = r.w(sbx, sby, sbz), x = Math.round(p[0]), y = Math.round(p[1]);
      const jumbo = sd.scoreboard === 'jumbo', w = jumbo ? 84 : 64, h = jumbo ? 30 : 22;
      E.ui.box(gg, x - w / 2, y - h, w, h, { bg: jumbo ? ['#0a0a14', '#14142a'] : ['#2a4a2a', '#1a3a1a'], border: jumbo ? '#f0c040' : '#c8b080', alpha: 1 });
      if (S.teams[0]) {
        E.font.text(gg, S.teams[0].abbr + ' ' + S.score[0] + '  ' + S.score[1] + ' ' + S.teams[1].abbr, x, y - h + 4, jumbo ? '#ffe890' : '#f4f0e0', { font: 'tiny', align: 'center', outline: false });
        E.font.text(gg, jumbo ? (ST.E > .6 ? 'MAKE SOME NOISE!' : 'Q' + Math.min(4, S.quarter) + ' ' + FF.fmtClock(S.clock)) : 'Q' + Math.min(4, S.quarter), x, y - h + 12, jumbo ? (Math.floor(t * 3) % 2 ? '#ff6a3a' : '#3af0f0') : '#ffd84a', { font: 'tiny', align: 'center', outline: false });
      }
    }, { emissive: sd.scoreboard === 'jumbo' });
    if (ST.night && sd.light.neon && !lightsOut) { g.lights.add(10 * Y, 4 * Y, 60, 220, .7, { color: '#f03ab0' }); g.lights.add(118 * Y, 4 * Y, 60, 220, .7, { color: '#3af0f0' }); }
    if (sd.light.spots && !lightsOut) for (let k = 0; k < 3; k++) { const sx = (34 + k * 30) * Y + Math.sin(t * .7 + k * 2) * 300; g.lights.add(sx, F.MID_Y + Math.cos(t * .5 + k) * 200, 80, 180, .55, { color: k === 1 ? '#ffe890' : '#c0d8ff' }); }
    if (!ST.night && !lightsOut) g.lights.add(F.MID_Y * 1.6, F.MID_Y, 600, 1400, .25, { color: sd.light.tint });
    // camera flashes in the crowd at night
    if ((ST.night || lightsOut) && ST.fans.length) for (let k = 0; k < 2 + ST.E * 6; k++) { const f = ST.fans[Math.floor(FF.rf() * ST.fans.length)]; if (FF.rf() < .3) r.queue(f.x, f.y, f.z + 6, gg => { const p = r.w(f.x, f.y, f.z + 6); px.rect(gg, Math.round(p[0]), Math.round(p[1]), 1, 1, '#ffffff'); }, { emissive: true }); }
  },
  update(dt) {
    ST.E = Math.max(0, ST.E - FF.T.crowdDecay * dt * (ST.E > .2 ? 1 : .2));
    if (ST.wave >= 0) { ST.wave += dt * 10; if (ST.wave > COLS) ST.wave = -1; }
    else if (ST.E > .3 && ST.E < .7 && FF.rf() < dt / 50) ST.wave = 0;
  },
  excite(v) { ST.E = Math.min(1, Math.max(ST.E, v)); }
};
FF.stadiumSurface = (x, y) => ST.surfaceAt(x, y);
FF.fmtClock = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

function lineAcross(r, g, x, color) {
  const a = r.w(x, F.SIDE_T, 0), b = r.w(x, F.SIDE_B, 0);
  px.blend(g, .7, 'normal', () => px.line(g, a[0], a[1], b[0], b[1], color, 2));
}

/** the field's paint: precomputed bitmaps, sampled per world pixel */
let PAINT = null;
function makeSurface(sd) {
  const home = ST.home, away = ST.away, s = sd.surface;
  PAINT = { sd, stripes: s.stripes.map(hexRgb), ez: hexRgb(s.endzone), ground: hexRgb(s.ground), side: s.snow ? [214, 224, 236] : [84, 120, 64],
    digits: {}, names: [textBitmap(home.abbr), textBitmap(away.abbr)], logo: logoBitmap(home), crown: s.crown, mudSeed: s.mud, ice: s.ice, snow: s.snow, glow: s.glow, dirt: s.dirt };
  for (const n of ['1', '2', '3', '4', '5', '0']) PAINT.digits[n] = textBitmap(n);
  return (x, y) => {
    if (y < F.SIDE_T || y > F.SIDE_B || x < F.END_L || x > F.END_R) return s.snow && y > F.SIDE_B ? 'ice' : 'grass';
    if (s.ice && (y < F.SIDE_T + 3 * Y || y > F.SIDE_B - 3 * Y)) return 'ice';
    if (s.mud && mudAt(x, y)) return 'mud';
    return 'grass';
  };
}
function mudAt(x, y) { const n = E.noise2(x * .012 + 3, y * .02 + 7), mid = Math.abs(y - F.MID_Y) < 6 * Y ? .18 : 0, center = Math.abs(x - 1024) < 20 * Y ? .1 : 0; return n + mid + center > .78; }
function floorTex(x, y, tag) {
  const P = PAINT, n = hash(x, y) - .5, m = E.noise2(x * .05, y * .05) * .5;
  if (tag === 'outside') { const c = P.ground; return [c[0] + n * 14, c[1] + n * 14, c[2] + n * 14]; }
  if (tag === 'sideline') {
    if (P.snow) return [216 + n * 20, 226 + n * 16, 238 + n * 10];
    const c = P.sd.light.neon ? [30, 40, 36] : [P.stripes[1][0] * .8, P.stripes[1][1] * .8, P.stripes[1][2] * .8];
    // the coaching box stripe and the white border
    if (y > F.SIDE_B && y < F.SIDE_B + 3) return [236, 236, 230];
    if (y < F.SIDE_T && y > F.SIDE_T - 3) return [236, 236, 230];
    return [c[0] + n * 12 + m * 10, c[1] + n * 14 + m * 12, c[2] + n * 10];
  }
  // the field
  const W = paintAt(x, y);
  if (W) return W;
  let c;
  if (x < F.GOAL_L || x > F.GOAL_R) {
    c = P.ez; const k = (x < F.GOAL_L ? 0 : 1);
    // the team names in the end zones, big letters across
    const nm = P.names[k ? 0 : 1], cx = x < F.GOAL_L ? (F.END_L + F.GOAL_L) / 2 : (F.GOAL_R + F.END_R) / 2, sc = 12;
    // the letters read along the end zone, their tops toward the end line
    const row = Math.floor((k ? cx - x : x - cx) / sc + nm.h / 2), col = Math.floor((k ? y - F.MID_Y : F.MID_Y - y) / sc + nm.w / 2);
    if (row >= 0 && row < nm.h && col >= 0 && col < nm.w && nm.at(col, row)) return P.glow ? [255, 230, 250, .8] : [244 - n * 10, 236 - n * 10, 222];
    c = [c[0] + n * 16 + m * 10, c[1] + n * 16 + m * 10, c[2] + n * 16 + m * 10];
  } else {
    const stripe = Math.floor((x - F.GOAL_L) / (5 * Y)) % 2, st = P.stripes[stripe];
    c = [st[0] + n * 26 + m * 18, st[1] + n * 30 + m * 22, st[2] + n * 20 + m * 14];
    if (P.dirt && E.noise2(x * .02 + 11, y * .025 + 5) > .8 - (Math.abs(y - F.MID_Y) < 4 * Y ? .05 : 0)) c = [140 + n * 30, 110 + n * 24, 70 + n * 20];
    // wear between the hashes
    if (Math.abs(y - F.MID_Y) < 4 * Y) c = [c[0] * .92, c[1] * .9, c[2] * .9];
  }
  if (P.mudSeed && mudAt(x, y)) c = [90 + n * 20 + m * 20, 62 + n * 14 + m * 10, 34 + n * 10];
  if (P.ice && (y < F.SIDE_T + 3 * Y || y > F.SIDE_B - 3 * Y)) c = [190 + n * 14, 214 + n * 12, 236 + n * 8];
  if (P.snow) { const k = .35 + E.noise2(x * .02, y * .02) * .3; c = [c[0] + (236 - c[0]) * k, c[1] + (242 - c[1]) * k, c[2] + (250 - c[2]) * k]; }
  return c;
}
/** white paint: sidelines, end lines, goal lines, yard lines, hashes, numbers, the midfield logo; null where none */
function paintAt(x, y) {
  const P = PAINT, n = hash(x * 3, y * 3) * 18;
  const white = P.glow ? [200 + n, 255, 230, 1] : [228 + n * .5, 230 + n * .5, 222 + n * .5];
  if (Math.abs(y - F.SIDE_T) < 1.5 || Math.abs(y - F.SIDE_B) < 1.5 || Math.abs(x - F.END_L) < 1.5 || Math.abs(x - F.END_R) < 1.5) return white;
  if (x < F.GOAL_L - 1 || x > F.GOAL_R + 1) return null;
  const yd = (x - F.GOAL_L) / Y, ry = Math.round(yd);
  if (Math.abs(yd - Math.round(yd / 5) * 5) * Y < .7) return white;   // yard lines every 5
  if (Math.abs(yd - ry) * Y < .5 && (Math.abs(y - (F.MID_Y - F.HASH)) < 6 || Math.abs(y - (F.MID_Y + F.HASH)) < 6 || Math.abs(y - F.SIDE_T - 8) < 6 || Math.abs(y - F.SIDE_B + 8) < 6) && ry % 5) return white;
  // numbers every 10 yards, 12 yards in from each sideline
  const tens = Math.round(yd / 10) * 10;
  if (tens > 0 && tens < 100 && Math.abs(yd - tens) < 2.2) {
    const v = tens <= 50 ? tens : 100 - tens, str = String(v), sc = 5.5, ox = F.GOAL_L + tens * Y;
    for (const [cy, up] of [[F.SIDE_B - 12 * Y, true], [F.SIDE_T + 12 * Y, false]]) {
      const lx = up ? (x - ox) : (ox - x), ly = up ? (y - cy) : (cy - y);
      const bx = Math.floor(lx / sc + 5.5), by = Math.floor(ly / sc + 3.5);
      if (by < 0 || by > 6) continue;
      const d0 = P.digits[str[0]], d1 = P.digits[str[1]];
      if (bx >= 0 && bx < d0.w && d0.at(bx, by)) return white;
      if (bx >= d0.w + 1 && bx < d0.w + 1 + d1.w && d1.at(bx - d0.w - 1, by)) return white;
    }
  }
  // the home logo at midfield (1 sprite pixel = 0.4 yd), or the Mega Dome's crown
  const L = P.logo, s = 4.4, cx = 1024, cy = F.MID_Y;
  const rr = Math.hypot(x - cx, y - cy); if (Math.abs(rr - 36) < 1.6) return P.glow ? [255, 220, 120, .7] : [236, 232, 220];
  if (Math.abs(x - cx) < L.w * s / 2 && Math.abs(y - cy) < L.h * s / 2) {
    const c = L.at(Math.floor((x - cx) / s + L.w / 2), Math.floor((y - cy) / s + L.h / 2));
    if (c) { const v = hexRgb(c); return P.glow ? [v[0], v[1], v[2], .6] : v; }
  }
  return null;
}
})();
