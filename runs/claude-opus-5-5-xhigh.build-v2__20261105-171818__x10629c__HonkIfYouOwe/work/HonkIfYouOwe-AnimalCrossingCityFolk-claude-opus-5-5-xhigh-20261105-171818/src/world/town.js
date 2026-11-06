// The village as a place: terrain, buildings, water, forest ring, lamps, and the live objects on it.
import { THREE, buildModel, toonMaterial, PALETTE, mergeStaticMeshes, WaterSurface, WAVES_CALM, swayMaterial, WindUniforms, setLookLayer, textureMap, NavGrid, Decals, glowMaterial } from '../engine.js';
import { Place } from './place.js';
import { TownTerrain } from './terrainMesh.js';
import { COLS, ROWS, tileChar, tileInfo, groundHeight, key } from './tiles.js';
import { BUILDINGS, LAMPS, BENCHES, LANDMARKS, COTTAGE_DECO } from '../data/town.js';
import { MODELS, letters } from '../art/models.js';
import { Stream } from '../core/rng.js';

const { BoxGeometry, Group, Mesh, Vector3, PlaneGeometry } = THREE;

export const BLOSSOM = 0xf5a6c0;
export const SEASON_LEAF = [
  { leaf: 'white', leaf2: 'white', blossom: true },
  { leaf: 'green', leaf2: 'lime' },
  { leaf: 'orange', leaf2: 'red' },
  { leaf: 'white', leaf2: 'mist' },
];
const LEAF_LIME = { leaf: 'lime', leaf2: 'green' };
export const leafFor = (season, calendarDay, kind) => {
  if (kind === 'pine') return season === 3 ? { leaf: 'white', leaf2: 'teal' } : season === 2 ? { leaf: 'teal', leaf2: 'green' } : { leaf: 'teal', leaf2: 'green' };
  if (kind === 'palm') return season === 3 ? { leaf: 'teal', leaf2: 'white' } : season === 2 ? { leaf: 'green', leaf2: 'sand' } : { leaf: 'green', leaf2: 'lime' };
  if (season === 0 && calendarDay > 2) return LEAF_LIME;
  return SEASON_LEAF[season];
};

const swayCache = new Map();
export function swayify(obj, wind, height, base, amount, phase) {
  const bucket = Math.floor(((phase % 6.283) + 6.283) % 6.283 / 1.6);
  obj.traverse((m) => {
    if (!m.isMesh) return;
    const hex = m.material.color?.getHex?.() ?? 0;
    const glow = !m.material.isMeshToonNodeMaterial && !m.material.isMeshToonMaterial;
    const k = `${hex}:${bucket}:${height}:${glow}`;
    let sm = swayCache.get(k);
    if (!sm) { sm = swayMaterial(m.material, wind, { height, base, amount, phase: bucket * 1.6 }); swayCache.set(k, sm); }
    m.material = sm;
  });
}
const replaceColor = (obj, hex, to) => obj.traverse((m) => { if (m.isMesh && m.material?.color?.getHex?.() === hex) m.material = to; });

