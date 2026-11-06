// Map rows -> meshes, colliders, nav, markers, doors, windows, breakables. One data source for everything.
import { THREE, PALETTE, toonMaterial, textureMap, TEXTURE_LIBRARY, DEFAULT_TEXEL, mergeStaticMeshes, NavGrid, buildModel, addModelColliders, setLookLayer, beltMaterial } from '../../pixel-engine.js';
import { MODELS } from '../models/index.js';
import { BLOCKED } from './mapPaint.js';

const { Mesh, BoxGeometry, PlaneGeometry, Group, Vector3 } = THREE;
export const DEFAULT_THEME = {
  floors: { '.': 'cobbles', ',': 'dirt', '=': 'planks', ':': 'rough-boards', '_': 'flagstones', '%': 'shallow-water', c: 'metal-plates', r: 'metal-plates' },
  walls: { '#': 'dry-stone', T: 'rough-boards' },
  wallH: { '#': 4.5, T: 3.4 },
  roofs: true,
};

/** Greedy rectangle merge of the cells where pred(ch, col, row) is true. Returns [{c0,r0,c1,r1}] inclusive. */
export function greedyRects(map, pred) {
  const used = Array.from({ length: map.H }, () => new Uint8Array(map.W));
  const out = [];
  for (let r = 0; r < map.H; r++) for (let c = 0; c < map.W; c++) {
    if (used[r][c] || !pred(map.rows[r][c], c, r)) continue;
    let c1 = c; while (c1 + 1 < map.W && !used[r][c1 + 1] && pred(map.rows[r][c1 + 1], c1 + 1, r)) c1++;
    let r1 = r;
    outer: while (r1 + 1 < map.H) { for (let x = c; x <= c1; x++) if (used[r1 + 1][x] || !pred(map.rows[r1 + 1][x], x, r1 + 1)) break outer; r1++; }
    for (let y = r; y <= r1; y++) for (let x = c; x <= c1; x++) used[y][x] = 1;
    out.push({ c0: c, r0: r, c1, r1 });
  }
  return out;
}
const tileMeters = (id) => TEXTURE_LIBRARY.get(id).size[0] / DEFAULT_TEXEL;
function mat(texId) { return toonMaterial(PALETTE.white, { map: textureMap(texId) }); }
/** A box whose per-face UVs follow metres, so textures keep their density. */
export function texBox(w, h, d, tile) {
  const g = new BoxGeometry(w, h, d);
  const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
  return g;
}
function texPlane(w, d, tile, ox = 0, oz = 0) {
  const g = new PlaneGeometry(w, d).rotateX(-Math.PI / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile + ox / tile, uv.getY(i) * d / tile + oz / tile);
  return g;
}
const wx = (map, c) => c + 0.5 - map.W / 2, wz = (map, r) => r + 0.5 - map.H / 2;

