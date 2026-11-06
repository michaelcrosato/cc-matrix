// The menu's sets: the peninsula diorama, and one stage per place. Every set is a Group far from the others; one shows at a time.
import { buildModel, setLookLayer, THREE, WaterSurface, WAVES_CALM, PALETTE, toonMaterial, Boids } from '../../pixel-engine.js';
import { BUILDING_DEFS } from '../models/buildings.js';
import { GeoBatch, mix, seeded } from './geo.js';
import { blockText } from './blocktext.js';
import { CarView } from './carview.js';
const { Group, Vector3, Mesh, CylinderGeometry, BoxGeometry, InstancedMesh, ConeGeometry, Object3D } = THREE;
export const PLACES = { licence: [-21, -10, 0.5], events: [-5, -14, 0], dealer: [12, -13, 0], tuning: [24, -4, -0.9], service: [23, 9, -1.3], garage: [9, 13, 3.14], museum: [-7, 14, 3.14], theatre: [-21, 11, 2.5], arcade: [-27, 0, 1.57] };
const ROAD_LOOP = (t) => { const a = t * Math.PI * 2; return [Math.cos(a) * 20 * (1 + 0.08 * Math.cos(a * 3)), Math.sin(a) * 8]; };
export function buildDiorama(ctx) {
  const g = new Group(), b = new GeoBatch(), glow = new GeoBatch(), r = seeded(11);
  // The chunky island: stacked slabs, sand then grass.
  const shape = (x, z) => { const a = Math.atan2(z, x), R = 1 + 0.08 * Math.sin(a * 5 + 1) + 0.05 * Math.sin(a * 9); return (x / 33) ** 2 + (z / 23) ** 2 < R; };
  const cell = 2;
  for (let x = -38; x < 38; x += cell) for (let z = -26; z < 26; z += cell) {
    const X = x + cell / 2, Z = z + cell / 2; if (!shape(X, Z)) continue;
    const edge = !shape(X + cell * 1.5, Z) || !shape(X - cell * 1.5, Z) || !shape(X, Z + cell * 1.5) || !shape(X, Z - cell * 1.5);
    const c = edge ? mix('sand', 'orange', r() * 0.2) : mix('green', r() > 0.5 ? 'lime' : 'teal', r() * 0.28), h = edge ? 0.5 : 0.94 + r() * 0.03;
    b.box(X, -3, Z, cell, 3 + h, cell, edge ? mix('orange', 'plum', 0.3) : mix('plum', 'orange', 0.4), 0, c);
  }
  // A small road loop, with tiny cars.
  const N = 90; for (let i = 0; i < N; i++) { const [x0, z0] = ROAD_LOOP(i / N), [x1, z1] = ROAD_LOOP((i + 1) / N); b.beam([x0, 0.95, z0], [x1, 0.95, z1], 2.4, 0.09, i % 4 < 2 ? 'night' : mix('night', 'slate', 0.3)); if (i % 3 === 0) b.beam([x0, 1.05, z0], [x1, 1.05, z1], 0.16, 0.02, 'white'); }
  // Spurs from the road to each building.
  for (const [, [x, z]] of Object.entries(PLACES)) { let best = 0, bd = 1e9; for (let i = 0; i < 180; i++) { const [px, pz] = ROAD_LOOP(i / 180), d = (px - x) ** 2 + (pz - z) ** 2; if (d < bd) { bd = d; best = i; } } const [px, pz] = ROAD_LOOP(best / 180); b.beam([px, 0.95, pz], [x, 0.95, z], 1.3, 0.08, mix('night', 'slate', 0.3)); }
  // The buildings.
  const buildings = {};
  for (const [id, [x, z, yaw]] of Object.entries(PLACES)) { const m = buildModel(BUILDING_DEFS[id], {}).object; m.position.set(x, 0.95, z); m.rotation.y = yaw; for (const o of m.children) if (o.isMesh) o.castShadow = true; g.add(m); buildings[id] = m; }
  // Trees and small things.
  for (let i = 0; i < 90; i++) { const x = (r() - 0.5) * 60, z = (r() - 0.5) * 42; if (!shape(x * 1.08, z * 1.08)) continue; if (Object.values(PLACES).some(([px, pz]) => Math.hypot(x - px, z - pz) < 6.5)) continue; let onRoad = false; for (let k = 0; k < 90; k++) { const [px, pz] = ROAD_LOOP(k / 90); if (Math.hypot(px - x, pz - z) < 2.6) onRoad = true; } if (onRoad) continue; const H = 1.6 + r() * 1.6; if (r() > 0.5) { b.cone(x, 0.95, z, 0.14, H * 0.4, 5, 'plum', 0.1); b.ball(x, 0.95 + H * 0.7, z, H * 0.44, r() > 0.5 ? 'green' : mix('green', 'lime', 0.4), 6, 0.9); } else { b.cone(x, 0.95, z, 0.12, H * 0.3, 5, 'plum', 0.08); b.cone(x, 0.95 + H * 0.2, z, H * 0.36, H * 0.9, 6, 'teal'); } }
  blockText(b, 'HALCYON', [-4.5, 0.97, 2.4], 1, 0, 0.32, 'white', 0.3);
  const body = b.mesh({ cast: true, receive: true }); g.add(body);
  if (glow.triangles) g.add(glow.mesh({ glow: true }));
  // Night lights: lamps along the road and lit windows. They come on after dark, as your career reaches the Grand Prix.
  const nightBatch = new GeoBatch();
  for (let i = 0; i < N; i += 5) { const [x, z] = ROAD_LOOP(i / N), side = i % 10 === 0 ? 1.7 : -1.7; nightBatch.box(x, 0.95, z + side, 0.14, 1.1, 0.14, 'slate'); nightBatch.box(x, 2.05, z + side, 0.42, 0.26, 0.42, 'sand'); }
  for (const [x, z] of Object.values(PLACES)) for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.4; nightBatch.box(x + Math.sin(a) * 3.4, 1.05, z + Math.cos(a) * 3.4, 0.3, 0.3, 0.3, k % 2 ? 'orange' : 'sand'); }
  const nightLights = nightBatch.mesh({ glow: true }); nightLights.visible = false; g.add(nightLights);
  // Service bay's brushes spin; tuning street has sparks.
  const brushes = [-1, 1].map((s) => { const m = new Mesh(new CylinderGeometry(0.5, 0.5, 2.4, 7), toonMaterial(PALETTE.lime)); const [x, z] = PLACES.service; m.position.set(x + s * 1.2, 2.2, z); g.add(m); return m; });
  // The sea, boats, gulls, a small lighthouse, clouds.
  const water = new WaterSurface({ size: [520, 380], at: [0, -0.8, 0], waves: WAVES_CALM, deep: PALETTE.navy, shallow: PALETTE.blue, foam: PALETTE.sky, segments: [60, 40], foamAt: 0.6 }); g.add(water);
  const lb = new GeoBatch(); lb.cone(29, 0, -21, 1.2, 8, 8, 'white', 0.7); lb.cone(29, 3, -21, 1.03, 2, 8, 'red', 0.92); lb.box(29, 8, -21, 1.3, 1, 1.3, 'sand'); g.add(lb.mesh({ cast: true, receive: false }));
  const boats = [0, 1, 2].map((k) => { const bb = new GeoBatch(); bb.box(0, 0, 0, 1.2, 0.5, 3, 'white', 0, k === 1 ? 'sand' : 'red'); bb.box(0, 0.5, 0, 0.1, 2.4, 0.1, 'plum'); bb.tri([0, 3, 0.05], [0, 0.8, 0.05], [0, 0.8, 1.3], k === 2 ? 'orange' : 'white'); bb.tri([0, 3, 0.05], [0, 0.8, 1.3], [0, 0.8, 0.05], k === 2 ? 'orange' : 'white'); const m = bb.mesh({ cast: true, receive: false }); g.add(m); return m; });
  const clouds = new GeoBatch(); for (let i = 0; i < 18; i++) { const x = (r() - 0.5) * 240, z = -90 + (r() - 0.5) * 180, y = 26 + r() * 22; for (let k = 0; k < 3; k++) clouds.box(x + k * 7 - 7 + r() * 3, y + r() * 1.6, z + r() * 5, 9 + r() * 6, 2.2 + r() * 1.5, 7 + r() * 5, 'white'); }
  const cloudMesh = clouds.mesh({ receive: false }); g.add(cloudMesh);
  const flock = new Boids(14, { bounds: { min: [-34, 11, -24], max: [34, 26, 24] }, maxSpeed: 7, minSpeed: 4, view: 8, space: 4, seed: 3 }), gulls = new InstancedMesh(new ConeGeometry(0.28, 0.8, 3).rotateX(Math.PI / 2), toonMaterial(PALETTE.white), 14), dummy = new Object3D(); gulls.frustumCulled = false; g.add(gulls);
  // Tiny cars on the road, and the current car parked at Home.
  const tiny = ['kite', 'ginga', 'libeccio', 'ryu'].map((id, k) => { const v = new CarView(id, { scale: 0.42 }); g.add(v.object); return { v, t: k * 0.25, sp: 0.018 + k * 0.002 }; });
  let home = null, homeId = null;
  const update = (dt, time) => {
    water.update(time); for (const m of brushes) m.rotation.y += dt * 5;
    boats.forEach((m, k) => { const a = time * 0.03 + k * 2.1, R = 46 + k * 7; m.position.set(Math.cos(a) * R, -0.5 + Math.sin(time * 1.2 + k) * 0.08, Math.sin(a) * R * 0.85); m.rotation.y = -a; });
    cloudMesh.position.x = Math.sin(time * 0.02) * 16;
    flock.step(Math.min(dt, 0.05)); for (let k = 0; k < 14; k++) { dummy.position.set(flock.pos[k * 3], flock.pos[k * 3 + 1], flock.pos[k * 3 + 2]); dummy.rotation.y = Math.atan2(flock.vel[k * 3], flock.vel[k * 3 + 2]); dummy.scale.set(1.5, 0.4, 1); dummy.updateMatrix(); gulls.setMatrixAt(k, dummy.matrix); } gulls.instanceMatrix.needsUpdate = true;
    for (const c of tiny) { c.t = (c.t + dt * c.sp) % 1; const [x, z] = ROAD_LOOP(c.t), [x2, z2] = ROAD_LOOP((c.t + 0.002) % 1), yaw = Math.atan2(x2 - x, z2 - z); c.v.update(dt, x, 1.04, z, yaw, 0, 0, 0, 0, 0, 3); }
  };
  const showHome = (carId, install) => { if (!carId) { if (home) home.object.visible = false; return; } const key = JSON.stringify([carId, install?.paint]); if (key !== homeId) { if (home) home.dispose(); home = new CarView(carId, { install, scale: 0.42 }); g.add(home.object); homeId = key; const [x, z] = PLACES.garage; home.update(0, x + 3.6, 1.0, z - 3.2, 0.9, 0, 0, 0, 0, 0, 0); } home.object.visible = true; };
  setLookLayer(g, 'environment');
  return { group: g, update, buildings, showHome, setNight: (on) => { nightLights.visible = on; }, sphere: (id) => { const [x, z] = PLACES[id]; return new Vector3(x, 3, z); } };
}
// A stage: a floor, a back wall, lamps. Everything else hangs from it.
function stage({ floor, wall, trim, wide = 14, deep = 12, lamps = true }) {
  const b = new GeoBatch(), g = new GeoBatch(), f = new GeoBatch(); // only the floor takes shadows: walls at grazing angles would show acne
  f.box(0, -0.5, 0, wide * 2, 0.5, deep * 2, floor);
  b.box(0, 0, -deep, wide * 2, 9, 0.4, wall); b.box(-wide, 0, 0, 0.4, 9, deep * 2, wall); b.box(wide, 0, 0, 0.4, 9, deep * 2, wall);
  b.box(0, 0, -deep + 0.25, wide * 2, 0.6, 0.1, trim);
  if (lamps) for (const x of [-7, 0, 7]) { b.box(x, 8.1, 0, 0.2, 0.8, 0.2, 'night'); g.box(x, 7.9, 0, 1.8, 0.14, 0.5, 'white'); }
  return { b, g, f };
}
const turntable = (b, y = 0, R = 3.2, col = 'mist') => { b.cone(0, y, 0, R, 0.18, 24, col, R); b.cone(0, y, 0, R + 0.25, 0.08, 24, 'night', R + 0.25); };
export function buildSets(ctx) {
  const sets = {}, root = new Group(); ctx.scene.add(root);
  const add = (name, built, offset) => { const g = new Group(); g.position.set(offset * 200 + 400, 0, 400); g.add(built.b.mesh({ cast: true, receive: false }), built.f.mesh({ receive: true })); if (built.g.triangles) g.add(built.g.mesh({ glow: true })); g.visible = false; root.add(g); sets[name] = { group: g, base: new Vector3(offset * 200 + 400, 0, 400) }; return g; };
  const lit = (col) => col;
  // Showrooms: one floor, colours change by showroom.
  const showroomColours = [['slate', 'night', 'sand'], ['mist', 'navy', 'cyan'], ['sand', 'plum', 'red'], ['white', 'ink', 'sand']];
  showroomColours.forEach(([f, w, t], k) => { const s = stage({ floor: f, wall: w, trim: t }); turntable(s.f); for (let i = 0; i < 4; i++) s.g.box(-11 + i * 7.2, 3.2, -11.7, 5.6, 3.4, 0.1, k === 0 ? 'sky' : mix('sky', t, 0.4)); blockText(s.b, ['USED CARS', 'EASTERN', 'WESTERN', 'GRAND SALON'][k], [-8.4, 6.9, -11.6], 1, 0, 0.42, t, 0.1); if (k === 0) for (const x of [-13, 13]) for (let z = -8; z < 9; z += 4) s.b.box(x, 0, z, 0.9, 1.1, 0.9, 'red', 0, 'white'); add(`showroom${k}`, s, k); });
  // Tuning Street's bay: a lift, a bench, sparks, rollers for the dyno.
  { const s = stage({ floor: 'night', wall: mix('slate', 'night', 0.5), trim: 'orange' }); s.b.box(0, 0, 0, 7, 0.08, 3, 'sand'); for (const q of [-1, 1]) s.b.cone(q * 0.76, 0.02, -1.4, 0.32, 0.12, 8, 'ink', 0.32); for (const x of [-10, -6]) { s.b.box(x, 0, -10, 3, 1, 1.4, 'red', 0, 'slate'); s.b.box(x, 1.6, -11.6, 3, 2.4, 0.1, 'plum'); } for (let k = 0; k < 6; k++) s.b.box(8 + (k % 3) * 1.3, 0.05, -10 + Math.floor(k / 3) * 1.4, 1, 0.5 + k * 0.1, 1, 'ink'); blockText(s.b, 'BENNO AND SONS', [-9.8, 6.5, -11.6], 1, 0, 0.36, 'orange', 0.1); add('bay', s, 4); }
  // The Service Bay: wash rails, foam-green brushes.
  { const s = stage({ floor: mix('slate', 'sky', 0.25), wall: 'blue', trim: 'white' }); for (const q of [-1, 1]) for (const z of [-4, 4]) s.b.box(q * 2.6, 0, z, 0.3, 3.8, 0.3, 'mist'); s.b.box(0, 3.8, -4, 5.6, 0.3, 0.4, 'white'); s.b.box(0, 3.8, 4, 5.6, 0.3, 0.4, 'white'); for (const q of [-1, 1]) s.b.box(q * 2.6, 3.8, 0, 0.3, 0.3, 8.3, 'white'); blockText(s.b, 'OIL AND SOAP', [-7.6, 6.5, -11.6], 1, 0, 0.42, 'white', 0.1); add('service', s, 5); }
  // Home: a garage at home with shelves for trophies.
  { const s = stage({ floor: mix('sand', 'night', 0.55), wall: mix('plum', 'night', 0.6), trim: 'sand' }); turntable(s.f, 0, 3.4, mix('slate', 'mist', 0.3)); s.b.box(0, 3.2, -11.4, 20, 0.2, 1, 'orange'); s.b.box(0, 5.2, -11.4, 20, 0.2, 1, 'orange'); s.b.box(0, 1.2, -11.4, 20, 0.2, 1, 'orange'); add('garage', s, 6); }
  // The Museum: columns and a plinth.
  { const s = stage({ floor: 'white', wall: mix('mist', 'night', 0.5), trim: 'plum' }); turntable(s.f, 0.2, 3.6, 'mist'); s.b.cone(0, 0, 0, 3.8, 0.2, 24, 'slate', 3.8); for (const x of [-11, -6, 6, 11]) { s.b.cone(x, 0, -8, 0.7, 8, 10, 'white', 0.6); s.b.box(x, 8, -8, 1.8, 0.5, 1.8, 'mist'); } add('museum', s, 7); }
  // The Licence Centre's office: windows onto the proving ground, a desk.
  { const s = stage({ floor: 'slate', wall: 'white', trim: 'navy' }); for (let k = 0; k < 3; k++) s.g.box(-8 + k * 8, 3, -11.75, 6.4, 3.8, 0.08, 'cyan'); s.b.box(-5, 0, -2, 5, 1.1, 1.8, 'orange', 0.1, 'sand'); s.b.box(-5.8, 1.1, -2, 0.7, 0.05, 1, 'white'); blockText(s.b, 'PLEASE BE PRECISE', [-10, 7, -11.5], 1, 0, 0.34, 'navy', 0.1); for (const x of [8, 9.2, 10.4, 11.6]) s.b.cone(x, 0, 3, 0.3, 0.8, 5, 'orange'); add('licence', s, 8); }
  // The Event Hall: banners, a trophy on a pedestal, a stand behind.
  { const s = stage({ floor: mix('navy', 'night', 0.5), wall: 'night', trim: 'red' }); for (let k = 0; k < 5; k++) { s.b.box(-10 + k * 5, 2.6, -11.4, 3, 5, 0.1, ['red', 'blue', 'orange', 'teal', 'plum'][k]); s.b.box(-10 + k * 5, 2.6 + 3.6, -11.4, 0.3, 0.6, 0.1, 'sand'); } s.b.cone(0, 0, -3, 1, 1.2, 8, 'white', 0.8); s.b.cone(0, 1.2, -3, 0.28, 0.9, 6, 'sand', 0.4); s.b.cone(0, 2, -3, 0.48, 0.7, 6, 'sand', 0.76); add('events', s, 9); }
  // The Theatre's foyer: red curtains, a screen, seats.
  { const s = stage({ floor: mix('red', 'plum', 0.6), wall: mix('plum', 'ink', 0.3), trim: 'sand' }); s.g.box(0, 2, -11.6, 15, 6, 0.1, mix('sky', 'white', 0.3)); for (const q of [-1, 1]) for (let k = 0; k < 4; k++) s.b.box(q * (8.4 + k * 0.5), 0, -11.2, 0.5, 8.4, 0.5, k % 2 ? 'red' : mix('red', 'plum', 0.5)); for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) s.b.box(-5.6 + c * 1.6, 0, -4 + r * 2, 1.2, 1, 1.1, 'red', 0, mix('red', 'plum', 0.4)); add('theatre', s, 10); }
  // The Arcade Gate: a dark room of neon.
  { const s = stage({ floor: 'ink', wall: 'ink', trim: 'cyan' }); for (let k = 0; k < 9; k++) s.g.box(-12 + k * 3, 0.1, -11, 0.2, 8, 0.2, k % 2 ? 'cyan' : 'red'); blockText(s.g, 'NO MONEY EITHER', [-11, 6.5, -11.2], 1, 0, 0.42, 'sand', 0.1); turntable(s.f, 0, 3, 'night'); add('arcade', s, 11); }
  // The dark set for a prize car: lamps come on, a cover slides away.
  { const s = stage({ floor: 'ink', wall: 'ink', trim: 'ink', lamps: false }); turntable(s.f, 0, 3.4, 'night'); add('prize', s, 12); }
  // The podium: three steps, flags and a stand behind.
  { const s = stage({ floor: mix('green', 'teal', 0.5), wall: 'sky', trim: 'white', wide: 22, deep: 18, lamps: false }); s.b.box(0, 0, -3, 4, 2, 4, 'white', 0, 'sand'); s.b.box(-4, 0, -3, 4, 1.3, 4, 'mist', 0, 'white'); s.b.box(4, 0, -3, 4, 0.8, 4, 'mist', 0, 'white'); blockText(s.b, '1', [-0.6, 0.3, -0.95], 1, 0, 0.4, 'red', 0.1); blockText(s.b, '2', [-4.6, 0.2, -0.95], 1, 0, 0.3, 'navy', 0.1); blockText(s.b, '3', [3.4, 0.06, -0.95], 1, 0, 0.2, 'navy', 0.1); for (let r = 0; r < 6; r++) for (let c = 0; c < 40; c++) { const col = ['red', 'white', 'sky', 'sand', 'orange', 'lime', 'plum', 'mist', 'blue'][(r * 7 + c * 3) % 9]; s.b.box(-20 + c, 0.4 + r * 0.7, -16 + r * 0.8, 0.6, 0.9, 0.5, col); s.b.box(-20 + c, 1.3 + r * 0.7, -16 + r * 0.8, 0.34, 0.3, 0.3, 'sand'); } add('podium', s, 13); }
  // A turntable that holds whatever car is on show.
  return { sets, root, lit };
}
void BoxGeometry;
