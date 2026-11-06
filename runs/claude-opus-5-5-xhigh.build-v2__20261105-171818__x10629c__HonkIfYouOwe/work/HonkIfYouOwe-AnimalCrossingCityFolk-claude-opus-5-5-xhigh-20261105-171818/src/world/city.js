// The Big City: an L-shaped boulevard around a plaza. Day bright, night neon, crowd, pigeons.
import { THREE, buildModel, toonMaterial, PALETTE, textureMap, Boids, mergeStaticMeshes, NavGrid, setLookLayer, glowMaterial } from '../engine.js';
import { Place } from './place.js';
import { MODELS } from '../art/models.js';
import { CITY_ROWS, CITY_FRONTS_DATA, CITY_DOORS } from '../data/cityMap.js';
import { Actor } from '../actors/rig.js';
import { CROWD_DEFS, CRITTER_DEFS } from '../art/critter.js';
import { Stream } from '../core/rng.js';
import { STREET } from '../data/dialogue/hosts.js';
import { hourNow } from '../systems/time.js';

const { BoxGeometry, Group, Mesh, PlaneGeometry, Vector3 } = THREE;
const W = 40, D = 24;
const tileAt = (x, z) => (x < 0 || z < 0 || x >= W || z >= D ? '#' : CITY_ROWS[Math.floor(z)][Math.floor(x)]);
export const CITY_BUS_STOP = [2.5, 10];
const TILE_M = 4;

