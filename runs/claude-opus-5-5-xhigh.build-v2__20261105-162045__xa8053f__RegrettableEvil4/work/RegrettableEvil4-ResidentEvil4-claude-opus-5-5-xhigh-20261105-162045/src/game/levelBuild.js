// Turns painted rows into a level: floors, walls, cover, water colliders, doors, windows, ladders,
// gates, shutters, crates and markers, all from the same characters. One NavGrid per floor.
import { addModelColliders, buildModel, DEFAULT_TEXEL, glowMaterial, mergeStaticMeshes, NavGrid, PALETTE, setLookLayer, TEXTURE_LIBRARY, textureMap, THREE, toonMaterial, beltMaterial } from '../../pixel-engine.js';
import { MODELS } from '../models/index.js';
import { BLOCKED, FLOOR_CHARS, floorUnder, MapInfo } from './mapPaint.js';

const { BoxGeometry, Group, Mesh, PlaneGeometry } = THREE;

/** Weathered, cold variants of library textures, so the island isn't the colour of a bakery. */
export const TEX_VARIANTS = {
  weatherboard: ['rough-boards', { gap: 'ink', grain: 'night', wood: 'slate' }],
  tarboard: ['rough-boards', { gap: 'ink', grain: 'ink', wood: 'night' }],
  'wet-planks': ['deck', { seam: 'ink', grain: 'plum', wood: 'slate' }],
  'indoor-boards': ['rough-boards', { gap: 'ink', grain: 'plum', wood: 'red' }],
  'peat': ['dirt', { dark: 'ink', earth: 'plum', pebble: 'slate' }],
  'cold-plate': ['metal-plates', { seam: 'ink', shadow: 'night', plate: 'navy', light: 'slate' }],
  'abbey-stone': ['ashlar', { joint: 'ink', shadow: 'night', stone: 'slate' }],
  'white-tile': ['floor-tiles', { joint: 'slate', tile: 'mist', tile2: 'white' }],
  'moss-stone': ['dry-stone', { joint: 'ink', shadow: 'night', stone: 'teal', light: 'slate' }],
};
function texOf(id) {
  const v = TEX_VARIANTS[id];
  return v ? textureMap(v[0], { palette: v[1] }) : textureMap(id);
}
const texMat = (id, color = PALETTE.white) => toonMaterial(color, { map: texOf(id) });
const tileSize = (id) => TEXTURE_LIBRARY.get(TEX_VARIANTS[id]?.[0] ?? id).size[0] / DEFAULT_TEXEL;

/** A box whose UVs count metres / tile, so a texture is the same size on any wall. */
export function texBox(w, h, d, tex, color) {
  const g = new BoxGeometry(w, h, d);
  const t = tileSize(tex);
  const uv = g.attributes.uv;
  // Faces: +x -x (u along z, v along y), +y -y (u along x, v along z), +z -z (u along x, v along y).
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let face = 0; face < 6; face++) {
    for (let i = 0; i < 4; i++) {
      const k = face * 4 + i;
      uv.setXY(k, (uv.getX(k) * dims[face][0]) / t, (uv.getY(k) * dims[face][1]) / t);
    }
  }
  return new Mesh(g, texMat(tex, color));
}
function plainBox(w, h, d, color) { return new Mesh(new BoxGeometry(w, h, d), toonMaterial(color)); }

/** A floor quad with UVs in metres / tile. */
function floorQuad(w, d, tex, color) {
  const g = new PlaneGeometry(w, d).rotateX(-Math.PI / 2);
  const t = tileSize(tex);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / t, (uv.getY(i) * d) / t);
  const m = new Mesh(g, texMat(tex, color));
  m.receiveShadow = true;
  return m;
}

const put = (m, x, y, z, shadow = true) => { m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; return m; };

export const DEFAULT_THEME = {
  floors: { '.': 'cobbles', ',': 'dirt', '=': 'deck', ':': 'rough-boards', _: 'flagstones', '%': 'wet-sand', c: 'metal-plates', r: 'metal-plates' },
  walls: { '#': { tex: 'dry-stone', h: 7 }, T: { tex: 'rough-boards', h: 3 } },
  cover: { tex: 'dry-stone', h: 1 },
  fallbackFloor: '.',
};

