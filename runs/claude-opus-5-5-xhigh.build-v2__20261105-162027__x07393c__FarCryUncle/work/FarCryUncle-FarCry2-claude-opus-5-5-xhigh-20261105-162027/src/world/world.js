// The Kettle on screen: terrain mesh and its paint, water, rails, bridges, sites, scatter, the nav grid.
import { THREE, Terrain, WaterSurface, WAVES_CALM, buildModel, addModelColliders, mergeStaticMeshes, setLookLayer, PALETTE, NavGrid, Rng, SpringChain, clothGrid, SoftMesh, toonMaterial, swayObject, WindUniforms } from '../../pixel-engine.js';
import { MODELS } from '../art/models.js';
import { Ground, K, CELLS, CELL, HALF, polyLength, pointAlong, distToPolyline } from './ground.js';
import { F, FN, FCELL, S } from './fire.js';
import { InstanceSet } from './instances.js';
import { ROADS, RAIL, RIVER, RIVER_Y, BRIDGES, RAIL_BRIDGE, STRIPS } from '../content/roads.js';
import { SITES, POSTS, TRIGS, CASES, HALTS } from '../content/sites.js';
import { hash2, clamp, smooth } from '../core/rng.js';
import { makePerson } from '../actors/rig.js';
const { Color, Vector3, Mesh, Group, Object3D } = THREE;

const col = (hex) => { const c = new Color(hex); return [c.r, c.g, c.b]; };
const P = Object.fromEntries(Object.entries(PALETTE).map(([k, v]) => [k, col(v)]));
const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const MIX = { redPlum: mixC(P.red, P.plum, 0.3), redOrange: mixC(P.red, P.orange, 0.25), orangePlum: mixC(P.orange, P.plum, 0.3) };
const _flagDir = new THREE.Vector3(), _flagX = new THREE.Vector3(1, 0, 0);
const DYNAMIC = new Set(['hut', 'boom-gate', 'post-cage', 'fuel-tank', 'oil-drum', 'table-lamp', 'bunker']);
const BURNS = new Set(['shack', 'hut', 'market-stall', 'clinic-tent', 'bar', 'schoolroom']);
export const EXPLOSIVE = { 'oil-drum': { radius: 4, damage: 90, hp: 30, fire: 5 }, 'fuel-tank': { radius: 13, damage: 300, hp: 80, fire: 14 }, bunker: { radius: 12, damage: 260, hp: 160, fire: 12 } };

