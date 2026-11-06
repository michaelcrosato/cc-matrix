// MenuScene: the title, the Map and every menu set, each a Group that is shown or hidden. One music stream runs throughout.
import { THREE, toonMaterial, PALETTE, buildModel, mergeStaticMeshes, WaterSurface, WAVES_CALM, Boids, Timeline } from '../../pixel-engine.js';
import { CATALOG } from '../models/props.js';
import { CarView } from '../render/carview.js';
import { Person } from '../render/people.js';
import { registerParticles } from '../render/particles.js';
import { setSky, nightOf } from '../render/sky.js';
import { PLACES } from '../data/text.js';
import { CARS } from '../data/cars.js';
import { carRec } from '../sim/career.js';
const { Vector3, Group, Mesh, BoxGeometry, CylinderGeometry, Color } = THREE;
const P = PALETTE;
const box = (w, h, d, c, x, y, z) => { const m = new Mesh(new BoxGeometry(w, h, d), toonMaterial(c)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };
const SETS = { showroom: { x: 400, floor: P.mist, wall: P.white, bg: 0xd8dcea, amb: 1.25, sun: 1.5, song: 'dealer', person: 'fenn', clip: 'DealerPresent', pos: [-3.4, 0, -0.8], cam: { d: 7.8, h: 2.1, a: 0.5, shift: 1.2 } },
  tuning: { x: 800, floor: P.slate, wall: P.night, bg: 0x1a1c2c, amb: 1.15, sun: 1.2, person: 'benno', clip: 'MechanicWipe', pos: [-3.2, 0, -1.2], cam: { d: 7.4, h: 2, a: -0.6, shift: 1.4 } },
  service: { x: 1200, floor: P.slate, wall: P.teal, bg: 0x29366f, amb: 1.2, sun: 1.2, person: 'benno', clip: 'MechanicWipe', pos: [3, 0, -1.2], cam: { d: 7.6, h: 2.2, a: 0.7, shift: -1.2 } },
  garage: { x: 1600, floor: P.mist, wall: P.sand, bg: 0xef7d57, amb: 1.2, sun: 1.3, cam: { d: 7.2, h: 2.2, a: 0.4, shift: 1.2 } },
  museum: { x: 2000, floor: P.white, wall: P.mist, bg: 0x566c86, amb: 1.2, sun: 1.4, cam: { d: 7.2, h: 2.1, a: -0.5, shift: -1.4 } },
  licence: { x: 2400, floor: 0x8a9a6a, wall: null, bg: 0x41a6f6, amb: 1.1, sun: 1.6, person: 'arai', clip: 'ExaminerClipboard', pos: [-3, 0, 0], cam: { d: 8.4, h: 2.3, a: 0.5, shift: 1.8 }, fixed: true },
  hall: { x: 2800, floor: P.navy, wall: P.plum, bg: 0x1a1c2c, amb: 1.15, sun: 1.1, person: 'dell', clip: 'Idle', pos: [3.4, 0, -1], cam: { d: 8, h: 2.4, a: -0.3, shift: -2 }, fixed: true },
  theatre: { x: 3200, floor: P.plum, wall: P.ink, bg: 0x1a1c2c, amb: 0.8, sun: 0.5, cam: { d: 9, h: 2.4, a: 0.1, shift: -1.8 }, fixed: true },
  arcade: { x: 3600, floor: P.night, wall: P.navy, bg: 0x1a1c2c, amb: 1.1, sun: 0.9, cam: { d: 7.8, h: 2.2, a: 0.5, shift: 1.2 } },
  podium: { x: 4000, floor: P.green, wall: P.navy, bg: 0x41a6f6, amb: 1.2, sun: 1.5, cam: { d: 11, h: 2.8, a: 0.2, shift: 0 }, fixed: true },
  reveal: { x: 4400, floor: P.ink, wall: P.ink, bg: 0x08080c, amb: 0.12, sun: 0.02, cam: { d: 8.4, h: 2.1, a: 0.5, shift: 0 }, fixed: true },
};
export class MenuScene {
  name = 'menu';
  constructor(app, route = null) { this.app = app; this.route = route; this.target = new Vector3(); this.sets = {}; this.current = null; this.people = {}; this.camPos = new Vector3(0, 40, 60); this.look = new Vector3(0, 0, 0); this.wantPos = new Vector3(); this.wantLook = new Vector3(); this.orbit = 0; this.car = null; this.turn = 0; this.lights = []; this.mapFocus = 0; this.time = 0; this.placeRects = null; this.tiny = []; this.sink = 0; this.lift = 0; this.spinRate = 0.22; this.anim = null; this.tv = new Vector3(); }
  async setup(ctx) {
    const { app } = this; app.bind(ctx, this); this.ctx = ctx; const cam = ctx.camera.camera; cam.near = 0.5; cam.far = 3000; cam.fov = 40; cam.updateProjectionMatrix();
    registerParticles(ctx.particles); this.buildMap(ctx);
    for (const id of Object.keys(SETS)) this.buildSet(ctx, id);
    for (const [k, outfit] of [['fenn', 'fenn'], ['benno', 'benno'], ['arai', 'arai'], ['dell', 'dell'], ['driver', 'driver'], ['d2', 'crew'], ['d3', 'hiker']]) this.people[k] = await Person.create(ctx, outfit);
    for (const p of Object.values(this.people)) { p.root.visible = false; ctx.scene.add(p.root); }
    this.placeSpeakers();
    this.setSet('map', { title: true });
    app.applyRoute(this.route);
  }
  placeSpeakers() {}
  buildMap(ctx) {
    const g = (this.mapGroup = new Group()), parts = []; ctx.scene.add(g);
    parts.push(box(66, 4, 46, P.sand, 0, -2.4, 0), box(62, 0.6, 42, P.green, 0, -0.3, 0), box(12, 0.5, 8, P.lime, -14, 0, 2), box(10, 0.5, 8, P.lime, 12, 0, -4), box(34, 0.1, 18, P.teal, 0, -0.05, 0));
    // the road loop: a rounded rectangle of slabs
    const loop = []; const W = 25, D = 11, N = 80; for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), x = Math.sign(c) * Math.pow(Math.abs(c), 0.55) * W, z = Math.sign(s) * Math.pow(Math.abs(s), 0.55) * D; loop.push([x, z]); }
    this.loop = loop; loop.forEach(([x, z], i) => { const [nx, nz] = loop[(i + 1) % N], len = Math.hypot(nx - x, nz - z) + 0.2, seg = new Mesh(new BoxGeometry(2.2, 0.1, len), toonMaterial(i % 2 ? 0x3b4460 : 0x333c57)); seg.position.set((x + nx) / 2, 0.05, (z + nz) / 2); seg.rotation.y = Math.atan2(nx - x, nz - z); seg.receiveShadow = true; parts.push(seg); });
    this.placeObjs = PLACES.map((pl) => { const m = buildModel(pl.model, { catalog: CATALOG }).object; m.scale.setScalar(pl.scale); m.position.set(...pl.pos); m.rotation.y = Math.atan2(-pl.pos[0], -pl.pos[2]) * 0.6; m.updateMatrixWorld(true); parts.push(m); return m; });
    let sd = 5; const rd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 40; i++) { const x = -29 + rd() * 58, z = -19 + rd() * 38; if (Math.abs(x) < 27 && Math.abs(z) < 13) continue; const t = buildModel(rd() < 0.5 ? 'pine' : 'oak', { catalog: CATALOG, seed: i }).object; t.scale.setScalar(0.5 + rd() * 0.3); t.position.set(x, 0, z); t.updateMatrixWorld(true); parts.push(t); }
    for (let i = 0; i < 7; i++) { const t = buildModel('oak', { catalog: CATALOG, seed: i }).object; t.scale.setScalar(0.5); t.position.set(-12 + i * 4, 0, 2 + (i % 2) * 2); t.updateMatrixWorld(true); parts.push(t); }
    g.add(...mergeStaticMeshes(parts));
    this.water = new WaterSurface({ size: [300, 220], at: [0, -2.6, 0], waves: WAVES_CALM, segments: [60, 44], deep: P.blue, shallow: P.sky, foam: P.white }); g.add(this.water);
    for (const [id, off, s] of [['kite', 0, 0.25], ['ginga', 26, 0.25], ['ryu', 52, 0.25], ['longhorn', 12, 0.25]]) { const v = new CarView(id, null, { scale: s }); g.add(v.root); this.tiny.push({ v, off, sp: 7 + off * 0.03 }); }
    this.boats = [[-46, -28], [52, 22], [-58, 24]].map(([x, z], i) => { const b = new Group(); b.add(box(3, 0.6, 1.2, P.white, 0, 0, 0), box(0.14, 2.6, 0.14, P.ink, 0, 1.4, 0), box(1.4, 1.8, 0.06, P.sand, 0.6, 1.5, 0)); b.position.set(x, -2.2, z); g.add(b); return { b, x, z, i }; });
    this.gulls = new Boids(14, { bounds: { min: [-34, 7, -24], max: [34, 16, 24] }, view: 8, space: 3, maxSpeed: 7, minSpeed: 3, seed: 4 }); this.gullM = []; const gg = new BoxGeometry(0.6, 0.12, 0.2), wm = toonMaterial(P.white); for (let i = 0; i < 14; i++) { const m = new Mesh(gg, wm); g.add(m); this.gullM.push(m); }
    this.cloudsM = []; for (let i = 0; i < 8; i++) { const c = new Group(); for (let k = 0; k < 3; k++) { const b = new Mesh(new BoxGeometry(6 + rd() * 6, 1.6, 4 + rd() * 3), toonMaterial(P.white)); b.position.set((k - 1) * 4, k === 1 ? 1 : 0, 0); c.add(b); } c.position.set(-60 + rd() * 120, 22 + rd() * 8, -40 + rd() * 80); g.add(c); this.cloudsM.push(c); }
    this.parkedAt = new Vector3(8, 0, 16.2);
    const sv = PLACES.find((x) => x.id === 'service').pos; this.mapBrushes = [-1.1, 1.1].map((dx) => { const b = buildModel('brush', { catalog: CATALOG }).object; b.scale.setScalar(0.7); b.position.set(sv[0] + dx - 3.8, 0, sv[2] + 1.8); g.add(b); return b; });
    this.nightLamps = new Group(); g.add(this.nightLamps); const lamp = buildModel({ id: 'map-lamp', about: 'a road lamp on the diorama', tags: ['diorama'], palette: { p: 'ink', l: 'sand' }, collider: 'none', parts: [{ box: [0.14, 1.1, 0.14], at: [0, 0.55, 0], c: 'p' }, { box: [0.34, 0.26, 0.34], at: [0, 1.2, 0], c: 'l', glow: true }] }).object; loop.forEach(([x, z], i) => { if (i % 7) return; const m = lamp.clone(true); m.position.set(x * 1.09, 0, z * 1.14); this.nightLamps.add(m); }); for (const pl of PLACES) { const m = lamp.clone(true); m.scale.setScalar(1.4); m.position.set(pl.pos[0] + 3, 0, pl.pos[2] + 3); this.nightLamps.add(m); }
  }
  buildSet(ctx, id) {
    const s = SETS[id], g = new Group(), parts = []; g.position.set(s.x, 0, 0); g.visible = false; ctx.scene.add(g); this.sets[id] = g;
    const floor = box(60, 1, 60, s.floor, 0, -0.5, 0); floor.castShadow = false; parts.push(floor);
    if (s.wall != null) { parts.push(box(60, 18, 1, s.wall, 0, 9, -9), box(1, 18, 30, s.wall, -14, 9, 4), box(1, 18, 30, s.wall, 14, 9, 4)); }
    const turntable = new Mesh(new CylinderGeometry(3.4, 3.5, 0.18, 24), toonMaterial(id === 'showroom' ? P.slate : id === 'podium' || id === 'reveal' ? P.night : P.night)); turntable.position.y = 0.09; turntable.receiveShadow = true; g.add(turntable); g.userData.turntable = turntable;
    const add = (name, x, y, z, yaw = 0, o = {}) => { const m = buildModel(name, { catalog: CATALOG, ...o }).object; m.position.set(x, y, z); m.rotation.y = yaw; if (o.scale) m.scale.setScalar(o.scale); m.updateMatrixWorld(true); parts.push(m); return m; };
    if (id === 'showroom') { for (const x of [-9, -3, 3, 9]) { parts.push(box(0.5, 10, 0.5, P.slate, x, 5, -8.4), box(4.2, 7, 0.1, P.cyan, x + 3, 4, -8.5)); } parts.push(box(40, 0.4, 2, P.navy, 0, 9, -7), box(9, 0.8, 0.2, P.red, 0, 8, -8.4)); add('bench', 5, 0, -5, 0.4); add('signpost', -6, 0, -5, 0.3); }
    if (id === 'tuning') { add('lift', 0, 0, -0.4); add('crate', 5, 0, -6); add('barrel', 6, 0, -5); add('barrel', 6.8, 0, -6.5); parts.push(box(9, 3, 0.4, P.slate, 0, 3.4, -8.3), box(4, 0.2, 1, P.mist, -8, 1.1, -7), box(2.4, 2, 0.1, P.orange, 8, 4, -8.4)); this.rollers = add('rollers', 0, 0.18, 1.2); g.userData.sparksAt = [4, 1.3, -3]; }
    if (id === 'service') { const a = buildModel('brush', { catalog: CATALOG }).object, b = buildModel('brush', { catalog: CATALOG }).object; a.position.set(-1.9, 0, -5); b.position.set(1.9, 0, -5); g.add(a, b); g.userData.brushes = [a, b]; parts.push(box(0.5, 4, 0.5, P.slate, -3, 2, -6), box(0.5, 4, 0.5, P.slate, 3, 2, -6), box(6.5, 0.5, 0.5, P.slate, 0, 3.8, -6)); add('barrel', -6, 0, -6, 0, { palette: { wood: 'navy' } }); add('barrel', -7, 0, -5.4); }
    if (id === 'garage') { parts.push(box(7, 4.2, 0.2, P.mist, 0, 2.1, -8.4)); for (let i = 0; i < 6; i++) parts.push(box(7, 0.08, 0.24, P.slate, 0, 0.5 + i * 0.68, -8.3)); parts.push(box(6, 0.2, 0.9, P.orange, -7, 2.4, -8), box(6, 0.2, 0.9, P.orange, -7, 3.8, -8)); g.userData.shelf = new Group(); g.add(g.userData.shelf); }
    if (id === 'museum') { for (const x of [-10, -5, 5, 10]) { const c = new Mesh(new CylinderGeometry(0.7, 0.8, 9, 8), toonMaterial(P.white)); c.position.set(x, 4.5, -6); c.castShadow = true; parts.push(c); } parts.push(box(30, 1, 3, P.white, 0, 9, -6)); }
    if (id === 'licence') { add('control-tower', -7, 0, -22); add('van', 8, 0, -10, 1.1); add('hangar', 26, 0, -34, 0); for (let i = 0; i < 10; i++) parts.push(box(0.4, 0.7, 0.4, P.orange, -14 + i * 3, 0.35, 8)); parts.push(box(60, 0.04, 4, 0x5a5d70, 0, 0.03, 8), box(0.3, 6, 0.3, P.mist, 13, 3, -6)); g.userData.sock = box(2, 0.5, 0.5, P.orange, 14, 5.6, -6); parts.push(g.userData.sock); }
    if (id === 'hall') { add('grandstand', 0, 0, -18); parts.push(box(16, 3, 0.3, P.red, 0, 7, -8.2), box(14, 0.5, 0.34, P.sand, 0, 7, -8.1)); add('cup', -5, 0.8, -5, 0, { scale: 3 }); parts.push(box(1.4, 0.8, 1.4, P.mist, -5, 0.4, -5)); add('cup', -8, 0.8, -6, 0, { scale: 2 }); parts.push(box(1.4, 0.8, 1.4, P.mist, -8, 0.4, -6)); }
    if (id === 'theatre') { parts.push(box(16, 8, 0.2, P.white, 0, 5, -8.4)); for (let r = 0; r < 3; r++) for (let i = 0; i < 8; i++) parts.push(box(1, 0.8, 1, P.red, -6 + i * 1.7, 0.4, 3 + r * 2.2)); g.userData.turntable.visible = false; }
    if (id === 'arcade') { add('arch', 0, 0, -6, 0, { scale: 2 }); parts.push(box(1, 6, 1, P.red, -9, 3, -7), box(1, 6, 1, P.cyan, 9, 3, -7)); }
    if (id === 'podium') { add('podium', 0, 0, -2, 0, { scale: 1.2 }); add('grandstand', 0, 0, -24); parts.push(box(10, 3, 0.2, P.red, 0, 6.6, -8.2)); g.userData.turntable.position.z = 3.5; g.userData.turntable.visible = false; }
    if (id === 'reveal') { const cover = buildModel('car-cover', { catalog: CATALOG }).object; g.add(cover); g.userData.cover = cover; }
    g.add(...mergeStaticMeshes(parts.map((m) => { m.position.x += 0; return m; })));
    g.children.filter((m) => m.isMesh && m.geometry?.attributes?.position?.count > 100).forEach(() => {});
  }
  /** Show a set: { car, install, dirt, dark, title, trophies } */
  setSet(id, args = {}) {
    const ctx = this.ctx, app = this.app; this.current = id; this.mapGroup.visible = id === 'map';
    for (const [k, g] of Object.entries(this.sets)) g.visible = k === id;
    for (const l of this.lights) l.release(); this.lights = [];
    for (const p of Object.values(this.people)) p.root.visible = false;
    this.removeCar();
    this.spinRate = 0.22;
    if (id === 'map') {
      const hour = args.title ? 18.2 : this.progressHour(); this.isTitle = !!args.title; setSky(ctx.engine, hour); this.mapHour = hour; this.orbit = 0;
      const r = app.profile && carRec(app.profile); this.parked?.dispose(); this.parked = null; if (r && !args.title) { const v = new CarView(r.id, r.install, { scale: 0.25, dirt: r.dirt }); v.root.position.copy(this.parkedAt); v.pose({ x: this.parkedAt.x, y: 0.1, z: this.parkedAt.z, yaw: Math.PI, u: 0 }, 0, null); this.mapGroup.add(v.root); this.parked = v; }
      const n = nightOf(hour); this.nightLamps.visible = n > 0.3; this.mapNight = n;
      if (n > 0.3) this.lights.push(ctx.lights.request({ position: [0, 6, 0], color: 0xffd9a0, intensity: 14, radius: 60, priority: 2 }));
      if (n > 0.7 && !args.title) { ctx.engine.ambient.intensity = 0.62; ctx.engine.ambient.color.setHex(0x7078c0); ctx.engine.sun.intensity = 0.28; } // the Map at night is darker than a race: the lamps do the work
      this.camPos.set(0, 34, 62); return;
    }
    const s = SETS[id]; ctx.engine.scene.background = new Color(s.bg); ctx.engine.ambient.intensity = s.amb; ctx.engine.ambient.color.setHex(0xffffff); ctx.engine.sun.intensity = s.sun; ctx.engine.sun.color.setHex(0xfff4e0); ctx.engine.setSunDirection([0.45, 0.85, 0.5]);
    this.orbit = s.cam.a;
    if (s.person) { const p = this.people[s.person]; p.root.visible = true; p.root.position.set(s.x + s.pos[0], 0, s.pos[2]); p.root.rotation.y = Math.atan2(-s.pos[0], -s.pos[2] + 4); p.play(s.clip); }
    if (id !== 'theatre') { this.lights.push(ctx.lights.request({ position: [s.x + 2, 5, 3], color: 0xfff0d0, intensity: id === 'reveal' ? 0 : 18, radius: 14, priority: 4 }), ctx.lights.request({ position: [s.x - 3, 5, 2], color: 0xc0d8ff, intensity: id === 'reveal' ? 0 : 10, radius: 12, priority: 3 })); }
    if (args.car) this.showCarAt(args.car, args.install ?? null, args.dirt ?? 0, args.dark);
    if (id === 'garage') this.buildShelf(args.trophies ?? app.profile?.trophies ?? []);
    if (id === 'licence' && !args.car) { const r = app.profile && carRec(app.profile); if (r) this.showCarAt(r.id, r.install, r.dirt); }
    if (id === 'hall') { const r = app.profile && carRec(app.profile); if (r) this.showCarAt(r.id, r.install, r.dirt); }
    if (id === 'theatre') { const r = app.profile && carRec(app.profile); if (r) this.showCarAt(r.id, r.install, r.dirt); this.spinRate = 0.1; }
    if (id === 'arcade' && !args.car) this.showCarAt('type9');
    this.camSnap = true;
  }
  buildShelf(list) { const sh = this.sets.garage.userData.shelf; sh.clear(); list.slice(-9).forEach((t, i) => { const m = buildModel(t.kind === 'helmet' ? 'helmet' : 'cup', { catalog: CATALOG }).object; m.scale.setScalar(1.8); m.position.set(-9.4 + (i % 5) * 1.1, i < 5 ? 2.5 : 3.9, -8); sh.add(m); }); }
  progressHour() { const p = this.app.profile; if (!p) return 9; if (p.events?.gp?.won || p.events?.touring?.won || p.events?.h200?.won) return 21; if (p.licences?.A) return 18.5; if (p.licences?.B) return 15; if (p.licences?.C) return 12; return 9; }
  showCarAt(carId, install = null, dirt = 0, dark = false) {
    this.removeCar(); const s = SETS[this.current]; if (!s || !carId) return;
    const inst = install ?? { paint: dark ? 'ink' : CARS[carId].paint, parts: {}, settings: {}, rims: 0, tyre: null }; if (dark) inst.paint = 'ink';
    const v = new CarView(carId, inst, { dirt }); if (dark) v.root.traverse((m) => { if (m.isMesh) m.material = toonMaterial(P.ink); }); v.root.position.set(s.x, 0.18, this.current === 'podium' ? 3.5 : 0); this.ctx.scene.add(v.root); this.car = v; this.carId = carId; this.turn = this.turn || 0; this.sink = 0; v.pose({ x: s.x, y: 0.18, z: 0, yaw: this.turn, u: 0 }, 0, null);
    if (this.current === 'showroom') this.seenFlag?.(carId);
  }
  removeCar() { if (this.car) { this.car.dispose(); this.car = null; } }
  carSink() { this.sink = 1; this.ctx.tweens.value(1, 0, { duration: 0.7, ease: 'outBack' }, (v) => (this.sink = v)); }
  partFitted(rec) { this.showCarAt(rec.id, rec.install, rec.dirt); this.ctx.particles.burst('sparks', [SETS[this.current].x + 2, 1, 1]); }
  // ---- dyno
  dynoStart() { const r = carRec(this.app.profile), s = SETS.tuning; this.dynoOn = true; this.spinRate = 0; this.app.mix.setCars([{ carId: r.id, params: { redline: 7000, ...this.paramsOf(r), exhaustUp: !!r.install.parts.exhaust } }]); this.turn = 0; void s; this.orbit = -2.3; }
  paramsOf(r) { return { redline: CARS[r.id].phys.redline, turbo: CARS[r.id].phys.turbo || !!r.install.parts.turbo }; }
  dynoFrame(rpm, th, dt) { this.dynoRpm = rpm; if (this.car) { const u = (rpm / 7000) * 40; this.car.spin += (u / 0.34) * dt; for (const w of this.car.wheels) w.spin.rotation.x = this.car.spin; this.car.body.position.y = Math.sin(this.time * 80) * 0.008; } this.app.mix.driving([{ rpm, throttle: th, spool: rpm / 7000, level: 1 }], { speed: 0 }, dt); if (th > 0.5 && Math.random() < 0) void 0; }
  dynoEnd() { this.dynoOn = false; this.spinRate = 0.22; this.app.mix.clearEngines(); this.app.mix.quietDriving(); }
  // ---- service
  oilAnim() { const tw = this.ctx.tweens; this.lift = 0; tw.value(0, 0.9, { duration: 0.8, ease: 'inOutSine' }, (v) => (this.lift = v)); tw.call(2.2, () => tw.value(0.9, 0, { duration: 0.8, ease: 'inOutSine' }, (v) => (this.lift = v))); this.app.mix.play('jackUp'); }
  washAnim() { const tw = this.ctx.tweens, g = this.sets.service.userData.brushes, s = SETS.service; const z = { v: -4 }; this.washing = 3; tw.to(z, { v: 4 }, { duration: 1.5, ease: 'inOutSine', onUpdate: () => g.forEach((b) => (b.position.z = z.v)) }); tw.call(1.6, () => tw.to(z, { v: -5 }, { duration: 1.4, ease: 'inOutSine', onUpdate: () => g.forEach((b) => (b.position.z = z.v)) })); this.ctx.tweens.value(0, 1, { duration: 3 }, (f) => { g.forEach((b) => (b.position.z = -5 + (f < 0.5 ? f * 2 : 2 - f * 2) * 9)); if (this.car) this.car.setDirt((this.car.dirtStart ?? this.car.dirt) * (1 - f)); }); this.car && (this.car.dirtStart = this.car.dirt); void s; this.app.mix.play('brush'); }
  // ---- per frame
  update(ctx, dt) {
    const app = this.app; app.frameStart(ctx); this.time += dt; ctx.hud.clear(); const cam = ctx.camera.camera;
    for (const p of Object.values(this.people)) if (p.root.visible) p.update(dt);
    if (this.current === 'map') this.updateMap(ctx, dt, cam);
    else this.updateSet(ctx, dt, cam);
    this.reveal?.update?.(dt, this);
    app.frameEnd(ctx, dt);
  }
  updateMap(ctx, dt, cam) {
    this.water.update(this.time); const app = this.app, foc = PLACES[this.mapFocus] ?? PLACES[0], title = this.isTitle;
    for (const t of this.tiny) { const N = this.loop.length, s = (this.time * t.sp + t.off) / 2.6, i = Math.floor(s) % N, f = s - Math.floor(s), [ax, az] = this.loop[i], [bx, bz] = this.loop[(i + 1) % N], x = ax + (bx - ax) * f, z = az + (bz - az) * f; t.v.pose({ x, y: 0.12, z, yaw: Math.atan2(bx - ax, bz - az), u: t.sp / 0.25, delta: 0 }, dt, null); }
    this.mapBrushes.forEach((b) => (b.rotation.y += dt * 7)); this.sparkT = (this.sparkT ?? 0) - dt; if (this.sparkT < 0) { this.sparkT = 1.1; const tp = PLACES.find((x) => x.id === 'tuning').pos; ctx.particles.burst('sparks', [tp[0] - 2.4, 1, tp[2] + 2.5], { count: 6 }); }
    this.boats.forEach((b) => { b.b.position.x = b.x + Math.sin(this.time * 0.07 + b.i) * 8; b.b.rotation.z = Math.sin(this.time * 0.8 + b.i) * 0.05; });
    this.gulls.step(Math.min(dt, 1 / 30)); this.gullM.forEach((m, i) => m.position.set(this.gulls.pos[i * 3], this.gulls.pos[i * 3 + 1], this.gulls.pos[i * 3 + 2]));
    this.cloudsM.forEach((c, i) => { c.position.x += dt * (0.4 + i * 0.05); if (c.position.x > 70) c.position.x = -70; });
    if (title) { const a = this.time * 0.05; this.wantPos.set(Math.sin(a) * 58, 26, Math.cos(a) * 58); this.wantLook.set(0, 2, 0); }
    else { const still = app.actions.device === 'mouse' ? 0 : 1, fx = foc.pos[0] * still, fz = foc.pos[2] * still; /* with a mouse the camera holds still, so a building stays under the cursor */ this.wantPos.set(fx * 0.35, 30, 44 + fz * 0.3); this.wantLook.set(fx * 0.28, 0, fz * 0.28); }
    this.camPos.lerp(this.wantPos, 1 - Math.exp(-dt * 2.2)); this.look.lerp(this.wantLook, 1 - Math.exp(-dt * 2.6));
    cam.position.copy(this.camPos); cam.lookAt(this.look); if (cam.fov !== 40) { cam.fov = 40; cam.updateProjectionMatrix(); }
    this.target.set(0, 0, 0);
    cam.updateMatrixWorld(); const hud = ctx.hud, v = this.tv;
    this.placeRects = PLACES.map((pl) => { v.set(pl.look[0], pl.look[1] + 1, pl.look[2]).project(cam); const px = Math.round(((v.x + 1) / 2) * hud.width), py = Math.round(((1 - v.y) / 2) * hud.height); return { x: Math.max(4, Math.min(hud.width - 42, px - 19)), y: Math.max(26, Math.min(hud.height - 100, py - 19)), w: 38, h: 38 }; });
  }
  updateSet(ctx, dt, cam) {
    const s = SETS[this.current], a = this.app.actions, input = ctx.input;
    if (this.car) {
      if (!s.fixed || this.current === 'licence' || this.current === 'hall' || this.current === 'theatre') this.turn += dt * this.spinRate; if (input.isDown('MouseLeft') && Math.abs(input.mouseDelta.x) > 0) this.turn += input.mouseDelta.x * 0.01; const pad = a.padNow; if (pad && Math.abs(pad.a[2] ?? 0) > 0.15) this.turn += pad.a[2] * dt * 2.4;
      const tt = this.sets[this.current].userData.turntable; if (tt) tt.rotation.y = this.turn;
      if (!this.dynoOn) this.car.root.rotation.y = this.turn; this.car.root.position.y = 0.18 - this.sink * 0.1 + this.lift; this.car.body.position.y = -this.sink * 0.05; this.target.copy(this.car.root.position);
      if (this.dynoOn) { this.car.root.rotation.y = 0; }
    } else this.target.set(s.x, 0.5, 0);
    const c = s.cam, an = this.orbit + Math.sin(this.time * 0.11) * 0.12; const sn = Math.sin(an), cs = Math.cos(an), rx = cs, rz = -sn;
    this.wantPos.set(s.x + sn * c.d, c.h + Math.sin(this.time * 0.17) * 0.12, cs * c.d); this.wantLook.set(s.x + rx * c.shift, 0.8, rz * c.shift);
    if (this.camSnap) { this.camPos.copy(this.wantPos); this.look.copy(this.wantLook); this.camSnap = false; } else { this.camPos.lerp(this.wantPos, 1 - Math.exp(-dt * 3)); this.look.lerp(this.wantLook, 1 - Math.exp(-dt * 3)); }
    if (!this.shotOverride) { cam.position.copy(this.camPos); cam.lookAt(this.look); if (cam.fov !== 40) { cam.fov = 40; cam.updateProjectionMatrix(); } }
    if (this.current === 'tuning' && Math.floor(this.time * 2.3) % 6 === 0 && this.time % 0.4 < dt) ctx.particles.burst('sparks', [s.x + 4, 1.3, -3], { count: 5 });
    if (this.washing > 0 && this.car) { this.washing -= dt; if (this.time % 0.1 < dt) ctx.particles.burst('foam', [s.x + (Math.sin(this.time * 7) > 0 ? 1 : -1), 0.9, this.sets.service.userData.brushes[0].position.z]); this.sets.service.userData.brushes.forEach((b) => (b.rotation.y += dt * 12)); }
  }
  cameraTarget() { return this.target; }
  status() { const u = this.app.ui; return `menu ${u.top?.id ?? this.current} focus=${u.focus ?? ''}`; }
  ready(ctx) { this.app.onReady?.(ctx, this); }
  fingerprint() { return `${this.current}|${this.app.ui.top?.id}|${this.app.profile?.credits ?? 0}`; }
}
void Timeline;
export { SETS };
