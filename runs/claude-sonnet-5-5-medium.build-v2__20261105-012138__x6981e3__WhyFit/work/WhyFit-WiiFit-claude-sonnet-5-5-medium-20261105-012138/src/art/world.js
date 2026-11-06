// World-building helpers: placing data models, the tile floor, the sea and the whole island.
import { RippleField, Decals, buildModel, addModelColliders, DEFAULT_TEXEL, TEXTURE_LIBRARY, textureMap, THREE, toonMaterial, PALETTE, WaterSurface, WAVES_CALM, Boids, mergeStaticMeshes, setLookLayer } from '../../pixel-engine.js';
import { MODELS } from './models.js';
import { registerTextures } from './textures.js';
import { STATIONS } from '../data/stations.js';

const { BoxGeometry, Mesh, PlaneGeometry, Group, Vector3 } = THREE;

export function place(ctx, id, at, { turn = 0, scale = 1, params, palette, collide = false, seed, parent = null, light } = {}) {
  const m = buildModel(id, { catalog: MODELS, params, palette, seed, light });
  m.object.position.set(at[0], at[1], at[2]);
  m.object.rotation.y = turn * Math.PI / 180;
  if (scale !== 1) m.object.scale.setScalar(scale);
  m.object.updateMatrixWorld();
  (parent ?? ctx.scene).add(m.object);
  if (collide) addModelColliders(ctx.physics, m, at, m.object.rotation.y);
  return m;
}
export function tileFloor(ctx, w, d, at, texId = 'clinic-tile', color = PALETTE.white) {
  registerTextures();
  const tile = TEXTURE_LIBRARY.get(texId).size[0] / DEFAULT_TEXEL;
  const g = new PlaneGeometry(w, d).rotateX(-Math.PI / 2);
  g.attributes.uv.array.forEach((v, i, uv) => (uv[i] = (v * (i % 2 ? d : w)) / tile));
  const mesh = new Mesh(g, toonMaterial(color, { map: textureMap(texId) }));
  mesh.position.set(at[0], at[1], at[2]); mesh.receiveShadow = true;
  ctx.scene.add(mesh);
  return mesh;
}
export function slab(ctx, [w, h, d], [x, y, z], color, { collide = false, shadow = false, add = true } = {}) {
  const m = new Mesh(new BoxGeometry(w, h, d), toonMaterial(PALETTE[color] ?? color));
  m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = shadow;
  if (collide) ctx.physics.addStaticBox({ position: [x, y, z], halfExtents: [w / 2, h / 2, d / 2] });
  if (add) ctx.scene.add(m);
  return m;
}
export function makeSea(ctx, at = [0, -0.45, 0], size = [150, 110], { ripples = false } = {}) {
  const rf = ripples ? new RippleField({ size: [40, 24], cells: [80, 48], center: [at[0], at[2]] }) : null;
  const water = new WaterSurface({ size: rf ? [40, 24] : size, at, waves: WAVES_CALM, deep: PALETTE.blue, shallow: PALETTE.cyan, foam: PALETTE.white, ripples: rf });
  water.rf = rf;
  ctx.scene.add(water);
  return water;
}
const PALMS = [[-20, 14], [-16, 15], [18, 14], [21, 6], [-21, 5], [20, -4], [-20, -4], [9, 15], [-9, 15], [4, -14], [-6, -15], [-3, 16], [16, 15], [22, -9], [-22, -12], [10.5, 8.5], [-15.5, 9], [18, 11], [-17, 9]];
/** The island, static part. Returns update(dt) and handles. */
export function buildIsland(ctx, { gulls = 6, palms = true } = {}) {
  registerTextures();
  const parts = [];
  parts.push(slab(ctx, [44, 1, 34], [0, -0.5, 0], 'green', { collide: true, add: false }));
  parts.push(slab(ctx, [46, 0.6, 36], [0, -0.75, 0], 'sand', { add: false }));
  parts.push(slab(ctx, [24, 0.04, 14], [12, 0.02, -10], 'sand', { add: false })); // Beat Beach
  parts.push(slab(ctx, [16, 0.04, 10], [-12, 0.02, -10], 'cyan', { add: false })); // Lagoon pool
  parts.push(slab(ctx, [4, 0.04, 8], [11, 0.03, -5], 'blue', { add: false })); // inlet under the bridge
  parts.push(slab(ctx, [3, 0.04, 22], [0, 0.015, 4], 'mist', { add: false })); // path
  ctx.scene.add(...mergeStaticMeshes(parts));
  tileFloor(ctx, 20, 12, [0, 0.03, 3]); // the plaza
  // invisible walls
  for (const [x, z, w, d] of [[0, -17.6, 48, 1], [0, 17.6, 48, 1], [-22.6, 0, 1, 36], [22.6, 0, 1, 36]]) ctx.physics.addStaticBox({ position: [x, 1, z], halfExtents: [w / 2, 1, d / 2] });
  const sea = makeSea(ctx);
  // buildings and scenery
  place(ctx, 'kettlebell-volcano', [-15, 0, -14], { collide: false });
  place(ctx, 'foam-roller-hill', [15, 0, -14.5], { turn: 20 });
  place(ctx, 'dumbbell-bridge', [11, 0, -5], { turn: 90 });
  place(ctx, 'pavilion', [-11, 0, 3], { palette: { roof: 'sky' } });
  place(ctx, 'rep-shed', [11, 0, 1], { turn: 0, collide: true });
  place(ctx, 'beat-stage', [12, 0, -11.5], { turn: 0 });
  place(ctx, 'pier', [-12, 0, -12], { turn: 0 });
  place(ctx, 'sweat-jar', [4, 0, -4.5], { collide: false });
  place(ctx, 'lockers', [-4, 0, -5], { turn: 0 });
  place(ctx, 'hall-board', [0, 0, -8.5], {});
  place(ctx, 'hammock', [14, 0, 10.5], {});
  place(ctx, 'dais', [-11, 0.0, 3.8], { scale: 0.7 });
  for (const [x, z, r] of [[-9, 11, 1.4], [9.5, 8, 1.1], [-18, -8, 1.8], [18, 0, 1.5], [3, -14, 1.3], [-6, 8.5, 0.9]]) place(ctx, 'medicine-ball', [x, 0, z], { params: { r } });
  if (palms) PALMS.forEach(([x, z], i) => place(ctx, 'palm', [x, 0, z], { params: { h: 3.5 + (i % 4) * 0.8 }, turn: i * 53 }));
  for (const [id, at, o] of [['fountain', [-7.6, 0, 8.4], {}], ['bench', [-3.5, 0, 6.5], { turn: 90 }], ['bench', [3.5, 0, 6.5], { turn: -90 }], ['lamp-post', [-6, 0, 0], {}], ['lamp-post', [6, 0, 0], {}], ['flowers', [-5, 0, 10], {}], ['flowers', [6, 0, 10.5], {}], ['bush', [-8, 0, 9], {}], ['bush', [8, 0, 10], {}], ['signpost', [0, 0, 12.5], {}]]) { try { place(ctx, id, at, o); } catch { /* optional dressing */ } }
  const gullMeshes = [], boids = new Boids(gulls, { bounds: { min: [-24, 7, -18], max: [24, 11, 18] }, maxSpeed: 2.2, minSpeed: 1.2, seed: 5 });
  for (let i = 0; i < gulls; i++) { const g = buildModel('kevin-flap', { catalog: MODELS }).object; g.scale.setScalar(0.55); ctx.scene.add(g); gullMeshes.push(g); }
  const update = (dt) => {
    sea.update(ctx.time);
    boids.step(dt);
    for (let i = 0; i < gulls; i++) { const g = gullMeshes[i]; g.position.set(boids.pos[i * 3], boids.pos[i * 3 + 1], boids.pos[i * 3 + 2]); g.rotation.y = Math.atan2(boids.vel[i * 3], boids.vel[i * 3 + 2]); g.rotation.z = Math.sin(ctx.time * 8 + i) * 0.35; }
  };
  return { update, sea, boids };
}
export const standPoint = (id) => { const s = STATIONS.find((x) => x.id === id); return s ? new Vector3(s.x, 0, s.z) : new Vector3(); };
export { Group, Vector3 };