export class Level {
  constructor(ctx, mapName, theme = {}) {
    this.ctx = ctx;
    this.info = new MapInfo(mapName);
    this.theme = { ...DEFAULT_THEME, ...theme, floors: { ...DEFAULT_THEME.floors, ...(theme.floors ?? {}) }, walls: { ...DEFAULT_THEME.walls, ...(theme.walls ?? {}) }, cover: { ...DEFAULT_THEME.cover, ...(theme.cover ?? {}) } };
    this.static = [];
    this.doors = [];
    this.windows = [];
    this.ladders = [];
    this.gates = [];
    this.shutters = [];
    this.crates = [];
    this.tannoys = [];
    this.chests = [];
    this.props = [];
    this.lights = [];
    this.belts = [];
    this.upper = null; // the loft floor's data, if any
    this.bySpot = new Map();
    this.solid = new Map(); // cell key -> extra closed nav state
  }

  build(o = {}) {
    const { info, theme } = this;
    this.nav = NavGrid.fromRows(info.rows, { cell: 1, origin: [info.ox, 0, info.oz], blocked: BLOCKED });
    this.buildFloors();
    this.buildWalls('#');
    this.buildWalls('T');
    this.buildCover(o.coverProps ?? []);
    this.buildWaterWalls();
    this.buildDoors();
    this.buildWindows();
    this.buildGates(o.gateModel);
    this.buildShutters();
    this.buildCrates(o.brine ?? []);
    this.buildMarkers();
    this.buildGroundCollider();
    if (o.belts) this.buildBelts(o.belts);
    if (o.roofs) for (const r of o.roofs) this.addRoof(r);
    this.flush();
    return this;
  }

  flush() {
    if (this.static.length) {
      const merged = mergeStaticMeshes(this.static);
      for (const m of merged) this.ctx.scene.add(m);
      this.static.length = 0;
    }
  }

  buildGroundCollider() {
    const { info, ctx } = this;
    ctx.physics.addStaticBox({ position: [0, -0.5, 0], halfExtents: [info.w / 2 + 40, 0.5, info.h / 2 + 40] });
    // Floor can run right up to the map's edge, and past it there's no world: a wall all the way round, for bodies only.
    // Cameras and bullets go through: the launch's mines and boats are out there.
    const edgeW = info.w / 2; const edgeH = info.h / 2;
    for (const [x, z, hx, hz] of [[0, -edgeH - 0.5, edgeW + 1, 0.5], [0, edgeH + 0.5, edgeW + 1, 0.5], [-edgeW - 0.5, 0, 0.5, edgeH + 1], [edgeW + 0.5, 0, 0.5, edgeH + 1]]) {
      ctx.physics.tag(ctx.physics.addStaticBox({ position: [x, 4, z], halfExtents: [hx, 4, hz] }), 'noCamera', 'noBullet');
    }
  }

  floorKey(c, r) {
    const ch = this.info.ch(c, r);
    if (ch === '#' || ch === 'T' || ch === '~') return null;
    return floorUnder(this.info, c, r, this.theme.fallbackFloor);
  }

  buildFloors() {
    const { info, theme, static: st } = this;
    const keys = Array.from({ length: info.h }, (_, r) => Array.from({ length: info.w }, (_, c) => this.floorKey(c, r)));
    const seen = new Set();
    for (const row of keys) for (const k of row) if (k) seen.add(k);
    for (const k of seen) {
      for (const R of info.rects((_, c, r) => keys[r][c] === k)) {
        const w = R.c1 - R.c0 + 1; const d = R.r1 - R.r0 + 1;
        const x = info.x(R.c0) + (w - 1) / 2; const z = info.z(R.r0) + (d - 1) / 2;
        const tex = theme.floors[k] ?? 'cobbles';
        if (k === 'c') continue; // belts draw themselves
        const m = floorQuad(w, d, tex, theme.floorTint?.[k]);
        m.position.set(x, 0, z);
        st.push(m);
      }
    }
    // A skirt under everything that isn't sea, so the pier and the road have sides.
    if (info.rows.some((row) => row.includes('~'))) {
      for (const R of info.rects((ch) => ch !== '~')) {
        const w = R.c1 - R.c0 + 1; const d = R.r1 - R.r0 + 1;
        st.push(put(plainBox(w, 2.4, d, PALETTE.ink), info.x(R.c0) + (w - 1) / 2, -1.22, info.z(R.r0) + (d - 1) / 2, false));
      }
    }
  }

