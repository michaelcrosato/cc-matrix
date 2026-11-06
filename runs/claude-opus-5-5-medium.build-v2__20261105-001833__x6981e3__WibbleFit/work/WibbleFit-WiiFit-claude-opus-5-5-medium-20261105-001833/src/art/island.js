// Tare Island. Tall things stay in the -x -z quadrant, so they never hide the player.
import { Boids, buildModel, PALETTE, THREE, toonMaterial } from '../../pixel-engine.js';
import { box, grass, place, sea, sky, tileFloor } from './stage.js';
import { Decals } from '../../pixel-engine.js';
const { BoxGeometry, InstancedMesh, Matrix4, Mesh, Quaternion, Vector3 } = THREE;

export const JOG_POINTS = [[0, 12], [7, 15], [15, 15], [20, 11], [20.5, 4], [16, 0], [19.5, -5], [20.5, -12], [15, -15.5], [8, -15], [5, -11], [0, -12.5], [-5, -11], [-8, -15], [-15, -15.5], [-20.5, -13], [-20, -6], [-15.5, -2], [-20, 3], [-20.5, 10], [-14, 11], [-9, 9], [-6, 14]];

export async function buildPlaza(ctx, { jar = true } = {}) {
  sky(ctx);
  tileFloor(ctx, 18, 16, 0, 1, 0);
  box(ctx, 0, -0.06, 0, 60, 0.1, 50, 'green', { shadow: false });
  ctx.physics.addStaticBox({ position: [0, -0.6, 0], halfExtents: [40, 0.5, 40] });
  const water = sea(ctx, 200, 60, -0.25, 0, -44);
  place(ctx, 'kettlebell-volcano', -26, -0.5, -44, { scale: 1.2 });
  place(ctx, 'foam-roller-hill', 24, -0.5, -42);
  place(ctx, 'fountain', -7, 0, -5); place(ctx, 'bench', 6.4, 0, -4); place(ctx, 'bench', -6.4, 0, 4, { turn: 90 });
  place(ctx, 'palm', 8.8, 0, -6, { turn: 40 }); place(ctx, 'palm', -9.2, 0, -7, { turn: 200 });
  if (jar) place(ctx, 'sweat-jar', 4.5, 0, -6);
  return { water, update(c, dt) { water.update(c.time); } };
}