function floorPlane(x0, z0, w, d, tex) {
  const g = new PlaneGeometry(w, d).rotateX(-Math.PI / 2);
  const uv = g.attributes.uv.array;
  for (let i = 0; i < uv.length; i += 2) { uv[i] = (uv[i] * w) / TILE_M; uv[i + 1] = (uv[i + 1] * d) / TILE_M; }
  const m = new Mesh(g, toonMaterial(PALETTE.white, { map: textureMap(tex) }));
  m.position.set(x0 + w / 2, 0, z0 + d / 2);
  m.receiveShadow = true;
  return m;
}
export class CityPlace extends Place {
  constructor(g) {
    super('city', 'city', { ox: 500, oz: 0, name: 'The Big City' });
    this.g = g;
    this.occluders = [];
    this.lampLights = [];
    this.frontsLights = [];
    this.crowd = [];
    this.music = () => (this.isNight() ? 'cityNight' : 'cityDay');
    this.nav = NavGrid.fromRows(CITY_ROWS.map((r) => r.replace(/[^.=_]/g, '#')), { blocked: '#', cell: 1, origin: [0, 0, 0] });
    this.built = false;
    this.build();
  }
  isNight() { const h = this.g.world ? hourNow(this.g.world) : 12; return h >= 18 || h < 6; }
  blocked(x, z) { const c = tileAt(x, z); if (this.g.noclip) return x < 0 || z < 0 || x >= W || z >= D; return !(c === '.' || c === '=' || c === '_'); }
  height() { return 0; }
  surfaceAt() { return 'stepStone'; }
  build() {
    const parts = new Group();
    this.group.add(parts);
    parts.add(floorPlane(0, 0, W, D, 'city-pavement'));
    // Roads
    const road = floorPlane(0, 9, 34, 2, 'city-road'); road.position.y = 0.01; parts.add(road);
    const road2 = floorPlane(30, 11, 2, 13, 'city-road'); road2.position.y = 0.01; parts.add(road2);
    // Plaza paving
    const pl = floorPlane(4, 13, 15, 10, 'plaza-warm'); pl.position.y = 0.01; parts.add(pl);
    const under = new Mesh(new BoxGeometry(70, 0.3, 60), toonMaterial(PALETTE.ink)); under.position.set(20, -0.2, 12); parts.add(under);
    this.doors = {};
    for (const f of CITY_FRONTS_DATA) {
      const o = buildModel(f.model, { catalog: MODELS }).object;
      o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      o.position.set(f.x, 0, f.z);
      o.rotation.y = ((f.rot ?? 0) * Math.PI) / 180;
      parts.add(o);
      const entry = { f, o, neon: o.getObjectByName('neon') };
      this.frontsLights.push(entry);
      this.occluders.push({ object: o, min: new Vector3(f.x - f.w / 2, 0, f.z - f.d / 2), max: new Vector3(f.x + f.w / 2, 5, f.z + f.d / 2) });
    }
    // Skyline behind the north row and to the east
    const sky = buildModel('city-skyline', { catalog: MODELS }).object;
    sky.position.set(16, 0, -8);
    parts.add(sky);
    const sky2 = buildModel('city-skyline', { catalog: MODELS }).object;
    sky2.position.set(-16, 0, 6); sky2.rotation.y = Math.PI / 2;
    parts.add(sky2);
    const sky3 = buildModel('city-skyline', { catalog: MODELS }).object;
    sky3.position.set(46, 0, 8); sky3.rotation.y = -Math.PI / 2;
    parts.add(sky3);
    this.lamps = [[6, 12.4], [14, 12.4], [22, 12.4], [29, 12.4], [33.4, 16], [33.4, 21], [12, 22.8], [4.4, 18]].map(([x, z]) => {
      const l = buildModel('city-lamp', { catalog: MODELS }).object;
      l.position.set(x, 0, z);
      parts.add(l);
      return { x: x + 0.6, y: 2.86, z };
    });
    // Fountain, benches, bus stop, street musician, tent
    const fountain = buildModel('fountain', { catalog: MODELS }).object;
    fountain.position.set(9, 0, 18);
    parts.add(fountain);
    const shelter = buildModel('bus-shelter', { catalog: MODELS }).object;
    shelter.position.set(2.5, 0, 7.5);
    parts.add(shelter);
    for (const [x, z] of [[14, 15], [14, 21], [5, 15]]) { const b = buildModel('park-bench', { catalog: MODELS }).object; b.position.set(x, 0, z); parts.add(b); }
    this.musician = new Actor(CROWD_DEFS[10], { name: 'busker', seed: 5 });
    this.musician.x = 17.5; this.musician.z = 13.6; this.musician.facing = 0.4;
    this.musician.addTo(this.group);
    this.musician.play('Accordion', 0);
    // Pigeons
    this.pigeons = new Boids(14, { bounds: { min: [4, 0.4, 13], max: [19, 3, 23] }, seed: 3 });
    this.pigeonMeshes = [];
    const pm = toonMaterial(PALETTE.mist);
    for (let i = 0; i < 14; i++) { const m = new Mesh(new BoxGeometry(0.22, 0.14, 0.3), pm); this.group.add(m); this.pigeonMeshes.push(m); }
    this.buildCrowd();
    this.group.visible = false;
  }
  buildCrowd() {
    const s = new Stream('city-crowd');
    const n = 16;
    for (let i = 0; i < n; i++) {
      const def = CROWD_DEFS[i % CROWD_DEFS.length];
      const a = new Actor(def, { name: `ped${i}`, seed: i + 1 });
      a.addTo(this.group);
      const route = s.pick(ROUTES);
      const t = s.next();
      const p = { a, route, i: Math.floor(t * route.length), speed: s.range(1.2, 2.2), bubble: null, bubbleT: 0, nextLine: s.range(4, 18), line: s.int(0, 100) };
      const pos = route[p.i];
      a.x = pos[0] + s.range(-1, 1); a.z = pos[1] + s.range(-1, 1);
      p.offX = s.range(-0.9, 0.9); p.offZ = s.range(-0.9, 0.9);
      a.play('Walk', 0, { speed: p.speed / 2.6 });
      this.crowd.push(p);
    }
  }
  enter(g) {
    this.setLook(this.isNight());
    this.applyNight(true);
  }
  leave(g) {
    g.engine.setLook(g.baseLook());
    this.lookNight = false;
    this.clearLights();
  }
  setLook(night) {
    if (this.lookNight === night) return;
    this.lookNight = night;
    const look = night ? { ...this.g.baseLook(), scene: [{ id: 'bloom', params: { amount: 0.3 } }] } : this.g.baseLook();
    this.g.engine.setLook(look);
  }
  clearLights() { for (const l of this.lampLights) l.release(); this.lampLights = []; }
  applyNight(force = false) {
    const g = this.g;
    const night = this.isNight();
    if (!force && night === this.nightApplied) return;
    this.nightApplied = night;
    this.clearLights();
    const NEON = [0x73eff7, 0xef7d57, 0xa7f070, 0x41a6f6, 0xffcd75, 0xb13e53, 0xa7f070, 0xef7d57];
    if (night) {
      for (const [i, e] of this.frontsLights.entries()) {
        this.lampLights.push(g.ctx.lights.request({ position: [e.f.door[0] + 500, 2.6, e.f.door[1] + 1.2], color: NEON[i % NEON.length], intensity: 9, radius: 7.5, flicker: i % 3 === 0 ? 'pulse' : 'none', priority: 2 }));
      }
      for (const l of this.lamps) this.lampLights.push(g.ctx.lights.request({ position: [l.x + 500, l.y, l.z], color: 0xffcd75, intensity: 6, radius: 6 }));
    }
    for (const e of this.frontsLights) if (e.neon) e.neon.visible = night || e.f.neonDay;
    // Magda's only exists after dark
    const magda = this.frontsLights.find((e) => e.f.id === 'magda');
    if (magda) magda.o.visible = night;
  }
  update(dt, t) {
    this.applyNight();
    const g = this.g;
    if (g.player) {
      const p = g.player;
      const run = g.place === this && p.speed > 4;
      this.pigeons.flee = run ? { at: [p.x, 0.5, p.z], radius: 6 } : null;
    }
    this.pigeons.step(dt);
    for (let i = 0; i < 14; i++) {
      const m = this.pigeonMeshes[i];
      m.position.set(this.pigeons.pos[i * 3], Math.max(0.2, this.pigeons.pos[i * 3 + 1]), this.pigeons.pos[i * 3 + 2]);
      m.rotation.y = Math.atan2(this.pigeons.vel[i * 3], this.pigeons.vel[i * 3 + 2]);
    }
    this.musician.update(dt);
    for (const c of this.crowd) {
      const target = c.route[c.i];
      const tx = target[0] + c.offX, tz = target[1] + c.offZ;
      const dx = tx - c.a.x, dz = tz - c.a.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.3) c.i = (c.i + 1) % c.route.length;
      else { c.a.x += (dx / d) * c.speed * dt; c.a.z += (dz / d) * c.speed * dt; c.a.turnTo = Math.atan2(dx, dz); }
      c.a.update(dt);
      c.nextLine -= dt;
      if (c.nextLine <= 0) {
        c.line += 7;
        c.nextLine = 10 + (c.line % 14);
        const p = g.player;
        if (Math.hypot(c.a.x - p.x, c.a.z - p.z) < 5) { c.bubble = STREET[c.line % STREET.length]; c.bubbleT = 3.5; }
      }
      if (c.bubbleT > 0) c.bubbleT -= dt;
    }
  }
  interactables(g) {
    const out = [];
    for (const d of CITY_DOORS) {
      if (d.id === 'magda' && !this.isNight()) continue;
      out.push({ id: `venue:${d.id}`, x: d.x, z: d.z, r: 1.7, label: `Enter ${d.name}`, act: 'venueDoor', venue: d });
    }
    out.push({ id: 'busHome', x: CITY_BUS_STOP[0], z: CITY_BUS_STOP[1], r: 1.8, label: 'Take the bus home', act: 'busHome' });
    return out;
  }
  hostActor() { return null; }
}
const ROUTES = [
  [[3, 11.5], [12, 11.5], [24, 11.5], [32, 11.5], [32, 22], [32, 11.5], [12, 11.5]],
  [[32, 8], [20, 8], [6, 8], [6, 12], [20, 12], [32, 12]],
  [[6, 15], [17, 15], [17, 21], [6, 21]],
  [[28, 22], [28, 13], [20, 12], [28, 13]],
  [[12, 8], [28, 8], [33, 8], [33, 20], [28, 20], [28, 8]],
];
export { setLookLayer, glowMaterial, mergeStaticMeshes, CRITTER_DEFS };
