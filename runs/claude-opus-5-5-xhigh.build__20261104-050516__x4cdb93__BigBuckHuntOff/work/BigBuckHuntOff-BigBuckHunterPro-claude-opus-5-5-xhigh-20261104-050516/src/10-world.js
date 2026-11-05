// 10-world: a hunt's landscape: the heightfield from its data, the baked light, scattered props in a grid (drawn as
// impostors and blocking shots with their trunks and stones), the sky, fog and weather, its vantages and trails.
const GT = { grass: 0, dry: 1, leaves: 2, dirt: 3, rock: 4, talus: 5, mud: 6, reeds: 7, snow: 8, ice: 9, soil: 10, burn: 11, shore: 12, needles: 13, pasture: 14, yard: 15 };
const IMP = new E.Impostors();   // every prop's sprites, shared by the hunts
const CELL = 32 * M;             // the prop grid's cell

/** micro textures per ground type: 64 x 64 signed brightness, an eighth of a metre a texel (cosmetic) */
function makeMicro(seed) {
  const out = {}, R = E.rng(seed);
  const kinds = { 0: 'blades', 1: 'blades', 2: 'leaves', 3: 'speck', 4: 'stone', 5: 'stone', 6: 'speck', 7: 'blades', 8: 'snow', 9: 'snow', 10: 'rows', 11: 'speck', 12: 'pebble', 13: 'needles', 14: 'blades', 15: 'speck' };
  for (let t = 0; t <= 15; t++) {
    const a = new Int8Array(64 * 64), n = E.makeNoise(seed + t * 17), k = kinds[t];
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const q = n(x / 6, y / 6) * 14, h = E.hash2(x * 7 + t, y * 13 + t * 3); let v = q;
      if (k === 'blades') { const b = E.hash2(x, Math.floor(y / 3) + t * 40); v += b > .72 ? 22 : b < .2 ? -26 : 0; if (h > .985) v = 50; }
      else if (k === 'leaves') { v += h > .9 ? 34 : h < .12 ? -30 : 0; if (E.hash2(Math.floor(x / 2), Math.floor(y / 2) + 99) > .93) v = 40; }
      else if (k === 'stone') { v = n(x / 3, y / 3) * 30; if (h > .96) v = -40; }
      else if (k === 'snow') { v = q * .4 + (h > .97 ? 18 : 0); }
      else if (k === 'rows') { v = (x % 8 < 2 ? -28 : 6) + q * .6; if (h > .93) v = 26; }
      else if (k === 'pebble') { v = h > .8 ? 24 : h < .2 ? -24 : q; }
      else if (k === 'needles') { v = (E.hash2(x, y >> 1) > .6 ? 16 : -14) + q * .4; }
      else v = q + (h > .93 ? 20 : h < .07 ? -24 : 0);
      a[y * 64 + x] = clamp(Math.round(v), -110, 110);
    }
    out[t] = a;
  }
  return out;
}

