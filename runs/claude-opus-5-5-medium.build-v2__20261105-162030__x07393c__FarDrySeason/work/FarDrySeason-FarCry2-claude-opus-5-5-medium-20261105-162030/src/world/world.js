// The Kettle as a running thing: statics, flora, grass, fire view, wind, time, weather, sites and the simulation bubble.
import { addModelColliders, buildModel, clothGrid, PALETTE, Precipitation, SoftMesh, spriteSheet, SpriteBatch, THREE, toonMaterial, mergeStaticMeshes, swayObject, WindUniforms, WaterSurface, WAVES_CALM, Decals } from '../../pixel-engine.js';
import { CATALOG, grassFlame } from '../art/models.js';
import { RIVER, STRIPS } from '../content/roads.js';
import { SITES, siteById } from '../content/sites.js';
import { TUNING } from '../core/tuning.js';
import { BURNING, BURNT, FIRE_CELL, FIRE_N, FIRE_ORIGIN, FireGrid, FRESH, FUEL, fireIndex, REGROWING, cellX, cellZ } from './fire.js';
import { clamp, dist2, lerp } from './geom.js';
import { CELL, KIND, Land, WATER_Y } from './terrain.js';
import { Sky } from './sky.js';
import { mixin } from '../core/mixin.js';
import { FaunaPart } from '../actors/fauna.js';
import { SitesPart } from './sites.js';
import { RoadsPart } from './roads.js';
import { GrassPart } from './grass.js';
import { WindPart } from './wind.js';
const { BoxGeometry, InstancedMesh, Matrix4, Mesh, Quaternion, Vector3, Group, AnimationMixer } = THREE;
const ZERO = new Matrix4().makeScale(0, 0, 0), M = new Matrix4(), Q = new Quaternion(), V = new Vector3(), S = new Vector3(), UP = new Vector3(0, 1, 0);
const DESTROY = { drum: { hp: 18, r: 5, d: 70, fire: 7 }, 'fuel-tank': { hp: 150, r: 14, d: 220, fire: 16, big: true }, pump: { hp: 110, r: 7, d: 120, fire: 6, big: true }, 'ammo-bunker': { hp: 140, r: 16, d: 240, fire: 18, big: true } };
const CHUNK = 48;