export function buildLevel(ctx, map, theme = {}, opts = {}) {
  const T = { ...DEFAULT_THEME, ...theme, floors: { ...DEFAULT_THEME.floors, ...(theme.floors || {}) }, walls: { ...DEFAULT_THEME.walls, ...(theme.walls || {}) } };
  const { physics, scene } = ctx;
  const rows = map.rows.slice();
  const level = { map, rows, theme: T, markers: {}, doors: [], windows: [], breakables: [], pushables: [], ladders: [], conveyors: [], nav: null, statics: [], waterRect: null, upper: null };
  const statics = [];
  const add = (mesh) => { mesh.castShadow = mesh.receiveShadow = true; statics.push(mesh); return mesh; };
  // markers
  for (let r = 0; r < map.H; r++) for (let c = 0; c < map.W; c++) {
    const ch = rows[r][c];
    if (/[a-z0-9$LE]/.test(ch) && !'cr_,'.includes(ch)) (level.markers[ch] ||= []).push({ col: c, row: r, x: wx(map, c), z: wz(map, r) });
  }
  // floor type under a cell: markers and special cells inherit from a neighbour
  const FLOOR = T.floors;
  const baseFloor = (c, r) => {
    const ch = rows[r][c];
    if (FLOOR[ch]) return ch;
    for (let rad = 1; rad < 6; rad++) for (const [dc, dr] of [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const cc = c + dc * rad, rr = r + dr * rad; if (cc < 0 || rr < 0 || cc >= map.W || rr >= map.H) continue;
      if (FLOOR[rows[rr][cc]] && rows[rr][cc] !== '%') return rows[rr][cc];
    }
    return '.';
  };
  const isFloorCell = (ch) => !'#T~'.includes(ch) ;
  // floors (everything walkable plus under doors/windows/low cover)
  const floorChars = Object.keys(FLOOR).filter((k) => k !== 'c');
  for (const fc of [...floorChars, 'c']) {
    const rects = greedyRects(map, (ch, c, r) => isFloorCell(ch) && !(ch === '#') && (fc === 'c' ? ch === 'c' : (ch !== 'c' && baseFloor(c, r) === fc)));
    for (const q of rects) {
      const w = q.c1 - q.c0 + 1, d = q.r1 - q.r0 + 1;
      const cx = (q.c0 + q.c1 + 1) / 2 - map.W / 2, cz = (q.r0 + q.r1 + 1) / 2 - map.H / 2;
      const tile = tileMeters(FLOOR[fc]);
      const g = texPlane(w, d, tile, cx - w / 2, cz - d / 2);
      const m = new Mesh(g, fc === 'c' ? mat(FLOOR[fc]) : mat(FLOOR[fc])); m.position.set(cx, fc === '%' ? -0.05 : 0, cz); m.receiveShadow = true; statics.push(m);
      if (fc === 'c') level.conveyors.push({ ...q, cx, cz, w, d, mesh: m });
    }
  }
  // ground collider
  physics.addStaticBox({ position: [0, -0.5, 0], halfExtents: [map.W / 2 + 4, 0.5, map.H / 2 + 4] });
  // walls
  for (const wc of Object.keys(T.walls)) {
    const h = T.wallH[wc];
    for (const q of greedyRects(map, (ch) => ch === wc)) {
      const w = q.c1 - q.c0 + 1, d = q.r1 - q.r0 + 1;
      const cx = (q.c0 + q.c1 + 1) / 2 - map.W / 2, cz = (q.r0 + q.r1 + 1) / 2 - map.H / 2;
      const m = new Mesh(texBox(w, h, d, tileMeters(T.walls[wc])), mat(T.walls[wc])); m.position.set(cx, h / 2, cz); add(m);
      physics.addStaticBox({ position: [cx, h / 2, cz], halfExtents: [w / 2, h / 2, d / 2] });
      if (wc === 'T' && T.roofs && w >= 3 && d >= 3) {
        const roof = new Mesh(texBox(w + 0.5, 0.4, d + 0.5, 4), mat('slate-roof')); roof.position.set(cx, h + 0.2, cz); add(roof);
        const ridge = new Mesh(new BoxGeometry(w + 0.5, 0.5, 0.5), toonMaterial(PALETTE.night)); ridge.position.set(cx, h + 0.6, cz); add(ridge);
      }
    }
  }
  // water cells: invisible wall for Max
  const waterCells = []; for (let r = 0; r < map.H; r++) for (let c = 0; c < map.W; c++) if (rows[r][c] === '~') waterCells.push([c, r]);
  if (waterCells.length > 20) {
    let c0 = 1e9, r0 = 1e9, c1 = -1, r1 = -1; for (const [c, r] of waterCells) { c0 = Math.min(c0, c); r0 = Math.min(r0, r); c1 = Math.max(c1, c); r1 = Math.max(r1, r); }
    level.waterRect = [c0 - map.W / 2 - 2, r0 - map.H / 2 - 2, c1 + 1 - map.W / 2 + 14, r1 + 1 - map.H / 2 + 14];
  }
  if (!opts.noWaterWalls) for (const q of greedyRects(map, (ch) => ch === '~')) {
    const w = q.c1 - q.c0 + 1, d = q.r1 - q.r0 + 1, cx = (q.c0 + q.c1 + 1) / 2 - map.W / 2, cz = (q.r0 + q.r1 + 1) / 2 - map.H / 2;
    level.waterWalls = (level.waterWalls || []);
    { const wc = physics.addStaticBox({ position: [cx, 1.5, cz], halfExtents: [w / 2, 1.5, d / 2] }); physics.tag(wc, 'noCamera'); level.waterWalls.push(wc); }
  }
  // low cover
  for (const q of greedyRects(map, (ch) => ch === 'H')) {
    const w = q.c1 - q.c0 + 1, d = q.r1 - q.r0 + 1, cx = (q.c0 + q.c1 + 1) / 2 - map.W / 2, cz = (q.r0 + q.r1 + 1) / 2 - map.H / 2;
    const m = new Mesh(texBox(w, 1.0, d, 2), mat(T.cover || 'dry-stone')); m.position.set(cx, 0.5, cz); add(m);
    const top = new Mesh(new BoxGeometry(w + 0.1, 0.12, d + 0.1), toonMaterial(PALETTE[T.coverTop || 'slate'])); top.position.set(cx, 1.04, cz); add(top);
    physics.addStaticBox({ position: [cx, 0.5, cz], halfExtents: [w / 2, 0.5, d / 2] });
  }
  // windows: sill + lintel + glass
  for (let r = 0; r < map.H; r++) for (let c = 0; c < map.W; c++) if (rows[r][c] === 'W') {
    const x = wx(map, c), z = wz(map, r);
    const alongX = rows[r][c - 1] === 'T' || rows[r][c + 1] === 'T' || rows[r][c - 1] === '#' || rows[r][c + 1] === '#';
    const wallTex = mat(T.walls.T);
    const sill = new Mesh(texBox(1, 1.0, 1, 2), wallTex); sill.position.set(x, 0.5, z); add(sill);
    const lintel = new Mesh(texBox(1, 1.3, 1, 2), wallTex); lintel.position.set(x, 2.75, z); add(lintel);
    const glass = new Mesh(new BoxGeometry(alongX ? 0.95 : 0.1, 1.1, alongX ? 0.1 : 0.95), toonMaterial(PALETTE.cyan)); glass.position.set(x, 1.55, z); glass.castShadow = false; scene.add(glass);
    const col = physics.addStaticBox({ position: [x, 0.5, z], halfExtents: [0.5, 0.5, 0.5] });
    level.windows.push({ col: c, row: r, x, z, alongX, glass, collider: col, broken: false, sill });
  }
  // doors, gates, shutters: grouped runs
  const seen = new Set();
  for (let r = 0; r < map.H; r++) for (let c = 0; c < map.W; c++) {
    const ch = rows[r][c];
    if (!'DGS'.includes(ch) || seen.has(r * map.W + c)) continue;
    const cells = [[c, r]]; seen.add(r * map.W + c);
    let alongX = rows[r][c + 1] === ch;
    if (alongX) { let cc = c + 1; while (rows[r][cc] === ch) { cells.push([cc, r]); seen.add(r * map.W + cc); cc++; } }
    else if (rows[r + 1]?.[c] === ch) { let rr = r + 1; while (rows[rr]?.[c] === ch) { cells.push([c, rr]); seen.add(rr * map.W + c); rr++; } }
    else alongX = rows[r][c - 1] === 'T' || rows[r][c - 1] === '#' || rows[r][c + 1] === 'T' || rows[r][c + 1] === '#';
    const n = cells.length;
    const cx = cells.reduce((a, [cc]) => a + wx(map, cc), 0) / n, cz = cells.reduce((a, [, rr]) => a + wz(map, rr), 0) / n;
    const len = n, thick = 0.4, h = ch === 'S' ? 3.0 : 2.6;
    const grp = new Group(); grp.position.set(cx, 0, cz);
    const body = new Mesh(new BoxGeometry(alongX ? len : thick, h, alongX ? thick : len), toonMaterial(ch === 'D' ? PALETTE.orange : ch === 'G' ? PALETTE.night : PALETTE.slate));
    body.position.y = h / 2; body.castShadow = body.receiveShadow = true; grp.add(body);
    const trim = new Mesh(new BoxGeometry(alongX ? len : thick + 0.05, 0.12, alongX ? thick + 0.05 : len), toonMaterial(PALETTE.red)); trim.position.y = h * 0.6; grp.add(trim);
    if (ch === 'G') for (let i = 0; i < n * 4; i++) { const bar = new Mesh(new BoxGeometry(alongX ? 0.06 : thick + 0.1, h, alongX ? thick + 0.1 : 0.06), toonMaterial(PALETTE.slate)); bar.position.set(alongX ? -len / 2 + (i + 0.5) * len / (n * 4) : 0, h / 2, alongX ? 0 : -len / 2 + (i + 0.5) * len / (n * 4)); grp.add(bar); }
    scene.add(grp);
    const collider = physics.addStaticBox({ position: [cx, h / 2, cz], halfExtents: [(alongX ? len : thick) / 2, h / 2, (alongX ? thick : len) / 2] });
    const d = { kind: ch, cells, x: cx, z: cz, alongX, group: grp, body, collider, open: false, h, hp: 6, bash: 0 };
    level.doors.push(d);
  }
  // breakables (crates and barrels)
  for (let r = 0; r < map.H; r++) for (let c = 0; c < map.W; c++) if (rows[r][c] === 'B') {
    const x = wx(map, c), z = wz(map, r), kind = (c + r) % 3 === 0 ? 'brine-barrel' : (c + r) % 2 ? 'crate' : 'barrel';
    const b = buildModel(kind, { catalog: MODELS });
    b.object.position.set(x, 0, z); b.object.rotation.y = ((c * 7 + r * 13) % 6) * 0.5; scene.add(b.object); setLookLayer(b.object, 'actors');
    const col = physics.addStaticBox({ position: [x, 0.5, z], halfExtents: [0.45, 0.5, 0.45] });
    level.breakables.push({ col: c, row: r, x, z, kind, hp: kind === 'brine-barrel' ? 6 : 8, object: b.object, collider: col, brine: kind === 'brine-barrel', broken: false });
  }
  // pushable wardrobe
  for (const p of level.markers.p || []) {
    const b = buildModel('wardrobe', { catalog: MODELS }); b.object.position.set(p.x, 0, p.z); scene.add(b.object); setLookLayer(b.object, 'actors');
    const col = physics.addStaticBox({ position: [p.x, 1, p.z], halfExtents: [0.45, 1, 0.45] });
    level.pushables.push({ x: p.x, z: p.z, col: p.col, row: p.row, object: b.object, collider: col, moving: null });
  }
  // nav
  level.nav = NavGrid.fromRows(rows, { cell: 1, origin: [-map.W / 2, 0, -map.H / 2], blocked: BLOCKED });
  for (const d of level.doors) for (const [c, r] of d.cells) level.nav.setOpen(c, r, true); // enemies treat D G S as open: they bash or wait
  for (const w of level.windows) level.nav.setOpen(w.col, w.row, true);
  level.statics = statics;
  const merged = mergeStaticMeshes(statics);
  scene.add(...merged);
  level.mergedMeshes = merged;
  level.wx = (c) => wx(map, c); level.wz = (r) => wz(map, r);
  level.cellOf = (x, z) => [Math.floor(x + map.W / 2), Math.floor(z + map.H / 2)];
  level.charAt = (x, z) => { const [c, r] = level.cellOf(x, z); return rows[r]?.[c] ?? '#'; };
  level.openAt = (x, z) => { const [c, r] = level.cellOf(x, z); return level.nav.isOpen(c, r); };
  return level;
}