export class TownPlace extends Place {
  constructor(g) {
    super('town', 'town', { name: 'The Village' });
    this.g = g;
    this.solid = new Uint8Array(COLS * ROWS);
    this.wind = new WindUniforms();
    this.windTime = 0;
    this.lamps = [];
    this.lit = [];
    this.buildings = new Map();
    this.seasonBuilt = -1;
    this.occluders = [];
    this.smokeAt = [];
    this.smokeT = 0;
    this.terrain = new TownTerrain((x, z, info) => (info.surface === 'lawn' && this.g.world?.town.worn[`${x},${z}`] ? 'worn' : info.surface));
    this.group.add(this.terrain.group);
    this.statics = new Group();
    this.group.add(this.statics);
    this.ringGroup = new Group();
    this.group.add(this.ringGroup);
    this.objectsGroup = new Group();
    this.group.add(this.objectsGroup);
    this.movers = new Group();
    this.group.add(this.movers);
    this.objectViews = new Map();
    this.dirty = new Set();
    this.buildWater();
    this.buildStatics();
    this.buildBaseGrid();
    this.nav = new NavGrid(COLS, ROWS, { cell: 1, origin: [0, 0, 0] });
    this.decals = new Decals(this.group, { capacity: 200 });
    this.syncNav();
  }
  buildBaseGrid() {
    for (let z = 0; z < ROWS; z++) for (let x = 0; x < COLS; x++) this.solid[z * COLS + x] = tileInfo(tileChar(x, z)).walk ? 0 : 1;
    for (const b of BUILDINGS) for (let z = b.z; z < b.z + b.d; z++) for (let x = b.x; x < b.x + b.w; x++) this.solid[z * COLS + x] = 1;
    for (const [x, z] of [...LAMPS, ...BENCHES.filter((b) => b[2] !== false)]) this.solid[Math.floor(z) * COLS + Math.floor(x)] = 1;
    // Landmarks with a body
    for (const name of ['oldBell', 'noticeBoard', 'mailbox', 'lighthouse']) { const [x, z] = LANDMARKS[name]; this.solid[Math.floor(z) * COLS + Math.floor(x)] = 1; }
    const [px, pz] = LANDMARKS.oldPear;
    for (let z = pz - 1; z <= pz; z++) for (let x = px - 1; x <= px; x++) this.solid[z * COLS + x] = 1;
    const [lx, lz] = LANDMARKS.lighthouse;
    for (let z = Math.floor(lz) - 1; z <= Math.floor(lz) + 1; z++) for (let x = Math.floor(lx) - 1; x <= Math.floor(lx) + 1; x++) this.solid[z * COLS + x] = 1;
    // Bus shelter
    for (let x = 6; x <= 11; x++) this.solid[25 * COLS + x] = 1;
    this.baseSolid = this.solid.slice();
  }
  syncNav() {
    for (let z = 0; z < ROWS; z++) for (let x = 0; x < COLS; x++) this.nav.setOpen(x, z, !this.solid[z * COLS + x] && !this.objectBlocks(x, z));
  }
  objectBlocks(x, z) {
    const o = this.g.world?.town.objects[`${x},${z}`];
    return !!o && SOLID_KINDS.has(o.k);
  }
  /** Is the point inside something solid? */
  blocked(x, z) {
    const tx = Math.floor(x), tz = Math.floor(z);
    if (tx < 0 || tz < 0 || tx >= COLS || tz >= ROWS) return true;
    if (this.g.noclip) return false;
    return this.solid[tz * COLS + tx] === 1 || this.objectBlocks(tx, tz);
  }
  height(x, z) { return groundHeight(x, z); }
  surfaceAt(x, z) {
    const info = tileInfo(tileChar(Math.floor(x), Math.floor(z)));
    const s = info.surface;
    if (s === 'dock') return 'stepWood';
    if (s === 'sand') return 'stepSand';
    if (s === 'plaza' || s === 'cliff') return 'stepStone';
    if (s === 'path') return this.g.season === 3 ? 'stepSnow' : 'stepPath';
    return this.g.season === 3 ? 'stepSnow' : 'stepGrass';
  }
  // ---- static art ---------------------------------------------------------------------------------
  buildWater() {
    this.water = new WaterSurface({ size: [180, 140], at: [40, -0.34, 44], segments: [180, 140], waves: WAVES_CALM, deep: PALETTE.blue, shallow: PALETTE.sky, foam: PALETTE.white, foamAt: 0.3 });
    this.water.receiveShadow = false;
    this.group.add(this.water);
    this.pool = new WaterSurface({ size: [13, 14], at: [40, 1.5, 8.5], segments: [26, 28], waves: WAVES_CALM, deep: PALETTE.blue, shallow: PALETTE.sky, foam: PALETTE.white, foamAt: 0.3 });
    this.group.add(this.pool);
  }
  place(id, at, opts = {}) {
    const { turn = 0, group = this.statics, solidAs, ...rest } = opts;
    const b = buildModel(id, { catalog: MODELS, ...rest });
    const o = b.object;
    o.position.set(at[0], at[1] ?? 0, at[2]);
    o.rotation.y = (turn * Math.PI) / 180;
    o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    group.add(o);
    return o;
  }
  buildStatics() {
    // Back wall of the valley
    const tex = textureMap('cliff-warm');
    const wall = new Mesh(new BoxGeometry(150, 12, 24), toonMaterial(PALETTE.white, { map: tex }));
    wall.geometry.attributes.uv.array.forEach((v, i, uv) => { uv[i] = v * (i % 2 ? 3 : 36); });
    wall.position.set(40, 7, -12);
    this.statics.add(wall);
    const top = new Mesh(new BoxGeometry(150, 0.6, 30), toonMaterial(PALETTE.teal));
    top.position.set(40, 13, -12);
    this.statics.add(top);
    // Waterfalls
    this.fallTop = this.place('waterfall', [40, 1.4, 2.8], { params: { width: 4, height: 11 } });
    this.fallLow = this.place('waterfall', [40, -0.3, 16.08], { params: { width: 4, height: 2.3 } });
    // Forest ring ground: a broad apron so no edge shows
    const apron = (x, z, w, d, c, y = -0.02) => { const m = new Mesh(new BoxGeometry(w, 0.2, d), toonMaterial(c)); m.position.set(x, y - 0.1, z); m.receiveShadow = true; return m; };
    this.aprons = [apron(-20, 29, 40, 58, PALETTE.green), apron(100, 29, 40, 58, PALETTE.green), apron(-20, 8, 40, 16, PALETTE.green, 2), apron(100, 8, 40, 16, PALETTE.green, 2)];
    for (const a of this.aprons) this.statics.add(a);
    // Headlands either side of the beach
    this.headlands = [apron(-20, 54, 40, 12, PALETTE.sand), apron(100, 54, 40, 12, PALETTE.sand)];
    for (const a of this.headlands) this.statics.add(a);
    // Fixed furniture
    for (const [x, z] of LAMPS) {
      const y = groundHeight(x, z);
      const o = this.place('lamp-post', [x, y, z], { light: { intensity: 0 } });
      this.lamps.push({ x, z, y: y + 2.05, handle: null, o });
    }
    for (const [x, z] of BENCHES) this.place('park-bench', [x, groundHeight(x, z), z], {});
    const [nx, nz] = LANDMARKS.noticeBoard;
    this.place('notice-board', [nx, 0, nz], { params: { notes: 6 } });
    const [bx, bz] = LANDMARKS.oldBell;
    this.bell = this.place('old-bell', [bx, 0, bz], {});
    this.bellPivot = this.bell.getObjectByName('bell');
    this.oldPear = null;
    this.mailbox = this.place('mailbox', [LANDMARKS.mailbox[0], 0, LANDMARKS.mailbox[1]], { turn: -20 });
    this.mailFlag = this.mailbox.getObjectByName('flag');
    this.lighthouse = this.place('b-lighthouse', [LANDMARKS.lighthouse[0], 0, LANDMARKS.lighthouse[1]], {});
    this.lighthouseBeam = this.lighthouse.getObjectByName('beam');
    this.place('bus-shelter', [8.5, 0, 25.6], {});
    // Bridge rails
    this.place('bridge-rails', [39.5, 0.04, 25], { params: { length: 4.4, width: 2.2 } });
    this.place('bridge-rails', [43.5, 0.04, 39], { params: { length: 4.4, width: 2.2 } });
    this.place('bridge-rails', [39.5, 2.04, 13], { params: { length: 4.4, width: 2.2 } });
    // Dock posts
    for (const [x, z] of [[22.9, 57], [25.1, 57], [22.9, 60], [25.1, 60], [22.9, 62.8], [25.1, 62.8]]) {
      const post = new Mesh(new BoxGeometry(0.22, 1.6, 0.22), toonMaterial(PALETTE.plum));
      post.position.set(x, -0.3, z);
      this.statics.add(post);
    }
    this.place('rowboat-prop', [20.5, -0.3, 58.5], { turn: 20 });
    // Laundry line between two poles near Yolanda's
    for (const x of [69, 75]) { const p = new Mesh(new BoxGeometry(0.1, 1.9, 0.1), toonMaterial(PALETTE.plum)); p.position.set(x, 0.95, 48.5); this.statics.add(p); }
    const line = new Mesh(new BoxGeometry(6, 0.03, 0.03), toonMaterial(PALETTE.white)); line.position.set(72, 1.8, 48.5); this.statics.add(line);
    this.laundry = [];
    [[70, 'red'], [71, 'white'], [72.2, 'sky'], [73.4, 'sand']].forEach(([x, c]) => { const l = new Mesh(new BoxGeometry(0.6, 0.6, 0.04), toonMaterial(PALETTE[c])); l.position.set(x, 1.5, 48.5); this.statics.add(l); this.laundry.push(l); });
    // Buildings
    for (const b of BUILDINGS) this.buildBuilding(b);
  }
  buildBuilding(b) {
    const old = this.buildings.get(b.id);
    if (old) { old.object.removeFromParent(); this.occluders = this.occluders.filter((o) => o.object !== old.object); }
    const w = this.g.world;
    let id = b.model;
    let palette;
    if (b.model === 'home') {
      id = `home-${w?.player.homeTier ?? 1}`;
      palette = { wall: w?.home.wallColor ?? 'orange', roof: w?.home.roofColor ?? 'slate' };
    } else if (b.model === 'b-store') {
      id = `store-${w?.store.tier ?? 1}`;
    } else if (b.model === 'cottage') {
      palette = { wall: b.wall, roof: b.roof };
    }
    const obj = this.place(id, [b.x + b.w / 2, groundHeight(b.x + 0.5, b.z + 0.5), b.z + b.d / 2], { palette });
    const entry = { b, object: obj, lit: obj.getObjectByName('lit'), door: obj.getObjectByName('door'), flag: obj.getObjectByName('flag') };
    if (entry.lit) entry.lit.visible = false;
    this.buildings.set(b.id, entry);
    this.occluders.push({ object: obj, min: new Vector3(b.x, 0, b.z), max: new Vector3(b.x + b.w, 5, b.z + b.d) });
    // chimney smoke for cottages
    if (b.model === 'cottage' || b.model === 'home') this.smokeAt.push({ id: b.id, x: b.x + b.w / 2 + 1.3, y: 3.8, z: b.z + b.d / 2 - 0.7 });
    for (const [m, dx, dz, opts] of COTTAGE_DECO[b.id] ?? []) {
      const { scale, ...rest } = opts;
      const def = MODELS.get(m);
      const palette = rest.palette && def?.palette ? Object.fromEntries(Object.entries(rest.palette).filter(([k]) => k in def.palette)) : rest.palette;
      const o = this.place(m, [b.x + dx, 0, b.z + b.d + dz], { ...rest, palette, group: obj });
      o.position.set(dx - b.w / 2, 0, b.d / 2 + dz);
      if (scale) o.scale.setScalar(scale);
    }
    if (id === 'home-1') { const r = obj.getObjectByName('roofed'); if (r) r.visible = !!w?.flags?.shackRoof; }
  }
  refreshHome() {
    const b = BUILDINGS.find((x) => x.id === 'home');
    this.buildBuilding(b);
    this.applyLit(this.lastNight ?? 0);
  }
  refreshStore() { this.buildBuilding(BUILDINGS.find((x) => x.id === 'store')); this.applyLit(this.lastNight ?? 0); }
  /** Season and forest ring. Done under cover: rebuilds meshes. */
  setSeason(season, calendarDay) {
    const key2 = `${season}:${season === 0 && calendarDay > 2 ? 1 : 0}`;
    this.terrain.setSeason(season);
    this.frostWindows(season);
    if (this.seasonBuilt === key2) { this.viewsDirtyAll(); return; }
    this.seasonBuilt = key2;
    // apron colours
    const lawn = [PALETTE.lime, PALETTE.green, PALETTE.sand, PALETTE.white][season];
    for (const a of this.aprons) a.material = toonMaterial(lawn);
    for (const a of this.headlands) a.material = toonMaterial(season === 3 ? PALETTE.white : season === 2 ? PALETTE.white : PALETTE.sand);
    // Old Pear
    if (this.oldPear) this.oldPear.removeFromParent();
    const op = leafFor(season, calendarDay, 'pear');
    this.oldPear = this.place('old-pear', [LANDMARKS.oldPear[0], 0, LANDMARKS.oldPear[1]], { palette: { leaf: op.leaf, leaf2: op.leaf2 } });
    if (op.blossom) replaceColor(this.oldPear, PALETTE.white, toonMaterial(BLOSSOM));
    this.oldPearLights = this.oldPear.getObjectByName('lights');
    if (this.oldPearLights) this.oldPearLights.visible = !!this.g.world?.flags?.pearLit;
    this.oldPearFruit = this.oldPear.getObjectByName('fruit');
    if (this.oldPearFruit) this.oldPearFruit.visible = season !== 3;
    swayify(this.oldPear, this.wind, 7, 2.4, 0.03, 1);
    // Ring of deep forest
    this.ringGroup.clear();
    const parts = [];
    const rng = new Stream('ring');
    const addTree = (x, z, y) => {
      const kind = rng.chance(0.75) ? 'pine' : 'pear';
      const leaf = leafFor(season, calendarDay, kind);
      const b = buildModel(kind === 'pine' ? 'tree-pine' : 'tree-pear', { catalog: MODELS, palette: { leaf: leaf.leaf, leaf2: leaf.leaf2 } });
      const fruit = b.object.getObjectByName('fruit');
      if (fruit) fruit.visible = false;
      b.object.position.set(x + rng.range(-0.4, 0.4), y, z + rng.range(-0.4, 0.4));
      const s = rng.range(1.0, 1.6);
      b.object.scale.set(s, s, s);
      b.object.rotation.y = rng.range(0, 6);
      b.object.updateMatrixWorld(true);
      parts.push(b.object);
    };
    for (let z = -2; z < 50; z += 2) for (let ring = 0; ring < 7; ring++) {
      addTree(-0.5 - ring * 2.4, z, z < 15 ? 2 : 0);
      addTree(80.5 + ring * 2.4, z, z < 15 ? 2 : 0);
    }
    for (let x = 2; x < 78; x += 2) addTree(x, 0.5, 2);
    const merged = mergeStaticMeshes(parts, { castShadow: false, receiveShadow: false });
    for (const m of merged) {
      if (leafFor(season, calendarDay, 'pear').blossom && m.material.color?.getHex?.() === PALETTE.white) m.material = toonMaterial(BLOSSOM);
      this.ringGroup.add(m);
    }
    this.viewsDirtyAll();
  }
  /** Frost on the glass in winter. */
  frostWindows(season) {
    const glass = [PALETTE.navy, PALETTE.sky];
    const frost = toonMaterial(PALETTE.white);
    for (const e of this.buildings.values()) {
      e.object.traverse((m) => {
        if (!m.isMesh || m.parent?.name === 'lit') return;
        const hex = m.userData.glassBase ?? m.material?.color?.getHex?.();
        if (!glass.includes(hex)) return;
        if (!m.userData.glassMat) { m.userData.glassMat = m.material; m.userData.glassBase = hex; }
        m.material = season === 3 ? frost : m.userData.glassMat;
      });
    }
  }
  viewsDirtyAll() { for (const k of Object.keys(this.g.world?.town.objects ?? {})) this.dirty.add(k); }
  /** Lamps, windows and the lighthouse follow the sky. */
  applyLit(night) {
    this.lastNight = night;
    const on = night > 0.35;
    for (const e of this.buildings.values()) if (e.lit) e.lit.visible = on;
    if (on !== this.lampsOn) {
      this.lampsOn = on;
      const ctx = this.g.ctx;
      for (const l of this.lamps) {
        if (on && !l.handle && this.g.place === this) l.handle = ctx.lights.request({ position: [l.x + 0.2, l.y, l.z], color: 0xffcd75, intensity: 6, radius: 6.5, name: 'lamp' });
        else if (!on && l.handle) { l.handle.release(); l.handle = null; }
      }
    }
  }
  releaseLights() {
    for (const l of this.lamps) if (l.handle) { l.handle.release(); l.handle = null; }
    this.lampsOn = undefined;
  }
  update(dt, t) {
    this.water.update(t);
    this.pool.update(t);
    this.windTime = t;
    const w = this.g.windNow ?? 1.2;
    this.wind.update(t, [w, w * 0.4]);
    if (this.lighthouseBeam) this.lighthouseBeam.rotation.y = t * 0.7;
    for (const [i, l] of this.laundry.entries()) l.rotation.x = Math.sin(t * 1.6 + i) * 0.14 * Math.min(2, w);
    this.decals.update(dt);
  }
}
export const SOLID_KINDS = new Set(['tree', 'stump', 'sapling', 'rock', 'hole', 'snowman', 'beanstalk', 'patternSign']);
export { letters };