  buildWalls(ch) {
    const { info, theme, ctx, static: st } = this;
    const spec = theme.walls[ch];
    for (const R of info.rects((k) => k === ch)) {
      const w = R.c1 - R.c0 + 1; const d = R.r1 - R.r0 + 1;
      const x = info.x(R.c0) + (w - 1) / 2; const z = info.z(R.r0) + (d - 1) / 2;
      const h = spec.h;
      st.push(put(texBox(w, h, d, spec.tex, spec.color), x, h / 2, z));
      ctx.physics.addStaticBox({ position: [x, h / 2, z], halfExtents: [w / 2, h / 2, d / 2] });
      if (ch === 'T') {
        // Timber frame: plinth, sill beam, corner posts, posts every 2.5 m. No bare wall over 6 m.
        st.push(put(plainBox(w + 0.06, 0.3, d + 0.06, PALETTE.night), x, 0.15, z));
        st.push(put(plainBox(w + 0.06, 0.14, d + 0.06, PALETTE.ink), x, h - 0.07, z));
        st.push(put(plainBox(w + 0.06, 0.1, d + 0.06, PALETTE.plum), x, h * 0.6, z));
        if (w >= d) for (let px = x - w / 2 + 0.1; px < x + w / 2; px += 2.5) st.push(put(plainBox(0.16, h, d + 0.06, PALETTE.ink), px, h / 2, z));
        else for (let pz = z - d / 2 + 0.1; pz < z + d / 2; pz += 2.5) st.push(put(plainBox(w + 0.06, h, 0.16, PALETTE.ink), x, h / 2, pz));
      } else if (w <= 3 || d <= 3) {
        // Thin stone runs get a coping and a darker base.
        st.push(put(plainBox(w + 0.08, 0.2, d + 0.08, PALETTE.slate), x, h - 0.1, z));
        st.push(put(plainBox(w + 0.08, 0.5, d + 0.08, PALETTE.night), x, 0.25, z));
      }
    }
  }

  buildCover(coverProps) {
    const { info, theme, ctx, static: st } = this;
    const skinned = (c, r) => coverProps.some((p) => c >= p[0] && c <= p[2] && r >= p[1] && r <= p[3]);
    for (const R of info.rects((k, c, r) => k === 'H' && !skinned(c, r))) {
      const w = R.c1 - R.c0 + 1; const d = R.r1 - R.r0 + 1;
      const x = info.x(R.c0) + (w - 1) / 2; const z = info.z(R.r0) + (d - 1) / 2;
      const h = theme.cover.h;
      st.push(put(texBox(w - 0.05, h, d - 0.05, theme.cover.tex, theme.cover.color), x, h / 2, z));
      st.push(put(plainBox(w + 0.02, 0.1, d + 0.02, theme.cover.cap ?? PALETTE.slate), x, h - 0.05, z));
      ctx.physics.addStaticBox({ position: [x, h / 2, z], halfExtents: [w / 2, h / 2, d / 2] });
    }
    for (const [c0, r0, c1, r1, id, opt = {}] of coverProps) {
      const w = c1 - c0 + 1; const d = r1 - r0 + 1;
      const x = info.x(c0) + (w - 1) / 2; const z = info.z(r0) + (d - 1) / 2;
      const col = ctx.physics.addStaticBox({ position: [x, 0.5, z], halfExtents: [w / 2, 0.5, d / 2] });
      ctx.physics.tag(col, 'cover');
      const placed = id ? this.place(id, x, z, { collide: false, ...opt }) : null;
      this.coverObjs = this.coverObjs ?? [];
      this.coverObjs.push({ c0, r0, c1, r1, x, z, collider: col, obj: placed?.obj ?? null, broken: false, breakable: !!opt.breakable });
    }
  }

  /** The sea stops Max with an invisible wall that nothing else sees. */
  buildWaterWalls() {
    const { info, ctx } = this;
    for (const R of info.rects((k) => k === '~')) {
      const w = R.c1 - R.c0 + 1; const d = R.r1 - R.r0 + 1;
      const x = info.x(R.c0) + (w - 1) / 2; const z = info.z(R.r0) + (d - 1) / 2;
      const col = ctx.physics.addStaticBox({ position: [x, 3, z], halfExtents: [w / 2, 3.2, d / 2] });
      ctx.physics.tag(col, 'noCamera', 'water');
    }
  }

