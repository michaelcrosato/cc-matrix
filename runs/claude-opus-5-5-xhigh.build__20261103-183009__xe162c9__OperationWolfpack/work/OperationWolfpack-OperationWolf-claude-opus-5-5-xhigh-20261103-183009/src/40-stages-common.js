// Stage framework: WP.defStage, layout helpers (rows of palms, fence runs, sandbag lines, hut rows), floor painters,
// openings (windows and doors) and beat macros. Stage data are plain arrays: designer-editable.
(() => {
const E = My3D2dge, WP = globalThis.WP;
WP.STAGE = {}; WP.STAGES = [];
WP.defStage = st => {
  st.toWorld = st.toWorld || ((x, depth) => [x, WP.Y0 - depth]);
  // houses: their windows and doors as openings ('h3w1', 'h3w2', 'h3d'), for enemies clipped to them
  st.openings = st.openings || {};
  for (const s of (st.scenery || []).flat()) if (s.house) {
    const K = 1.7 * (s.size || 1), [hx, hy] = st.toWorld(s.x, s.depth), fy = hy + 13 * K;
    const op = (n, ox, z0, z1, w, stand) => { st.openings[s.house + n] = { cx: hx + ox * K, fy, standZ: stand, corners: [hx + (ox - w / 2) * K, fy + .6, z0 * K, hx + (ox + w / 2) * K, fy + .6, z1 * K] }; };
    op('w1', -14, 13, 22, 8, 22 * K - 38.5); op('w2', 14, 13, 22, 8, 22 * K - 38.5); op('d', 0, 0, 22, 8, 0);
  }
  st.scenery = (st.scenery || []).flat ? st.scenery : st.scenery;
  st.holds = (st.holds || []).slice().sort((a, b) => a.d - b.d);
  WP.STAGE[st.id] = st; WP.STAGES.push(st); WP.STAGES.sort((a, b) => a.n - b.n);
  return st;
};
// a deterministic layout stream per stage
const L = WP.Layout = {
  R: E.rng(7),
  seed(s) { L.R = E.rng(s); },
  /** n shapes in a row from x0 to x1 at a depth: { every, jitter, dj (depth jitter), size: [a, b], facing, mats, params, ids: [...] } */
  row(id, x0, x1, depth, o = {}) {
    const out = [], every = o.every || 60;
    for (let x = x0; x <= x1; x += every) {
      const R = L.R, sz = o.size ? o.size[0] + (o.size[1] - o.size[0]) * R() : 1, pick = o.ids ? o.ids[Math.floor(R() * o.ids.length)] : id;
      out.push({ id: pick, x: x + (R() - .5) * (o.jitter || 0), depth: depth + (R() - .5) * (o.dj || 0), z: o.z || 0, facing: o.facing === undefined ? Math.PI / 2 + (o.turn ? (R() - .5) * o.turn : 0) : o.facing, size: sz, params: o.params, mats: o.mats, flip: o.flip ? R() < .5 : false });
    }
    return out;
  },
  one(id, x, depth, o = {}) { return { id, x, depth, z: o.z || 0, facing: o.facing === undefined ? Math.PI / 2 : o.facing, size: o.size || 1, params: o.params, mats: o.mats, flip: !!o.flip, light: o.light, tag: o.tag, house: o.house, fn: o.fn }; },
  /** scenery entries -> world, for a stage */
  place(st, list) { return list.flat().map(s => { const w = st.toWorld(s.x, s.depth); return Object.assign({}, s, { wx: w[0], wy: w[1] }); }); }
};

// ---------- floors: painters (x, y, depth, t) -> packed 0xAABBGGRR, using small tileable textures ----------
const TS = 128, M = TS - 1;
const tex = (fn) => { const a = new Uint32Array(TS * TS); for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) { const c = fn(x, y); a[y * TS + x] = (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]; } return a; };
const hx = E.hex;
const TEX = WP.TEX = {};
const lazy = (k, fn) => Object.defineProperty(TEX, k, { configurable: true, get() { const v = fn(); Object.defineProperty(TEX, k, { value: v }); return v; } });
const n2 = (x, y, s) => E.noise2(x / s, y / s);
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t].map(Math.round);
const band = (cols, v) => { const i = Math.max(0, Math.min(cols.length - 1, Math.floor(v * cols.length))); return cols[i]; };
const speck = (x, y, k) => { let h = Math.imul(x * 73856093 ^ y * 19349663, 2654435761) >>> 0; return (h % 1000) / 1000 < k; };
lazy('grass', () => tex((x, y) => { const v = n2(x, y, 9) * .6 + n2(x + 40, y, 3) * .4; let c = band([hx('#5d7a2e'), hx('#6b8a34'), hx('#7a963a'), hx('#8aa244')], v); if (speck(x, y, .03)) c = hx('#a8b85a'); if (speck(x + 3, y, .012)) c = hx('#d8c070'); return c; }));
lazy('dryGrass', () => tex((x, y) => { const v = n2(x, y, 10) * .6 + n2(x + 40, y, 3) * .4; let c = band([hx('#8a7a3a'), hx('#9c8a42'), hx('#ab974a'), hx('#b8a456')], v); if (speck(x, y, .03)) c = hx('#c8b46a'); if (speck(x + 9, y + 3, .01)) c = hx('#6a5a2a'); return c; }));
lazy('dirt', () => tex((x, y) => { const v = n2(x, y, 6) * .7 + n2(x, y + 50, 2) * .3; let c = band([hx('#6e4e30'), hx('#7c5a38'), hx('#8a6642'), hx('#96704a')], v); if (speck(x, y, .04)) c = hx('#5a3e24'); if (speck(x + 5, y, .02)) c = hx('#a8845a'); return c; }));
lazy('sand', () => tex((x, y) => { const v = n2(x, y, 8) * .6 + n2(x + 10, y, 2) * .4; let c = band([hx('#c8a870'), hx('#d4b47c'), hx('#dcc088'), hx('#e4ca94')], v); if (speck(x, y, .03)) c = hx('#b89860'); return c; }));
lazy('mud', () => tex((x, y) => { const v = n2(x, y, 7) * .7 + n2(x, y + 30, 2) * .3; let c = band([hx('#3a3428'), hx('#463e30'), hx('#524838'), hx('#5c5240')], v); if (speck(x, y, .02)) c = hx('#6a6050'); return c; }));
lazy('concrete', () => tex((x, y) => { const v = n2(x, y, 12) * .5 + n2(x + 7, y, 3) * .5; let c = band([hx('#6a6a66'), hx('#76766e'), hx('#828278'), hx('#8c8c82')], v); if ((x & 63) === 0 || (y & 63) === 0) c = hx('#55554f'); if (speck(x, y, .02)) c = hx('#5c5c56'); return c; }));
lazy('asphalt', () => tex((x, y) => { const v = n2(x, y, 5) * .6 + n2(x, y, 2) * .4; let c = band([hx('#3a3c40'), hx('#424448'), hx('#4a4c50'), hx('#52545a')], v); if (speck(x, y, .03)) c = hx('#5e6066'); return c; }));
lazy('cobble', () => tex((x, y) => { const cx = Math.floor(x / 8), cy = Math.floor(y / 6), ox = x % 8, oy = y % 6; const v = n2(cx, cy, 1.3); if (ox === 0 || oy === 0) return hx('#6a5a48'); return band([hx('#9a8a72'), hx('#a8987e'), hx('#b4a488'), hx('#bca88c')], v); }));
lazy('leaves', () => tex((x, y) => { const v = n2(x, y, 4) * .7 + n2(x, y, 1.5) * .3; return band([hx('#2a4a22'), hx('#335a28'), hx('#3e6a2e'), hx('#4a7a34')], v); }));
WP.FLOOR_TEX = TEX;
const pk = c => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
WP.pack = pk;
const S = (t, x, y) => t[((y | 0) & M) * TS + ((x | 0) & M)];
WP.floorS = S;
const lerpPk = (a, b, t) => {
  const r = (a & 255) + (((b & 255) - (a & 255)) * t), g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * t), bl = ((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * t);
  return (255 << 24) | ((bl & 255) << 16) | ((g & 255) << 8) | (r & 255);
};
WP.lerpPk = lerpPk;
const shadePk = (c, k) => { const r = Math.min(255, (c & 255) * k), g = Math.min(255, ((c >> 8) & 255) * k), b = Math.min(255, ((c >> 16) & 255) * k); return (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255); };
WP.shadePk = shadePk;
// each painter: (x, y, depth, lateral, t) for a sideways rail (depth = Y0 - y)
WP.FLOORS = {
  hill(x, y, D, t) {
    const T = TEX; let c = S(T.dryGrass, x, y);
    const road = D > 70 && D < 110; if (road) { c = S(T.dirt, x, y); const r = Math.abs(D - 82) < 2 || Math.abs(D - 98) < 2; if (r) c = shadePk(c, .78); }
    else if (D > 110 && D < 116 || D > 64 && D < 70) c = lerpPk(c, S(T.dirt, x, y), .5);
    else if (E.noise2(x / 60, y / 60) > .72) c = S(T.grass, x, y);
    return c;
  },
  village(x, y, D, t) {
    const T = TEX; let c = S(T.sand, x, y);
    if (D > 60 && D < 150) { c = E.noise2(x / 40, y / 30) > .6 ? S(T.cobble, x, y) : S(T.sand, x, y); }
    else if (D > 420) c = lerpPk(S(T.sand, x, y), 0xff8a6a3a, 0);
    return c;
  },
  depot(x, y, D, t) {
    const T = TEX; let c = E.noise2(x / 80, y / 50) > .55 ? S(T.dirt, x, y) : S(T.concrete, x, y);
    // the railway: two rails on sleepers at depth 260 (and 275)
    if (D > 248 && D < 290) { c = S(T.dirt, x, y); const sl = ((x | 0) % 10 + 10) % 10 < 3; if (sl && D > 252 && D < 286) c = 0xff2a3a4a; if (Math.abs(D - 258) < 1.2 || Math.abs(D - 280) < 1.2) c = 0xff8a9298; }
    if (D > 100 && D < 116) c = lerpPk(c, 0xff283028, .3);
    return c;
  },
  kennel(x, y, D, t) {
    const T = TEX; let c = S(T.mud, x, y);
    const p = E.noise2(x / 22, y / 14); if (p > .7) { c = 0xff4a3a30; if (((x + y + Math.floor(t * 4)) | 0) % 37 === 0) c = 0xffc0b0a0; }
    if (D > 76 && D < 104) c = lerpPk(c, S(T.dirt, x, y), .4);
    return c;
  },
  apron(x, y, D, t) {
    const T = TEX; let c = S(T.asphalt, x, y);
    if (Math.abs(D - 150) < 1.5) c = 0xff40c0e0;
    if (Math.abs(D - 240) < 1 && ((x | 0) % 40 + 40) % 40 < 22) c = 0xffe8e8e8;
    if (D > 360) c = E.noise2(x / 40, y / 40) > .5 ? S(T.grass, x, y) : S(T.dryGrass, x, y);
    return c;
  },
  range(x, y, D, t) { const T = TEX; let c = S(T.dirt, x, y); if (((D | 0) % 100) < 2) c = 0xffd0d0d0; return c; }
};
// helpers for the stage files
WP.SP = (type, o) => [type, o];
WP.PR = (type, id, x, depth, o) => [type, id, x, depth, o];
})();