export async function buildIsland(ctx, { jog = false, collide = true } = {}) {
  sky(ctx);
  const add = collide ? { collide: true } : {};
  // Land: lawn, sand, and the white plaza at the heart of it.
  box(ctx, 0, -0.2, 0, 46, 0.4, 36, 'green', { shadow: false });
  box(ctx, 12.5, -0.14, -11, 20, 0.3, 13, 'sand', { shadow: false });
  box(ctx, -12.5, -0.14, -11, 20, 0.3, 13, 'sand', { shadow: false });
  box(ctx, 0, -0.17, 17.5, 48, 0.3, 3, 'sand', { shadow: false });
  box(ctx, 0, -0.17, -17.5, 48, 0.3, 3, 'sand', { shadow: false });
  box(ctx, 23.5, -0.17, 0, 3, 0.3, 38, 'sand', { shadow: false }); box(ctx, -23.5, -0.17, 0, 3, 0.3, 38, 'sand', { shadow: false });
  ctx.physics.addStaticBox({ position: [0, -0.5, 0], halfExtents: [30, 0.5, 26] });
  const water = sea(ctx, 240, 200, -0.25, 0, 0);
  const plaza = tileFloor(ctx, 15, 16, 0, 0.5, 0.005);
  void plaza;
  // Paths from the plaza to everything.
  for (const [x, z, w, d] of [[-9.5, 3, 5, 2.4], [9.5, 3, 5, 2.4], [0, 10, 3, 3.6]]) box(ctx, x, 0.002, z, w, 0.01, d, 'white', { shadow: false });
  // Jog path.
  if (jog) {
    const { CatmullRomCurve3 } = THREE;
    const curve = new CatmullRomCurve3(JOG_POINTS.map(([x, z]) => new Vector3(x, 0, z)), true, 'catmullrom', 0.5);
    const n = 280, g = new BoxGeometry(3.6, 0.02, 1.1), m = new InstancedMesh(g, toonMaterial(PALETTE.sand), n), mat = new Matrix4(), q = new Quaternion(), up = new Vector3(0, 1, 0);
    for (let i = 0; i < n; i++) { const p = curve.getPointAt(i / n), t = curve.getTangentAt(i / n); q.setFromAxisAngle(up, Math.atan2(t.x, t.z)); mat.compose(new Vector3(p.x, 0.03, p.z), q, new Vector3(1, 1, 1)); m.setMatrixAt(i, mat); }
    m.receiveShadow = true; ctx.scene.add(m);
  }
  // Stations.
  const st = {};
  st.ounceDais = place(ctx, 'fountain', 0, 0, -3.4, { ...add });
  box(ctx, 0, 0.14, 3, 3.4, 0.28, 3.4, 'mist'); box(ctx, 0, 0.3, 3, 2.6, 0.08, 2.6, 'white');
  if (collide) ctx.physics.addStaticBox({ position: [0, 0.14, 3], halfExtents: [1.7, 0.14, 1.7] });
  st.pavilion = place(ctx, 'pavilion', -11, 0, 3);
  st.pavilionRoof = st.pavilion;
  if (collide) ctx.physics.addStaticCylinder([-11, 1, 3], 1, 3.6);
  st.shed = place(ctx, 'rep-shed', 11, 0, 3, { turn: -90, ...add });
  st.stage = place(ctx, 'beat-stage', 12, 0, -10, { turn: 0, ...add });
  st.gate = place(ctx, 'jog-gate', 0, 0, 11);
  st.jar = place(ctx, 'sweat-jar', 4, 0, -4, { ...add });
  st.lockers = place(ctx, 'lockers', -4, 0, -4.4, { ...add });
  st.hall = place(ctx, 'hall-board', 0, 0, -8, { ...add });
  st.hammock = place(ctx, 'hammock', 14, 0, 10);
  place(ctx, 'palm', 12.2, 0, 10, { ...add }); place(ctx, 'palm', 15.8, 0, 10, { turn: 180, ...add });
  // Lagoon with a pier.
  place(ctx, 'pier', -13, 0.1, -13.2, { params: { len: 14 } });
  place(ctx, 'slack-anchor', -18.5, 0, -8.5, { ...add }); place(ctx, 'catapult', -8.5, 0, -11, { turn: 20, ...add });
  place(ctx, 'yoga-mat', -11, 0.4, 3); place(ctx, 'yoga-mat', 8, 0.01, -8, { turn: 15 });
  // Scenery.
  place(ctx, 'kettlebell-volcano', -15, -0.2, -14 - 8, {});
  place(ctx, 'foam-roller-hill', 15, -0.1, -22, {});
  place(ctx, 'dumbbell-bridge', -18, -0.8, 13, { turn: 90 });
  box(ctx, -18, -0.1, 13, 5, 0.3, 6, 'sky', { shadow: false });
  if (collide) ctx.physics.addStaticBox({ position: [-18, 0.5, 13], halfExtents: [3, 1, 3.4] });
  for (const [x, z, s] of [[-21, 3, 0.8], [-20.5, -3, 1], [21, 2, 0.9], [21, 8, 0.6], [6, 15, 0.8], [-7, 15, 1], [-3, -16, 0.7], [8, -16, 0.9]]) place(ctx, 'med-ball', x, 0, z, { scale: s });
  for (const [x, z, t] of [[-20, 8, 30], [20, -3, 100], [-13, 15, 300], [-3, -14, 50]]) place(ctx, 'palm', x, 0, z, { turn: t });
  for (const [id, x, z, t] of [['bench', 7, -1, -90], ['bench', -7, -1, 90], ['bench', 5.5, 7, 180], ['bush', -7.5, 8, 0], ['bush', 7.5, 8, 0], ['flowers', -5, 9, 0], ['flowers', 5, 9, 0], ['lamp-post', -7.2, 7.5, 0], ['lamp-post', 7.2, 7.5, 0], ['lamp-post', -7.2, -6.5, 0], ['lamp-post', 7.2, -6.5, 0], ['signpost', 2.4, 9.6, 0], ['bush', 16, 7, 0], ['flowers', 12, 12, 0], ['oak', -19, -2, 0]]) place(ctx, id, x, 0, z, { turn: t });
  // Edge walls so nobody walks into the sea.
  if (collide) for (const [x, z, hx, hz] of [[0, 19.2, 26, 0.5], [0, -19.2, 26, 0.5], [24.5, 0, 0.5, 20], [-24.5, 0, 0.5, 20]]) ctx.physics.addStaticBox({ position: [x, 1.5, z], halfExtents: [hx, 2, hz] });
  // Grass and gulls.
  const onPath = (x, z) => (Math.abs(x) < 8.4 && z > -8.5 && z < 9.5) || (z < -4.5 && Math.abs(x) > 2.5) || (Math.abs(z - 3) < 1.6 && Math.abs(x) < 14);
  const g = grass(ctx, { area: [44, 32], at: [0, 0, 0], count: 4800, height: [0.22, 0.42], width: 0.08, mask: (x, z) => !onPath(x, z), seed: 5 });
  const gulls = new Boids(12, { bounds: { min: [-22, 7, -18], max: [22, 12, 16] }, seed: 3 });
  const gullMeshes = Array.from({ length: gulls.count }, () => { const b = new Mesh(new BoxGeometry(0.7, 0.08, 0.26), toonMaterial(PALETTE.white)); ctx.scene.add(b); return b; });
  const decals = new Decals(ctx.scene);
  let gt = 0;
  return { water, grass: g, gulls, decals, st, update(c, dt) {
    water.update(c.time); g.update(c.time); decals.update(dt);
    gt += dt; if (gt > 0.03) { gulls.step(gt); gt = 0; }
    for (let i = 0; i < gullMeshes.length; i++) { gullMeshes[i].position.set(gulls.pos[i * 3], gulls.pos[i * 3 + 1], gulls.pos[i * 3 + 2]); gullMeshes[i].scale.x = 0.8 + Math.sin(c.time * 7 + i) * 0.3; gullMeshes[i].rotation.y = Math.atan2(gulls.vel[i * 3], gulls.vel[i * 3 + 2]); }
  } };
}
export const needle = (b) => b.object.getObjectByName('needle');
void buildModel;