  /** Doorways: two plank leaves on pivots and a collider until kicked. */
  buildDoors() {
    const { info, ctx } = this;
    let n = 0;
    for (const g of info.groups('D')) {
      const span = Math.max(g.c1 - g.c0, g.r1 - g.r0) + 1;
      const alongX = g.c1 > g.c0 || (g.c1 === g.c0 && g.r1 === g.r0 && '#T'.includes(info.ch(g.c0 - 1, g.r0)));
      const x = info.x(g.c0) + (g.c1 - g.c0) / 2; const z = info.z(g.r0) + (g.r1 - g.r0) / 2;
      const root = new Group();
      root.position.set(x, 0, z);
      if (!alongX) root.rotation.y = Math.PI / 2;
      ctx.scene.add(root);
      const h = 2.4;
      const leaves = [];
      const mat = texMat('planks');
      for (const side of [-1, 1]) {
        const pivot = new Group();
        pivot.position.set((side * span) / 2, 0, 0);
        const leaf = new Mesh(new BoxGeometry(span / 2 - 0.02, h, 0.12), mat);
        leaf.position.set((-side * span) / 4, h / 2, 0);
        leaf.castShadow = true;
        pivot.add(leaf);
        for (const y of [0.5, 1.9]) {
          const strap = new Mesh(new BoxGeometry(span / 2 - 0.1, 0.1, 0.15), toonMaterial(PALETTE.ink));
          strap.position.set((-side * span) / 4, y, 0);
          pivot.add(strap);
        }
        root.add(pivot);
        leaves.push({ pivot, side });
      }
      // Frame, flush with the wall.
      const wallH = this.theme.walls[info.ch(g.c0 - (alongX ? 1 : 0), g.r0 - (alongX ? 0 : 1))]?.h ?? 3;
      const lintelH = Math.max(0.2, Math.min(wallH, 7) - h);
      const lintel = texBox(span, lintelH, 1, this.theme.walls[info.ch(g.c0 - (alongX ? 1 : 0), g.r0 - (alongX ? 0 : 1))]?.tex ?? 'dry-stone');
      if (alongX) lintel.position.set(x, h + lintelH / 2, z); else { lintel.rotation.y = Math.PI / 2; lintel.position.set(x, h + lintelH / 2, z); }
      lintel.castShadow = true;
      ctx.scene.add(lintel);
      const half = alongX ? [span / 2, 1.6, 0.14] : [0.14, 1.6, span / 2];
      const collider = ctx.physics.addStaticBox({ position: [x, 1.6, z], halfExtents: half });
      ctx.physics.tag(collider, 'door');
      const door = { id: n++, kind: 'door', ...g, x, z, alongX, span, collider, leaves, root, open: false, broken: false, hp: 6, barricade: 0, locked: false, floor: 0 };
      this.doors.push(door);
      for (const [c, r] of g.cells) this.bySpot.set(`D${c},${r}`, door);
    }
  }

  doorAt(c, r) { return this.bySpot.get(`D${c},${r}`) ?? null; }

  /** Swing a door open. `by` is where from: leaves swing away. */
  openDoor(door, fromX, fromZ, { kicked = false } = {}) {
    const { ctx } = this;
    if (door.open) return false;
    door.open = true;
    ctx.physics.remove(door.collider);
    door.collider = null;
    const dir = door.alongX ? Math.sign(door.z - fromZ) || 1 : Math.sign(door.x - fromX) || 1;
    const ang = (dir * (kicked ? 1.65 : 1.45));
    for (const l of door.leaves) ctx.tweens.to(l.pivot.rotation, { y: l.side * ang }, { duration: kicked ? 0.18 : 0.4, ease: 'outBack' });
    return true;
  }

  buildWindows() {
    const { info, ctx } = this;
    for (const [c, r] of info.find('W')) this.addWindow(c, r, 0, info);
  }

