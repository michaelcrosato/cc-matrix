/* 30-world: a level (the JSON the campaign and the Workshop share) becomes a World: the physics TileMap (the hero swims
 * in its water), the navigation TileMap (water blocked for walkers), a baked light map, hide spots, grapple anchors,
 * halls with roof caps, lit props and lights, zones. Queries: lightAt, isHide, isDeep, anchorsNear, zoneAt. */
const AMBIENT = { dusk: .45, night: .22, rain: .18, festival: .3 };
const SOLID_CH = new Set(Object.keys(B.WALLS));
class World {
  constructor(spec) {
    this.spec = spec; this.rows = spec.rows.map(r => r.padEnd(spec.size[0], '.').slice(0, spec.size[0]));
    while (this.rows.length < spec.size[1]) this.rows.push('.'.repeat(spec.size[0]));
    this.w = spec.size[0]; this.h = spec.size[1]; this.T = CELL;
    const mk = (o = {}) => new E.TileMap(Object.assign({ rows: this.rows.slice(), legend: B.LEGEND, types: B.TYPES }, o));
    this.map = mk({ floorTex: B.floorTex, ao: 5, outside: '#0c0a10' });
    this.nav = mk({ block: ['deep'], floorTex: () => [0, 0, 0] });
    this.props = []; this.dynLights = [];
    this.lights = (spec.lights || []).map(l => ({ x: cc(l.at[0]), y: cc(l.at[1]), z: l.z || 18, r: (l.r || 64), i: l.i === undefined ? .9 : l.i, color: l.color || '#ffb060', kind: l.kind || null, flick: crand() * 10 }));
    for (const l of this.lights) if (l.kind) this.props.push({ id: l.kind, x: l.x, y: l.y, o: {} });
    for (const p of spec.props || []) { const [id, cx, cy, o = {}] = p; this.props.push({ id, x: cc(cx), y: cc(cy), o }); }
    for (const p of this.props) { const sp = E.SHAPES[p.id]; if (!sp || p.o.solid === false || ['strawMat', 'steppingStone'].includes(p.id)) continue; try { this.map.solid(p.id, p.x, p.y, 0, { facing: p.o.facing || 0 }); this.nav.solid(p.id, p.x, p.y, 0, { facing: p.o.facing || 0 }); this.nav.block(Math.floor(p.x / CELL), Math.floor(p.y / CELL), true); } catch (e) { /* a shape the map can't make solid stays decoration */ } }
    // bamboo groves get stalks scattered by cell (seeded), grass tufts in tall grass
    this.decor = []; const sr = E.rng(hashStr(spec.id || 'lvl'));
    for (let cy = 0; cy < this.h; cy++) for (let cx = 0; cx < this.w; cx++) {
      const ch = this.rows[cy][cx];
      if (ch === '"' && sr() < .45) this.decor.push({ k: 'bamboo', x: (cx + .2 + sr() * .6) * CELL, y: (cy + .2 + sr() * .6) * CELL });
      if (ch === ',' && sr() < .7) this.decor.push({ k: 'grass', x: (cx + .2 + sr() * .6) * CELL, y: (cy + .2 + sr() * .6) * CELL });
    }
    this.ambient = AMBIENT[spec.time] !== undefined ? AMBIENT[spec.time] : .22;
    this.zones = (spec.zones || []).map(z => Object.assign({}, z));
    this._components(); this.bake();
  }
  ch(cx, cy) { return cx < 0 || cy < 0 || cx >= this.w || cy >= this.h ? '#' : this.rows[cy][cx]; }
  /* connected building blocks (roof caps) and halls (H perimeters with their interiors) */
  _components() {
    const seen = new Uint8Array(this.w * this.h); this.blocks = []; this.halls = [];
    for (let cy = 0; cy < this.h; cy++) for (let cx = 0; cx < this.w; cx++) {
      const ch = this.ch(cx, cy), i = cy * this.w + cx; if (seen[i] || !'ABCDSTGKM'.includes(ch)) continue;
      let x0 = cx, y0 = cy, x1 = cx, y1 = cy; const st = [[cx, cy]]; seen[i] = 1;
      while (st.length) { const [x, y] = st.pop(); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue; const j = ny * this.w + nx; if (!seen[j] && this.ch(nx, ny) === ch) { seen[j] = 1; st.push([nx, ny]); } } }
      this.blocks.push({ ch, x0, y0, x1, y1, h: B.WALLS[ch].h });
    }
    seen.fill(0);
    for (let cy = 0; cy < this.h; cy++) for (let cx = 0; cx < this.w; cx++) {
      const i = cy * this.w + cx; if (seen[i] || !(this.ch(cx, cy) === 'H' || this.ch(cx, cy) === 'd')) continue;
      let x0 = cx, y0 = cy, x1 = cx, y1 = cy; const st = [[cx, cy]]; seen[i] = 1;
      while (st.length) { const [x, y] = st.pop(); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue; const j = ny * this.w + nx, c2 = this.ch(nx, ny); if (!seen[j] && (c2 === 'H' || c2 === 'd')) { seen[j] = 1; st.push([nx, ny]); } } }
      if (x1 - x0 >= 2 && y1 - y0 >= 2) this.halls.push({ x0, y0, x1, y1, fade: 1 });
    }
  }
  /* the light map: half cells (8 units) of ambient moon + every light with its line of sight */
  bake() {
    const S = 8, W = Math.ceil(this.w * CELL / S), Hh = Math.ceil(this.h * CELL / S), amb = this.ambient, lr = B.T('lanternRadius');
    this.lmW = W; this.lmH = Hh; this.lm = new Float32Array(W * Hh).fill(amb);
    for (const l of this.lights) {
      const R = l.r * lr, gx0 = Math.max(0, Math.floor((l.x - R) / S)), gx1 = Math.min(W - 1, Math.ceil((l.x + R) / S)), gy0 = Math.max(0, Math.floor((l.y - R) / S)), gy1 = Math.min(Hh - 1, Math.ceil((l.y + R) / S));
      for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
        const x = (gx + .5) * S, y = (gy + .5) * S, d = Math.hypot(x - l.x, y - l.y); if (d >= R) continue;
        const k = 1 - d / R; let los = true; if (d > 10) { try { los = this.map.los(l.x, l.y, x, y); } catch (e) { los = true; } }
        if (los) this.lm[gy * W + gx] += l.i * k * k;
      }
    }
    for (let i = 0; i < this.lm.length; i++) this.lm[i] = clamp(this.lm[i], 0, 1);
    this._bakedLr = lr;
  }
  lightAt(x, y) {
    if (this._bakedLr !== B.T('lanternRadius')) this.bake();
    const gx = clamp(Math.floor(x / 8), 0, this.lmW - 1), gy = clamp(Math.floor(y / 8), 0, this.lmH - 1); let L = this.lm[gy * this.lmW + gx];
    for (const l of this.dynLights) { const d = Math.hypot(x - l.x, y - l.y); if (d < l.r) { const k = 1 - d / l.r; L += l.i * k * k; } }
    if (B.mission && B.mission.flashT > 0) L = Math.max(L, .95);
    return clamp(L, 0, 1);
  }
  floorAt(x, y) { return this.map.floorAt(x, y); }
  heightAt(x, y) { return this.map.height(Math.floor(x / CELL), Math.floor(y / CELL)); }
  isDeep(x, y) { return this.floorAt(x, y) === 'deep' && this.heightAt(x, y) === 0; }
  isShallow(x, y) { return this.floorAt(x, y) === 'shallow'; }
  isHide(x, y) { const f = this.floorAt(x, y); return f === 'grass' || f === 'bamboo'; }
  inHall(x, y) { const cx = x / CELL, cy = y / CELL; return this.halls.find(h => cx > h.x0 && cx < h.x1 + 1 && cy > h.y0 && cy < h.y1 + 1) || null; }
  zoneAt(x, y) { const cx = x / CELL, cy = y / CELL; return this.zones.find(z => cx >= z.rect[0] && cy >= z.rect[1] && cx <= z.rect[2] + 1 && cy <= z.rect[3] + 1) || null; }
  set(cx, cy, ch) {   // change a cell in both maps (open a gate)
    const row = this.rows[cy]; this.rows[cy] = row.slice(0, cx) + ch + row.slice(cx + 1);
    const v = B.LEGEND[ch], id = typeof v === 'number' ? v : 0;
    for (const m of [this.map, this.nav]) { m.set(cx, cy, id); if (typeof v === 'object' && m.setFloor) m.setFloor(cx, cy, v.floor, m === this.nav && v.floor === 'deep'); }
  }
  /* grapple anchors near a body: the edges of tops it can be pulled onto, plus the level's swing anchors */
  anchorsNear(b, range, rise) {
    const out = [], T = CELL, z = b.z || 0, c0x = Math.floor((b.x - range) / T), c1x = Math.floor((b.x + range) / T), c0y = Math.floor((b.y - range) / T), c1y = Math.floor((b.y + range) / T);
    for (let cy = Math.max(0, c0y); cy <= Math.min(this.h - 1, c1y); cy++) for (let cx = Math.max(0, c0x); cx <= Math.min(this.w - 1, c1x); cx++) {
      const id = this.map.cell(cx, cy); if (id <= 0) continue;
      const t = B.TYPES[id], top = t.h; if (t.hall || top < z + 16 || top > z + rise) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nb = this.map.cell(cx + dx, cy + dy), nh = nb > 0 ? B.TYPES[nb].h : 0; if (nh >= top - 8) continue;
        const ex = (cx + .5 + dx * .5) * T, ey = (cy + .5 + dy * .5) * T, d = Math.hypot(ex - b.x, ey - b.y); if (d > range || d < 6) continue;
        if ((ex - b.x) * dx + (ey - b.y) * dy > 0) continue;   // the face must look toward the body
        const lx = ex - dx * 6, ly = ey - dy * 6; if (!this.map.standable(lx, ly, top, 4)) continue;
        let clear = true; try { const ry = this.map.ray({ x: b.x, y: b.y, z }, { x: ex + dx * 2, y: ey + dy * 2, z: top - 1 }, { eye: 28, target: 0 }); clear = ry.clear || ry.t > .9; } catch (e) { clear = true; }
        if (!clear) continue;
        out.push({ x: ex, y: ey, z: top, lx, ly, lz: top, d, kind: 'edge' });
      }
    }
    for (const a of this.spec.anchors || []) { const x = cc(a[0]), y = cc(a[1]), az = a[2] || 40, d = Math.hypot(x - b.x, y - b.y); if (d < range && d > 10 && az > z + 10) out.push({ x, y, z: az, lx: x, ly: y, lz: az, d, kind: 'swing' }); }
    return out;
  }
}
B.World = World;
B.levelSpec = id => { const s = get('level', id); if (!s) throw new Error('no level ' + id); return JSON.parse(JSON.stringify(s)); };

