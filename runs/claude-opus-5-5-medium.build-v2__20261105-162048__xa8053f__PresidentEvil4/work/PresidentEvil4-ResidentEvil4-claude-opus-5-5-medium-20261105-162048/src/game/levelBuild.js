// One set of rows gives geometry, colliders, nav and the Map tab.
import { addModelColliders, beltMaterial, DEFAULT_TEXEL, glowMaterial, mergeStaticMeshes, NavGrid, PALETTE, TEXTURE_LIBRARY, textureMap, THREE, toonMaterial } from '../../pixel-engine.js';
import { MAPS, worldX, worldZ } from './mapPaint.js';
import { buildProp } from './actor.js';
const { BoxGeometry, Mesh, PlaneGeometry, Group } = THREE;
const FLOORS = '.,=:_%rc';
const DEFAULT_THEME = { '.': 'cobbles', ',': 'dirt', '=': 'deck', ':': 'rough-boards', '_': 'flagstones', '%': 'wet-sand', r: 'metal-plates', '#': 'dry-stone', T: 'planks', H: 'rough-boards', roof: 'slate-roof' };
const tileOf = (tex) => (TEXTURE_LIBRARY.get(tex)?.size?.[0] ?? 16) / DEFAULT_TEXEL;
export const texMat = (tex) => toonMaterial(PALETTE.white, { map: textureMap(tex) });
export function floorPlane(w, d, x, z, y, tex) {
  const g = new PlaneGeometry(w, d).rotateX(-Math.PI / 2), t = tileOf(tex), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / t, (uv.getY(i) * d) / t);
  const m = new Mesh(g, texMat(tex)); m.position.set(x, y, z); m.receiveShadow = true; return m;
}
export function texBox(w, h, d, x, y, z, tex) {
  const g = new BoxGeometry(w, h, d), t = tileOf(tex), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, (uv.getX(k) * dims[f][0]) / t, (uv.getY(k) * dims[f][1]) / t); }
  const m = new Mesh(g, texMat(tex)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m;
}
export function greedy(rows, pred) {
  const H = rows.length, W = rows[0].length, used = rows.map(() => new Uint8Array(W)), out = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (used[y][x] || !pred(rows[y][x], x, y)) continue;
    let w = 1; while (x + w < W && !used[y][x + w] && pred(rows[y][x + w], x + w, y)) w++;
    let h = 1; grow: while (y + h < H) { for (let i = 0; i < w; i++) if (used[y + h][x + i] || !pred(rows[y + h][x + i], x + i, y + h)) break grow; h++; }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) used[y + j][x + i] = 1;
    out.push({ x, y, w, h });
  }
  return out;
}
export class Level {
  constructor(area, def) {
    this.area = area; this.ctx = area.ctx; this.def = def; this.map = MAPS[def.map]; this.rows = this.map.rows; this.W = this.map.w; this.H = this.map.h; this.theme = { ...DEFAULT_THEME, ...(def.theme || {}) };
    this.doors = []; this.windows = []; this.gates = {}; this.crates = []; this.cellObj = new Map(); this.spawns = {}; this.markers = {}; this.belts = def.belts || null; this.links = []; this.loft = null; this.ladders = [];
    const blocked = '#T~HBSG', o = { cell: 1, origin: [-this.W / 2, 0, -this.H / 2], blocked };
    this.navs = [[NavGrid.fromRows(this.rows, o)]]; this.navOpt = o; this.sight = NavGrid.fromRows(this.rows.map((r) => r.replace(/[DS]/g, '#').replace(/[G]/g, 'g')), { ...o, blocked: '#T' });
    for (const k of 'a12345mtyu$pndwkzoqsvhl') this.markers[k] = [];
    this.rows.forEach((r, row) => { for (let col = 0; col < r.length; col++) if (this.markers[r[col]]) this.markers[r[col]].push({ col, row, x: worldX(this.map, col), z: worldZ(this.map, row) }); });
    for (const k of '12345') this.spawns[k] = this.markers[k][0];
    this.base = this.computeBase();
  }
  wx(c) { return worldX(this.map, c); } wz(r) { return worldZ(this.map, r); } col(x) { return Math.floor(x + this.W / 2); } row(z) { return Math.floor(z + this.H / 2); }
  charAt(x, z, floor = 0) { if (floor === 1 && this.loft) { const c = this.col(x) - this.loft.col, r = this.row(z) - this.loft.row; return this.loft.map.rows[r]?.[c] ?? 'T'; } return this.rows[this.row(z)]?.[this.col(x)] ?? '#'; }
  computeBase() {
    const r = this.rows, base = r.map((l) => l.split(''));
    const isF = (c) => FLOORS.includes(c);
    for (let pass = 0; pass < 4; pass++) for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      if (isF(base[y][x]) || '#T~'.includes(base[y][x])) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].map(([a, b]) => base[y + b]?.[x + a]).filter(isF);
      if (near.length) base[y][x] = near.filter((c) => c !== 'c')[0] ?? near[0];
    }
    return base;
  }
  build() {
    const { ctx, theme, rows, area } = this, P = ctx.physics, meshes = [];
    { const g = this.def.groundMargin ?? 40; P.addStaticBox({ position: [0, -0.5, 0], halfExtents: [this.W / 2 + g, 0.5, this.H / 2 + g] }); }
    // Floors, by base char.
    const seen = new Set(this.base.flat().filter((c) => FLOORS.includes(c) && c !== 'c'));
    for (const ch of seen) for (const q of greedy(this.base.map((l) => l.join('')), (c) => c === ch)) {
      const f = floorPlane(q.w, q.h, q.x + q.w / 2 - this.W / 2, q.y + q.h / 2 - this.H / 2, ch === '%' ? -0.02 : 0, theme[ch] ?? 'cobbles'); meshes.push(f);
    }
    // Belts: moving material.
    if (this.belts) for (const q of greedy(rows, (c) => c === 'c')) {
      const dir = q.y < this.H / 2 ? this.belts.north : this.belts.south; const g = new PlaneGeometry(q.w, q.h).rotateX(-Math.PI / 2); const bm = beltMaterial(PALETTE.night, PALETTE.slate, { length: q.w, speed: dir, pitch: 0.5, along: 'u' }); const belt = new Mesh(g, bm); belt.position.set(q.x + q.w / 2 - this.W / 2, 0.03, q.y + q.h / 2 - this.H / 2); belt.receiveShadow = true; ctx.scene.add(belt);
      for (let i = 2; i < q.w; i += 5) { const fr = buildProp('belt-frame', { shadow: false }); fr.object.position.set(q.x + i - this.W / 2, -0.5, q.y + q.h / 2 - this.H / 2); ctx.scene.add(fr.object); }
    }
    // Walls.
    const wallH = { '#': this.def.wallH ?? 6, T: 3 };
    for (const ch of '#T') for (const q of greedy(rows, (c) => c === ch)) {
      const h = wallH[ch], cx = q.x + q.w / 2 - this.W / 2, cz = q.y + q.h / 2 - this.H / 2;
      P.addStaticBox({ position: [cx, h / 2, cz], halfExtents: [q.w / 2, h / 2, q.h / 2] });
      if (ch === '#' && this.isBuried(q)) continue;
      meshes.push(texBox(q.w, h, q.h, cx, h / 2, cz, theme[ch]));
    }
    // Low cover.
    for (const q of greedy(rows, (c) => c === 'H')) {
      const cx = q.x + q.w / 2 - this.W / 2, cz = q.y + q.h / 2 - this.H / 2, col = P.addStaticBox({ position: [cx, 0.5, cz], halfExtents: [q.w / 2, 0.5, q.h / 2] });
      const a0 = texBox(q.w, 1, q.h, cx, 0.5, cz, theme.H), b0 = texBox(q.w + 0.06, 0.1, q.h + 0.06, cx, 0.98, cz, 'rough-boards');
      if (this.def.breakCover && q.w <= (this.def.breakCover) && q.h <= (this.def.breakCover)) { ctx.scene.add(a0, b0); (this.covers ??= []).push({ q, col, meshes: [a0, b0], x: cx, z: cz, broken: false }); } else meshes.push(a0, b0);
    }
    // Deep water: an invisible wall stops Max; bullets and the camera pass.
    for (const q of greedy(rows, (c) => c === '~')) { const c = P.addStaticBox({ position: [q.x + q.w / 2 - this.W / 2, 2, q.y + q.h / 2 - this.H / 2], halfExtents: [q.w / 2, 2, q.h / 2] }); P.tag(c, 'noBullet', 'noCamera'); }
    this.buildRoofs(meshes);
    this.buildDoors(); this.buildWindows(); this.buildGates(); this.buildCrates();
    if (this.def.loft) this.buildLoft(meshes);
    ctx.scene.add(...mergeStaticMeshes(meshes));
  }
  isBuried(q) { // a stone block with no open neighbour needs no mesh
    for (let y = q.y - 1; y <= q.y + q.h; y++) for (let x = q.x - 1; x <= q.x + q.w; x++) { const c = this.rows[y]?.[x]; if (c !== undefined && c !== '#') return false; } return false;
  }
  buildRoofs(meshes) {
    const seen = this.rows.map((r) => new Uint8Array(r.length)), R = this.rows;
    const roofy = (c) => c === 'T' || c === ':' || c === 'D' || c === 'W' || 'Lpmn$'.includes(c);
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      if (seen[y][x] || R[y][x] !== 'T') continue;
      const st = [[x, y]]; seen[y][x] = 1; let x0 = x, x1 = x, y0 = y, y1 = y, n = 0;
      while (st.length) { const [a, b] = st.pop(); n++; x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const c = R[b + dy]?.[a + dx]; if (c && roofy(c) && !seen[b + dy][a + dx]) { const base = this.base[b + dy][a + dx]; if (c === 'T' || base === ':') { seen[b + dy][a + dx] = 1; st.push([a + dx, b + dy]); } } } }
      if (n < 6) continue; const w = x1 - x0 + 1, d = y1 - y0 + 1, cx = x0 + w / 2 - this.W / 2, cz = y0 + d / 2 - this.H / 2;
      if (this.def.loft && x0 === this.def.loft.col && y0 === this.def.loft.row) continue;
      meshes.push(texBox(w + 0.6, 0.35, d + 0.6, cx, 3.17, cz, this.theme.roof));
      const P = this.ctx.physics; P.addStaticBox({ position: [cx, 3.2, cz], halfExtents: [w / 2, 0.2, d / 2] });
      if (w >= 3 && d >= 3) { const r = buildProp('chimney', { shadow: true }); r.object.position.set(cx + w / 4, 3.3, cz - d / 4); this.ctx.scene.add(r.object); }
    }
  }
  buildDoors() {
    const R = this.rows; const seen = new Set();
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      if (R[y][x] !== 'D' || seen.has(x + ',' + y)) continue; const cells = []; let w = 1, h = 1;
      if (R[y][x + 1] === 'D') { while (R[y][x + w] === 'D') w++; } else if (R[y + 1]?.[x] === 'D') { while (R[y + h]?.[x] === 'D') h++; }
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { seen.add((x + i) + ',' + (y + j)); cells.push([x + i, y + j]); }
      this.addDoor(x, y, w, h, cells);
    }
  }
  addDoor(x, y, w, h, cells) {
    const { ctx } = this, cx = x + w / 2 - this.W / 2, cz = y + h / 2 - this.H / 2, alongX = w >= h, len = alongX ? w : h;
    const col = ctx.physics.addStaticBox({ position: [cx, 1.1, cz], halfExtents: [(alongX ? w : 0.2) / 2 + (alongX ? 0 : 0.2), 1.1, (alongX ? 0.2 : h) / 2 + (alongX ? 0.2 : 0)] });
    const group = new Group(); group.position.set(cx, 0, cz); const leaves = [];
    for (let i = 0; i < 2; i++) {
      const s = i ? 1 : -1, piv = new Group(); piv.position.set(alongX ? s * len / 2 : 0, 0, alongX ? 0 : s * len / 2); const mesh = texBox(alongX ? len / 2 : 0.14, 2.3, alongX ? 0.14 : len / 2, alongX ? -s * len / 4 : 0, 1.15, alongX ? 0 : -s * len / 4, 'planks');
      const band = new Mesh(new BoxGeometry(alongX ? len / 2 : 0.16, 0.12, alongX ? 0.16 : len / 2), toonMaterial(PALETTE.night)); band.position.set(mesh.position.x, 1.5, mesh.position.z); piv.add(mesh, band); group.add(piv); leaves.push({ piv, s });
    }
    const lintel = new Mesh(new BoxGeometry(alongX ? len : 0.3, 0.8, alongX ? 0.3 : len), toonMaterial(PALETTE.night)); lintel.position.y = 2.7; group.add(lintel);
    ctx.scene.add(group);
    const door = { type: 'door', x: cx, z: cz, cells, alongX, collider: col, open: false, hp: 6, leaves, group, id: `${x},${y}`, locked: false };
    door.shake = () => { for (const l of leaves) { l.piv.rotation.y = (alongX ? 1 : -1) * l.s * 0.08; ctx.tweens.to(l.piv.rotation, { y: 0 }, { duration: 0.2 }); } };
    for (const [a, b] of cells) this.cellObj.set(a + ',' + b, door); this.doors.push(door);
    // Doors on the map's edge lead nowhere unless the area says they are its exit.
    if ((y === 0 || x === 0 || y + h >= this.H || x + w >= this.W) && !this.def.exitDoors?.includes(door.id)) door.sealed = true;
    // Telegraph rooms: enemies don't enter.
    if (this.def.safeDoors?.includes(door.id)) for (const [a, b] of cells) this.setNav(a, b, false);
    return door;
  }
  openDoor(door, from, noSound) {
    if (door.open) return; door.open = true; if (door.collider) this.ctx.physics.remove(door.collider); door.collider = null; if (door.blocker) { this.ctx.physics.remove(door.blocker.collider); door.blocker = null; }
    const ax = from ? (door.alongX ? (from.z > door.z ? -1 : 1) : (from.x > door.x ? 1 : -1)) : 1;
    for (const l of door.leaves) this.ctx.tweens.to(l.piv.rotation, { y: l.s * ax * 1.75 * (door.alongX ? 1 : -1) }, { duration: 0.3, ease: 'outBack' });
    for (const [a, b] of door.cells) this.sight.setOpen(a, b, true);
    if (!noSound) { this.ctx.audio.play('doorkick', this.area.spatialPlay({ x: door.x, y: 1, z: door.z })); this.ctx.particles.burst('dust', [door.x, 0.6, door.z]); this.area.noise?.(door.x, door.z, 10); }
    this.area.markDoor?.(door);
    return true;
  }
  breakDoor(door, by) { this.openDoor(door, by?.pos); this.ctx.particles.burst('splinter', [door.x, 1, door.z]); for (const l of door.leaves) l.piv.visible = false; }
  buildWindows() {
    const R = this.rows;
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) if (R[y][x] === 'W') this.addWindow(x, y, this.rows, 0);
  }
  addWindow(col, row, rows, floor) {
    const cx = this.wx(col + (floor ? this.loft.col : 0)), cz = this.wz(row + (floor ? this.loft.row : 0)), y0 = floor ? 3.2 : 0, passX = '.,=:_'.includes(rows[row][col - 1]?.replace(/[^.,=:_]/g, '') || 'x') && '.,=:_'.includes(rows[row][col + 1]?.replace(/[^.,=:_]/g, '') || 'x');
    const P = this.ctx.physics, c = P.addStaticBox({ position: [cx, y0 + 1.5, cz], halfExtents: [0.5, 1.5, 0.5] }); P.tag(c, 'noBullet');
    const g = new Group(); g.position.set(cx, y0, cz); const wall = rows === this.rows ? (this.theme.T) : 'planks';
    const low = texBox(passX ? 0.5 : 1, 0.95, passX ? 1 : 0.5, 0, 0.47, 0, wall), high = texBox(passX ? 0.5 : 1, 0.75, passX ? 1 : 0.5, 0, 2.62, 0, wall); g.add(low, high);
    const glass = new Mesh(new BoxGeometry(passX ? 0.06 : 0.96, 1.3, passX ? 0.96 : 0.06), glowMaterial(PALETTE.orange)); glass.position.y = 1.6; g.add(glass);
    const bar = new Mesh(new BoxGeometry(passX ? 0.08 : 1, 0.07, passX ? 1 : 0.08), toonMaterial(PALETTE.night)); bar.position.y = 1.6; g.add(bar);
    this.ctx.scene.add(g);
    const w = { type: 'window', x: cx, z: cz, passX, floor, broken: false, glass, bar, y: y0 + 1.5 };
    if (floor === 0) this.cellObj.set(col + ',' + row, w); this.windows.push(w);
    this.area.shootables.push(w.shoot = { pos: new THREE.Vector3(cx, y0 + 1.6, cz), r: 0.55, through: 0.2, kind: 'glass', hit: () => { this.breakWindow(w); }, dead: false });
    return w;
  }
  breakWindow(w) { if (w.broken) return; w.broken = true; w.glass.visible = false; w.bar.visible = false; if (w.shoot) w.shoot.dead = true; this.ctx.particles.burst('glass', [w.x, w.y, w.z]); this.ctx.audio.play('glass', this.area.spatialPlay({ x: w.x, y: 1, z: w.z })); }
  vaultPath(w, pos) { const s = w.passX ? Math.sign(w.x - pos.x) || 1 : Math.sign(w.z - pos.z) || 1; return { fx: pos.x, fz: pos.z, tx: w.x + (w.passX ? s * 1.05 : 0), tz: w.z + (w.passX ? 0 : s * 1.05) }; }
  buildGates() {
    const { ctx } = this;
    for (const ch of 'GS') for (const q of greedy(this.rows, (c) => c === ch)) {
      const cx = q.x + q.w / 2 - this.W / 2, cz = q.y + q.h / 2 - this.H / 2; const collider = ctx.physics.addStaticBox({ position: [cx, 2, cz], halfExtents: [q.w / 2, 2, q.h / 2] });
      const g = new Group(); g.position.set(cx, 0, cz); const big = Math.max(q.w, q.h);
      if (ch === 'S') { const s = buildProp('shutter'); s.object.scale.set(q.w / 3, 1, 1); g.add(s.object); }
      else { const alongX = q.w >= q.h; for (let i = 0; i <= big * 2; i++) { const b = new Mesh(new BoxGeometry(alongX ? 0.1 : Math.min(q.w, 0.3), 3.4, alongX ? Math.min(q.h, 0.3) : 0.1), toonMaterial(PALETTE.night)); const o = -big / 2 + i * 0.5; b.position.set(alongX ? o : 0, 1.7, alongX ? 0 : o); g.add(b); } for (const y of [0.6, 1.8, 3]) { const b = new Mesh(new BoxGeometry(alongX ? big : 0.14, 0.12, alongX ? 0.14 : big), toonMaterial(PALETTE.slate)); b.position.y = y; g.add(b); } }
      ctx.scene.add(g);
      const gate = { id: `${ch}${q.x},${q.y}`, ch, q, collider, group: g, open: false, x: cx, z: cz }; this.gates[gate.id] = gate; (this.gates[ch] ??= []).push(gate);
    }
  }
  openGate(gate, rise = 3.6, dur = 1.2) {
    if (gate.open) return; gate.open = true; this.ctx.physics.remove(gate.collider); gate.collider = null; this.ctx.tweens.to(gate.group.position, { y: rise }, { duration: dur }); this.ctx.audio.play('chain', this.area.spatialPlay({ x: gate.x, y: 1, z: gate.z }));
    for (let y = gate.q.y; y < gate.q.y + gate.q.h; y++) for (let x = gate.q.x; x < gate.q.x + gate.q.w; x++) { this.setNav(x, y, true); this.sight.setOpen(x, y, true); }
    this.area.markGate?.(gate);
  }
  setNav(col, row, open, floor = 0) { for (const g of this.navs[floor]) g.setOpen(floor ? col - this.loft.col : col, floor ? row - this.loft.row : row, open); }
  buildCrates() {
    const { ctx } = this; const cells = []; this.rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === 'B') cells.push([x, y]); });
    cells.forEach(([col, row], i) => this.addCrate(col, row, (col * 7 + row * 3 + i) % 2 ? 'crate' : 'barrel'));
  }
  addCrate(col, row, kind) {
    const { ctx } = this, x = this.wx(col), z = this.wz(row); const b = buildProp(kind); b.object.position.set(x, 0, z); ctx.scene.add(b.object);
    const c = ctx.physics.addStaticBox({ position: [x, 0.5, z], halfExtents: [0.48, 0.5, 0.48] }); const cr = { pos: new THREE.Vector3(x, 0.5, z), r: 0.6, kind: 'crate', col, row, obj: b.object, collider: c, id: `${col},${row}`, floor: 0, dead: false, hit: () => this.breakCrate(cr) };
    this.crates.push(cr); this.area.shootables.push(cr); return cr;
  }
  breakCrate(cr, silent) {
    if (cr.dead) return; cr.dead = true; this.ctx.scene.remove(cr.obj); this.ctx.physics.remove(cr.collider); this.setNav(cr.col, cr.row, true);
    if (silent) return; this.ctx.particles.burst('splinter', cr.pos); this.ctx.audio.play('cratebreak', this.area.spatialPlay(cr.pos)); this.area.dropLoot?.(cr.pos, true); this.area.markCrate?.(cr);
  }
  buildLoft(meshes) {
    const def = this.def.loft, map = MAPS[def.map], { ctx } = this, P = ctx.physics, hF = this.area.floorH, ox = def.col, oy = def.row; this.loft = { map, col: ox, row: oy };
    const o = { cell: 1, origin: [ox - this.W / 2, 0, oy - this.H / 2], blocked: 'TWE' }; this.navs[1] = [NavGrid.fromRows(map.rows, o)]; this.sightLoft = NavGrid.fromRows(map.rows, { ...o, blocked: 'T' });
    const cx = ox + map.w / 2 - this.W / 2, cz = oy + map.h / 2 - this.H / 2;
    P.addStaticBox({ position: [cx, hF - 0.1, cz], halfExtents: [map.w / 2, 0.1, map.h / 2] });
    meshes.push(floorPlane(map.w - 2, map.h - 2, cx, cz, hF + 0.01, 'rough-boards')); meshes.push(texBox(map.w, 0.2, map.h, cx, hF - 0.1, cz, 'rough-boards'));
    for (const q of greedy(map.rows, (c) => c === 'T' || c === 'E')) { const qx = q.x + ox + q.w / 2 - this.W / 2, qz = q.y + oy + q.h / 2 - this.H / 2; P.addStaticBox({ position: [qx, hF + 1.5, qz], halfExtents: [q.w / 2, 1.5, q.h / 2] }); meshes.push(texBox(q.w, 3, q.h, qx, hF + 1.5, qz, this.theme.T)); }
    meshes.push(texBox(map.w + 0.6, 0.35, map.h + 0.6, cx, hF + 3.17, cz, this.theme.roof)); P.addStaticBox({ position: [cx, hF + 3.2, cz], halfExtents: [map.w / 2, 0.2, map.h / 2] });
    map.rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === 'W') this.addWindow(x, y, map.rows, 1); });
  }
  /** Low cover that can be smashed: nave columns, yard crate stacks. */
  coverNear(x, z, r = 0) { return this.covers?.find((c) => !c.broken && Math.abs(x - c.x) <= c.q.w / 2 + r && Math.abs(z - c.z) <= c.q.h / 2 + r) ?? null; }
  breakCover(c) { if (c.broken) return; c.broken = true; this.ctx.physics.remove(c.col); for (const m of c.meshes) this.ctx.scene.remove(m); for (let y = c.q.y; y < c.q.y + c.q.h; y++) for (let x = c.q.x; x < c.q.x + c.q.w; x++) { this.setNav(x, y, true); this.sight.setOpen(x, y, true); } this.ctx.particles.burst('splinter', [c.x, 0.8, c.z], { count: 30, colors: ['slate', 'mist', 'orange'] }); this.ctx.audio.play('cratebreak', this.area.spatialPlay({ x: c.x, y: 1, z: c.z })); }
  beltAt(x, z, floor = 0) { if (!this.belts || floor) return null; if (this.charAt(x, z) !== 'c') return null; return [this.row(z) < this.H / 2 ? this.belts.north : this.belts.south, 0]; }
  barrierAt(x, z, floor = 0) { if (floor) return null; const o = this.cellObj.get(this.col(x) + ',' + this.row(z)); if (!o) return null; if (o.type === 'door' && o.open) return null; return o; }
  isShallow(x, z) { return this.charAt(x, z) === '%'; }
  enemyCanStand(x, z, floor, sea) {
    const r = 0.18, g = this.navs[floor]?.[0] ?? this.navs[0][0];
    if (sea) { const c = this.charAt(x, z); return c === '~' || g.walkable(x, z); }
    if (this.extraBlock?.(x, z)) return false;
    return g.walkable(x + r, z + r) && g.walkable(x - r, z + r) && g.walkable(x + r, z - r) && g.walkable(x - r, z - r);
  }
  sightLine(a, b, floor) { const g = floor ? this.sightLoft : this.sight; return g ? g.lineOfSight(a.x, a.z, b.x, b.z) : true; }
  /** Nearest walkable cell centre to a water cell, and the direction into the water. */
  nearestShore(pos, floor) {
    let best = null, bd = 1e9; const px = this.col(pos.x), py = this.row(pos.z);
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      if (this.rows[y][x] !== '~') continue; const d0 = Math.abs(x - px) + Math.abs(y - py); if (d0 > bd + 2) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const c = this.rows[y + dy]?.[x + dx]; if (c && !'#T~HBSG'.includes(c) && c !== 'D' && c !== 'W' && d0 < bd) { bd = d0; best = { col: x + dx, row: y + dy, dir: [-dx, -dy] }; } }
    }
    return best;
  }
  addSolidProp(id, x, z, turn = 0, opts = {}) { const b = buildProp(id, opts); b.object.position.set(x, opts.y ?? 0, z); b.object.rotation.y = turn; this.ctx.scene.add(b.object); const cols = addModelColliders(this.ctx.physics, b, [x, opts.y ?? 0, z], turn); for (const c of cols) this.ctx.physics.tag(c, 'noCamera'); b.colliders_ = cols; if (cols.length && !opts.navOpen) { const cc = this.col(x), rr = this.row(z); if (this.rows[rr]?.[cc] !== undefined) this.setNav(cc, rr, false); } return b; }
  addProp(id, x, z, turn = 0, opts = {}) { const b = buildProp(id, opts); b.object.position.set(x, opts.y ?? 0, z); b.object.rotation.y = turn; this.ctx.scene.add(b.object); return b; }
}