  addWindow(c, r, floor, map, offset = [0, 0], y0 = 0) {
    const { ctx } = this;
    const info = this.info;
    const wc = c + offset[0]; const wr = r + offset[1];
    const left = map.ch(c - 1, r); const right = map.ch(c + 1, r);
    const alongX = '#TWE'.includes(left) || '#TWE'.includes(right);
    const x = info.x(wc); const z = info.z(wr);
    const root = new Group();
    root.position.set(x, y0, z);
    if (!alongX) root.rotation.y = Math.PI / 2;
    ctx.scene.add(root);
    const wall = texBox(1, 0.9, 1, this.theme.walls.T.tex);
    wall.position.y = 0.45; wall.castShadow = true; root.add(wall);
    const sill = plainBox(1.04, 0.08, 1.06, PALETTE.ink); sill.position.y = 0.94; root.add(sill);
    const top = texBox(1, 0.7, 1, this.theme.walls.T.tex); top.position.y = 2.65; top.castShadow = true; root.add(top);
    const lintel = plainBox(1.04, 0.08, 1.06, PALETTE.ink); lintel.position.y = 2.28; root.add(lintel);
    const glass = new Group();
    const pane = new Mesh(new BoxGeometry(0.92, 1.28, 0.03), toonMaterial(PALETTE.orange));
    pane.material = glowMaterial(floor === 0 ? PALETTE.sand : PALETTE.orange);
    pane.position.y = 1.62; glass.add(pane);
    for (const [bx, by, bw, bh] of [[0, 1.62, 0.07, 1.28], [0, 1.62, 0.92, 0.07]]) {
      const bar = plainBox(bw, bh, 0.05, PALETTE.ink); bar.position.set(bx, by, 0); glass.add(bar);
    }
    root.add(glass);
    const half = alongX ? [0.5, 1.6, 0.25] : [0.25, 1.6, 0.5];
    const col = ctx.physics.addStaticBox({ position: [x, y0 + 1.6, z], halfExtents: half });
    ctx.physics.tag(col, 'window', 'noBullet');
    const w = { kind: 'window', c: wc, r: wr, x, z, alongX, broken: false, glass, floor, collider: col, y0 };
    this.windows.push(w);
    this.bySpot.set(`W${floor}:${wc},${wr}`, w);
    return w;
  }
  windowAt(c, r, floor = 0) { return this.bySpot.get(`W${floor}:${c},${r}`) ?? null; }

  buildGates(gateModel = 'portcullis') {
    const { info, ctx } = this;
    for (const g of info.groups('G')) {
      const w = g.c1 - g.c0 + 1; const d = g.r1 - g.r0 + 1;
      const x = info.x(g.c0) + (w - 1) / 2; const z = info.z(g.r0) + (d - 1) / 2;
      const alongX = w >= d;
      const span = alongX ? w : d;
      const b = buildModel(gateModel, { catalog: MODELS, params: { w: Math.min(3, span), h: 3.2 } });
      const obj = b.object;
      obj.position.set(x, 0, z);
      if (!alongX) obj.rotation.y = Math.PI / 2;
      if (span > 3) obj.scale.x = span / 3;
      ctx.scene.add(obj);
      const col = ctx.physics.addStaticBox({ position: [x, 2, z], halfExtents: [w / 2, 2, d / 2] });
      ctx.physics.tag(col, 'gate');
      const gate = { kind: 'gate', ...g, x, z, obj, collider: col, open: false, alongX };
      this.gates.push(gate);
      for (const [c, r] of g.cells) this.bySpot.set(`G${c},${r}`, gate);
    }
  }

  openGate(gate, { silent = false, navAll = true } = {}) {
    if (gate.open) return;
    gate.open = true;
    const { ctx, nav } = this;
    ctx.physics.remove(gate.collider);
    gate.collider = null;
    if (!silent) { ctx.audio.play('gateOpen'); ctx.engine.shake.add(0.25); }
    ctx.tweens.to(gate.obj.position, { y: 3.6 }, { duration: silent ? 0.01 : 2.2, ease: 'inOutSine' });
    for (const [c, r] of gate.cells) nav.setOpen(c, r, true);
    this.onNavChange?.();
  }

