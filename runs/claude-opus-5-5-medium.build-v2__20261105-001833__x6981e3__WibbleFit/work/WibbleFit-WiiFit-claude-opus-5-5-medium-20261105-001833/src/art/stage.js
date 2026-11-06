// Shared set dressing: floors, sea, mats, and the small build helpers every scene uses.
import { addModelColliders, buildModel, GrassField, PALETTE, setLookLayer, THREE, toonMaterial, WaterSurface, WAVES_CALM } from '../../pixel-engine.js';
import { MODELS } from './models.js';
import { tiledPlane } from './textures.js';
const { BoxGeometry, Color, CylinderGeometry, Mesh, MeshBasicMaterial, PlaneGeometry } = THREE;

export const place = (ctx, id, x, y, z, { turn = 0, scale = 1, palette, params, collide = false, actors = false, seed } = {}) => {
  const b = buildModel(id, { catalog: MODELS, palette, params, seed });
  b.object.position.set(x, y, z); b.object.rotation.y = (turn * Math.PI) / 180; b.object.scale.setScalar(scale);
  b.object.updateMatrixWorld(true);
  if (actors) setLookLayer(b.object, 'actors');
  ctx.scene.add(b.object);
  if (collide && scale === 1) addModelColliders(ctx.physics, b, [x, y, z], b.object.rotation.y);
  return b;
};
export const box = (ctx, x, y, z, w, h, d, color, { collide = false, shadow = true } = {}) => {
  const m = new Mesh(new BoxGeometry(w, h, d), toonMaterial(PALETTE[color]));
  m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; ctx.scene.add(m);
  if (collide) ctx.physics.addStaticBox({ position: [x, y, z], halfExtents: [w / 2, h / 2, d / 2] });
  return m;
};
export const sky = (ctx, color = PALETTE.sky) => { ctx.scene.background = new Color(color); };
export function sea(ctx, w = 120, d = 120, y = -0.25, x = 0, z = 0, ripples = null) {
  const water = new WaterSurface({ size: [w, d], at: [x, y, z], segments: [Math.min(160, w * 2), Math.min(160, d * 2)], waves: WAVES_CALM, ripples, deep: PALETTE.blue, shallow: PALETTE.sky, foam: PALETTE.white });
  ctx.scene.add(water); return water;
}
export function tileFloor(ctx, w, d, x = 0, z = 0, y = 0) {
  const f = tiledPlane(w, d, 'clinic-tile'); f.position.set(x, y, z); ctx.scene.add(f);
  ctx.physics.addStaticBox({ position: [x, y - 0.5, z], halfExtents: [w / 2, 0.5, d / 2] });
  return f;
}
export const laneXs = (n) => (n <= 3 ? [-2.2, 0, 2.2] : [-3, -1, 1, 3]);
export const viewAspect = () => (typeof innerWidth !== 'undefined' && innerHeight ? innerWidth / innerHeight : 16 / 9);
export function laneCamera(n, aspect = viewAspect()) {
  const k = Math.max(1, (16 / 9) / aspect);
  if (n <= 3) return { preset: 'fixed', position: [0, 2.3 + (k - 1) * 0.8, 8.2 * k], target: [0, 1.15, 0], fov: 30 };
  return { preset: 'fixed', position: [0, 3 + (k - 1) * 0.8, 9.5 * k], target: [0, 1, 0], fov: 32 };
}
export function backdrop(ctx, kind) {
  sky(ctx);
  ctx.physics.addStaticBox({ position: [0, -0.5, 0], halfExtents: [40, 0.5, 40] });
  const horizon = () => {
    place(ctx, 'kettlebell-volcano', -36, -1, -62, { scale: 1.2 });
    place(ctx, 'foam-roller-hill', 34, -1, -56, { scale: 1.1 });
  };
  if (kind === 'pavilion' || kind === 'plaza') {
    const f = tiledPlane(40, 18, 'clinic-tile'); f.position.set(0, 0, -2); ctx.scene.add(f);
    box(ctx, 0, -0.05, -14, 60, 0.1, 8, 'green', { shadow: false });
    sea(ctx, 160, 60, -0.25, 0, -40);
    horizon();
    if (kind === 'pavilion') {
      box(ctx, 0, 0.12, -1.8, 4.4, 0.24, 2.2, 'mist');
      for (const x of [-6.4, 6.4]) { box(ctx, x, 2.3, -3, 0.5, 4.6, 0.5, 'white'); box(ctx, x, 2.3, 1.2, 0.5, 4.6, 0.5, 'white'); }
      for (const x of [-3.2, 0, 3.2]) box(ctx, x, 4.9, -3, 3, 0.3, 0.4, 'sky');
      box(ctx, 0, 5.2, -3, 14, 0.25, 0.6, 'sky');
      box(ctx, -6.4, 5.2, -1, 0.5, 0.25, 5, 'sky'); box(ctx, 6.4, 5.2, -1, 0.5, 0.25, 5, 'sky');
      box(ctx, -5, 0.9, -3, 2.6, 0.08, 0.08, 'mist'); box(ctx, 5, 0.9, -3, 2.6, 0.08, 0.08, 'mist');
      for (const [x, z] of [[-6, 2.2], [6, 2.2]]) place(ctx, 'bush', x, 0, z);
      place(ctx, 'lamp-post', -7.4, 0, -2);
      place(ctx, 'lamp-post', 7.4, 0, -2);
    }
  } else if (kind === 'shed') {
    const wood = box(ctx, 0, -0.05, 0, 30, 0.1, 16, 'orange', { shadow: false });
    wood.receiveShadow = true;
    for (let i = -7; i <= 7; i++) box(ctx, i * 2, 0.002, 0, 0.05, 0.02, 16, 'plum', { shadow: false });
    box(ctx, 0, 2.6, -4.3, 30, 5.2, 0.4, 'white');
    box(ctx, 0, 0.4, -4.05, 30, 0.8, 0.1, 'mist');
    box(ctx, 0, 5.3, -3, 30, 0.4, 3, 'orange');
    for (const x of [-7.4, 7.4]) { box(ctx, x, 2.6, -2, 0.5, 5.2, 8, 'white'); }
    for (const [x, c] of [[-6, 'slate'], [-4.9, 'night'], [5, 'night'], [6, 'slate']]) { box(ctx, x, 0.5, -3.3, 0.5, 1, 0.5, c); box(ctx, x, 0.5, -2.5, 0.5, 1, 0.5, c); box(ctx, x, 0.5, -2.9, 0.16, 0.16, 0.8, 'ink'); }
    place(ctx, 'med-ball', -6, 0, 1.5, { scale: 0.5 }); place(ctx, 'med-ball', 6, 0, 1.4, { scale: 0.42 });
  } else if (kind === 'beach' || kind === 'lagoon') {
    box(ctx, 0, -0.1, 0, 44, 0.2, 18, 'sand', { shadow: false });
    box(ctx, 0, -0.12, -11, 60, 0.2, 6, 'sand', { shadow: false });
    sea(ctx, 160, 60, -0.25, 0, -38);
    horizon();
    if (kind === 'beach') {
      place(ctx, 'beat-stage', 0, 0, -4.8);
      place(ctx, 'palm', -7, 0, -3); place(ctx, 'palm', 7.5, 0, -2.2, { turn: 120 }); place(ctx, 'palm', -8.4, 0, 1.4, { turn: 200 });
      box(ctx, -5.8, 0.03, 2.2, 1.4, 0.05, 0.9, 'red', { shadow: false }); box(ctx, 5.8, 0.03, 1.8, 1.4, 0.05, 0.9, 'sky', { shadow: false });
    } else {
      place(ctx, 'palm', -8, 0, -3); place(ctx, 'palm', 7.5, 0, -3.5, { turn: 80 });
      place(ctx, 'med-ball', 8.2, 0, 0.6, { scale: 0.5 });
    }
  }
}
export function grass(ctx, opts) { const g = new GrassField({ base: PALETTE.green, tip: PALETTE.lime, ...opts }); ctx.scene.add(g); return g; }
export function needleOf(build) { return build.object.getObjectByName('needle'); }
export const makeFlat = (w, d, color) => { const m = new Mesh(new PlaneGeometry(w, d).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: PALETTE[color] })); return m; };
export const cyl = (ctx, r, h, color) => { const m = new Mesh(new CylinderGeometry(r, r, h, 12), toonMaterial(PALETTE[color])); ctx.scene.add(m); return m; };