export class World {
  explosives = []; trees = []; dirtyCols = new Set(); uploadT = 0; placed = []; byTag = new Map(); colliderTrees = []; cloths = []; flags = [];
  constructor(game) { this.game = game; this.ground = game.ground; }
  heightAt(x, z) { return this.land.heightAt(x, z); }
  build(ctx) {
    const { scene, physics } = ctx, g = this.game, ground = this.ground;
    this.land = new Terrain({ size: [1280, 1280], cells: [CELLS, CELLS] });
    const N = CELLS + 1;
    this.land.generate((x, z) => ground.h[Math.round((x + HALF) / CELL) + Math.round((z + HALF) / CELL) * N]);
    this.land.attach(physics);
    this.land.mesh.receiveShadow = true;
    scene.add(this.land.mesh);
    this.colors = this.land.mesh.geometry.getAttribute('color');
    this.baseColors = new Float32Array(CELLS * CELLS * 3);
    this.paintBase();
    this.buildWater(ctx);
    this.buildRails(ctx);
    this.buildBridges(ctx);
    this.buildSites(ctx);
    this.scatter(ctx);
    this.buildNav();
    // Paint fire events.
    const { fire } = g;
    fire.onBurnt = (id) => { this.paintFireCell(id, 'burnt'); g.grass.burnCell(id); this.burnTreesIn(id); g.fireView.onDone(id); };
    fire.onIgnite = (id, src) => { g.grass.burnCell(id); g.fireView.onIgnite(id); this.cookOff(id); g.events.emit('fire-lit', id, src); };
    fire.onRegrow = (id) => { this.paintFireCell(id, 'green'); g.grass.invalidateCell(id); };
    fire.onFresh = (id) => { this.paintFireCell(id, 'base'); this.unburnTreesIn(id); g.grass.invalidateCell(id); };
  }
  // ---- paint ----
  baseColorOf(ix, iz) {
    const k = this.ground.kind[ix + iz * CELLS], x = ix * CELL - HALF, z = iz * CELL - HALF;
    const h = hash2(ix, iz);
    const patch = this.ground.noise.n2(x * 0.018, z * 0.018);
    switch (k) {
      case K.GRASS: return patch + h * 0.5 > 0.42 ? P.orange : (h > 0.82 ? P.red : P.sand);
      case K.CROP: return h > 0.5 ? P.sand : P.orange;
      case K.WOOD: return h > 0.72 ? P.teal : (patch > 0 ? MIX.orangePlum : (h > 0.3 ? P.orange : P.sand));
      case K.BANK: return h > 0.35 ? P.green : P.teal;
      case K.ROAD: return h > 0.8 ? MIX.redPlum : P.red;
      case K.TRACK: return h > 0.5 ? P.red : P.plum;
      case K.RAIL: return h > 0.5 ? P.slate : P.night;
      case K.DIRT: return h > 0.86 ? MIX.redPlum : (h > 0.68 ? MIX.redOrange : P.red);
      case K.WATER: return P.navy;
      case K.ROCK: return h > 0.8 ? P.slate : P.plum;
      case K.SALT: return h > 0.22 ? P.white : P.mist;
      case K.MINE: return h > 0.6 ? P.slate : (h > 0.25 ? P.plum : P.night);
      default: return P.sand;
    }
  }
  setCell(ix, iz, c) {
    const base = 6 * (ix + iz * CELLS), a = this.colors;
    for (let k = 0; k < 6; k++) a.setXYZ(base + k, c[0], c[1], c[2]);
  }
  paintBase() {
    const a = this.baseColors;
    for (let iz = 0; iz < CELLS; iz++) for (let ix = 0; ix < CELLS; ix++) {
      const c = this.baseColorOf(ix, iz);
      a.set(c, (ix + iz * CELLS) * 3);
      this.setCell(ix, iz, c);
    }
    this.colors.clearUpdateRanges?.();
    this.colors.needsUpdate = true;
  }
  paintFireCell(id, mode) {
    const cx = id % FN, cz = (id / FN) | 0;
    for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) {
      const ix = cx * 2 + dx, iz = cz * 2 + dz;
      if (ix >= CELLS || iz >= CELLS) continue;
      const h = hash2(ix + 3, iz + 11);
      let c;
      if (mode === 'burnt') c = h > 0.7 ? P.slate : (h > 0.3 ? P.night : P.ink);
      else if (mode === 'green') c = h > 0.55 ? P.green : P.lime;
      else { const i = (ix + iz * CELLS) * 3; c = [this.baseColors[i], this.baseColors[i + 1], this.baseColors[i + 2]]; }
      this.setCell(ix, iz, c);
      this.dirtyRow(ix, iz);
    }
  }
  dirtyRow(ix, iz) { this.dirtyCols.add(ix + iz * CELLS); }
  flushPaint(dt) {
    this.uploadT -= dt;
    if (!this.dirtyCols.size || this.uploadT > 0) return;
    this.uploadT = 0.25;
    const a = this.colors;
    a.clearUpdateRanges?.();
    if (this.dirtyCols.size > 2000) { a.needsUpdate = true; this.dirtyCols.clear(); return; }
    for (const c of this.dirtyCols) a.addUpdateRange(c * 18, 18);
    a.needsUpdate = true;
    this.dirtyCols.clear();
  }
  // ---- static placement ----
  place(id, x, z, turnDeg = 0, { y, palette, seed, params, list, collide = true, scale } = {}) {
    const ctx = this.game.ctx;
    const yy = y ?? this.heightAt(x, z);
    const build = buildModel(id, { catalog: MODELS, palette, seed, params });
    const yaw = (turnDeg * Math.PI) / 180;
    build.object.position.set(x, yy, z);
    build.object.rotation.y = yaw;
    if (scale) build.object.scale.setScalar(scale);
    build.object.updateMatrixWorld(true);
    build.object.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    let colliders = [];
    if (collide) colliders = addModelColliders(ctx.physics, build, [x, yy, z], yaw);
    (list ?? this.placed).push(build.object);
    return { build, object: build.object, x, y: yy, z, yaw, colliders };
  }
  addDynamic(ctx, entry) { ctx.scene.add(entry.object); return entry; }
  placeSiteProps(ctx, site, statics) {
    for (const [id, dx, dz, turn, opts] of site.props) {
      const x = site.at[0] + dx, z = site.at[1] + dz;
      const dyn = DYNAMIC.has(id);
      const e = this.place(id, x, z, turn, { ...opts, list: dyn ? [] : statics });
      if (dyn) this.addDynamic(ctx, e);
      if (EXPLOSIVE[id]) { const ex = this.addExplosive(id, e); if (id === 'bunker') { ex.tag = 'ammo-bunker'; this.game.fire.setFuel(x, z, F.BUILDING); } else this.game.fire.setFuel(x, z, F.BUILDING); }
      if (BURNS.has(id)) this.game.fire.setFuel(x, z, F.BUILDING);
      e.id = id; e.site = site;
      if (id === 'flag-pole' && this.game.views) this.addFlag(ctx, e, site);
      if (!this.byTag.has(id)) this.byTag.set(id, []);
      this.byTag.get(id).push(e);
      this.footprints.push(e);
    }
  }
  addExplosive(id, e, tag) {
    const def = EXPLOSIVE[id];
    const ex = { id, tag, x: e.x, y: e.y, z: e.z, object: e.object, colliders: e.colliders, hp: def.hp, def, alive: true, entry: e };
    this.explosives.push(ex);
    for (const c of e.colliders) this.game.hitMap.set(c.handle, { kind: 'explosive', ref: ex });
    return ex;
  }
  buildSites(ctx) {
    this.footprints = [];
    for (const [key, site] of Object.entries(SITES)) {
      site.key = key;
      const statics = [];
      this.placeSiteProps(ctx, site, statics);
      if (site.tanks) for (const [dx, dz] of site.tanks) {
        const e = this.place('fuel-tank', site.at[0] + dx, site.at[1] + dz, 0, { list: [] });
        this.addDynamic(ctx, e); this.addExplosive('fuel-tank', e, 'fuel-tank'); this.game.fire.setFuel(e.x, e.z, F.BUILDING);
      }
      if (site.safe) {
        const s = site.safe;
        const put = (id, [dx, dz], t = 0) => { const e = this.place(id, site.at[0] + dx, site.at[1] + dz, t, { list: statics }); return e; };
        put('safe-bed', s.bed, 90); put('safe-locker', s.locker, 0); put('ammo-crate', s.crate, 20); put('name-wall', s.wall, 0);
      }
      if (statics.length) ctx.scene.add(...this.mergeOrAdd(statics));
    }
    const postStatics = [];
    this.postParts = {};
    for (const [key, p] of Object.entries(POSTS)) {
      const yawDeg = (p.yaw * 180) / Math.PI;
      const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), rx = fz, rz = -fx;
      const local = (a, b) => [p.at[0] + rx * a + fx * b, p.at[1] + rz * a + fz * b];
      const [gx, gz] = local(0, 0);
      const gate = this.place('boom-gate', gx, gz, yawDeg + 90, { list: [] }); this.addDynamic(ctx, gate);
      this.postParts[key] = gate;
      const roadDist = (x, z) => Math.min(...Object.values(ROADS).map((r) => distToPolyline(x, z, r.pts)));
      for (const [a, b, t] of [[-7, 6, 90], [7, 6, 90], [-7, -6, 90], [7, -6, 90], [-11, 0, 0], [11, 0, 0]]) { const [x, z] = local(a, b); if (roadDist(x, z) > 7.5) this.place('sandbag-run', x, z, yawDeg + t, { list: postStatics }); }
      let [dx, dz] = local(9, 3); if (roadDist(dx, dz) < 6.5) [dx, dz] = local(-9, -3); const drum = this.place('oil-drum', dx, dz, 0, { list: [] }); this.addDynamic(ctx, drum); this.addExplosive('oil-drum', drum);
      this.game.fire.setFuel(dx, dz, F.BUILDING);
      const [cx, cz] = local(-9.5, 2); if (roadDist(cx, cz) > 6) this.place('crate', cx, cz, 18, { list: postStatics });
      const [mx, mz] = local(9, -2); this.addPostCloth(ctx, mx, mz);
      this.place('signpost', mx + rx * 2, mz + rz * 2, yawDeg, { list: postStatics });
    }
    ctx.scene.add(...this.mergeOrAdd(postStatics));
    // Trig pillars, rail halts, cases' props.
    const misc = [];
    this.trigEntries = {};
    for (const t of TRIGS) this.trigEntries[t.id] = this.place('trig-pillar', t.at[0], t.at[1], 0, { list: misc });
    for (const h of Object.values(HALTS)) { this.place('signal-mast', h.at[0] + 5, h.at[1] - 6, 0, { list: misc }); this.place('stool', h.at[0] - 3, h.at[1] - 5, 0, { list: misc, collide: false }); }
    for (const c of CASES) {
      const yaw = hash2(c.at[0], c.at[1]) * 360;
      const off = c.prop === 'shack' ? 0 : 2.2;
      this.place(c.prop, c.at[0] + off, c.at[1] + off * 0.6, yaw, { list: misc });
      this.footprints.push({ build: { colliders: [] }, x: c.at[0], z: c.at[1] });
      if (c.prop === 'shack') this.game.fire.setFuel(c.at[0], c.at[1], F.BUILDING);
    }
    this.place('handcar', -300 + 8, 100 - 4, 80, { list: misc });
    ctx.scene.add(...this.mergeOrAdd(misc));
    // Cloth on the Mile Forty mast too: you read the wind everywhere you stop.
    this.addPostCloth(ctx, 22, 24);
  }
  addPostCloth(ctx, x, z) {
    const y = this.heightAt(x, z);
    const pole = new Mesh(new THREE.BoxGeometry(0.14, 3.4, 0.14), toonMaterial(PALETTE.night));
    pole.position.set(x, y + 1.7, z); pole.castShadow = true;
    ctx.scene.add(pole);
    if (!this.game.views) return;
    const cloth = clothGrid({ width: 1.4, height: 0.45, cols: 6, rows: 3, origin: [x, y + 3.3, z], pin: 'left' });
    cloth.drag = 1.4; cloth.gust = 0.3;
    const mesh = new SoftMesh(cloth, toonMaterial(PALETTE.red), { doubleSided: true });
    mesh.castShadow = false;
    ctx.scene.add(mesh);
    this.cloths.push({ cloth, mesh, x, z });
  }
  /** A flag on a spring chain: it hangs in still air and streams downwind, so a pole reads the wind from far off. */
  addFlag(ctx, e, site) {
    const chain = new SpringChain({ segments: 6, length: 0.36, stiffness: 8, keep: 0.9, gravity: 6 });
    const root = [e.x, e.y + 8.7, e.z], box = new THREE.BoxGeometry(1, 0.8, 0.04);
    const mat = toonMaterial(site.faction === 'harvest' ? PALETTE.red : PALETTE.white);
    const meshes = [];
    for (let i = 0; i < 6; i++) { const m = new Mesh(box, mat); m.castShadow = false; ctx.scene.add(m); meshes.push(m); }
    chain.reset(root, [[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
    this.flags.push({ chain, root, meshes, x: e.x, z: e.z });
  }
  mergeOrAdd(list) { for (const o of list) o.updateMatrixWorld(true); return mergeStaticMeshes(list); }
  // ---- water, rails, bridges ----
  buildWater(ctx) {
    this.waters = [];
    if (!this.game.views) return;
    for (let i = 0; i + 1 < RIVER.length; i++) {
      const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const w = new WaterSurface({ size: [15.5, len + 8], at: [0, 0, 0], segments: [4, Math.ceil(len / 8)], waves: WAVES_CALM, deep: PALETTE.navy, shallow: PALETTE.teal, foam: PALETTE.mist, opacity: 1 });
      w.position.set((ax + bx) / 2, RIVER_Y, (az + bz) / 2);
      w.rotation.y = Math.atan2(bx - ax, bz - az);
      w.castShadow = false;
      ctx.scene.add(w);
      this.waters.push(w);
    }
  }
  buildRails(ctx) {
    const pieces = [];
    for (const pts of Object.values(RAIL)) {
      const L = polyLength(pts), n = Math.floor(L / 6), p = [0, 0, 0];
      for (let i = 0; i <= n; i++) {
        pointAlong(pts, i * 6 + 3, p);
        const nearDeck = Math.hypot(p[0] - RAIL_BRIDGE.at[0], p[1] - RAIL_BRIDGE.at[1]) < 18;
        pieces.push({ x: p[0], z: p[1], yaw: p[2], y: nearDeck ? RIVER_Y + 2 : this.heightAt(p[0], p[1]) });
      }
    }
    const set = new InstanceSet(ctx.scene, 'rail-piece', pieces.length, { castShadow: false });
    for (const q of pieces) set.add(q.x, q.y + 0.02, q.z, q.yaw);
    this.railSet = set;
  }
  buildBridges(ctx) {
    const statics = [];
    const addDeck = (x, z, yaw, w, scaleX) => {
      const y = RIVER_Y + 2;
      const build = buildModel('bridge-deck', { catalog: MODELS });
      build.object.position.set(x, y, z); build.object.rotation.y = yaw;
      if (scaleX) build.object.scale.x = scaleX;
      build.object.updateMatrixWorld(true);
      build.object.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      statics.push(build.object);
      ctx.physics.addStaticBox({ position: [x, y - 0.2, z], halfExtents: [w / 2, 0.2, 15], rotationY: yaw });
    };
    const roadYaw = (b) => {
      const pts = ROADS[b.road].pts;
      let best = 0, bd = 1e9;
      for (let i = 0; i + 1 < pts.length; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2, mz = (pts[i][1] + pts[i + 1][1]) / 2;
        const d = Math.min(Math.hypot(pts[i][0] - b.at[0], pts[i][1] - b.at[1]), Math.hypot(pts[i + 1][0] - b.at[0], pts[i + 1][1] - b.at[1]));
        if (d < bd) { bd = d; best = Math.atan2(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); }
      }
      return best;
    };
    this.bridges = {};
    for (const b of BRIDGES) { const yaw = roadYaw(b); addDeck(b.at[0], b.at[1], yaw, 8); this.bridges[b.id] = { x: b.at[0], z: b.at[1], yaw }; }
    addDeck(RAIL_BRIDGE.at[0], RAIL_BRIDGE.at[1], Math.atan2(160, -55), 4, 0.5);
    ctx.scene.add(...this.mergeOrAdd(statics));
  }
  // ---- plants and rocks ----
  scatter(ctx) {
    const r = new Rng(424242), g = this.game, ground = this.ground, { fire, wind } = g;
    const sets = {
      'acacia-a': { live: new InstanceSet(ctx.scene, 'acacia-a', 200), burnt: new InstanceSet(ctx.scene, 'acacia-a-burnt', 200) },
      'acacia-b': { live: new InstanceSet(ctx.scene, 'acacia-b', 150), burnt: new InstanceSet(ctx.scene, 'acacia-b-burnt', 150) },
      'acacia-c': { live: new InstanceSet(ctx.scene, 'acacia-c', 150), burnt: new InstanceSet(ctx.scene, 'acacia-c-burnt', 150) },
      'bottle-tree': { live: new InstanceSet(ctx.scene, 'bottle-tree', 50), burnt: new InstanceSet(ctx.scene, 'bottle-tree-burnt', 50) },
    };
    this.treeSets = sets;
    const sites = [...Object.values(SITES).filter((s) => s.r > 0).map((s) => ({ x: s.at[0], z: s.at[1], r: s.r })), ...Object.values(POSTS).map((p) => ({ x: p.at[0], z: p.at[1], r: 18 })), { x: 150, z: -300, r: 95 }, ...TRIGS.map((t) => ({ x: t.at[0], z: t.at[1], r: 5 })), ...CASES.map((c) => ({ x: c.at[0], z: c.at[1], r: 6 }))];
    const clearOf = (x, z, pad = 0) => {
      for (const s of sites) if (Math.hypot(x - s.x, z - s.z) < s.r + pad) return false;
      return true;
    };
    const isOpen = (k) => k === K.GRASS || k === K.WOOD || k === K.BANK;
    let placedTrees = 0, tries = 0;
    this.treeByCell = new Map();
    while (placedTrees < 430 && tries < 12000) {
      tries++;
      const x = r.range(-630, 630), z = r.range(-630, 630);
      const k = ground.kindAt(x, z);
      if (!isOpen(k) || !clearOf(x, z)) continue;
      const woods = k === K.WOOD;
      if (!woods && !r.chance(0.28)) continue;
      const kind = r.chance(0.08) ? 'bottle-tree' : r.pick(['acacia-a', 'acacia-b', 'acacia-c']);
      const set = sets[kind];
      if (set.live.count >= set.live.capacity) continue;
      const y = this.heightAt(x, z), yaw = r.range(0, Math.PI * 2), scale = r.range(0.85, 1.35);
      const i = set.live.add(x, y, z, yaw, scale);
      set.burnt.count = Math.max(set.burnt.count, i + 1);
      const rad = kind === 'bottle-tree' ? 1 : 0.24;
      const collider = ctx.physics.addStaticCylinder([x, y + 1.6, z], 1.6, rad);
      const tree = { kind, i, x, y, z, yaw, scale, burnt: false };
      this.trees.push(tree);
      fire.setFuel(x, z, F.TREE);
      const id = fire.idOf(x, z);
      if (!this.treeByCell.has(id)) this.treeByCell.set(id, []);
      this.treeByCell.get(id).push(tree);
      this.game.treeColliders.push({ x, z, r: rad, collider });
      placedTrees++;
    }
    // Bushes, mounds, boulders, dead trees, reeds. Static sets; mounds and boulders are solid.
    this.bushByCell = new Map();
    const scatterSet = (id, cap, count, want, solid, palette, params) => {
      const set = new InstanceSet(ctx.scene, id, cap, { palette, params });
      let n = 0, t = 0;
      while (n < count && t < count * 30) {
        t++;
        const x = r.range(-630, 630), z = r.range(-630, 630);
        const k = ground.kindAt(x, z);
        if (!want(k, x, z) || !clearOf(x, z)) continue;
        const y = this.heightAt(x, z);
        const yaw = r.range(0, 6.28), sc = r.range(0.8, 1.4);
        const i = set.add(x, y, z, yaw, sc);
        if (id === 'thorn-bush') { const c = fire.idOf(x, z); if (!this.bushByCell.has(c)) this.bushByCell.set(c, []); this.bushByCell.get(c).push({ i, x, y, z, yaw, sc }); }
        if (solid) ctx.physics.addStaticCylinder([x, y + 0.8, z], 0.8, solid);
        n++;
      }
      return set;
    };
    this.bushes = scatterSet('thorn-bush', 500, 460, (k) => isOpen(k), 0);
    this.mounds = scatterSet('termite-mound', 70, 60, (k) => k === K.GRASS || k === K.WOOD, 0.6);
    this.boulders = scatterSet('boulders', 150, 120, (k, x, z) => k === K.ROCK || (Math.hypot(x + 130, z + 520) < 240 && k !== K.WATER && k !== K.ROAD && k !== K.TRACK), 0.7);
    this.dead = scatterSet('dead-tree', 40, 34, (k) => k === K.GRASS || k === K.SALT, 0.2);
    this.rocks = scatterSet('rock', 170, 150, (k, x, z) => k === K.ROCK || (Math.hypot(x + 130, z + 520) < 240 && k !== K.WATER && k !== K.ROAD && k !== K.TRACK), 0, undefined, { size: 0.9 });
    const reeds = this.reeds = new InstanceSet(ctx.scene, 'reeds', 300, { castShadow: false });
    for (let n = 0, t = 0; n < 280 && t < 4000; t++) {
      const i = r.int(0, RIVER.length - 2), f = r.next(), [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1];
      const side = r.chance(0.5) ? 1 : -1, nx = -(bz - az), nz = bx - ax, l = Math.hypot(nx, nz) || 1;
      const off = r.range(6.5, 10) * side;
      const x = ax + (bx - ax) * f + (nx / l) * off, z = az + (bz - az) * f + (nz / l) * off;
      if (Math.abs(x) > 630 || Math.abs(z) > 630) continue;
      reeds.add(x, this.heightAt(x, z), z, r.range(0, 6.28), r.range(0.9, 1.5)); n++;
    }
    // Tree sway: wind reads in the crowns.
    if (g.views) {
      this.windU = new WindUniforms();
      for (const set of Object.values(sets)) for (const m of set.live.meshes) { swayObject(m, this.windU, { height: 5.5, base: 1.6, amount: 0.05 }); }
    }
  }
  burnTreesIn(id) {
    const bushes = this.bushByCell.get(id);
    if (bushes) for (const b of bushes) this.bushes.hide(b.i);
    const list = this.treeByCell.get(id);
    if (!list) return;
    for (const t of list) this.setTreeBurnt(t, true);
  }
  unburnTreesIn(id) {
    const bushes = this.bushByCell.get(id);
    if (bushes) for (const b of bushes) this.bushes.set(b.i, b.x, b.y, b.z, b.yaw, b.sc);
    const list = this.treeByCell.get(id);
    if (!list) return;
    for (const t of list) this.setTreeBurnt(t, false);
  }
  setTreeBurnt(t, on) {
    if (t.burnt === on) return;
    t.burnt = on;
    const set = this.treeSets[t.kind];
    if (on) { set.live.hide(t.i); set.burnt.set(t.i, t.x, t.y, t.z, t.yaw, t.scale); }
    else { set.burnt.hide(t.i); set.live.set(t.i, t.x, t.y, t.z, t.yaw, t.scale); }
  }
  cookOff(id) {
    // Tanks and drums whose cell caught are handled by the actors' damage pass (combat/damage.js), which also throws the blast.
    const g = this.game;
    for (const ex of this.explosives) {
      if (!ex.alive) continue;
      if (g.fire.idOf(ex.x, ex.z) === id && !ex.cooking) { ex.cooking = true; g.after(g.rng.fx.range(1.5, 4), () => { ex.cooking = false; if (ex.alive && g.fire.state[id] === S.BURNING) g.damage.explode(ex, 'fire'); }); }
    }
  }
  // ---- nav ----
  buildNav() {
    const nav = new NavGrid(640, 640, { cell: 2, origin: [-640, 0, -640] });
    const ground = this.ground;
    for (let r = 0; r < 640; r++) for (let c = 0; c < 640; c++) {
      const x = nav.centerX(c), z = nav.centerZ(r);
      const k = ground.kindAt(x, z);
      let open = k !== K.WATER || ground.isFord(x, z);
      if (open) {
        const a = ground.sampleH(x - 1, z), b = ground.sampleH(x + 1, z), d = ground.sampleH(x, z - 1), e = ground.sampleH(x, z + 1);
        if (Math.hypot(a - b, d - e) / 2 > 1.05) open = false;
      }
      if (!open) nav.setOpen(c, r, false);
    }
    for (const b of Object.values(this.bridges)) {
      for (let s = -15; s <= 15; s += 1) for (let w = -3; w <= 3; w += 1) {
        const x = b.x + Math.sin(b.yaw) * s + Math.cos(b.yaw) * w, z = b.z + Math.cos(b.yaw) * s - Math.sin(b.yaw) * w;
        nav.setOpen(nav.col(x), nav.row(z), true);
      }
    }
    // Close the cells under solid parts of buildings (doorways keep their gaps) and tree trunks.
    for (const e of this.footprints) {
      for (const c of e.build.colliders ?? []) {
        const he = c.half ?? null;
        const at = c.center ?? null;
        if (!he || !at) continue;
        const cy = Math.cos(e.yaw ?? 0), sy = Math.sin(e.yaw ?? 0);
        const wx = e.x + at[0] * cy + at[2] * sy, wz = e.z - at[0] * sy + at[2] * cy;
        const rx = Math.abs(he[0] * cy) + Math.abs(he[2] * sy), rz = Math.abs(he[0] * sy) + Math.abs(he[2] * cy);
        for (let xx = wx - rx; xx <= wx + rx; xx += 1) for (let zz = wz - rz; zz <= wz + rz; zz += 1) nav.setOpen(nav.col(xx), nav.row(zz), false);
      }
    }
    for (const t of this.game.treeColliders) nav.setOpen(nav.col(t.x), nav.row(t.z), false);
    this.nav = nav;
  }
  // ---- per-frame ----
  update(ctx, dt, time) {
    const g = this.game;
    for (const w of this.waters) w.update(time);
    if (this.windU) this.windU.update(time, [g.wind.vx * 0.3, g.wind.vz * 0.3]);
    for (const c of this.cloths) {
      if (Math.hypot(c.x - g.camPos.x, c.z - g.camPos.z) > 160) continue;
      c.cloth.wind[0] = g.wind.vx * 1.6; c.cloth.wind[2] = g.wind.vz * 1.6;
      c.cloth.step(Math.min(dt, 1 / 30));
      c.mesh.sync();
    }
    for (const f of this.flags) {
      if (Math.hypot(f.x - g.camPos.x, f.z - g.camPos.z) > 260) continue;
      const fw = [-g.wind.x, 0, -g.wind.z];      // the chain rests along -forward, so forward points upwind
      f.chain.o.stiffness = 2 + g.wind.speed * 2;
      f.chain.update(Math.min(dt, 1 / 30), f.root, [[fw[2], 0, -fw[0]], [0, 1, 0], fw]);
      f.meshes.forEach((m, i) => {
        const a = f.chain.points[i], b = f.chain.points[i + 1];
        _flagDir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        const l = _flagDir.length() || 1;
        m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 0.4, (a[2] + b[2]) / 2);
        m.quaternion.setFromUnitVectors(_flagX, _flagDir.multiplyScalar(1 / l));
        m.scale.x = l + 0.02;
      });
    }
    if (this.crowd) for (const c of this.crowd) if (c.climbing > 0 && (c.climbing -= dt) <= 0) { c.boarded = true; c.p.object.visible = false; }
    this.flushPaint(dt);
  }
  /** Story dressing. */
  openCage() {
    const c = this.byTag.get('post-cage')?.[0];
    const gate = c?.object.getObjectByName('Gate');
    if (gate) gate.rotation.y = -1.9;
    for (const col of c?.colliders ?? []) { const t = col.translation(); if (Math.hypot(t.x - c.x, t.z - (c.z + 1.6)) < 1.4) col.setEnabled(false); }
    this.game.sfx.play('gun-rack');
  }
  closeCage() { const c = this.byTag.get('post-cage')?.[0]; const gate = c?.object.getObjectByName('Gate'); if (gate) gate.rotation.y = 0; for (const col of c?.colliders ?? []) col.setEnabled(true); }
  markPayroll(truck) {
    const g = this.game;
    truck.payroll = true;
    if (!this.payrollHook) this.payrollHook = g.events.on('vehicle-destroyed', (v) => { if (v.payroll) g.events.emit('destroyed', 'payroll', v); });
  }
  /** Huts show a lamp at night, unless there is nobody left to light it. */
  stepHuts() {
    const g = this.game, on = g.clock.isNight() && !g.story.flags.wellsEmpty;
    if (on === this.hutsLit) return;
    this.hutsLit = on;
    for (const h of this.byTag.get('hut') ?? []) { const l = h.object.getObjectByName('Lamp'); if (l) l.visible = on; }
  }
  darkenVillage() { this.hutsLit = null; }
  /** Without the alternate plan: a line of people walks the road to the clinic. */
  startRefugees() {
    const pts = [[-262, 250], [-240, 120], [-200, 30], [-100, 35], [-44, 24]];
    this.column = { pts, s: 0, L: polyLength(pts), speed: 2.2, refugees: true, marker: { x: pts[0][0], z: pts[0][1], name: 'THE LINE' } };
    this.game.map.markers.push(this.column.marker);
    this.game.map.dirty = true;
  }
  regrowAll() { this.game.fire.regrowAll(); }
  /** The column: people walking the scar. On the sheet it is a slow mark. */
  crowdPool() {
    const g = this.game;
    if (this.crowd) return this.crowd;
    this.crowd = [];
    if (!g.views) return this.crowd;
    const pals = [{ cloth: 'sand', dark: 'red', skin: 'plum', hat: 'white' }, { cloth: 'white', dark: 'slate', skin: 'red', hat: 'orange' }, { cloth: 'orange', dark: 'plum', skin: 'sand', hat: 'red' }, { cloth: 'teal', dark: 'night', skin: 'orange', hat: 'sand' }];
    for (let i = 0; i < 16; i++) {
      const p = makePerson('civilian', pals[i % 4]);
      p.object.visible = false;
      g.ctx.scene.add(p.object);
      this.crowd.push({ p, i, ox: (hash2(i, 3) - 0.5) * 7, oz: (hash2(i, 9) - 0.5) * 7 });
    }
    return this.crowd;
  }
  /** M8: as the platform clock runs, people climb aboard and are gone. */
  boardCrowd(done) {
    for (const c of this.crowdPool()) if (!c.boarded && !c.climbing && done >= (c.i + 1) / 17) { c.climbing = 1.6; c.p.object.rotation.y = 0; c.p.anim.once('Climb'); }
  }
  setCrowdAtPlatform(on) {
    const g = this.game, s = SITES['mile-forty'];
    for (const c of this.crowdPool()) {
      c.p.object.visible = on;
      if (on) {
        c.climbing = 0; c.boarded = false;
        const x = s.at[0] - 12 + c.i * 1.6, z = s.at[1] + 26 + (c.i % 3) * 0.9, y = this.heightAt(x, z) + 1;
        c.p.object.position.set(x, y, z);
        c.p.object.rotation.y = Math.PI * (c.i % 2 ? 0.1 : 1);
        c.p.anim.set(c.i % 3 ? 'Idle' : 'Beg');
        c.onPlatform = true;
      }
    }
    this.platformCrowd = on;
  }
  startColumn() {
    const pts = [...STRIPS.A.pts, ...STRIPS.C.pts.slice(1), ...STRIPS.B.pts.slice(1)];
    this.column = { pts, s: 0, L: polyLength(pts), speed: 1.4, marker: { x: pts[0][0], z: pts[0][1], name: 'THE COLUMN' } };
    this.game.map.markers = this.game.map.markers.filter((m) => m.name !== 'THE COLUMN');
    this.game.map.markers.push(this.column.marker);
    this.game.map.dirty = true;
  }
  setColumnHead(x, z) {
    if (!this.column) this.startColumn();
    const c = this.column;
    let best = 0, bd = 1e9, acc = 0;
    for (let i = 0; i + 1 < c.pts.length; i++) {
      const [ax, az] = c.pts[i], [bx, bz] = c.pts[i + 1], l = Math.hypot(bx - ax, bz - az);
      const d = Math.hypot(x - ax, z - az);
      if (d < bd) { bd = d; best = acc; }
      acc += l;
    }
    c.s = best + bd;
    c.speed = 0;
  }
  columnGoesThrough() { if (this.column) this.column.speed = 3.2; }
  stepColumn(dt) {
    const c = this.column, g = this.game;
    if (!c) return;
    c.s = Math.min(c.L, c.s + c.speed * dt);
    if (c.refugees && c.s >= c.L) { this.stopColumn(); g.map.markers = g.map.markers.filter((m) => m.name !== 'THE LINE'); g.map.dirty = true; return; }
    const at = pointAlong(c.pts, c.s, [0, 0, 0]);
    c.marker.x = at[0]; c.marker.z = at[1];
    if (!g.views) return;
    const cam = g.camPos, near = Math.hypot(at[0] - cam.x, at[1] - cam.z) < 190;
    const back = [0, 0, 0];
    for (const p of this.crowdPool()) {
      if (this.platformCrowd) continue;
      p.p.object.visible = near;
      if (!near) continue;
      pointAlong(c.pts, Math.max(0, c.s - p.i * 2.6), back);
      const x = back[0] + p.ox, z = back[1] + p.oz;
      p.p.object.position.set(x, this.heightAt(x, z), z);
      p.p.object.rotation.y = back[2];
      p.p.anim.set(c.speed > 0 ? (p.i % 5 === 0 ? 'CarryOver' : p.i % 7 === 3 ? 'WalkHandsTied' : 'Walk') : 'Idle');
      p.p.anim.update(dt);
    }
  }
  stopColumn() {
    if (this.crowd) for (const c of this.crowd) c.p.object.visible = false;
    this.column = null; this.platformCrowd = false;
  }
  /** The last of the grass: a patch nobody has burned, whatever the player did before. */
  refreshGrass(cx, cz, r) {
    const g = this.game, fire = g.fire, ground = this.ground;
    ground.forRadiusCells(cx, cz, r, (i) => { if (ground.kind[i] !== K.WATER) ground.kind[i] = K.GRASS; });
    const c0 = fire.cellOf(cx - r, cz - r), c1 = fire.cellOf(cx + r, cz + r);
    for (let z = c0.cz; z <= c1.cz; z++) for (let x = c0.cx; x <= c1.cx; x++) {
      const id = x + z * FN;
      if (Math.hypot(fire.wx(id) - cx, fire.wz(id) - cz) > r || fire.state[id] === S.BURNING) continue;
      if (fire.state[id] !== S.FRESH) { const j = fire.burntList.indexOf(id); if (j >= 0) fire.burntList.splice(j, 1); if (fire.state[id] === S.BURNT) fire.counts.burnt--; }
      fire.state[id] = S.FRESH; fire.fuel[id] = F.GRASS; fire.baseFuel[id] = F.GRASS;
      for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) {
        const ix = x * 2 + dx, iz = z * 2 + dz;
        if (ix >= CELLS || iz >= CELLS) continue;
        const c = hash2(ix, iz) > 0.5 ? P.sand : P.orange;
        this.baseColors.set(c, (ix + iz * CELLS) * 3);
        this.setCell(ix, iz, c); this.dirtyRow(ix, iz);
      }
    }
    g.grass.reset(g.ctx); g.grass.primeAll = true;
  }
  /** The deck of a bridge has a wood floor underfoot. */
  onDeck(f) { for (const b of Object.values(this.bridges)) if (Math.hypot(f.x - b.x, f.z - b.z) < 15 && f.y > RIVER_Y + 1.2) return true; return false; }
  /** Back to the map as drawn: no fire, no scars, tanks whole. */
  reset(ctx) {
    const g = this.game;
    g.fire.reset();
    g.fireView.reset();
    g.grass.reset(ctx);
    g.fire.regrown = []; g.fire.halfDensity = new Set();
    for (const t of this.trees) this.setTreeBurnt(t, false);
    for (const list of this.bushByCell.values()) for (const b of list) this.bushes.set(b.i, b.x, b.y, b.z, b.yaw, b.sc);
    this.colors.clearUpdateRanges?.();
    const b = this.baseColors, a = this.colors;
    for (let iz = 0; iz < CELLS; iz++) for (let ix = 0; ix < CELLS; ix++) {
      const i = (ix + iz * CELLS) * 3;
      this.setCell(ix, iz, [b[i], b[i + 1], b[i + 2]]);
    }
    this.dirtyCols.clear();
    a.needsUpdate = true;
    for (const ex of this.explosives) g.damage?.restore(ex);
  }
}