  /** Shut again: the collider, the grid and the portcullis all come back. */
  closeGate(gate, { silent = false } = {}) {
    if (!gate.open) return;
    gate.open = false;
    const { ctx, nav } = this;
    const w = gate.c1 - gate.c0 + 1; const d = gate.r1 - gate.r0 + 1;
    gate.collider = ctx.physics.addStaticBox({ position: [gate.x, 2, gate.z], halfExtents: [w / 2, 2, d / 2] });
    ctx.physics.tag(gate.collider, 'gate');
    if (!silent) { ctx.audio.play('gateShut'); ctx.engine.shake.add(0.25); }
    ctx.tweens.to(gate.obj.position, { y: 0 }, { duration: silent ? 0.01 : 0.5, ease: 'inOutSine' });
    for (const [c, r] of gate.cells) nav.setOpen(c, r, false);
    this.onNavChange?.();
  }

  buildShutters() {
    const { info, ctx } = this;
    for (const g of info.groups('S')) {
      const w = g.c1 - g.c0 + 1; const d = g.r1 - g.r0 + 1;
      const x = info.x(g.c0) + (w - 1) / 2; const z = info.z(g.r0) + (d - 1) / 2;
      const b = buildModel('roll-shutter', { catalog: MODELS, params: { w: Math.min(6, w) } });
      b.object.position.set(x, 0, z);
      ctx.scene.add(b.object);
      const col = ctx.physics.addStaticBox({ position: [x, 1.6, z], halfExtents: [w / 2, 1.6, d / 2] });
      const s = { kind: 'shutter', ...g, x, z, obj: b.object, slats: b.object.getObjectByName('Slats'), collider: col, open: false, progress: 0 };
      this.shutters.push(s);
    }
  }
  setShutter(s, frac) {
    s.progress = frac;
    if (s.slats) { s.slats.position.y = frac * 2.9; s.slats.scale.y = Math.max(0.03, 1 - frac * 0.97); }
    if (frac >= 1 && !s.open) {
      s.open = true;
      this.ctx.physics.remove(s.collider);
      s.collider = null;
      for (const [c, r] of s.cells) this.nav.setOpen(c, r, true);
      this.onNavChange?.();
    }
  }

  buildCrates(brine) {
    const { info, ctx } = this;
    let n = 0;
    for (const [c, r] of info.find('B')) {
      const x = info.x(c); const z = info.z(r);
      const isBrine = brine.some(([bc, br]) => bc === c && br === r);
      this.addBreakable(c, r, x, z, isBrine ? 'brine' : (n % 3 === 2 ? 'barrel' : 'crate'), n++);
    }
    for (const [c, r] of brine) if (info.ch(c, r) !== 'B') this.addBreakable(c, r, info.x(c), info.z(r), 'brine', n++);
  }

  /** A breakable at a spot. Solid until broken; crates keep nav closed if they were a `B` cell. */
  addBreakable(c, r, x, z, kind, n = 0) {
    const { ctx } = this;
    const id = kind === 'brine' ? 'brine-barrel' : kind === 'barrel' ? 'barrel' : 'crate';
    const b = buildModel(id, { catalog: MODELS });
    b.object.position.set(x, 0, z);
    b.object.rotation.y = n * 0.7;
    setLookLayer(b.object, 'actors');
    b.object.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    ctx.scene.add(b.object);
    const col = ctx.physics.addStaticBox({ position: [x, 0.42, z], halfExtents: [0.38, 0.42, 0.38] });
    ctx.physics.tag(col, 'noCamera', 'crate');
    const crate = { kind, c, r, x, z, obj: b.object, collider: col, broken: false, id: n };
    this.nav.setOpen(c, r, false);
    this.crates.push(crate);
    this.bySpot.set(`C${c},${r}`, crate);
    return crate;
  }

  buildMarkers() {
    const { info, ctx } = this;
    this.starts = info.find('a');
    this.spawnDoors = {};
    for (const n of '12345') { const s = info.find(n)[0]; if (s) this.spawnDoors[n] = [info.x(s[0]), info.z(s[1])]; }
  }