export class World {
  hour = 16.5; totalHours = 0; day = 1; weather = 'clear';
  wind = { x: 0.7, z: -0.3, speed: 3, angle: 0 }; windPin = null;
  sites = {}; destructibles = []; flora = []; floraByCell = new Map(); owners = new Map(); chunks = new Map(); cloths = [];
  burnDirty = false; stepCount = 0; time = 0;
  constructor(game) { this.game = game; }
  /** Register a collider's owner so a hit can be traced back: { type:'actor'|'prop'|'vehicle', ref }. */
  own(collider, type, ref) { if (collider) this.owners.set(collider.handle, { type, ref }); return collider; }
  build(ctx) {
    this.ctx = ctx; const g = this.game;
    this.rng = ctx.random.fork('world'); this.look = ctx.random.fork('world-look');
    this.land = new Land(7); this.land.build(ctx);
    this.fire = new FireGrid(ctx.random.fork('fire'));
    this.land.fuelInto(this.fire);
    this.fire.onChange = (i, s, was) => this.onCellChange(i, s, was);
    this.sky = new Sky(); this.sky.build(ctx);
    this.windU = new WindUniforms();
    this.decals = new Decals(ctx.scene, { capacity: 96 });
    this.buildSites(ctx);
    this.buildFlora(ctx);
    this.buildRail(ctx);
    this.buildWater(ctx);
    this.buildBits(ctx);
    this.buildFlames(ctx);
    this.buildFauna(ctx);
    ctx.particles.register('fire-smoke', { count: [1, 1], life: [3, 6], speed: [1.5, 3], direction: [0, 1, 0], spread: 22, gravity: -0.5, size: [4, 7], colors: ['night', 'slate', 'mist'], radius: 8, max: 500 });
    ctx.particles.register('ember', { count: [1, 2], life: [0.8, 2], speed: [1, 3], direction: [0, 1, 0], spread: 40, gravity: -1.4, size: [1, 1], colors: ['sand', 'orange', 'red'], radius: 6, max: 400 });
    ctx.particles.register('ash', { count: [1, 1], life: [2, 4], speed: [0.5, 1.2], spread: 70, gravity: 0.3, size: [1, 1], colors: ['mist', 'slate'], radius: 12, max: 300 });
    ctx.particles.register('blood', { count: [4, 8], life: [0.25, 0.5], speed: [1.5, 3.5], spread: 60, gravity: 9, size: [1, 1], colors: ['red', 'plum'], max: 200 });
    ctx.particles.register('sparks', { count: [4, 8], life: [0.15, 0.4], speed: [2, 6], spread: 70, gravity: 9, size: [1, 1], colors: ['white', 'sand', 'orange'], max: 200 });
    ctx.particles.register('blast', { count: [24, 36], life: [0.4, 1.1], speed: [3, 12], spread: 90, gravity: -2, drag: 2, size: [5, 1], colors: ['white', 'sand', 'orange', 'red', 'night'], radius: 1.5, max: 300 });
    ctx.particles.register('dust-wind', { count: [1, 2], life: [1, 2.2], speed: [4, 8], direction: [1, 0.1, 0], spread: 10, size: [1, 2], colors: ['sand', 'orange'], radius: 22, max: 300 });
    ctx.particles.register('gun-smoke', { count: [2, 3], life: [0.3, 0.7], speed: [0.3, 0.9], spread: 40, gravity: -1, size: [2, 3], colors: ['mist', 'slate'], max: 80 });
    ctx.particles.register('mud', { count: [3, 5], life: [0.2, 0.4], speed: [1, 3], spread: 50, gravity: 9, size: [1, 1], colors: ['sand', 'red', 'plum'], max: 160 });
    this.flameLights = [];
    this.setHour(this.hour, true);
    void g;
  }
  instanced(id, count, palette) {
    const b = buildModel(id, { catalog: CATALOG, palette });
    b.object.updateMatrixWorld(true);
    const parts = [];
    b.object.traverse((o) => { if (o.isMesh) { const geo = o.geometry.clone().applyMatrix4(o.matrixWorld); const im = new InstancedMesh(geo, o.material, count); im.count = count; im.castShadow = true; im.receiveShadow = false; im.frustumCulled = false; for (let i = 0; i < count; i++) im.setMatrixAt(i, ZERO); parts.push(im); } });
    const group = new Group(); group.add(...parts);
    this.ctx.scene.add(group);
    return { parts, group, used: 0, set: (i, m) => { for (const p of parts) { p.setMatrixAt(i, m); p.instanceMatrix.needsUpdate = true; } } };
  }
  buildFlora(ctx) {
    const r = ctx.random.fork('flora'), land = this.land, fire = this.fire;
    const shapes = {
      'acacia-a': { count: 180, burnt: 'scorched-a' }, 'acacia-b': { count: 130, burnt: 'scorched-a' }, 'acacia-c': { count: 110, burnt: 'scorched-a' }, 'bottle-tree': { count: 26, burnt: 'scorched-b' },
      bush: { count: 300, burnt: null, palette: { leaf: 'plum', leaf2: 'red' }, fuel: FUEL.SCRUB, noTrunk: true }, 'crop-clump': { count: 2400, burnt: null, noTrunk: true, crop: true },
    };
    this.inst = {};
    for (const [id, s] of Object.entries(shapes)) this.inst[id] = this.instanced(id, s.count, s.palette);
    this.inst['scorched-a'] = this.instanced('scorched-a', 420); this.inst['scorched-b'] = this.instanced('scorched-b', 26);
    const clearOfSites = (x, z, extra = 8) => { for (const def of SITES) if (dist2(x, z, def.at[0], def.at[1]) < def.r + extra && !def.crop) return false; return true; };
    const place = (id, x, z, spec) => {
      const inst = this.inst[id]; if (inst.used >= shapes[id].count) return;
      const i = inst.used++, y = land.heightAt(x, z), yaw = r.range(0, 6.283), scale = r.range(0.8, 1.35);
      M.compose(V.set(x, y, z), Q.setFromAxisAngle(UP, yaw), S.setScalar(scale)); inst.set(i, M);
      const f = { id, i, x, y, z, yaw, scale, burnt: spec.burnt, state: 0, cell: fireIndex(x, z), bi: -1 };
      this.flora.push(f);
      if (f.cell >= 0) { (this.floraByCell.get(f.cell) ?? this.floraByCell.set(f.cell, []).get(f.cell)).push(f); const fu = spec.fuel ?? FUEL.TREE; if (fire.baseFuel[f.cell]) { fire.baseFuel[f.cell] = Math.max(fire.baseFuel[f.cell], fu); fire.fuel[f.cell] = fire.baseFuel[f.cell]; } }
      if (!spec.noTrunk) this.own(ctx.physics.addStaticCylinder([x, y + 2, z], 2, id === 'bottle-tree' ? 1 : 0.28 * scale), 'tree', f);
    };
    const statics = [];
    for (let n = 0; n < 2400 && this.flora.length < 720; n++) {
      const x = r.range(-630, 630), z = r.range(-630, 630), k = land.kindAt(x, z);
      if (k === KIND.ROAD || k === KIND.WATER || k === KIND.SALT || k === KIND.ROCK || k === KIND.DIRT || k === KIND.CROP || !clearOfSites(x, z)) continue;
      if (land.heightAt(x, z) > 72) continue;
      const wood = k === KIND.WOOD;
      if (!wood && r.next() < 0.55) continue;
      const roll = r.next();
      if (roll < 0.42) place('bush', x, z, shapes.bush);
      else place(r.next() < 0.06 ? 'bottle-tree' : r.pick(['acacia-a', 'acacia-a', 'acacia-b', 'acacia-c']), x, z, shapes[r.pick(['acacia-a'])]);
    }
    // The crop.
    const field = siteById['long-field'];
    for (let ix = -29; ix <= 29; ix++) for (let iz = -19; iz <= 19; iz++) {
      const x = field.at[0] + ix * 3 + r.range(-1, 1), z = field.at[1] + iz * 3 + r.range(-1, 1);
      if (land.kindAt(x, z) === KIND.CROP && this.inst['crop-clump'].used < 2300) place('crop-clump', x, z, shapes['crop-clump']);
    }
    // Rocks, mounds, reeds, dead trees: merged and never burn.
    const scat = (id, n, test, yawR = true) => { for (let c = 0, tries = 0; c < n && tries < n * 30; tries++) { const x = r.range(-630, 630), z = r.range(-630, 630); if (!test(x, z) || !clearOfSites(x, z, 4)) continue; const y = land.heightAt(x, z), b = this.place(id, x, y, z, yawR ? r.range(0, 360) : 0, { seed: c + 1 }); statics.push(b.object); if (b.colliders.length) addModelColliders(ctx.physics, b, [x, y, z], b.object.rotation.y); c++; } };
    scat('termite-mound', 40, (x, z) => land.kindAt(x, z) === KIND.GRASS);
    scat('boulders', 60, (x, z) => land.kindAt(x, z) === KIND.ROCK || land.heightAt(x, z) > 60);
    scat('rock', 80, (x, z) => land.kindAt(x, z) === KIND.ROCK || land.kindAt(x, z) === KIND.GRASS);
    scat('dead-tree', 24, (x, z) => land.kindAt(x, z) === KIND.SALT || land.kindAt(x, z) === KIND.ROCK);
    scat('reeds', 90, (x, z) => land.kindAt(x, z) === KIND.BANK && land.heightAt(x, z) < WATER_Y + 2);
    ctx.scene.add(...mergeStaticMeshes(statics));
    // Base fuel is final here.
    fire.fuel.set(fire.baseFuel);
    // Trees lean with the wind.
    for (const id of ['acacia-a', 'acacia-b', 'acacia-c', 'bottle-tree']) try { swayObject(this.inst[id].group, this.windU, { height: 7, base: 1.5, amount: 0.05 }); } catch { /* an instanced mesh that can't sway simply stands still */ }
  }
  buildWater(ctx) {
    for (let i = 0; i + 1 < RIVER.length; i++) {
      const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1], l = Math.hypot(bx - ax, bz - az) + 16;
      const w = new WaterSurface({ size: [34, l], at: [(ax + bx) / 2, WATER_Y, (az + bz) / 2], segments: [6, Math.ceil(l / 8)], waves: WAVES_CALM, deep: PALETTE.navy, shallow: PALETTE.teal, foam: PALETTE.mist });
      w.rotation.y = Math.atan2(bx - ax, bz - az); w.castShadow = false;
      ctx.scene.add(w); (this.waters ??= []).push(w);
    }
  }
  buildBits(ctx) {
    // Red cloth on every post, moved by the wind.
    const clothM = toonMaterial(PALETTE.red);
    this.cloths = this.cloths.map((c) => {
      const body = clothGrid({ width: 1.1, height: 0.42, cols: 6, rows: 3, origin: [c.x, c.y + 4, c.z], pin: 'left' });
      const mesh = new SoftMesh(body, clothM, { doubleSided: true });
      mesh.frustumCulled = false; ctx.scene.add(mesh);
      return { ...c, body, mesh };
    });
    this.rain = new Precipitation({ kind: 'rain', count: 3000, area: [60, 26, 60], color: PALETTE.mist, speed: 18 }); this.rain.intensity = 0; ctx.scene.add(this.rain);
  }
  buildFlames(ctx) {
    this.flames = new SpriteBatch(spriteSheet(grassFlame), { capacity: 1800 });
    this.flames.frustumCulled = false; this.flames.castShadow = false;
    const r = ctx.random.fork('flames');
    this.flameSize = [];
    for (let i = 0; i < 1800; i++) { const size = r.range(1.6, 3.2); this.flames.spawn([0, -1000, 0], { size, frame: i % 4 }); this.flameSize.push(size); }
    ctx.scene.add(this.flames);
    this.flameFrame = 0; this.flameClock = 0;
    this.smokeClock = 0; this.tiles = new Map();
  }
  // ----- Fire consequences -----
  onCellChange(i, s, was) {
    const land = this.land;
    if (s === BURNING) { land.paintFireCell(i, 'burning', this.look); for (const d of this.destructibles) if (d.cell === i && !d.destroyed && d.fuse < 0) d.fuse = this.rng.range(0.6, 2.2); }
    else if (s === BURNT) { land.paintFireCell(i, 'burnt', this.look); this.burnFlora(i); this.burnGrass(i); }
    else if (s === REGROWING) land.paintFireCell(i, 'green', this.look);
    else if (s === FRESH) { land.paintFireCell(i, 'fresh', this.look); this.restoreFlora(i); this.dirtyChunk(i); }
    this.burnDirty = true;
    void was;
  }
  burnFlora(i) {
    const list = this.floraByCell.get(i); if (!list) return;
    for (const f of list) {
      if (f.state === 1) continue; f.state = 1;
      this.inst[f.id].set(f.i, ZERO);
      if (f.burnt) { const inst = this.inst[f.burnt]; if (inst.used < 420) { f.bi = inst.used++; M.compose(V.set(f.x, f.y, f.z), Q.setFromAxisAngle(UP, f.yaw), S.setScalar(f.scale)); inst.set(f.bi, M); } }
    }
  }
  restoreFlora(i) {
    const list = this.floraByCell.get(i); if (!list) return;
    for (const f of list) {
      if (f.state === 0) continue; f.state = 0;
      M.compose(V.set(f.x, f.y, f.z), Q.setFromAxisAngle(UP, f.yaw), S.setScalar(f.scale)); this.inst[f.id].set(f.i, M);
      if (f.bi >= 0 && f.burnt) { this.inst[f.burnt].set(f.bi, ZERO); f.bi = -1; }
    }
  }
  // ----- Clock -----
  setHour(h, force) { const prev = this.hour; this.hour = ((h % 24) + 24) % 24; if (force) { let dh = this.hour - prev; if (dh < 0) dh += 24; this.totalHours += dh; } this.sky.apply(this.hour, true); this.lastSky = this.time; }
  /** Sleep or lose time: `hours` of game time pass, and regrowth keeps up. */
  advanceHours(h) { this.totalHours += h; const wasDay = Math.floor((this.totalHours - h) / 24); this.hour = (this.hour + h) % 24; this.sky.apply(this.hour, true); if (Math.floor(this.totalHours / 24) !== wasDay) { this.day++; this.fire.rollRegrowth(); } this.fire.tick(0, this.totalHours); this.game.onHoursPassed?.(h); }
  setWeather(w) {
    this.weather = w; this.sky.storm = w === 'storm' ? 1 : 0; this.sky.dust = w === 'dust' ? 1 : 0; this.fire.raining = w === 'storm'; if (this.rain) this.rain.intensity = w === 'storm' ? 1 : 0; this.sky.apply(this.hour, true); this.lightningT = 6;
  }
  isNight() { const h = this.hour; return h > 19.6 || h < 5.2; }
  // ----- Per fixed step -----
  fixed(dt) {
    this.stepCount++; this.time += dt;
    const fire = this.fire;
    // Time.
    const dh = (dt / (TUNING.dayMinutes * 60)) * 24;
    this.hour = (this.hour + dh) % 24; this.totalHours += dh;
    if (Math.floor(this.totalHours / 24) !== Math.floor((this.totalHours - dh) / 24)) { this.day++; fire.rollRegrowth(); }
    // Wind: a slow random walk, unless a mission pins it.
    if (!this.windPin && this.stepCount % 60 === 0) {
      const a = Math.atan2(this.wind.z, this.wind.x) + this.rng.range(-1, 1) * (15 / 60) * (Math.PI / 180) * 3;
      this.wind.x = Math.cos(a); this.wind.z = Math.sin(a);
      this.wind.speed = clamp(this.wind.speed + this.rng.range(-0.2, 0.2), 0, this.weather === 'dust' ? 8 : 7);
    }
    fire.wind = this.wind;
    if (this.stepCount % 15 === 0) fire.tick(0.25, this.totalHours);
    // Things in the fire.
    for (const d of this.destructibles) if (d.fuse >= 0 && !d.destroyed) { d.fuse -= dt; if (d.fuse <= 0) this.destroy(d, null); }
    // Cloth.
    if (this.stepCount % 2 === 0) for (const c of this.cloths) if (dist2(c.x, c.z, this.focusX ?? 0, this.focusZ ?? 0) < 120) { c.body.wind = [this.wind.x * this.wind.speed * 1.4, 0, this.wind.z * this.wind.speed * 1.4]; c.body.step(dt * 2); }
    // Lightning.
    if (this.weather === 'storm') { this.lightningT -= dt; if (this.lightningT <= 0) { this.lightningT = this.rng.range(6, 15); if (!this.game.settings.reduceFlashes) this.ctx.engine.screen.flash('white', { duration: 0.15, strength: 0.5 }); this.ctx.audio.play('thunder', { volume: 0.7 * this.game.sfxK() }); } }
    this.fauna(dt);
  }
  shout(x, z) { this.startle = [x, z]; }
  burnStrip(id) { const s = STRIPS[id]; if (s) this.fire.burnStrip(s.points, s.width); this.flagStrips = (this.flagStrips ?? 0) + 1; this.burnDirty = true; }
  // ----- Per frame -----
  update(dt, camPos) {
    const fire = this.fire, ctx = this.ctx;
    this.focusX = camPos.x; this.focusZ = camPos.z;
    if (this.time - (this.lastSky ?? -1) > 0.1) { this.lastSky = this.time; this.sky.apply(this.hour); }
    this.sky.follow(camPos);
    this.windU.update(this.time, [this.wind.x * this.wind.speed * 0.35, this.wind.z * this.wind.speed * 0.35]);
    for (const w of this.waters) if (dist2(w.position.x, w.position.z, camPos.x, camPos.z) < 500) w.update(this.time);
    if (this.burnDirty && this.time - (this.lastUpload ?? -1) > 0.5) { this.land.colors.needsUpdate = true; this.burnDirty = false; this.lastUpload = this.time; }
    for (const c of this.cloths) if (dist2(c.x, c.z, camPos.x, camPos.z) < 120) c.mesh.sync();
    this.updateGrass(camPos.x, camPos.z);
    this.decals.update(dt);
    if (this.rain.intensity > 0) { this.rain.wind.set(this.wind.x * this.wind.speed, this.wind.z * this.wind.speed); this.rain.update(dt, camPos); }
    // Dust wind.
    if (this.weather === 'dust' && this.look.next() < dt * 20) ctx.particles.burst('dust-wind', [camPos.x + this.wind.x * -20 + this.look.range(-20, 20), camPos.y + this.look.range(-1, 4), camPos.z + this.wind.z * -20 + this.look.range(-20, 20)], { direction: [this.wind.x, 0.1, this.wind.z] });
    // Flames, stateless: the first 600 burning cells near the camera take the batch each tick.
    this.flameClock += dt;
    if (this.flameClock > 0.1) {
      this.flameClock = 0; this.flameFrame++;
      let n = 0; const b = this.flames, cap = 1800, H = fire.height;
      for (const i of fire.burning) {
        const x = cellX(i), z = cellZ(i);
        if (Math.abs(x - camPos.x) > 220 || Math.abs(z - camPos.z) > 220) continue;
        for (let k = 0; k < 3 && n < cap; k++) {
          const h = (i * 2654435761 + k * 40503) >>> 0;
          const ox = ((h & 255) / 255 - 0.5) * 4.6, oz = (((h >> 8) & 255) / 255 - 0.5) * 4.6;
          b.put(n, x + ox, H[i] + this.flameSize[n] * 0.5 - 0.1, z + oz, (this.flameFrame + k + (h & 3)) % 4, (h & 64) !== 0); n++;
        }
        if (n >= cap) break;
      }
      for (let k = n; k < (this.flameHigh ?? 0); k++) b.put(k, 0, -1000, 0, 0, false);
      this.flameHigh = n;
    }
    // Smoke, embers, lights and sound by cluster (16 x 16 cells).
    this.smokeClock += dt;
    if (this.smokeClock > 0.6) {
      this.smokeClock = 0;
      const tiles = this.tiles; tiles.clear();
      for (const i of fire.burning) { const key = ((i % FIRE_N) >> 4) + (((i / FIRE_N) | 0) >> 4) * 16; const t = tiles.get(key); if (t) { t.n++; t.x += cellX(i); t.z += cellZ(i); } else tiles.set(key, { n: 1, x: cellX(i), z: cellZ(i) }); }
      const list = [...tiles.values()].map((t) => ({ n: t.n, x: t.x / t.n, z: t.z / t.n, d: dist2(t.x / t.n, t.z / t.n, camPos.x, camPos.z) })).sort((a, b2) => a.d - b2.d);
      this.nearestFire = list[0] ?? null;
      for (const t of list.slice(0, 8)) if (t.d < 600) { const y = this.land.heightAt(t.x, t.z); ctx.particles.burst('fire-smoke', [t.x, y + 2, t.z], { count: Math.min(4, 1 + (t.n >> 4)), direction: [this.wind.x * 0.5, 1, this.wind.z * 0.5] }); ctx.particles.burst('ember', [t.x, y + 1, t.z], { direction: [this.wind.x, 1, this.wind.z] }); ctx.particles.burst('ash', [camPos.x + this.wind.x * -8, camPos.y + 3, camPos.z + this.wind.z * -8], { count: 1 }); }
      for (let k = 0; k < 3; k++) {
        const t = list[k], L = this.flameLights[k];
        if (t && t.d < 340) { const y = this.land.heightAt(t.x, t.z) + 5, intensity = clamp(10 + t.n * 0.9, 12, 42), o = { position: [t.x, y, t.z], intensity, radius: 34 + Math.min(40, t.n) }; if (L) L.update(o); else this.flameLights[k] = ctx.lights.request({ ...o, color: 0xff7a30, flicker: 'torch', priority: 2 }); }
        else if (L) { L.release(); this.flameLights[k] = null; }
      }
    }
    // Fauna.
    for (const h of this.herd) {
      const d = dist2(h.x, h.z, camPos.x, camPos.z); h.object.visible = d < 200 && !this.game.session;
      if (!h.object.visible) continue;
      const run = h.flee > 0;
      if (run !== h.running) { h.running = run; if (run) { h.graze.stop(); h.run.play(); } else { h.run.stop(); h.graze.play(); } }
      h.mixer.update(dt); h.object.position.set(h.x, this.land.heightAt(h.x, h.z), h.z); h.object.rotation.y = h.yaw;
    }
    // Vultures circle the biggest scar nearby.
    const nearCount = this.vultures.length && fire.burntCount > 40 && !this.game.session;
    this.boids.seek = this.vultureAt; this.boids.seekWeight = 0.3;
    if (nearCount && fire.burntList.length) { const i = fire.burntList[fire.burntList.length >> 1]; this.vultureAt = [cellX(i), 0, cellZ(i)]; }
    if (nearCount) {
      this.boids.step(Math.min(dt, 0.05));
      for (let i = 0; i < this.vultures.length; i++) {
        const v = this.vultures[i], p = this.boids.pos, u = this.boids.vel;
        v.object.visible = true; v.object.position.set(this.vultureAt[0] + p[i * 3], 40 + p[i * 3 + 1], this.vultureAt[2] + p[i * 3 + 2]); v.object.rotation.y = Math.atan2(u[i * 3], u[i * 3 + 2]); v.mixer.update(dt);
      }
    } else for (const v of this.vultures) v.object.visible = false;
  }
  /** Back to a clean Kettle. */
  reset() {
    this.fire.reset();
    this.land.fuelInto(this.fire);
    for (const f of this.flora) { if (f.state) { f.state = 1; this.floraByCell; } }
    for (const [i] of this.floraByCell) this.restoreFlora(i);
    // Fuel for flora again.
    for (const f of this.flora) if (f.cell >= 0 && this.fire.baseFuel[f.cell]) { const fu = f.id === 'bush' || f.id === 'crop-clump' ? FUEL.SCRUB : FUEL.TREE; this.fire.baseFuel[f.cell] = Math.max(this.fire.baseFuel[f.cell], f.id === 'crop-clump' ? FUEL.TREE : fu); }
    for (const d of this.destructibles) {
      this.fire.baseFuel[d.cell] ||= FUEL.GRASS;
      if (d.destroyed) { d.destroyed = false; d.object.visible = true; d.colliders = addModelColliders(this.ctx.physics, d.build, [d.x, d.y, d.z], (d.yaw * Math.PI) / 180); for (const c of d.colliders) this.own(c, 'prop', d); }
      d.hp = d.maxHp; d.fuse = -1;
    }
    for (const def of SITES) for (const [id, dx, dz] of def.props ?? []) if (['hut', 'shack', 'market-stall', 'clinic-tent', 'gun-rack', 'schoolroom'].includes(id)) for (let ax = -4; ax <= 4; ax += 4) for (let az = -4; az <= 4; az += 4) { const i = fireIndex(def.at[0] + dx + ax, def.at[1] + dz + az); if (i >= 0) this.fire.baseFuel[i] = FUEL.BUILDING; }
    this.fire.fuel.set(this.fire.baseFuel);
    this.land.paintAll();
    for (const s of Object.values(this.sites)) { s.cleared = false; s.clearedAt = -1e9; s.dormant = false; }
    for (const c of this.cases) { c.taken = false; c.object.visible = true; }
    this.setWeather('clear'); this.windPin = null; this.wind.speed = 3;
    for (const ch of this.chunks.values()) ch.stale = true;
    this.day = 1;
  }
}
export { FIRE_CELL, FIRE_ORIGIN, CELL, lerp, BURNT };
mixin(World, FaunaPart);
mixin(World, SitesPart, RoadsPart, GrassPart, WindPart);