/* ---- drawing the world: floor, walls, roof caps, hall roofs, props, decor, lights ---- */
B.drawWorld = (r, W, o = {}) => {
  const G = B.game, hero = o.hero;
  W.map.drawFloor(r); W.map.queueWalls(r);
  for (const d of W.decor) {
    const s = r.w(d.x, d.y, 0); if (s[0] < -30 || s[0] > r.W + 30 || s[1] < -60 || s[1] > r.H + 30) continue;
    if (d.k === 'bamboo') r.shape('bambooClump', d.x, d.y, 0, { facing: (d.x * 7 + d.y) % 6, hides: false }); else r.prop('grass', d.x, d.y, 0, { size: 1.2 });
  }
  for (const p of W.props) {
    const s = r.w(p.x, p.y, 0); if (s[0] < -50 || s[0] > r.W + 50 || s[1] < -90 || s[1] > r.H + 40) continue;
    if (E.SHAPES[p.id]) r.shape(p.id, p.x, p.y, 0, Object.assign({ facing: p.o.facing || 0 }, p.o.scale ? { scale: p.o.scale } : {}));
    else r.prop(p.id, p.x, p.y, 0, Object.assign({ size: 1.3 }, p.o.color ? { color: p.o.color } : {}));
  }
  const t = G.time;
  for (const l of W.lights) { const f = 1 + Math.sin(t * 9 + l.flick) * .05 + Math.sin(t * 23 + l.flick * 2) * .03; G.lights.add(l.x, l.y, l.z, l.r * B.T('lanternRadius') * 1.15, l.i * f, { color: l.color }); }
  for (const l of W.dynLights) G.lights.add(l.x, l.y, l.z || 16, l.r, l.i, { color: l.color || '#ffb060' });
  // kawara roof caps: eave lips, hips and a ridge beam on each building block
  for (const b of W.blocks) {
    if (b.ch === 'T') continue;
    const x0 = b.x0 * CELL, y0 = b.y0 * CELL, x1 = (b.x1 + 1) * CELL, y1 = (b.y1 + 1) * CELL, h = b.h, cxm = (x0 + x1) / 2, cym = (y0 + y1) / 2;
    const s = r.w(cxm, cym, h); if (s[0] < -120 || s[0] > r.W + 120 || s[1] < -120 || s[1] > r.H + 120) continue;
    const alongX = (x1 - x0) >= (y1 - y0), inset = Math.min(x1 - x0, y1 - y0) / 2 - 2;
    r.queue(cxm, cym, h, g => {
      const P = (x, y, z) => r.w(x, y, z), rz = h + 1;
      const ra = alongX ? P(x0 + inset, cym, rz) : P(cxm, y0 + inset, rz), rb = alongX ? P(x1 - inset, cym, rz) : P(cxm, y1 - inset, rz);
      const c = [P(x0, y0, h), P(x1, y0, h), P(x1, y1, h), P(x0, y1, h)];
      for (const [i, end] of [[0, ra], [3, ra], [1, rb], [2, rb]]) { const q = alongX ? end : (i < 2 ? ra : rb); px.line(g, c[i][0], c[i][1], q[0], q[1], '#2a3040'); }
      px.line(g, ra[0], ra[1], rb[0], rb[1], '#e8e4dc', 2); px.line(g, ra[0], ra[1] + 1, rb[0], rb[1] + 1, '#3a4050');
      px.disc(g, ra[0], ra[1], 1.5, '#2a3040'); px.disc(g, rb[0], rb[1], 1.5, '#2a3040');
      for (let k = 0; k < 4; k++) { const a = c[k], bq = c[(k + 1) % 4]; px.line(g, a[0], a[1] + 1, bq[0], bq[1] + 1, '#1e2230'); }
      if (b.ch === 'M') { const sh = P(alongX ? x0 + inset : cxm, alongX ? cym : y0 + inset, rz + 4), sh2 = P(alongX ? x1 - inset : cxm, alongX ? cym : y1 - inset, rz + 4); for (const q of [sh, sh2]) { px.disc(g, q[0], q[1], 2, '#e8b04a'); px.dot(g, q[0], q[1] - 3, '#ffe080'); } }
    }, { footprint: [x0, y0, x1, y1] });
  }
  // halls: a roof over the interior, faded while the hero is inside
  for (const hl of W.halls) {
    const inside = hero && hero.z < 30 && W.inHall(hero.x, hero.y) === hl; hl.fade = approach(hl.fade, inside ? 0 : 1, G.dt ? G.dt * 4 : .05);
    if (hl.fade < .05) continue;
    const x0 = hl.x0 * CELL, y0 = hl.y0 * CELL, x1 = (hl.x1 + 1) * CELL, y1 = (hl.y1 + 1) * CELL, h = 40, cym = (y0 + y1) / 2, cxm = (x0 + x1) / 2;
    r.queue(cxm, cym, h + 1, g => {
      const P = (x, y, z) => r.w(x, y, z), c = [P(x0 - 3, y0 - 3, h), P(x1 + 3, y0 - 3, h), P(x1 + 3, y1 + 3, h), P(x0 - 3, y1 + 3, h)], alongX = x1 - x0 >= y1 - y0;
      const ra = alongX ? P(x0 + 10, cym, h + 10) : P(cxm, y0 + 10, h + 10), rb = alongX ? P(x1 - 10, cym, h + 10) : P(cxm, y1 - 10, h + 10);
      const polys = alongX ? [[c[0], c[1], rb, ra], [c[3], c[2], rb, ra], [c[0], c[3], ra], [c[1], c[2], rb]] : [[c[0], c[3], rb, ra], [c[1], c[2], rb, ra], [c[0], c[1], ra], [c[3], c[2], rb]];
      const cols = ['#4a5468', '#3a4458', '#525c70', '#343c50'];
      polys.forEach((p, i) => hl.fade > .95 ? px.poly(g, p, cols[i]) : px.polyDither(g, p, cols[i], hl.fade, r.ix, r.iy));
      if (hl.fade > .95) { px.line(g, ra[0], ra[1], rb[0], rb[1], '#e8e4dc', 2); for (let k = 0; k < 4; k++) { const a = c[k], bq = c[(k + 1) % 4]; px.line(g, a[0], a[1], bq[0], bq[1], '#1e2230'); } }
    }, { footprint: [x0, y0, x1 + 1, y1 + 1], hides: true });
  }
  // water: glints and drifting rings (cosmetic)
  if (!W._water) { W._water = []; for (let cy = 0; cy < W.h; cy++) for (let cx = 0; cx < W.w; cx++) if (W.ch(cx, cy) === '~' && (cx * 13 + cy * 7) % 5 === 0) W._water.push([cc(cx), cc(cy), (cx * 3 + cy) % 7]); }
  for (const [x, y, k] of W._water) {
    const ph = (t * .6 + k) % 7; if (ph > 1.2) continue; const s = r.w(x, y, 0); if (s[0] < 0 || s[0] > r.W || s[1] < 0 || s[1] > r.H) continue;
    r.decal(g => { const q = r.w(x + Math.sin(k) * 4, y, 0); px.dot(g, q[0], q[1], '#8ab8d8'); if (ph > .4) { px.dot(g, q[0] - 2, q[1], '#4a7aa0'); px.dot(g, q[0] + 2, q[1], '#4a7aa0'); } });
  }
};