  buildBelts(list) {
    const { info, ctx } = this;
    for (const R of info.rects((k) => k === 'c')) {
      const w = R.c1 - R.c0 + 1; const d = R.r1 - R.r0 + 1;
      const x = info.x(R.c0) + (w - 1) / 2; const z = info.z(R.r0) + (d - 1) / 2;
      const spec = list.find((b) => R.r0 >= b.r0 && R.r0 <= b.r1) ?? { v: [1.5, 0] };
      const speed = spec.v[0];
      const mat = beltMaterial(PALETTE.slate, PALETTE.night, { length: 1, speed: 0, pitch: 1, along: 'u' });
      const g = new PlaneGeometry(w, d).rotateX(-Math.PI / 2);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d);
      const m = new Mesh(g, mat);
      m.position.set(x, 0.03, z);
      m.receiveShadow = true;
      ctx.scene.add(m);
      mat.speed = speed;
      this.belts.push({ ...R, v: spec.v, mat });
      for (let px = x - w / 2 + 1; px < x + w / 2; px += 3) this.place('belt-frame', px, z, { collide: false, y: -0.15, turn: 0 });
    }
  }
  beltAt(x, z) {
    const { info } = this;
    if (info.at(x, z) !== 'c') return null;
    const c = info.col(x); const r = info.row(z);
    return this.belts.find((b) => c >= b.c0 && c <= b.c1 && r >= b.r0 && r <= b.r1) ?? null;
  }

  addRoof([c0, r0, c1, r1, wallH = 3, pitch = 34, tile]) {
    const { info, ctx } = this;
    const w = c1 - c0 + 1; const d = r1 - r0 + 1;
    const x = info.x(c0) + (w - 1) / 2; const z = info.z(r0) + (d - 1) / 2;
    const useW = Math.min(10, w); const useD = Math.min(8, d);
    const b = buildModel('roof', { catalog: MODELS, params: { width: useW, depth: useD, pitch }, palette: tile ?? { tile: 'night', tile2: 'plum' } });
    b.object.scale.set(w / useW, 1, d / useD);
    b.object.position.set(x, wallH, z);
    b.object.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    ctx.scene.add(b.object);
    return b;
  }

  /** Place a model. Colliders are tagged noCamera so the camera never catches on a prop. */
  place(id, x, z, o = {}) {
    const { y = 0, turn = 0, params, palette, seed, scale, collide = true, light, actor = false, shadow = true } = o;
    const { ctx } = this;
    const b = buildModel(id, { catalog: MODELS, params, palette, seed, light });
    const obj = b.object;
    obj.position.set(x, y, z);
    obj.rotation.y = (turn * Math.PI) / 180;
    if (scale) obj.scale.setScalar(scale);
    obj.traverse((m) => { if (m.isMesh) { m.castShadow = shadow; m.receiveShadow = true; } });
    if (actor) setLookLayer(obj, 'actors');
    ctx.scene.add(obj);
    obj.updateMatrixWorld(true);
    if (collide && !scale) {
      for (const c of addModelColliders(ctx.physics, b, [x, y, z], obj.rotation.y)) ctx.physics.tag(c, 'noCamera', 'prop');
      if (y < 0.5 && !o.noNav) this.closeNavUnder(b, x, z, obj.rotation.y);
    }
    if (b.light) this.lights.push(ctx.lights.request({ ...b.light, position: obj.localToWorld(new THREE.Vector3(...b.light.at)) }));
    this.props.push({ id, obj, build: b });
    return { obj, build: b };
  }

  /** Solid props close the nav cells under them, so nobody walks through a well. */
  closeNavUnder(b, x, z, yaw) {
    const { nav, info } = this;
    const cos = Math.abs(Math.cos(yaw)); const sin = Math.abs(Math.sin(yaw));
    for (const c of b.colliders) {
      let hx = 0.2; let hz = 0.2; let cx = 0; let cz = 0;
      if (c.kind === 'box') { hx = c.half[0]; hz = c.half[2]; cx = c.center[0]; cz = c.center[2]; }
      else if (c.kind === 'cyl') { hx = c.radius; hz = c.radius; cx = c.center[0]; cz = c.center[2]; }
      else continue;
      if (Math.max(hx, hz) < 0.06) continue;
      const wx = x + cx * Math.cos(yaw) + cz * Math.sin(yaw);
      const wz = z - cx * Math.sin(yaw) + cz * Math.cos(yaw);
      const ax = hx * cos + hz * sin; const az = hx * sin + hz * cos;
      for (let col = info.col(wx - ax); col <= info.col(wx + ax); col++) {
        for (let row = info.row(wz - az); row <= info.row(wz + az); row++) {
          const px = info.x(col); const pz = info.z(row);
          const overlapX = Math.min(px + 0.5, wx + ax) - Math.max(px - 0.5, wx - ax);
          const overlapZ = Math.min(pz + 0.5, wz + az) - Math.max(pz - 0.5, wz - az);
          if (overlapX > 0 && overlapZ > 0 && overlapX * overlapZ > 0.012) nav.setOpen(col, row, false);
        }
      }
    }
  }

  /** A skinned low wall goes: it's thrown, or smashed. Nav opens behind it. */
  breakCover(cv) {
    if (cv.broken) return;
    cv.broken = true;
    this.ctx.physics.remove(cv.collider);
    cv.collider = null;
    if (cv.obj) cv.obj.visible = false;
    for (let r = cv.r0; r <= cv.r1; r++) for (let c = cv.c0; c <= cv.c1; c++) this.nav.setOpen(c, r, true);
    this.ctx.particles.burst('chips', [cv.x, 0.6, cv.z], { count: 30 });
    this.ctx.audio.play('crate');
  }

  /** Place by map cell. */
  placeAt(id, c, r, o = {}) { return this.place(id, this.info.x(c), this.info.z(r), o); }

  // ---- Upper floors ----
  /** A floor above the map at height y: its own map (offset into the world), walls, windows, nav. */
  buildUpper(mapName, offset, y, theme = {}) {
    const { ctx, static: st } = this;
    const map = new MapInfo(mapName);
    const info = this.info;
    const nav = NavGrid.fromRows(map.rows, { cell: 1, origin: [info.x(offset[0]) - 0.5, 0, info.z(offset[1]) - 0.5], blocked: '#T~HBSGEWL'.replace('L', '') });
    const wx = (c) => info.x(c + offset[0]); const wz = (r) => info.z(r + offset[1]);
    const wallTex = theme.tex ?? this.theme.walls.T.tex;
    // The floor slab (and its underside is the ceiling below).
    const w = map.w; const d = map.h;
    const fx = wx(0) + (w - 1) / 2; const fz = wz(0) + (d - 1) / 2;
    const slab = texBox(w, 0.2, d, this.theme.floors[':'] ?? 'rough-boards');
    st.push(put(slab, fx, y - 0.1, fz));
    ctx.physics.addStaticBox({ position: [fx, y - 0.1, fz], halfExtents: [w / 2, 0.1, d / 2] });
    for (const R of map.rects((k) => k === 'T')) {
      const rw = R.c1 - R.c0 + 1; const rd = R.r1 - R.r0 + 1;
      const x = wx(R.c0) + (rw - 1) / 2; const z = wz(R.r0) + (rd - 1) / 2;
      const h = 3;
      st.push(put(texBox(rw, h, rd, wallTex), x, y + h / 2, z));
      st.push(put(plainBox(rw + 0.06, 0.12, rd + 0.06, PALETTE.ink), x, y + h - 0.06, z));
      st.push(put(plainBox(rw + 0.06, 0.12, rd + 0.06, PALETTE.ink), x, y + 0.06, z));
      if (rw >= rd) for (let px = x - rw / 2 + 0.1; px < x + rw / 2; px += 2.5) st.push(put(plainBox(0.16, h, rd + 0.06, PALETTE.ink), px, y + h / 2, z));
      else for (let pz = z - rd / 2 + 0.1; pz < z + rd / 2; pz += 2.5) st.push(put(plainBox(rw + 0.06, h, 0.16, PALETTE.ink), x, y + h / 2, pz));
      ctx.physics.addStaticBox({ position: [x, y + h / 2, z], halfExtents: [rw / 2, h / 2, rd / 2] });
    }
    for (const [c, r] of map.find('W')) this.addWindow(c, r, 1, map, offset, y);
    const eLinks = map.find('E').map(([c, r]) => ({ c: c + offset[0], r: r + offset[1], x: wx(c), z: wz(r) }));
    const eWalls = [];
    for (const e of eLinks) {
      // An E cell is a wall opening at floor height: a window-sized gap Max can't walk through.
      const col = ctx.physics.addStaticBox({ position: [e.x, y + 1.5, e.z], halfExtents: [0.5, 1.5, 0.5] });
      ctx.physics.tag(col, 'noBullet');
      eWalls.push(col);
    }
    this.upper = { map, offset, y, nav, wx, wz, eLinks, eWalls };
    return this.upper;
  }
}

/** Cell helpers usable from anywhere. */
export { FLOOR_CHARS };
