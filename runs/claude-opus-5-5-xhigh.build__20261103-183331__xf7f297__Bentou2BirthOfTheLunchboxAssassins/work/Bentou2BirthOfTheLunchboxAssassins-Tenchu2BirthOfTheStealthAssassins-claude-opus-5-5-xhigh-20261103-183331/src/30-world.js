/* ---- WORLD: a level's JSON (the campaign and the Workshop share it exactly) becomes a TileMap for bodies and sight, a
 * nav map where deep water blocks (guards and hounds never swim), a baked light map, hiding spots, water, zones,
 * props, lights, building blocks (for the roof caps) and halls (whose roofs fade while the hero is inside) ---- */
const AMBIENT = { dusk: .45, night: .22, rain: .18, festival: .3 };
const SURF_NOISE = { earth: 1, grass: .8, bamboo: .9, gravel: 1.6, boards: 1.2, tatami: .6, paving: 1, water: .5, shallow: 1.4, door: 1.2, roof: 1.05 };
const SURF_STEP = { earth: 'stepDirt', grass: 'stepTatami', bamboo: 'stepTatami', gravel: 'stepGravel', boards: 'stepWood', tatami: 'stepTatami', paving: 'stepDirt', shallow: 'splash', door: 'stepWood', roof: 'stepWood' };
const LIGHT_KIND = { stoneLantern: { color: '#ffb060', z: 15 }, paperLantern: { color: '#ff9a50', z: 21 }, torch: { color: '#ffa040', z: 22 }, brazier: { color: '#ff8a30', z: 12 }, lanternString: { color: '#ff9a50', z: 26 }, window: { color: '#ffc880', z: 14 }, moonpool: { color: '#8a9ad8', z: 30 }, none: { color: '#ffb060', z: 18 } };
const FLOW_CACHE_MAX = 24;
class World {
  constructor(L) {
    this.L = L; this.id = L.id; this.w = L.size[0]; this.h = L.size[1];
    const rows = L.rows.map(r => (r + '#'.repeat(this.w)).slice(0, this.w));
    while (rows.length < this.h) rows.push('#'.repeat(this.w));
    this.rows = rows.slice(0, this.h);
    const legend = {}, navLegend = {}, types = {};
    for (const ch in WALLTYPES) { const t = WALLTYPES[ch]; legend[ch] = t.id; navLegend[ch] = t.id; types[t.id] = Object.assign({}, t); }
    for (const ch in FLOORCH) { if (ch === '.') continue; legend[ch] = { floor: FLOORCH[ch] }; navLegend[ch] = { floor: FLOORCH[ch], block: ch === '~' }; }
    this.types = types;
    this.map = new E.TileMap({ rows: this.rows, legend, types, floorTex: (x, y, tag) => floorTex(x, y, tag || 'earth'), ao: 4, outside: L.bigMoon ? false : '#08080e' });
    this.map.shimmer = true;
    this.nav = new E.TileMap({ rows: this.rows, legend: navLegend, types });
    this.time = L.time || 'night';
    this.moon = AMBIENT[this.time] || .22;
    this._findBlocks(); this._findHalls();
    this.zones = (L.zones || []).map(z => Object.assign({}, z));
    this.lights = (L.lights || []).map(l => Object.assign({ z: (LIGHT_KIND[l.kind] || LIGHT_KIND.none).z, r: 64, i: .9, color: (LIGHT_KIND[l.kind] || LIGHT_KIND.none).color }, l, { x: cellC(l.at[0]), y: cellC(l.at[1]) }));
    this.props = [];
    for (const l of this.lights) if (l.kind && l.kind !== 'none' && l.kind !== 'window' && l.kind !== 'moonpool') this.props.push({ id: l.kind, x: l.x, y: l.y, z: this.map.groundAt(l.x, l.y), o: { facing: l.facing || 0 }, core: l.kind === 'torch' || l.kind === 'brazier' });
    for (const p of L.props || []) { const [id, cx, cy, o] = p; const x = typeof cx === 'number' ? cellC(cx) : 0, y = cellC(cy); this.props.push({ id, x: o && o.dx ? x + o.dx : x, y: o && o.dy ? y + o.dy : y, z: (o && o.z !== undefined) ? o.z : this.map.groundAt(x, y), o: Object.assign({}, o || {}), core: !SH[id] && E.PROPS && E.PROPS.includes(id) }); }
    // bamboo groves and tall grass dress themselves (seeded by cell, so every copy is the same)
    for (let cy = 0; cy < this.h; cy++) for (let cx = 0; cx < this.w; cx++) {
      const ch = this.rows[cy][cx], hsh = ((cx * 73856093) ^ (cy * 19349663)) >>> 0;
      if (ch === '"' && (cx + cy) % 2 === 0) this.props.push({ id: 'bamboo', x: cellC(cx) + (hsh % 7) - 3, y: cellC(cy) + ((hsh >> 3) % 7) - 3, z: 0, o: { params: { seed: hsh % 97, n: 3 + hsh % 3 } }, deco: true });
      if (ch === ',' && hsh % 3 === 0) this.props.push({ id: 'grass', x: cellC(cx) + (hsh % 9) - 4, y: cellC(cy) + ((hsh >> 4) % 9) - 4, z: 0, o: { params: { h: 9, n: 7 } }, deco: true, grass: true });
    }
    for (const p of this.props) if (p.o.solid) this.map.solid(p.id, p.x, p.y, p.z, p.o);
    this.anchors = (L.anchors || []).map(([cx, cy, z, lx, ly]) => ({ x: cellC(cx), y: cellC(cy), z, tree: true, land: lx !== undefined ? { x: cellC(lx), y: cellC(ly) } : null }));
    this.dyn = []; this.dynStep = []; this.decals = []; this.flash = 0; this.flows = new Map(); this.roofAlpha = {};
    this.bake();
  }
  /** building blocks: connected cells of one building letter (their bounding boxes carry the roof caps) */
  _findBlocks() {
    this.blocks = []; const seen = new Set();
    for (let cy = 0; cy < this.h; cy++) for (let cx = 0; cx < this.w; cx++) {
      const ch = this.rows[cy][cx]; if (!BUILDINGS.includes(ch) || seen.has(cy * this.w + cx)) continue;
      let x0 = cx, x1 = cx, y0 = cy, y1 = cy; const st = [[cx, cy]]; seen.add(cy * this.w + cx);
      while (st.length) { const [a, b] = st.pop(); x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = a + dx, ny = b + dy; if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue; const k = ny * this.w + nx; if (!seen.has(k) && this.rows[ny][nx] === ch) { seen.add(k); st.push([nx, ny]); } } }
      const t = WALLTYPES[ch];
      this.blocks.push({ ch, cx0: x0, cy0: y0, cx1: x1, cy1: y1, x0: x0 * T16, y0: y0 * T16, x1: (x1 + 1) * T16, y1: (y1 + 1) * T16, h: t.h, shachi: ch === 'M', ridge: ch === 'C' || ch === 'G' || ch === 'K' || ch === 'M' ? '#e8e0d0' : '#c8c0b0' });
    }
    // keep tiers stack: a lower tier's cap is covered by the tier above, so only caps not under a higher building draw
    this.caps = this.blocks.filter(b => b.ch !== 'T' && !this.blocks.some(o => o !== b && o.h > b.h && o.x0 <= b.x0 && o.x1 >= b.x1 && o.y0 <= b.y0 && o.y1 >= b.y1));
    for (const b of this.caps) b.ring = this.blocks.some(o => o !== b && o.h > b.h && o.x0 >= b.x0 && o.x1 <= b.x1 && o.y0 >= b.y0 && o.y1 <= b.y1);   // a keep tier with a tier above: an eave ring, no hips
  }
  /** halls: the bounding boxes of connected hall-wall (H) cells, with their tatami interiors */
  _findHalls() {
    this.halls = []; const seen = new Set();
    for (let cy = 0; cy < this.h; cy++) for (let cx = 0; cx < this.w; cx++) {
      const ch = this.rows[cy][cx]; if (ch !== 'H' || seen.has(cy * this.w + cx)) continue;
      let x0 = cx, x1 = cx, y0 = cy, y1 = cy; const st = [[cx, cy]]; seen.add(cy * this.w + cx);
      while (st.length) { const [a, b] = st.pop(); x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const nx = a + dx, ny = b + dy; if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue; const k = ny * this.w + nx; const c2 = this.rows[ny][nx]; if (!seen.has(k) && (c2 === 'H' || c2 === 'd') ) { seen.add(k); st.push([nx, ny]); } } }
      if (x1 - x0 >= 2 && y1 - y0 >= 2) this.halls.push({ i: this.halls.length, cx0: x0, cy0: y0, cx1: x1, cy1: y1, x0: x0 * T16, y0: y0 * T16, x1: (x1 + 1) * T16, y1: (y1 + 1) * T16, h: 40 });
    }
  }
  hallAt(x, y) { for (const h of this.halls) if (x > h.x0 + 4 && x < h.x1 - 4 && y > h.y0 + 4 && y < h.y1 - 4) return h; return null; }
  /** the light map: half cells, ambient moon plus each light's falloff where it can reach (map.ray from the flame) */
  bake() {
    const S = 8, gw = this.w * 2, gh = this.h * 2, G = this.light = new Float32Array(gw * gh), amb = this.moon, lr = T('lanternRadius');
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) { const top = this.map.height(gx >> 1, gy >> 1); G[gy * gw + gx] = amb + (top > 2 && top < 1e8 ? .1 : 0); }
    for (const l of this.lights) {
      const R = l.r * lr, lz = this.map.groundAt(l.x, l.y) + l.z;
      for (let gy = Math.max(0, Math.floor((l.y - R) / S)); gy <= Math.min(gh - 1, Math.floor((l.y + R) / S)); gy++)
        for (let gx = Math.max(0, Math.floor((l.x - R) / S)); gx <= Math.min(gw - 1, Math.floor((l.x + R) / S)); gx++) {
          const x = gx * S + S / 2, y = gy * S + S / 2, d = Math.hypot(x - l.x, y - l.y); if (d >= R) continue;
          const top = this.map.height(gx >> 1, gy >> 1), z = (top > 1e8 ? 0 : top) + 3;
          if (d > 10 && !this.map.ray({ x: l.x, y: l.y, z: lz }, { x, y, z }).clear) continue;
          G[gy * gw + gx] += l.i * (1 - d / R) * (1 - d / R);
        }
    }
    for (let i = 0; i < G.length; i++) G[i] = clamp(G[i], 0, 1);
    this._lr = lr; this._amb = T('ambientNight');
  }
  /** the light at a point (0..1): the baked map plus dynamic lights (hand lanterns, fire) and lightning */
  lightAt(x, y, z = 0) {
    if (Math.abs(this._lr - T('lanternRadius')) > .001) this.bake();
    const gw = this.w * 2, gx = clamp(Math.floor(x / 8), 0, gw - 1), gy = clamp(Math.floor(y / 8), 0, this.h * 2 - 1);
    let L = this.light[gy * gw + gx];
    for (const list of [this.dyn, this.dynStep]) for (const d of list) { const dd = Math.hypot(x - d.x, y - d.y); if (dd < d.r && (dd < 12 || this.map.los(d.x, d.y, x, y))) L += d.i * (1 - dd / d.r) * (1 - dd / d.r); }
    if (this.flash > 0) L = Math.max(L, .95);
    return clamp(L, 0, 1);
  }
  floorAt(x, y) { return this.map.floorAt(x, y) || 'earth'; }
  isDeep(x, y, z = 0) { return z < 3 && this.map.floorAt(x, y) === 'water' && this.map.heightAt(x, y) === 0; }
  isShallow(x, y, z = 0) { return z < 3 && this.map.floorAt(x, y) === 'shallow'; }
  isHide(x, y, z = 0) { const f = this.map.floorAt(x, y); return z < 3 && (f === 'grass' || f === 'bamboo'); }
  /** the surface under a body: its floor tag, or 'roof' up on a building */
  surface(x, y, z) { if (z > 3) return 'roof'; return this.floorAt(x, y); }
  zoneAt(x, y) { const cx = toCell(x), cy = toCell(y); return this.zones.find(z => cx >= z.rect[0] && cx <= z.rect[2] && cy >= z.rect[1] && cy <= z.rect[3]) || null; }
  /** change cells at runtime (a gate opens): both maps, and the light map again */
  setCells(cx, cy, w, h, ch) {
    for (let y = cy; y < cy + h; y++) for (let x = cx; x < cx + w; x++) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
      const id = WALLTYPES[ch] ? WALLTYPES[ch].id : 0; this.map.set(x, y, id); this.nav.set(x, y, id);
      const fl = FLOORCH[ch]; if (!WALLTYPES[ch]) { this.map.setFloor(x, y, fl === 'earth' ? null : fl || null, false); this.nav.setFloor(x, y, fl === 'earth' ? null : fl || null, ch === '~'); }
      this.rows[y] = this.rows[y].slice(0, x) + ch + this.rows[y].slice(x + 1);
    }
    this.map.floors = {}; this.bake();
  }
  /** a shared flow field toward a goal cell (LRU of 24 per world); kind: 'walk' | 'ninja' | 'hound' */
  flow(tx, ty, kind = 'walk') {
    const cx = toCell(tx), cy = toCell(ty), key = cx + ',' + cy + ',' + kind;
    let f = this.flows.get(key);
    if (f) { this.flows.delete(key); this.flows.set(key, f); }
    else {
      f = new E.FlowField(this.nav, kind === 'ninja' ? { climb: 56, drop: 56, jump: 60 } : kind === 'roof' ? { climb: 0, drop: 0 } : { drop: 30 });
      this.flows.set(key, f); if (this.flows.size > FLOW_CACHE_MAX) this.flows.delete(this.flows.keys().next().value);
    }
    f.update(cellC(cx), cellC(cy));
    return f;
  }
  /** a direction to walk from a body toward a goal along the nav map: { move: [dx, dy], jump } */
  steer(body, goal, kind = 'walk', speed = 1) {
    const f = this.flow(goal.x, goal.y, kind), nx = f.next(body.x, body.y), d = Math.hypot(goal.x - body.x, goal.y - body.y);
    if (d < 4) return { move: [0, 0], jump: false, arrived: true };
    let tx = nx ? nx.x : goal.x, ty = nx ? nx.y : goal.y;
    if (!nx && toCell(goal.x) === toCell(body.x) && toCell(goal.y) === toCell(body.y)) { tx = goal.x; ty = goal.y; }
    if (nx && toCell(nx.x) === toCell(goal.x) && toCell(nx.y) === toCell(goal.y)) { tx = goal.x; ty = goal.y; }
    const l = Math.hypot(tx - body.x, ty - body.y) || 1;
    const jump = !!(nx && body.onGround && (nx.kind === 'climb' || nx.kind === 'jump') && nx.edge < (body.r || 5) + 4);
    return { move: [(tx - body.x) / l * speed, (ty - body.y) / l * speed], jump, arrived: false, reach: f.d[toCell(body.y) * this.w + toCell(body.x)] < 1e8 };
  }
  /** can the nav map reach goal from body? */
  reachable(body, goal, kind = 'walk') { const f = this.flow(goal.x, goal.y, kind); const v = f.d[toCell(body.y) * this.w + toCell(body.x)]; return v !== undefined && v < 1e8; }
  /** draw the level: floor, walls, roof caps, props, lights, decals */
  draw(r, hero) {
    const M = this.map;
    if (this.L.bigMoon) { r.sky(['#05061a', '#10143a', '#22204a']); r.starfield && r.starfield({ count: 60, speed: 0 }); const g = r.ctx; Art.moon(g, Math.round(r.W * .78), Math.round(r.H * .2), Math.round(Math.min(r.W, r.H) * .16), '#fff4d8'); }
    M.drawFloor(r);
    for (const d of this.decals) if (d.kind === 'ink') r.decal(g => { const p = r.w(d.x, d.y, d.z || 0); px.blend(g, d.a === undefined ? .8 : d.a, 'normal', () => Art.splat(g, p[0], p[1], d.r, '#4a0a0c', d.seed)); });
    M.queueWalls(r);
    const fx = game.cam.tx || 0, fy = game.cam.ty || 0, reach = (r.W + r.H) / Math.max(.5, game.zoom) * .9;
    const M2 = B.M, on = M2 ? [M2.hero].concat(M2.guards, M2.bosses, M2.civs) : [];
    for (const b of this.caps) if (Math.abs((b.x0 + b.x1) / 2 - fx) < reach + 80 && Math.abs((b.y0 + b.y1) / 2 - fy) < reach + 80) {
      // someone standing on this roof: only its eave ring (a full cap would sort over them)
      const used = on.some(a => a && !a.sunk && a.x > b.x0 - 4 && a.x < b.x1 + 4 && a.y > b.y0 - 4 && a.y < b.y1 + 4 && Math.abs((a.z || 0) - b.h) < 6);
      Art.roofCap(r, used && !b.ring ? Object.assign({}, b, { ring: true }) : b);
    }
    const inside = hero ? this.hallAt(hero.x, hero.y) : null;
    for (const h of this.halls) {
      const a = this.roofAlpha[h.i] === undefined ? 1 : this.roofAlpha[h.i], to = inside === h || (B.Dev && B.Dev.flags.roofs) ? 0 : 1;
      this.roofAlpha[h.i] = approach(a, to, .08);
      Art.hallRoof(r, h, this.roofAlpha[h.i]);
    }
    for (const p of this.props) {
      if (Math.abs(p.x - fx) > reach || Math.abs(p.y - fy) > reach) continue;
      if (p.core) r.prop(p.id, p.x, p.y, p.z, Object.assign({ size: 1.3, light: false }, p.o));
      else if (p.id === 'nobori') Art.nobori(r, p);
      else r.shape(p.id, p.x, p.y, p.z, p.o);
    }
    const t = game.time, lr = T('lanternRadius');
    for (const l of this.lights) {
      if (Math.abs(l.x - fx) > reach * 1.3 || Math.abs(l.y - fy) > reach * 1.3) continue;
      const fl = l.kind === 'window' || l.kind === 'moonpool' ? 1 : .88 + .12 * Math.sin(t * 9 + l.x * .7) * Math.sin(t * 5.3 + l.y);
      Lt.add(l.x, l.y, this.map.groundAt(l.x, l.y) + l.z, l.r * lr * 1.15, l.i * fl, { color: l.color });
    }
    for (const list of [this.dyn, this.dynStep]) for (const d of list) Lt.add(d.x, d.y, d.z || 20, d.r * 1.1, d.i, { color: d.color || '#ffb060' });
  }
}
/** nobori: a tall festival banner on a pole, its cloth waving (drawn, not a shape) */
Art.nobori = (r, p) => {
  const c = p.o.color || '#c8342a';
  r.queue(p.x, p.y, p.z, g => {
    const P = (dx, dy, z) => r.w(p.x + dx, p.y + dy, p.z + z), t = game.time;
    const a = P(0, 0, 0), b = P(0, 0, 46); px.line(g, a[0], a[1], b[0], b[1], '#3a2a1e', 2);
    const pts = []; for (let i = 0; i <= 5; i++) { const z = 44 - i * 7, w = Math.sin(t * 2.4 - i * .7) * 1.6; pts.push([P(0, 0, z), P(7 + w, w * .6, z)]); }
    for (let i = 0; i < 5; i++) px.poly(g, [pts[i][0], pts[i][1], pts[i + 1][1], pts[i + 1][0]].map(q => [q[0], q[1]]), i % 2 ? c : E.tones(c).lt);
    const q = pts[2]; px.dot(g, (q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2, '#f4ead5');
  });
};
B.World = World; B.SURF_NOISE = SURF_NOISE; B.SURF_STEP = SURF_STEP;
