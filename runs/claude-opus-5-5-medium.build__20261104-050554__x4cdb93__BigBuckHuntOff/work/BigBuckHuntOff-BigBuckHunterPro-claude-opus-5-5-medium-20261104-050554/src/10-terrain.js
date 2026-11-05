// Terrain: B.Heightfield. A 1024 m core at 2 m samples (ground and the "top" with canopy, corn and reeds), a 4 km far
// ring at 16 m, water levels, ground types and a light-baked colour map. Authored by site "fans": each site shapes the
// land in front of its vantage with a height profile by distance, clears the canopy and lays water.
(() => {
const B = BB, E = B.E;
const N = 512, CELL = 2, SIZE = N * CELL;          // core: 0..1024 m
const NF = 256, FCELL = 16, F0 = -1536;            // far ring: -1536..2560 m
B.CORE = SIZE;

// ---- seeded value noise ----
function hash2(x, y, s) { let h = ((x | 0) * 374761393 + (y | 0) * 668265263 + (s | 0) * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
B.hash2 = hash2;
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
B.vnoise = vnoise;
function fbm(x, y, s, oct = 5) { let a = 0, amp = .5, f = 1, n = 0; for (let i = 0; i < oct; i++) { a += amp * (vnoise(x * f, y * f, s + i * 31) * 2 - 1); n += amp; amp *= .5; f *= 2; } return a / n; }
B.fbm = fbm;

// ---- geometry helpers ----
function segDist(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy; let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; const qx = ax + dx * t - px, qy = ay + dy * t - py; return [Math.sqrt(qx * qx + qy * qy), t]; }
function polyDist(px, py, pts) {   // distance to a polyline, and the distance along it
  let best = 1e9, along = 0, acc = 0, bestAlong = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const [d, t] = segDist(px, py, a[0], a[1], b[0], b[1]);
    if (d < best) { best = d; bestAlong = acc + t * L; }
    acc += L;
  }
  along = bestAlong; return [best, along, acc];
}
B.polyDist = polyDist;
function inPoly(x, y, pts) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
B.inPoly = inPoly;
function profileAt(prof, d) { if (d <= prof[0][0]) return prof[0][1]; for (let i = 1; i < prof.length; i++) if (d <= prof[i][0]) { const a = prof[i - 1], b = prof[i], t = (d - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * B.smooth(t); } return prof[prof.length - 1][1]; }
B.profileAt = profileAt;

// site-relative point: [bearing deg (negative = left), dist m] from a vantage { x, y, yaw }
B.rel = (v, bearing, dist) => { const a = v.yaw - bearing * B.DEG; return [v.x + Math.cos(a) * dist, v.y + Math.sin(a) * dist]; };

class Heightfield {
  constructor(hunt, o = {}) {
    this.hunt = hunt; this.seed = hunt.seed; this.N = N; this.cell = CELL;
    this.ground = new Float32Array(N * N); this.top = new Float32Array(N * N); this.water = new Float32Array(N * N).fill(NaN);
    this.type = new Uint8Array(N * N); this.crown = new Uint8Array(N * N);
    this.far = new Float32Array(NF * NF); this.farCol = new Uint32Array(NF * NF);
    this.col = null; this.maxTop = 0; this.trees = []; this.props = []; this.occluders = [];
    this.vantages = {};
    this.build(o);
  }
  idx(x, y) { const cx = Math.round(x / CELL), cy = Math.round(y / CELL); return cx < 0 || cy < 0 || cx >= N || cy >= N ? -1 : cy * N + cx; }
  base(x, y) {
    const H = this.hunt.terrain, s = this.seed;
    const wx = x + fbm(x / 300, y / 300, s + 7, 2) * (H.warp || 40), wy = y + fbm(x / 300 + 9, y / 300 + 4, s + 9, 2) * (H.warp || 40);
    let h = fbm(wx / H.scale, wy / H.scale, s, 5) * H.amp;
    const d = Math.hypot(x - SIZE / 2, y - SIZE / 2);   // outside the core the land rises into hills
    if (H.rim) h += Math.max(0, d - 520) / 900 * H.rim * (0.6 + 0.8 * vnoise(x / 400, y / 400, s + 3));
    return h + (H.offset || 0);
  }
  build(o) {
    const hunt = this.hunt, H = hunt.terrain, s = this.seed, g = this.ground;
    // 1. base
    for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) g[cy * N + cx] = this.base(cx * CELL, cy * CELL);
    for (let fy = 0; fy < NF; fy++) for (let fx = 0; fx < NF; fx++) this.far[fy * NF + fx] = this.base(F0 + fx * FCELL, F0 + fy * FCELL);
    // vantages: ground under each, from the base
    for (const id in hunt.vantages) { const v = hunt.vantages[id]; this.vantages[id] = Object.assign({ id }, v, { x: v.at[0], y: v.at[1], yaw: (v.yaw || 0) * B.DEG }); }
    // 2. features (in order)
    const feats = (H.features || []).map(f => this.resolve(f));
    this.feats = feats;
    this.base0 = new Float32Array(g); this.fanW = new Float32Array(N * N);
    for (const f of feats) if (f.type === 'fan') this.apply(f);
    this.base0 = null; this.fanW = null;
    for (const f of feats) if (f.type !== 'fan') this.apply(f);
    for (let i = 0; i < N * N; i++) if (this.ground[i] >= this.water[i]) this.water[i] = NaN;
    for (const id in this.vantages) { const v = this.vantages[id]; v.gz = this.groundAt(v.x, v.y); v.z = v.gz + (v.eye || 1.7); }
    // 3. ground types, canopy (top), crowns
    this.classify();
    // 4. scatter trees and props
    this.scatter();
    for (const [kind, site, pt, op] of hunt.props || []) {
      const v = this.vantages[site], [x, y] = B.rel(v, pt[0], pt[1]), q = Object.assign({ seed: Math.round(x * 7 + y * 13) }, op || {});
      if (q.facing !== undefined) q.facing *= B.DEG; else q.facing = 0;
      if ((hunt.rules || {}).snowAll) q.snow = true;
      this.addProp(kind, x, y, q);
    }
    for (let i = 0; i < N * N; i++) if (this.top[i] > this.maxTop) this.maxTop = this.top[i];
    for (let i = 0; i < NF * NF; i++) if (this.far[i] > this.maxTop) this.maxTop = this.far[i];
    if (!o.noColor) this.bake();
  }
  resolve(f) {   // site-relative points to world points
    const out = Object.assign({}, f);
    if (f.site) { out.v = this.vantages[f.site]; if (!out.v) throw new Error('no vantage ' + f.site); }
    const P = p => (out.v && p.length === 2 && !f.world ? B.rel(out.v, p[0], p[1]) : p);
    if (f.path) out.path = f.path.map(P);
    if (f.poly) out.poly = f.poly.map(P);
    if (f.at) out.at = P(f.at);
    return out;
  }
  apply(f) {
    const g = this.ground, W = this.water;
    const each = (x0, y0, x1, y1, fn) => {
      const c0 = Math.max(0, Math.floor(x0 / CELL)), c1 = Math.min(N - 1, Math.ceil(x1 / CELL)), r0 = Math.max(0, Math.floor(y0 / CELL)), r1 = Math.min(N - 1, Math.ceil(y1 / CELL));
      for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) fn(cy * N + cx, cx * CELL, cy * CELL);
    };
    const bb = (pts, m) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } return [x0 - m, y0 - m, x1 + m, y1 + m]; };
    if (f.type === 'fan') {
      // shape the land in a site's fan: height = vantage ground + profile(dist), blended at the edges
      const v = f.v, vg = this._bil(this.base0, N, v.x / CELL, v.y / CELL) + (f.lift || 0), [b0, b1] = f.bearings, d1 = f.prof[f.prof.length - 1][0], g0 = this.base0, FW = this.fanW;
      each(v.x - d1 - 60, v.y - d1 - 60, v.x + d1 + 60, v.y + d1 + 60, (i, x, y) => {
        const dx = x - v.x, dy = y - v.y, d = Math.hypot(dx, dy);
        if (d > d1 + 50) return;
        const brg = -B.wrapA(Math.atan2(dy, dx) - v.yaw) / B.DEG;
        const eb = Math.max(0, b0 - brg, brg - b1), ed = Math.max(0, d - d1);
        const w = B.clamp(1 - Math.max(eb / (f.soft || 18), ed / 45), 0, 1);
        const behind = d < 14 ? B.clamp(1 - d / 14, 0, 1) : 0;   // the vantage's own footing
        const ww = Math.max(B.smooth(w), behind);
        if (ww <= 0) return;
        if (ww <= FW[i]) return;
        FW[i] = ww;
        const target = vg + profileAt(f.prof, d) + (f.rough || .6) * fbm(x / 23, y / 23, this.seed + 77, 3);
        g[i] = g0[i] + (target - g0[i]) * ww;
        this.noCanopy = this.noCanopy || new Uint8Array(N * N);
        if ((w > .05 && d > 4) || d < 18) this.noCanopy[i] = Math.max(this.noCanopy[i], d < 18 ? 255 : Math.round(255 * Math.min(1, w * 1.6)));
      });
    } else if (f.type === 'ridge') {
      const [x0, y0, x1, y1] = bb(f.path, f.width * 2.5);
      each(x0, y0, x1, y1, (i, x, y) => { const [d] = polyDist(x, y, f.path); g[i] += f.height * Math.exp(-(d * d) / (f.width * f.width)); });
    } else if (f.type === 'river') {
      const [x0, y0, x1, y1] = bb(f.path, f.width * 3);
      // surface along the river: the base at its points, made to fall steadily downstream
      const prof = []; let acc = 0, lvl = 1e9;
      for (let k = 0; k < f.path.length; k++) { if (k) acc += Math.hypot(f.path[k][0] - f.path[k - 1][0], f.path[k][1] - f.path[k - 1][1]); lvl = this.groundAt(f.path[k][0], f.path[k][1]) - .45; prof.push([acc, lvl]); }
      if (f.level !== undefined) for (const p of prof) p[1] = f.level;
      each(x0, y0, x1, y1, (i, x, y) => {
        const [d, along] = polyDist(x, y, f.path), wl = profileAt(prof, along), hw = f.width / 2;
        if (d < hw * 2.6) {
          const bed = wl - f.depth * Math.max(0, 1 - (d / hw) * (d / hw)) - .25;
          const bank = wl + .35 + Math.max(0, d - hw) * (f.banks || .45);
          const lim = d < hw ? bed : Math.min(bank, g[i]);
          if (g[i] > lim) g[i] = d < hw ? bed : B.lerp(g[i], lim, B.clamp(1 - (d - hw) / (hw * 1.6), 0, 1));
          if (d < hw * 1.2) W[i] = isNaN(W[i]) ? wl : Math.max(W[i], wl);
        }
      });
    } else if (f.type === 'lake') {
      const [cx0, cy0] = f.at, [rx, ry] = f.radii, lv = f.level;
      each(cx0 - rx * 1.6, cy0 - ry * 1.6, cx0 + rx * 1.6, cy0 + ry * 1.6, (i, x, y) => {
        const wob = 1 + .18 * (vnoise(x / 40, y / 40, this.seed + 5) - .5);
        const q = Math.hypot((x - cx0) / rx, (y - cy0) / ry) / wob;
        if (q < 1) { const bed = lv - f.depth * (1 - q * q) - .2; g[i] = bed; W[i] = lv; }
        else if (q < 1.5) { const t = (q - 1) / .5, bank = lv + .3 + t * t * 6; if (g[i] > bank) g[i] = B.lerp(bank, g[i], B.smooth(t)); }
      });
    } else if (f.type === 'flatten') {
      const [x0, y0, x1, y1] = bb(f.poly, f.falloff || 20); let z = f.z;
      if (z === 'avg' || z === undefined) { let sum = 0, n = 0; each(x0, y0, x1, y1, (i, x, y) => { if (inPoly(x, y, f.poly)) { sum += g[i]; n++; } }); z = n ? sum / n : 0; }
      if (typeof f.z === 'number' && f.relTo) z = this.groundAt(f.relTo[0], f.relTo[1]) + f.z;
      each(x0, y0, x1, y1, (i, x, y) => {
        let w = inPoly(x, y, f.poly) ? 1 : 0;
        if (!w) { let best = 1e9; for (let k = 0; k < f.poly.length; k++) { const a = f.poly[k], b = f.poly[(k + 1) % f.poly.length]; best = Math.min(best, segDist(x, y, a[0], a[1], b[0], b[1])[0]); } w = Math.max(0, 1 - best / (f.falloff || 20)); }
        if (w > 0) g[i] = B.lerp(g[i], z, B.smooth(w));
      });
    } else if (f.type === 'mound') {   // a rise or a hollow at a point
      const [px, py] = f.at, r = f.r;
      each(px - r * 2, py - r * 2, px + r * 2, py + r * 2, (i, x, y) => { const d = Math.hypot(x - px, y - py) / r; g[i] += f.h * Math.exp(-d * d * 2); });
    }
  }
  baseAt(x, y) { return this.groundAt(x, y); }
  classify() {
    const hunt = this.hunt, s = this.seed, g = this.ground, T = this.top, W = this.water, R = hunt.rules || {};
    const fields = (this.feats || []).filter(f => f.type === 'field'), trails = (this.feats || []).filter(f => f.type === 'trail'), zones = (this.feats || []).filter(f => f.type === 'zone');
    const nc = this.noCanopy || new Uint8Array(N * N); this.shotTop = new Float32Array(N * N);
    for (const tr of trails) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of tr.path) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } tr.bb = [x0 - 10, y0 - 10, x1 + 10, y1 + 10]; }
    const nearTrail = (tr, x, y) => x >= tr.bb[0] && x <= tr.bb[2] && y >= tr.bb[1] && y <= tr.bb[3];
    for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) {
      const i = cy * N + cx, x = cx * CELL, y = cy * CELL, h = g[i];
      const sx = (g[Math.min(N - 1, cx + 1) + cy * N] - g[Math.max(0, cx - 1) + cy * N]) / (2 * CELL), sy = (g[cx + Math.min(N - 1, cy + 1) * N] - g[cx + Math.max(0, cy - 1) * N]) / (2 * CELL);
      const slope = Math.hypot(sx, sy);
      let t = 1, top = h;   // 1 grass
      const n1 = vnoise(x / 30, y / 30, s + 11);
      if (n1 > .62) t = 2; else if (n1 < .3 && R.leaf) t = 3;   // dry grass, leaf litter
      if (R.snowAll) t = 8;
      if (R.snowAbove !== undefined && h > R.snowAbove + vnoise(x / 50, y / 50, s) * 8) t = 8;
      if (slope > (R.rockSlope || .75)) t = 5;
      else if (R.talus && slope > R.talus && h > (R.talusAbove || -1e9)) t = 13;
      const wl = W[i];
      if (!isNaN(wl)) { t = h < wl - .5 ? 6 : R.shore || 6; }
      else {
        // shore band near water
        let near = false; for (let k = -2; k <= 2 && !near; k++) for (let j = -2; j <= 2; j++) { const q = (cy + k) * N + (cx + j); if (q >= 0 && q < N * N && !isNaN(W[q]) && h < W[q] + 1.2) { near = true; break; } }
        if (near) t = R.shore || 6;
      }
      for (const z of zones) if (inPoly(x, y, z.poly)) t = z.ground;
      for (const tr of trails) { if (!nearTrail(tr, x, y)) continue; const [d] = polyDist(x, y, tr.path); if (d < tr.width / 2 + vnoise(x / 3, y / 3, s) * .8) t = 4; }
      let canopy = 0, crown = 0;
      for (const f of fields) if (inPoly(x, y, f.poly)) { t = f.crop === 'corn' ? 9 : 10; if (f.crop === 'corn') canopy = 2.3; }
      // reeds in the shallows
      if (R.reeds && !isNaN(wl) && h > wl - 1.1 && h < wl - .05 && vnoise(x / 9, y / 9, s + 21) > .38) { t = 11; canopy = 1.4 + (wl - h) * .2; }
      // forest canopy by mask
      if (!canopy && R.forest && t !== 4 && t !== 5 && isNaN(wl) && t !== 9) {
        const m = fbm(x / R.forest.scale, y / R.forest.scale, s + 41, 3) + (R.forest.bias || 0) - nc[i] / 255 * 1.2;
        let near = 0; for (const tr of trails) { if (!nearTrail(tr, x, y)) continue; const [d] = polyDist(x, y, tr.path); if (d < 6) near = 1; }
        if (m > 0 && !near) {
          // crowns: jittered points on a 6 m grid
          const cs = R.forest.crown || 6, gx = Math.floor(x / cs), gy = Math.floor(y / cs); let bd = 9, bh = 0;
          for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const px = (gx + a + hash2(gx + a, gy + b, s) * .9) * cs, py = (gy + b + hash2(gx + a, gy + b, s + 1) * .9) * cs, d = Math.hypot(x - px, y - py) / cs; if (d < bd) { bd = d; bh = hash2(gx + a, gy + b, s + 2); } }
          const edge = B.clamp(m * 6, 0, 1);
          canopy = (R.forest.h || 14) * (.75 + .35 * bh) * (1 - bd * bd * .35) * (.55 + .45 * edge);
          crown = 1 + Math.floor(bh * 254); t = 12;
        }
      }
      this.type[i] = t; this.crown[i] = crown; T[i] = h + canopy; this.shotTop[i] = t === 12 ? h + canopy : h;
    }
  }
  scatter() {
    const hunt = this.hunt, R = hunt.rules || {}, rng = B.mkRng(this.seed * 7 + 3), sp = hunt.scatter || [];
    const fanOK = (x, y) => { const i = this.idx(x, y); return i >= 0 && (!this.noCanopy || this.noCanopy[i] < 90); };
    for (const rule of sp) {
      let placed = 0;
      for (let k = 0; k < rule.tries; k++) {
        const x = 8 + rng() * (SIZE - 16), y = 8 + rng() * (SIZE - 16), i = this.idx(x, y), t = this.type[i];
        if (!rule.on.includes(t)) continue;
        if (!rule.inFan && !fanOK(x, y)) continue;
        if (rule.fanOnly) { const v = this.vantages[rule.fanOnly], d = Math.hypot(x - v.x, y - v.y); if (d > 95 || d < 14 || fanOK(x, y)) continue; }
        if (rule.edge) { // only at forest edges
          let e = false; for (const [a, b] of [[6, 0], [-6, 0], [0, 6], [0, -6]]) { const j = this.idx(x + a, y + b); if (j >= 0 && this.type[j] === 12) e = true; }
          if (!e) continue;
        }
        if (!isNaN(this.water[i])) continue;
        let close = false; for (const id in this.vantages) { const v = this.vantages[id]; if (Math.hypot(x - v.x, y - v.y) < 16) close = true; }
        if (close) continue;
        const kind = pickW(rule.kinds, rng);
        this.addProp(kind, x, y, { snow: !!rule.snow, size: rule.size ? rule.size[0] + rng() * (rule.size[1] - rule.size[0]) : 1, seed: Math.floor(rng() * 1e6), facing: rng() * Math.PI * 2 });
        if (++placed >= (rule.max || 1e9)) break;
      }
    }
  }
  addProp(kind, x, y, o = {}) {
    const P = B.PROPS[kind]; if (!P) throw new Error('no prop ' + kind);
    const p = Object.assign({ kind, x, y, z: o.z !== undefined ? o.z : this.groundAt(x, y), size: 1, seed: 1, facing: 0 }, o);
    if (P.tree && !p.cols) p.cols = this.hunt.palette.crowns;
    p.r = (P.radius || 1) * p.size; p.h = (P.height || 2) * p.size;
    if (P.tree) this.trees.push(p); else this.props.push(p);
    if (P.occluders) for (const oc of P.occluders(p)) this.occluders.push(Object.assign(oc, { prop: p }));
    return p;
  }
  // ---- sampling ----
  _bil(arr, n, fx, fy) {
    const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const xa = x0 < 0 ? 0 : x0 >= n ? n - 1 : x0, ya = y0 < 0 ? 0 : y0 >= n ? n - 1 : y0, xb = xa + 1 >= n ? n - 1 : xa + 1, yb = ya + 1 >= n ? n - 1 : ya + 1;
    const a = arr[ya * n + xa], b = arr[ya * n + xb], c = arr[yb * n + xa], d = arr[yb * n + xb];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  }
  groundAt(x, y) {
    if (x >= 0 && y >= 0 && x < SIZE - CELL && y < SIZE - CELL) return this._bil(this.ground, N, x / CELL, y / CELL);
    return this._bil(this.far, NF, (x - F0) / FCELL, (y - F0) / FCELL);
  }
  topAt(x, y) {
    if (x >= 0 && y >= 0 && x < SIZE - CELL && y < SIZE - CELL) return this._bil(this.top, N, x / CELL, y / CELL);
    return this._bil(this.far, NF, (x - F0) / FCELL, (y - F0) / FCELL);
  }
  waterAt(x, y) { const i = this.idx(x, y); if (i < 0) return null; const w = this.water[i]; return isNaN(w) ? null : w; }
  typeAt(x, y) { const i = this.idx(x, y); return i < 0 ? 1 : this.type[i]; }
  normalAt(x, y) { const e = 1.5, hx = this.groundAt(x + e, y) - this.groundAt(x - e, y), hy = this.groundAt(x, y + e) - this.groundAt(x, y - e); const n = [-hx / (2 * e), -hy / (2 * e), 1], l = Math.hypot(n[0], n[1], n[2]); return [n[0] / l, n[1] / l, n[2] / l]; }
  // a ray against the top surface (canopy, corn, ground) and water: the distance along dir (unit), or null
  rayHit(o, dir, maxD, water = true, shot = false) {
    let t = .2, prev = 0, step = .4;
    const above = tt => { const x = o[0] + dir[0] * tt, y = o[1] + dir[1] * tt, z = o[2] + dir[2] * tt; let h = shot && x >= 0 && y >= 0 && x < SIZE - CELL && y < SIZE - CELL ? this._bil(this.shotTop, N, x / CELL, y / CELL) : this.topAt(x, y); if (water) { const w = this.waterAt(x, y); if (w !== null && w > h) h = w; } return z - h; };
    let a0 = above(0);
    if (a0 < 0) return 0;
    while (t < maxD) {
      const a = above(t);
      if (a < 0) { let lo = prev, hi = t; for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (above(m) < 0) hi = m; else lo = m; } return hi; }
      prev = t; step = Math.max(.25, Math.min(4, t * .012, a * .7 + .25)); t += step;
    }
    return null;
  }
  // ---- colour bake: ground types, light, AO, sun shadows ----
  bake() {
    const hunt = this.hunt, P = hunt.palette, s = this.seed, g = this.ground, T = this.top, W = this.water;
    const col = this.col = new Uint32Array(N * N);
    const pal = {}; for (const k in P.ground) pal[k] = E.hex(P.ground[k]);
    const typeKey = ['grass', 'grass', 'dry', 'leaf', 'dirt', 'rock', 'mud', 'mud', 'snow', 'corn', 'stubble', 'reeds', 'canopy', 'talus', 'burn'];
    const sun = hunt.sun, se = sun.elevation * B.DEG, sb = sun.azimuth * B.DEG;
    const L = [Math.cos(se) * Math.cos(sb), Math.cos(se) * Math.sin(sb), Math.sin(se)];
    const sunC = E.hex(sun.color), amb = E.hex(sun.ambient);
    const crownCols = (P.crowns || [P.ground.canopy]).map(E.hex);
    for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) {
      const i = cy * N + cx, x = cx * CELL, y = cy * CELL, t = this.type[i];
      let base = pal[typeKey[t]] || pal.grass;
      if (t === 12) base = crownCols[this.crown[i] % crownCols.length];
      const n = vnoise(x / 7, y / 7, s + 3) * .6 + vnoise(x / 2.3, y / 2.3, s + 4) * .4;
      const tint = .86 + n * .28;
      // normal from top
      const hx = T[Math.min(N - 1, cx + 1) + cy * N] - T[Math.max(0, cx - 1) + cy * N], hy = T[cx + Math.min(N - 1, cy + 1) * N] - T[cx + Math.max(0, cy - 1) * N];
      const nx = -hx / (2 * CELL), ny = -hy / (2 * CELL), nl = Math.hypot(nx, ny, 1);
      let lam = Math.max(0, (nx * L[0] + ny * L[1] + L[2]) / nl);
      // shadow: march toward the sun
      let sh = 1; const h0 = T[i] + .3;
      const cb = Math.cos(sb), sbn = Math.sin(sb), ts = Math.tan(se);
      for (let d = 3; d < 160; d += d < 20 ? 2 : 5) { const hh = this.topAt(x + cb * d, y + sbn * d); if (hh > h0 + d * ts) { sh = .35; break; } }
      // ambient occlusion: higher than the blurred neighbourhood = open
      let avg = 0; for (const [a, b] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) { const q = B.clamp(cy + b, 0, N - 1) * N + B.clamp(cx + a, 0, N - 1); avg += T[q]; } avg /= 4;
      const ao = B.clamp(1 + (T[i] - avg) * .08, .65, 1.1);
      const li = lam * sh;
      let r = base[0] * tint, gg = base[1] * tint, b = base[2] * tint;
      r = r * (amb[0] / 255 * .72 + sunC[0] / 255 * li * .6) * ao; gg = gg * (amb[1] / 255 * .72 + sunC[1] / 255 * li * .6) * ao; b = b * (amb[2] / 255 * .72 + sunC[2] / 255 * li * .6) * ao;
      if (t === 9) { const row = Math.sin((x * .7 + y * .7) * 2.2) > .2 ? 1.12 : .8; r *= row; gg *= row; b *= row; }
      if (t === 6 && !isNaN(W[i])) { r *= .7; gg *= .7; b *= .75; }
      col[i] = pack(r, gg, b);
    }
    // far ring
    const fg = pal.far ? pal.far : pal.grass;
    for (let fy = 0; fy < NF; fy++) for (let fx = 0; fx < NF; fx++) {
      const i = fy * NF + fx, h = this.far[i], x = F0 + fx * FCELL, y = F0 + fy * FCELL;
      const hx = this.far[Math.min(NF - 1, fx + 1) + fy * NF] - this.far[Math.max(0, fx - 1) + fy * NF], hy = this.far[fx + Math.min(NF - 1, fy + 1) * NF] - this.far[fx + Math.max(0, fy - 1) * NF];
      const nx = -hx / (2 * FCELL), ny = -hy / (2 * FCELL), nl = Math.hypot(nx, ny, 1), lam = Math.max(0, (nx * L[0] + ny * L[1] + L[2]) / nl);
      const forest = fbm(x / 160, y / 160, s + 41, 3) > -.05;
      let c = forest ? crownCols[Math.floor(vnoise(x / 30, y / 30, s) * crownCols.length * .999)] : fg;
      if (hunt.rules && hunt.rules.snowAbove !== undefined && h > hunt.rules.snowAbove) c = pal.snow;
      if (hunt.rules && hunt.rules.snowAll && !forest) c = pal.snow;
      const k = .55 + lam * .6, tint = .9 + vnoise(x / 60, y / 60, s) * .2;
      this.farCol[i] = pack(c[0] * k * tint, c[1] * k * tint, c[2] * k * tint);
    }
  }
  colorAt(x, y) {   // bilinear colour, packed
    if (x >= 0 && y >= 0 && x < SIZE - CELL && y < SIZE - CELL) return bilCol(this.col, N, x / CELL, y / CELL);
    return bilCol(this.farCol, NF, (x - F0) / FCELL, (y - F0) / FCELL);
  }
}
function pack(r, g, b) { r = r < 0 ? 0 : r > 255 ? 255 : r | 0; g = g < 0 ? 0 : g > 255 ? 255 : g | 0; b = b < 0 ? 0 : b > 255 ? 255 : b | 0; return (255 << 24 | b << 16 | g << 8 | r) >>> 0; }
B.pack = pack;
function bilCol(arr, n, fx, fy) {
  let x0 = Math.floor(fx), y0 = Math.floor(fy); const tx = fx - x0, ty = fy - y0;
  if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0; if (x0 > n - 2) x0 = n - 2; if (y0 > n - 2) y0 = n - 2;
  const a = arr[y0 * n + x0], b = arr[y0 * n + x0 + 1], c = arr[(y0 + 1) * n + x0], d = arr[(y0 + 1) * n + x0 + 1];
  const w0 = (1 - tx) * (1 - ty), w1 = tx * (1 - ty), w2 = (1 - tx) * ty, w3 = tx * ty;
  const r = (a & 255) * w0 + (b & 255) * w1 + (c & 255) * w2 + (d & 255) * w3;
  const g = (a >> 8 & 255) * w0 + (b >> 8 & 255) * w1 + (c >> 8 & 255) * w2 + (d >> 8 & 255) * w3;
  const bl = (a >> 16 & 255) * w0 + (b >> 16 & 255) * w1 + (c >> 16 & 255) * w2 + (d >> 16 & 255) * w3;
  return (255 << 24 | (bl | 0) << 16 | (g | 0) << 8 | (r | 0)) >>> 0;
}
function pickW(list, rng) { let tot = 0; for (const [, w] of list) tot += w; let r = rng() * tot; for (const [k, w] of list) { r -= w; if (r <= 0) return k; } return list[0][0]; }
B.pickW = pickW;
B.Heightfield = Heightfield;

// hunts' terrain cache (at most two at once)
const cache = new Map();
B.world = null;
B.loadWorld = (huntId, o = {}) => {
  if (cache.has(huntId)) { B.world = cache.get(huntId); return B.world; }
  const hunt = B.get('hunt', huntId);
  const w = new Heightfield(hunt, { noColor: o.noColor !== undefined ? o.noColor : !B.HAS_DOM });
  w.id = huntId; cache.set(huntId, w);
  while (cache.size > 2) cache.delete(cache.keys().next().value);
  B.world = w; return w;
};
B.dropWorlds = () => cache.clear();
})();