class World {
  constructor(huntId) {
    const H = this.hunt = reg('hunt', huntId), t0 = Date.now();
    this.id = huntId;
    const spec = H.terrain, feats = (spec.features || []).slice();
    // every site's fan is kept clear of hills that would block it (after the authored features)
    this.vant = {};
    for (const vid in H.vantages) this.vant[vid] = Object.assign({ id: vid }, H.vantages[vid]);
    const fans = [];
    for (const sid of [...(H.sites || []), H.trophy, H.bonus, ...(H.extraFans || [])].filter(Boolean)) {
      const S = has('site', sid) ? reg('site', sid) : has('trophy', sid) ? reg('trophy', sid) : has('bonus', sid) ? reg('bonus', sid) : null; if (!S) continue;
      const v = this.vant[S.vantage]; if (!v) continue;
      const b = S.frame ? S.frame.bearings : [-35, 35], far = (S.fan || S.distances || [10, 80])[1] + 15;
      fans.push({ v, b: [b[0] - 8, b[1] + 8], far, trees: S.fanTrees || 0, keep: S.keepHills });
      if (!S.keepHills) feats.push({ kind: 'clearView', at: v.at, yaw: v.yaw, bearings: [b[0] - 4, b[1] + 4], dist: [3, far], eye: v.eye || 1.7, margin: .6 });
    }
    this.fans = fans;
    const hf = this.hf = new E.Heightfield({ N: 1024 });
    hf.generate({ seed: H.seed, base: spec.base, features: feats, types: H.types, forest: ctx => { let f = H.forest ? H.forest(ctx) : 0; if (f > 0) for (const F of fans) { const d = Math.hypot(ctx.x - F.v.at[0], ctx.y - F.v.at[1]); if (d < F.far + 20) { const a = wrapA(Math.atan2(ctx.y - F.v.at[1], ctx.x - F.v.at[0]) - F.v.yaw * DEG) / DEG; if (a > F.b[0] - 10 && a < F.b[1] + 10) f = Math.min(f, F.trees * .5); } } return f; },
      farForest: H.farForest, canopy: H.canopy, far: spec.far });
    for (const vid in this.vant) { const v = this.vant[vid]; v.gz = hf.height(v.at[0] * M, v.at[1] * M); }
    this.genMs = Date.now() - t0;
    if (HAS_DOM) { hf.bake(Object.assign({ sun: this.sunFor(0) }, H.palette)); }
    this.micro = makeMicro(H.seed);
    this.props = []; this.grid = new Map();
    this.scatter();
    for (const p of H.props || []) this.place(p[0], p[1][0] * M, p[1][1] * M, Object.assign({ authored: true }, p[2] || {}));
    this.sky = new E.Backdrop(H.sky);
    this.vista = new E.Vista({ hf, sky: this.sky, fog: this.fogFor(), mist: H.mist ? Object.assign({}, H.mist, { top: (H.mist.top || 0) }) : null, sun: Object.assign({ disc: H.sun.disc }, this.sunFor(0), { color: H.sun.color, glow: H.sun.glow }), micro: this.micro, water: H.water, grade: H.grade, canopyFrom: 150, billboardFar: 230 });
    this.ms = Date.now() - t0;
  }
  sunFor(shift) { const S = this.hunt.sun; return { yaw: S.yaw + (shift || 0) * 25, elev: clamp(S.elev + (shift || 0) * 8, -2, 70), color: S.color, ambient: S.ambient, r: S.r || 5, disc: S.disc, glow: S.glow }; }
  fogFor() { const F = this.hunt.fog, k = T('fog'); return { color: F.color, near: F.near * M / Math.max(.25, k), far: F.far * M / Math.max(.25, k), max: F.max === undefined ? 1 : F.max }; }
  refreshLook() { this.vista.setLook({ fog: this.fogFor(), sun: Object.assign({}, this.vista.sun, this.sunFor(T('timeOfDay'))) }); }
  height(x, y) { return this.hf.height(x, y); }
  get ground() { return this._g || (this._g = (x, y) => this.hf.height(x, y)); }
  /** a vantage's eye: { x, y, z, yaw } (z: eye height over the ground there) */
  eye(vid) { const v = this.vant[vid]; if (!v) throw new Error('no vantage ' + vid); const x = v.at[0] * M, y = v.at[1] * M, w = v.kind === 'canoe' ? this.hf.waterAt(x, y) : null; return { x, y, z: (w !== null && w > v.gz ? w : v.gz) + (v.eye || 1.7) * M, yaw: v.yaw * DEG, v }; }
  /** a point [bearing (deg from the vantage's yaw), distance (m)] -> world { x, y, z } */
  at(vid, b, d) { const v = this.vant[vid], a = (v.yaw + b) * DEG, x = v.at[0] * M + Math.cos(a) * d * M, y = v.at[1] * M + Math.sin(a) * d * M; return { x, y, z: this.hf.height(x, y) }; }
  /** where a world point is from a vantage: [bearing (deg), distance (m)] */
  bearingOf(vid, x, y) { const v = this.vant[vid], dx = x - v.at[0] * M, dy = y - v.at[1] * M; return [wrapA(Math.atan2(dy, dx) - v.yaw * DEG) / DEG, Math.hypot(dx, dy) / M]; }
  inFan(x, y, margin = 0) { for (const F of this.fans) { const dx = x / M - F.v.at[0], dy = y / M - F.v.at[1], d = Math.hypot(dx, dy); if (d > F.far + margin) continue; const a = wrapA(Math.atan2(dy, dx) - F.v.yaw * DEG) / DEG; if (a > F.b[0] - margin && a < F.b[1] + margin) return F; } return null; }
  /* ---- props ---- */
  place(id, x, y, o = {}) {
    const P = reg('prop', id), z = (o.z !== undefined ? o.z : this.hf.height(x, y)) - (P.sink || 0) * M;
    const p = { id, imp: P.imp || id, x, y, z, variant: o.variant || 0, facing: o.facing || 0, scale: o.scale || 1, authored: !!o.authored, occ: null, wind: P.wind ? fxr() * TAU : 0, site: o.site || null, hide: false };
    if (P.occ) p.occ = P.occ(p);
    this.props.push(p);
    const key = Math.floor(x / CELL) + ',' + Math.floor(y / CELL); let c = this.grid.get(key); if (!c) this.grid.set(key, c = []); c.push(p);
    if (P.shadow && this.hf.col) { const s = this.sunFor(0), a = s.yaw * DEG + Math.PI, L = P.shadow * p.scale * M; this.hf.stampShadow(x + Math.cos(a) * L * .9, y + Math.sin(a) * L * .9, L * 1.1, L * .7, .32, a); }
    return p;
  }
  remove(p) { const i = this.props.indexOf(p); if (i >= 0) this.props.splice(i, 1); const key = Math.floor(p.x / CELL) + ',' + Math.floor(p.y / CELL), c = this.grid.get(key); if (c) { const j = c.indexOf(p); if (j >= 0) c.splice(j, 1); } }
  /** the hunt's scatter rules: forests, groves and single trees, bushes, rocks, logs, reeds, grass, corn, drifts */
  scatter() {
    const H = this.hunt, R = E.rng(H.seed * 3 + 11), hf = this.hf, N = hf.N;
    for (const rule of H.scatter || []) {
      const sp = rule.spacing || 8, jit = sp * .45;
      for (let gy = sp / 2; gy < N - 2; gy += sp) for (let gx = sp / 2; gx < N - 2; gx += sp) {
        const x = (gx + (R() - .5) * 2 * jit), y = (gy + (R() - .5) * 2 * jit), r1 = R(), r2 = R(), r3 = R(), r4 = R();
        if (x < 2 || y < 2 || x > N - 3 || y > N - 3) continue;
        const i = Math.round(y) * N + Math.round(x), ctx = { x, y, h: hf.h[i] / M, type: hf.type[i], forest: hf.forest[i] / 255, mask: hf.mask[i], water: hf.water[i] > hf.h[i], wdist: hf.wdist ? hf.wdist[i] : 99, n: hf.noise[0](x / 31, y / 31), r: r1 };
        const p = rule.where(ctx); if (!(p > 0) || r1 > p) continue;
        let nearV = false; for (const vid in this.vant) { const v = this.vant[vid]; if (v.kind !== 'air' && Math.hypot(x - v.at[0], y - v.at[1]) < (rule.clearR === undefined ? 13 : rule.clearR)) { nearV = true; break; } } if (nearV) continue;
        const F = this.inFan(x * M, y * M, rule.fanMargin === undefined ? 4 : rule.fanMargin); if (F) { const pf = rule.fanP !== undefined ? rule.fanP : rule.inFan ? (F.trees || 0) * rule.inFan : 0; if (r2 >= pf) continue; }
        let id = rule.prop; if (rule.mix) { let acc = 0; for (const [m, w] of rule.mix) { acc += w; if (r3 * rule.mix.reduce((s, q) => s + q[1], 0) <= acc) { id = m; break; } } }
        const P = reg('prop', id);
        this.place(id, x * M, y * M, { variant: Math.floor(r4 * (P.variants || 1)), facing: r2 * TAU, scale: (rule.scale ? rule.scale[0] + (rule.scale[1] - rule.scale[0]) * r3 : 1) });
      }
    }
  }
  /** the props near a point (grid cells within r) */
  near(x, y, r, fn) { const c0 = Math.floor((x - r) / CELL), c1 = Math.floor((x + r) / CELL), d0 = Math.floor((y - r) / CELL), d1 = Math.floor((y + r) / CELL); for (let cy = d0; cy <= d1; cy++) for (let cx = c0; cx <= c1; cx++) { const c = this.grid.get(cx + ',' + cy); if (c) for (const p of c) fn(p); } }
  /** billboard items for the props the lens can see (within far) */
  gather(L, items, far = 230 * M) {
    const fx = L.Fx, fy = L.Fy, cx = L.x, cy = L.y, half = Math.atan2(L.W / 2 + 40, L.f) + .1, cosH = Math.cos(half), tt = G.game.time;
    const c0 = Math.floor((cx - far) / CELL), c1 = Math.floor((cx + far) / CELL), d0 = Math.floor((cy - far) / CELL), d1 = Math.floor((cy + far) / CELL);
    for (let gy = d0; gy <= d1; gy++) for (let gx = c0; gx <= c1; gx++) {
      const ccx = (gx + .5) * CELL - cx, ccy = (gy + .5) * CELL - cy, cd = Math.hypot(ccx, ccy);
      if (cd > far + CELL) continue;
      if (cd > CELL * 1.5 && (ccx * fx + ccy * fy) / cd < cosH - CELL * .75 / cd) continue;
      const c = this.grid.get(gx + ',' + gy); if (!c) continue;
      for (const p of c) {
        if (p.hide) continue;
        const dx = p.x - cx, dy = p.y - cy, D = dx * fx + dy * fy; if (D < 6 || D > far) continue;
        const P = reg('prop', p.id);
        const it = p.item || (p.item = { x: p.x, y: p.y, z: p.z, imp: IMP, id: p.imp, variant: p.variant, facing: Math.floor((p.facing / TAU) * (P.facings || 1)) % (P.facings || 1), scale: p.scale, box: [P.size[0], P.size[1]], bias: P.bias === undefined ? 12 : P.bias, sway: 0 });
        it.z = p.z; it.sway = P.wind && D < 60 * M ? Math.sin(tt * 1.3 + p.wind) * P.wind * (L.f / Math.max(D, 1)) * .4 : 0;
        items.push(it);
      }
    }
    return items;
  }
  /** the props whose volumes a ray could cross up to maxT, walking its ground track through the grid */
  propsAlong(o, d, maxT, fn) {
    const len = Math.hypot(d.dx, d.dy) * maxT, steps = Math.ceil(len / (CELL * .5)) + 1, seen = new Set();
    for (let i = 0; i <= steps; i++) {
      const t = maxT * i / steps, x = o.x + d.dx * t, y = o.y + d.dy * t;
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) { const key = (Math.floor(x / CELL) + ox) + ',' + (Math.floor(y / CELL) + oy); if (seen.has(key)) continue; seen.add(key); const c = this.grid.get(key); if (c) for (const p of c) if (p.occ && !p.hide) fn(p); }
    }
  }
}
const WORLDS = new Map();
bus.on('look', () => { for (const w of WORLDS.values()) w.refreshLook(); });
/** a hunt's world, built once and kept (up to two at a time) */
function worldFor(huntId) {
  let w = WORLDS.get(huntId);
  if (!w) { if (WORLDS.size >= 2) { const k = [...WORLDS.keys()].find(k => !G.world || k !== G.world.id); if (k) WORLDS.delete(k); } w = new World(huntId); WORLDS.set(huntId, w); }
  return w;
}
